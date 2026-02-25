/**
 * Timeline Real-time Socket Handler
 * 
 * Listens to Firestore changes and broadcasts updates to connected clients via Socket.IO
 * - Activity logs updates
 * - Screenshots updates
 * - Automatically invalidates Redis cache on updates
 */

const { firestoreA } = require('../config/firebaseProjectA');
const cacheService = require('../services/cacheService');

// Store active listeners to clean them up on disconnect
const activeListeners = new Map(); // Map<socketId, Array<unsubscribeFunctions>>

/**
 * Setup timeline socket listeners for real-time updates
 * @param {Object} io - Socket.IO server instance
 */
function setupTimelineSocket(io) {
    io.on('connection', (socket) => {
        console.log(`[TimelineSocket] Client connected: ${socket.id}`);

        /**
         * Subscribe to real-time updates for a specific user and date
         * Event: timeline:subscribe
         * Data: { userId, dateKey }
         */
        socket.on('timeline:subscribe', async (data) => {
            const { userId, dateKey } = data;

            if (!userId || !dateKey) {
                socket.emit('timeline:error', { error: 'Missing userId or dateKey' });
                return;
            }

            console.log(`[TimelineSocket] ${socket.id} subscribed to ${userId}/${dateKey}`);

            const unsubscribeFunctions = [];

            try {
                // ─── Listen to Activity Logs Changes ──────────────────────────────────
                const activityDocRef = firestoreA
                    .collection('users')
                    .doc(userId)
                    .collection('activity')
                    .doc(dateKey);

                const activityUnsubscribe = activityDocRef.onSnapshot(async (doc) => {
                    if (!doc.exists) return;

                    const data = doc.data();
                    const { activities = [], apps = {}, totalActiveMs = 0 } = data;

                    // Process and transform data
                    const sortedActivities = [...activities].sort((a, b) => {
                        return new Date(a.start) - new Date(b.start);
                    });

                    const topApps = Object.entries(apps)
                        .map(([name, totalMs]) => ({
                            name,
                            totalMs,
                            percentage: totalActiveMs > 0 ? Number(((totalMs / totalActiveMs) * 100).toFixed(2)) : 0
                        }))
                        .sort((a, b) => b.totalMs - a.totalMs);

                    // Invalidate cache when activity logs change
                    const cacheKey = `timeline:${userId}:${dateKey}`;
                    await cacheService.delete(cacheKey);
                    console.log(`[TimelineSocket] 🗑️ Invalidated cache for ${cacheKey}`);

                    // Emit update to all clients subscribed to this timeline
                    io.emit('timeline:activity-updated', {
                        userId,
                        dateKey,
                        activities: sortedActivities,
                        topApps,
                        totalActiveMs,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[TimelineSocket] 📤 Activity update broadcasted (${sortedActivities.length} activities)`);
                });

                unsubscribeFunctions.push(activityUnsubscribe);

                // ─── Listen to Screenshots Changes ────────────────────────────────────
                const screenshotsDocRef = firestoreA
                    .collection('users')
                    .doc(userId)
                    .collection('screenshots')
                    .doc(dateKey);

                const screenshotsUnsubscribe = screenshotsDocRef.onSnapshot(async (doc) => {
                    if (!doc.exists) {
                        io.emit('timeline:screenshots-updated', {
                            userId,
                            dateKey,
                            images: [],
                            timestamp: new Date().toISOString()
                        });
                        return;
                    }

                    const data = doc.data();
                    const images = data.images || [];

                    // Invalidate cache
                    const cacheKey = `timeline:${userId}:${dateKey}`;
                    await cacheService.delete(cacheKey);
                    console.log(`[TimelineSocket] 🗑️ Invalidated cache for ${cacheKey}`);

                    // Emit update
                    io.emit('timeline:screenshots-updated', {
                        userId,
                        dateKey,
                        images,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[TimelineSocket] 📤 Screenshots update broadcasted (${images.length} new images)`);
                });

                unsubscribeFunctions.push(screenshotsUnsubscribe);

                // Store unsubscribe functions for cleanup on disconnect
                activeListeners.set(socket.id, unsubscribeFunctions);
                socket.emit('timeline:subscribed', { userId, dateKey });

            } catch (error) {
                console.error(`[TimelineSocket] Error subscribing to ${userId}/${dateKey}:`, error.message);
                socket.emit('timeline:error', { error: error.message });
            }
        });

        /**
         * Unsubscribe from real-time updates
         * Event: timeline:unsubscribe
         */
        socket.on('timeline:unsubscribe', () => {
            const unsubscribeFunctions = activeListeners.get(socket.id);
            if (unsubscribeFunctions) {
                unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
                activeListeners.delete(socket.id);
                console.log(`[TimelineSocket] ${socket.id} unsubscribed`);
            }
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', () => {
            const unsubscribeFunctions = activeListeners.get(socket.id);
            if (unsubscribeFunctions) {
                unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
                activeListeners.delete(socket.id);
                console.log(`[TimelineSocket] ${socket.id} disconnected, listeners cleaned up`);
            }
        });
    });
}

/**
 * Cleanup all timeline socket listeners
 */
function cleanupTimelineSocket() {
    activeListeners.forEach(unsubscribeFunctions => {
        unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    });
    activeListeners.clear();
    console.log('[TimelineSocket] All listeners cleaned up');
}

module.exports = {
    setupTimelineSocket,
    cleanupTimelineSocket
};
