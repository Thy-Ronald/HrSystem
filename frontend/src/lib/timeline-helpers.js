export const START_HOUR = 7;
export const END_HOUR = 19;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export const CATEGORY_MAP = {
    'VS Code': { category: 'Coding', color: '#3b82f6' },
    'Cursor': { category: 'Coding', color: '#3b82f6' },
    'WebStorm': { category: 'Coding', color: '#3b82f6' },
    'IntelliJ': { category: 'Coding', color: '#3b82f6' },
    'Chrome': { category: 'Browsing', color: '#f59e0b' },
    'Firefox': { category: 'Browsing', color: '#f59e0b' },
    'Safari': { category: 'Browsing', color: '#f59e0b' },
    'Slack': { category: 'Social', color: '#ec4899' },
    'Discord': { category: 'Social', color: '#ec4899' },
    'Meeting': { category: 'Meeting', color: '#10b981' },
    'Zoom': { category: 'Meeting', color: '#10b981' },
    'Teams': { category: 'Meeting', color: '#10b981' },
    'Outlook': { category: 'Email', color: '#8b5cf6' },
    'Gmail': { category: 'Email', color: '#8b5cf6' },
    'Antigravity': { category: 'Other', color: '#6366f1' },
    'Default': { category: 'Other', color: '#64748b' }
};

/**
 * Gets category and color mapping for an application name
 * @param {string} app - Application name
 * @returns {{category: string, color: string}}
 */
export const getAppData = (app) => {
    const normalizedApp = app?.toLowerCase() || '';
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (normalizedApp.includes(key.toLowerCase())) return val;
    }
    return CATEGORY_MAP['Default'];
};

/**
 * Calculates the percentage position based on a timestamp within the timeline bounds
 * @param {string|number|Date} timestamp - The timestamp to position
 * @returns {number} Percentage from 0 to 100
 */
export const getTimePosition = (timestamp) => {
    const time = new Date(timestamp);
    const hour = time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 3600;
    return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
};

/**
 * Generates time labels for the timeline header
 * @returns {Array<{label: string, pos: number}>}
 */
export const generateTimeLabels = () => {
    const labels = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hours = h > 12 ? h - 12 : h === 0 ? 12 : h;
        labels.push({
            label: `${hours} ${ampm}`,
            pos: ((h - START_HOUR) / TOTAL_HOURS) * 100
        });
    }
    return labels;
};
