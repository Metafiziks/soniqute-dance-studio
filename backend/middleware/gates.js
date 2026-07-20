// middleware/gates.js
const FRONTEND_URL = process.env.FRONTEND_URL;

const PUBLIC_API = [
  /^\/api\/auth(?:\/|$)/,           // all auth endpoints
  /^\/api\/auth\/gate\/check$/,     // explicit
  /^\/api\/health$/, /^\/health$/,  // health
  /^\/r(?:\/|$)/,                   // public referral
  /^\/api\/register(?:\/|$)/        // if you add reg-code endpoints
];

function isPublic(path) {
  return PUBLIC_API.some(rx => rx.test(path));
}
function isAjax(req) {
  const a = req.get('Accept') || '';
  return req.get('X-Requested-With') === 'XMLHttpRequest' || a.includes('application/json');
}

function isApi(req) {
  return req.path.startsWith('/api/');
}

function registrationGate(req, res, next) {
  if (isApi(req)) return next();                    // ✅ do not gate API calls
  if (req.user?.isRegistered) return next();
  if (req.cookies?.pre_reg)   return next();

  // If request wants JSON, return 403 JSON; else redirect
  const wantsJSON = req.headers.accept?.includes('application/json');
  if (wantsJSON) return res.status(403).json({ ok: false, reason: 'registration_required' });
  return res.redirect('/auth/x');
}

function challengeGate(req, res, next) {
  if (isApi(req)) return next();                    // ✅ do not gate API calls
  const enabled = process.env.GATE_CHALLENGE_ENABLED === 'true';
  if (!enabled) return next();
  if (!req.user) return res.redirect('/auth/x');
  if (!req.user.requiresChallenge) return next();
  if (req.user.challengePassedAt) return next();

  const wantsJSON = req.headers.accept?.includes('application/json');
  if (wantsJSON) return res.status(403).json({ ok: false, reason: 'challenge_required' });
  return res.redirect('/challenge');
}

function registrationGateApi(req, res, next) {
  // If user doc not loaded, don’t block — let the request pass
  if (!req.user || typeof req.user.isRegistered === 'undefined') return next();
  if (req.user.isRegistered) return next();
  return res.status(403).json({ ok:false, reason:'registration_required' });
}

function challengeGateApi(req, res, next) {
  const enabled = process.env.GATE_CHALLENGE_ENABLED === 'true';
  if (!enabled) return next();
  if (!req.user) return next(); // don’t block if not loaded
  if (!req.user.requiresChallenge) return next();
  if (req.user.challengePassedAt) return next();
  return res.status(403).json({ ok:false, reason:'challenge_required' });
}

module.exports = { registrationGate, challengeGate, registrationGateApi, challengeGateApi };
