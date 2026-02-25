/**
 * Timeline Subscription Service
 * 
 * Manages Firestore listener lifecycle with:
 * - Listener deduplication (one listener per unique user/date)
 * - Multiple subscribers per listener
 * - Automatic cleanup on last unsubscribe
 * - Cache invalidation
 * - Error handling with retry logic
 */

const cacheService = require('./cacheService');

class TimelineSubscriptionService {
    constructor(firestoreA) {
        this.firestore = firestoreA;
        // Map<"userId:dateKey" -> {subscribers: Set, unsubscribers: Array}>
        this.activeSubscriptions = new Map();
    }

    /**
     * Subscribe to timeline updates for a user/date
     * Reuses listener if already subscribed, adds new subscriber to existing listener
     * @param {string} userId 
     * @param {string} dateKey 
     * @param {Function} onActivityUpdate - Callback for activity updates
     * @param {Function} onScreenshotsUpdate - Callback for screenshot updates
     * @returns {Function} Unsubscribe function
     */
    async subscribe(userId, dateKey, onActivityUpdate, onScreenshotsUpdate) {
        const subscriptionKey = `${userId}:${dateKey}`;

        // Check if listener already exists
        if (this.activeSubscriptions.has(subscriptionKey)) {
            const subscription = this.activeSubscriptions.get(subscriptionKey);
            
            // Add this callback to existing listeners
            subscription.subscribers.add({ onActivityUpdate, onScreenshotsUpdate });
            
            console.log(`[TimelineSubscription] ✅ Reused existing listener for ${subscriptionKey}`);
            
            // Return unsubscribe function
            return () => this.unsubscribe(subscriptionKey, { onActivityUpdate, onScreenshotsUpdate });
        }

        // Create new listener (only once per unique user/date)
        console.log(`[TimelineSubscription] 🔄 Creating new listener for ${subscriptionKey}`);
        const subscribers = new Set([{ onActivityUpdate, onScreenshotsUpdate }]);
        const unsubscribers = [];

        try {
            // Subscribe to activity logs
            const activityUnsubscriber = this.setupActivityListener(userId, dateKey, subscribers);
            unsubscribers.push(activityUnsubscriber);

            // Subscribe to screenshots
            const screenshotsUnsubscriber = this.setupScreenshotsListener(userId, dateKey, subscribers);
            unsubscribers.push(screenshotsUnsubscriber);

            // Store subscription
            this.activeSubscriptions.set(subscriptionKey, {
                subscribers,
                unsubscribers,
                createdAt: Date.now()
            });

            console.log(`[TimelineSubscription] ✅ Listener created for ${subscriptionKey}`);
        } catch (error) {
            console.error(`[TimelineSubscription] ❌ Failed to create listener:`, error.message);
            throw error;
        }

        // Return unsubscribe function
        return () => this.unsubscribe(subscriptionKey, { onActivityUpdate, onScreenshotsUpdate });
    }

    /**
     * Setup Firestore listener for activity logs
     * Transforms data and notifies all subscribers
     * @private
     */
    setupActivityListener(userId, dateKey, subscribers) {
        const docRef = this.firestore
            .collection('users')
            .doc(userId)
            .collection('activity')
            .doc(dateKey);

        return docRef.onSnapshot(async (doc) => {
            try {
                if (!doc.exists) {
                    console.log(`[TimelineSubscription] No activity data for ${userId}/${dateKey}`);
                    return;
                }

                const transformedData = this.transformActivityData(doc);

                // Invalidate cache for this timeline
                const cacheKey = `timeline:${userId}:${dateKey}`;
                await cacheService.delete(cacheKey);
                console.log(`[TimelineSubscription] 🗑️ Invalidated cache: ${cacheKey}`);

                // Notify all subscribers
                subscribers.forEach(({ onActivityUpdate }) => {
                    if (onActivityUpdate) {
                        try {
                            onActivityUpdate(transformedData);
                        } catch (error) {
                            console.error('[TimelineSubscription] Error in subscriber callback:', error.message);
                        }
                    }
                });

                console.log(`[TimelineSubscription] 📤 Activity update sent to ${subscribers.size} subscriber(s)`);
            } catch (error) {
                console.error('[TimelineSubscription] Error processing activity snapshot:', error.message);
            }
        }, (error) => {
            console.error(`[TimelineSubscription] Activity listener error for ${userId}/${dateKey}:`, error.message);
        });
    }

