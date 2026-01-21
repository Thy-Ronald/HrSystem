/**
 * SQL validation utilities
 * Provides input validation and sanitization for SQL operations
 */

/**
 * Validate and sanitize string input
 * @param {string} value - Input value
 * @param {number} maxLength - Maximum allowed length
 * @returns {string|null}
 */
function validateString(value, maxLength = 255) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str.length === 0) return null;
  if (str.length > maxLength) {
    throw new Error(`String exceeds maximum length of ${maxLength} characters`);
  }
  return str;
}

/**
 * Validate and sanitize required string input
 * @param {string} value - Input value
 * @param {string} fieldName - Field name for error messages
 * @param {number} maxLength - Maximum allowed length
 * @returns {string}
 */
function validateRequiredString(value, fieldName, maxLength = 255) {
  const str = validateString(value, maxLength);
  if (!str) {
    throw new Error(`${fieldName} is required`);
  }
  return str;
}

/**
 * Validate and sanitize datetime input
 * @param {string|Date} value - Input value
 * @returns {string|null} - ISO datetime string (YYYY-MM-DD HH:mm:ss)
 */
function validateDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid datetime format');
  }
  // Format as MySQL DATETIME: YYYY-MM-DD HH:mm:ss
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Validate and sanitize required datetime input
 * @param {string|Date} value - Input value
 * @param {string} fieldName - Field name for error messages
 * @returns {string}
 */
function validateRequiredDateTime(value, fieldName) {
  const datetime = validateDateTime(value);
  if (!datetime) {
    throw new Error(`${fieldName} is required`);
  }
  return datetime;
}

/**
 * Validate and sanitize integer input
 * @param {string|number} value - Input value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null}
 */
function validateInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num)) {
    throw new Error('Value must be an integer');
  }
  if (num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  if (num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  return num;
}

/**
 * Validate and sanitize required integer input
 * @param {string|number} value - Input value
 * @param {string} fieldName - Field name for error messages
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
function validateRequiredInteger(value, fieldName, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} is required`);
  }
  return validateInteger(value, min, max);
}

/**
 * Validate and sanitize float input
 * @param {string|number} value - Input value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null}
 */
function validateFloat(value, min = Number.NEGATIVE_INFINITY, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('Value must be a valid number');
  }
  if (num < min) {
    throw new Error(`Value must be at least ${min}`);
  }
  if (num > max) {
    throw new Error(`Value must be at most ${max}`);
  }
  return num;
}

/**
 * Validate contract data before database insertion
 * Matches staff_contract table schema
 * @param {Object} data - Contract data
 * @returns {Object} - Validated and sanitized contract data
 */
function validateContractData(data) {
  return {
    name: validateRequiredString(data.name || data.employeeName, 'Name', 255),
    position: validateRequiredString(data.position, 'Position', 255),
    assessmentDate: validateRequiredDateTime(data.assessmentDate, 'Assessment Date'),
    basicSalary: validateRequiredInteger(data.basicSalary, 'Basic Salary', 0),
    allowance: validateInteger(data.allowance, 0) || null,
    attendanceBonus: validateFloat(data.attendanceBonus, 0) || null,
    fullAttendanceBonus: validateFloat(data.fullAttendanceBonus, 0) || null,
    signingBonus: validateString(data.signingBonus, 255) || null,
    termMonths: validateRequiredInteger(data.termMonths || data.term, 'Term (months)', 1),
    expirationDate: validateDateTime(data.expirationDate) || null,
    resignationDate: validateDateTime(data.resignationDate) || null,
  };
}

/**
 * Validate contract data for updates (allows partial updates)
 * Only validates fields that are present in the data object
 * @param {Object} data - Contract data to update
 * @returns {Object} - Validated and sanitized contract data
 */
function validateContractUpdateData(data) {
  const validated = {};

  if (data.name !== undefined || data.employeeName !== undefined) {
    validated.name = validateRequiredString(data.name || data.employeeName, 'Name', 255);
  }
  if (data.position !== undefined) {
    validated.position = validateRequiredString(data.position, 'Position', 255);
  }
  if (data.assessmentDate !== undefined) {
    validated.assessmentDate = validateRequiredDateTime(data.assessmentDate, 'Assessment Date');
  }
  if (data.basicSalary !== undefined) {
    validated.basicSalary = validateRequiredInteger(data.basicSalary, 'Basic Salary', 0);
  }
  if (data.allowance !== undefined) {
    validated.allowance = validateInteger(data.allowance, 0) || null;
  }
  if (data.attendanceBonus !== undefined) {
    validated.attendanceBonus = validateFloat(data.attendanceBonus, 0) || null;
  }
  if (data.fullAttendanceBonus !== undefined) {
    validated.fullAttendanceBonus = validateFloat(data.fullAttendanceBonus, 0) || null;
  }
  if (data.signingBonus !== undefined) {
    validated.signingBonus = validateString(data.signingBonus, 255) || null;
  }
  if (data.termMonths !== undefined || data.term !== undefined) {
    validated.termMonths = validateRequiredInteger(data.termMonths || data.term, 'Term (months)', 1);
  }
  if (data.expirationDate !== undefined) {
    validated.expirationDate = validateDateTime(data.expirationDate) || null;
  }
  if (data.resignationDate !== undefined) {
    validated.resignationDate = validateDateTime(data.resignationDate) || null;
  }

  if (Object.keys(validated).length === 0) {
    throw new Error('No valid fields provided for update');
  }

  return validated;
}

module.exports = {
  validateString,
  validateRequiredString,
  validateDateTime,
  validateRequiredDateTime,
  validateInteger,
  validateRequiredInteger,
  validateFloat,
  validateContractData,
  validateContractUpdateData,
};
