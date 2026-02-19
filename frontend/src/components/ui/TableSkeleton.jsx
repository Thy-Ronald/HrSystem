import React from 'react';
import { Box, Skeleton } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reusable Table Skeleton Component
 * Supports both HTML Table and Flexbox layouts
 * 
 * @param {Object} props
 * @param {number} props.rows - Number of rows to render
 * @param {Array|number} props.columns - Column configuration or count
 * @param {'table'|'flex'} props.layout - Layout mode
 * @param {number} props.rowHeight - Height of each row in pixels
 */
const TableSkeleton = ({
    rows = 10,
    columns = 8,
    layout = 'table',
    rowHeight = 40
}) => {
    const { activeMode } = useTheme();
    const isDark = activeMode === 'dark';

    // Skeleton colors matching the design system
    const skeletonBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f3f4';
    const headerBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e8eaed';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e0e0e0';

    // Normalize columns prop to array
    const cols = Array.isArray(columns)
        ? columns
        : Array.from({ length: typeof columns === 'number' ? columns : 8 }).map(() => ({}));

    if (layout === 'flex') {
        return (
            <Box sx={{
                position: 'absolute',
                top: 32, // Matches header height typical in flex layouts
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'background.paper',
                zIndex: 10,
                overflow: 'hidden'
            }}>
                <Box sx={{ minWidth: '100%', display: 'flex', flexDirection: 'column' }}>
                    {Array.from({ length: rows }).map((_, i) => (
                        <Box key={i} sx={{
                            display: 'flex',
                            borderBottom: '1px solid',
                            borderColor: borderColor,
                            height: rowHeight,
                            alignItems: 'center'
                        }}>
                            {cols.map((col, j) => (
                                <Box key={j} sx={{
                                    width: col.width || 'auto',
                                    minWidth: col.minWidth || col.width || 'auto',
                                    flexGrow: col.flexGrow || 0,
                                    px: 1,
                                    borderRight: col.borderRight ? '1px solid' : 'none',
                                    borderLeft: col.borderLeft ? '1px solid' : 'none',
                                    borderColor: borderColor,
                                    position: col.sticky ? 'sticky' : 'relative',
                                    left: col.sticky === 'left' ? (col.left || 0) : 'auto',
                                    right: col.sticky === 'right' ? (col.right || 0) : 'auto',
                                    bgcolor: 'background.paper',
                                    zIndex: col.sticky ? 2 : 1,
                                    display: 'flex',
                                    flexDirection: col.flexDirection || 'row',
                                    alignItems: 'center',
                                    justifyContent: col.justifyContent || 'flex-start',
                                    gap: 0.5
                                }}>
                                    <Box className="animate-pulse" sx={{
                                        height: col.skeletonHeight || '60%',
                                        width: col.skeletonWidth || '80%',
                                        bgcolor: skeletonBg,
                                        borderRadius: '4px'
                                    }} />
                                    {col.secondSkeleton && (
                                        <Box className="animate-pulse" sx={{
                                            height: col.secondSkeletonHeight || '40%',
                                            width: col.secondSkeletonWidth || '40%',
                                            bgcolor: skeletonBg,
                                            borderRadius: '4px'
                                        }} />
                                    )}
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        );
    }

    // Default 'table' layout (HTML Table)
    return (
        <div className="w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            {cols.map((_, i) => (
                                <th key={i} className="px-4 py-3">
                                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                {cols.map((col, j) => (
                                    <td key={j} className="px-4 py-3">
                                        <div
                                            className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse"
                                            style={{ width: j === 0 ? '60%' : '80%' }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TableSkeleton;
