const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RegistrationClaim = require('../models/RegistrationClaim');
const { verifyToken } = require('../middleware/verifyToken');


// import the eligibility filter so we can log pass/fail at login
const { twitterAccountFilters } = require("../controllers/totalScore.controller");


const router = express.Router();

const prettyError = (e) => {
  if (!e) return '';
  if (e.startsWith('rate_limited_')) {
    const m = e.match(/^rate_limited_(\d+)s$/);
    const secs = m ? parseInt(m[1], 10) : 60;
    const s = Math.max(10, Math.min(secs, 120));
    return `X is rate-limiting sign-ins. Please try again in ~${s} seconds.`;
  }
  if (e === 'please_wait') return 'Please wait a few seconds before trying again.';
  if (e === 'code_already_used') return 'That login step was already completed. Start again.';
  return `Authentication failed: ${e}`;
};

const OAUTH_COOKIE = 'oauth_pkce';

const OAUTH_THROTTLE = 'oauth_recent';
function setThrottleCookie(res, ttlSec = 30) {
  res.cookie(OAUTH_THROTTLE, Date.now().toString(), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ttlSec * 1000,
  });
}
function isThrottled(req) {
  return Boolean(req.cookies?.[OAUTH_THROTTLE]);
}

function signShort(data) {
  return jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '15m' });
}
function tryVerify(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
}

// --- One-shot backoff retry for X token exchange on 429 ---
async function exchangeWithRetry(form, headers, debugCtx = {}) {
  // 👇 log before first attempt
  console.log("[auth] callback PKCE", {
    pkceSource: debugCtx.pkceSource || 'unknown',
    state: String(debugCtx.state || '').slice(0, 6),
    codeVerifierPrefix: String(debugCtx.codeVerifier || '').slice(0, 8),
    preRegMode: debugCtx.preRegMode || null,
    redirectUri: debugCtx.redirectUri,
  });

  try {
    return await axios.post("https://api.x.com/2/oauth2/token", form, { headers });
  } catch (err) {
    const s = err?.response?.status;
    if (s !== 429) throw err;

    const h = err.response.headers || {};
    const retryAfter = Number(h['retry-after']) || 0;
    const resetUnix  = Number(h['x-rate-limit-reset']) || 0;

    // choose a reasonable wait (cap at ~120s)
    let waitMs = 90_000;
    if (retryAfter > 0) waitMs = retryAfter * 1000;
    else if (resetUnix > 0) {
      const delta = (resetUnix * 1000) - Date.now();
      if (delta > 0 && delta < 3 * 60_000) waitMs = delta;
    }

    console.warn(`[auth] 429 from X, retrying after ${Math.round(waitMs / 1000)}s`);
    await new Promise(r => setTimeout(r, Math.min(waitMs, 120_000)));
    return await axios.post("https://api.x.com/2/oauth2/token", form, { headers });
  }
}


function mapAxiosErrorToCode(err) {
  // Network/transport
  if (!err || !err.response) {
    // Axios network-level error (ECONNRESET, ENOTFOUND, ETIMEDOUT, etc.)
    if (err?.code === 'ECONNABORTED') return 'please_wait';
    if (err?.code) return `transport_${String(err.code).toLowerCase()}`;
    return 'transport_error';
  }

  const { status, data, headers } = err.response || {};
  // X can 429 on token exchange; compute a friendly wait
  if (status === 429) {
    // If Retry-After is present
    const retryAfter = headers?.['retry-after'];
    const wait = Number.isFinite(+retryAfter) ? Math.max(10, Math.min(+retryAfter, 120)) : 60;
    return `rate_limited_${wait}s`;
  }

  // Common OAuth errors from X
  const desc = data?.error_description || data?.error || '';
  if (desc.includes('invalid_client')) return 'invalid_client';
  if (desc.includes('invalid_grant'))  return 'invalid_grant';      // code used/expired or bad verifier
  if (desc.includes('unauthorized'))   return 'invalid_client';
  if (desc.includes('access_denied'))  return 'access_denied';

  // Fallback: echo their description or status
  if (desc) return desc.replace(/\s+/g, '_').toLowerCase();
  return `http_${status || 'error'}`;
}

