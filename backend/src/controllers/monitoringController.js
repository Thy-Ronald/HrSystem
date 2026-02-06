const monitoringService = require('../services/monitoringService');
const monitoringRequestModel = require('../models/monitoringRequestModel');
const Notification = require('../models/notificationModel');

/**
 * Stop/Terminate a monitoring session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function stopSession(req, res) {
    try {
        const { sessionId } = req.params;
        const adminId = req.user.userId;
        const adminName = req.user.name;

        // 1. Validate Session Exists
        const session = monitoringService.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found or already ended' });
        }

        // 2. Security Check: Is this admin allowed to stop this session?
        // In strict mode, we might check if they are in session.adminSocketIds
        // But for now, any admin can stop a session if they have access.

        const employeeId = session.employeeId;
        const employeeName = session.employeeName;

        // 3. Update Database Request Status (mark as completed/terminated)
        // Find the active 'approved' request between this admin and employee
        try {
            // We'll search for open requests for this employee
            const requests = await monitoringRequestModel.getRequestsForUser(employeeId);

            // Find specific request for this admin
            const activeRequest = requests.find(r =>
                String(r.admin_id) === String(adminId) &&
                r.status === 'approved'
            );

            if (activeRequest) {
                await monitoringRequestModel.updateRequestStatus(activeRequest.id, 'rejected'); // 'rejected' acts as 'terminated' for now, or we could add 'terminated' state
                console.log(`[MonitoringController] Marked request ${activeRequest.id} as terminated`);
            } else {
                // It might be that another admin started it, or it's a legacy session.
                // We'll proceed to kill the session anyway.
                console.log(`[MonitoringController] No active DB request found for Admin ${adminId} -> Employee ${employeeId}, proceeding to kill session anyway.`);
            }
        } catch (dbErr) {
            console.error('[MonitoringController] Error updating DB status:', dbErr);
            // Don't fail the deletion just because DB update failed
        }

        // 4. Terminate Session in Information/Memory
        monitoringService.deleteSession(sessionId);

        // 5. Notify Everyone (Real-time)
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');

        // Notify Room (Stream Stopped)
        io.to(sessionId).emit('monitoring:stream-stopped', {
            sessionId,
            reason: 'terminated_by_admin'
        });

        // Force Session Ended event (removes card from UI)
        io.emit('monitoring:session-ended', { sessionId }); // Broadcast to all admins to remove card

        // Notify Employee specifically (if outside room logic)
        if (session.employeeSocketId) {
            io.to(session.employeeSocketId).emit('monitoring:force-stop', {
                adminName
            });
        }

        // 6. Persistent Notification
        try {
            await Notification.createAndNotify({
                user_id: employeeId,
                type: 'monitoring_disconnect', // Reusing type
                title: 'Monitoring Ended',
                message: `${adminName} ended the monitoring session.`,
                data: { sessionId, adminName }
            }, io, userSockets);
        } catch (notifErr) {
            console.error('[MonitoringController] Failed to send notification:', notifErr);
        }

        res.json({ success: true, message: 'Session terminated successfully' });

    } catch (error) {
        console.error('[MonitoringController] Error stopping session:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
}

module.exports = {
    stopSession
};
