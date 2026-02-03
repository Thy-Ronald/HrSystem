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
 * @param {string} password - Plain text password (optional for OAuth)
 * @param {string} name - User full name
 * @param {string} role - User role (admin/employee)
 * @param {Object} oauthData - Optional OAuth data (github_id, avatar_url)
 * @returns {Promise<Object>} Created user (without password)
 */
async function createUser(email, password, name, role = 'employee', oauthData = {}) {
  try {
    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const { github_id = null, avatar_url = null } = oauthData;

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, github_id, avatar_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email.toLowerCase().trim(), passwordHash, name.trim(), role, github_id, avatar_url]
    );

    // Return user without password
    const users = await query(
      'SELECT id, email, name, role, github_id, avatar_url, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    return Array.isArray(users) ? users[0] : users;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Email or GitHub ID already exists');
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
      'SELECT id, email, password_hash, name, role, github_id, avatar_url, created_at FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    return users[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Find user by GitHub ID
 * @param {string} githubId - GitHub user ID
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByGithubId(githubId) {
  try {
    const users = await query(
      'SELECT id, email, password_hash, name, role, github_id, avatar_url, created_at FROM users WHERE github_id = ?',
      [githubId]
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
      'SELECT id, email, name, role, github_id, avatar_url, created_at FROM users WHERE id = ?',
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
  findUserByGithubId,
  findUserById,
  verifyPassword,
};
