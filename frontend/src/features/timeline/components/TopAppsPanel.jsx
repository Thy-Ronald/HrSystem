import React from 'react';
import { Box, Typography } from '@mui/material';
import { PieChart } from 'lucide-react';
import { Progress } from '../../../components/ui/progress';

export const TopAppsPanel = ({ topApps }) => {
    return (
        <Box className="bg-card border border-border rounded-2xl p-6 h-[440px] shadow-lg flex flex-col w-full overflow-hidden">
            <Box className="flex justify-between items-center mb-8">
                <Typography variant="subtitle2" className="text-foreground font-bold tracking-wider uppercase">
                    Top Apps in Timeline
                </Typography>
                <Typography variant="caption" className="text-muted-foreground">Today</Typography>
            </Box>
            <Box className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {topApps.length > 0 ? (
                    topApps.map((app, i) => (
                        <Box key={i} className="group">
                            <Box className="flex justify-between items-end mb-3">
                                <Box className="flex gap-3 min-w-0">
                                    <Box className="w-[3px] h-8 rounded-full shrink-0" style={{ backgroundColor: app.color }} />
                                    <Box className="min-w-0">
                                        <Typography variant="body2" className="text-foreground font-semibold group-hover:text-blue-400 transition-colors uppercase tracking-tight truncate">
                                            {app.name}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box className="text-right shrink-0">
                                    <Typography variant="caption" className="text-foreground font-bold block">{app.duration}m</Typography>
                                    <Typography variant="caption" className="text-muted-foreground font-medium">{app.percent}%</Typography>
                                </Box>
                            </Box>
                            <Progress value={app.percent} className="h-1.5 bg-muted/30" indicatorColor={app.color} />
                        </Box>
                    )
                    )) : (
                    <Box className="flex flex-col items-center justify-center h-full opacity-40">
                        <Box className="p-3 rounded-full bg-muted mb-3">
                            <PieChart className="w-8 h-8 text-muted-foreground" />
                        </Box>
                        <Typography variant="caption" className="text-muted-foreground">No application usage recorded</Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
