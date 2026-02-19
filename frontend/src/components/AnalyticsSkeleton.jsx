import React from 'react';
import TableSkeleton from './ui/TableSkeleton.jsx';

const AnalyticsSkeleton = () => {
    // Define the specific column layout for GitHub Analytics
    const columns = [
        {
            width: 350,
            sticky: 'left',
            left: 0,
            borderRight: true,
            zIndex: 2,
            skeletonWidth: '80%',
            skeletonHeight: 16
        },
        {
            width: 2400,
            minWidth: 2400,
            px: 2,
            skeletonWidth: '100%',
            skeletonHeight: 12
        },
        {
            width: 150,
            sticky: 'right',
            right: 100,
            borderLeft: true,
            zIndex: 2,
            flexDirection: 'column',
            alignItems: 'center',
            skeletonWidth: '60%',
            skeletonHeight: 12,
            secondSkeleton: true,
            secondSkeletonWidth: '40%',
            secondSkeletonHeight: 10
        },
        {
            width: 100,
            sticky: 'right',
            right: 0,
            borderLeft: true,
            zIndex: 2,
            justifyContent: 'center',
            skeletonWidth: 50,
            skeletonHeight: 24
        }
    ];

    return (
        <TableSkeleton
            layout="flex"
            rows={15}
            rowHeight={40}
            columns={columns}
        />
    );
};

export default AnalyticsSkeleton;