function safeLogAxiosError(prefix, err) {
  const status  = err?.response?.status;
  const data    = err?.response?.data;
  const headers = err?.response?.headers;
  const code    = err?.code;
  console.error(prefix, {
    status,
    body: data,
    headers: {
      retryAfter: headers?.['retry-after'],
      xRateLimitLimit: headers?.['x-rate-limit-limit'],
      xRateLimitRemaining: headers?.['x-rate-limit-remaining'],
      xRateLimitReset: headers?.['x-rate-limit-reset'],
    },
    nodeCode: code,
    toJSON: typeof err?.toJSON === 'function' ? err.toJSON() : undefined,
  });
}

// In-memory store for OAuth state and PKCE (use Redis in production)
const oauthStore = new Map();

const generateCodeVerifier = () => crypto.randomBytes(32).toString("base64url");
const generateCodeChallenge = (codeVerifier) =>
  crypto.createHash("sha256").update(codeVerifier).digest("base64url");
const generateState = () => crypto.randomBytes(16).toString("hex");

router.get('/gate/check', (req, res) => {
  // legacy logged-in users
  if (req.user?.isRegistered) {
    return res.json({ ok: true, reason: 'enforce_on_callback' });
  }

  // new users (must have pre_reg cookie set from referral or reg code)
  if (req.cookies?.pre_reg) {
    return res.json({ ok: true, reason: 'pre_reg' });
  }

  // ✅ allow OAuth to start; we’ll enforce at the callback if user is truly new
  return res.json({ ok: true, reason: 'enforce_on_callback' });
});

router.get('/twitter/authorize-redirect', async (req, res) => {
    try {
if (isThrottled(req)) {
  console.log('[auth] authorize-redirect: throttled by oauth_recent cookie');
  return res.redirect(`${process.env.FRONTEND_URL}/auth?error=please_wait`);
}


    const codeVerifier  = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state         = generateState();

    oauthStore.set(state, {
      codeVerifier,
      codeChallenge,
      timestamp: Date.now(),
      allowNewUser: Boolean(req.cookies?.pre_reg),
    });

    // NEW: also persist in a short-lived cookie for reliability
    const packed = signShort({ state, codeVerifier, allowNewUser: Boolean(req.cookies?.pre_reg) });
    res.cookie(OAUTH_COOKIE, packed, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    const authUrl = new URL('https://x.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.X_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', `${process.env.BACKEND_URL}/api/auth/twitter/callback`);
    authUrl.searchParams.append('scope', 'tweet.read users.read offline.access');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');

    setThrottleCookie(res, 30); // 30s quiet period
    return res.redirect(authUrl.toString());
  } catch (err) {
    console.error('[authorize-redirect] error', err);
    return res.redirect(`${process.env.FRONTEND_URL}/register?error=auth_init_failed`);
  }
});

// GET /api/auth/twitter/authorize
router.get("/twitter/authorize", async (req, res) => {
    try {
    if (isThrottled(req)) return res.status(429).json({ success:false, message:'please_wait' });

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const allowNewUser = Boolean(req.cookies?.pre_reg);

    oauthStore.set(state, {
      codeVerifier,
      codeChallenge,
      timestamp: Date.now(),
      // ✅ remember if this flow is allowed to create a new user
      allowNewUser,
    });

    // also persist in a short-lived cookie to survive instance hops
    const packed = signShort({ state, codeVerifier, allowNewUser });
    res.cookie(OAUTH_COOKIE, packed, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of oauthStore) {
      if (value.timestamp < tenMinutesAgo) oauthStore.delete(key);
    }

    const authUrl = new URL("https://x.com/i/oauth2/authorize");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", process.env.X_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", `${process.env.BACKEND_URL}/api/auth/twitter/callback`);
    authUrl.searchParams.append("scope", "tweet.read users.read offline.access");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    setThrottleCookie(res, 30);
    return res.json({ success: true, authUrl: authUrl.toString(), state });
  } catch (error) {
    console.error("Error generating Twitter auth URL:", error);
    res.status(500).json({ success: false, message: "Failed to generate authorization URL" });
  }
});