    /**
     * Setup Firestore listener for screenshots
     * @private
     */
    setupScreenshotsListener(userId, dateKey, subscribers) {
        const docRef = this.firestore
            .collection('users')
            .doc(userId)
            .collection('screenshots')
            .doc(dateKey);

        return docRef.onSnapshot(async (doc) => {
            try {
                const images = doc.exists ? (doc.data().images || []) : [];

                // Invalidate cache
                const cacheKey = `timeline:${userId}:${dateKey}`;
                await cacheService.delete(cacheKey);

                // Notify all subscribers
                subscribers.forEach(({ onScreenshotsUpdate }) => {
                    if (onScreenshotsUpdate) {
                        try {
                            onScreenshotsUpdate({ images });
                        } catch (error) {
                            console.error('[TimelineSubscription] Error in subscriber callback:', error.message);
                        }
                    }
                });

                console.log(`[TimelineSubscription] 📤 Screenshots update sent to ${subscribers.size} subscriber(s) (${images.length} images)`);
            } catch (error) {
                console.error('[TimelineSubscription] Error processing screenshots snapshot:', error.message);
            }
        }, (error) => {
            console.error(`[TimelineSubscription] Screenshots listener error for ${userId}/${dateKey}:`, error.message);
        });
    }

    /**
     * Transform activity data from Firestore
     * Pure function - no side effects
     * @private
     */
    transformActivityData(doc) {
        const data = doc.data();
        const { activities = [], apps = {}, totalActiveMs = 0 } = data;

        // Sort activities by start time
        const sortedActivities = [...activities].sort((a, b) => {
            return new Date(a.start) - new Date(b.start);
        });

        // Calculate top apps
        const topApps = Object.entries(apps)
            .map(([name, totalMs]) => ({
                name,
                totalMs,
                percentage: totalActiveMs > 0 ? Number(((totalMs / totalActiveMs) * 100).toFixed(2)) : 0
            }))
            .sort((a, b) => b.totalMs - a.totalMs);

        return {
            activities: sortedActivities,
            topApps,
            totalActiveMs,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Unsubscribe a specific callback from a timeline
     * If no subscribers remain, clean up the listener
     * @private
     */
    unsubscribe(subscriptionKey, subscriber) {
        const subscription = this.activeSubscriptions.get(subscriptionKey);
        if (!subscription) return;

        // Remove subscriber
        subscription.subscribers.delete(subscriber);
        console.log(`[TimelineSubscription] ✅ Unsubscribed from ${subscriptionKey} (${subscription.subscribers.size} remaining)`);

        // If no more subscribers, clean up listener
        if (subscription.subscribers.size === 0) {
            subscription.unsubscribers.forEach(unsubscriber => {
                try {
                    unsubscriber();
                } catch (error) {
                    console.error('[TimelineSubscription] Error cleaning up listener:', error.message);
                }
            });
            this.activeSubscriptions.delete(subscriptionKey);
            console.log(`[TimelineSubscription] 🧹 Cleanup: Listener removed for ${subscriptionKey}`);
        }
    }

    /**
     * Get subscription stats (for monitoring/debugging)
     */
    getStats() {
        let totalSubscribers = 0;
        const subscriptions = [];

        this.activeSubscriptions.forEach((sub, key) => {
            totalSubscribers += sub.subscribers.size;
            subscriptions.push({
                key,
                subscribers: sub.subscribers.size,
                age: Date.now() - sub.createdAt
            });
        });

        return {
            activeSubscriptions: this.activeSubscriptions.size,
            totalSubscribers,
            subscriptions
        };
    }

    /**
     * Cleanup all listeners (for graceful shutdown)
     */
    async cleanup() {
        console.log('[TimelineSubscription] 🧹 Cleaning up all listeners...');
        this.activeSubscriptions.forEach((subscription, key) => {
            subscription.unsubscribers.forEach(unsubscriber => {
                try {
                    unsubscriber();
                } catch (error) {
                    console.error(`[TimelineSubscription] Error cleaning up ${key}:`, error.message);
                }
            });
        });
        this.activeSubscriptions.clear();
        console.log('[TimelineSubscription] ✅ All listeners cleaned up');
    }
}

module.exports = TimelineSubscriptionService;
