/**
 * Monitoring Service
 * Handles WebRTC signaling for screen sharing between employees and admins
 */

class MonitoringService {
  constructor() {
    // Store active sessions: { sessionId: { employeeSocketId, adminSocketIds: Set, streamActive: boolean } }
    this.sessions = new Map();
  }

  /**
   * Create a new monitoring session
   * @param {string} employeeSocketId - Socket ID of the employee
   * @param {string} employeeName - Name of the employee
   * @returns {string} Session ID
   */
  createSession(employeeSocketId, employeeName) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessions.set(sessionId, {
      employeeSocketId,
      employeeName,
      adminSocketIds: new Set(),
      streamActive: false,
      createdAt: new Date(),
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
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID
   */
  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions (for admin listing)
   * @returns {Array} Array of session info
   */
  getAllSessions() {
    return Array.from(this.sessions.entries()).map(([sessionId, session]) => ({
      sessionId,
      employeeName: session.employeeName,
      streamActive: session.streamActive,
      adminCount: session.adminSocketIds.size,
      createdAt: session.createdAt,
    }));
  }

  /**
   * Clean up session when employee disconnects
   * @param {string} employeeSocketId - Socket ID of the employee
   */
  cleanupEmployeeSession(employeeSocketId) {
    const sessionId = this.getSessionByEmployee(employeeSocketId);
    if (sessionId) {
      this.deleteSession(sessionId);
    }
  }
}

module.exports = new MonitoringService();
