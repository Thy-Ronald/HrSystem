/**
 * Monitoring Authentication Middleware
 * Validates JWT tokens for Socket.IO connections and HTTP requests
 */

const { verifyToken } = require('../utils/jwt');

/**
 * Socket.IO authentication middleware
 * Validates JWT token from handshake auth
 */
function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = verifyToken(token);
    socket.data.user = decoded;
    socket.data.authenticated = true;
    socket.data.role = decoded.role;
    socket.data.name = decoded.name;
    socket.data.userId = decoded.userId;

    next();
  } catch (error) {
    next(new Error(`Authentication failed: ${error.message}`));
  }
}

/**
 * HTTP request authentication middleware
 * Validates JWT token from Authorization header
 */
function httpAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Bearer token required in Authorization header',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);

    req.user = decoded;
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