// GET /api/auth/twitter/callback
router.get("/twitter/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Prevent double exchanges of the same authorization code
    if (!global.__usedCodes) global.__usedCodes = new Set();
    if (global.__usedCodes.has(code)) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=code_already_used`);
    }
    global.__usedCodes.add(code);
    setTimeout(() => global.__usedCodes.delete(code), 5 * 60 * 1000);

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=missing_parameters`);
    }

// --- recover PKCE/state from memory OR fallback cookie ---
const oauthData = oauthStore.get(state);
let oauth = oauthData;
let pkceSource = 'memory';

if (!oauth) {
  const packed = req.cookies?.[OAUTH_COOKIE];
  const decoded = packed ? tryVerify(packed) : null;
  if (decoded && decoded.state === state) {
    oauth = {
      codeVerifier: decoded.codeVerifier,
      allowNewUser: !!decoded.allowNewUser,
      timestamp: Date.now(),
    };
    pkceSource = 'cookie';
  }
}
if (!oauth) {
  return res.redirect(`${process.env.FRONTEND_URL}/auth?error=invalid_state`);
}

const codeVerifier    = oauth.codeVerifier;
const allowFromState  = oauth.allowNewUser === true;
const allowFromCookie = Boolean(req.cookies?.pre_reg);

// Clean memory store now that we've materialized oauth
oauthStore.delete(state);

// 👇 Helpful diagnostics (safe: only prefixes)
console.log('[auth] callback PKCE', {
  pkceSource,
  state: String(state).slice(0, 6),
  codeVerifierPrefix: String(codeVerifier || '').slice(0, 8),
  preRegMode: (() => {
    try {
      return req.cookies?.pre_reg
        ? (jwt.verify(req.cookies.pre_reg, process.env.JWT_SECRET)?.mode)
        : null;
    } catch {
      return 'bad_or_expired';
    }
  })(),
});

// --- Exchange code for token via helper (logs PKCE + handles 429 retry once)
let tokenResponse;
try {
  const form = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/twitter/callback`,
    code_verifier: codeVerifier,
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(
      `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
    ).toString('base64')}`,
  };

  // decode pre_reg just to pass its mode for the debug log (safe)
  let preRegMode = null;
  try {
    if (req.cookies?.pre_reg) {
      preRegMode = jwt.verify(req.cookies.pre_reg, process.env.JWT_SECRET)?.mode || null;
    }
  } catch { preRegMode = 'bad_or_expired'; }

  tokenResponse = await exchangeWithRetry(form, headers, {
    pkceSource,                // 'memory' or 'cookie' from the block above
    state,                     // raw state
    codeVerifier,              // raw verifier (function logs only a prefix)
    preRegMode,                // 'referral' | 'code' | null
    redirectUri: `${process.env.BACKEND_URL}/api/auth/twitter/callback`,
  });
} catch (err) {
  safeLogAxiosError('[twitter/callback] token exchange failed', err);
  const clientCode = mapAxiosErrorToCode(err);
  return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(clientCode)}`);
}

