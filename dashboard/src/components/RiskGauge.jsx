import { formatRiskScore, getRiskColor } from '../utils/formatters';

export default function RiskGauge({ score, level, size = 'lg' }) {
  const colors = getRiskColor(level);
  const percentage = score * 100;

  // SVG arc parameters
  const isLarge = size === 'lg';
  const radius = isLarge ? 70 : 40;
  const stroke = isLarge ? 8 : 5;
  const center = radius + stroke;
  const viewSize = (radius + stroke) * 2;

  // Arc from 225° to -45° (270° sweep)
  const startAngle = 225;
  const sweepAngle = 270;
  const endAngle = startAngle - sweepAngle;
  const progressAngle = startAngle - (sweepAngle * percentage) / 100;

  function polarToCartesian(angle) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center - radius * Math.sin(rad),
    };
  }

  function describeArc(startA, endA) {
    const start = polarToCartesian(startA);
    const end = polarToCartesian(endA);
    const sweep = startA - endA;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={viewSize} height={viewSize * 0.75} viewBox={`0 ${stroke} ${viewSize} ${viewSize * 0.7}`}>
        {/* Background track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="rgba(120,140,180,0.12)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d={describeArc(startAngle, progressAngle)}
          fill="none"
          stroke={colors.text}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.text}40)`,
          }}
        />
        {/* Score text */}
        <text
          x={center}
          y={center - (isLarge ? 4 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize={isLarge ? 28 : 16}
        >
          {formatRiskScore(score)}
        </text>
        <text
          x={center}
          y={center + (isLarge ? 22 : 14)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#9ca3af"
          fontFamily="var(--font-body)"
          fontWeight="400"
          fontSize={isLarge ? 11 : 9}
        >
          DROPOUT RISK
        </text>
      </svg>
    </div>
  );
}
