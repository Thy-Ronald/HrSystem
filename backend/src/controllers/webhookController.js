/**
 * GitHub Webhook Controller
 * 
 * Handles incoming GitHub webhook events for issues.
 * Normalizes the payload and emits Socket.IO events for real-time updates.
 * 
 * IMPORTANT: Does NOT call the GitHub API - uses only webhook payload data
 */

/**
 * Normalize a GitHub issue from webhook payload into our standard shape
 * 
 * @param {Object} issue - GitHub issue object from webhook
 * @param {string} repoFullName - Full repository name (owner/repo)
 * @returns {Object} Normalized issue object
 */
function normalizeIssue(issue, repoFullName) {
  return {
    id: issue.id,
    repo: repoFullName,
    title: issue.title,
    assignees: (issue.assignees || []).map(a => a.login),
    labels: (issue.labels || []).map(l => l.name),
    state: issue.state, // "open" or "closed"
    updated_at: issue.updated_at,
  };
}

/**
 * Handle GitHub webhook for issues events
 * 
 * Supported actions:
 * - opened: New issue created
 * - edited: Issue title/body changed
 * - assigned/unassigned: Assignees changed
 * - labeled/unlabeled: Labels changed
 * - closed: Issue closed
 * - reopened: Issue reopened
 * - deleted: Issue deleted (rare, usually admin only)
 * 
 * @param {Object} io - Socket.IO server instance (injected)
 * @returns {Function} Express middleware handler
 */
function createWebhookHandler(io) {
  return function handleGithubWebhook(req, res) {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    console.log(`[Webhook] Event: ${event}, Delivery ID: ${deliveryId}`);

    // Only process issues events
    if (event !== 'issues') {
      console.log(`[Webhook] Ignoring non-issues event: ${event}`);
      return res.status(200).json({ 
        received: true, 
        message: `Event '${event}' ignored - only 'issues' events are processed` 
      });
    }

    try {
      const { action, issue, repository } = req.body;
      const repoFullName = repository.full_name;

      console.log(`[Webhook] Issues action: ${action} for ${repoFullName}#${issue.number}`);

      // Normalize the issue payload
      const normalizedIssue = normalizeIssue(issue, repoFullName);

      // Determine the action type for frontend
      let actionType = 'update';
      if (action === 'opened') {
        actionType = 'create';
      } else if (action === 'deleted') {
        actionType = 'delete';
      } else if (action === 'closed') {
        actionType = 'close';
      }

      // Emit Socket.IO event to all connected clients
      // Event name: issue:update
      // Payload includes action type and normalized issue
      const payload = {
        action: actionType,
        issue: normalizedIssue,
        repo: repoFullName,
        timestamp: new Date().toISOString(),
      };

      io.emit('issue:update', payload);

      console.log(`[Webhook] Emitted issue:update event for ${repoFullName}#${issue.number}`);
      console.log(`[Webhook] Payload:`, JSON.stringify(payload, null, 2));

      // Respond to GitHub with success
      res.status(200).json({
        received: true,
        action: actionType,
        issue_id: issue.id,
        repo: repoFullName,
      });

    } catch (error) {
      console.error('[Webhook] Error processing webhook:', error);
      
      // Still return 200 to prevent GitHub from retrying
      // Log the error for debugging
      res.status(200).json({
        received: true,
        error: 'Processing error',
        message: error.message,
      });
    }
  };
}

module.exports = { createWebhookHandler, normalizeIssue };
