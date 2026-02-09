
import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { STATUS_COLORS } from '../constants/github';



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
        return Math.max(3, percent); // Reduced min width to fit smaller rows
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
                {/* Render hourly grid lines */}
                {Array.from({ length: 25 }, (_, i) => (i / 24) * 100).map(p => (
                    <Box
                        key={p}
                        sx={{
                            position: 'absolute',
                            left: `${p}%`,
                            top: 0,
                            bottom: 0,
                            borderLeft: p > 0 ? '1px dashed #F0F0F0' : 'none',
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
                            minHeight: 50,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-start',
                            paddingTop: '6px',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' }
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
                                // width: 'fit-content' with min-width to ensure visibility
                                const width = 5.0; // Slightly increased fixed width to fit full text in high-density view

                                // Collision Prevention: Ensure this segment starts at least where the previous one ended
                                if (left < lastEndPercent) {
                                    left = lastEndPercent;
                                }
                                lastEndPercent = left + width;

                                // Prevent total width from exceeding 100%
                                if (left >= 100) return null;
                                const finalWidth = Math.min(width, 100 - left);

                                const color = STATUS_COLORS[status.status] || STATUS_COLORS['Unknown'];

                                // Format timestamp
                                const startTime = new Date(status.startDate).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                });

                                return (
                                    <Box
                                        key={idx}
                                        sx={{
                                            position: 'absolute',
                                            left: `${left}%`,
                                            width: `${finalWidth}%`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            zIndex: idx // Higher index for later statuses
                                        }}
                                    >
                                        <Tooltip title={`${status.status}: ${startTime}`}>
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: 18,
                                                    bgcolor: color,
                                                    borderRadius: 0.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    px: 0.5,
                                                    fontSize: '0.6rem',
                                                    color: '#424242',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {status.status}
                                            </Box>
                                        </Tooltip>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: '0.55rem',
                                                color: '#666',
                                                marginTop: '2px',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {startTime}
                                        </Typography>
                                    </Box>
                                );
                            });
                        })()}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

// Memoize component to prevent unnecessary re-renders
// Only re-render when issues, startDate, or endDate change
export default React.memo(TimelineChart);
