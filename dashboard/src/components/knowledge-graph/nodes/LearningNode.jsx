import { Handle, Position } from '@xyflow/react';
import { Brain } from 'lucide-react';

export default function LearningNode({ data, selected }) {
  const color = '#8b5cf6';
  const isNew = data._isCurrentMonth;
  const isPruneTarget = data._isPruneTarget;
  const isActive = data._isHighlighted || selected;

  return (
    <div
      className={`kg-node${isNew ? ' kg-learning-pulse' : ''}${isPruneTarget ? ' kg-prune-target' : ''}`}
      style={{
        width: 170,
        background: '#ffffff',
        border: `1.5px solid ${isActive ? color : '#e5e7eb'}`,
        borderLeft: `3.5px solid ${color}`,
        borderRadius: 10,
        padding: '8px 10px',
        boxShadow: isActive
          ? `0 0 14px ${color}40`
          : isNew
            ? `0 0 10px ${color}25`
            : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.3s, border-color 0.2s, opacity 0.4s, transform 0.4s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Brain size={13} color={color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
          {data.label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6b7280' }}>
        <span>{Math.round((data.confidence || 0) * 100)}% conf</span>
        <span>&middot;</span>
        <span>n={data.sampleSize || 0}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}
