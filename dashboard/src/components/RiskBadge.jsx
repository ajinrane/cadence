import { getRiskColor } from '../utils/formatters';

export default function RiskBadge({ level, size = 'sm' }) {
  const colors = getRiskColor(level);
  const sizeClasses = size === 'lg'
    ? 'px-3 py-1.5 text-sm font-semibold'
    : 'px-2 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClasses} tracking-wide uppercase`}
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {level === 'High' && (
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full agent-pulse"
          style={{ backgroundColor: colors.text }}
        />
      )}
      {level}
    </span>
  );
}
