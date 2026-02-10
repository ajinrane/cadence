import { useState } from 'react';
import { FileText, Bot, Plus } from 'lucide-react';
import { interventionHistory } from '../utils/mockData';

const interventionTypes = [
  'Ride Service',
  'Flexible Scheduling',
  'Phone Outreach',
  'Caregiver Engagement',
  'Protocol Simplification',
  'Financial Assistance',
  'Other',
];

export default function InterventionLog({ patientId }) {
  const [notes, setNotes] = useState('');
  const [type, setType] = useState(interventionTypes[0]);
  const [allowAgent, setAllowAgent] = useState(true);
  const [entries, setEntries] = useState(interventionHistory);

  function handleLog() {
    if (!notes.trim()) return;
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      crc: 'You',
      type,
      patient: patientId,
      outcome: notes,
      agentExecutable: allowAgent,
    };
    setEntries([newEntry, ...entries]);
    setNotes('');
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={16} className="text-[var(--color-agent-blue)]" />
        <h3 className="text-sm font-semibold text-gray-900">
          Document & Train the System
        </h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Your interventions strengthen the knowledge base
      </p>

      {/* Input form */}
      <div className="space-y-3 mb-5">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the intervention and outcome..."
          rows={3}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-agent-blue)] transition-colors resize-none"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[var(--color-agent-blue)] cursor-pointer"
          >
            {interventionTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowAgent}
              onChange={(e) => setAllowAgent(e.target.checked)}
              className="accent-[var(--color-agent-cyan)]"
            />
            Allow agents to replicate this approach
          </label>
          <button
            onClick={handleLog}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-agent-blue)] text-white text-sm font-medium hover:bg-[var(--color-agent-blue)]/80 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Log & Learn
          </button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-2">
        {entries.slice(0, 5).map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-700">{entry.crc}</span>
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {entry.type}
                </span>
                <span className="text-[10px] text-gray-300">|</span>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-gray-400">
                  {entry.patient}
                </span>
                {entry.agentExecutable && (
                  <span className="flex items-center gap-0.5 text-[9px] font-medium text-[var(--color-agent-cyan)] bg-[var(--color-agent-cyan)]/10 px-1.5 py-0.5 rounded-full ml-auto">
                    <Bot size={8} /> Agent-executable
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{entry.outcome}</p>
              <p className="text-[10px] font-[family-name:var(--font-mono)] text-gray-400 mt-1">
                {entry.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
