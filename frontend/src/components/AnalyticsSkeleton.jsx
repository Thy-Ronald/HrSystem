import React from 'react';
import { Box, Paper } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';

const AnalyticsSkeleton = () => {
    const { activeMode } = useTheme();
    const isDark = activeMode === 'dark';

    // Staff ranking uses: bg-[#e8eaed] for light, and bg-[#f1f3f4] for cells. 
    // We'll adapt this for MUI + Dark mode support.
    const skeletonBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f3f4';
    const headerBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e8eaed';

    return (
        <Box sx={{
            position: 'absolute',
            top: 32, // Matches header height
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.paper',
            zIndex: 10,
            overflow: 'hidden'
        }}>
            <Box sx={{ minWidth: 3000, display: 'flex', flexDirection: 'column' }}>
                {/* Skeleton Rows */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <Box key={i} sx={{
                        display: 'flex',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        height: 40,
                        alignItems: 'center'
                    }}>
                        {/* Name Column Skeleton */}
                        <Box sx={{
                            width: 350,
                            minWidth: 350,
                            px: 1,
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'background.paper',
                            zIndex: 2
                        }}>
                            <Box className="animate-pulse" sx={{
                                height: 16,
                                width: '80%',
                                bgcolor: skeletonBg,
                                borderRadius: '4px'
                            }} />
                        </Box>

                        {/* Timeline Column Skeleton */}
                        <Box sx={{ width: 2400, minWidth: 2400, px: 2, position: 'relative' }}>
                            <Box className="animate-pulse" sx={{
                                height: 12,
                                width: '100%',
                                bgcolor: skeletonBg,
                                borderRadius: '2px',
                                opacity: 0.5
                            }} />
                        </Box>

                        {/* Details Column Skeleton */}
                        <Box sx={{
                            width: 150,
                            minWidth: 150,
                            px: 1,
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                            position: 'sticky',
                            right: 100,
                            bgcolor: 'background.paper',
                            zIndex: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            alignItems: 'center'
                        }}>
                            <Box className="animate-pulse" sx={{
                                height: 12,
                                width: '60%',
                                bgcolor: skeletonBg,
                                borderRadius: '2px'
                            }} />
                            <Box className="animate-pulse" sx={{
                                height: 10,
                                width: '40%',
                                bgcolor: skeletonBg,
                                borderRadius: '2px'
                            }} />
                        </Box>

                        {/* Evidence Column Skeleton */}
                        <Box sx={{
                            width: 100,
                            minWidth: 100,
                            px: 1,
                            borderLeft: '1px solid',
                            borderColor: 'divider',
                            position: 'sticky',
                            right: 0,
                            bgcolor: 'background.paper',
                            zIndex: 2,
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <Box className="animate-pulse" sx={{
                                height: 24,
                                width: 50,
                                bgcolor: skeletonBg,
                                borderRadius: '4px'
                            }} />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default AnalyticsSkeleton;
