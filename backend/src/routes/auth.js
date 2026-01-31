/**
 * Authentication Routes
 * Handles login, signup and JWT token generation
 */

const express = require('express');
const router = express.Router();
const { generateToken } = require('../utils/jwt');
const { validateName, validateRole } = require('../middlewares/monitoringValidation');
const { authLimiter } = require('../middlewares/rateLimiter');
const userService = require('../services/userService');

/**
 * GET /api/auth/test
 * Test endpoint to verify auth routes are working
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes are working' });
});

/**
 * POST /api/auth/signup
 * Signup endpoint - creates new user account
 * 
 * Body: { email: string, password: string, name: string, role: 'admin' | 'employee' }
 * Returns: { success: true, token: string, user: { id, email, name, role } }
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password, name, role = 'employee' } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Email, password, and name are required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid email format',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Password must be at least 6 characters long',
      });
    }

    const roleValidation = validateRole(role);
    if (!roleValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: roleValidation.error,
      });
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: nameValidation.error,
      });
    }

    // Create user
    const user = await userService.createUser(
      email,
      password,
      nameValidation.sanitized,
      roleValidation.sanitized
    );

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    // Return token and user info
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Signup failed',
      message: error.message || 'An error occurred during signup',
    });
  }
});

/**
 * POST /api/auth/login
 * Login endpoint - authenticates user with email/password
 * 
 * Body: { email: string, password: string }
 * Returns: { success: true, token: string, user: { id, email, name, role } }
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Email and password are required',
      });
    }

    // Find user by email
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValidPassword = await userService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    // Return token and user info (without password)
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message || 'An error occurred during login',
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify JWT token
 * 
 * Headers: Authorization: Bearer <token>
 * Returns: { success: true, user: { role, name, userId } }
 */
router.post('/verify', async (req, res) => {
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
    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(token);

    // Get user from database to ensure they still exist
    const user = await userService.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error.message || 'Token verification failed',
    });
  }
});

module.exports = router;
