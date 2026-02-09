/**
 * GitHub Service Utilities & Constants
 */

// Pre-compiled regex for P-value extraction
const P_VALUE_REGEX = /P\s*[:\s\-=\(]*\s*(\d+(?:\.\d+)?)\s*\)?/gi;

// Status mapping configuration
const STATUS_LABELS = {
    'In Progress': 'In Progress',
    'Review': 'Review',
    'Local Done': 'Local Done',
    'Dev Deployed': 'Dev Deployed',
    'Dev Checked': 'Dev Checked',
    'Time Up': 'Time Up'
};

const STATUS_PRIORITY_ORDER = [
    'Dev Checked',
    'Dev Deployed',
    'Local Done',
    'Time Up',
    'Review',
    'In Progress'
];

/**
 * Map file extensions to programming languages
 */
const LANGUAGE_MAP = {
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'sh': 'Shell',
    'bash': 'Shell',
    'sql': 'SQL',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'SASS',
    'vue': 'Vue',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'dockerfile': 'Dockerfile',
    'tf': 'Terraform',
    'hcl': 'Terraform',
};

/**
 * Help map label names to canonical status names
 */
const mapLabelToStatus = (name) => {
    const n = name.toLowerCase();
    if (n.includes('in progress')) return 'In Progress';
    if (n.includes('review')) return 'Review';
    if (n.includes('local done')) return 'Local Done';
    if (n.includes('dev deployed')) return 'Dev Deployed';
    if (n.includes('dev checked')) return 'Dev Checked';
    if (n.includes('time up') || n.includes('time-up')) return 'Time Up';
    return null;
};

/**
 * Extract P value from issue title or body/description
 */
function extractPValue(text) {
    if (!text || typeof text !== 'string') return 0;
    let sum = 0;
    let match;
    P_VALUE_REGEX.lastIndex = 0;
    while ((match = P_VALUE_REGEX.exec(text)) !== null) {
        if (match[1]) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
                sum += value;
            }
        }
    }
    return sum;
}

/**
 * Calculate date range based on filter type
 */
function getDateRange(filter) {
    const now = new Date();
    let startDate, endDate;

    if (filter && filter.startsWith('month-')) {
        const parts = filter.split('-');
        if (parts.length === 3) {
            const month = parseInt(parts[1]) - 1;
            const year = parseInt(parts[2]);
            startDate = new Date(year, month, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            return { startDate, endDate };
        }
    }

    switch (filter) {
        case 'yesterday': {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case 'this-week': {
            startDate = new Date(now);
            const dayOfWeek = startDate.getDay();
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate.setDate(startDate.getDate() - diff);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case 'last-week': {
            startDate = new Date(now);
            const currentDayOfWeek = startDate.getDay();
            const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
            startDate.setDate(startDate.getDate() - diffToMonday - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case 'this-month': {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
        case 'today':
        default: {
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        }
    }
    return { startDate, endDate };
}

/**
 * Get language from file path
 */
function getLanguageFromFile(filename) {
    if (!filename) return null;
    const ext = filename.split('.').pop().toLowerCase();
    return LANGUAGE_MAP[ext] || null;
}

/**
 * Extract evidence from issue body or comments
 * Evidence is identified by the marker "[ EVIDENCE ]" or "[ Evidence ]" (case-insensitive)
 * Returns all text after the marker, or null if not found
 * Checks issue body first, then comments (newest first)
 */
function extractEvidence(issueBody, comments) {
    // Case-insensitive regex to match [ EVIDENCE ] or [ Evidence ] or any case variation
    const evidenceRegex = /\[\s*evidence\s*\]/i;

    // First check the issue body/description
    if (issueBody) {
        const match = issueBody.match(evidenceRegex);
        if (match) {
            const markerIndex = match.index;
            const markerLength = match[0].length;
            const evidence = issueBody.substring(markerIndex + markerLength).trim();
            if (evidence) {
                return evidence;
            }
        }
    }

    // Then check comments in reverse order (newest first)
    if (comments && Array.isArray(comments)) {
        for (let i = comments.length - 1; i >= 0; i--) {
            const comment = comments[i];
            const body = comment?.body || '';
            const match = body.match(evidenceRegex);

            if (match) {
                const markerIndex = match.index;
                const markerLength = match[0].length;
                const evidence = body.substring(markerIndex + markerLength).trim();
                if (evidence) {
                    return evidence;
                }
            }
        }
    }

    return null;
}

module.exports = {
    P_VALUE_REGEX,
    STATUS_LABELS,
    STATUS_PRIORITY_ORDER,
    LANGUAGE_MAP,
    mapLabelToStatus,
    extractPValue,
    getDateRange,
    getLanguageFromFile,
    extractEvidence
};
