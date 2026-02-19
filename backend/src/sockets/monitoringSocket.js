/**
 * Monitoring Socket Handler
 *
 * Contains all Socket.IO event logic for the WebRTC-based screen monitoring feature.
 * Extracted from server.js to keep the entry point lean and this domain isolated.
 *
 * @param {import('socket.io').Server} io - The Socket.IO server instance
 * @param {Map<string, Set<string>>} userSockets - Fast lookup map: userId → Set<socketId>
 */

// Static imports — previously scattered as dynamic require() calls inside hot paths
const { verifyToken, generateToken } = require('../utils/jwt');
const userService = require('../services/userService');
const monitoringRequestModel = require('../models/monitoringRequestModel');
const Notification = require('../models/notificationModel');
const { socketAuth } = require('../middlewares/monitoringAuth');
const { validateAuthPayload, validateSessionId, validateSDP, validateICECandidate } = require('../middlewares/monitoringValidation');
const { socketRateLimiter } = require('../middlewares/rateLimiter');
const monitoringService = require('../services/monitoringService');

/**
 * Attach all monitoring socket event handlers to the given io instance.
 */
function setupMonitoringSocket(io, userSockets) {
    // ──────────────────────────────────────────────────────────────
    // Socket.IO connection-level middleware (authentication)
    // ──────────────────────────────────────────────────────────────
    io.use((socket, next) => {
        // For development: allow connection without auth, but require auth for monitoring events
        // For production: use socketAuth(socket, next) to require JWT on connection
        if (process.env.NODE_ENV === 'production') {
            return socketAuth(socket, next);
        }
        next();
    });

    // ──────────────────────────────────────────────────────────────
    // Main connection handler
    // ──────────────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        // ── monitoring:auth ──────────────────────────────────────────
        socket.on('monitoring:auth', async ({ role, name, token, connectionCode }) => {
            // Rate limiting: 10 auth attempts per 15 minutes
            if (!socketRateLimiter.checkLimit(socket.id, 10, 15 * 60 * 1000)) {
                socket.emit('monitoring:error', {
                    message: 'Too many authentication attempts. Please wait before trying again.',
                });
                return;
            }

            // Validate and sanitize input
            const validation = validateAuthPayload({ role, name });
            if (!validation.valid) {
                socket.emit('monitoring:error', {
                    message: validation.errors.join(', '),
                });
                return;
            }

            const { sanitized } = validation;

            // Extract User ID from token if available (to link with persistent requests)
            let userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            let jwtToken = token;
            let avatarUrl = null;

            if (token) {
                try {
                    const decoded = verifyToken(token);
                    if (decoded && decoded.userId) {
                        userId = decoded.userId;
                        avatarUrl = decoded.avatar_url;
                        console.log(`[Monitoring] User authenticated with token. ID: ${userId}, Avatar: ${avatarUrl ? 'Yes' : 'No'}`);
                    }
                    // Fallback: If avatar missing from token (legacy token), fetch from DB
                    if (decoded && decoded.userId && !avatarUrl) {
                        try {
                            const user = await userService.findUserById(decoded.userId);
                            if (user) {
                                avatarUrl = user.avatar_url;
                                console.log(`[Monitoring] Fetched avatar from DB for user ${userId}`);
                            }
                        } catch (dbErr) {
                            console.error('[Monitoring] Failed to fetch user avatar from DB:', dbErr);
                        }
                    }
                } catch (err) {
                    console.log('[Monitoring] Invalid token provided in auth, using temporary ID');
                    // Generate new token if invalid
                    jwtToken = generateToken({
                        userId,
                        role: sanitized.role,
                        name: sanitized.name,
                    });
                }
            } else {
                jwtToken = generateToken({
                    userId,
                    role: sanitized.role,
                    name: sanitized.name,
                });
            }

            socket.data.role = sanitized.role;
            socket.data.name = sanitized.name;
            socket.data.userId = userId;
            socket.data.authenticated = true;
            socket.data.token = jwtToken;

            // Maintain userSockets map (O(1) lookup)
            if (!userSockets.has(String(userId))) {
                userSockets.set(String(userId), new Set());
            }
            userSockets.get(String(userId)).add(socket.id);

            console.log(`[Monitoring] ${sanitized.role} authenticated: ${sanitized.name} (${socket.id}). UserID: ${socket.data.userId}`);

            if (sanitized.role === 'employee') {
                // Check if employee already has an active session by name (reconnection scenario)
                const existingSessionId = monitoringService.getSessionByEmployeeName(sanitized.name);
                let sessionId;

                if (existingSessionId) {
                    // Employee reconnected — reuse existing session
                    sessionId = existingSessionId;
                    const session = monitoringService.getSession(sessionId);
                    if (session) {
                        const oldSocketId = session.employeeSocketId;
                        session.employeeSocketId = socket.id;
                        console.log(`[Monitoring] Employee ${sanitized.name} reconnected (${oldSocketId} -> ${socket.id}), reusing session ${sessionId}`);
                    }
                } else {
                    // Rate limiting: 5 sessions per 15 minutes
                    if (!socketRateLimiter.checkLimit(`${socket.id}_sessions`, 5, 15 * 60 * 1000)) {
                        socket.emit('monitoring:error', {
                            message: 'Too many session creation attempts. Please wait before creating another session.',
                        });
                        return;
                    }

                    sessionId = monitoringService.createSession(socket.id, sanitized.name, socket.data.userId, avatarUrl);
                    console.log(`[Monitoring] Created new session ${sessionId} for employee ${sanitized.name} (ID: ${socket.data.userId}, Avatar: ${avatarUrl ? avatarUrl.substring(0, 30) + '...' : 'None'})`);
                }

                socket.data.sessionId = sessionId;

                // Check for persistent approved requests to trigger "Resume Sharing" modal
                let monitoringExpected = false;
                let activeRequest = null;
                try {
                    const requests = await monitoringRequestModel.getRequestsForUser(userId);
                    const approved = requests.find(r => r.status === 'approved');
                    if (approved) {
                        monitoringExpected = true;
                        activeRequest = { adminName: approved.admin_name, requestId: approved.id };
                        console.log(`[Monitoring] Found approved request for ${sanitized.name}, expecting monitoring resume.`);
                    }
                } catch (err) {
                    console.error('[Monitoring] Error checking requests during auth:', err);
                }

                socket.emit('monitoring:session-created', {
                    sessionId,
                    token: jwtToken,
                    monitoringExpected,
                    activeRequest,
                });

                // Notify approved admins ONLY about the new session
                try {
                    const requests = await monitoringRequestModel.getRequestsForUser(userId);
                    const approvedAdmins = requests
                        .filter(r => r.status === 'approved')
                        .map(r => r.admin_id);

                    approvedAdmins.forEach(adminId => {
                        const sockets = userSockets.get(String(adminId));
                        if (sockets) {
                            sockets.forEach(socketId => {
                                io.to(socketId).emit('monitoring:new-session', {
                                    sessionId,
                                    employeeName: sanitized.name,
                                    employeeId: userId,
                                    avatarUrl,
                                    streamActive: false,
                                });
                            });
                        }
                    });
                    console.log(`[Monitoring] Targeted new-session for ${sanitized.name} to ${approvedAdmins.length} admins`);
                } catch (err) {
                    console.error('[Monitoring] Failed to send targeted new-session:', err);
                }

            } else if (sanitized.role === 'admin') {
                socket.emit('monitoring:auth-success', {
                    token: jwtToken,
                    message: 'Authenticated. Search for employees to connect.',
                });
            }
        });

        // ── monitoring:request-connection (Admin) ────────────────────
        socket.on('monitoring:request-connection', ({ employeeName }) => {
            if (!socket.data.authenticated || socket.data.role !== 'admin') {
                console.warn(`[Monitoring] Unauthorized request-connection attempt from ${socket.id}`);
                return;
            }

            if (!employeeName) {
                socket.emit('monitoring:error', { message: 'Employee name is required' });
                return;
            }

            console.log(`[Monitoring] Admin ${socket.data.name} requesting connection to: ${employeeName}`);

            const targetSessionId = monitoringService.getSessionByEmployeeName(employeeName);
            if (!targetSessionId) {
                socket.emit('monitoring:error', { message: 'Employee not found or offline' });
                return;
            }

            const session = monitoringService.getSession(targetSessionId);
            if (!session) {
                socket.emit('monitoring:error', { message: 'Session invalid' });
                return;
            }

            if (session.adminSocketIds.has(socket.id) && session.streamActive) {
                socket.emit('monitoring:error', { message: 'Already monitoring this employee' });
                return;
            }

            if (!session.employeeSocketId) {
                socket.emit('monitoring:error', { message: 'Employee is currently offline' });
                return;
            }

            io.to(session.employeeSocketId).emit('monitoring:connection-request', {
                adminName: socket.data.name,
                adminSocketId: socket.id,
            });

            socket.emit('monitoring:request-sent', { employeeName });
        });

        // ── monitoring:respond-connection (Employee) ─────────────────
        socket.on('monitoring:respond-connection', ({ adminSocketId, accepted }) => {
            if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
                return;
            }

            const sessionId = socket.data.sessionId;
            const session = monitoringService.getSession(sessionId);
            if (!session) return;

            console.log(`[Monitoring] Employee ${socket.data.name} responded to ${adminSocketId}: ${accepted ? 'Accepted' : 'Denied'}`);

            if (accepted) {
                monitoringService.addAdminToSession(sessionId, adminSocketId);

                const adminSocket = io.sockets.sockets.get(adminSocketId);
                if (adminSocket) {
                    adminSocket.join(sessionId);
                    adminSocket.data.sessionId = sessionId;

                    adminSocket.emit('monitoring:connect-success', {
                        sessionId,
                        employeeName: session.employeeName,
                        employeeId: session.employeeId,
                        avatarUrl: session.avatarUrl,
                        streamActive: session.streamActive,
                    });

                    socket.emit('monitoring:admin-joined', {
                        adminName: adminSocket.data.name,
                    });
                }
            } else {
                io.to(adminSocketId).emit('monitoring:request-denied', {
                    employeeName: session.employeeName,
                });
            }
        });

        // ── monitoring:start-sharing (Employee) ──────────────────────
        socket.on('monitoring:start-sharing', async () => {
            console.log(`[Monitoring] ========== START SHARING EVENT ==========`);
            console.log(`[Monitoring] Received monitoring:start-sharing from socket ${socket.id}`);
            console.log(`[Monitoring] Socket data:`, {
                authenticated: socket.data.authenticated,
                role: socket.data.role,
                sessionId: socket.data.sessionId,
                name: socket.data.name,
            });

            if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
                console.log(`[Monitoring] Unauthorized: authenticated=${socket.data.authenticated}, role=${socket.data.role}, sessionId=${socket.data.sessionId}`);
                console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
                return;
            }

            const sessionId = socket.data.sessionId;
            if (!validateSessionId(sessionId)) {
                console.log(`[Monitoring] Invalid session ID format: ${sessionId}`);
                socket.emit('monitoring:error', { message: 'Invalid session ID' });
                return;
            }

            const session = monitoringService.getSession(sessionId);
            if (!session) {
                console.log(`[Monitoring] Session not found: ${sessionId}`);
                socket.emit('monitoring:error', { message: 'Session not found or expired' });
                return;
            }

            console.log(`[Monitoring] Session found: ${sessionId}`);
            console.log(`[Monitoring] Session details:`, {
                employeeSocketId: session.employeeSocketId,
                employeeName: session.employeeName,
                adminCount: session.adminSocketIds.size,
                adminSocketIds: Array.from(session.adminSocketIds),
                streamActive: session.streamActive,
            });

            monitoringService.setStreamActive(sessionId, true);
            console.log(`[Monitoring] Stream active set to true for session ${sessionId}`);

            console.log(`[Monitoring] Emitting stream-started to room ${sessionId}`);
            io.to(sessionId).emit('monitoring:stream-started', {
                sessionId,
                employeeName: session.employeeName,
            });

            socket.emit('monitoring:sharing-started', { sessionId });
        });

        // ── monitoring:stop-sharing (Employee) ───────────────────────
        socket.on('monitoring:stop-sharing', (payload) => {
            const { reason } = payload || {};
            if (socket.data.role !== 'employee' || !socket.data.sessionId) {
                console.warn(`[Monitoring] Unauthorized stop-sharing attempt from ${socket.id}`);
                return;
            }

            const sessionId = socket.data.sessionId;
            monitoringService.setStreamActive(sessionId, false);

            const session = monitoringService.getSession(sessionId);
            if (session) {
                const stopReason = reason || 'manual';

                console.log(`[Monitoring] Emitting stream-stopped to room ${sessionId}, reason: ${stopReason}`);
                io.to(sessionId).emit('monitoring:stream-stopped', { sessionId, reason: stopReason });

                // Create persistent notification only for non-manual disconnects
                if (stopReason !== 'manual') {
                    const adminUserIds = new Set();
                    session.adminSocketIds.forEach(sid => {
                        const s = io.sockets.sockets.get(sid);
                        if (s && s.data.userId) adminUserIds.add(String(s.data.userId));
                    });

                    Promise.all([...adminUserIds].map(async (adminId) => {
                        try {
                            await Notification.createAndNotify({
                                user_id: adminId,
                                type: 'monitoring_disconnect',
                                title: 'Monitoring Stopped',
                                message: `${session.employeeName} stopped sharing (${stopReason}).`,
                                data: { sessionId, reason: stopReason, employeeName: session.employeeName },
                            }, io, userSockets);
                        } catch (err) {
                            console.error('[Monitoring] Failed to notify admin via stop-sharing:', err);
                        }
                    }));
                }
            }

            socket.emit('monitoring:sharing-stopped', { sessionId });
        });

        // ── monitoring:join-session (Admin) ──────────────────────────
        socket.on('monitoring:join-session', ({ sessionId }) => {
            if (!socket.data.authenticated || socket.data.role !== 'admin') {
                console.warn(`[Monitoring] Unauthorized join-session attempt from ${socket.id}`);
                return;
            }

            if (!validateSessionId(sessionId)) {
                socket.emit('monitoring:error', { message: 'Invalid session ID format' });
                return;
            }

            const session = monitoringService.getSession(sessionId);
            if (!session) {
                socket.emit('monitoring:error', { message: 'Session not found or expired' });
                return;
            }

            monitoringService.addAdminToSession(sessionId, socket.id, socket.data.name);
            socket.join(sessionId);

            console.log(`[Monitoring] Admin ${socket.data.name} (${socket.id}) joined session ${sessionId}`);

            io.to(session.employeeSocketId).emit('monitoring:admin-joined', {
                adminName: socket.data.name,
            });

            socket.emit('monitoring:session-joined', {
                sessionId,
                connectionCode: session.connectionCode,
                employeeName: session.employeeName,
                avatarUrl: session.avatarUrl,
                streamActive: session.streamActive,
            });
            console.log(`[Monitoring] Sent session-joined to admin ${socket.id}, streamActive: ${session.streamActive}`);
        });

        // ── monitoring:leave-session (Admin) ─────────────────────────
        socket.on('monitoring:leave-session', ({ sessionId }) => {
            if (socket.data.role !== 'admin' || !sessionId) return;

            const session = monitoringService.getSession(sessionId);
            if (session) {
                monitoringService.removeAdminFromSession(sessionId, socket.id);
                socket.leave(sessionId);

                io.to(session.employeeSocketId).emit('monitoring:admin-left', {
                    adminName: socket.data.name,
                });
            }
        });

        // ── monitoring:offer (WebRTC signaling) ──────────────────────
        socket.on('monitoring:offer', ({ sessionId, offer }) => {
            if (!socket.data.authenticated) {
                console.warn(`[Monitoring] Unauthorized offer attempt from ${socket.id}`);
                return;
            }

            // Rate limiting for signaling
            if (!socketRateLimiter.checkLimit(`${socket.id}_signaling`, 100, 60 * 1000)) {
                socket.emit('monitoring:error', { message: 'Too many signaling requests' });
                return;
            }

            if (!validateSessionId(sessionId)) {
                socket.emit('monitoring:error', { message: 'Invalid session ID' });
                return;
            }

            if (!validateSDP(offer)) {
                socket.emit('monitoring:error', { message: 'Invalid offer format' });
                return;
            }

            const session = monitoringService.getSession(sessionId);
            if (!session) {
                socket.emit('monitoring:error', { message: 'Session not found or expired' });
                return;
            }

            io.to(session.employeeSocketId).emit('monitoring:offer', {
                offer,
                fromSocketId: socket.id,
            });
        });

        // ── monitoring:answer (WebRTC signaling) ─────────────────────
        // Employee sends the SDP answer back to the admin that made the offer.
        // toSocketId is the admin's socket ID received in the offer event — but we
        // must validate it server-side to prevent a malicious client from relaying
        // messages to arbitrary sockets.
        socket.on('monitoring:answer', ({ sessionId, answer, toSocketId }) => {
            if (!socket.data.authenticated) {
                console.warn(`[Monitoring] Unauthorized answer attempt from ${socket.id}`);
                return;
            }

            if (!validateSDP(answer)) {
                socket.emit('monitoring:error', { message: 'Invalid answer format' });
                return;
            }

            const session = monitoringService.getSession(sessionId);
            if (!session) {
                socket.emit('monitoring:error', { message: 'Session not found or expired' });
                return;
            }

            // Security: only forward to a socket that is a registered admin in this session.
            // If toSocketId is not in the session's admin set, drop the message.
            if (!toSocketId || !session.adminSocketIds.has(toSocketId)) {
                console.warn(`[Monitoring] answer: toSocketId '${toSocketId}' is not a registered admin in session ${sessionId}. Dropping.`);
                return;
            }

            io.to(toSocketId).emit('monitoring:answer', { answer, sessionId });
        });

        // ── monitoring:ice-candidate (WebRTC signaling) ───────────────
        // Routing is always derived from the sender's role — the client-supplied
        // toSocketId is intentionally ignored to prevent relay to arbitrary sockets.
        socket.on('monitoring:ice-candidate', ({ sessionId, candidate }) => {
            if (!socket.data.authenticated) return;

            if (!validateICECandidate(candidate)) {
                return; // Silently ignore invalid candidates
            }

            const session = monitoringService.getSession(sessionId);
            if (!session) return;

            if (socket.data.role === 'employee') {
                // Employee → broadcast to all admins currently viewing the session
                session.adminSocketIds.forEach((adminId) => {
                    io.to(adminId).emit('monitoring:ice-candidate', { candidate, sessionId, fromSocketId: socket.id });
                });
            } else if (socket.data.role === 'admin') {
                // Admin → send to the employee being monitored
                io.to(session.employeeSocketId).emit('monitoring:ice-candidate', {
                    candidate,
                    sessionId,
                    fromSocketId: socket.id,
                });
            }
        });

        // ── disconnect ───────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

            // Clean up userSockets map
            if (socket.data.userId) {
                const userId = String(socket.data.userId);
                const sockets = userSockets.get(userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        userSockets.delete(userId);
                    }
                }
            }

            if (socket.data.role === 'employee' && socket.data.sessionId) {
                const sessionId = socket.data.sessionId;

                console.log(`[Monitoring] DEBUG: Employee ${socket.data.name} (UID: ${socket.data.userId}) disconnected in session ${sessionId}`);
                monitoringService.cleanupEmployeeSession(socket.id);

                const session = monitoringService.getSession(sessionId);
                if (session) {
                    console.log(`[Monitoring] DEBUG: Session ${sessionId} still active in service. Notifying room admins...`);

                    // Notify viewing admins (real-time)
                    io.to(sessionId).emit('monitoring:stream-stopped', { sessionId, reason: 'offline' });
                    console.log(`[Monitoring] DEBUG: monitoring:stream-stopped emitted to room ${sessionId}`);

                    // Identify all admins to be notified persistently
                    const adminsToNotify = new Set();
                    session.adminSocketIds.forEach(sid => {
                        const s = io.sockets.sockets.get(sid);
                        if (s && s.data.userId) adminsToNotify.add(String(s.data.userId));
                    });

                    // Also notify the "owner" admin (requester) even if not currently viewing
                    (async () => {
                        try {
                            const requests = await monitoringRequestModel.getRequestsForUser(session.employeeId);
                            const activeRequest = requests.find(r => r.status === 'approved');
                            if (activeRequest) {
                                adminsToNotify.add(String(activeRequest.admin_id));
                            }

                            await Promise.all([...adminsToNotify].map(async (adminId) => {
                                await Notification.createAndNotify({
                                    user_id: adminId,
                                    type: 'monitoring_disconnect',
                                    title: 'Monitoring Stopped',
                                    message: `${session.employeeName} went offline.`,
                                    data: { sessionId, reason: 'offline', employeeName: session.employeeName },
                                }, io, userSockets);
                            }));
                        } catch (err) {
                            console.error('[Monitoring] Disconnect notify error:', err);
                        }
                    })();

                } else {
                    console.log(`[Monitoring] Disconnect: Session ${sessionId} not found after cleanup`);
                }

            } else if (socket.data.role === 'admin' && socket.data.sessionId) {
                const sessionId = socket.data.sessionId;
                const session = monitoringService.getSession(sessionId);
                if (session) {
                    monitoringService.removeAdminFromSession(sessionId, socket.id);
                    io.to(session.employeeSocketId).emit('monitoring:admin-left', {
                        adminName: socket.data.name,
                    });
                }
            }
        });
    });
}

module.exports = setupMonitoringSocket;
