const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StudioProfile = require("../models/StudioProfile");
const WhitelistProfile = require("../models/WhitelistProfile");

const router = express.Router();

const OAUTH_COOKIE   = "google_oauth_state";
const OAUTH_THROTTLE = "google_oauth_recent";

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

function setThrottleCookie(res, ttlSec = 30) {
  res.cookie(OAUTH_THROTTLE, Date.now().toString(), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: ttlSec * 1000,
  });
}

function isThrottled(req) {
  return Boolean(req.cookies?.[OAUTH_THROTTLE]);
}

// ─── GET /api/auth/google/authorize ──────────────────────────────────────────
router.get("/authorize", async (req, res) => {
  try {
    if (isThrottled(req)) {
      return res.status(429).json({ success: false, message: "please_wait" });
    }

    const state = generateState();

    res.cookie(OAUTH_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", `${process.env.BACKEND_URL}/api/auth/google/callback`);
    authUrl.searchParams.append("scope", "openid email profile");
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "select_account");

    setThrottleCookie(res, 30);
    return res.redirect(authUrl.toString());
  } catch (err) {
    console.error("[google/authorize] error:", err);
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=auth_init_failed`);
  }
});

// ─── GET /api/auth/google/callback ───────────────────────────────────────────
router.get("/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=access_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=missing_params`);
    }

    // CSRF check — skip if cookie missing (can happen with Cloud Run instance hops)
    const storedState = req.cookies?.[OAUTH_COOKIE];
    console.log("[google/callback] state check:", {
      storedState: storedState ? "present" : "missing",
      stateMatch: storedState === state,
    });

    if (storedState && storedState !== state) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=invalid_state`);
    }

    res.clearCookie(OAUTH_COOKIE, { path: "/" });

    // ── Exchange code for tokens ──────────────────────────────────────────────
    console.log("[google/callback] credentials check:", { redirect_uri: `${process.env.BACKEND_URL}/api/auth/google/callback`, client_id_present: !!process.env.GOOGLE_CLIENT_ID, client_id_prefix: (process.env.GOOGLE_CLIENT_ID || "").slice(0, 12), secret_present: !!process.env.GOOGLE_CLIENT_SECRET, secret_prefix: (process.env.GOOGLE_CLIENT_SECRET || "").slice(0, 6) });

    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${process.env.BACKEND_URL}/api/auth/google/callback`,
        grant_type:    "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token } = tokenResponse.data;

    // ── Fetch Google user profile ─────────────────────────────────────────────
    const profileResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const googleUser = profileResponse.data;
    console.log("[google/callback] got profile for:", googleUser.email);

    // ── Find or create user ───────────────────────────────────────────────────
    let user = await User.findOne({ email: googleUser.email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      const baseUsername = (googleUser.name || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20) || "user";

      let username = baseUsername;
      let attempt = 0;
      while (await User.findOne({ username })) {
        attempt++;
        username = `${baseUsername}${attempt}`;
      }

      user = await User.create({
        username,
        email:             googleUser.email,
        profilePic:        googleUser.picture,
        isActive:          true,
        isAdmin:           false,
        isRegistered:      true,
      });

      try {
        await assignCharacter(user._id);
      } catch (err) {
        console.error("[google/callback] character assignment failed:", err);
      }
    }

    // ── Find or create WhitelistProfile ──────────────────────────────────────
    try {
      const profileSet = {
        "tasks.googleConnected":        true,
        "metadata.lastAuthenticatedAt": new Date(),
      };
      if (googleUser.email) {
        profileSet.email = googleUser.email.toLowerCase().trim();
      }
      if (googleUser.id) {
        profileSet.googleId = googleUser.id;
      }

      await WhitelistProfile.findOneAndUpdate(
        { userId: user._id },
        {
          $set: profileSet,
          $setOnInsert: { onboardingStatus: "google_connected" },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("[google/callback] whitelist profile upsert failed:", err);
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const jwtToken = jwt.sign(
      {
        userId:       user._id,
        isAdmin:      user.isAdmin || false,
        username:     user.username,
        name:         googleUser.name,
        profileImage: googleUser.picture,
        email:        user.email,
        isNewUser,
        authProvider: "google",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ── Redirect to frontend ──────────────────────────────────────────────────
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth`);
    redirectUrl.searchParams.append("success", "true");
    redirectUrl.searchParams.append("token", jwtToken);
    redirectUrl.searchParams.append("user", encodeURIComponent(JSON.stringify({
      id:           user._id,
      username:     user.username,
      name:         googleUser.name,
      email:        user.email,
      profilePic:   googleUser.picture,
      isAdmin:      user.isAdmin || false,
      isNewUser,
      authProvider: "google",
      walletAddress: user.walletAddress,
    })));

    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error("[google/callback] error:", err?.response?.data || err?.message || err);
    return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
  }
});

// ─── Character assignment ─────────────────────────────────────────────────────
async function assignCharacter(userId) {
  const existing = await StudioProfile.findOne({ userId });
  if (existing) return;

  const { getRandomCharacters } = require("../lib/characters");
  const assignedCharacters = await getRandomCharacters(3);

  await StudioProfile.create({
    userId,
    characters: assignedCharacters.map((character, index) => ({
      characterId: character.characterId,
      assignedAt:  new Date(),
      unlockedAt:  new Date(),
      isActive:    index === 0,
    })),
    credits:     0,
    soniqPoints: 0,
  });
}

module.exports = router;
