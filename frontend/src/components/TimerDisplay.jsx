import React from 'react';
import { Typography, CircularProgress } from '@mui/material';

const TimerDisplay = ({ statusHistory, currentStatus, currentTime, pValue }) => {
    const calculateDuration = () => {
        // Sum all completed "In Progress" segments from the history
        let total = statusHistory.reduce((acc, seg, idx) => {
            // Only add duration for 'In Progress' segments that are NOT the current/active one
            if (seg.status === 'In Progress' && idx < statusHistory.length - 1) {
                return acc + (seg.durationMs || 0);
            }
            return acc;
        }, 0);

        // If CURRENT status is "In Progress", add the live ticking duration from the latest segment
        if (currentStatus === 'In Progress' && statusHistory.length > 0) {
            const lastSegment = statusHistory[statusHistory.length - 1];
            if (lastSegment.status === 'In Progress') {
                const startTime = new Date(lastSegment.startDate).getTime();
                const now = currentTime || Date.now();
                total += Math.max(0, now - startTime);
            }
        } else {
            // If NOT "In Progress" (e.g., Paused/Time Up or Stopped/Done), 
            // check if the LAST segment was an "In Progress" segment and add its fixed duration
            const lastSegment = statusHistory[statusHistory.length - 1];
            if (lastSegment && lastSegment.status === 'In Progress') {
                total += (lastSegment.durationMs || 0);
            }
        }
        return total;
    };

    const duration = calculateDuration();
    const isStopped = ['Local Done', 'Dev Deployed', 'Dev Checked', 'Done'].includes(currentStatus);
    const isPaused = currentStatus === 'Time Up';
    const isActive = currentStatus === 'In Progress';

    // 1 P = 1 minute
    const estimateMs = (pValue || 0) * 60 * 1000;
    const isExceeded = estimateMs > 0 && duration > estimateMs;

    const formatDuration = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <Typography variant="caption" sx={{
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: '0.65rem',
            color: isExceeded ? '#d32f2f' : (isActive ? '#1a73e8' : (isPaused ? '#f57c00' : (isStopped ? '#4caf50' : 'text.secondary'))),
            display: 'flex',
            alignItems: 'center',
            gap: 0.3
        }}>
            {isActive && <CircularProgress size={8} color="inherit" sx={{ mr: 0.3 }} />}
            {isPaused && <span style={{ fontSize: '0.65rem', marginRight: '2px' }}>⏸</span>}
            {formatDuration(duration)}
        </Typography>
    );
};

export default TimerDisplay;
