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
const axios = require('axios');

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
      // Read remaining attempts from the rate limiter header (set by express-rate-limit)
      const attemptsLeft = parseInt(res.getHeader('RateLimit-Remaining') ?? '5', 10);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
        attemptsLeft,
      });
    }

    // Verify password
    const isValidPassword = await userService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      const attemptsLeft = parseInt(res.getHeader('RateLimit-Remaining') ?? '5', 10);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password',
        attemptsLeft,
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    });

    // Check for approved monitoring requests (Optimization for Immediate Resume)
    let monitoringExpected = false;
    let activeRequest = null;
    try {
      // Use the model directly if possible, or query DB
      const monitoringRequestModel = require('../models/monitoringRequestModel');
      const requests = await monitoringRequestModel.getRequestsForUser(user.id);
      const approved = requests.find(r => r.status === 'approved');
      if (approved) {
        // Optimization: Only prompt if the Admin is actually online (connected to socket)
        const io = req.app.get('io');
        let adminOnline = false;

        if (io) {
          const sockets = Array.from(io.sockets.sockets.values());
          // Check if any socket matches the admin's user ID AND has authenticated
          adminOnline = sockets.some(s => s.data.userId == approved.admin_id && s.data.authenticated);
        }

        if (adminOnline) {
          monitoringExpected = true;
          activeRequest = { adminName: approved.admin_name, requestId: approved.id };
          console.log(`[Auth] User ${user.email} has approved request from ${approved.admin_name} (Online). Expecting monitoring.`);
        } else {
          console.log(`[Auth] User ${user.email} has approved request from ${approved.admin_name}, but Admin is OFFLINE. Suppressing prompt.`);
        }
      }
    } catch (err) {
      console.error('Error checking monitoring status during login:', err);
    }

    // Return token and user info (without password)
    res.json({
      success: true,
      token,
      monitoringExpected, // Flag for immediate UI resume
      activeRequest,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
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
router.post('/verify', authLimiter, async (req, res) => {
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

    // Check for approved monitoring requests (Optimization for Immediate Resume)
    let monitoringExpected = false;
    let activeRequest = null;
    try {
      const monitoringRequestModel = require('../models/monitoringRequestModel');
      const requests = await monitoringRequestModel.getRequestsForUser(decoded.userId);
      const approved = requests.find(r => r.status === 'approved');
      if (approved) {
        // Optimization: Only prompt if the Admin is actually online (connected to socket)
        const io = req.app.get('io');
        let adminOnline = false;

        if (io) {
          const sockets = Array.from(io.sockets.sockets.values());
          // Check if any socket matches the admin's user ID AND has authenticated
          adminOnline = sockets.some(s => s.data.userId == approved.admin_id && s.data.authenticated);
        }

        if (adminOnline) {
          monitoringExpected = true;
          activeRequest = { adminName: approved.admin_name, requestId: approved.id };
          console.log(`[Auth] User ${user.email} has approved request from ${approved.admin_name} (Online). Expecting monitoring.`);
        } else {
          console.log(`[Auth] User ${user.email} has approved request from ${approved.admin_name}, but Admin is OFFLINE. Suppressing prompt.`);
        }
      }
    } catch (err) {
      console.error('Error checking monitoring status during verify:', err);
    }

    res.json({
      success: true,
      monitoringExpected,
      activeRequest,
      user: {
        role: decoded.role,
        name: decoded.name,
        userId: decoded.userId,
        email: decoded.email,
        avatar_url: decoded.avatar_url,
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

/**
 * GET /api/auth/github
 * Redirect to GitHub for OAuth
 */
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ success: false, message: 'GitHub Client ID not configured' });
  }
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/github/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&prompt=select_account`;
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  console.log(`[GitHub OAuth] Callback received with code: ${code ? 'yes' : 'no'}`);

  if (!code) {
    console.error('[GitHub OAuth] Missing code in callback');
    return res.redirect(`${frontendUrl}/auth?error=No+code+provided`);
  }

  try {
    // 1. Exchange code for access token
    console.log('[GitHub OAuth] Exchanging code for token...');
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      console.error('[GitHub OAuth] Failed to get access token:', tokenResponse.data);
      return res.redirect(`${frontendUrl}/auth?error=OAuth+failed`);
    }

    console.log('[GitHub OAuth] Access token obtained, fetching user info...');

    // 2. Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` }
    });

    const githubUser = userResponse.data;
    console.log(`[GitHub OAuth] GitHub user: ${githubUser.login} (ID: ${githubUser.id})`);

    // 3. Get user email (might need extra call if not public)
    let email = githubUser.email;
    if (!email) {
      console.log('[GitHub OAuth] Email not public, fetching shared/private emails...');
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${accessToken}` }
      });
      const primaryEmail = emailsResponse.data.find(e => e.primary) || emailsResponse.data[0];
      email = primaryEmail ? primaryEmail.email : null;
    }

    if (!email) {
      console.error('[GitHub OAuth] No email found for user');
      return res.redirect(`${frontendUrl}/auth?error=No+email+found`);
    }

    console.log(`[GitHub OAuth] User email: ${email}`);

    // 4. Check if user exists by GitHub ID or email
    let user = await userService.findUserByGithubId(githubUser.id.toString());

    if (!user) {
      console.log('[GitHub OAuth] User not found by GitHub ID, checking email...');
      user = await userService.findUserByEmail(email);
      if (user) {
        console.log('[GitHub OAuth] Linking existing user to GitHub account (implicit)');
      } else {
        console.log('[GitHub OAuth] Creating new user profile...');
        // Create new user
        user = await userService.createUser(
          email,
          null, // No password
          githubUser.name || githubUser.login,
          'employee',
          { github_id: githubUser.id.toString(), avatar_url: githubUser.avatar_url }
        );
      }
    }

    // 5. Generate JWT
    console.log(`[GitHub OAuth] Generating JWT for user ID: ${user.id}`);
    const token = generateToken({
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
    });

    // 6. Redirect back to frontend with token
    const finalRedirectUrl = `${frontendUrl}/auth?token=${token}&github_success=true`;
    console.log(`[GitHub OAuth] SUCCESS: Redirecting to frontend...`);
    res.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('[GitHub OAuth] EXCEPTION:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/auth?error=GitHub+authentication+failed`);
  }
});

module.exports = router;
