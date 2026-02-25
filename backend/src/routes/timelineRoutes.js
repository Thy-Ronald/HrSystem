const express = require('express');
const router = express.Router();
const timelineService = require('../services/timelineService');
const cacheService = require('../services/cacheService');

/**
 * @route GET /api/timeline/users
 * @desc Fetch list of available users for timeline
 */
router.get('/users', async (req, res) => {
    try {
        const users = await timelineService.getUsers();
        res.json(users);
    } catch (error) {
        console.error(`[TimelineRoutes] Error fetching users: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * @route GET /api/timeline/:userId/:dateKey
 * @desc Fetch activity logs and screenshots for a user and date with Redis caching
 * @access Private (Add your auth middleware here)
 */
router.get('/:userId/:dateKey', async (req, res) => {
    try {
        const { userId, dateKey } = req.params;

        // Validate dateKey format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateKey)) {
            return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
        }

        // Create cache key
        const cacheKey = `timeline:${userId}:${dateKey}`;

        // Try to get from cache first
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData) {
            console.log(`[Timeline] ✅ Cache hit for ${cacheKey}`);
            return res.json(cachedData);
        }

        // Fetch data in parallel
        const [activityLogs, screenshots] = await Promise.all([
            timelineService.getActivityLogs(userId, dateKey),
            timelineService.getScreenshots(userId, dateKey)
        ]);

        const responseData = {
            userId,
            dateKey,
            activityLogs,
            screenshots
        };

        // Cache the result for 1 hour (3600 seconds)
        await cacheService.set(cacheKey, responseData, 3600);
        console.log(`[Timeline] 💾 Cached data for ${cacheKey}`);

        res.json(responseData);
    } catch (error) {
        console.error(`Error in timeline route: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch timeline data' });
    }
});

/**
 * @route GET /api/timeline/image-url
 * @desc Get a signed URL for a specific screenshot
 */
router.get('/image-url', async (req, res) => {
    try {
        const { userId, dateKey, timestamp } = req.query;
        if (!userId || !dateKey || !timestamp) {
            return res.status(400).json({ error: 'Missing required parameters: userId, dateKey, timestamp' });
        }

        const url = await timelineService.getScreenshotSignedUrl(userId, dateKey, timestamp);
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate image URL' });
    }
});

module.exports = router;
