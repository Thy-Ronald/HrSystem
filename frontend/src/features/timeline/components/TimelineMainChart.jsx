import React from 'react';
import { Box, Typography } from '@mui/material';
import { Camera } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

export const TimelineMainChart = ({
    data,
    timeLabels,
    getAppData,
    getTimePosition
}) => {
    if (!data?.activityLogs) return null;

    return (
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
    );
};
