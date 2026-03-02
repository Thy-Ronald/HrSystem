/**
 * Monitoring Service
 * Handles WebRTC signaling for screen sharing between employees and admins
 *
 * Performance design:
 *  - All session lookups are O(1) via reverse-index Maps
 *  - Expiry comparisons use Date.now() (integer) — no Date object allocation
 *  - adminUserIds Set tracks which admin users are in a session so the
 *    disconnect handler never needs to call io.sockets.sockets.get() and
 *    works correctly across Cloud Run instances (Redis adapter)
 */

class MonitoringService {
  constructor() {
    /** Primary store: sessionId → session object */
    this.sessions = new Map();

    // ── O(1) reverse indexes ──────────────────────────────────────
    /** employeeName → sessionId  (for reconnection without full scan) */
    this.employeeNameIndex = new Map();
    /** employeeSocketId → sessionId  (for disconnect without full scan) */
    this.employeeSocketIndex = new Map();
  }

  /**
   * Create a new monitoring session
   */
  createSession(employeeSocketId, employeeName, employeeId, avatarUrl) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // ms timestamp — no Date object

    this.sessions.set(sessionId, {
      employeeSocketId,
      employeeName,
      employeeId,
      avatarUrl,
      adminSocketIds: new Set(),
      adminUserIds:   new Set(), // userId strings — survives socket reconnections
      streamActive: false,
      createdAt: Date.now(),
      expiresAt,
    });

    this.employeeNameIndex.set(employeeName, sessionId);
    this.employeeSocketIndex.set(employeeSocketId, sessionId);

    return sessionId;
  }

  /**
   * O(1) lookup by socket ID (was O(n) scan).
   */
  getSessionByEmployee(employeeSocketId) {
    return this.employeeSocketIndex.get(employeeSocketId) || null;
  }

  /**
   * O(1) lookup by name (was O(n) scan).
   */
  getSessionByEmployeeName(employeeName) {
    const sessionId = this.employeeNameIndex.get(employeeName);
    if (!sessionId) return null;
    // Verify the session still exists and has not expired
    const session = this.sessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      // Stale index entry — prune it
      this.employeeNameIndex.delete(employeeName);
      return null;
    }
    return sessionId;
  }

  /**
   * Update an employee's socket ID when they reconnect.
   * Must be called instead of mutating session.employeeSocketId directly.
   */
  updateEmployeeSocket(sessionId, oldSocketId, newSocketId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (oldSocketId) this.employeeSocketIndex.delete(oldSocketId);
    session.employeeSocketId = newSocketId;
    if (newSocketId) this.employeeSocketIndex.set(newSocketId, sessionId);
  }

  /**
   * Recreate a session that was lost (e.g., server edge-case).
   * Reuses the same sessionId so existing Socket.IO room memberships stay valid.
   */
  recreateSession(sessionId, employeeSocketId, employeeName, employeeId, avatarUrl) {
    // Clean up stale index entries for the old session
    const old = this.sessions.get(sessionId);
    if (old) {
      this.employeeNameIndex.delete(old.employeeName);
      if (old.employeeSocketId) this.employeeSocketIndex.delete(old.employeeSocketId);
    }

    this.sessions.set(sessionId, {
      employeeSocketId,
      employeeName,
      employeeId,
      avatarUrl: avatarUrl || null,
      adminSocketIds: new Set(),
      adminUserIds:   new Set(),
      streamActive: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });

    this.employeeNameIndex.set(employeeName, sessionId);
    this.employeeSocketIndex.set(employeeSocketId, sessionId);
  }

  /**
   * Add an admin to a session.
   * @param {string} adminUserId - Firebase UID / integer user ID (stored for cross-instance lookup)
   */
  addAdminToSession(sessionId, adminSocketId, adminName, adminUserId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.adminSocketIds.add(adminSocketId);
    if (adminUserId) session.adminUserIds.add(String(adminUserId));
    return true;
  }

  /**
   * Remove an admin's socket from a session on disconnect.
   * NOTE: We intentionally keep adminUserIds intact — the admin may have
   * other sockets open and the set is used for persistent notifications.
   */
  removeAdminFromSession(sessionId, adminSocketId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.adminSocketIds.delete(adminSocketId);
    }
  }

  setStreamActive(sessionId, active) {
    const session = this.sessions.get(sessionId);
    if (session) session.streamActive = active;
  }

  /**
   * Retrieve a live session, deleting it if expired (lazy expiry).
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }
    return session;
  }

  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.timeoutId) clearTimeout(session.timeoutId);
      this.employeeNameIndex.delete(session.employeeName);
      if (session.employeeSocketId) this.employeeSocketIndex.delete(session.employeeSocketId);
    }
    this.sessions.delete(sessionId);
  }

  isSessionExpired(sessionId) {
    const session = this.sessions.get(sessionId);
    return !session || Date.now() > session.expiresAt;
  }

  getTimeRemaining(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    return Math.max(0, Math.floor((session.expiresAt - Date.now()) / 60000));
  }

  /**
   * Return all non-expired sessions as plain objects (for HTTP API).
   * Lazily deletes expired entries during the iteration.
   */
  getAllSessions() {
    const now = Date.now();
    const result = [];
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.deleteSession(sessionId);
        continue;
      }
      result.push({
        sessionId,
        employeeName: session.employeeName,
        employeeId:   session.employeeId,
        avatarUrl:    session.avatarUrl,
        streamActive: session.streamActive,
        adminCount:   session.adminSocketIds.size,
        createdAt:    session.createdAt,
        expiresAt:    session.expiresAt,
        timeRemaining: Math.max(0, Math.floor((session.expiresAt - now) / 60000)),
        disconnectReason: !session.employeeSocketId ? 'offline' : null,
      });
    }
    return result;
  }

  /**
   * Called when an employee socket disconnects.
   * Uses the O(1) socket index instead of a linear scan.
   */
  cleanupEmployeeSession(employeeSocketId) {
    const sessionId = this.employeeSocketIndex.get(employeeSocketId);
    if (!sessionId) return;
    const session = this.sessions.get(sessionId);
    if (session) {
      // Remove the socket → session mapping (socket is gone)
      this.employeeSocketIndex.delete(employeeSocketId);
      session.streamActive = false;
      session.employeeSocketId = null; // Mark offline; session persists for reconnect window
    }
  }

  /**
   * Periodic expired-session sweep. Called every 5 minutes from server.js.
   */
  cleanupExpiredSessions() {
    let cleaned = 0;
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.deleteSession(sessionId);
        cleaned++;
      }
    }
    return cleaned;
  }

  extendSession(sessionId, additionalMinutes = 30) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.timeoutId) clearTimeout(session.timeoutId);
    const extra = additionalMinutes * 60 * 1000;
    session.expiresAt = Date.now() + extra;
    session.timeoutId = setTimeout(() => {
      if (this.sessions.has(sessionId)) this.deleteSession(sessionId);
    }, extra);
    return true;
  }
}

module.exports = new MonitoringService();
