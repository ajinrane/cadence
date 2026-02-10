import { Brain, Lightbulb, Share2, GitBranch, TrendingUp } from 'lucide-react';

const metricDefs = [
  { key: 'knowledgeScore', label: 'Knowledge Score', icon: Brain, color: '#8b5cf6', suffix: '%' },
  { key: 'totalInsights', label: 'Total Insights', icon: Lightbulb, color: '#f59e0b', suffix: '' },
  { key: 'density', label: 'Graph Density', icon: Share2, color: '#06b6d4', suffix: '', decimals: 3 },
  { key: 'connectedComponents', label: 'Components', icon: GitBranch, color: '#3b82f6', suffix: '' },
  { key: 'interventionSuccessRate', label: 'Intervention Success', icon: TrendingUp, color: '#10b981', suffix: '%' },
];

export default function GraphMetricsPanel({ metrics, baselineMetrics, knowledgeLossActive }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {metricDefs.map((def) => {
        const Icon = def.icon;
        const value = metrics?.[def.key] ?? 0;
        const baseline = baselineMetrics?.[def.key] ?? 0;
        const delta = knowledgeLossActive ? value - baseline : 0;
        const hasDelta = knowledgeLossActive && Math.abs(delta) > 0.001;
        const isNegative = delta < 0;
        // For connectedComponents, increase = fragmentation = bad
        const isBad = def.key === 'connectedComponents' ? delta > 0 : isNegative;

        const displayValue = def.decimals
          ? value.toFixed(def.decimals)
          : value;

        return (
          <div
            key={def.key}
            className="card relative overflow-hidden group"
            style={{ padding: '10px 12px' }}
          >
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400 leading-tight">
                {def.label}
              </p>
              <div
                className="flex items-center justify-center w-6 h-6 rounded-md"
                style={{ background: `${def.color}12`, color: def.color }}
              >
                <Icon size={13} />
              </div>
            </div>
            <p
              className="text-xl font-bold font-[family-name:var(--font-display)] leading-none"
              style={{ color: hasDelta && isBad ? '#ef4444' : '#111827' }}
            >
              {displayValue}{def.suffix}
            </p>
            {hasDelta && (
              <p
                className="text-[10px] font-[family-name:var(--font-mono)] mt-1"
                style={{ color: isBad ? '#ef4444' : '#10b981' }}
              >
                {isBad ? '▼' : '▲'} {delta > 0 ? '+' : ''}{def.decimals ? delta.toFixed(def.decimals) : delta}
              </p>
            )}
            <div className="absolute inset-0 shimmer pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
}
