/**
 * Error handling middleware
 * Handles Firebase/Firestore errors and provides user-friendly messages.
 * Never exposes raw internal errors to clients.
 */

/**
 * Map Firebase/Firestore error codes to HTTP status + message
 * @param {Error} error
 * @returns {{ status: number, message: string, error: string } | null}
 */
function sanitizeFirebaseError(error) {
  // Firebase Admin SDK errors carry a `code` property like "auth/user-not-found"
  // Firestore gRPC errors carry a `code` property (numeric) or a string like "5 NOT_FOUND"
  const code = error.code || '';
  const message = error.message || '';

  // ── Auth errors ────────────────────────────────────────────────────────────
  if (code === 'auth/id-token-expired' || code === 'auth/argument-error') {
    return { status: 401, error: 'Unauthorized', message: 'Authentication token is invalid or expired.' };
  }
  if (code === 'auth/user-not-found') {
    return { status: 404, error: 'Not Found', message: 'User not found.' };
  }
  if (code === 'auth/email-already-exists' || code === 'auth/email-already-in-use') {
    return { status: 409, error: 'Conflict', message: 'A user with this email already exists.' };
  }
  if (code && code.startsWith('auth/')) {
    return { status: 400, error: 'Authentication Error', message: 'An authentication error occurred.' };
  }

  // ── Firestore / gRPC status codes ──────────────────────────────────────────
  // gRPC canonical codes: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
  if (code === 7 || message.includes('PERMISSION_DENIED')) {
    return { status: 403, error: 'Forbidden', message: 'You do not have permission to perform this action.' };
  }
  if (code === 5 || message.includes('NOT_FOUND')) {
    return { status: 404, error: 'Not Found', message: 'The requested resource was not found.' };
  }
  if (code === 6 || message.includes('ALREADY_EXISTS')) {
    return { status: 409, error: 'Conflict', message: 'A record with this information already exists.' };
  }
  if (code === 3 || message.includes('INVALID_ARGUMENT')) {
    return { status: 400, error: 'Bad Request', message: 'Invalid data provided.' };
  }
  if (code === 8 || message.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, error: 'Too Many Requests', message: 'Service quota exceeded. Please try again later.' };
  }
  if (code === 14 || message.includes('UNAVAILABLE')) {
    return { status: 503, error: 'Service Unavailable', message: 'Database service is temporarily unavailable.' };
  }
  if (code === 4 || message.includes('DEADLINE_EXCEEDED')) {
    return { status: 504, error: 'Gateway Timeout', message: 'The request timed out. Please try again.' };
  }
  if (code === 16 || message.includes('UNAUTHENTICATED')) {
    return { status: 401, error: 'Unauthorized', message: 'Authentication required.' };
  }

  return null; // Not a Firebase/Firestore error
}

/**
 * Main error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the full error server-side only
  console.error('Error occurred:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle Firebase / Firestore errors
  const firebaseError = sanitizeFirebaseError(err);
  if (firebaseError) {
    return res.status(firebaseError.status).json({
      success: false,
      error: firebaseError.error,
      message: firebaseError.message,
    });
  }

  // Handle validation errors (already formatted by middleware)
  if (err.status === 400 && err.errors) {
    return res.status(400).json({
      success: false,
      error: err.error || 'Validation failed',
      errors: err.errors,
    });
  }

  // Handle custom application errors with explicit status
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'An error occurred',
    });
  }

  // Handle "not found" errors thrown without explicit status
  if (err.message && err.message.toLowerCase().includes('not found')) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  // Default: Internal server error — never expose raw error details in production
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred. Please try again later.',
  });
}

module.exports = { errorHandler, sanitizeFirebaseError };

