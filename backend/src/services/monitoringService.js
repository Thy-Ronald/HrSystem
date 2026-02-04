/**
 * Monitoring Service
 * Handles WebRTC signaling for screen sharing between employees and admins
 */

class MonitoringService {
  constructor() {
    // Store active sessions: { sessionId: { employeeSocketId, adminSocketIds: Set, streamActive: boolean, connectionCode: string } }
    this.sessions = new Map();
  }

  /**
   * Create a new monitoring session
   * @param {string} employeeSocketId - Socket ID of the employee
   * @param {string} employeeName - Name of the employee
   * @param {string} connectionCode - Code for admin to connect
   * @returns {string} Session ID
   */
  createSession(employeeSocketId, employeeName) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours default

    this.sessions.set(sessionId, {
      employeeSocketId,
      employeeName,
      adminSocketIds: new Set(),
      streamActive: false,
      createdAt: new Date(),
      expiresAt,
    });

    return sessionId;
  }



  /**
   * Get session by employee socket ID
   * @param {string} employeeSocketId - Socket ID of the employee
   * @returns {string|null} Session ID or null
   */
  getSessionByEmployee(employeeSocketId) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.employeeSocketId === employeeSocketId) {
        return sessionId;
      }
    }
    return null;
  }

  /**
   * Get active session by employee name (for reconnection handling)
   * @param {string} employeeName - Name of the employee
   * @returns {string|null} Session ID or null
   */
  getSessionByEmployeeName(employeeName) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.employeeName === employeeName) {
        // If session is still valid (not deleted and not expired)
        if (!session.expiresAt || session.expiresAt > new Date()) {
          return sessionId;
        }
      }
    }
    return null;
  }

  /**
   * Add admin to a session
   * @param {string} sessionId - Session ID
   * @param {string} adminSocketId - Socket ID of the admin
   * @param {string} adminName - Name of the admin
   * @returns {boolean} Success
   */
  addAdminToSession(sessionId, adminSocketId, adminName) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.adminSocketIds.add(adminSocketId);
    return true;
  }

  /**
   * Remove admin from a session
   * @param {string} sessionId - Session ID
   * @param {string} adminSocketId - Socket ID of the admin
   */
  removeAdminFromSession(sessionId, adminSocketId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.adminSocketIds.delete(adminSocketId);
    }
  }

  /**
   * Set stream active status
   * @param {string} sessionId - Session ID
   * @param {boolean} active - Stream active status
   */
  setStreamActive(sessionId, active) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.streamActive = active;
    }
  }

  /**
   * Get session info
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Session info
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    // Check if expired
    if (this.isSessionExpired(sessionId)) {
      this.deleteSession(sessionId);
      return null;
    }
    return session;
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   */
  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.timeoutId) {
      clearTimeout(session.timeoutId);
    }
    this.sessions.delete(sessionId);
  }

  /**
   * Check if session is expired
   * @param {string} sessionId - Session ID
   * @returns {boolean} True if expired
   */
  isSessionExpired(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return true;
    }
    return new Date() > session.expiresAt;
  }

  /**
   * Get time remaining until expiration (in minutes)
   * @param {string} sessionId - Session ID
   * @returns {number} Minutes remaining, or 0 if expired
   */
  getTimeRemaining(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 0;
    }
    const remaining = session.expiresAt - new Date();
    return Math.max(0, Math.floor(remaining / 60000));
  }

  /**
   * Get all active sessions (for admin listing)
   * @returns {Array} Array of session info
   */
  getAllSessions() {
    return Array.from(this.sessions.entries())
      .filter(([sessionId]) => !this.isSessionExpired(sessionId))
      .map(([sessionId, session]) => ({
        sessionId,
        employeeName: session.employeeName,
        streamActive: session.streamActive,
        adminCount: session.adminSocketIds.size,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        timeRemaining: this.getTimeRemaining(sessionId),
      }));
  }

  /**
   * Clean up session when employee disconnects
   * @param {string} employeeSocketId - Socket ID of the employee
   */
  cleanupEmployeeSession(employeeSocketId) {
    const sessionId = this.getSessionByEmployee(employeeSocketId);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.streamActive = false;
        session.employeeSocketId = null; // Mark as disconnected but keep session

        // Give some time for reconnection before deleting
        // We'll let the periodic cleanup handle true deletion
      }
    }
  }

  /**
   * Clean up expired sessions
   * Should be called periodically
   * @returns {number} Number of sessions cleaned up
   */
  cleanupExpiredSessions() {
    let cleaned = 0;
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.deleteSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Extend session expiration
   * @param {string} sessionId - Session ID
   * @param {number} additionalMinutes - Minutes to add
   * @returns {boolean} Success
   */
  extendSession(sessionId, additionalMinutes = 30) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Clear existing timeout
    if (session.timeoutId) {
      clearTimeout(session.timeoutId);
    }

    // Extend expiration
    session.expiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

    // Set new timeout
    session.timeoutId = setTimeout(() => {
      if (this.sessions.has(sessionId)) {
        this.deleteSession(sessionId);
      }
    }, additionalMinutes * 60 * 1000);

    return true;
  }
}

module.exports = new MonitoringService();
