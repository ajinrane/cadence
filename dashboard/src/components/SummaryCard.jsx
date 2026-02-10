import { Users, AlertTriangle, Activity, BookOpen } from 'lucide-react';

const iconMap = {
  users: Users,
  alert: AlertTriangle,
  activity: Activity,
  book: BookOpen,
};

export default function SummaryCard({ title, value, subtitle, icon, color, pulse }) {
  const Icon = iconMap[icon] || Activity;

  return (
    <div className="card relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
            {title}
          </p>
          <p
            className="text-3xl font-bold font-[family-name:var(--font-display)]"
            style={{ color: color || '#111827' }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{
            backgroundColor: `${color || '#3b82f6'}12`,
            color: color || '#3b82f6',
          }}
        >
          {pulse ? (
            <div className="relative">
              <Icon size={20} />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full agent-pulse"
                style={{ backgroundColor: color }}
              />
            </div>
          ) : (
            <Icon size={20} />
          )}
        </div>
      </div>
      {/* Subtle shimmer overlay for active cards */}
      <div className="absolute inset-0 shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
