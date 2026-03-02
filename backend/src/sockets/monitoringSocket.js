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
const { authB } = require('../config/firebaseProjectB');
const userService = require('../services/userService');
const monitoringRequestModel = require('../models/monitoringRequestModel');
const Notification = require('../models/notificationModel');
const { socketAuth } = require('../middlewares/monitoringAuth');
const { validateAuthPayload, validateSessionId, validateSDP, validateICECandidate } = require('../middlewares/monitoringValidation');
const { socketRateLimiter } = require('../middlewares/rateLimiter');
const monitoringService = require('../services/monitoringService');

/**
 * Grace period (ms) before telling admins an employee is offline.
 * Handles brief Socket.IO reconnects (e.g. Cloud Run keepalive, network hiccup).
 * If the employee reconnects within this window, the offline event is cancelled.
 */
const OFFLINE_GRACE_MS = 6_000;

/**
 * sessionId → timeoutId — pending "employee went offline" timers.
 * Keyed by sessionId so the reconnect handler can cancel them.
 */
const pendingOfflineTimers = new Map();

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

            // Extract User ID from Firebase ID token (falls back to temp anonymous ID)
            let userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            let avatarUrl = null;

            if (token) {
                try {
                    const decoded = await authB.verifyIdToken(token);
                    if (decoded && decoded.uid) {
                        userId = decoded.uid;
                        // Fetch avatar from Firestore profile
                        try {
                            const user = await userService.findUserById(decoded.uid);
                            if (user) avatarUrl = user.avatarUrl || null;
                        } catch (dbErr) {
                            console.error('[Monitoring] Failed to fetch user avatar:', dbErr);
                        }
                        console.log(`[Monitoring] User authenticated with Firebase token. UID: ${userId}`);
                    }
                } catch (err) {
                    console.log('[Monitoring] Invalid Firebase token in auth, using temporary ID');
                }
            }

            socket.data.role          = sanitized.role;
            socket.data.name          = sanitized.name;
            socket.data.userId        = userId;
            socket.data.authenticated = true;
            socket.data.avatarUrl     = avatarUrl;

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
                        // updateEmployeeSocket keeps the O(1) socket index consistent
                        monitoringService.updateEmployeeSocket(sessionId, session.employeeSocketId, socket.id);
                        console.log(`[Monitoring] Employee ${sanitized.name} reconnected (${session.employeeSocketId} -> ${socket.id}), reusing session ${sessionId}`);
                    }
                    // Cancel any pending "offline" notification — employee is back within grace period
                    const existingTimer = pendingOfflineTimers.get(sessionId);
                    if (existingTimer) {
                        clearTimeout(existingTimer);
                        pendingOfflineTimers.delete(sessionId);
                        console.log(`[Monitoring] Offline grace timer cancelled for ${sanitized.name} (session ${sessionId})`);
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

                // Single Firestore read for both: resume-modal detection + admin notification
                let monitoringExpected = false;
                let activeRequest = null;
                let approvedAdmins = [];
                try {
                    const requests = await monitoringRequestModel.getRequestsForUser(userId);
                    const approved = requests.find(r => r.status === 'approved');
                    if (approved) {
                        monitoringExpected = true;
                        activeRequest = { adminName: approved.admin_name, requestId: approved.id };
                        console.log(`[Monitoring] Found approved request for ${sanitized.name}, expecting monitoring resume.`);
                    }
                    approvedAdmins = requests
                        .filter(r => r.status === 'approved')
                        .map(r => r.admin_id);
                } catch (err) {
                    console.error('[Monitoring] Error checking requests during auth:', err);
                }

                socket.emit('monitoring:session-created', {
                    sessionId,
                    monitoringExpected,
                    activeRequest,
                });

                // Notify approved admins (uses approvedAdmins populated above — no second Firestore read)
                try {
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
                adminUserId: socket.data.userId,
            });

            socket.emit('monitoring:request-sent', { employeeName });
        });

        // ── monitoring:respond-connection (Employee) ─────────────────
        socket.on('monitoring:respond-connection', ({ adminSocketId, adminUserId, adminName: sentAdminName, accepted }) => {
            if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
                return;
            }

            const sessionId = socket.data.sessionId;
            const session = monitoringService.getSession(sessionId);
            if (!session) return;

            console.log(`[Monitoring] Employee ${socket.data.name} responded to ${adminSocketId} (userId: ${adminUserId}): ${accepted ? 'Accepted' : 'Denied'}`);

            if (accepted) {
                // Resolve the set of socket IDs to notify.
                // Priority: look up current sockets for the admin via userSockets (handles
                // reconnection & multi-instance when combined with the Redis adapter).
                // Fall back to the original socket ID if no mapping exists.
                let targetSocketIds = [];
                if (adminUserId) {
                    const currentSockets = userSockets.get(String(adminUserId));
                    if (currentSockets && currentSockets.size > 0) {
                        targetSocketIds = [...currentSockets];
                    }
                }
                if (targetSocketIds.length === 0) {
                    // Fallback: use the original socket ID (works when not reconnected)
                    targetSocketIds = [adminSocketId];
                }

                targetSocketIds.forEach(sid => {
                    // Pass adminUserId so session.adminUserIds stays accurate for
                    // cross-instance disconnect notifications (Redis adapter).
                    monitoringService.addAdminToSession(sessionId, sid, undefined, adminUserId);
                    // Cross-instance room join (works with Redis adapter)
                    io.in(sid).socketsJoin(sessionId);
                    // Set sessionId on the admin socket if it's local (for disconnect cleanup)
                    const localAdminSocket = io.sockets.sockets.get(sid);
                    if (localAdminSocket) {
                        localAdminSocket.data.sessionId = sessionId;
                    }
                    io.to(sid).emit('monitoring:connect-success', {
                        sessionId,
                        employeeName: session.employeeName,
                        employeeId: session.employeeId,
                        avatarUrl: session.avatarUrl,
                        streamActive: session.streamActive,
                    });
                });

                // Notify the employee — use the admin name from the payload (sent by the employee
                // who stored it from the original connection-request), then fall back to the
                // local socket lookup in case of an older client version.
                const localAdmin = io.sockets.sockets.get(adminSocketId);
                const adminName = sentAdminName || localAdmin?.data?.name || 'Admin';
                socket.emit('monitoring:admin-joined', { adminName });
            } else {
                io.to(adminSocketId).emit('monitoring:request-denied', {
                    employeeName: session.employeeName,
                });
            }
        });

        // ── monitoring:start-sharing (Employee) ──────────────────────
        socket.on('monitoring:start-sharing', async () => {
            if (!socket.data.authenticated || socket.data.role !== 'employee' || !socket.data.sessionId) {
                console.warn(`[Monitoring] Unauthorized start-sharing attempt from ${socket.id}`);
                return;
            }

            const sessionId = socket.data.sessionId;
            if (!validateSessionId(sessionId)) {
                socket.emit('monitoring:error', { message: 'Invalid session ID' });
                return;
            }

            let session = monitoringService.getSession(sessionId);
            if (!session) {
                // Session was lost (server edge-case). Reconstruct it from socket data so
                // the employee can still start sharing — the admin is already in the
                // Socket.IO room (via socket.join) so io.to(sessionId) still reaches them.
                console.warn(`[Monitoring] Session ${sessionId} missing — reconstructing from socket data for ${socket.data.name}`);
                monitoringService.recreateSession(
                    sessionId,
                    socket.id,
                    socket.data.name,
                    socket.data.userId,
                    socket.data.avatarUrl || null
                );
                session = monitoringService.getSession(sessionId);
                if (!session) {
                    console.error(`[Monitoring] Failed to reconstruct session ${sessionId}`);
                    socket.emit('monitoring:error', { message: 'Session not found or expired', sessionId });
                    return;
                }
                // Re-populate adminSocketIds from the Socket.IO room (admins joined earlier)
                const room = io.sockets.adapter.rooms.get(sessionId);
                if (room) {
                    room.forEach(sid => {
                        const s = io.sockets.sockets.get(sid);
                        if (s && s.data.role === 'admin') {
                            session.adminSocketIds.add(sid);
                        }
                    });
                }
                console.log(`[Monitoring] Session ${sessionId} reconstructed with ${session.adminSocketIds.size} admin(s)`);
            }

            monitoringService.setStreamActive(sessionId, true);
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

                io.to(sessionId).emit('monitoring:stream-stopped', { sessionId, reason: stopReason });

                // Create persistent notification only for non-manual disconnects.
                // Use session.adminUserIds (populated by addAdminToSession) — this is
                // cross-instance safe and does not require io.sockets.sockets.get().
                if (stopReason !== 'manual') {
                    Promise.all([...session.adminUserIds].map(async (adminId) => {
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

            monitoringService.addAdminToSession(sessionId, socket.id, socket.data.name, socket.data.userId);
            socket.join(sessionId);
            socket.data.sessionId = sessionId; // Needed for disconnect cleanup

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

                monitoringService.cleanupEmployeeSession(socket.id);

                const session = monitoringService.getSession(sessionId);
                if (session) {
                    // ── Grace period ─────────────────────────────────────────────
                    // Don't immediately broadcast "offline" — the socket may be
                    // doing a brief automatic reconnect (network hiccup, Cloud Run
                    // keepalive).  If the employee re-authenticates inside
                    // OFFLINE_GRACE_MS the timer is cancelled and admins never see
                    // an offline flash.  Only if the employee stays offline past the
                    // grace window do we fire the real stream-stopped / notification.
                    const existingTimer = pendingOfflineTimers.get(sessionId);
                    if (existingTimer) clearTimeout(existingTimer);

                    const timerId = setTimeout(() => {
                        pendingOfflineTimers.delete(sessionId);

                        // Re-fetch session — it may have been cleaned up or
                        // employee is already back (employeeSocketId set again).
                        const liveSession = monitoringService.getSession(sessionId);
                        if (!liveSession || liveSession.employeeSocketId) return; // employee reconnected

                        console.log(`[Monitoring] Grace period expired — ${session.employeeName} is offline`);

                        // Notify viewing admins (real-time)
                        io.to(sessionId).emit('monitoring:stream-stopped', { sessionId, reason: 'offline' });

                        // Use session.adminUserIds — cross-instance safe (no io.sockets.sockets.get)
                        (async () => {
                            try {
                                const adminsToNotify = new Set(liveSession.adminUserIds);

                                const requests = await monitoringRequestModel.getRequestsForUser(liveSession.employeeId);
                                const activeRequest = requests.find(r => r.status === 'approved');
                                if (activeRequest) {
                                    adminsToNotify.add(String(activeRequest.admin_id));
                                }

                                await Promise.all([...adminsToNotify].map(async (adminId) => {
                                    await Notification.createAndNotify({
                                        user_id: adminId,
                                        type: 'monitoring_disconnect',
                                        title: 'Monitoring Stopped',
                                        message: `${liveSession.employeeName} went offline.`,
                                        data: { sessionId, reason: 'offline', employeeName: liveSession.employeeName },
                                    }, io, userSockets);
                                }));
                            } catch (err) {
                                console.error('[Monitoring] Disconnect notify error:', err);
                            }
                        })();
                    }, OFFLINE_GRACE_MS);

                    pendingOfflineTimers.set(sessionId, timerId);
                    console.log(`[Monitoring] Grace timer started for ${session.employeeName} (${OFFLINE_GRACE_MS}ms)`);
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
