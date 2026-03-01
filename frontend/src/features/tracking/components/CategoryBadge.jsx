/**
 * CategoryBadge — pill badge for activity category.
 */

import { CATEGORY_COLORS } from '../utils/trackingHelpers';

export default function CategoryBadge({ category = 'Other' }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '18px',
      }}
    >
      {category || 'Other'}
    </span>
  );
}
