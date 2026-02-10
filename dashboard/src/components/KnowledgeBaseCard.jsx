import { Brain, Bot } from 'lucide-react';
import { knowledgeBaseInterventions } from '../utils/mockData';

export default function KnowledgeBaseCard() {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={16} className="text-[var(--color-agent-purple)]" />
        <h3 className="text-sm font-semibold text-gray-900">
          Institutional Knowledge Base
        </h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Learned from 200+ CRC interventions across sites
      </p>

      <div className="space-y-3">
        {knowledgeBaseInterventions.map((item, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-900">{item.name}</span>
              {item.agentExecutable && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-agent-cyan)] bg-[var(--color-agent-cyan)]/10 px-1.5 py-0.5 rounded-full">
                  <Bot size={9} /> Agent can execute
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-1.5">
              {/* Success rate bar */}
              <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.successRate * 100}%`,
                    background: `linear-gradient(90deg, #10b981, #34d399)`,
                  }}
                />
              </div>
              <span className="text-xs font-[family-name:var(--font-mono)] font-semibold text-[var(--color-risk-low)]">
                {(item.successRate * 100).toFixed(0)}%
              </span>
            </div>

            <p className="text-[10px] text-gray-400">
              n={item.sampleSize} across {item.sites} sites
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
