// middlewares/verifyToken.js
const jwt = require('jsonwebtoken');

/**
 * Extracts a JWT from common locations (Authorization header preferred).
 */
function extractToken(req) {
  // 1) Authorization: Bearer <token>
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }

  // 2) Legacy query param (e.g. ?token=...)
  if (req.query?.token) return String(req.query.token).trim();

  // 3) Cookie (only if you use cookie-parser + set a cookie)
  if (req.cookies?.token) return String(req.cookies.token).trim();

  return null;
}

/**
 * Adds a normalized user payload to req.user.
 * - Always sets req.user.userId (backwards compat for code using _id or id)
 * - Passes through any other claims (username, isAdmin, etc.)
 */
function normalizeUser(decoded) {
  const userId = decoded.userId || decoded._id || decoded.id;
  return {
    ...decoded,
    userId,              // normalized
    _id: decoded._id || userId, // keep _id if callers use it
    id: decoded.id || userId,   // keep id if callers use it
  };
}

/**
 * Require a valid JWT.
 */
function verifyToken(req, res, next) {
  try {
    // Let CORS preflight pass quickly (no auth)
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }

    if (!process.env.JWT_SECRET) {
      // Fail fast in case env is misconfigured
      console.error('[Auth] JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = normalizeUser(decoded);
    return next();
  } catch (err) {
    // Token malformed or expired
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

/**
 * Require admin (after verifyToken).
 */
function verifyTokenAndAdmin(req, res, next) {
  // If verifyToken wasn’t applied earlier, run it inline
  if (!req.user) {
    return verifyToken(req, res, function afterVerify(err) {
      if (err) return; // verifyToken already sent response
      if (req.user?.isAdmin) return next();
      return res.status(403).json({ error: 'Forbidden: admin only' });
    });
  }
  if (req.user?.isAdmin) return next();
  return res.status(403).json({ error: 'Forbidden: admin only' });
}

module.exports = {
  verifyToken,
  verifyTokenAndAdmin,
};
