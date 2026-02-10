import { User, Zap, CheckCircle2, Brain } from 'lucide-react';
import { NODE_COLORS } from '../../utils/knowledgeGraphData';

const items = [
  { type: 'patient', label: 'Patient', icon: User, color: NODE_COLORS.patient },
  { type: 'intervention', label: 'Intervention', icon: Zap, color: NODE_COLORS.intervention },
  { type: 'outcome', label: 'Outcome', icon: CheckCircle2, color: NODE_COLORS.outcome },
  { type: 'crcLearning', label: 'CRC Learning', icon: Brain, color: NODE_COLORS.crcLearning },
];

export default function GraphLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm flex items-center justify-center"
              style={{ background: `${item.color}20`, border: `1px solid ${item.color}50` }}
            >
              <Icon size={8} color={item.color} />
            </div>
            <span className="text-[10px] text-gray-500">{item.label}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-3 ml-2 pl-2 border-l border-gray-200">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 20, height: 2, background: '#9ca3af', borderRadius: 1 }} />
          <span className="text-[10px] text-gray-400">Weak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 20, height: 4, background: '#6b7280', borderRadius: 2, strokeDasharray: '4 2' }} />
          <span className="text-[10px] text-gray-400">Strong</span>
        </div>
      </div>
    </div>
  );
}
