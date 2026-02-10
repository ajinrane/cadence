import { useState, useRef, useEffect } from 'react';
import {
  Bot, X, Send, User, Clock, CheckCircle2, ChevronRight,
  Loader2, Sparkles, Network, Brain
} from 'lucide-react';
import { hasKGNode } from '../utils/patientMapping';
import AgentExecutionModal from './AgentExecutionModal';
import DesktopControlPreview from './DesktopControlPreview';

// ─── Mock Conversations ──────────────────────────────────────

const MOCK_CONVERSATIONS = {
  schedule: {
    content: 'I found 5 patients with overdue visits in NCT12345678:',
    patients: [
      { id: 'PT-0047', info: '14 days overdue' },
      { id: 'PT-0112', info: '8 days overdue' },
      { id: 'PT-0089', info: '21 days overdue' },
      { id: 'PT-0156', info: '5 days overdue' },
      { id: 'PT-0203', info: '12 days overdue' },
    ],
    workflow: [
      'Open scheduling system',
      'Check patient availability windows from EDC',
      'Book optimal time slots (respecting protocol visit windows)',
      'Send confirmation messages via patient preferences',
      'Log appointments in Medidata EDC',
    ],
    estimatedTime: '12 minutes',
  },
  call: {
    content: 'I identified 3 high-risk patients with transportation barriers:',
    patients: [
      { id: 'PT-0047', info: '45 miles away, 3 missed visits' },
      { id: 'PT-0112', info: '58 miles away, multiple no-shows' },
      { id: 'PT-0203', info: '42 miles away, flagged barrier' },
    ],
    workflow: [
      'Generate talking points based on each patient\'s risk factors',
      'Call patients via integrated phone system (all prefer phone contact)',
      'Offer ride service vouchers from approved budget',
      'Log conversation outcomes and patient responses in EDC',
      'Update patient dropout risk scores if barriers resolved',
    ],
    estimatedTime: '35 minutes',
  },
  update: {
    content: 'I found protocol amendment v3.2 in your inbox from Dr. Martinez (received 2 hours ago).',
    patients: null,
    workflow: [
      'Download PDF attachment: Protocol_Amendment_v3.2.pdf',
      'Save to SharePoint: /Trials/NCT12345678/Protocol/Amendments/',
      'Update version control log in Excel tracker',
      'Archive previous version (v3.1) to /Archive folder',
      'Send notification email to study team (5 members)',
      'Mark "Protocol Update" task complete in workflow tracker',
    ],
    estimatedTime: '3 minutes',
  },
  reschedule: {
    content: 'I\'ll handle the reschedule for PT-0047. Current appointment: Tomorrow 2:00 PM (Visit 5 \u2014 Week 12 Assessment).',
    patients: null,
    workflow: [
      'Check patient\'s calendar preferences (prefers afternoons, Tue\u2013Thu)',
      'Find next available slot within protocol window (\u00b13 days allowed)',
      'Verify lab scheduling for required bloodwork (fasting required)',
      'Cancel current appointment in scheduling system',
      'Book new appointment: Tuesday, Feb 11, 3:00 PM',
      'Send confirmation text to patient (prefers text over email)',
      'Update visit schedule in Medidata EDC',
      'Notify PI of schedule change via team Slack',
      'Log interaction notes with reason for reschedule',
    ],
    estimatedTime: '4 minutes',
  },
  compliance: {
    content: 'I\'ve compiled the compliance status across all 3 active trials:',
    patients: null,
    workflow: [
      'Pull IRB approval status from regulatory database',
      'Check protocol deviation log (2 open deviations in NCT12345678)',
      'Verify informed consent completion rates (98.2% across all sites)',
      'Review monitoring visit schedule — next visit March 3, 2025',
      'Generate compliance summary report (PDF)',
      'Flag 1 overdue CAPA item for PI review',
    ],
    estimatedTime: '5 minutes',
  },
  summary: {
    content: 'Here\'s today\'s patient visit summary across all sites:',
    patients: [
      { id: 'PT-0047', info: 'Visit 5 completed — labs normal' },
      { id: 'PT-0089', info: 'Visit 3 rescheduled to Feb 12' },
      { id: 'PT-0156', info: 'Screening visit — eligible, consented' },
      { id: 'PT-0203', info: 'Visit 7 — missed, attempting contact' },
    ],
    workflow: [
      'Aggregate visit records from all 3 EDC systems',
      'Cross-reference with scheduled appointments',
      'Flag discrepancies (1 visit not yet entered in EDC)',
      'Generate daily visit summary email for PI',
      'Update dashboard metrics',
    ],
    estimatedTime: '2 minutes',
  },
  agenda: {
    content: 'I\'ve drafted the PI meeting agenda for next Tuesday based on recent trial activity:',
    patients: null,
    workflow: [
      'Review last meeting minutes and open action items (3 pending)',
      'Compile enrollment update: 42/50 target recruited',
      'Summarize safety data: 2 new AEs (both Grade 1, expected)',
      'Draft protocol deviation discussion points',
      'Prepare site performance comparison slides',
      'Send draft agenda to Dr. Martinez for review',
      'Book conference room B-204 (confirmed available)',
    ],
    estimatedTime: '8 minutes',
  },
  adverse: {
    content: 'I\'ve reviewed the adverse event log for all active trials in the last 30 days:',
    patients: [
      { id: 'PT-0135', info: 'Grade 1 headache — resolved, expected' },
      { id: 'PT-0089', info: 'Grade 2 fatigue — ongoing, possibly related' },
      { id: 'PT-0047', info: 'Grade 1 nausea — resolved, not related' },
    ],
    workflow: [
      'Pull AE records from EDC safety module',
      'Cross-reference with known drug side effects (FDA label)',
      'Identify any SAEs requiring expedited reporting (0 found)',
      'Update cumulative AE summary table',
      'Check if any AEs trigger stopping rules (none triggered)',
      'Generate safety narrative for DSMB review',
    ],
    estimatedTime: '6 minutes',
  },
  enrollment: {
    content: 'Current enrollment status across all trials:',
    patients: null,
    workflow: [
      'Pull screening logs from all 3 sites',
      'Calculate screen-to-enroll conversion rate (72%)',
      'Identify recruitment bottlenecks: Site B behind by 4 patients',
      'Draft targeted recruitment email for referring physicians',
      'Update enrollment tracker and projections',
      'Estimate completion date: August 2025 (on track)',
    ],
    estimatedTime: '4 minutes',
  },
};

