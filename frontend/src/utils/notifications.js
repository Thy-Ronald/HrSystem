/**
 * Browser Push Notification Utilities
 */

/**
 * Request permission for browser notifications
 * @returns {Promise<string>} Permission status: 'granted', 'denied', or 'default'
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

/**
 * Show a browser push notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @param {string} options.body - Notification body text
 * @param {string} options.icon - Icon URL
 * @param {string} options.tag - Notification tag (for grouping/replacing)
 * @param {Function} options.onClick - Click handler
 */
export function showBrowserNotification(title, options = {}) {
    if (!('Notification' in window)) {
        console.warn('This browser does not support desktop notifications');
        return null;
    }

    if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
    }

    const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'default',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
    });

    if (options.onClick) {
        notification.onclick = () => {
            window.focus();
            options.onClick();
            notification.close();
        };
    }

    // Auto-close after 10 seconds
    setTimeout(() => {
        notification.close();
    }, 10000);

    return notification;
}
