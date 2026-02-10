import { useState, useEffect } from 'react';
import {
  X, Monitor, MousePointer, Calendar, Database,
  Mail, CheckCircle2, Shield, Zap, Eye, Play
} from 'lucide-react';
import DesktopSimulator from './DesktopSimulator';

// ─── Frame Sets Per Workflow ─────────────────────────────────

const WORKFLOW_FRAMES = {
  schedule: {
    taskName: 'Schedule Patient Visits',
    frames: [
      {
        icon: MousePointer, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        title: 'Agent takes control',
        description: "Desktop control agent activates on CRC's workstation. Secure, local execution with full audit trail.",
        screenshot: 'Agent cursor appears on screen',
        highlight: 'No installation needed — runs in existing environment',
      },
      {
        icon: Calendar, iconColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
        title: 'Opens scheduling system',
        description: 'Agent navigates to scheduling software automatically. Works with ANY system — Medidata, Oracle, custom tools.',
        screenshot: 'Scheduling interface loads automatically',
        highlight: 'Legacy systems supported — no API required',
      },
      {
        icon: Database, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
        title: 'Retrieves patient data',
        description: 'Agent cross-references EDC system for visit windows, protocol requirements, and patient availability.',
        screenshot: 'Patient list with visit windows displayed',
        highlight: 'Multi-system coordination in seconds',
      },
      {
        icon: CheckCircle2, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        title: 'Books appointments',
        description: 'Agent selects optimal time slots based on patient preferences, protocol windows, and CRC capacity.',
        screenshot: '5 appointments scheduled automatically',
        highlight: 'Respects all protocol constraints and patient preferences',
      },
      {
        icon: Mail, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
        title: 'Sends confirmations',
        description: "Agent drafts personalized messages and sends via each patient's preferred contact method.",
        screenshot: 'Confirmation messages sent to 5 patients',
        highlight: 'Personalized per patient communication preferences',
      },
      {
        icon: Database, iconColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
        title: 'Logs in EDC',
        description: 'Agent updates visit schedules in trial management system. Full audit trail maintained for compliance.',
        screenshot: 'EDC updated with new visit dates',
        highlight: '21 CFR Part 11 compliant audit trail',
      },
    ],
  },
  call: {
    taskName: 'Call High-Risk Patients',
    frames: [
      {
        icon: MousePointer, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        title: 'Agent takes control',
        description: 'Desktop agent activates and opens the integrated phone system on CRC workstation.',
        screenshot: 'Agent cursor navigates to phone system',
        highlight: 'Works with any VOIP or phone system',
      },
      {
        icon: Database, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
        title: 'Generates talking points',
        description: 'Agent pulls risk factors from dropout model and generates personalized talking points for each patient.',
        screenshot: 'Risk-based talking points generated for 3 patients',
        highlight: 'Contextual intelligence from ML model',
      },
      {
        icon: Calendar, iconColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
        title: 'Calls patients',
        description: 'Agent dials each patient, follows script, and records outcomes. Offers ride service vouchers when applicable.',
        screenshot: 'Calling PT-0047... connected',
        highlight: 'Automated outreach with human-quality conversation',
      },
      {
        icon: Mail, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
        title: 'Issues ride service vouchers',
        description: 'Agent accesses approved budget, generates ride service vouchers, and sends to patients with transport barriers.',
        screenshot: 'Vouchers issued for 2 patients',
        highlight: 'Budget-aware, auto-approved for standard interventions',
      },
      {
        icon: Database, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
        title: 'Updates risk scores',
        description: 'Agent logs outcomes in EDC and updates dropout risk model with new intervention data.',
        screenshot: 'Risk scores updated — 2 patients de-escalated',
        highlight: 'Continuous learning from every intervention',
      },
    ],
  },
  update: {
    taskName: 'Update Trial Binder',
    frames: [
      {
        icon: MousePointer, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        title: 'Agent takes control',
        description: 'Desktop agent opens email client and locates protocol amendment from Dr. Martinez.',
        screenshot: 'Agent navigates to inbox',
        highlight: 'Works with Outlook, Gmail, or any email client',
      },
      {
        icon: Database, iconColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
        title: 'Downloads & files document',
        description: 'Agent downloads PDF attachment, opens SharePoint, and files in correct trial directory structure.',
        screenshot: 'Protocol_Amendment_v3.2.pdf saved to SharePoint',
        highlight: 'Knows your file organization automatically',
      },
      {
        icon: CheckCircle2, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
        title: 'Updates version log',
        description: 'Agent opens Excel tracker, updates version control log, and archives previous version.',
        screenshot: 'Version log updated: v3.1 → v3.2',
        highlight: 'Maintains complete version history',
      },
      {
        icon: Mail, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
        title: 'Notifies study team',
        description: 'Agent drafts and sends notification email to all 5 study team members with amendment summary.',
        screenshot: 'Notification sent to study team',
        highlight: 'Context-aware notifications with document summary',
      },
    ],
  },
  reschedule: {
    taskName: 'Reschedule Patient Visit',
    frames: [
      {
        icon: MousePointer, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200',
        title: 'Agent takes control',
        description: 'Agent opens scheduling system and pulls up PT-0047 current appointment and protocol visit windows.',
        screenshot: 'Patient calendar loaded',
        highlight: 'Instant access to full patient context',
      },
      {
        icon: Calendar, iconColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',
        title: 'Finds optimal slot',
        description: 'Agent checks patient preferences (afternoons, Tue–Thu), protocol window (±3 days), and lab requirements.',
        screenshot: 'Best slot found: Tue Feb 11, 3:00 PM',
        highlight: 'Multi-constraint optimization in seconds',
      },
      {
        icon: CheckCircle2, iconColor: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200',
        title: 'Books & confirms',
        description: 'Agent cancels old slot, books new appointment, verifies lab scheduling, and sends text confirmation.',
        screenshot: 'Appointment rescheduled + confirmation sent',
        highlight: 'End-to-end rebooking across 3 systems',
      },
      {
        icon: Database, iconColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200',
        title: 'Logs everywhere',
        description: 'Agent updates EDC visit schedule, notifies PI via Slack, and logs interaction notes with reschedule reason.',
        screenshot: 'EDC + Slack + notes updated',
        highlight: 'Complete documentation trail, zero manual entry',
      },
    ],
  },
};