const QUICK_EXAMPLES = [
  'Schedule all overdue visits',
  'Call high-risk patients',
  'Check compliance status',
  'Summarize today\'s patient visits',
  'Draft PI meeting agenda',
  'Review adverse events',
];

function matchMockKey(text) {
  const lower = text.toLowerCase();
  if (lower.includes('reschedule')) return 'reschedule';
  if (lower.includes('call') || lower.includes('phone') || lower.includes('outreach')) return 'call';
  if (lower.includes('compliance') || lower.includes('irb') || lower.includes('regulatory')) return 'compliance';
  if (lower.includes('summary') || lower.includes('summarize') || lower.includes('visit')) return 'summary';
  if (lower.includes('agenda') || lower.includes('meeting') || lower.includes('pi meeting')) return 'agenda';
  if (lower.includes('adverse') || lower.includes('safety') || lower.includes('ae')) return 'adverse';
  if (lower.includes('enrollment') || lower.includes('recruit') || lower.includes('screening')) return 'enrollment';
  if (lower.includes('update') || lower.includes('binder') || lower.includes('protocol') || lower.includes('document')) return 'update';
  return 'schedule';
}

// ─── Component ───────────────────────────────────────────────

export default function CommandCenter({ onNavigateToKG }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [executedIds, setExecutedIds] = useState(new Set());
  const [executionModal, setExecutionModal] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [lastMockKey, setLastMockKey] = useState('schedule');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  function sendCommand(text) {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate agent "thinking" delay
    setTimeout(() => {
      const key = matchMockKey(text);
      setLastMockKey(key);
      const mock = MOCK_CONVERSATIONS[key];
      const agentMsg = {
        id: Date.now() + 1,
        role: 'agent',
        ...mock,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setIsTyping(false);
    }, 1200);
  }

  function handleSend() {
    sendCommand(inputValue);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleExecute(msg) {
    setExecutedIds((prev) => new Set(prev).add(msg.id));
    setExecutionModal(lastMockKey);
  }

  function handleReview() {
    setDesktopPreview(lastMockKey);
  }

  return (
    <>
      {/* ── Floating Button ──────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
        >
          <Bot size={24} />
          {/* Phase 2 badge */}
          <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold uppercase tracking-wider bg-purple-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
            P2
          </span>
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full border-2 border-blue-400 agent-pulse pointer-events-none" />
        </button>
      )}

      {/* ── Chat Panel ───────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[110] w-[420px] h-[650px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Bot size={15} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 font-[family-name:var(--font-display)]">
                  Talk to Cadence
                </h3>
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  Phase 2 Preview
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Give commands in natural language. Agents execute across all your systems.
            </p>
          </div>

          {/* Quick Examples (show when no messages) */}
          {messages.length === 0 && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Try these commands
              </p>
              <div className="flex flex-col gap-1">
                {QUICK_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => sendCommand(example)}
                    className="text-left text-sm text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2 group"
                  >
                    <Sparkles size={12} className="text-blue-400 group-hover:text-blue-600 transition-colors shrink-0" />
                    <span>&ldquo;{example}&rdquo;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              msg.role === 'user' ? (
                <UserBubble key={msg.id} content={msg.content} />
              ) : (
                <AgentBubble
                  key={msg.id}
                  msg={msg}
                  executed={executedIds.has(msg.id)}
                  onExecute={() => handleExecute(msg)}
                  onReview={handleReview}
                  onNavigateToKG={onNavigateToKG}
                />
              )
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-xl rounded-tl-none shadow-sm">
                  <div className="flex items-center gap-2">
                    <Bot size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-500">Cadence is analyzing...</span>
                    <Loader2 size={12} className="text-blue-500 agent-spin" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="px-3.5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Modal */}
      <AgentExecutionModal
        isOpen={!!executionModal}
        onClose={() => setExecutionModal(null)}
        workflowKey={executionModal || 'schedule'}
      />

      {/* Desktop Control Preview */}
      <DesktopControlPreview
        isOpen={!!desktopPreview}
        onClose={() => setDesktopPreview(null)}
        workflowKey={desktopPreview || 'schedule'}
      />
    </>
  );
}

// ─── Message Bubbles ─────────────────────────────────────────

function UserBubble({ content }) {
  return (
    <div className="flex justify-end">
      <div className="bg-blue-600 text-white px-4 py-2.5 rounded-xl rounded-tr-sm max-w-[82%] shadow-sm">
        <div className="flex items-center gap-1.5 mb-1">
          <User size={11} />
          <span className="text-[10px] font-medium opacity-80">You</span>
        </div>
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}

function AgentBubble({ msg, executed, onExecute, onReview, onNavigateToKG }) {
  const kgPatients = msg.patients?.filter((p) => hasKGNode(p.id)) || [];
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 px-4 py-3.5 rounded-xl rounded-tl-sm max-w-[88%] shadow-sm">
        {/* Agent header */}
        <div className="flex items-center gap-1.5 mb-2">
          <Bot size={13} className="text-blue-600" />
          <span className="text-[11px] font-semibold text-gray-900">Cadence</span>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          {msg.content}
        </p>

        {/* Patient list */}
        {msg.patients && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-100">
            <p className="text-xs font-semibold text-gray-800 mb-2">Found patients:</p>
            <ul className="space-y-1.5">
              {msg.patients.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs text-gray-700">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                  <span className="font-[family-name:var(--font-mono)] font-medium">{p.id}</span>
                  <span className="text-gray-400">&mdash;</span>
                  <span>{p.info}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Workflow steps */}
        {msg.workflow && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
            <p className="text-xs font-semibold text-gray-800 mb-2">Workflow:</p>
            <ol className="space-y-1.5">
              {msg.workflow.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="font-semibold text-blue-600 shrink-0 w-4 text-right">{i + 1}.</span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Knowledge Graph Insight */}
        {kgPatients.length > 0 && onNavigateToKG && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3 border border-purple-100">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain size={12} className="text-purple-600" />
              <span className="text-[11px] font-semibold text-purple-800">Knowledge Graph Insight</span>
            </div>
            <p className="text-xs text-purple-700 leading-relaxed mb-2">
              Transport assistance reduces dropout by 83% across sites. View intervention patterns for deeper context.
            </p>
            {kgPatients.map((p) => (
              <button
                key={p.id}
                onClick={() => onNavigateToKG(p.id)}
                className="flex items-center gap-1 text-[11px] font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-100 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                <Network size={11} /> View {p.id} in Knowledge Graph
              </button>
            ))}
          </div>
        )}

        {/* Estimated time */}
        {msg.estimatedTime && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-3">
            <Clock size={11} />
            <span>Estimated time: <span className="font-medium text-gray-600">{msg.estimatedTime}</span></span>
          </div>
        )}

        {/* Action buttons */}
        {executed ? (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Agent executing workflow...</span>
            <Loader2 size={12} className="text-emerald-500 agent-spin ml-auto" />
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onExecute}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Execute Now <ChevronRight size={12} />
            </button>
            <button
              onClick={onReview}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Review Steps
            </button>
            <button className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 cursor-pointer transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
