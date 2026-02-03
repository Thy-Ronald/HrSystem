
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
    FormControl
} from '@mui/material';
import { getGithubTimeline, fetchRepositories } from '../services/api';
import TimelineChart from '../components/TimelineChart';
import { AccessTime, Assignment } from '@mui/icons-material';
import useSocket from '../hooks/useSocket';

const TimerDisplay = ({ statusHistory, currentStatus, currentTime }) => {
    const calculateDuration = () => {
        let total = statusHistory.reduce((acc, seg) => {
            if (seg.status === 'In Progress') {
                return acc + (seg.durationMs || 0);
            }
            return acc;
        }, 0);

        // If currently in progress, add time since the last transition
        if (currentStatus === 'In Progress' && statusHistory.length > 0) {
            const lastSegment = statusHistory[statusHistory.length - 1];
            if (lastSegment.status === 'In Progress') {
                const startTime = new Date(lastSegment.startDate).getTime();
                const now = currentTime || Date.now();
                total += Math.max(0, now - startTime);
            }
        }
        return total;
    };

    const duration = calculateDuration();
    const isStopped = ['Local Done', 'Dev Deployed', 'Dev Checked', 'Done'].includes(currentStatus);
    const isPaused = currentStatus === 'Time Up';
    const isActive = currentStatus === 'In Progress';

    const formatDuration = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <Typography variant="body2" sx={{
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: isActive ? '#d32f2f' : (isPaused ? '#f57c00' : (isStopped ? '#4caf50' : 'text.secondary')),
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
        }}>
            {isActive && <CircularProgress size={10} color="inherit" sx={{ mr: 0.5 }} />}
            {isPaused && <span style={{ fontSize: '0.8rem', marginRight: '4px' }}>⏸</span>}
            {formatDuration(duration)}
        </Typography>
    );
};

