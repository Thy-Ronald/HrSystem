import React from 'react';
import {
    Box,
    Typography,
    Autocomplete,
    TextField,
    CircularProgress
} from '@mui/material';
import { LayoutGrid } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export const TimelineHeader = ({
    users,
    selectedUser,
    setSelectedUser,
    date,
    setDate,
    loadingData,
    handleFetchData
}) => {
    return (
        <Box className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <Box className="flex items-center gap-4">
                <Box className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <LayoutGrid className="text-blue-400 w-6 h-6" />
                </Box>
                <Typography variant="h5" className="font-bold tracking-tight text-foreground">
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
                                    bgcolor: 'background.paper',
                                    color: 'text.primary',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'primary.main' },
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
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            '& fieldset': { borderColor: 'divider' },
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
    );
};
