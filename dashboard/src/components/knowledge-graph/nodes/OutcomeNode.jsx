import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function OutcomeNode({ data, selected }) {
  const positive = data.positive !== false;
  const color = positive ? '#10b981' : '#ef4444';
  const Icon = positive ? CheckCircle2 : AlertTriangle;
  const isActive = data._isHighlighted || selected;

  return (
    <div
      className="kg-node"
      style={{
        width: 160,
        background: '#ffffff',
        border: `1.5px solid ${isActive ? color : '#e5e7eb'}`,
        borderLeft: `3.5px solid ${color}`,
        borderRadius: 10,
        padding: '8px 10px',
        boxShadow: isActive ? `0 0 14px ${color}40` : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={13} color={color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display)' }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.3 }}>
        {data.category} &middot; {data.visitWindow}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}
