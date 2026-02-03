
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
    // Fallbacks
    'Done': '#CFD8DC',
    'Unknown': '#E0E0E0'
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
        return Math.max(0.5, percent); // Min width for visibility
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
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => (
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
                        {issue.statusHistory.map((status, idx) => {
                            // Only render if it overlaps with the chart range
                            const segStart = new Date(status.startDate).getTime();
                            const segEnd = new Date(status.endDate).getTime();

                            if (segEnd < chartStart || segStart > chartEnd) return null;

                            const left = getLeft(Math.max(segStart, chartStart));
                            const width = getWidth(Math.max(segStart, chartStart), Math.min(segEnd, chartEnd));

                            const color = STATUS_COLORS[status.status] || STATUS_COLORS['Unknown'];

                            return (
                                <Tooltip
                                    key={idx}
                                    title={`${status.status}: ${new Date(status.startDate).toLocaleTimeString()} - ${new Date(status.endDate).toLocaleTimeString()}`}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: `${left}%`,
                                            width: `${width}%`,
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
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {width > 5 && status.status} {/* Only show text if wide enough */}
                                    </Box>
                                </Tooltip>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default TimelineChart;
