/**
 * GitHub Webhook Signature Verification Middleware
 * 
 * Verifies the X-Hub-Signature-256 header to ensure the webhook
 * request is genuinely from GitHub and hasn't been tampered with.
 * 
 * Required env var: GITHUB_WEBHOOK_SECRET
 */

const crypto = require('crypto');

/**
 * Verify GitHub webhook signature
 * GitHub sends HMAC-SHA256 signature in X-Hub-Signature-256 header
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware
 */
function verifyGithubWebhook(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  // Log webhook attempt for debugging
  console.log('[Webhook] Received GitHub webhook request');

  // Check if webhook secret is configured
  if (!secret) {
    console.error('[Webhook] ERROR: GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).json({ 
      error: 'Webhook secret not configured',
      message: 'Server is not configured to receive webhooks'
    });
  }

  // Check if signature header is present
  if (!signature) {
    console.warn('[Webhook] WARNING: Missing X-Hub-Signature-256 header');
    return res.status(401).json({ 
      error: 'Missing signature',
      message: 'X-Hub-Signature-256 header is required'
    });
  }

  // Compute expected signature from request body
  // GitHub uses HMAC-SHA256 with the webhook secret
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (signatureBuffer.length !== digestBuffer.length || 
      !crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
    console.warn('[Webhook] WARNING: Invalid webhook signature');
    return res.status(401).json({ 
      error: 'Invalid signature',
      message: 'Webhook signature verification failed'
    });
  }

  console.log('[Webhook] Signature verified successfully');
  next();
}

module.exports = { verifyGithubWebhook };
