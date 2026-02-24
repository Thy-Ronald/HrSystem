import React from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { Search } from 'lucide-react';
import { TooltipProvider } from "../components/ui/tooltip";

// Domain Hooks & Helpers
import { useTimeline } from '../hooks/useTimeline';
import { getAppData, getTimePosition } from '../lib/timeline-helpers';

// Atomic Components
import { TimelineHeader } from '../features/timeline/components/TimelineHeader';
import { TimelineMainChart } from '../features/timeline/components/TimelineMainChart';
import { ScreenshotsGallery } from '../features/timeline/components/ScreenshotsGallery';
import { AnalysisSections } from '../features/timeline/components/AnalysisSections';

/**
 * TimelineScreen (Orchestrator)
 * Follows Clean Architecture by delegating logic to useTimeline 
 * and presentation to atomic components.
 */
const TimelineScreen = () => {
    const {
        date,
        users,
        selectedUser,
        loadingData,
        data,
        error,
        showScreenshots,
        topApps,
        timeLabels,
        setDate,
        setSelectedUser,
        handleFetchData,
        toggleScreenshots,
    } = useTimeline();

    return (
        <TooltipProvider>
            <Box className="min-h-screen bg-[#0a0a0b] text-slate-200 p-6 font-sans">
                {/* Header Section */}
                <TimelineHeader
                    users={users}
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    date={date}
                    setDate={setDate}
                    loadingData={loadingData}
                    handleFetchData={handleFetchData}
                />

                {error && (
                    <Alert severity="error" className="mb-6 bg-red-900/20 border-red-500/30 text-red-200">
                        {error}
                    </Alert>
                )}

                {data ? (
                    <Box className="space-y-8 animate-in fade-in duration-500">
                        {/* Main Chart Section */}
                        <TimelineMainChart
                            data={data}
                            timeLabels={timeLabels}
                            getAppData={getAppData}
                            getTimePosition={getTimePosition}
                        />

                        {/* Collapsible Screenshots Gallery */}
                        <ScreenshotsGallery
                            data={data}
                            showScreenshots={showScreenshots}
                            toggleScreenshots={toggleScreenshots}
                        />

                        {/* Analysis Panels (Top Apps & Log) */}
                        <AnalysisSections
                            topApps={topApps}
                            activities={data.activityLogs?.activities}
                            getAppData={getAppData}
                        />
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

            {/* Global Theme Overrides & Scrollbars */}
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
