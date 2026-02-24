/**
 * interface for the processed Timeline Response from /api/timeline/:userId/:dateKey
 */

export interface TimelineActivity {
    app: string;
    start: string; // ISO 8601 timestamp
    end: string;   // ISO 8601 timestamp
    durationMs: number;
    title?: string;
    description?: string;
    details?: string;
}

export interface TopApp {
    name: string;
    totalMs: number;
    percentage: number; // calculated relative to totalActiveMs
}

export interface TimelineDataResponse {
    userId: string;
    dateKey: string; // YYYY-MM-DD
    activityLogs: {
        activities: TimelineActivity[];
        topApps: TopApp[];
        totalActiveMs: number;
    };
    screenshots: {
        images: {
            url: string;
            timestamp: string; // ISO 8601
        }[];
    };
}
