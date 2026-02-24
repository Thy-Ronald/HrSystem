import React from 'react';
import { Grid } from '@mui/material';
import { TopAppsPanel } from './TopAppsPanel';
import { ActivityLogPanel } from './ActivityLogPanel';

export const AnalysisSections = ({ topApps, activities, getAppData }) => {
    return (
        <Grid container spacing={3} sx={{ mt: 2, width: '100%', ml: 0 }}>
            {/* Top Apps Panel */}
            <Grid item xs={12} lg={6} sx={{ display: 'flex', flex: '1 1 0', minWidth: 0 }}>
                <TopAppsPanel topApps={topApps} />
            </Grid>

            {/* Activity Log Panel */}
            <Grid item xs={12} lg={6} sx={{ display: 'flex', flex: '1 1 0', minWidth: 0 }}>
                <ActivityLogPanel activities={activities} getAppData={getAppData} />
            </Grid>
        </Grid>
    );
};
