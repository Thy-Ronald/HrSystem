/**
 * Validation middleware for request validation
 * Validates required fields, numeric ranges, and date formats
 */

/**
 * Validate date string
 * @param {string|Date} dateValue - Date value to validate
 * @returns {boolean} - True if valid date
 */
function isValidDate(dateValue) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !isNaN(date.getTime());
}

/**
 * Validate contract creation/update data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 * @param {boolean} isUpdate - Whether this is an update (allows partial data)
 */
function validateContract(req, res, next, isUpdate = false) {
  const errors = [];
  const data = req.body;

  // Required fields (only for creation)
  if (!isUpdate) {
    // name is required
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('name is required and must be a non-empty string');
    }

    // position is required
    if (!data.position || typeof data.position !== 'string' || data.position.trim().length === 0) {
      errors.push('position is required and must be a non-empty string');
    }

    // assessment_date is required (accepts both camelCase and snake_case)
    const assessmentDate = data.assessmentDate || data.assessment_date;
    if (!assessmentDate) {
      errors.push('assessment_date is required');
    } else if (!isValidDate(assessmentDate)) {
      errors.push('assessment_date must be a valid date');
    }

    // basic_salary is required (accepts both camelCase and snake_case)
    const basicSalary = data.basicSalary !== undefined ? data.basicSalary : data.basic_salary;
    if (basicSalary === undefined || basicSalary === null) {
      errors.push('basic_salary is required');
    } else {
      const salary = Number(basicSalary);
      if (!Number.isInteger(salary)) {
        errors.push('basic_salary must be an integer');
      } else if (salary < 0) {
        errors.push('basic_salary must be 0 or greater');
      }
    }

    // term_months is required (accepts both camelCase and snake_case)
    const termMonths = data.termMonths !== undefined ? data.termMonths : data.term_months;
    if (termMonths === undefined || termMonths === null) {
      errors.push('term_months is required');
    } else {
      const term = Number(termMonths);
      if (!Number.isInteger(term)) {
        errors.push('term_months must be an integer');
      } else if (term < 1) {
        errors.push('term_months must be 1 or greater');
      }
    }
  }

  // Validate name (if provided)
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('name must be a non-empty string');
    } else if (data.name.length > 255) {
      errors.push('name must not exceed 255 characters');
    }
  }

  // Validate position (if provided)
  if (data.position !== undefined) {
    if (typeof data.position !== 'string' || data.position.trim().length === 0) {
      errors.push('position must be a non-empty string');
    } else if (data.position.length > 255) {
      errors.push('position must not exceed 255 characters');
    }
  }

  // Validate assessment_date (if provided)
  const assessmentDate = data.assessmentDate || data.assessment_date;
  if (assessmentDate !== undefined && assessmentDate !== null) {
    if (!isValidDate(assessmentDate)) {
      errors.push('assessment_date must be a valid date');
    }
  }

  // Validate basic_salary (if provided) - must be >= 0
  const basicSalary = data.basicSalary !== undefined ? data.basicSalary : data.basic_salary;
  if (basicSalary !== undefined && basicSalary !== null) {
    const salary = Number(basicSalary);
    if (!Number.isInteger(salary)) {
      errors.push('basic_salary must be an integer');
    } else if (salary < 0) {
      errors.push('basic_salary must be 0 or greater');
    }
  }

  // Validate term_months (if provided)
  const termMonths = data.termMonths !== undefined ? data.termMonths : data.term_months;
  if (termMonths !== undefined && termMonths !== null) {
    const term = Number(termMonths);
    if (!Number.isInteger(term)) {
      errors.push('term_months must be an integer');
    } else if (term < 1) {
      errors.push('term_months must be 1 or greater');
    }
  }

  // Validate allowance (if provided) - must be >= 0
  const allowance = data.allowance !== undefined ? data.allowance : data.allowance;
  if (allowance !== undefined && allowance !== null) {
    const allowanceValue = Number(allowance);
    if (!Number.isInteger(allowanceValue)) {
      errors.push('allowance must be an integer');
    } else if (allowanceValue < 0) {
      errors.push('allowance must be 0 or greater');
    }
  }

  // Validate attendanceBonus (if provided) - must be >= 0
  const attendanceBonus = data.attendanceBonus !== undefined ? data.attendanceBonus : data.attendance_bonus;
  if (attendanceBonus !== undefined && attendanceBonus !== null) {
    const bonus = Number(attendanceBonus);
    if (!Number.isFinite(bonus)) {
      errors.push('attendance_bonus must be a valid number');
    } else if (bonus < 0) {
      errors.push('attendance_bonus must be 0 or greater');
    }
  }

  // Validate fullAttendanceBonus (if provided) - must be >= 0
  const fullAttendanceBonus = data.fullAttendanceBonus !== undefined ? data.fullAttendanceBonus : data.full_attendance_bonus;
  if (fullAttendanceBonus !== undefined && fullAttendanceBonus !== null) {
    const bonus = Number(fullAttendanceBonus);
    if (!Number.isFinite(bonus)) {
      errors.push('full_attendance_bonus must be a valid number');
    } else if (bonus < 0) {
      errors.push('full_attendance_bonus must be 0 or greater');
    }
  }

  // Validate signingBonus (if provided)
  if (data.signingBonus !== undefined && data.signingBonus !== null) {
    if (typeof data.signingBonus !== 'string') {
      errors.push('signing_bonus must be a string');
    } else if (data.signingBonus.length > 255) {
      errors.push('signing_bonus must not exceed 255 characters');
    }
  }

  // Validate expirationDate (if provided)
  const expirationDate = data.expirationDate || data.expiration_date;
  if (expirationDate !== undefined && expirationDate !== null) {
    if (!isValidDate(expirationDate)) {
      errors.push('expiration_date must be a valid date');
    }
  }

  // Validate resignationDate (if provided)
  const resignationDate = data.resignationDate || data.resignation_date;
  if (resignationDate !== undefined && resignationDate !== null) {
    if (!isValidDate(resignationDate)) {
      errors.push('resignation_date must be a valid date');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: errors,
    });
  }

  next();
}

/**
 * Middleware to validate contract creation data
 */
function validateCreateContract(req, res, next) {
  return validateContract(req, res, next, false);
}

/**
 * Middleware to validate contract update data
 */
function validateUpdateContract(req, res, next) {
  return validateContract(req, res, next, true);
}

/**
 * Validate ID parameter
 */
function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'ID must be a positive integer',
    });
  }
  req.params.id = id; // Normalize to integer
  next();
}

module.exports = {
  validateCreateContract,
  validateUpdateContract,
  validateId,
};
