
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Select,
    MenuItem,
    CircularProgress,
    Avatar,
    Divider,
    FormControl,
    Tooltip
} from '@mui/material';
import { useGithub } from '../contexts/GithubContext';
import TimelineChart from '../components/TimelineChart';
import { AccessTime, Assignment } from '@mui/icons-material';
import useSocket from '../hooks/useSocket';
import { STATUS_COLORS } from '../constants/github';
import TimerDisplay from '../components/TimerDisplay';

const GithubAnalytics = () => {
    // Connect to context
    const {
        timelineData,
        selectedRepo,
        setSelectedRepo,
        repos,
        selectedDate,
        setSelectedDate,
        loading,
        fetchData,
        initialFetchDone
    } = useGithub();

    const [currentTime, setCurrentTime] = useState(Date.now());
    const scrollRef = useRef(null);

    // Default scroll to 10:00 AM on load
    useEffect(() => {
        if (scrollRef.current && !loading && timelineData.length > 0) {
            // (10 hours / 24 hours) * 2400px = 1000px
            scrollRef.current.scrollLeft = 1000;
        }
    }, [loading, timelineData.length]); // Only reset on data structure change

    // Central ticker for all timers
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Initial fetch if needed
    useEffect(() => {
        if (!initialFetchDone && selectedRepo) {
            fetchData();
        }
    }, [selectedRepo, selectedDate, fetchData, initialFetchDone]);

    // Setup Socket.IO for real-time updates
    const { subscribe, unsubscribe } = useSocket();

    useEffect(() => {
        const handleGithubUpdate = (payload) => {
            console.log("[Socket] Received GitHub update event:", payload);
            // Refresh if the updated repo matches current selection
            if (payload.repo === selectedRepo) {
                console.log("[Socket] Refreshing data for", selectedRepo);
                fetchData(true); // Force refresh
            }
        };

        subscribe('github:repo-updated', handleGithubUpdate);
        return () => unsubscribe('github:repo-updated', handleGithubUpdate);
    }, [selectedRepo, subscribe, unsubscribe, fetchData]);


    const getChartRange = () => {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const { start: chartStart, end: chartEnd } = getChartRange();

    return (
        <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1, color: '#333' }}>
                    GitHub Analytics
                </Typography>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        displayEmpty
                        sx={{ height: 32, fontSize: '0.85rem' }}
                    >
                        {repos.map(repo => (
                            <MenuItem key={repo.fullName} value={repo.fullName}>
                                {repo.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #c4c4c4',
                        fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                        fontSize: '0.85rem',
                        color: '#333',
                        outline: 'none',
                        height: '32px',
                        boxSizing: 'border-box'
                    }}
                />
            </Box>

            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box ref={scrollRef} sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    <Box sx={{ minWidth: 2900, display: 'flex', flexDirection: 'column' }}>
                        {/* Header Row */}
                        <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', bgcolor: '#f9fafb', position: 'sticky', top: 0, zIndex: 100, height: 32 }}>
                            <Box sx={{ width: 350, minWidth: 350, px: 1, display: 'flex', alignItems: 'center', borderRight: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666', bgcolor: '#f9fafb', position: 'sticky', left: 0, zIndex: 101, fontSize: '0.75rem' }}>
                                Name & Task
                            </Box>
                            <Box sx={{ width: 2400, minWidth: 2400, px: 2, display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', color: '#999', fontSize: '0.75rem' }}>
                                    {Array.from({ length: 25 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => (
                                        <Typography key={time} variant="caption" sx={{ width: 0, overflow: 'visible', whiteSpace: 'nowrap', textAlign: 'center', fontSize: '0.7rem' }}>
                                            {time}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>
                            <Box sx={{ width: 150, minWidth: 150, px: 1, display: 'flex', alignItems: 'center', borderLeft: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666', bgcolor: '#f9fafb', position: 'sticky', right: 0, zIndex: 101, fontSize: '0.75rem' }}>
                                Details
                            </Box>
                        </Box>

                        <Box sx={{ flexGrow: 1 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                                    <CircularProgress />
                                </Box>
                            ) : timelineData.map(userData => (
                                <Box key={userData.user.login} sx={{ mb: 0 }}>
                                    <Box sx={{
                                        display: 'flex',
                                        bgcolor: '#f5f5f5',
                                        borderBottom: '1px solid #e0e0e0',
                                        height: 32, alignItems: 'center',
                                        position: 'relative'
                                    }}>
                                        <Box sx={{
                                            position: 'sticky',
                                            left: 0,
                                            zIndex: 10,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            bgcolor: '#f5f5f5',
                                            py: 0.5, pl: 1, pr: 2,
                                            width: 'fit-content'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Avatar
                                                    src={userData.user.avatarUrl || userData.user.avatar_url}
                                                    sx={{ width: 14, height: 14 }}
                                                >
                                                    {userData.user.login[0]}
                                                </Avatar>
                                                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                    {userData.user.login} | Today 0/0 min | Today total p: {userData.totalP || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {userData.issues.map(issue => (
                                        <Box key={issue.id} sx={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: 40 }}>
                                            <Box sx={{
                                                width: 350,
                                                minWidth: 350,
                                                px: 1,
                                                py: 0.5,
                                                borderRight: '1px solid #e0e0e0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                bgcolor: '#fff',
                                                position: 'sticky', left: 0, zIndex: 5
                                            }}>
                                                <Tooltip title={issue.title} arrow placement="top-start">
                                                    <Typography
                                                        variant="caption"
                                                        noWrap
                                                        sx={{
                                                            color: '#1a73e8',
                                                            fontWeight: 600,
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            '&:hover': { color: '#174ea6' },
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            textTransform: 'none'
                                                        }}
                                                        onClick={() => window.open(issue.url, '_blank')}
                                                    >
                                                        <Box component="span" sx={{ color: '#1a73e8', opacity: 0.7, mr: 0.5 }}>
                                                            {issue.title.split(' ')[0]}
                                                        </Box>
                                                        <Box component="span" sx={{ color: '#1a73e8', opacity: 0.7, mr: 0.5 }}>
                                                            #{issue.number}
                                                        </Box>
                                                        <Box component="span" sx={{ color: '#333', fontSize: '0.72rem' }}>
                                                            {issue.title.split(' ').slice(1).join(' ')}
                                                        </Box>
                                                    </Typography>
                                                </Tooltip>
                                            </Box>

                                            <Box sx={{ width: 2400, minWidth: 2400, position: 'relative', borderRight: '1px solid #e0e0e0' }}>
                                                <TimelineChart
                                                    issues={[issue]}
                                                    startDate={chartStart}
                                                    endDate={chartEnd}
                                                />
                                            </Box>

                                            <Box sx={{ width: 150, minWidth: 150, p: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', borderLeft: '1px solid #f0f0f0', position: 'sticky', right: 0, zIndex: 5 }}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: 'inline-block',
                                                        width: '90%',
                                                        textAlign: 'center',
                                                        py: 0.2,
                                                        bgcolor: STATUS_COLORS[issue.currentStatus] || STATUS_COLORS['Unknown'],
                                                        color: ['In Progress', 'Assigned', 'Time Up'].includes(issue.currentStatus) ? '#424242' : '#fff',
                                                        borderRadius: '2px',
                                                        fontWeight: 'bold',
                                                        fontSize: '0.65rem',
                                                        mb: 0.2,
                                                        textTransform: 'none'
                                                    }}
                                                >
                                                    {issue.currentStatus}
                                                </Typography>

                                                <TimerDisplay
                                                    statusHistory={issue.statusHistory || []}
                                                    currentStatus={issue.currentStatus}
                                                    currentTime={currentTime}
                                                    pValue={issue.pValue}
                                                />
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ))}

                            {!loading && timelineData.length === 0 && (
                                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                    No activity found for this period.
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default GithubAnalytics;
