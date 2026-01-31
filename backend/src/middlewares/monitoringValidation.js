/**
 * Monitoring Input Validation and Sanitization
 * Validates and sanitizes user inputs for monitoring feature
 */

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 100); // Limit length
}

/**
 * Validate and sanitize user name
 * @param {string} name - User name
 * @returns {Object} { valid: boolean, sanitized: string, error?: string }
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, sanitized: '', error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, sanitized: '', error: 'Name must not exceed 50 characters' };
  }

  // Allow letters, numbers, spaces, hyphens, and underscores
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Name contains invalid characters' };
  }

  return { valid: true, sanitized: sanitizeString(trimmed) };
}

/**
 * Validate role
 * @param {string} role - User role
 * @returns {Object} { valid: boolean, sanitized: string, error?: string }
 */
function validateRole(role) {
  const validRoles = ['employee', 'admin'];

  if (!role || typeof role !== 'string') {
    return { valid: false, sanitized: '', error: 'Role is required' };
  }

  const normalized = role.toLowerCase().trim();

  if (!validRoles.includes(normalized)) {
    return { valid: false, sanitized: '', error: `Role must be one of: ${validRoles.join(', ')}` };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validate session ID format
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if valid format
 */
function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Session ID format: session_timestamp_random
  return /^session_\d+_[a-z0-9]+$/.test(sessionId);
}

/**
 * Validate WebRTC offer/answer format
 * @param {Object} sdp - SDP object
 * @returns {boolean} True if valid
 */
function validateSDP(sdp) {
  if (!sdp || typeof sdp !== 'object') {
    return false;
  }

  // Basic SDP validation
  return (
    typeof sdp.type === 'string' &&
    (sdp.type === 'offer' || sdp.type === 'answer') &&
    typeof sdp.sdp === 'string' &&
    sdp.sdp.length > 0 &&
    sdp.sdp.length < 10000 // Reasonable size limit
  );
}

/**
 * Validate ICE candidate
 * @param {Object} candidate - ICE candidate
 * @returns {boolean} True if valid
 */
function validateICECandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  // Basic ICE candidate validation
  return (
    typeof candidate.candidate === 'string' &&
    candidate.candidate.length > 0 &&
    candidate.candidate.length < 1000
  );
}

/**
 * Validate monitoring authentication payload
 * @param {Object} payload - Auth payload
 * @returns {Object} { valid: boolean, sanitized: Object, errors: string[] }
 */
function validateAuthPayload(payload) {
  const errors = [];
  const sanitized = {};

  // Validate role
  const roleValidation = validateRole(payload.role);
  if (!roleValidation.valid) {
    errors.push(roleValidation.error);
  } else {
    sanitized.role = roleValidation.sanitized;
  }

  // Validate name
  const nameValidation = validateName(payload.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error);
  } else {
    sanitized.name = nameValidation.sanitized;
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

module.exports = {
  sanitizeString,
  validateName,
  validateRole,
  validateSessionId,
  validateSDP,
  validateICECandidate,
  validateAuthPayload,
};
