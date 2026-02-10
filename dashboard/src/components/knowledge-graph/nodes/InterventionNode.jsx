import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

const categoryLabels = {
  reminder_call: 'Call',
  transport_assist: 'Transport',
  visit_window_adjust: 'Scheduling',
  caregiver_outreach: 'Caregiver',
};

export default function InterventionNode({ data, selected }) {
  const color = '#f59e0b';
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
        <Zap size={13} color={color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display)' }}>
          {data.label}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.3 }}>
        {categoryLabels[data.category] || data.category} &middot; {data.executedBy}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6, border: 'none' }} />
    </div>
  );
}
