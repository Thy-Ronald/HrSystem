/**
 * User Service
 * Handles user database operations
 */

const { query } = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Create a new user
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @param {string} name - User full name
 * @param {string} role - User role (admin/employee)
 * @returns {Promise<Object>} Created user (without password)
 */
async function createUser(email, password, name, role = 'employee') {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES (?, ?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), role]
    );

    // Return user without password
    const users = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return Array.isArray(users) ? users[0] : users;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object with password_hash or null
 */
async function findUserByEmail(email) {
  try {
    const users = await query(
      'SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    return users[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object (without password) or null
 */
async function findUserById(id) {
  try {
    const users = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
      [id]
    );
    return users[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
};
