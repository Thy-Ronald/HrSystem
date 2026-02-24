import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    TextField,
    Autocomplete,
    Alert,
    Grid,
} from '@mui/material';
import {
    Calendar as CalendarIcon,
    User as PersonIcon,
    Camera,
    Eye,
    Clock,
    ChevronDown,
    ExternalLink,
    Search,
    LayoutGrid,
    PieChart,
    List
} from 'lucide-react';
import { fetchTimelineUsers, fetchTimelineData } from '../services/api';
import { Button } from '../components/ui/button';
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";

const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const CATEGORY_MAP = {
    'VS Code': { category: 'Coding', color: '#3b82f6' },
    'Cursor': { category: 'Coding', color: '#3b82f6' },
    'WebStorm': { category: 'Coding', color: '#3b82f6' },
    'IntelliJ': { category: 'Coding', color: '#3b82f6' },
    'Chrome': { category: 'Browsing', color: '#f59e0b' },
    'Firefox': { category: 'Browsing', color: '#f59e0b' },
    'Safari': { category: 'Browsing', color: '#f59e0b' },
    'Slack': { category: 'Social', color: '#ec4899' },
    'Discord': { category: 'Social', color: '#ec4899' },
    'Meeting': { category: 'Meeting', color: '#10b981' },
    'Zoom': { category: 'Meeting', color: '#10b981' },
    'Teams': { category: 'Meeting', color: '#10b981' },
    'Outlook': { category: 'Email', color: '#8b5cf6' },
    'Gmail': { category: 'Email', color: '#8b5cf6' },
    'Antigravity': { category: 'Other', color: '#6366f1' },
    'Default': { category: 'Other', color: '#64748b' }
};

