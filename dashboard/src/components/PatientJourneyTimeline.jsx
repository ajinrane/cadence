import { useState, useMemo } from 'react';
import {
  UserPlus, Calendar, AlertTriangle, Bot, CheckCircle2,
  XCircle, Phone, Car, ArrowRight, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Activity
} from 'lucide-react';

// ── Mock journey data per patient ──────────────────────────────────
const JOURNEYS = {
  'PT-0047': [
    { month: 1, day: 3,  type: 'enrollment', label: 'Enrolled in TRIAL-042',                  detail: 'Consent signed. Baseline labs drawn. Randomized to treatment arm.' },
    { month: 1, day: 10, type: 'visit',      label: 'Visit 1 — Screening complete',            detail: 'All inclusion criteria met. No comorbidity flags.' },
    { month: 2, day: 5,  type: 'visit',      label: 'Visit 2 — On schedule',                   detail: 'Vital signs stable. Medication adherence confirmed.' },
    { month: 3, day: 8,  type: 'visit',      label: 'Visit 3 — On schedule',                   detail: 'Lab values within normal range.' },
    { month: 4, day: 2,  type: 'risk',       label: 'Risk score ↑ 0.03 → 0.12',               detail: 'Missed 1 phone check-in. Flagged for monitoring.', risk: 0.12 },
    { month: 4, day: 6,  type: 'agent',      label: 'Agent: Proactive outreach call',           detail: 'Automated check-in call. Patient confirmed next visit.' },
    { month: 4, day: 14, type: 'visit',      label: 'Visit 4 — On schedule',                   detail: 'Reported mild side effects, managed with OTC medication.' },
    { month: 5, day: 9,  type: 'visit',      label: 'Visit 5 — On schedule',                   detail: 'Side effects resolved. Good compliance.' },
    { month: 6, day: 4,  type: 'visit',      label: 'Visit 6 — Mid-study checkpoint',          detail: 'Interim analysis: responding well to treatment.' },
    { month: 7, day: 7,  type: 'risk',       label: 'Risk score ↓ 0.12 → 0.05',               detail: 'Consistent attendance. Strong engagement signals.', risk: 0.05 },
    { month: 7, day: 12, type: 'visit',      label: 'Visit 7 — On schedule',                   detail: 'All endpoints on track.' },
    { month: 8, day: 6,  type: 'visit',      label: 'Visit 8 — On schedule',                   detail: 'Caregiver accompanied patient. Positive feedback.' },
    { month: 9, day: 11, type: 'visit',      label: 'Visit 9 — On schedule',                   detail: 'Lab values stable. No adverse events.' },
    { month: 10, day: 3, type: 'visit',      label: 'Visit 10 — On schedule',                  detail: 'Protocol adherence at 100%.' },
    { month: 11, day: 8, type: 'visit',      label: 'Visit 11 — On schedule',                  detail: 'Nearing study completion.' },
    { month: 11, day: 20, type: 'risk',      label: 'Risk score → 0.07 (stable low)',          detail: 'Model confidence: high retention likely.', risk: 0.07 },
    { month: 12, day: 5, type: 'visit',      label: 'Visits 12–14 — Completed on schedule',    detail: 'Final study visits completed. 14/17 visits done.' },
    { month: 12, day: 15, type: 'outcome',   label: 'Retained — Study completion on track',     detail: 'Patient remains active. Exemplary engagement throughout trial.' },
  ],
  'PT-0112': [
    { month: 1, day: 5,  type: 'enrollment', label: 'Enrolled in TRIAL-019',                   detail: 'Consent signed. Lives 55.4 mi from site. Transportation flagged.' },
    { month: 1, day: 15, type: 'visit',      label: 'Visit 1 — Screening complete',            detail: 'Baseline established. Noted long commute as concern.' },
    { month: 2, day: 10, type: 'missed',     label: 'Visit 2 — MISSED',                        detail: 'Patient cited car trouble. No backup transportation.' },
    { month: 2, day: 14, type: 'risk',       label: 'Risk score ↑ 0.15 → 0.38',               detail: 'First missed visit + distance from site driving risk up.', risk: 0.38 },
    { month: 2, day: 16, type: 'agent',      label: 'Agent: Ride service coordination',         detail: 'Automated outreach to arrange transportation assistance.' },
    { month: 3, day: 3,  type: 'visit',      label: 'Visit 2 — Rescheduled & completed',       detail: 'Ride service arranged successfully. Visit completed.' },
    { month: 3, day: 20, type: 'visit',      label: 'Visit 3 — On schedule',                   detail: 'Used ride service. Adherence improving.' },
    { month: 4, day: 8,  type: 'missed',     label: 'Visit 4 — MISSED',                        detail: 'Ride service unavailable. Patient unreachable by phone.' },
    { month: 4, day: 12, type: 'risk',       label: 'Risk score ↑ 0.38 → 0.56',               detail: 'Second missed visit. Contact gap growing.', risk: 0.56 },
    { month: 4, day: 14, type: 'agent',      label: 'Agent: Escalated — CRC manual outreach',   detail: 'Automated methods exhausted. Flagged for human follow-up.' },
    { month: 5, day: 1,  type: 'intervention', label: 'CRC home visit attempted',               detail: 'CRC drove to patient location. Patient not home.' },
    { month: 5, day: 20, type: 'risk',       label: 'Risk score ↑ 0.56 → 0.71',               detail: '45+ days since last contact. Model predicts likely dropout.', risk: 0.71 },
    { month: 6, day: 1,  type: 'missed',     label: 'Visits 5–6 — MISSED',                     detail: 'No contact for 66 days. All outreach attempts unsuccessful.' },
    { month: 6, day: 15, type: 'outcome',    label: 'DROPPED OUT — Lost to follow-up',          detail: 'Patient unreachable. Formally classified as dropout. 3/18 visits completed.' },
  ],
  'PT-0089': [
    { month: 1, day: 7,  type: 'enrollment', label: 'Enrolled in TRIAL-042',                   detail: 'Previous trial experience. Consent signed. Strong engagement signals.' },
    { month: 1, day: 18, type: 'visit',      label: 'Visit 1 — Screening complete',            detail: 'All criteria met. Prior trial participant — familiar with protocol.' },
    { month: 2, day: 12, type: 'visit',      label: 'Visit 2 — On schedule',                   detail: 'Vitals stable. Medication well-tolerated.' },
    { month: 3, day: 8,  type: 'visit',      label: 'Visit 3 — On schedule',                   detail: 'Consistent attendance. Positive attitude noted.' },
    { month: 4, day: 5,  type: 'visit',      label: 'Visit 4 — On schedule',                   detail: 'Lab values normal. No side effects reported.' },
    { month: 5, day: 10, type: 'visit',      label: 'Visit 5 — On schedule',                   detail: 'Mid-study — all endpoints progressing well.' },
    { month: 5, day: 15, type: 'risk',       label: 'Risk score stable at 0.037',              detail: 'Model: lowest-risk quintile. Previous trial experience a strong predictor.', risk: 0.037 },
    { month: 6, day: 7,  type: 'visit',      label: 'Visit 6 — On schedule',                   detail: 'Caregiver support confirmed. Patient highly motivated.' },
    { month: 7, day: 9,  type: 'visit',      label: 'Visit 7 — On schedule',                   detail: '7/18 visits completed. On track for full completion.' },
  ],
};

