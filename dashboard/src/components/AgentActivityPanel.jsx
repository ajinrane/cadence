import { CheckCircle2, Loader2, PauseCircle, Bot } from 'lucide-react';
import { agentActivityLog } from '../utils/mockData';

const statusConfig = {
  completed: { icon: CheckCircle2, color: '#10b981', label: 'Done' },
  running: { icon: Loader2, color: '#3b82f6', label: 'Running' },
  awaiting: { icon: PauseCircle, color: '#f59e0b', label: 'Pending' },
};

export default function AgentActivityPanel() {
  return (
    <div className="card border-l-2" style={{ borderLeftColor: '#3b82f6' }}>
      <div className="flex items-center gap-2 mb-1">
        <Bot size={18} className="text-[var(--color-agent-blue)]" />
        <h3 className="text-sm font-semibold text-gray-900">
          Autonomous Agent Pipeline
        </h3>
        <span className="ml-auto text-[10px] font-medium font-[family-name:var(--font-mono)] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-agent-blue-bg)] text-[var(--color-agent-blue)]">
          Phase 2
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Agents handle routine work. CRCs focus on complex cases.
      </p>

      <div className="space-y-2.5">
        {agentActivityLog.map((task) => {
          const config = statusConfig[task.status];
          const Icon = config.icon;
          return (
            <div
              key={task.id}
              className="flex items-start gap-2.5 py-1.5"
            >
              <Icon
                size={15}
                className={`mt-0.5 shrink-0 ${task.status === 'running' ? 'agent-spin' : ''}`}
                style={{ color: config.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 leading-relaxed">
                  {task.message}
                </p>
              </div>
              <span
                className="text-[10px] font-[family-name:var(--font-mono)] shrink-0"
                style={{ color: config.color }}
              >
                {task.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
