const Notification = require('../models/notificationModel');
const { getContractsExpiringInDays } = require('../models/contractStore');
const cacheService = require('../services/cacheService');

const NOTIF_CACHE_TTL = 60; // 1 minute in seconds

// Helper to merge DB notifications with virtual contract notifications
const getUnifiedNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const offset = (page - 1) * limit;

        // Serve from Redis cache when available
        const cacheKey = `notifications:${userId}:p${page}:l${limit}`;
        const cached = await cacheService.get(cacheKey, NOTIF_CACHE_TTL * 1000);
        if (cached) {
            return res.set('Cache-Control', 'private, max-age=60').json(cached);
        }

        // Fetch DB notifications and expiring contracts in parallel
        const [dbNotifications, expiringContracts] = await Promise.all([
            Notification.getAllForUser(userId, 50, 0),
            getContractsExpiringInDays(7),
        ]);

        const contractNotifications = expiringContracts.map(c => ({
            id: `contract_${c.id}`, // Virtual ID
            type: 'contract_expiry',
            title: 'Contract Expiring Soon',
            message: `${c.name || c.employeeName} - ${c.position}`,
            data: c,
            created_at: new Date().toISOString(), // Virtual timestamp
            is_read: false
        }));

        // Merge and sort
        const allNotifications = [...dbNotifications, ...contractNotifications].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Paginate the merged list
        const paginatedNotifications = allNotifications.slice(offset, offset + limit);
        const hasMore = allNotifications.length > offset + limit;

        const result = {
            notifications: paginatedNotifications,
            hasMore,
            total: allNotifications.length
        };
        await cacheService.set(cacheKey, result, NOTIF_CACHE_TTL);
        res.set('Cache-Control', 'private, max-age=60').json(result);
    } catch (error) {
        console.error('[NotificationController] ERROR:', error);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        // Only mark DB notifications as read. Contract ones are virtual.
        if (!id.startsWith('contract_')) {
            await Notification.markAsRead(id);
        }
        // Bust cache so the next fetch reflects the updated read state
        await cacheService.deletePattern(`notifications:${req.user.userId}:*`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Failed to mark as read' });
    }
};

const deleteAll = async (req, res) => {
    try {
        const userId = req.user.userId;
        await Notification.deleteAllForUser(userId);
        await cacheService.deletePattern(`notifications:${userId}:*`);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ message: 'Failed to delete notifications' });
    }
};

module.exports = {
    getUnifiedNotifications,
    markAsRead,
    deleteAll
};