const GithubAnalytics = () => {
    const [loading, setLoading] = useState(false);
    const [timelineData, setTimelineData] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [repos, setRepos] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
    const [currentTime, setCurrentTime] = useState(Date.now());
    const scrollRef = useRef(null);

    // Default scroll to 10:00 AM
    useEffect(() => {
        if (scrollRef.current && !loading && timelineData.length > 0) {
            // (10 hours / 24 hours) * 1500px = 625px
            scrollRef.current.scrollLeft = 625;
        }
    }, [loading, timelineData]);

    // Central ticker for all timers
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch repositories on mount
    useEffect(() => {
        async function loadRepos() {
            try {
                const repoList = await fetchRepositories();
                setRepos(repoList);
                if (repoList.length > 0) {
                    const defaultRepo = repoList.find(r => r.name === 'sacsys009') || repoList[0];
                    setSelectedRepo(defaultRepo.fullName);
                }
            } catch (err) {
                console.error("Failed to load repos", err);
            }
        }
        loadRepos();
    }, []);

    // Fetch timeline data when repo or date changes
    const fetchData = React.useCallback(async () => {
        if (!selectedRepo) return;
        setLoading(true);
        try {
            const data = await getGithubTimeline(selectedRepo, null, { date: selectedDate });
            setTimelineData(data || []);
        } catch (err) {
            console.error("Failed to fetch timeline", err);
        } finally {
            setLoading(false);
        }
    }, [selectedRepo, selectedDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Setup Socket.IO for real-time updates
    const { subscribe, unsubscribe } = useSocket();

    useEffect(() => {
        const handleGithubUpdate = (payload) => {
            console.log("[Socket] Received GitHub update event:", payload);
            // Refresh if the updated repo matches current selection
            if (payload.repo === selectedRepo) {
                console.log("[Socket] Refreshing data for", selectedRepo);
                fetchData();
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
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mr: 2 }}>
                    GitHub Analytics
                </Typography>

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                        value={selectedRepo}
                        onChange={(e) => setSelectedRepo(e.target.value)}
                        displayEmpty
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
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #c4c4c4',
                        fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
                        fontSize: '1rem',
                        color: '#333',
                        outline: 'none'
                    }}
                />
            </Box>

            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Box ref={scrollRef} sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    <Box sx={{ minWidth: 1950, display: 'flex', flexDirection: 'column' }}>
                        {/* Header Row */}
                        <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', bgcolor: '#f9fafb', position: 'sticky', top: 0, zIndex: 100 }}>
                            <Box sx={{ width: 300, minWidth: 300, p: 2, borderRight: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666', bgcolor: '#f9fafb', position: 'sticky', left: 0, zIndex: 101 }}>
                                Name & Task
                            </Box>
                            <Box sx={{ width: 1500, minWidth: 1500, p: 2, position: 'relative' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.8rem' }}>
                                    {['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'].map(time => (
                                        <Typography key={time} variant="caption" sx={{ width: 0, overflow: 'visible', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                            {time}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>
                            <Box sx={{ width: 150, minWidth: 150, p: 2, borderLeft: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666', bgcolor: '#f9fafb', position: 'sticky', right: 0, zIndex: 101 }}>
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
                                        py: 1, pl: 2,
                                        position: 'sticky', left: 0, right: 0, zIndex: 10
                                    }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                            {userData.user.login}
                                        </Typography>
                                        <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center', pr: 2 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                                Total Assigned P: {userData.totalP || 0}
                                                {(() => {
                                                    const totalP = userData.totalP || 0;
                                                    if (totalP > 0) {
                                                        const finishTime = new Date(Date.now() + totalP * 60000);
                                                        return (
                                                            <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                                                                • Est. Finish: {finishTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {userData.issues.map(issue => (
                                        <Box key={issue.id} sx={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: 60 }}>
                                            <Box sx={{
                                                width: 300,
                                                minWidth: 300,
                                                p: 1.5,
                                                borderRight: '1px solid #e0e0e0',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                bgcolor: '#fff',
                                                position: 'sticky', left: 0, zIndex: 5
                                            }}>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{
                                                        color: '#1a73e8',
                                                        fontWeight: 600,
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer',
                                                        '&:hover': { color: '#174ea6' },
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        mb: 0.5
                                                    }}
                                                    onClick={() => window.open(issue.url, '_blank')}
                                                >
                                                    <Box component="span" sx={{ bgcolor: '#e8f0fe', px: 0.5, borderRadius: 0.5, fontSize: '0.75rem' }}>
                                                        #{issue.number}
                                                    </Box>
                                                    {issue.title}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Assignment sx={{ fontSize: 14, opacity: 0.6 }} />
                                                    P: {issue.pValue} mins
                                                </Typography>
                                            </Box>

                                            <Box sx={{ width: 1500, minWidth: 1500, position: 'relative', borderRight: '1px solid #e0e0e0' }}>
                                                <TimelineChart
                                                    issues={[issue]}
                                                    startDate={chartStart}
                                                    endDate={chartEnd}
                                                />
                                            </Box>

                                            <Box sx={{ width: 150, minWidth: 150, p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fff', borderLeft: '1px solid #f0f0f0', position: 'sticky', right: 0, zIndex: 5 }}>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        display: 'inline-block',
                                                        px: 1,
                                                        py: 0.5,
                                                        bgcolor: issue.currentStatus === 'In Progress' ? '#fff9c4' :
                                                            issue.currentStatus === 'Time Up' ? '#ffe0b2' :
                                                                (['Local Done', 'Dev Deployed', 'Dev Checked'].includes(issue.currentStatus) ? '#e8f5e9' : '#f5f5f5'),
                                                        color: issue.currentStatus === 'In Progress' ? '#fbc02d' :
                                                            issue.currentStatus === 'Time Up' ? '#ef6c00' :
                                                                (['Local Done', 'Dev Deployed', 'Dev Checked'].includes(issue.currentStatus) ? '#2e7d32' : '#757575'),
                                                        borderRadius: 1,
                                                        fontWeight: 'bold',
                                                        fontSize: '0.7rem',
                                                        mb: 0.5,
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {issue.currentStatus}
                                                </Typography>

                                                <TimerDisplay
                                                    statusHistory={issue.statusHistory || []}
                                                    currentStatus={issue.currentStatus}
                                                    currentTime={currentTime}
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
