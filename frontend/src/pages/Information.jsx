import React from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Avatar,
    Chip,
    CircularProgress
} from '@mui/material';
import { useContracts } from '../features/contracts/hooks/useContracts';
import { formatDate } from '../utils/format';

const Information = () => {
    const { contracts, loading, error } = useContracts();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'white' }}>
            {/* Page Header */}
            <Box sx={{
                p: 3,
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Box>
                    <Typography variant="h6" sx={{ color: '#333', fontWeight: 500 }}>
                        Employee Information
                    </Typography>
                </Box>
            </Box>

            {/* Table Content */}
            <Box sx={{ p: 4 }}>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #eee', borderRadius: 2 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="employee information table">
                        <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Employee</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Position</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Department</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Hire Date</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: '#5f6368' }}>Contact</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <Typography color="text.secondary">No employee information found</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((employee) => (
                                    <TableRow
                                        key={employee.id}
                                        hover
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, fontSize: '0.875rem' }}>
                                                    {employee.name.charAt(0)}
                                                </Avatar>
                                                <Typography sx={{ fontWeight: 500 }}>{employee.name}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{employee.position}</TableCell>
                                        <TableCell>{employee.department || 'Operations'}</TableCell>
                                        <TableCell>{formatDate(employee.startDate) || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label="Active"
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                                                    color: '#2e7d32',
                                                    fontWeight: 500,
                                                    fontSize: '0.75rem'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {employee.phone || 'N/A'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default Information;
