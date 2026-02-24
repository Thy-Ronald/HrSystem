import React from 'react';
import { Box, Typography } from '@mui/material';
import { Camera, Eye, ChevronDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTrigger
} from '../../../components/ui/dialog';
import { cn } from '../../../lib/utils';

export const ScreenshotsGallery = ({
    data,
    showScreenshots,
    toggleScreenshots
}) => {
    if (!data?.screenshots?.images?.length) return null;

    return (
        <Box className="bg-[#111113] border border-[#262629] rounded-2xl p-4 transition-all duration-300">
            <Box
                className="flex items-center justify-between cursor-pointer group"
                onClick={toggleScreenshots}
            >
                <Box className="flex items-center gap-2 text-white font-bold">
                    <Camera className="w-4 h-4 text-blue-400" />
                    SCREENSHOTS ({data.screenshots.images.length})
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-500 transition-transform duration-300",
                        !showScreenshots && "-rotate-90"
                    )} />
                </Box>
                <Typography variant="caption" className="text-slate-500 group-hover:text-white transition-colors">
                    {showScreenshots ? 'Click to hide' : 'Click to preview'}
                </Typography>
            </Box>

            {showScreenshots && (
                <Box className="flex gap-4 overflow-x-auto mt-6 pb-2 no-scrollbar animate-in fade-in slide-in-from-top-2 duration-500">
                    {data.screenshots.images.map((img, i) => (
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
    );
};