const { access_token } = tokenResponse.data || {};
if (!access_token) {
  console.error('[twitter/callback] no access_token in tokenResponse', tokenResponse?.data);
  return res.redirect(`${process.env.FRONTEND_URL}/auth?error=invalid_token_response`);
}

    // --- Pull user
    const userResponse = await axios.get("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${access_token}` },
      params: {
        "user.fields": [
          "id","name","username","profile_image_url","profile_banner_url",
          "public_metrics","verified","verified_type","created_at",
          "description","location","url"
        ].join(","),
      },
    });
    const userData = userResponse?.data?.data;

    const profileData = {
      id: userData?.id,
      username: userData?.username,
      name: userData?.name || null,
      description: userData?.description || null,
      location: userData?.location || null,
      url: userData?.url || null,
      profile_image_url: userData?.profile_image_url || null,
      profile_banner_url: userData?.profile_banner_url || null,
      twitterAccountCreatedAt: userData?.created_at || null,
      followersCount: userData?.public_metrics?.followers_count ?? 0,
      followingCount: userData?.public_metrics?.following_count ?? 0,
      tweetCount:     userData?.public_metrics?.tweet_count     ?? 0,
      listedCount:    userData?.public_metrics?.listed_count    ?? 0,
      verified: !!userData?.verified,
      verified_type: userData?.verified_type || null,
      refreshedAt: new Date().toISOString(),
    };

    // Decode pre_reg (referral / reg-code)
    let preReg = null;
    try {
      if (req.cookies?.pre_reg) preReg = jwt.verify(req.cookies.pre_reg, process.env.JWT_SECRET);
    } catch { preReg = null; }

    // --- Upsert user
    let user = await User.findOne({ twitterUserId: userData.id });
    if (!user) {
      if (!allowFromState && !allowFromCookie) {
        return res.redirect(`${process.env.FRONTEND_URL}/register?need=code`);
      }
      user = await User.create({
        username: userData.username,
        twitterUserId: userData.id,
        profilePic: userData.profile_image_url,
        isAdmin: false,
        isActive: true,
        twitterProfileData: profileData,
        isRegistered: true,
        ...(preReg?.mode === 'referral' && preReg.inviterId ? { referrerId: preReg.inviterId } : {}),
      });
    } else {
      user.username = userData.username || user.username;
      user.profilePic = userData.profile_image_url || user.profilePic;
      user.twitterUserId = userData.id || user.twitterUserId;
      user.twitterProfileData = { ...(user.twitterProfileData || {}), ...profileData };

      if (!user.referrerId && preReg?.mode === 'referral' && preReg.inviterId && String(preReg.inviterId) !== String(user._id)) {
        user.referrerId = preReg.inviterId;
      }
      if (!user.isRegistered) user.isRegistered = true;
      await user.save();
    }

