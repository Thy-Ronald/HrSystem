/**
 * Error handling middleware
 * Sanitizes SQL errors and provides user-friendly error messages
 * Never exposes raw SQL errors to clients
 */

/**
 * Map MySQL error codes to user-friendly messages
 * @param {Error} error - Database error
 * @returns {Object} - Sanitized error object
 */
function sanitizeDatabaseError(error) {
  // MySQL error codes
  const errorCode = error.code || error.errno;
  const sqlState = error.sqlState;

  // Duplicate entry error (ER_DUP_ENTRY)
  if (errorCode === 'ER_DUP_ENTRY' || errorCode === 1062) {
    return {
      status: 409,
      message: 'A record with this information already exists',
      error: 'Duplicate entry',
    };
  }

  // Foreign key constraint error
  if (errorCode === 'ER_NO_REFERENCED_ROW_2' || errorCode === 1216 || 
      errorCode === 'ER_ROW_IS_REFERENCED_2' || errorCode === 1217) {
    return {
      status: 400,
      message: 'Cannot perform this operation due to related records',
      error: 'Referential integrity violation',
    };
  }

  // Table doesn't exist
  if (errorCode === 'ER_NO_SUCH_TABLE' || errorCode === 1146) {
    return {
      status: 500,
      message: 'Database configuration error',
      error: 'Table not found',
    };
  }

  // Column doesn't exist
  if (errorCode === 'ER_BAD_FIELD_ERROR' || errorCode === 1054) {
    return {
      status: 500,
      message: 'Database configuration error',
      error: 'Invalid field',
    };
  }

  // Connection errors
  if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT' || 
      errorCode === 'PROTOCOL_CONNECTION_LOST') {
    return {
      status: 503,
      message: 'Database service is temporarily unavailable',
      error: 'Service unavailable',
    };
  }

  // Access denied
  if (errorCode === 'ER_ACCESS_DENIED_ERROR' || errorCode === 1045) {
    return {
      status: 500,
      message: 'Database configuration error',
      error: 'Access denied',
    };
  }

  // Database doesn't exist
  if (errorCode === 'ER_BAD_DB_ERROR' || errorCode === 1049) {
    return {
      status: 500,
      message: 'Database configuration error',
      error: 'Database not found',
    };
  }

  // Check constraint violation
  if (errorCode === 'ER_CHECK_CONSTRAINT_VIOLATED' || sqlState === '23000') {
    return {
      status: 400,
      message: 'Data validation failed',
      error: 'Constraint violation',
    };
  }

  // Generic SQL error - don't expose details
  if (errorCode && typeof errorCode === 'string' && errorCode.startsWith('ER_')) {
    return {
      status: 400,
      message: 'Invalid data provided',
      error: 'Database error',
    };
  }

  // Unknown database error
  return {
    status: 500,
    message: 'An unexpected database error occurred',
    error: 'Database error',
  };
}

/**
 * Check if error is a database/SQL error
 * @param {Error} error - Error object
 * @returns {boolean} - True if database error
 */
function isDatabaseError(error) {
  return !!(
    error.code ||
    error.errno ||
    error.sqlState ||
    error.sqlMessage ||
    (error.message && (
      error.message.includes('SQL') ||
      error.message.includes('database') ||
      error.message.includes('ER_') ||
      error.message.includes('connection')
    ))
  );
}

/**
 * Main error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
function errorHandler(err, req, res, next) {
  // Log the full error for debugging (server-side only)
  console.error('Error occurred:', {
    message: err.message,
    code: err.code,
    errno: err.errno,
    sqlState: err.sqlState,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle database/SQL errors
  if (isDatabaseError(err)) {
    const sanitized = sanitizeDatabaseError(err);
    return res.status(sanitized.status).json({
      success: false,
      error: sanitized.error,
      message: sanitized.message,
    });
  }

  // Handle validation errors (already formatted)
  if (err.status === 400 && err.errors) {
    return res.status(400).json({
      success: false,
      error: err.error || 'Validation failed',
      errors: err.errors,
    });
  }

  // Handle custom application errors
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'An error occurred',
    });
  }

  // Handle missing record errors (from controllers)
  if (err.message && err.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Resource not found',
    });
  }

  // Default: Internal server error (never expose raw errors)
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = { errorHandler, sanitizeDatabaseError, isDatabaseError };
