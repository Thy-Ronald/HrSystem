const Notification = require('../models/notificationModel');
const { getContractsExpiringInDays } = require('../models/contractStore');

// Helper to merge DB notifications with virtual contract notifications
const getUnifiedNotifications = async (req, res) => {
    try {
        console.log('[NotificationController] GET /api/notifications called');

        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 4;
        const offset = (page - 1) * limit;

        // 1. Fetch persistent notifications (e.g. Disconnects)
        // We fetch a bit more to handle merging with virtual ones, 
        // but for simplicity and to follow the requirement "prevent crashing or slowing down",
        // we'll fetch with a reasonable maximum if not specified, 
        // or specifically for this request.
        console.log(`[NotificationController] Fetching DB notifications (page ${page}, limit ${limit})...`);
        const dbNotifications = await Notification.getAllForUser(userId, 50, 0); // Get recent 50 for merging

        // 2. Fetch expiring contracts (Virtual notifications)
        console.log('[NotificationController] Fetching expiring contracts...');
        const expiringContracts = await getContractsExpiringInDays(7);

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

        console.log('[NotificationController] Returning', paginatedNotifications.length, 'notifications. hasMore:', hasMore);
        res.set('Cache-Control', 'private, max-age=30');
        res.json({
            notifications: paginatedNotifications,
            hasMore,
            total: allNotifications.length
        });
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