// Generate a basic timeline for patients without custom data
function generateDefaultJourney(patient) {
  const events = [
    {
      month: 1, day: 1, type: 'enrollment',
      label: `Enrolled in ${patient.trial_id || 'trial'}`,
      detail: 'Consent signed. Baseline assessments completed.',
    },
  ];

  const completed = patient.completed_visits || 0;
  const missed = patient.missed_visits || 0;

  for (let i = 1; i <= Math.min(completed, 6); i++) {
    events.push({
      month: Math.ceil(i * 1.5),
      day: 5 + i * 2,
      type: 'visit',
      label: `Visit ${i} — Completed`,
      detail: 'Scheduled visit completed successfully.',
    });
  }

  if (missed > 0) {
    events.push({
      month: Math.ceil((completed + 1) * 1.5),
      day: 10,
      type: 'missed',
      label: `${missed} visit(s) missed`,
      detail: `Patient has ${missed} missed visit(s) on record.`,
    });
  }

  if (patient.dropout_risk > 0.5) {
    events.push({
      month: Math.ceil((completed + missed) * 1.2),
      day: 15,
      type: 'risk',
      label: `Risk score at ${patient.dropout_risk.toFixed(2)}`,
      detail: 'ML model flagged elevated dropout risk.',
      risk: patient.dropout_risk,
    });
    events.push({
      month: Math.ceil((completed + missed) * 1.2),
      day: 18,
      type: 'agent',
      label: 'Agent: Intervention recommended',
      detail: 'Automated system generating intervention plan.',
    });
  }

  if (patient.status === 'dropped_out') {
    events.push({
      month: Math.ceil((completed + missed + 1) * 1.5),
      day: 20,
      type: 'outcome',
      label: 'DROPPED OUT',
      detail: 'Patient lost to follow-up.',
    });
  }

  return events;
}

