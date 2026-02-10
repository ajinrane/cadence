import { useState } from 'react';
import { Zap, CheckCircle2, Shield } from 'lucide-react';

const executionModes = ['Auto-Execute', 'Requires Approval', 'Manual Only'];

export default function AgentActionCard({ action, index }) {
  const [mode, setMode] = useState(
    action.autoExecute ? 'Auto-Execute' : 'Requires Approval'
  );

  const isHigh = action.priority === 'HIGH PRIORITY';

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isHigh
          ? 'border-[var(--color-risk-high-border)] bg-[var(--color-risk-high-bg)]'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isHigh
                  ? 'bg-[var(--color-risk-high)]/15 text-[var(--color-risk-high)]'
                  : 'bg-[var(--color-risk-medium)]/15 text-[var(--color-risk-medium)]'
              }`}
            >
              {action.priority}
            </span>
            {mode === 'Auto-Execute' && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-agent-cyan)] bg-[var(--color-agent-cyan)]/10 px-2 py-0.5 rounded-full">
                <Zap size={9} /> Auto-Execute
              </span>
            )}
          </div>

          <p className="text-sm text-gray-800 font-medium leading-snug mb-2">
            {action.description}
          </p>

          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Shield size={10} />
            {action.evidence}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
        {/* Execution mode toggle */}
        <div className="flex items-center gap-1">
          {executionModes.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                mode === m
                  ? m === 'Auto-Execute'
                    ? 'bg-[var(--color-agent-cyan)]/15 text-[var(--color-agent-cyan)]'
                    : 'bg-gray-200 text-gray-800'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Action button */}
        {mode === 'Auto-Execute' ? (
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-risk-low)]/15 text-[var(--color-risk-low)] text-xs font-medium hover:bg-[var(--color-risk-low)]/25 transition-colors cursor-pointer">
            <CheckCircle2 size={12} /> Approve Agent Action
          </button>
        ) : (
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-agent-blue)]/15 text-[var(--color-agent-blue)] text-xs font-medium hover:bg-[var(--color-agent-blue)]/25 transition-colors cursor-pointer">
            <Zap size={12} /> Execute Manually
          </button>
        )}
      </div>
    </div>
  );
}
