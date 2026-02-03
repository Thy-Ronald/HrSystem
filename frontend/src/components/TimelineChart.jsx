
import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';

// Status colors matching the image/requirements
const STATUS_COLORS = {
    'Assigned': '#81C784', // Light Green
    'In Progress': '#FFD54F', // Yellow
    'Review': '#2979FF', // Blue scale
    'Local Done': '#CFD8DC', // Grey
    'Dev Deployed': '#64B5F6', // Lighter Blue
    'Dev Checked': '#4DB6AC', // Teal
    'Time Up': '#FFE0B2', // Orange/Amber
    // Fallbacks
    'Done': '#CFD8DC',
    'Unknown': '#E0E0E0'
};

const statusAcronyms = {
    'Assigned': 'A',
    'In Progress': 'IP',
    'Review': 'R',
    'Local Done': 'LD',
    'Dev Deployed': 'DD',
    'Dev Checked': 'DC',
    'Time Up': 'TU',
    'Done': 'D'
};

const TimelineChart = ({ issues, startDate, endDate }) => {
    const chartStart = startDate ? new Date(startDate).getTime() : new Date().setHours(0, 0, 0, 0);
    const chartEnd = endDate ? new Date(endDate).getTime() : new Date().getTime();
    const totalDuration = chartEnd - chartStart;

    // Generate time markers (e.g., every hour or day depending on range)
    // For standard "day" view, stick to hours.
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM? Or full 24h? Image shows 2:00 to 14:00+
    // Let's make it dynamic based on the actual range if possible, or fixed for "Today"

    // Helper to calculate left position percentage
    const getLeft = (time) => {
        const t = new Date(time).getTime();
        const percent = ((t - chartStart) / totalDuration) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    // Helper to calculate width percentage
    const getWidth = (start, end) => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const duration = e - s;
        const percent = (duration / totalDuration) * 100;
        return Math.max(5, percent); // Increased min width (5%) to fit two letters/initials comfortably
    };

    return (
        <Box sx={{ position: 'relative', width: '100%', minHeight: '100%' }}>
            {/* Time Grid Background */}
            <Box sx={{
                display: 'flex',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0
            }}>
                {/* Render grid lines approximately every 10% for now */}
                {[0, 8.33, 16.66, 25, 33.33, 41.66, 50, 58.33, 66.66, 75, 83.33, 91.66, 100].map(p => (
                    <Box
                        key={p}
                        sx={{
                            position: 'absolute',
                            left: `${p}%`,
                            top: 0,
                            bottom: 0,
                            borderLeft: p > 0 ? '1px dashed #E0E0E0' : 'none',
                            zIndex: 0
                        }}
                    />
                ))}
            </Box>

            {/* Issues Timeline */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
                {issues.map(issue => (
                    <Box
                        key={issue.id}
                        sx={{
                            height: 40,
                            mb: 1,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                        }}
                    >
                        {/* Render Status Segments */}
                        {(() => {
                            let lastEndPercent = -1;
                            return issue.statusHistory.map((status, idx) => {
                                // Only render if it overlaps with the chart range
                                const segStart = new Date(status.startDate).getTime();
                                const segEnd = new Date(status.endDate).getTime();

                                if (segEnd < chartStart || segStart > chartEnd) return null;

                                let left = getLeft(Math.max(segStart, chartStart));
                                const width = getWidth(Math.max(segStart, chartStart), Math.min(segEnd, chartEnd));

                                // Collision Prevention: Ensure this segment starts at least where the previous one ended
                                if (left < lastEndPercent) {
                                    left = lastEndPercent;
                                }
                                lastEndPercent = left + width;

                                // Prevent total width from exceeding 100%
                                if (left >= 100) return null;
                                const finalWidth = Math.min(width, 100 - left);

                                const color = STATUS_COLORS[status.status] || STATUS_COLORS['Unknown'];

                                return (
                                    <Tooltip
                                        key={idx}
                                        title={['Local Done', 'Dev Deployed', 'Dev Checked', 'Done', 'Time Up', 'timeUp', 'Time up'].includes(status.status)
                                            ? `${status.status}: ${new Date(status.startDate).toLocaleTimeString()}`
                                            : `${status.status}: ${new Date(status.startDate).toLocaleTimeString()} - ${new Date(status.endDate).toLocaleTimeString()}`}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: `${left}%`,
                                                width: `${finalWidth}%`,
                                                height: 24,
                                                bgcolor: color,
                                                borderRadius: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                px: 0.5,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                fontSize: '0.7rem',
                                                color: '#424242',
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                                zIndex: idx // Higher index for later statuses
                                            }}
                                        >
                                            {finalWidth < 10 ? (statusAcronyms[status.status] || status.status.charAt(0)) : status.status}
                                        </Box>
                                    </Tooltip>
                                );
                            });
                        })()}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default TimelineChart;
