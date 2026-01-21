const { query } = require('../config/database');
const { validateContractData, validateContractUpdateData } = require('../utils/sqlValidation');

/**
 * Data Access Layer for staff_contract table
 * Provides CRUD operations with prepared statements for SQL injection prevention
 */

/**
 * Create a new contract
 * @param {Object} data - Contract data
 * @returns {Promise<Object>} - Created contract with ID
 * @throws {Error} - Validation or database error
 */
async function createContract(data) {
  // Validate and sanitize input
  const validatedData = validateContractData(data);

  // Use prepared statement to prevent SQL injection
  const sql = `
    INSERT INTO staff_contract (
      name,
      position,
      assessment_date,
      basic_salary,
      allowance,
      attendance_bonus,
      full_attendance_bonus,
      signing_bonus,
      term_months,
      resignation_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    validatedData.name,
    validatedData.position,
    validatedData.assessmentDate,
    validatedData.basicSalary,
    validatedData.allowance,
    validatedData.attendanceBonus,
    validatedData.fullAttendanceBonus,
    validatedData.signingBonus,
    validatedData.termMonths,
    validatedData.resignationDate,
  ];

  try {
    const result = await query(sql, params);
    
    // Fetch and return the created contract
    return await getContractById(result.insertId);
  } catch (error) {
    console.error('Error creating contract:', error);
    throw error;
  }
}

/**
 * Get all contracts from the database
 * @returns {Promise<Array>} - Array of all contracts
 * @throws {Error} - Database error
 */
async function getAllContracts() {
  const sql = `
    SELECT 
      id,
      name,
      position,
      assessment_date as assessmentDate,
      basic_salary as basicSalary,
      allowance,
      attendance_bonus as attendanceBonus,
      full_attendance_bonus as fullAttendanceBonus,
      signing_bonus as signingBonus,
      term_months as termMonths,
      resignation_date as resignationDate,
      created_date as createdDate,
      updated_date as updatedDate
    FROM staff_contract
    ORDER BY created_date DESC
  `;

  try {
    const contracts = await query(sql);
    return contracts;
  } catch (error) {
    console.error('Error getting all contracts:', error);
    throw error;
  }
}

/**
 * Get a contract by ID
 * @param {number} id - Contract ID
 * @returns {Promise<Object|null>} - Contract object or null if not found
 * @throws {Error} - Database error
 */
async function getContractById(id) {
  // Validate ID
  const contractId = parseInt(id, 10);
  if (!Number.isInteger(contractId) || contractId <= 0) {
    throw new Error('Invalid contract ID');
  }

  const sql = `
    SELECT 
      id,
      name,
      position,
      assessment_date as assessmentDate,
      basic_salary as basicSalary,
      allowance,
      attendance_bonus as attendanceBonus,
      full_attendance_bonus as fullAttendanceBonus,
      signing_bonus as signingBonus,
      term_months as termMonths,
      resignation_date as resignationDate,
      created_date as createdDate,
      updated_date as updatedDate
    FROM staff_contract
    WHERE id = ?
    LIMIT 1
  `;

  try {
    const results = await query(sql, [contractId]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting contract by ID:', error);
    throw error;
  }
}

/**
 * Update a contract by ID
 * @param {number} id - Contract ID
 * @param {Object} data - Partial contract data to update
 * @returns {Promise<Object|null>} - Updated contract or null if not found
 * @throws {Error} - Validation or database error
 */
async function updateContract(id, data) {
  // Validate ID
  const contractId = parseInt(id, 10);
  if (!Number.isInteger(contractId) || contractId <= 0) {
    throw new Error('Invalid contract ID');
  }

  // Validate and sanitize input (allows partial updates)
  const validatedData = validateContractUpdateData(data);

  // Build dynamic UPDATE query based on provided fields
  const fields = [];
  const params = [];

  if (validatedData.name !== undefined) {
    fields.push('name = ?');
    params.push(validatedData.name);
  }
  if (validatedData.position !== undefined) {
    fields.push('position = ?');
    params.push(validatedData.position);
  }
  if (validatedData.assessmentDate !== undefined) {
    fields.push('assessment_date = ?');
    params.push(validatedData.assessmentDate);
  }
  if (validatedData.basicSalary !== undefined) {
    fields.push('basic_salary = ?');
    params.push(validatedData.basicSalary);
  }
  if (validatedData.allowance !== undefined) {
    fields.push('allowance = ?');
    params.push(validatedData.allowance);
  }
  if (validatedData.attendanceBonus !== undefined) {
    fields.push('attendance_bonus = ?');
    params.push(validatedData.attendanceBonus);
  }
  if (validatedData.fullAttendanceBonus !== undefined) {
    fields.push('full_attendance_bonus = ?');
    params.push(validatedData.fullAttendanceBonus);
  }
  if (validatedData.signingBonus !== undefined) {
    fields.push('signing_bonus = ?');
    params.push(validatedData.signingBonus);
  }
  if (validatedData.termMonths !== undefined) {
    fields.push('term_months = ?');
    params.push(validatedData.termMonths);
  }
  if (validatedData.resignationDate !== undefined) {
    fields.push('resignation_date = ?');
    params.push(validatedData.resignationDate);
  }

  if (fields.length === 0) {
    throw new Error('No valid fields provided for update');
  }

  // Add ID to params for WHERE clause
  params.push(contractId);

  // Use prepared statement to prevent SQL injection
  const sql = `
    UPDATE staff_contract
    SET ${fields.join(', ')}
    WHERE id = ?
  `;

  try {
    const result = await query(sql, params);
    
    // Check if any rows were affected
    if (result.affectedRows === 0) {
      return null; // Contract not found
    }

    // Fetch and return the updated contract
    return await getContractById(contractId);
  } catch (error) {
    console.error('Error updating contract:', error);
    throw error;
  }
}

/**
 * Delete a contract by ID
 * @param {number} id - Contract ID
 * @returns {Promise<boolean>} - True if deleted, false if not found
 * @throws {Error} - Database error
 */
async function deleteContract(id) {
  // Validate ID
  const contractId = parseInt(id, 10);
  if (!Number.isInteger(contractId) || contractId <= 0) {
    throw new Error('Invalid contract ID');
  }

  // Use prepared statement to prevent SQL injection
  const sql = `
    DELETE FROM staff_contract
    WHERE id = ?
  `;

  try {
    const result = await query(sql, [contractId]);
    
    // Return true if a row was deleted, false otherwise
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting contract:', error);
    throw error;
  }
}

/**
 * Get contracts expiring within a specific number of days
 * Note: This function calculates expiration based on assessment_date + term_months
 * @param {number} days - Number of days from today (default: 7)
 * @returns {Promise<Array>} - Array of expiring contracts
 */
async function getContractsExpiringInDays(days = 7) {
  const sql = `
    SELECT 
      id,
      name,
      position,
      assessment_date as assessmentDate,
      basic_salary as basicSalary,
      allowance,
      attendance_bonus as attendanceBonus,
      full_attendance_bonus as fullAttendanceBonus,
      signing_bonus as signingBonus,
      term_months as termMonths,
      resignation_date as resignationDate,
      created_date as createdDate,
      updated_date as updatedDate,
      DATE_ADD(assessment_date, INTERVAL term_months MONTH) as expirationDate
    FROM staff_contract
    WHERE resignation_date IS NULL
      AND DATE_ADD(assessment_date, INTERVAL term_months MONTH) 
          BETWEEN CURDATE() 
          AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
    ORDER BY expirationDate ASC
  `;

  try {
    const contracts = await query(sql, [days]);
    return contracts;
  } catch (error) {
    console.error('Error getting expiring contracts:', error);
    throw error;
  }
}

// Export all methods
module.exports = {
  createContract,
  getAllContracts,
  getContractById,
  updateContract,
  deleteContract,
  getContractsExpiringInDays,
  // Legacy method names for backward compatibility
  addContract: createContract,
  listContracts: getAllContracts,
};
