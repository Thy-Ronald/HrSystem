/**
 * Authentication Routes
 * Firebase Auth — login is handled entirely by the client SDK.
 * This module handles:
 *   POST /signup  — create MySQL profile after Firebase account is created on the frontend
 *   POST /verify  — verify a Firebase ID token and return user profile + monitoring state
 *   GET  /github  — redirect to GitHub OAuth
 *   GET  /github/callback — exchange GitHub code for a Firebase custom token
 *   GET  /exchange — exchange one-time OAuth code for a custom token
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { validateName, validateRole } = require('../middlewares/monitoringValidation');
const { authLimiter } = require('../middlewares/rateLimiter');
const userService = require('../services/userService');
const { authB } = require('../config/firebaseProjectB');
const axios = require('axios');

/**
 * One-time OAuth code store.
 * Maps short-lived codes (60 s) to Firebase custom tokens.
 */
const oauthCodes = new Map(); // Map<code: string, { customToken: string, expiresAt: number }>
const OAUTH_CODE_TTL_MS = 60 * 1000; // 60 seconds

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Extract and verify a Firebase ID token from the Authorization header. */
async function extractVerifiedToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Bearer token required in Authorization header'), { status: 401 });
  }
  const idToken = authHeader.replace('Bearer ', '');
  return authB.verifyIdToken(idToken);
}

/** Check for an approved monitoring request and whether the admin is online. */
async function getMonitoringState(userId, io) {
  try {
    const monitoringRequestModel = require('../models/monitoringRequestModel');
    const requests = await monitoringRequestModel.getRequestsForUser(userId);
    const approved = requests.find(r => r.status === 'approved');
    if (!approved) return { monitoringExpected: false, activeRequest: null };

    let adminOnline = false;
    if (io) {
      const sockets = Array.from(io.sockets.sockets.values());
      adminOnline = sockets.some(
        s => s.data.userId == approved.admin_id && s.data.authenticated
      );
    }

    if (adminOnline) {
      return {
        monitoringExpected: true,
        activeRequest: { adminName: approved.admin_name, requestId: approved.id },
      };
    }
  } catch (err) {
    console.error('[Auth] Error checking monitoring state:', err);
  }
  return { monitoringExpected: false, activeRequest: null };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/test
 */
router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'Auth routes are working' });
});

/**
 * POST /api/auth/signup
 * Called AFTER the client has created a Firebase Auth account.
 * Creates the MySQL user profile and sets the `role` custom claim on Firebase.
 *
 * Headers: Authorization: Bearer <Firebase ID token>
 * Body:    { name: string, role?: 'admin' | 'employee' }
 * Returns: { success: true, user: { id, email, name, role } }
 */
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const decoded = await extractVerifiedToken(req);
    const { name, role = 'employee' } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ success: false, message: nameValidation.error });
    }

    const roleValidation = validateRole(role);
    if (!roleValidation.valid) {
      return res.status(400).json({ success: false, message: roleValidation.error });
    }

    // Idempotent: return existing profile if already created
    let user = await userService.findUserByFirebaseUid(decoded.uid);

    if (!user) {
      user = await userService.createUser(
        decoded.email,
        null, // no password — Firebase handles auth
        nameValidation.sanitized,
        roleValidation.sanitized,
        { firebase_uid: decoded.uid }
      );
    }

    // Stamp the role as a custom claim so middleware can trust it from the token
    await authB.setCustomUserClaims(decoded.uid, { role: user.role });

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    if (error.status === 401) {
      return res.status(401).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message || 'Signup failed' });
  }
});

/**
 * POST /api/auth/verify
 * Verify a Firebase ID token, look up the MySQL user profile, and return
 * it together with any active monitoring state.
 *
 * Headers: Authorization: Bearer <Firebase ID token>
 * Returns: { success: true, user: { id, email, name, role, avatar_url, userId },
 *            monitoringExpected, activeRequest }
 */
router.post('/verify', async (req, res) => {
  try {
    const decoded = await extractVerifiedToken(req);

    const user = await userService.findUserByFirebaseUid(decoded.uid);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User profile not found',
        message: 'No MySQL profile linked to this Firebase account. Please sign up.',
      });
    }

    const io = req.app.get('io');
    const { monitoringExpected, activeRequest } = await getMonitoringState(user.id, io);

    return res.json({
      success: true,
      monitoringExpected,
      activeRequest,
      user: {
        id: user.id,
        userId: user.id, // backward compat alias
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('[Auth] Verify error:', error);
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
 * Exchange GitHub code → find/create Firebase Auth user → issue custom token
 */
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/auth?error=No+code+provided`);
  }

  try {
    // 1. Exchange GitHub code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id:     process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );
    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) return res.redirect(`${frontendUrl}/auth?error=OAuth+failed`);

    // 2. Fetch GitHub user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });
    const githubUser = userResponse.data;

    // 3. Resolve email
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${accessToken}` },
      });
      const primary = emailsResponse.data.find(e => e.primary) || emailsResponse.data[0];
      email = primary ? primary.email : null;
    }
    if (!email) return res.redirect(`${frontendUrl}/auth?error=No+email+found`);

    // 4. Find or create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await authB.getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        firebaseUser = await authB.createUser({
          email,
          displayName: githubUser.name || githubUser.login,
          photoURL:    githubUser.avatar_url,
        });
      } else {
        throw err;
      }
    }

    // 5. Find or create MySQL user profile
    let user = await userService.findUserByFirebaseUid(firebaseUser.uid);
    if (!user) {
      user = await userService.findUserByEmail(email);
      if (user) {
        // Link existing MySQL user to this Firebase UID
        await userService.linkFirebaseUid(user.id, firebaseUser.uid);
      } else {
        // Brand-new user
        user = await userService.createUser(
          email,
          null,
          githubUser.name || githubUser.login,
          'employee',
          {
            github_id:   githubUser.id.toString(),
            avatar_url:  githubUser.avatar_url,
            firebase_uid: firebaseUser.uid,
          }
        );
      }
    }

    // 6. Set role custom claim
    await authB.setCustomUserClaims(firebaseUser.uid, { role: user.role });

    // 7. Mint a Firebase custom token and wrap it in a one-time code
    const customToken = await authB.createCustomToken(firebaseUser.uid);
    const oauthCode   = crypto.randomUUID();
    oauthCodes.set(oauthCode, { customToken, expiresAt: Date.now() + OAUTH_CODE_TTL_MS });

    console.log(`[GitHub OAuth] Success for ${email} — redirecting with one-time code`);
    res.redirect(`${frontendUrl}/auth?code=${oauthCode}`);
  } catch (error) {
    console.error('[GitHub OAuth] Error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/auth?error=GitHub+authentication+failed`);
  }
});

/**
 * GET /api/auth/exchange
 * Exchanges a one-time code for a Firebase custom token.
 * The code is deleted immediately (single-use, 60 s TTL).
 *
 * Query: { code: string }
 * Returns: { customToken: string }
 */
router.get('/exchange', (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid code' });
  }

  const entry = oauthCodes.get(code);
  if (!entry || Date.now() > entry.expiresAt) {
    oauthCodes.delete(code);
    return res.status(401).json({ error: 'Code expired or invalid' });
  }

  oauthCodes.delete(code);
  console.log('[GitHub OAuth] One-time code exchanged for custom token successfully');
  return res.json({ customToken: entry.customToken });
});

module.exports = router;
