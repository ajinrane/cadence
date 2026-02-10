import { useState, useEffect, useRef } from 'react';
import {
  X, Monitor, Calendar, Mail, Database, CheckCircle2,
  Bot, Clock
} from 'lucide-react';

// ─── Workflow Script ─────────────────────────────────────────

const WORKFLOW = [
  {
    description: 'Initializing desktop agent',
    cursor: { x: 50, y: 45 },
    window: null,
    duration: 1400,
  },
  {
    description: 'Opening TrialScheduler',
    cursor: { x: 14, y: 93 },
    window: null,
    duration: 1600,
  },
  {
    description: 'TrialScheduler loaded',
    cursor: { x: 40, y: 32 },
    window: 'scheduler',
    duration: 1200,
  },
  {
    description: 'Selecting patient PT-0047',
    cursor: { x: 42, y: 35 },
    window: 'scheduler',
    fieldFocus: 'patient',
    duration: 1800,
  },
  {
    description: 'Entering appointment date',
    cursor: { x: 33, y: 52 },
    window: 'scheduler',
    fieldFocus: 'date',
    typing: 'Feb 10, 2025',
    duration: 2200,
  },
  {
    description: 'Selecting time slot',
    cursor: { x: 57, y: 52 },
    window: 'scheduler',
    fieldFocus: 'time',
    duration: 1500,
  },
  {
    description: 'Booking appointment',
    cursor: { x: 45, y: 65 },
    window: 'scheduler',
    fieldFocus: 'book',
    duration: 1800,
  },
  {
    description: 'Opening email client',
    cursor: { x: 20, y: 93 },
    window: null,
    duration: 1400,
  },
  {
    description: 'Composing confirmation message',
    cursor: { x: 48, y: 52 },
    window: 'email',
    typing: 'Hi,\n\nYour appointment is confirmed:\nDate: February 10, 2025\nTime: 2:00 PM\nVisit: Week 12 Assessment\n\nPlease arrive 15 min early.\n\nBest regards,\nClinical Research Team',
    duration: 3200,
  },
  {
    description: 'Sending confirmation',
    cursor: { x: 32, y: 72 },
    window: 'email',
    fieldFocus: 'send',
    duration: 1500,
  },
  {
    description: 'Logging visit in EDC',
    cursor: { x: 26, y: 93 },
    window: null,
    duration: 1200,
  },
  {
    description: 'Updating EDC records',
    cursor: { x: 50, y: 50 },
    window: 'edc',
    duration: 2500,
  },
  {
    description: 'Workflow complete',
    cursor: { x: 50, y: 45 },
    window: 'edc',
    duration: 1000,
  },
];

// ─── Component ───────────────────────────────────────────────

