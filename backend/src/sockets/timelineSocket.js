/**
 * Timeline Real-time Socket Handler
 * 
 * Manages Socket.IO connections for timeline real-time updates
 * - Delegates subscription logic to TimelineSubscriptionService
 * - Handles socket lifecycle events
 * - Broadcasts updates to connected clients
 */

const TimelineSubscriptionService = require('../services/timelineSubscriptionService');
const { firestoreA } = require('../config/firebaseProjectA');

// Initialize subscription service (singleton)
const subscriptionService = new TimelineSubscriptionService(firestoreA);

// Store unsubscribe functions per socket for cleanup
const socketSubscriptions = new Map(); // Map<socketId, Array<unsubscribeFunctions>>

/**
 * Setup timeline socket listeners for real-time updates
 * @param {Object} io - Socket.IO server instance
 */
function setupTimelineSocket(io) {
    io.on('connection', (socket) => {
        console.log(`[TimelineSocket] Client connected: ${socket.id}`);
        socketSubscriptions.set(socket.id, []);

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

            console.log(`[TimelineSocket] ${socket.id} subscribing to ${userId}/${dateKey}`);

            try {
                // Use subscription service to manage listeners
                const unsubscribe = await subscriptionService.subscribe(
                    userId,
                    dateKey,
                    // Activity update callback
                    (transformedData) => {
                        io.emit('timeline:activity-updated', {
                            userId,
                            dateKey,
                            ...transformedData
                        });
                    },
                    // Screenshots update callback
                    (screenshotsData) => {
                        io.emit('timeline:screenshots-updated', {
                            userId,
                            dateKey,
                            ...screenshotsData
                        });
                    }
                );

                // Store unsubscribe function for cleanup
                const subscriptions = socketSubscriptions.get(socket.id) || [];
                subscriptions.push(unsubscribe);
                socketSubscriptions.set(socket.id, subscriptions);

                socket.emit('timeline:subscribed', { userId, dateKey });
                console.log(`[TimelineSocket] ${socket.id} subscribed to ${userId}/${dateKey}`);
            } catch (error) {
                console.error(`[TimelineSocket] Subscription error:`, error.message);
                socket.emit('timeline:error', { error: error.message });
            }
        });

        /**
         * Get subscription stats (for debugging/monitoring)
         * Event: timeline:stats
         */
        socket.on('timeline:stats', () => {
            const stats = subscriptionService.getStats();
            socket.emit('timeline:stats-response', stats);
        });

        /**
         * Handle disconnect
         */
        socket.on('disconnect', () => {
            const subscriptions = socketSubscriptions.get(socket.id) || [];
            subscriptions.forEach(unsubscribe => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.error('[TimelineSocket] Error unsubscribing:', error.message);
                }
            });
            socketSubscriptions.delete(socket.id);
            console.log(`[TimelineSocket] ${socket.id} disconnected, cleaned up ${subscriptions.length} subscription(s)`);
        });
    });
}

/**
 * Cleanup all timeline sockets and subscriptions
 * Called on graceful shutdown
 */
async function cleanupTimelineSocket() {
    console.log('[TimelineSocket] Cleaning up all socket subscriptions...');
    
    // Unsubscribe all sockets
    socketSubscriptions.forEach((subscriptions, socketId) => {
        subscriptions.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.error(`[TimelineSocket] Error cleaning up ${socketId}:`, error.message);
            }
        });
    });
    socketSubscriptions.clear();

    // Cleanup subscription service
    await subscriptionService.cleanup();
    console.log('[TimelineSocket] ✅ All cleanup complete');
}

/**
 * Get subscription service (for advanced use cases)
 */
function getSubscriptionService() {
    return subscriptionService;
}

module.exports = {
    setupTimelineSocket,
    cleanupTimelineSocket,
    getSubscriptionService
};
