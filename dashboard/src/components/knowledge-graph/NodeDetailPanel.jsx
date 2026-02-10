import { X, User, Zap, CheckCircle2, Brain, BarChart3 } from 'lucide-react';
import { nodeIdToPatientId } from '../../utils/patientMapping';
import { NODE_COLORS } from '../../utils/knowledgeGraphData';

const typeIcons = {
  patient: User,
  intervention: Zap,
  outcome: CheckCircle2,
  crcLearning: Brain,
};

const typeLabels = {
  patient: 'Patient',
  intervention: 'Intervention',
  outcome: 'Outcome',
  crcLearning: 'CRC Learning',
};

function DetailRow({ label, value }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-200">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-[11px] text-gray-800 text-right">{String(value)}</span>
    </div>
  );
}

export default function NodeDetailPanel({ node, connectedEdges, onClose, onNavigateToDashboard }) {
  if (!node) return null;

  const Icon = typeIcons[node.type] || User;
  const color = NODE_COLORS[node.type] || '#506690';
  const data = node.data || {};

  return (
    <div className="animate-fade-in" style={{ animationDelay: '0s', opacity: 1 }}>
      <div className="card" style={{ padding: '14px' }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}
            >
              <Icon size={14} color={color} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 font-[family-name:var(--font-display)]">
                {data.label || node.id}
              </p>
              <p className="text-[10px] text-gray-400">{typeLabels[node.type]} &middot; Month {node.month}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
          >
            <X size={14} />
          </button>
        </div>

        {/* Type-specific details */}
        {node.type === 'patient' && (
          <>
            <DetailRow label="Site" value={data.site} />
            <DetailRow label="Risk" value={data.riskLevel} />
            <DetailRow label="Status" value={data.status} />
            <DetailRow label="Age" value={data.age} />
            <DetailRow label="Distance" value={data.distance ? `${data.distance} mi` : undefined} />
          </>
        )}

        {node.type === 'intervention' && (
          <>
            <DetailRow label="Category" value={data.category} />
            <DetailRow label="CRC" value={data.executedBy} />
            <DetailRow label="Site" value={data.site} />
          </>
        )}

        {node.type === 'outcome' && (
          <>
            <DetailRow label="Category" value={data.category} />
            <DetailRow label="Result" value={data.positive ? 'Positive' : 'Negative'} />
            <DetailRow label="Visit" value={data.visitWindow} />
          </>
        )}

        {node.type === 'crcLearning' && (
          <>
            <div className="py-2 border-b border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pattern</p>
              <p className="text-[11px] text-gray-800 leading-relaxed">{data.pattern}</p>
            </div>
            <DetailRow label="Confidence" value={`${Math.round((data.confidence || 0) * 100)}%`} />
            <DetailRow label="Sample Size" value={`n=${data.sampleSize}`} />
            <DetailRow label="Evidence Strength" value={`${Math.round((data.evidenceStrength || 0) * 100)}%`} />
            {data.derivedFrom?.length > 0 && (
              <div className="py-1.5 border-b border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Derived From</p>
                <div className="flex flex-wrap gap-1">
                  {data.derivedFrom.map((pid) => (
                    <span
                      key={pid}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-agent-blue)]/10 text-[var(--color-agent-blue)] border border-[var(--color-agent-blue)]/20"
                    >
                      {pid}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.appliedTo?.length > 0 && (
              <div className="py-1.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Applied To</p>
                <div className="flex flex-wrap gap-1">
                  {data.appliedTo.map((iid) => (
                    <span
                      key={iid}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-risk-medium)]/10 text-[var(--color-risk-medium)] border border-[var(--color-risk-medium)]/20"
                    >
                      {iid}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Connected edges count */}
        {connectedEdges && connectedEdges.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-400">
              {connectedEdges.length} connected edge{connectedEdges.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Cross-tab navigation for patient nodes */}
        {node.type === 'patient' && onNavigateToDashboard && nodeIdToPatientId(node.id) && (
          <button
            onClick={() => onNavigateToDashboard(nodeIdToPatientId(node.id))}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-agent-blue)]/10 text-[var(--color-agent-blue)] hover:bg-[var(--color-agent-blue)]/20 text-[11px] font-medium transition-colors cursor-pointer border border-[var(--color-agent-blue)]/20"
          >
            <BarChart3 size={12} /> View in Risk Monitor
          </button>
        )}
      </div>
    </div>
  );
}
