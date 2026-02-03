
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Select,
    MenuItem,
    CircularProgress,
    Avatar,
    Divider,
    FormControl,
    Card
} from '@mui/material';
import { getGithubTimeline, fetchRepositories } from '../services/api';
import TimelineChart from '../components/TimelineChart';
import { AccessTime, Assignment } from '@mui/icons-material';

const TimerDisplay = ({ statusHistory, currentStatus }) => {
    // Calculate initial duration
    const calculateDuration = () => {
        return statusHistory.reduce((acc, seg) => {
            if (seg.status === 'In Progress') {
                return acc + (seg.durationMs || 0);
            }
            return acc;
        }, 0);
    };

    const [duration, setDuration] = useState(calculateDuration());

    useEffect(() => {
        // If currently in progress, tick
        if (currentStatus === 'In Progress') {
            const interval = setInterval(() => {
                setDuration(d => d + 1000);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [currentStatus]);

    // Update if history changes (e.g. data refresh)
    useEffect(() => {
        setDuration(calculateDuration());
    }, [statusHistory]);

    const formatDuration = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${h}h ${m}m ${s}s`;
    };

    const isStopped = ['Local Done', 'Dev Deployed', 'Dev Checked', 'Done'].includes(currentStatus);
    const isActive = currentStatus === 'In Progress';

    return (
        <Typography variant="body2" sx={{
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: isActive ? '#d32f2f' : (isStopped ? '#4caf50' : 'text.secondary'),
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
        }}>
            {isActive && <CircularProgress size={10} color="inherit" sx={{ mr: 0.5 }} />}
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

    // Fetch repositories on mount
    useEffect(() => {
        async function loadRepos() {
            try {
                const repoList = await fetchRepositories();
                setRepos(repoList);
                // Default to first repo if available
                if (repoList.length > 0) {
                    // Prefer tracking specific repos from the context if known, or just the first
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
    useEffect(() => {
        if (!selectedRepo) return;

        async function fetchData() {
            setLoading(true);
            try {
                // Pass date specific option
                const data = await getGithubTimeline(selectedRepo, null, { date: selectedDate });
                console.log("[DEBUG Analytics] Received data from backend:", data);
                setTimelineData(data || []);
            } catch (err) {
                console.error("Failed to fetch timeline", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedRepo, selectedDate]);

    // Calculate chart boundaries based on selected date
    const getChartRange = () => {
        const start = new Date(selectedDate);
        start.setHours(8, 0, 0, 0); // Start at 8 AM
        const end = new Date(selectedDate);
        end.setHours(20, 0, 0, 0); // End at 8 PM, or later if needed?

        // If current day, maybe clamp to now? 
        // User wants to see P assignment visualization, usually bounded by workday.

        return { start, end };
    };

    const { start: chartStart, end: chartEnd } = getChartRange();

    return (
        <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mr: 2 }}>
                    GitHub Analytics <span style={{ fontSize: '12px', color: '#ff4444' }}>(v1.3_DEBUG)</span>
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

                {/* Date Picker */}
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

            {/* Main Content - Gantt Chart Style */}
            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0' }}>

                {/* Header Row */}
                <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', bgcolor: '#f9fafb' }}>
                    <Box sx={{ width: 300, p: 2, borderRight: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666' }}>
                        Name & Task
                    </Box>
                    <Box sx={{ flexGrow: 1, p: 2, position: 'relative' }}>
                        {/* Render Time Markers */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '0.8rem' }}>
                            <Typography variant="caption">08:00</Typography>
                            <Typography variant="caption">10:00</Typography>
                            <Typography variant="caption">12:00</Typography>
                            <Typography variant="caption">14:00</Typography>
                            <Typography variant="caption">16:00</Typography>
                            <Typography variant="caption">18:00</Typography>
                            <Typography variant="caption">20:00</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ width: 150, p: 2, borderLeft: '1px solid #e0e0e0', fontWeight: 'bold', color: '#666' }}>
                        Details
                    </Box>
                </Box>

                {/* Scrollable Content */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                            <CircularProgress />
                        </Box>
                    ) : timelineData.map(userData => (
                        <Box key={userData.user.login} sx={{ mb: 0 }}>
                            {/* User Header Row */}
                            <Box sx={{
                                display: 'flex',
                                bgcolor: '#f5f5f5',
                                borderBottom: '1px solid #e0e0e0',
                                py: 1, pl: 2
                            }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {userData.user.login}
                                </Typography>
                                <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                                        Total Tasks: {userData.issues.length}
                                    </Typography>
                                    <Typography variant="caption" sx={{
                                        bgcolor: '#e3f2fd',
                                        color: '#1565c0',
                                        px: 1, py: 0.5,
                                        borderRadius: 1,
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5
                                    }}>
                                        Total Assigned P: {userData.totalP || 0}
                                        {(() => {
                                            const totalP = userData.totalP || 0;
                                            if (totalP > 0) {
                                                const isToday = selectedDate === new Date().toISOString().split('T')[0];
                                                const startTime = new Date(selectedDate);
                                                startTime.setHours(8, 0, 0, 0); // Default start 8 AM

                                                // Use current time if today and it's after 8 AM
                                                const now = new Date();
                                                const calculationStart = (isToday && now > startTime) ? now : startTime;

                                                const finishTime = new Date(calculationStart.getTime() + totalP * 60000);
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

                            {/* Issues Rows - One row per issue */}
                            {userData.issues.map(issue => (
                                <Box key={issue.id} sx={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: 60 }}>
                                    <Box sx={{
                                        width: 300,
                                        p: 1.5,
                                        borderRight: '1px solid #e0e0e0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{
                                                color: '#1a73e8',
                                                fontWeight: 600,
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
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
                                        <Typography variant="caption" sx={{
                                            color: issue.pValue === 0 ? '#ff0000' : 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            fontWeight: issue.pValue === 0 ? 'bold' : 'normal',
                                            bgcolor: issue.pValue === 0 ? 'rgba(255,0,0,0.1)' : 'transparent',
                                            px: 0.5,
                                            borderRadius: 0.5
                                        }}>
                                            <Assignment sx={{ fontSize: 14, opacity: 0.6 }} />
                                            P: {issue.pValue} mins {issue.pValue === 0 ? '(NOT DETECTED)' : ''}
                                        </Typography>
                                    </Box>

                                    {/* Timeline for this issue */}
                                    <Box sx={{ flexGrow: 1, position: 'relative', borderRight: '1px solid #e0e0e0' }}>
                                        <TimelineChart
                                            issues={[issue]}
                                            startDate={chartStart}
                                            endDate={chartEnd}
                                        />
                                    </Box>

                                    <Box sx={{ width: 150, p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        {/* Status Chip */}
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: 'inline-block',
                                                px: 1,
                                                py: 0.5,
                                                bgcolor: '#f5f5f5',
                                                color: '#666',
                                                borderRadius: 1,
                                                fontWeight: 'bold',
                                                fontSize: '0.7rem',
                                                mb: 0.5,
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {issue.currentStatus}
                                        </Typography>

                                        {/* Duration Timer */}
                                        <TimerDisplay
                                            statusHistory={issue.statusHistory}
                                            currentStatus={issue.currentStatus}
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
            </Paper >
        </Box >
    );
};

export default GithubAnalytics;