// ── Styling per event type ─────────────────────────────────────────
const EVENT_STYLES = {
  enrollment: { icon: UserPlus,       bg: 'bg-blue-100',   text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500' },
  visit:      { icon: Calendar,       bg: 'bg-emerald-50', text: 'text-emerald-700',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  missed:     { icon: XCircle,        bg: 'bg-red-50',     text: 'text-red-700',      border: 'border-red-200',    dot: 'bg-red-500' },
  risk:       { icon: AlertTriangle,  bg: 'bg-amber-50',   text: 'text-amber-700',    border: 'border-amber-200',  dot: 'bg-amber-500' },
  agent:      { icon: Bot,            bg: 'bg-cyan-50',    text: 'text-cyan-700',     border: 'border-cyan-200',   dot: 'bg-cyan-500' },
  intervention: { icon: Phone,        bg: 'bg-purple-50',  text: 'text-purple-700',   border: 'border-purple-200', dot: 'bg-purple-500' },
  outcome:    { icon: CheckCircle2,   bg: 'bg-gray-50',    text: 'text-gray-700',     border: 'border-gray-300',   dot: 'bg-gray-500' },
};

// ── Risk sparkline (tiny inline chart) ─────────────────────────────
function RiskSparkline({ events }) {
  const riskPoints = events.filter((e) => e.risk != null);
  if (riskPoints.length < 2) return null;

  const width = 200;
  const height = 32;
  const padding = 4;

  const maxMonth = Math.max(...riskPoints.map((p) => p.month));
  const minMonth = Math.min(...riskPoints.map((p) => p.month));
  const range = maxMonth - minMonth || 1;

  const points = riskPoints.map((p) => {
    const x = padding + ((p.month - minMonth) / range) * (width - 2 * padding);
    const y = height - padding - p.risk * (height - 2 * padding);
    return `${x},${y}`;
  });

  const lastRisk = riskPoints[riskPoints.length - 1].risk;
  const color = lastRisk > 0.5 ? '#ef4444' : lastRisk > 0.3 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">Risk trend</span>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {riskPoints.map((p, i) => {
          const x = padding + ((p.month - minMonth) / range) * (width - 2 * padding);
          const y = height - padding - p.risk * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r={3} fill={color} />;
        })}
        {/* Threshold line at 0.5 */}
        <line
          x1={0} y1={height - padding - 0.5 * (height - 2 * padding)}
          x2={width} y2={height - padding - 0.5 * (height - 2 * padding)}
          stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3"
        />
      </svg>
      <span className="text-[10px] font-semibold font-[family-name:var(--font-mono)]" style={{ color }}>
        {lastRisk.toFixed(2)}
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function PatientJourneyTimeline({ patient }) {
  const [expanded, setExpanded] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  const events = useMemo(
    () => JOURNEYS[patient.patient_id] || generateDefaultJourney(patient),
    [patient]
  );

  const toggleEvent = (idx) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Summary stats
  const visitCount = events.filter((e) => e.type === 'visit').length;
  const missedCount = events.filter((e) => e.type === 'missed').length;
  const agentActions = events.filter((e) => e.type === 'agent' || e.type === 'intervention').length;

  const outcomeEvent = events.find((e) => e.type === 'outcome');
  const isDropout = outcomeEvent?.label?.includes('DROP');
  const isRetained = outcomeEvent?.label?.includes('Retain');

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-agent-blue)]" />
          <h3 className="text-sm font-semibold text-gray-900">Patient Journey</h3>
          <span className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">
            {events.length} events
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini stat chips */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-medium text-emerald-700">
              <Calendar size={10} /> {visitCount} visits
            </span>
            {missedCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[10px] font-medium text-red-700">
                <XCircle size={10} /> {missedCount} missed
              </span>
            )}
            {agentActions > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[10px] font-medium text-cyan-700">
                <Bot size={10} /> {agentActions} actions
              </span>
            )}
            {outcomeEvent && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isDropout
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : isRetained
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-gray-50 border border-gray-200 text-gray-700'
              }`}>
                {isDropout ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                {isDropout ? 'Dropped out' : isRetained ? 'Retained' : 'In progress'}
              </span>
            )}
          </div>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4">
          {/* Risk sparkline */}
          <div className="mb-4 flex items-center justify-between">
            <RiskSparkline events={events} />
          </div>

          {/* Timeline */}
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-1">
              {events.map((event, idx) => {
                const style = EVENT_STYLES[event.type] || EVENT_STYLES.visit;
                const Icon = style.icon;
                const isOpen = expandedEvents.has(idx);
                const isLast = idx === events.length - 1;

                return (
                  <div key={idx} className="relative group">
                    {/* Dot on the line */}
                    <div className={`absolute -left-6 top-2.5 w-[11px] h-[11px] rounded-full border-2 border-white ${style.dot} z-10 ${
                      isLast ? 'ring-2 ring-offset-1 ring-gray-200' : ''
                    }`} />

                    {/* Event card */}
                    <button
                      onClick={() => toggleEvent(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                        isOpen
                          ? `${style.bg} ${style.border}`
                          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={12} className={style.text} />
                        <span className="text-xs font-medium text-gray-900 flex-1">
                          {event.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)] shrink-0">
                          M{event.month}
                          {event.day ? `.${event.day}` : ''}
                        </span>
                      </div>

                      {isOpen && (
                        <p className="text-[11px] text-gray-500 mt-1.5 ml-5 leading-relaxed">
                          {event.detail}
                        </p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom legend */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
            {[
              { type: 'visit', label: 'Visit' },
              { type: 'missed', label: 'Missed' },
              { type: 'risk', label: 'Risk change' },
              { type: 'agent', label: 'Agent action' },
              { type: 'outcome', label: 'Outcome' },
            ].map((item) => (
              <div key={item.type} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${EVENT_STYLES[item.type].dot}`} />
                <span className="text-[10px] text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
