import { Calendar, Shield, ClipboardCheck, Network, Bot } from 'lucide-react';
import { agentWorkflows } from '../utils/mockData';

const iconMap = {
  calendar: Calendar,
  shield: Shield,
  clipboard: ClipboardCheck,
  network: Network,
};

export default function AgentWorkflowPreview() {
  return (
    <div className="card border border-dashed border-gray-300">
      <div className="flex items-center gap-2 mb-1">
        <Bot size={16} className="text-[var(--color-agent-purple)]" />
        <h3 className="text-sm font-semibold text-gray-900">
          Agent Capabilities
        </h3>
        <span className="text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-agent-purple)]/10 text-[var(--color-agent-purple)]">
          In Development
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Phase 2: Full autonomous execution across CRC workflows
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {agentWorkflows.map((workflow, i) => {
          const Icon = iconMap[workflow.icon] || Bot;
          return (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-agent-purple)]/8 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-[var(--color-agent-purple)]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800 mb-0.5">
                  {workflow.title}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {workflow.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
