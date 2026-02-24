const { firestoreA, storageA } = require('../config/firebaseProjectA');

class TimelineService {
    /**
     * Fetch list of users from Project A's Firestore
     * @returns {Promise<Array>} Array of user objects {id, name, email}
     */
    async getUsers() {
        try {
            const snapshot = await firestoreA.collection('users').get();
            if (snapshot.empty) return [];

            const users = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    name: data.name || 'N/A',
                    email: data.email || 'N/A'
                });
            });

            return users;
        } catch (error) {
            console.error(`[TimelineService] Error fetching users: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch activity logs for a specific user and date
     * @param {string} userId - The user ID
     * @param {string} dateKey - The date in YYYY-MM-DD format
     * @returns {Promise<Object>} Refined activity data { activities, topApps }
     */
    async getActivityLogs(userId, dateKey) {
        try {
            const docRef = firestoreA.collection('users').doc(userId).collection('activity').doc(dateKey);
            const doc = await docRef.get();

            if (!doc.exists) {
                return { activities: [], topApps: [] };
            }

            const data = doc.data();
            const { activities = [], apps = {}, totalActiveMs = 0 } = data;

            // 1. Sort activities by start time
            const sortedActivities = [...activities].sort((a, b) => {
                return new Date(a.start) - new Date(b.start);
            });

            // 2. Process Top Applications (Aggregation)
            // Calculate percentage based on totalActiveMs
            const topApps = Object.entries(apps)
                .map(([name, totalMs]) => ({
                    name,
                    totalMs,
                    percentage: totalActiveMs > 0 ? Number(((totalMs / totalActiveMs) * 100).toFixed(2)) : 0
                }))
                .sort((a, b) => b.totalMs - a.totalMs); // Sort by totalMs descending

            return {
                activities: sortedActivities,
                topApps,
                totalActiveMs
            };
        } catch (error) {
            console.error(`Error fetching activity logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetch screenshot metadata for a specific user and date
     * @param {string} userId - The user ID
     * @param {string} dateKey - The date in YYYY-MM-DD format
     */
    async getScreenshots(userId, dateKey) {
        try {
            const docRef = firestoreA.collection('users').doc(userId).collection('screenshots').doc(dateKey);
            const doc = await docRef.get();

            if (!doc.exists) {
                return { images: [] };
            }

            const data = doc.data();
            const images = data.images || [];

            // We might want to generate signed URLs for storage if the images array 
            // contains storage paths or if we need to secure the physical image access.
            // Based on the prompt, images contain {url, timestamp}.

            return { images };
        } catch (error) {
            console.error(`Error fetching screenshots: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a signed URL for a physical image in Storage
     * @param {string} userId 
     * @param {string} dateKey 
     * @param {string} timestamp 
     */
    async getScreenshotSignedUrl(userId, dateKey, timestamp) {
        try {
            const filePath = `screenshots/${userId}/${dateKey}/${timestamp}.png`;
            const file = storageA.bucket().file(filePath);

            // Generate a signed URL that expires in 1 hour
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000,
            });

            return url;
        } catch (error) {
            console.error(`Error generating signed URL: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new TimelineService();
