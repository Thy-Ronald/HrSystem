/**
 * Webhook Routes
 * 
 * Routes for handling external webhook callbacks.
 * Currently supports GitHub webhooks for issue updates.
 */

const express = require('express');
const { verifyGithubWebhook } = require('../middlewares/webhookVerification');
const { createWebhookHandler } = require('../controllers/webhookController');

/**
 * Create webhook router with Socket.IO instance
 * 
 * @param {Object} io - Socket.IO server instance
 * @returns {Router} Express router
 */
function createWebhookRouter(io) {
  const router = express.Router();

  /**
   * POST /webhooks/github
   * 
   * GitHub webhook endpoint for issues events.
   * 
   * Required headers:
   * - X-Hub-Signature-256: HMAC signature for verification
   * - X-GitHub-Event: Event type (e.g., "issues")
   * - X-GitHub-Delivery: Unique delivery ID
   * 
   * Configure in GitHub repo settings:
   * - Payload URL: https://your-domain.com/webhooks/github
   * - Content type: application/json
   * - Secret: (same as GITHUB_WEBHOOK_SECRET env var)
   * - Events: Select "Issues" only
   */
  router.post('/github', verifyGithubWebhook, createWebhookHandler(io));

  return router;
}

module.exports = { createWebhookRouter };
