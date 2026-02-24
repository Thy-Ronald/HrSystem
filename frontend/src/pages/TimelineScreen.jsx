import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    TextField,
    Button,
    Autocomplete,
    Alert,
    Divider,
    Card,
    CardContent
} from '@mui/material';
import { CalendarToday as CalendarIcon, Person as PersonIcon } from '@mui/icons-material';
import { fetchTimelineUsers, fetchTimelineData } from '../services/api';

const TimelineScreen = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoadingUsers(true);
                const userList = await fetchTimelineUsers();
                setUsers(userList);
                setError(null);
            } catch (err) {
                console.error('Failed to load users:', err);
                setError('Failed to load users from Project A.');
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, []);

    const handleFetchData = async () => {
        if (!selectedUser) {
            setError('Please select a user first.');
            return;
        }

        try {
            setLoadingData(true);
            setError(null);
            const timelineData = await fetchTimelineData(selectedUser.id, date);
            setData(timelineData);
        } catch (err) {
            console.error('Failed to fetch timeline data:', err);
            setError('Failed to fetch activity logs for the selected user and date.');
            setData(null);
        } finally {
            setLoadingData(false);
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
                Activity Timeline
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                        <Autocomplete
                            options={users}
                            getOptionLabel={(option) => `${option.name} (${option.email})`}
                            value={selectedUser}
                            onChange={(_, newValue) => setSelectedUser(newValue)}
                            loading={loadingUsers}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Personnel"
                                    placeholder="Type to search..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                        endAdornment: (
                                            <>
                                                {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            label="Select Date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            InputProps={{
                                startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Button
                            variant="contained"
                            onClick={handleFetchData}
                            disabled={loadingData || !selectedUser}
                            fullWidth
                            sx={{ height: '56px' }}
                        >
                            {loadingData ? <CircularProgress size={24} /> : 'Fetch Timeline'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {data ? (
                <Box>
                    <Grid container spacing={3}>
                        {/* Activity Logs Summary */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Activity Logs</Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {data.activityLogs?.activities?.length > 0 ? (
                                        <Box>
                                            {data.activityLogs.activities.slice(0, 5).map((act, i) => (
                                                <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{act.app}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(act.start).toLocaleTimeString()} - {new Date(act.end).toLocaleTimeString()}
                                                        ({Math.round(act.durationMs / 1000 / 60)} mins)
                                                    </Typography>
                                                </Box>
                                            ))}
                                            {data.activityLogs.activities.length > 5 && (
                                                <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                                    + {data.activityLogs.activities.length - 5} more activities
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No activity logs found for this date.</Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Screenshots Summary */}
                        <Grid item xs={12} md={6}>
                            <Card sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Screenshots</Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {data.screenshots?.images?.length > 0 ? (
                                        <Grid container spacing={1}>
                                            {data.screenshots.images.slice(0, 4).map((img, i) => (
                                                <Grid item xs={6} key={i}>
                                                    <Box
                                                        component="img"
                                                        src={img.url}
                                                        alt={`Screenshot ${i}`}
                                                        sx={{ width: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                                    />
                                                </Grid>
                                            ))}
                                            {data.screenshots.images.length > 4 && (
                                                <Grid item xs={12}>
                                                    <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                                        + {data.screenshots.images.length - 4} more screenshots
                                                    </Typography>
                                                </Grid>
                                            )}
                                        </Grid>
                                    ) : (
                                        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No screenshots found for this date.</Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            ) : (
                <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'background.paper', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                    <Typography color="text.secondary">
                        {selectedUser
                            ? `Select a date and click "Fetch Timeline" to see data for ${selectedUser.name}.`
                            : 'Please select a user and a date to begin.'}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default TimelineScreen;
