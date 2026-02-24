import React from 'react';
import { Box, Typography } from '@mui/material';
import { List } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

export const ActivityLogPanel = ({ activities, getAppData }) => {
    return (
        <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-6 h-[440px] shadow-lg flex flex-col w-full overflow-hidden">
            <Box className="flex justify-between items-center mb-6">
                <Typography variant="subtitle2" className="text-white font-bold tracking-wider uppercase">
                    Activity Log
                </Typography>
                <Typography variant="caption" className="text-slate-500">
                    {activities?.length || 0} entries
                </Typography>
            </Box>
            <Box className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {activities?.length > 0 ? (
                    activities.slice().reverse().map((act, i) => {
                        const { category, color } = getAppData(act.app);
                        return (
                            <Box key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#161618] border border-[#262629]/50 hover:bg-[#1c1c1e] transition-colors group">
                                <Box className="flex items-center gap-4 min-w-0 flex-1">
                                    <Box className="w-[3px] h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <Box className="flex flex-col min-w-0 flex-1">
                                        <Box className="flex items-center gap-2 mb-1">
                                            <Typography variant="body2" className="text-white font-bold truncate">{act.app}</Typography>
                                            <Badge className="bg-slate-800 text-slate-400 text-[9px] h-4 px-1 leading-none uppercase font-bold border-none shrink-0" variant="outline">{category}</Badge>
                                        </Box>
                                        <Typography variant="caption" className="text-slate-400 block text-[10px] italic mb-1 truncate">
                                            {act.title || act.details || ''}
                                        </Typography>
                                        <Typography variant="caption" className="text-slate-500 block text-[10px]">
                                            Opened at {new Date(act.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box className="text-right shrink-0">
                                    <Typography variant="caption" className="text-slate-400 font-bold block">{Math.round(act.durationMs / 1000)}s</Typography>
                                    <Typography variant="caption" className="text-slate-600 font-medium text-[9px]">
                                        {new Date(act.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ampm: true })}
                                    </Typography>
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
    );
};