const BENEFITS = [
  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'No API integrations', subtitle: 'Works with legacy systems day one' },
  { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Deploy in days', subtitle: 'No IT approval or integration cycles' },
  { icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Future-proof', subtitle: 'Adapts when sites change software' },
  { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Secure & compliant', subtitle: 'Local execution, full audit trail' },
];

// ─── Component ───────────────────────────────────────────────

export default function DesktopControlPreview({ isOpen, onClose, workflowKey }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [showSimulator, setShowSimulator] = useState(false);

  const workflow = WORKFLOW_FRAMES[workflowKey] || WORKFLOW_FRAMES.schedule;
  const frames = workflow.frames;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentFrame(0);
      setFadeKey(0);
    }
  }, [isOpen, workflowKey]);

  // Auto-advance every 3s
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = (prev + 1) % frames.length;
        setFadeKey((k) => k + 1);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, frames.length]);

  if (!isOpen) return null;

  const frame = frames[currentFrame];
  const Icon = frame.icon;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '88vh', fontFamily: 'var(--font-body)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-purple-50/40 to-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Monitor size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-[family-name:var(--font-display)]">
                  Desktop Control Preview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Agent Workflow: {workflow.taskName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Subheader */}
        <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100/60 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Zap size={13} className="text-blue-600" />
            <span className="font-semibold text-blue-800">
              Works with ANY software — no API integration needed
            </span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="px-6 py-3 bg-gray-50/50 shrink-0">
          <div className="flex justify-center items-center gap-2">
            {frames.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentFrame(i); setFadeKey((k) => k + 1); }}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentFrame
                    ? 'w-8 h-2 bg-blue-600'
                    : i < currentFrame
                    ? 'w-2 h-2 bg-blue-300'
                    : 'w-2 h-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Frame */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <div
            key={fadeKey}
            className={`${frame.bgColor} rounded-2xl border ${frame.borderColor} p-8 flex flex-col items-center justify-center min-h-[280px] animate-fade-in`}
          >
            {/* Large icon */}
            <div className={`${frame.bgColor} border-2 ${frame.borderColor} rounded-full p-6 mb-5 shadow-sm`}>
              <Icon size={48} className={frame.iconColor} />
            </div>

            {/* Title */}
            <h4 className="text-xl font-bold text-gray-900 mb-2 text-center font-[family-name:var(--font-display)]">
              {frame.title}
            </h4>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center max-w-md leading-relaxed mb-4">
              {frame.description}
            </p>

            {/* Screenshot placeholder */}
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-700 font-medium shadow-sm">
              {frame.screenshot}
            </div>

            {/* Highlight */}
            <div className="mt-3 px-4 py-1.5 rounded-full bg-white/70 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-600 text-center">
                {frame.highlight}
              </p>
            </div>
          </div>

          {/* Step counter */}
          <p className="text-center mt-3 text-xs font-medium text-gray-400">
            Step {currentFrame + 1} of {frames.length}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50/40 border-t border-gray-100 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`${b.bg} p-1.5 rounded-lg shrink-0`}>
                  <b.icon size={14} className={b.color} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{b.title}</p>
                  <p className="text-[10px] text-gray-500">{b.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full agent-pulse" />
            <p className="text-[11px] text-gray-500">
              Built on Anthropic's computer use capabilities
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowSimulator(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 cursor-pointer transition-colors shadow-sm"
            >
              <Play size={13} /> Watch Live Demo
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer transition-colors shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Simulator */}
      <DesktopSimulator
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
      />
    </div>
  );
}
