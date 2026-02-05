const monitoringRequestModel = require('../models/monitoringRequestModel');
const userService = require('../services/userService');

// Admin sends a request
async function createRequest(req, res) {
    try {
        const { targetUserId } = req.body;
        const adminId = req.user.userId; // From auth middleware

        if (!targetUserId) {
            return res.status(400).json({ error: 'Target user ID is required' });
        }

        // Verify target user exists
        const targetUser = await userService.findUserById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'Target user not found' });
        }

        // Check for existing pending request
        const existing = await monitoringRequestModel.findPendingRequest(adminId, targetUserId);
        if (existing) {
            return res.status(400).json({ error: 'A pending request already exists for this user' });
        }

        const request = await monitoringRequestModel.createRequest(adminId, targetUserId);

        // Real-time Optimization: Notify employee immediately via Socket.IO
        const io = req.app.get('io');
        const userSockets = req.app.get('userSockets');
        const Notification = require('../models/notificationModel');

        try {
            // 1. Create a persistent notification for the employee
            await Notification.createAndNotify({
                user_id: targetUserId,
                type: 'monitoring_new_request',
                title: 'New Monitoring Request',
                message: `${req.user.name} wants to monitor your screen.`,
                data: { requestId: request.id, adminName: req.user.name }
            }, io, userSockets);

            // 2. Also emit a specific monitoring event for instant list refresh on the Monitoring page
            if (io && userSockets) {
                const employeeSockets = userSockets.get(String(targetUserId));
                if (employeeSockets) {
                    employeeSockets.forEach(socketId => {
                        io.to(socketId).emit('monitoring:new-request', {
                            requestId: request.id,
                            adminName: req.user.name
                        });
                    });
                }
            }
        } catch (err) {
            console.error('[MonitoringRequest] Failed to emit real-time notifications:', err);
        }

        res.status(201).json(request);
    } catch (error) {
        console.error('Controller error creating monitoring request:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
}

// User gets their pending requests
async function getMyRequests(req, res) {
    try {
        const userId = req.user.userId;
        const requests = await monitoringRequestModel.getRequestsForUser(userId);
        res.json(requests);
    } catch (error) {
        console.error('Controller error getting requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
}

// User responds (approve/reject)
async function respondToRequest(req, res) {
    try {
        const requestId = req.params.id;
        const { status } = req.body; // 'approved' or 'rejected'
        const currentUserId = req.user.userId;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Fetch request to get Admin ID and current status
        const request = await monitoringRequestModel.getById(requestId);
        const oldStatus = request?.status;

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        await monitoringRequestModel.updateRequestStatus(requestId, status);

        // If approved, trigger real-time session logic
        if (status === 'approved') {
            const io = req.app.get('io');
            if (io) {
                // Find Admin Socket
                let adminSocketId = null;
                // Find Employee (Current User) Socket
                let employeeSocketId = null;
                let employeeSessionId = null;

                // Trace Logging
                console.log(`[MonitoringController] Approving Request. Looking for Admin ID: ${request.admin_id} (Type: ${typeof request.admin_id})`);
                console.log(`[MonitoringController] Current User (Employee) ID: ${currentUserId}`);

                // Iterate through connected sockets to find matching userIds
                for (const [id, socket] of io.sockets.sockets) {
                    const socketUserId = socket.data.userId;
                    const socketRole = socket.data.role;
                    console.log(`[MonitoringController] Checking Socket ${id}: userId=${socketUserId} (${typeof socketUserId}), role=${socketRole}`);

                    if (String(socketUserId) === String(request.admin_id)) {
                        console.log(`[MonitoringController] MATCH FOUND for Admin: ${id}`);
                        adminSocketId = id;
                    }
                    if (String(socketUserId) === String(currentUserId) && socketRole === 'employee') {
                        // console.log(`[MonitoringController] MATCH FOUND for Employee: ${id}`);
                        employeeSocketId = id;
                        employeeSessionId = socket.data.sessionId; // Assuming session was created on auth
                    }
                }

                if (adminSocketId && employeeSocketId && employeeSessionId) {
                    const monitoringService = require('../services/monitoringService');
                    console.log(`[Monitoring] Request approved. connecting Admin ${request.admin_id} to Session ${employeeSessionId}`);

                    // Add admin to session
                    // We need admin name from the socket data or fetch it. Socket data has it.
                    const adminSocket = io.sockets.sockets.get(adminSocketId);
                    const adminName = adminSocket?.data?.name || 'Admin';

                    monitoringService.addAdminToSession(employeeSessionId, adminSocketId, adminName);

                    if (adminSocket) {
                        adminSocket.join(employeeSessionId);

                        // Notify admin success
                        const sessionData = monitoringService.getSession(employeeSessionId);
                        adminSocket.emit('monitoring:connect-success', {
                            sessionId: employeeSessionId,
                            employeeName: req.user.name || request.user_name || 'Employee', // Use req.user.name from auth
                            employeeId: currentUserId, // Added for reconnection
                            streamActive: sessionData ? sessionData.streamActive : false
                        });

                        // Notify employee
                        io.to(employeeSocketId).emit('monitoring:admin-joined', {
                            adminName: adminName
                        });
                    }
                }
            }
        } else if (status === 'rejected') {
            // Notify admin when request is rejected or disconnected
            const io = req.app.get('io');
            const userSockets = req.app.get('userSockets');
            const Notification = require('../models/notificationModel');

            try {
                const isDisconnect = oldStatus === 'approved';
                const notificationType = isDisconnect ? 'monitoring_disconnect' : 'monitoring_request_declined';
                const notificationMessage = isDisconnect
                    ? `${req.user.name || 'Employee'} stopped sharing.`
                    : `${req.user.name || 'Employee'} declined your monitoring request.`;

                await Notification.createAndNotify({
                    user_id: request.admin_id,
                    type: notificationType,
                    title: 'Monitoring Stopped',
                    message: notificationMessage,
                    data: { requestId, employeeName: req.user.name, isDisconnect }
                }, io, userSockets);
            } catch (err) {
                console.error('Failed to create rejection notification:', err);
            }
        }

        res.json({ success: true, status });
    } catch (error) {
        console.error('Controller error responding to request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
}

module.exports = {
    createRequest,
    getMyRequests,
    respondToRequest
};
