const Notification = require('../models/notificationModel');
const { getContractsExpiringInDays } = require('../models/contractStore');

// Helper to merge DB notifications with virtual contract notifications
const getUnifiedNotifications = async (req, res) => {
    try {
        console.log('[NotificationController] GET /api/notifications called');
        console.log('[NotificationController] req.user:', req.user);

        const userId = req.user.userId;
        console.log('[NotificationController] userId:', userId);

        // 1. Fetch persistent notifications (e.g. Disconnects)
        console.log('[NotificationController] Fetching DB notifications...');
        const dbNotifications = await Notification.getAllForUser(userId);
        console.log('[NotificationController] DB notifications fetched:', dbNotifications.length);

        // 2. Fetch expiring contracts (Virtual notifications)
        // Only if the user is admin (which they effectively are if they see this)
        console.log('[NotificationController] Fetching expiring contracts...');
        const expiringContracts = await getContractsExpiringInDays(7);
        console.log('[NotificationController] Expiring contracts fetched:', expiringContracts.length);

        const contractNotifications = expiringContracts.map(c => ({
            id: `contract_${c.id}`, // Virtual ID
            type: 'contract_expiry',
            title: 'Contract Expiring Soon',
            message: `${c.name || c.employeeName} - ${c.position}`,
            data: c,
            created_at: new Date().toISOString(), // Virtual timestamp
            is_read: false // Contracts are always "active" until renewed
        }));

        // Merge and sort
        const allNotifications = [...dbNotifications, ...contractNotifications].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        console.log('[NotificationController] Returning', allNotifications.length, 'notifications');
        res.json(allNotifications);
    } catch (error) {
        console.error('[NotificationController] ERROR:', error);
        console.error('[NotificationController] Error stack:', error.stack);
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

module.exports = {
    getUnifiedNotifications,
    markAsRead
};
