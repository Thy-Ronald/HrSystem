/**
 * StatusDot — colored circle representing employee status.
 */

import { Tooltip } from '@mui/material';
import { STATUS_COLORS } from '../utils/trackingHelpers';

const LABELS = {
  active: 'Active',
  idle: 'Idle',
  paused: 'Paused',
  offline: 'Offline',
};

export default function StatusDot({ status = 'offline', size = 10 }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.offline;
  const label = LABELS[status] ?? status;

  return (
    <Tooltip title={label} arrow>
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
          boxShadow: status === 'active' ? `0 0 0 2px ${color}33` : undefined,
        }}
      />
    </Tooltip>
  );
}
