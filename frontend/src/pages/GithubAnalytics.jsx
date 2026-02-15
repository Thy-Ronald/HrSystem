

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
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
    Tooltip,
    Button
} from '@mui/material';
import { getGithubTimeline, fetchRepositories } from '../services/api';
import TimelineChart from '../components/TimelineChart';
import { AccessTime } from '@mui/icons-material';
import useSocket from '../hooks/useSocket';
import { STATUS_COLORS } from '../constants/github';
import TimerDisplay from '../components/TimerDisplay';
import { Github } from 'lucide-react';
import EvidenceModal from '../components/EvidenceModal';
import { useTheme } from '../contexts/ThemeContext';
import GithubErrorBanner from '../components/GithubErrorBanner';
import AnalyticsSkeleton from '../components/AnalyticsSkeleton';



const GithubAnalytics = ({ onNavigate }) => {
    const { activeMode } = useTheme();
    const [selectedDate, setSelectedDate] = useState(() => {
        return localStorage.getItem('github_analytics_selected_date') || new Date().toISOString().split('T')[0];
    }); // YYYY-MM-DD
    const [currentTime, setCurrentTime] = useState(Date.now());
    const scrollRef = useRef(null);

    // Evidence modal state
    const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [selectedIssueTitle, setSelectedIssueTitle] = useState('');

    // Fetch repositories with React Query
    const { data: repos = [], isLoading: reposLoading } = useQuery({
        queryKey: ['repositories'],
        queryFn: fetchRepositories,
        staleTime: 10 * 60 * 1000,
    });

    // Fetch timeline data for ALL repositories in parallel
    const timelineQueries = useQueries({
        queries: repos.map(repo => ({
            queryKey: ['timeline', repo.fullName, selectedDate],
            queryFn: () => getGithubTimeline(repo.fullName, null, { date: selectedDate }),
            staleTime: 5 * 60 * 1000,
        }))
    });

    const loading = timelineQueries.some(q => q.isLoading);
    const apiError = timelineQueries.find(q => q.error)?.error;
    const isAuthError = apiError && (apiError.status === 401 || apiError.status === 403);
    const reposData = timelineQueries.map(q => q.data).filter(Boolean);
    // Merge timeline data from all repositories by user login
    const timelineData = useMemo(() => {
        const userMap = new Map();

        reposData.forEach(repoTimeline => {
            if (!Array.isArray(repoTimeline)) return;

            repoTimeline.forEach(userData => {
                const login = userData.user.login;
                if (!userMap.has(login)) {
                    userMap.set(login, {
                        ...userData,
                        issues: [...userData.issues]
                    });
                } else {
                    const existing = userMap.get(login);
                    // Add issues from this repo if not already present (should be unique across repos)
                    existing.issues = [...existing.issues, ...userData.issues];
                    existing.totalP = (existing.totalP || 0) + (userData.totalP || 0);
                }
            });
        });

        return Array.from(userMap.values());
    }, [reposData]);

    // Default scroll to 10:00 AM
    useEffect(() => {
        if (scrollRef.current && !loading && timelineData.length > 0) {
            scrollRef.current.scrollLeft = 1000;
        }
    }, [loading, timelineData.length]);

    // Central ticker for all timers
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);


    // Setup Socket.IO for real-time updates
    const { subscribe, unsubscribe } = useSocket();

    // Memoize socket event handler with 5-minute cooldown
    // Prevents re-fetching 15 pages of GraphQL every time the backend detects a change
    const lastRefreshRef = useRef(0);
    const handleGithubUpdate = useCallback((payload) => {
        const now = Date.now();
        const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        if (now - lastRefreshRef.current < COOLDOWN_MS) {
            console.log("[Socket] GitHub update received but cooldown active, skipping refresh");
            return;
        }
        lastRefreshRef.current = now;
        console.log("[Socket] Received GitHub update event:", payload);
        queryClient.invalidateQueries({ queryKey: ['timeline', payload.repo] });
    }, []);

    useEffect(() => {
        subscribe('github:repo-updated', handleGithubUpdate);
        return () => unsubscribe('github:repo-updated', handleGithubUpdate);
    }, [subscribe, unsubscribe, handleGithubUpdate]);

    // Memoize chart range calculation to avoid recalculating on every render
    const { chartStart, chartEnd } = useMemo(() => {
        const start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
        return { chartStart: start, chartEnd: end };
    }, [selectedDate]);

    // Persist selected date
    useEffect(() => {
        localStorage.setItem('github_analytics_selected_date', selectedDate);
    }, [selectedDate]);

    return (
        <Box sx={{ p: 2, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.paper' }}>
            <Box sx={{ mb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mr: 1, color: 'text.primary' }}>
                    GitHub Analytics
                </Typography>

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
                        color: activeMode === 'dark' ? '#f1f5f9' : '#333',
                        backgroundColor: activeMode === 'dark' ? '#1e293b' : '#fff',
                        outline: 'none',
                        height: '32px',
                        boxSizing: 'border-box'
                    }}
                />
            </Box>

            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: 'background.paper' }}>
                <Box ref={scrollRef} sx={{ flexGrow: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    <Box sx={{ minWidth: 3000, display: 'flex', flexDirection: 'column' }}>
                        {/* Header Row */}
                        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default', position: 'sticky', top: 0, zIndex: 100, height: 32 }}>
                            <Box sx={{ width: 350, minWidth: 350, px: 1, display: 'flex', alignItems: 'center', borderRight: '1px solid', borderColor: 'divider', fontWeight: 'bold', color: 'text.secondary', bgcolor: 'background.default', position: 'sticky', left: 0, zIndex: 101, fontSize: '0.75rem' }}>
                                Name & Task
                            </Box>
                            <Box sx={{ width: 2400, minWidth: 2400, px: 2, display: 'flex', alignItems: 'center', position: 'relative' }}>
                                {/* Timeline column - no time markers */}
                            </Box>
                            <Box sx={{ width: 150, minWidth: 150, px: 1, display: 'flex', alignItems: 'center', borderLeft: '1px solid', borderColor: 'divider', fontWeight: 'bold', color: 'text.secondary', bgcolor: 'background.default', position: 'sticky', right: 100, zIndex: 101, fontSize: '0.75rem' }}>
                                Details
                            </Box>
                            <Box sx={{ width: 100, minWidth: 100, px: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid', borderColor: 'divider', fontWeight: 'bold', color: 'text.secondary', bgcolor: 'background.default', position: 'sticky', right: 0, zIndex: 101, fontSize: '0.75rem' }}>
                                Evidence
                            </Box>
                        </Box>

                        <Box sx={{ flexGrow: 1 }}>
                            {timelineData.map(userData => (
                                <Box key={userData.user.login} sx={{ mb: 0 }}>
                                    <Box sx={{
                                        display: 'flex',
                                        bgcolor: 'background.default',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
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
                                            bgcolor: 'background.default',
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
                                                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'text.primary' }}>
                                                    {userData.user.login} | Today 0/0 min | Today total p: {userData.totalP || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>

                                    {userData.issues.map(issue => (
                                        <Box key={issue.id} sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}>
                                            <Box sx={{
                                                width: 350,
                                                minWidth: 350,
                                                px: 1,
                                                py: 0.5,
                                                borderRight: '1px solid',
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                bgcolor: 'background.paper',
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
                                                        <Box component="span" sx={{ color: 'text.primary', fontSize: '0.72rem' }}>
                                                            {issue.title.split(' ').slice(1).join(' ')}
                                                        </Box>
                                                    </Typography>
                                                </Tooltip>
                                            </Box>

                                            <Box sx={{ width: 2400, minWidth: 2400, position: 'relative', borderRight: '1px solid', borderColor: 'divider' }}>
                                                <TimelineChart
                                                    issues={[issue]}
                                                    startDate={chartStart}
                                                    endDate={chartEnd}
                                                />
                                            </Box>

                                            <Box sx={{ width: 150, minWidth: 150, p: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', position: 'sticky', right: 100, zIndex: 5 }}>
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

                                            <Box sx={{ width: 100, minWidth: 100, p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', position: 'sticky', right: 0, zIndex: 5 }}>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onMouseEnter={() => {
                                                        if (issue.evidence) {
                                                            // Senior Engineer Tip: Anticipatory Pre-fetching
                                                            // Matches the proxy logic in EvidenceModal to warm up the backend cache on hover
                                                            const mediaRegex = /(!\[(.*?)\]\((.*?)\))|(<img\b[^>]*?>)|(https?:\/\/github\.com\/user-attachments\/assets\/[^\s"<>]+)|(https?:\/\/[^\s"<>]+?\.(?:jpg|jpeg|png|gif|webp|svg|mp4|mov|webm|ogg)(?:\?[^\s"<>]+)?)/gi;
                                                            let match;
                                                            const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

                                                            while ((match = mediaRegex.exec(issue.evidence)) !== null) {
                                                                let url = '';
                                                                if (match[1]) url = match[3];
                                                                else if (match[4]) {
                                                                    const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(match[4]);
                                                                    url = srcMatch ? srcMatch[1] : '';
                                                                } else if (match[5] || match[6]) url = match[5] || match[6];

                                                                if (url) {
                                                                    const isGithubUrl = url.includes('github.com') || url.includes('githubusercontent.com');
                                                                    const proxiedUrl = isGithubUrl
                                                                        ? `${API_BASE}/api/github/proxy-image?url=${encodeURIComponent(url)}`
                                                                        : url;

                                                                    // Silent fetch to warm up Redis/Browser cache
                                                                    fetch(proxiedUrl, { priority: 'low' }).catch(() => { });
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        setSelectedEvidence(issue.evidence);
                                                        setSelectedIssueTitle(issue.title);
                                                        setEvidenceModalOpen(true);
                                                    }}
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        textTransform: 'none',
                                                        py: 0.3,
                                                        px: 1,
                                                        minWidth: 'auto',
                                                        borderColor: issue.evidence ? '#1a73e8' : '#ccc',
                                                        color: issue.evidence ? '#1a73e8' : '#999',
                                                        '&:hover': {
                                                            borderColor: issue.evidence ? '#174ea6' : '#999',
                                                            bgcolor: issue.evidence ? '#e8f0fe' : '#f5f5f5'
                                                        }
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>

                {/* Loading Overlay */}
                {(loading || reposLoading) && <AnalyticsSkeleton />}

                {
                    !loading && !reposLoading && (apiError || timelineData.length === 0) && (
                        <Box sx={{
                            position: 'absolute',
                            top: 32,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            bgcolor: 'background.paper'
                        }}>
                            {apiError ? (
                                <GithubErrorBanner
                                    onNavigate={onNavigate}
                                    variant={isAuthError ? 'auth' : 'server'}
                                    message={isAuthError
                                        ? "Please check if your GitHub Personal Access Token is still valid and not expired."
                                        : `The server responded with an error (${apiError.status || apiError.message}). Please try again later.`
                                    }
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4">
                                        <Github className="h-12 w-12 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No activity found</h3>
                                    <p className="text-slate-500 max-w-xs text-center">
                                        No commits or issues found for this repository on the selected date.
                                    </p>
                                </div>
                            )}
                        </Box>
                    )
                }
            </Paper>

            {/* Evidence Modal */}
            <EvidenceModal
                open={evidenceModalOpen}
                onClose={() => setEvidenceModalOpen(false)}
                evidence={selectedEvidence}
                issueTitle={selectedIssueTitle}
            />
        </Box>
    );
};

export default GithubAnalytics;
