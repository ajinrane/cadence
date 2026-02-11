import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Types ───────────────────────────────────────────────────────────────
const MessageRole = { USER: "user", AGENT: "agent", SYSTEM: "system" };

// ── API ─────────────────────────────────────────────────────────────────
async function sendMessage(message, context = null) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function resetChat() {
  await fetch(`${API_BASE}/api/chat/reset`, { method: "POST" });
}

async function getUsage() {
  const res = await fetch(`${API_BASE}/api/usage`);
  return res.json();
}

// ── Components ──────────────────────────────────────────────────────────

function RiskBadge({ level }) {
  const styles = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${styles[level] || styles.low}`}>
      {level}
    </span>
  );
}

function PatientCard({ patient }) {
  const risk = patient.dropout_risk_score || 0;
  const level = risk >= 0.7 ? "high" : risk >= 0.4 ? "medium" : "low";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 mb-2 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-slate-800 text-sm">{patient.name || patient.patient_id}</span>
        <RiskBadge level={level} />
      </div>
      <div className="text-xs text-slate-500 mb-1.5">
        {patient.patient_id} · {patient.trial_name || patient.trial_id}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-600">
        <span>Risk: {(risk * 100).toFixed(0)}%</span>
        {patient.next_visit_date && <span>Next visit: {patient.next_visit_date}</span>}
      </div>
      {patient.risk_factors?.length > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          <span className="text-slate-400">Top factor:</span> {patient.risk_factors[0]}
        </div>
      )}
      {patient.recommended_actions?.length > 0 && (
        <div className="mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
          → {patient.recommended_actions[0]}
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }) {
  const icons = {
    query_patients: "🔍",
    get_risk_scores: "📊",
    schedule_visit: "📅",
    log_intervention: "📝",
    send_reminder: "📱",
    search_knowledge: "📋",
    get_trial_info: "🧪",
    get_patient_timeline: "📈",
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
      {icons[action.type] || "⚡"} {action.description || action.type}
    </span>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : "order-1"}`}>
        {/* Avatar + Name */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : ""}`}>
          {!isUser && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
          )}
          <span className="text-xs font-medium text-slate-400">
            {isUser ? "You" : "Cadence"}
          </span>
          {message.meta?.latency_ms && (
            <span className="text-[10px] text-slate-300">{message.meta.latency_ms}ms</span>
          )}
        </div>

        {/* Content */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-white border border-slate-200 text-slate-700 rounded-bl-md shadow-sm"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Actions taken */}
        {message.actions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.actions.map((a, i) => (
              <ActionBadge key={i} action={a} />
            ))}
          </div>
        )}

        {/* Patient cards */}
        {message.data?.map((dataset, di) =>
          Array.isArray(dataset)
            ? dataset.slice(0, 5).map((item, i) =>
                item.patient_id ? (
                  <PatientCard key={`${di}-${i}`} patient={item} />
                ) : null
              )
            : null
        )}

        {/* Pending approval */}
        {message.pendingActions?.length > 0 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700 mb-2">⚠️ Needs your approval:</p>
            {message.pendingActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-600">{a.description}</span>
                <button className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded transition-colors">
                  Approve
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cost tracking */}
        {message.meta?.cost_usd > 0 && (
          <div className="text-[10px] text-slate-300 mt-1">
            ${message.meta.cost_usd.toFixed(4)} · {message.meta.model}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedQueries({ onSelect }) {
  const queries = [
    "Show me all high-risk patients",
    "Which patients have overdue visits?",
    "What retention strategies work for NASH trials?",
    "Give me a summary of the CARDIO-GLP1 trial",
    "Who needs a follow-up call this week?",
  ];
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {queries.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-blue-300 hover:text-blue-600 transition-all"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function UsageBar({ usage }) {
  if (!usage) return null;
  return (
    <div className="flex items-center gap-4 text-[10px] text-slate-400 px-4 py-1 border-t border-slate-100 bg-slate-50">
      <span>{usage.total_requests} requests</span>
      <span>{(usage.total_input_tokens + usage.total_output_tokens).toLocaleString()} tokens</span>
      <span>${usage.total_cost_usd?.toFixed(4)} spent</span>
    </div>
  );
}

// ── Main Chat Component ─────────────────────────────────────────────────

export default function CadenceChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check API connection
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.json())
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refresh usage
  const refreshUsage = useCallback(async () => {
    try {
      const data = await getUsage();
      setUsage(data);
    } catch {}
  }, []);

  const handleSend = useCallback(
    async (text = null) => {
      const messageText = text || input.trim();
      if (!messageText || isLoading) return;

      const userMsg = { role: MessageRole.USER, content: messageText };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const result = await sendMessage(messageText);
        const agentMsg = {
          role: MessageRole.AGENT,
          content: result.response,
          actions: result.actions_taken,
          data: result.data,
          pendingActions: result.pending_actions,
          meta: result.meta,
        };
        setMessages((prev) => [...prev, agentMsg]);
        refreshUsage();
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: MessageRole.SYSTEM,
            content: `Error: ${err.message}. Make sure the backend is running.`,
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, isLoading, refreshUsage]
  );

  const handleReset = async () => {
    await resetChat();
    setMessages([]);
    setUsage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 leading-tight">Cadence</h1>
            <p className="text-xs text-slate-400">CRC Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${isConnected ? "text-emerald-600" : "text-red-500"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-all"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">Hey, what can I help with?</h2>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              I can help you manage patients, check risk scores, find retention strategies, and keep your trials running smoothly.
            </p>
            <SuggestedQueries onSelect={(q) => handleSend(q)} />
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Usage bar */}
      <UsageBar usage={usage} />

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-slate-200">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about patients, risk scores, or retention strategies..."
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
            rows={1}
            style={{ minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              e.target.style.height = "44px";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-11 px-5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
