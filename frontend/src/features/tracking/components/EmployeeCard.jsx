/**
 * EmployeeCard — a card in the Live Team Overview grid.
 * Shows current app, window title, status, active time, and last seen.
 */

import { Box, Typography, Paper } from '@mui/material';
import StatusDot from './StatusDot';
import CategoryBadge from './CategoryBadge';
import { formatMs, formatRelative, getInitials, STATUS_COLORS } from '../utils/trackingHelpers';

export default function EmployeeCard({ employee, onClick }) {
  const { name, email, effectiveStatus, presence } = employee;
  const hasPresence = !!presence;

  const initials = getInitials(name || email || '?');
  const statusColor = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.offline;

  return (
    <Paper
      elevation={0}
      onClick={() => onClick?.(employee)}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        '&:hover': {
          boxShadow: 3,
          borderColor: 'primary.main',
        },
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Header row: avatar + name + status dot */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: `${statusColor}22`,
            border: `2px solid ${statusColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
            {initials}
          </Typography>
        </Box>

        {/* Name + status */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <StatusDot status={effectiveStatus} size={8} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {name || email}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
            {email}
          </Typography>
        </Box>
      </Box>

      {/* Current app + title */}
      {hasPresence && presence.currentApp ? (
        <Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.primary',
            }}
          >
            {presence.currentApp}
          </Typography>
          {presence.currentTitle && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: 11,
              }}
            >
              {presence.currentTitle}
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          {effectiveStatus === 'offline' ? 'Offline' : 'No app data'}
        </Typography>
      )}

      {/* Category badge + active time */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
        {hasPresence && presence.category ? (
          <CategoryBadge category={presence.category} />
        ) : (
          <span />
        )}

        <Box sx={{ textAlign: 'right' }}>
          {hasPresence && (
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
              {formatMs(presence.totalActiveMs)} active
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{ display: 'block', fontSize: 10, color: 'text.disabled' }}
          >
            {hasPresence && presence.lastSeen ? formatRelative(presence.lastSeen) : 'No data'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