const getAppData = (app) => {
    for (const [key, val] of Object.entries(CATEGORY_MAP)) {
        if (app.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return CATEGORY_MAP['Default'];
};

const TimelineScreen = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [showScreenshots, setShowScreenshots] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const userList = await fetchTimelineUsers();
                setUsers(userList || []);
            } catch (err) {
                console.error('Failed to load users:', err);
                setError('Connection failed. Please check backend status.');
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    const handleFetchData = async () => {
        if (!selectedUser) return;
        try {
            setLoadingData(true);
            setError(null);
            const timelineData = await fetchTimelineData(selectedUser.id, date);
            setData(timelineData);
        } catch (err) {
            console.error('Failed to fetch timeline data:', err);
            setError('Unable to retrieve activity data for this period.');
        } finally {
            setLoadingData(false);
        }
    };

    const getTimePosition = (timestamp) => {
        const time = new Date(timestamp);
        const hour = time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 3600;
        return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
    };

    const topApps = useMemo(() => {
        if (!data?.activityLogs?.topApps) return [];
        return data.activityLogs.topApps.map(app => ({
            name: app.name,
            duration: Math.round(app.totalMs / 1000 / 60),
            percent: Math.round(app.percentage),
            color: getAppData(app.name).color
        })).slice(0, 5);
    }, [data]);

    const timeLabels = useMemo(() => {
        const labels = [];
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hours = h > 12 ? h - 12 : h === 0 ? 12 : h;
            labels.push({ label: `${hours} ${ampm}`, pos: ((h - START_HOUR) / TOTAL_HOURS) * 100 });
        }
        return labels;
    }, []);

    return (
        <TooltipProvider>
            <Box className="min-h-screen bg-[#0a0a0b] text-slate-200 p-6 font-sans">
                {/* Header Section */}
                <Box className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <Box className="flex items-center gap-4">
                        <Box className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                            <LayoutGrid className="text-blue-400 w-6 h-6" />
                        </Box>
                        <Typography variant="h5" className="font-bold tracking-tight text-white">
                            Timeline
                        </Typography>
                    </Box>

                    <Box className="flex flex-wrap items-center gap-3">
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) => `${option.name} (${option.email})`}
                            value={selectedUser}
                            onChange={(_, v) => setSelectedUser(v)}
                            className="w-72"
                            renderInput={(p) => (
                                <TextField
                                    {...p}
                                    placeholder="Search Personnel..."
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: '#161618',
                                            color: 'white',
                                            '& fieldset': { borderColor: '#262629' },
                                            '&:hover fieldset': { borderColor: '#3f3f46' },
                                        }
                                    }}
                                />
                            )}
                        />
                        <TextField
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: '#161618',
                                    color: 'white',
                                    '& fieldset': { borderColor: '#262629' },
                                }
                            }}
                        />
                        <Button
                            onClick={handleFetchData}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            disabled={loadingData || !selectedUser}
                        >
                            {loadingData ? <CircularProgress size={16} color="inherit" /> : 'Apply'}
                        </Button>
                    </Box>
                </Box>

                {error && <Alert severity="error" className="mb-6 bg-red-900/20 border-red-500/30 text-red-200">{error}</Alert>}

                {data ? (
                    <Box className="space-y-8 animate-in fade-in duration-500">
                        {/* Main Timeline Card */}
                        <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-4 relative overflow-hidden">
                            {/* Time Header Labels */}
                            <Box className="flex justify-between mb-4 px-2">
                                {timeLabels.map((t, i) => (
                                    <Typography
                                        key={i}
                                        variant="caption"
                                        className="text-[#636366] font-medium text-[10px]"
                                    >
                                        {t.label}
                                    </Typography>
                                ))}
                            </Box>

                            {/* Grid Lines */}
                            <Box className="absolute inset-0 top-10 bottom-6 pointer-events-none px-6">
                                <Box className="relative h-full w-full">
                                    {timeLabels.map((t, i) => (
                                        <Box
                                            key={i}
                                            className="absolute h-full border-l border-[#1c1c1e]"
                                            style={{ left: `${t.pos}%` }}
                                        />
                                    ))}
                                </Box>
                            </Box>

                            {/* Activity Bar (Main Blocks) */}
                            <Box className="relative h-6 w-full bg-[#1c1c1e] rounded-xl mb-4 overflow-hidden border border-[#262629]/50 shadow-inner">
                                {data.activityLogs?.activities?.map((act, i) => {
                                    const start = getTimePosition(act.start);
                                    const end = getTimePosition(act.end);
                                    if (start >= 100 || end <= 0) return null;
                                    const { color } = getAppData(act.app);
                                    return (
                                        <Tooltip key={i}>
                                            <TooltipTrigger asChild>
                                                <Box
                                                    className="absolute h-full transition-all hover:brightness-125 hover:z-20 border-r border-black/10"
                                                    style={{
                                                        left: `${Math.max(0, start)}%`,
                                                        width: `${Math.min(100, end) - Math.max(0, start)}%`,
                                                        backgroundColor: color,
                                                        opacity: 0.9
                                                    }}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-slate-800 text-white p-2">
                                                <Typography variant="body2" className="font-bold">{act.app}</Typography>
                                                <Typography variant="caption" className="text-slate-400">
                                                    {new Date(act.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                    {new Date(act.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}

                                {/* Screenshot Markers (Icons) */}
                                {data.screenshots?.images?.map((img, i) => {
                                    const pos = getTimePosition(img.timestamp);
                                    if (pos < 0 || pos > 100) return null;
                                    return (
                                        <Box
                                            key={i}
                                            className="absolute z-30 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white/20 flex items-center justify-center shadow-lg"
                                            style={{ left: `${pos}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                                        >
                                            <Camera className="w-3 h-3 text-white" />
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* Detailed Activity Strip (Small) */}
                            <Box className="relative h-3 w-full bg-[#1c1c1e]/50 rounded-full mb-8 overflow-hidden">
                                {data.activityLogs?.activities?.map((act, i) => {
                                    const start = getTimePosition(act.start);
                                    const end = getTimePosition(act.end);
                                    const { color } = getAppData(act.app);
                                    return (
                                        <Box
                                            key={i}
                                            className="absolute h-full"
                                            style={{
                                                left: `${start}%`,
                                                width: `${end - start}%`,
                                                backgroundColor: color
                                            }}
                                        />
                                    );
                                })}
                            </Box>

                            {/* Preview Bar (Screenshots Thumbnail Drop) */}
                            <Box className="relative h-12 w-full mb-2 flex items-center">
                                {data.screenshots?.images?.map((img, i) => {
                                    const pos = getTimePosition(img.timestamp);
                                    return (
                                        <Box
                                            key={i}
                                            className="absolute h-full transition-transform hover:scale-110 hover:z-40 cursor-pointer"
                                            style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                                        >
                                            <img
                                                src={img.url}
                                                className="h-10 aspect-video rounded-md border-2 border-white/10 shadow-2xl object-cover"
                                            />
                                        </Box>
                                    );
                                })}
                            </Box>

                            {/* Legend & Count */}
                            <Box className="flex justify-end gap-2 mt-2">
                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 font-medium">
                                    <Camera className="w-3 h-3 mr-1" />
                                    {data.screenshots?.images?.length || 0}
                                </Badge>
                            </Box>
                        </Box>

                        {/* Screenshots Section */}
                        <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-4 transition-all duration-300">
                            <Box
                                className="flex items-center justify-between cursor-pointer group"
                                onClick={() => setShowScreenshots(!showScreenshots)}
                            >
                                <Box className="flex items-center gap-2 text-white font-bold">
                                    <Camera className="w-4 h-4 text-blue-400" />
                                    SCREENSHOTS ({data.screenshots?.images?.length || 0})
                                    <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", !showScreenshots && "-rotate-90")} />
                                </Box>
                                <Typography variant="caption" className="text-slate-500 group-hover:text-white transition-colors">
                                    {showScreenshots ? 'Click to hide' : 'Click to preview'}
                                </Typography>
                            </Box>

                            {showScreenshots && (
                                <Box className="flex gap-4 overflow-x-auto mt-6 pb-2 no-scrollbar animate-in fade-in slide-in-from-top-2 duration-500">
                                    {data.screenshots?.images?.map((img, i) => (
                                        <Dialog key={i}>
                                            <DialogTrigger asChild>
                                                <Box className="relative flex-shrink-0 group/img cursor-pointer transition-all hover:scale-[1.02]">
                                                    <img
                                                        src={img.url}
                                                        className="w-28 aspect-video rounded-xl border border-white/5 object-cover shadow-lg"
                                                    />
                                                    <Box className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <Typography variant="caption" className="text-white font-medium">
                                                            {new Date(img.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    </Box>
                                                    <Box className="absolute top-2 right-2 p-1 bg-black/40 backdrop-blur-md rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <Eye className="w-3 h-3 text-white" />
                                                    </Box>
                                                </Box>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-6xl bg-[#0a0a0b] border-white/10 p-2 overflow-hidden rounded-3xl">
                                                <img src={img.url} className="w-full h-full object-contain rounded-2xl" />
                                            </DialogContent>
                                        </Dialog>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Bottom Panels (Top Apps & Log) */}
                        <Grid container spacing={3} sx={{ mt: 2, width: '100%', ml: 0 }}>
                            {/* Top Apps Panel */}
                            <Grid item xs={12} lg={6} sx={{ display: 'flex', flex: '1 1 0', minWidth: 0 }}>
                                <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-6 h-[440px] shadow-lg flex flex-col w-full overflow-hidden">
                                    <Box className="flex justify-between items-center mb-8">
                                        <Typography variant="subtitle2" className="text-white font-bold tracking-wider">TOP APPS IN TIMELINE</Typography>
                                        <Typography variant="caption" className="text-slate-500">Today</Typography>
                                    </Box>
                                    <Box className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                        {topApps.length > 0 ? (
                                            topApps.map((app, i) => (
                                                <Box key={i} className="group">
                                                    <Box className="flex justify-between items-end mb-3">
                                                        <Box className="flex gap-3">
                                                            <Box className="w-[3px] h-8 rounded-full" style={{ backgroundColor: app.color }} />
                                                            <Box>
                                                                <Typography variant="body2" className="text-white font-semibold group-hover:text-blue-400 transition-colors uppercase tracking-tight truncate">{app.name}</Typography>
                                                            </Box>
                                                        </Box>
                                                        <Box className="text-right">
                                                            <Typography variant="caption" className="text-white font-bold block">{app.duration}m</Typography>
                                                            <Typography variant="caption" className="text-slate-500 font-medium">{app.percent}%</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Progress value={app.percent} className="h-1.5 bg-[#1c1c1e]" indicatorColor={app.color} />
                                                </Box>
                                            ))
                                        ) : (
                                            <Box className="flex flex-col items-center justify-center h-full opacity-40">
                                                <Box className="p-3 rounded-full bg-slate-500/10 mb-3">
                                                    <PieChart className="w-8 h-8 text-slate-500" />
                                                </Box>
                                                <Typography variant="caption" className="text-slate-500">No application usage recorded</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Activity Log Panel */}
                            <Grid item xs={12} lg={6} sx={{ display: 'flex', flex: '1 1 0', minWidth: 0 }}>
                                <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-6 h-[440px] shadow-lg flex flex-col w-full overflow-hidden">
                                    <Box className="flex justify-between items-center mb-6">
                                        <Typography variant="subtitle2" className="text-white font-bold tracking-wider">ACTIVITY LOG</Typography>
                                        <Typography variant="caption" className="text-slate-500">{data.activityLogs?.activities?.length || 0} entries</Typography>
                                    </Box>
                                    <Box className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                        {data.activityLogs?.activities?.length > 0 ? (
                                            data.activityLogs?.activities?.slice().reverse().map((act, i) => {
                                                const { category, color } = getAppData(act.app);
                                                return (
                                                    <Box key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#161618] border border-[#262629]/50 hover:bg-[#1c1c1e] transition-colors group">
                                                        <Box className="flex items-center gap-4">
                                                            <Box className="w-[3px] h-10 rounded-full" style={{ backgroundColor: color }} />
                                                            <Box className="flex flex-col min-w-0 flex-1">
                                                                <Box className="flex items-center gap-2 mb-1">
                                                                    <Typography variant="body2" className="text-white font-bold truncate">{act.app}</Typography>
                                                                    <Badge className="bg-slate-800 text-slate-400 text-[9px] h-4 px-1 leading-none uppercase font-bold border-none shrink-0" variant="outline">{category}</Badge>
                                                                </Box>
                                                                <Typography variant="caption" className="text-slate-400 block text-[10px] italic mb-1 truncate">{act.title || act.details || ''}</Typography>
                                                                <Typography variant="caption" className="text-slate-500 block text-[10px]">Opened at {new Date(act.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Typography>
                                                            </Box>
                                                        </Box>
                                                        <Box className="text-right">
                                                            <Typography variant="caption" className="text-slate-400 font-bold block">{Math.round(act.durationMs / 1000)}s</Typography>
                                                            <Typography variant="caption" className="text-slate-600 font-medium text-[9px]">{new Date(act.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ampm: true })}</Typography>
                                                        </Box>
                                                    </Box>
                                                );
                                            })
                                        ) : (
                                            <Box className="flex flex-col items-center justify-center h-full opacity-40">
                                                <Box className="p-3 rounded-full bg-slate-500/10 mb-3">
                                                    <List className="w-8 h-8 text-slate-500" />
                                                </Box>
                                                <Typography variant="caption" className="text-slate-500">No activity logs found for this date</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                ) : (
                    <Box className="flex flex-col items-center justify-center py-40 bg-[#111113] rounded-3xl border-2 border-dashed border-[#262629]">
                        <Box className="p-6 rounded-full bg-blue-500/10 mb-6">
                            <Search className="w-12 h-12 text-blue-500/40" />
                        </Box>
                        <Typography variant="h6" className="text-white font-bold mb-2">No Data Available</Typography>
                        <Typography variant="body2" className="text-slate-500 text-center max-w-sm px-6">
                            {selectedUser
                                ? `Click "Apply" to view the productivity timeline for ${selectedUser.name} on the selected date.`
                                : 'Select a user and date above to begin visualizing their daily work activity.'}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Global CSS for scrollbars */}
            <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262629; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
        </TooltipProvider>
    );
};

export default TimelineScreen;