try {
  // Works whether the function is sync or async:
  const eligible = await Promise.resolve(twitterAccountFilters(user.twitterProfileData));
  console.log("[auth] eligibility at login", {
    eligible,
    created_at: user.twitterProfileData?.twitterAccountCreatedAt,
    tweetCount: user.twitterProfileData?.tweetCount,
    followersCount: user.twitterProfileData?.followersCount,
    profile_image_url: user.twitterProfileData?.profile_image_url,
    verified: user.twitterProfileData?.verified,
  });
} catch (e) {
  console.warn("[auth] eligibility check threw:", e?.message || e);
}

    // Clear cookies we no longer need
    res.clearCookie('pre_reg', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.clearCookie(OAUTH_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });

    // App token → redirect
    const jwtToken = jwt.sign({
      userId: user._id,
      isAdmin: user.isAdmin || false,
      username: userData.username,
      name: userData.name,
      profileImage: userData.profile_image_url,
      isNewUser: !user.createdAt || Date.now() - user.createdAt.getTime() < 60000,
      twitterProfileData: user.twitterProfileData,
    }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth`);
    redirectUrl.searchParams.append("x_access_token", access_token);
    redirectUrl.searchParams.append("success", "true");
    redirectUrl.searchParams.append("token", jwtToken);
    redirectUrl.searchParams.append("user", encodeURIComponent(JSON.stringify({
      id: user._id,
      username: userData.username,
      twitterUserId: userData.id,
      name: userData.name,
      handle: `${userData.username}`,
      twitterFollowersCount: userData.public_metrics?.followers_count,
      verified: userData.verified,
      verified_type: userData.verified_type,
      profilePic: userData.profile_image_url,
      profileBanner: userData?.profile_banner_url || null,
      email: user.email,
      isAdmin: user.isAdmin || false,
      walletAddress: user.walletAddress,
      isNewUser: !user.email || !user.walletAddress,
      x_access_token: access_token,
      twitterProfileData: user.twitterProfileData,
      isLegacyUser: user.isLegacyUser || false,
    })));
    return res.redirect(redirectUrl.toString());

} catch (error) {
  const status  = error?.response?.status;
  const data    = error?.response?.data;
  const headers = error?.response?.headers || {};
  const msg     = error?.message;

  // Helpful console diagnostics
  console.error("[twitter/callback] token exchange failed", {
    status,
    body: data,
    headers: {
      retryAfter: headers['retry-after'],
      xRateLimitLimit: headers['x-rate-limit-limit'],
      xRateLimitRemaining: headers['x-rate-limit-remaining'],
      xRateLimitReset: headers['x-rate-limit-reset'],
    },
    message: msg,
  });

  // Map to clean query errors your Auth.jsx pretty-prints
  let errCode = 'authentication_failed';

  // Rate limit -> show "please wait ~N sec"
  if (status === 429 || msg?.toLowerCase().includes('too many requests')) {
    // try Retry-After header, else default to 60s
    const retrySecs = parseInt(headers['retry-after'], 10);
    const wait = Number.isFinite(retrySecs) ? Math.min(Math.max(retrySecs, 10), 120) : 60;
    errCode = `rate_limited_${wait}s`;
  }
  // Common OAuth errors from X
  else if (status === 400 && typeof data === 'object') {
    const ed = (data.error_description || data.error || '').toString();
    if (/code.*(used|expired)/i.test(ed))    errCode = 'code_already_used';
    else if (/invalid.*grant/i.test(ed))     errCode = 'invalid_grant';
    else if (/invalid.*client/i.test(ed))    errCode = 'invalid_client';
    else if (/authorization pending/i.test(ed)) errCode = 'please_wait';
    else if (ed)                             errCode = ed.replace(/\s+/g,'_').toLowerCase();
  }

  return res.redirect(`${process.env.FRONTEND_URL}/auth?error=${encodeURIComponent(errCode)}`);
}

});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    const response = await axios.post(
      "https://api.x.com/2/oauth2/token",
      new URLSearchParams({
        refresh_token,
        grant_type: "refresh_token",
        client_id: process.env.X_CLIENT_ID,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(400).json({
      success: false,
      message: "Failed to refresh token",
      error: error.response?.data,
    });
  }
});

// POST /api/auth/revoke
router.post("/revoke", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    await axios.post(
      "https://api.x.com/2/oauth2/revoke",
      new URLSearchParams({ token, client_id: process.env.X_CLIENT_ID }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    res.json({ success: true, message: "Token revoked successfully" });
  } catch (error) {
    console.error("Error revoking token:", error);
    res.status(400).json({
      success: false,
      message: "Failed to revoke token",
      error: error.response?.data,
    });
  }
});

// GET /api/auth/verify
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
});

// GET /api/auth/config-test
router.get("/config-test", (_req, res) => {
  res.json({
    success: true,
    config: {
      clientId: process.env.X_CLIENT_ID,
      redirectUri: `${process.env.BACKEND_URL}/api/auth/twitter/callback`,
      backendUrl: process.env.BACKEND_URL,
      frontendUrl: process.env.FRONTEND_URL,
      hasClientSecret: !!process.env.X_CLIENT_SECRET,
    },
  });
});

router.post('/disconnect-wallet', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Only disconnect if user doesn't have a pending QUTIE mint
    // (You don't want to disconnect if they have a mint in progress)
    if (user.qutie?.mintStatus === 'pending') {
      console.log(`User ${user.username} has pending QUTIE mint, skipping wallet disconnect`);
      return res.json({ 
        success: true, 
        message: 'Wallet disconnect skipped due to pending mint' 
      });
    }

    // Disconnect the wallet safely
    try {
      await user.disconnectWallet();
      console.log(`Disconnected wallet for user: ${user.username}`);
      
      res.json({ 
        success: true, 
        message: 'Wallet disconnected successfully' 
      });
    } catch (error) {
      // If disconnect fails (e.g., due to QUTIE restrictions), log but don't fail
      console.log(`Could not disconnect wallet for ${user.username}:`, error.message);
      res.json({ 
        success: true, 
        message: 'Logout completed (wallet disconnect skipped)' 
      });
    }

  } catch (error) {
    console.error('Disconnect wallet error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to disconnect wallet' 
    });
  }
});

module.exports = router;