export default function DesktopSimulator({ isOpen, onClose, embedded = false }) {
  const [step, setStep] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef(null);
  const typingRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen || embedded) {
      setStep(0);
      setTypingText('');
      setIsComplete(false);
    }
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(typingRef.current);
    };
  }, [isOpen, embedded]);

  // Drive the sequence
  useEffect(() => {
    if ((!isOpen && !embedded) || isComplete) return;

    const current = WORKFLOW[step];
    if (!current) {
      setIsComplete(true);
      return;
    }

    // Typing animation
    if (current.typing) {
      let i = 0;
      setTypingText('');
      typingRef.current = setInterval(() => {
        if (i < current.typing.length) {
          setTypingText(current.typing.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typingRef.current);
        }
      }, 35);
    } else {
      setTypingText('');
    }

    // Advance
    timerRef.current = setTimeout(() => {
      if (step < WORKFLOW.length - 1) {
        setStep((s) => s + 1);
      } else {
        setIsComplete(true);
      }
    }, current.duration);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(typingRef.current);
    };
  }, [isOpen, step, isComplete, embedded]);

  // Auto-replay for embedded mode
  useEffect(() => {
    if (!embedded || !isComplete) return;
    const timer = setTimeout(() => {
      setStep(0);
      setTypingText('');
      setIsComplete(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [embedded, isComplete]);

  if (!isOpen && !embedded) return null;

  const current = WORKFLOW[step] || WORKFLOW[WORKFLOW.length - 1];
  const progress = ((step + 1) / WORKFLOW.length) * 100;
  const activeWindow = current.window;

  return (
    <div className={embedded ? "relative w-full h-full" : "fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4"}>
      <div
        className={`relative w-full h-full ${embedded ? '' : 'max-w-[1100px] max-h-[700px]'} rounded-2xl overflow-hidden shadow-2xl border ${embedded ? 'border-gray-300' : 'border-white/10'}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Desktop background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />

        {/* Faint grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Close button */}
        {!embedded && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-50 bg-white/10 backdrop-blur rounded-full p-2 text-white/70 hover:bg-white/20 hover:text-white cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* ── Agent Status Overlay ──────────────────── */}
        <div className="absolute top-4 left-4 z-30 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-72">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="relative">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping" />
            </div>
            <span className="text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">
              Agent Executing
            </span>
            <Bot size={14} className="text-blue-600 ml-auto" />
          </div>

          <p className="text-xs font-medium text-gray-700 mb-0.5">
            Step {Math.min(step + 1, WORKFLOW.length)} of {WORKFLOW.length}
          </p>
          <p className="text-[11px] text-gray-500 mb-2.5">{current.description}</p>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              }}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">
            {isComplete ? 'Complete' : `${Math.round(progress)}%`}
          </p>
        </div>

        {/* ── Animated Cursor ──────────────────────── */}
        <div
          className="absolute z-40 pointer-events-none"
          style={{
            left: `${current.cursor.x}%`,
            top: `${current.cursor.y}%`,
            transition: 'left 0.9s cubic-bezier(0.4, 0, 0.2, 1), top 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
          {/* Click ripple */}
          {(current.fieldFocus || current.typing) && (
            <div className="absolute top-0 left-0 w-6 h-6 -translate-x-1 -translate-y-1 rounded-full border-2 border-blue-400 animate-ping opacity-50" />
          )}
        </div>

        {/* ── Application Windows ──────────────────── */}

        {/* TrialScheduler */}
        {activeWindow === 'scheduler' && (
          <SchedulerWindow step={step} typingText={typingText} />
        )}

        {/* Email */}
        {activeWindow === 'email' && (
          <EmailWindow step={step} typingText={typingText} />
        )}

        {/* EDC */}
        {activeWindow === 'edc' && <EDCWindow />}

        {/* ── Taskbar ──────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 flex items-center px-3 gap-1.5 z-20">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Monitor size={14} className="text-white" />
          </div>
          <div className="w-px h-6 bg-white/10 mx-1" />
          {[
            { emoji: '\uD83D\uDCC5', key: 'scheduler', label: 'TrialScheduler' },
            { emoji: '\u2709\uFE0F', key: 'email', label: 'Email' },
            { emoji: '\uD83D\uDCCA', key: 'edc', label: 'EDC' },
          ].map((app) => (
            <div
              key={app.key}
              className={`h-9 px-3 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                activeWindow === app.key
                  ? 'bg-white/15 text-white'
                  : 'text-white/50'
              }`}
            >
              <span className="text-base">{app.emoji}</span>
              {activeWindow === app.key && (
                <span className="font-medium">{app.label}</span>
              )}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-3 text-white/60 text-[11px] font-[family-name:var(--font-mono)]">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* ── Completion Overlay ────────────────────── */}
        {isComplete && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm text-center border border-gray-200">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 font-[family-name:var(--font-display)]">
                Workflow Complete
              </h3>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                Agent scheduled appointment for PT-0047, sent confirmation email, and logged visit in EDC.
              </p>
              {embedded ? (
                <p className="text-xs text-gray-400 animate-pulse">Replaying in a moment...</p>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => { setStep(0); setIsComplete(false); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Replay
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    Close Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TrialScheduler Window ───────────────────────────────────

function SchedulerWindow({ step, typingText }) {
  const patientSelected = step >= 3;
  const dateEntered = step >= 4;
  const timeSelected = step >= 5;
  const booked = step >= 6;

  return (
    <div
      className="absolute z-10 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
      style={{ top: '12%', left: '28%', width: '480px', animation: 'windowSlideIn 0.35s ease-out' }}
    >
      {/* Title bar */}
      <div className="bg-gray-100 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-blue-600" />
          <span className="text-xs font-semibold text-gray-800">TrialScheduler Pro v4.2</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900">New Appointment</h4>
          <span className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">Trial NCT12345678</span>
        </div>

        {/* Patient */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Patient</label>
          <div className={`mt-1 px-3 py-2 rounded-lg border text-sm ${patientSelected ? 'border-blue-300 bg-blue-50 text-gray-900 font-medium' : 'border-gray-200 text-gray-400'}`}>
            {patientSelected ? 'PT-0047 — Week 12 Assessment' : 'Select patient...'}
          </div>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</label>
            <div className={`mt-1 px-3 py-2 rounded-lg border text-sm ${dateEntered ? 'border-blue-300 bg-blue-50 text-gray-900' : 'border-gray-200 text-gray-400'}`}>
              {dateEntered ? (step === 4 ? typingText : 'Feb 10, 2025') : 'Select date...'}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Time</label>
            <div className={`mt-1 px-3 py-2 rounded-lg border text-sm ${timeSelected ? 'border-blue-300 bg-blue-50 text-gray-900' : 'border-gray-200 text-gray-400'}`}>
              {timeSelected ? '2:00 PM' : 'Select time...'}
            </div>
          </div>
        </div>

        {/* Visit type */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Visit Type</label>
          <div className="mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700">
            Week 12 Assessment (Protocol Window: Feb 8 – Feb 13)
          </div>
        </div>

        {/* Button */}
        <button className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
          booked
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 text-white'
        }`}>
          {booked ? '\u2713 Appointment Booked' : 'Book Appointment'}
        </button>
      </div>
    </div>
  );
}

// ─── Email Window ────────────────────────────────────────────

function EmailWindow({ step, typingText }) {
  const sent = step >= 9;

  return (
    <div
      className="absolute z-10 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
      style={{ top: '10%', left: '25%', width: '530px', animation: 'windowSlideIn 0.35s ease-out' }}
    >
      {/* Title bar */}
      <div className="bg-blue-600 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-white" />
          <span className="text-xs font-semibold text-white">Mail — New Message</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400/60" />
          <div className="w-3 h-3 rounded-full bg-blue-300/60" />
          <div className="w-3 h-3 rounded-full bg-blue-200/60" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-[48px_1fr] gap-2 items-center text-sm">
          <span className="text-xs font-semibold text-gray-500 text-right">To</span>
          <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-xs">
            pt0047.participant@trialmail.org
          </div>
          <span className="text-xs font-semibold text-gray-500 text-right">Subject</span>
          <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-xs">
            Appointment Confirmation — Week 12 Visit
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Body</span>
          </div>
          <div className="px-3 py-2.5 min-h-[160px] text-xs text-gray-700 font-[family-name:var(--font-mono)] whitespace-pre-wrap leading-relaxed">
            {typingText}
            {!sent && <span className="inline-block w-px h-3.5 bg-blue-600 animate-pulse ml-0.5 align-text-bottom" />}
          </div>
        </div>

        <button className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
          sent
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 text-white'
        }`}>
          {sent ? '\u2713 Sent' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ─── EDC Window ──────────────────────────────────────────────

function EDCWindow() {
  return (
    <div
      className="absolute z-10 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200"
      style={{ top: '10%', left: '22%', width: '580px', animation: 'windowSlideIn 0.35s ease-out' }}
    >
      {/* Title bar */}
      <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-gray-300" />
          <span className="text-xs font-semibold text-gray-200">Medidata Rave EDC — Visit Schedule</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full border border-gray-500" />
          <div className="w-3 h-3 rounded-full border border-gray-500" />
          <div className="w-3 h-3 rounded-full border border-gray-500" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Patient: PT-0047</p>
            <p className="text-[11px] text-gray-500 font-[family-name:var(--font-mono)]">Trial NCT12345678 | Site 003</p>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Active
          </span>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Visit</th>
              <th className="text-left p-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="text-left p-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="p-2.5 text-xs text-gray-700">Week 4</td>
              <td className="p-2.5 text-xs text-gray-700 font-[family-name:var(--font-mono)]">Dec 18, 2024</td>
              <td className="p-2.5"><span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span></td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="p-2.5 text-xs text-gray-700">Week 8</td>
              <td className="p-2.5 text-xs text-gray-700 font-[family-name:var(--font-mono)]">Jan 15, 2025</td>
              <td className="p-2.5"><span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Completed</span></td>
            </tr>
            <tr className="border-b border-gray-100 bg-blue-50">
              <td className="p-2.5 text-xs text-blue-800 font-semibold">Week 12</td>
              <td className="p-2.5 text-xs text-blue-800 font-semibold font-[family-name:var(--font-mono)]">Feb 10, 2025 2:00 PM</td>
              <td className="p-2.5"><span className="text-xs text-blue-600 font-semibold flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Scheduled</span></td>
            </tr>
            <tr>
              <td className="p-2.5 text-xs text-gray-400">Week 16</td>
              <td className="p-2.5 text-xs text-gray-400">—</td>
              <td className="p-2.5 text-xs text-gray-400">Pending</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium">
            Visit schedule updated — audit trail logged at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}
