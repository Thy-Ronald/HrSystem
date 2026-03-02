/**
 * Monitoring Authentication Middleware
 * Validates Firebase ID tokens for Socket.IO connections and HTTP requests.
 * After verifying the Firebase token, resolves the linked MySQL user so that
 * all downstream code still receives an integer userId (backward-compatible).
 */

const { authB } = require('../config/firebaseProjectB');
const userService = require('../services/userService');

/**
 * Socket.IO authentication middleware (async)
 */
async function socketAuth(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = await authB.verifyIdToken(token);
    const user    = await userService.findUserByFirebaseUid(decoded.uid);

    if (!user) {
      return next(new Error('User profile not found'));
    }

    socket.data.user          = { ...user, uid: decoded.uid };
    socket.data.authenticated = true;
    socket.data.role          = user.role;
    socket.data.name          = user.name;
    socket.data.userId        = user.id; // integer — backward compatible with all models

    next();
  } catch (error) {
    next(new Error(`Authentication failed: ${error.message}`));
  }
}

/**
 * HTTP request authentication middleware (async)
 */
async function httpAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Bearer token required in Authorization header',
      });
    }

    const token   = authHeader.replace('Bearer ', '');
    const decoded = await authB.verifyIdToken(token);
    const user    = await userService.findUserByFirebaseUid(decoded.uid);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User profile not found. Please sign up first.',
      });
    }

    req.user = {
      userId:     user.id,    // integer — backward compatible
      uid:        decoded.uid, // Firebase UID
      role:       user.role,
      name:       user.name,
      email:      user.email,
      avatar_url: user.avatar_url,
    };
    req.authenticated = true;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message || 'Invalid or expired token',
    });
  }
}

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.authenticated || !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}

module.exports = {
  socketAuth,
  httpAuth,
  requireRole,
};
