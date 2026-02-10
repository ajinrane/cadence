import { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle2, Loader2, Pause, Square, Bot, Clock,
  Calendar, Phone, FileText, RotateCcw
} from 'lucide-react';

// ─── Execution Workflow Data ─────────────────────────────────

const EXECUTION_WORKFLOWS = {
  schedule: {
    taskName: 'Schedule 5 overdue patient visits',
    estimatedTime: '12 minutes',
    icon: Calendar,
    steps: [
      { text: 'Opened scheduling system', duration: 1800 },
      { text: 'Retrieved patient availability windows from EDC', duration: 2200 },
      {
        text: 'Booking optimal time slots',
        duration: 1400,
        substeps: [
          { patient: 'PT-0047', detail: 'Feb 10, 2:00 PM', duration: 1500 },
          { patient: 'PT-0112', detail: 'Feb 10, 3:30 PM', duration: 1300 },
          { patient: 'PT-0089', detail: 'Feb 11, 10:00 AM', duration: 1600 },
          { patient: 'PT-0156', detail: 'Feb 11, 2:00 PM', duration: 1200 },
          { patient: 'PT-0203', detail: 'Feb 12, 9:00 AM', duration: 1400 },
        ],
      },
      { text: 'Sending confirmation messages via patient preferences', duration: 2400 },
      { text: 'Logging appointments in Medidata EDC', duration: 1800 },
    ],
  },
  call: {
    taskName: 'Call high-risk patients with transportation support',
    estimatedTime: '35 minutes',
    icon: Phone,
    steps: [
      { text: 'Generated talking points from risk analysis', duration: 2000 },
      {
        text: 'Calling patients via integrated phone system',
        duration: 1200,
        substeps: [
          { patient: 'PT-0047', detail: 'Called — accepted ride service', duration: 2200 },
          { patient: 'PT-0112', detail: 'Called — rescheduled to closer site', duration: 2000 },
          { patient: 'PT-0203', detail: 'Called — voicemail, follow-up queued', duration: 1800 },
        ],
      },
      { text: 'Issued ride service vouchers from approved budget', duration: 1600 },
      { text: 'Logged conversation outcomes in EDC', duration: 1400 },
      { text: 'Updated dropout risk scores for resolved barriers', duration: 1800 },
    ],
  },
  update: {
    taskName: 'Update trial binder with protocol amendment',
    estimatedTime: '3 minutes',
    icon: FileText,
    steps: [
      { text: 'Downloaded Protocol_Amendment_v3.2.pdf from inbox', duration: 1400 },
      { text: 'Saved to SharePoint: /Trials/NCT12345678/Protocol/Amendments/', duration: 1600 },
      { text: 'Updated version control log in Excel tracker', duration: 1200 },
      { text: 'Archived previous version (v3.1) to /Archive', duration: 1000 },
      { text: 'Sent notification email to study team (5 members)', duration: 1800 },
      { text: 'Marked "Protocol Update" task complete in tracker', duration: 1000 },
    ],
  },
  reschedule: {
    taskName: 'Reschedule visit for PT-0047',
    estimatedTime: '4 minutes',
    icon: RotateCcw,
    steps: [
      { text: 'Checked patient calendar preferences (afternoons, Tue\u2013Thu)', duration: 1200 },
      { text: 'Found next slot within protocol window (\u00b13 days)', duration: 1600 },
      { text: 'Verified lab scheduling for fasting bloodwork', duration: 1400 },
      { text: 'Cancelled current appointment in scheduling system', duration: 1000 },
      { text: 'Booked new appointment: Tuesday, Feb 11, 3:00 PM', duration: 1200 },
      { text: 'Sent confirmation text to patient', duration: 1400 },
      { text: 'Updated visit schedule in Medidata EDC', duration: 1200 },
      { text: 'Notified PI of schedule change via Slack', duration: 1000 },
      { text: 'Logged interaction notes with reschedule reason', duration: 1200 },
    ],
  },
};

// ─── Modal Component ─────────────────────────────────────────

export default function AgentExecutionModal({ isOpen, onClose, workflowKey }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const [completedSubsteps, setCompletedSubsteps] = useState(new Set());
  const [activeSubstep, setActiveSubstep] = useState(-1);
  const [inSubsteps, setInSubsteps] = useState(false);
  const [finished, setFinished] = useState(false);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);

  const workflow = EXECUTION_WORKFLOWS[workflowKey] || EXECUTION_WORKFLOWS.schedule;
  const steps = workflow.steps;
  const totalUnits = steps.reduce((sum, s) => 1 + (s.substeps?.length || 0), 0);
  const doneUnits = completedSteps.size + completedSubsteps.size;
  const progress = Math.min((doneUnits / totalUnits) * 100, 100);
  const Icon = workflow.icon;

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCompletedSteps(new Set());
      setActiveStep(0);
      setCompletedSubsteps(new Set());
      setActiveSubstep(-1);
      setInSubsteps(false);
      setFinished(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isOpen, workflowKey]);

  // Drive the animation sequence
  useEffect(() => {
    if (!isOpen || finished) return;

    const step = steps[activeStep];
    if (!step) {
      setFinished(true);
      return;
    }

    if (step.substeps && !inSubsteps) {
      // Arrive at a step with substeps — mark step as "active with substeps"
      timerRef.current = setTimeout(() => {
        setInSubsteps(true);
        setActiveSubstep(0);
      }, step.duration);
    } else if (step.substeps && inSubsteps) {
      // Process substeps one by one
      const sub = step.substeps[activeSubstep];
      if (!sub) {
        // All substeps done — complete the parent step and move on
        setCompletedSteps((prev) => new Set(prev).add(activeStep));
        setInSubsteps(false);
        setActiveSubstep(-1);
        setActiveStep((prev) => prev + 1);
        return;
      }
      timerRef.current = setTimeout(() => {
        setCompletedSubsteps((prev) => new Set(prev).add(`${activeStep}-${activeSubstep}`));
        setActiveSubstep((prev) => prev + 1);
      }, sub.duration);
    } else {
      // Simple step
      timerRef.current = setTimeout(() => {
        setCompletedSteps((prev) => new Set(prev).add(activeStep));
        setActiveStep((prev) => prev + 1);
      }, step.duration);
    }

    return () => clearTimeout(timerRef.current);
  }, [isOpen, activeStep, inSubsteps, activeSubstep, finished, steps]);

  // Auto-scroll to active step
  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeStep, activeSubstep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[560px] mx-4 flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh', fontFamily: 'var(--font-body)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {finished ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Loader2 size={16} className="text-blue-600 agent-spin" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 font-[family-name:var(--font-display)]">
                  {finished ? 'Workflow Complete' : 'Agent Executing Workflow'}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {finished ? 'All steps completed successfully' : 'Autonomous execution in progress'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon size={13} className="text-gray-500" />
              <span className="text-xs font-medium text-gray-700">{workflow.taskName}</span>
            </div>
            <span className={`text-xs font-bold font-[family-name:var(--font-mono)] ${finished ? 'text-emerald-600' : 'text-blue-600'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                background: finished
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock size={10} /> Est. {workflow.estimatedTime}
            </span>
            <span className="text-[10px] text-gray-400">
              {completedSteps.size}/{steps.length} steps
            </span>
          </div>
        </div>

        {/* Steps List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-1">
            {steps.map((step, i) => {
              const isDone = completedSteps.has(i);
              const isActive = i === activeStep && !finished;
              const isPending = i > activeStep;

              return (
                <div key={i}>
                  {/* Step row */}
                  <div
                    data-active={isActive ? 'true' : 'false'}
                    className={`flex items-start gap-3 py-2 px-2.5 rounded-lg transition-colors ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isDone && <CheckCircle2 size={16} className="text-emerald-500" />}
                      {isActive && <Loader2 size={16} className="text-blue-600 agent-spin" />}
                      {isPending && (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>

                    {/* Text */}
                    <span
                      className={`text-sm leading-relaxed ${
                        isDone ? 'text-gray-600' :
                        isActive ? 'text-blue-800 font-medium' :
                        'text-gray-400'
                      }`}
                    >
                      {step.text}
                      {isDone && step.substeps && (
                        <span className="text-emerald-600 text-xs ml-1.5">
                          ({step.substeps.length} completed)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Substeps (only when active and in substep mode) */}
                  {step.substeps && isActive && inSubsteps && (
                    <div className="ml-9 mt-1 mb-2 space-y-1 pl-3 border-l-2 border-blue-200">
                      {step.substeps.map((sub, j) => {
                        const subKey = `${i}-${j}`;
                        const subDone = completedSubsteps.has(subKey);
                        const subActive = j === activeSubstep;
                        const subPending = j > activeSubstep;

                        return (
                          <div
                            key={j}
                            data-active={subActive ? 'true' : 'false'}
                            className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md transition-all ${
                              subActive ? 'bg-blue-50/60' : ''
                            }`}
                          >
                            {subDone && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
                            {subActive && <Loader2 size={13} className="text-blue-500 agent-spin shrink-0" />}
                            {subPending && (
                              <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-gray-300 shrink-0" />
                            )}
                            <span className={`text-xs ${
                              subDone ? 'text-gray-600' :
                              subActive ? 'text-blue-700 font-medium' :
                              'text-gray-400'
                            }`}>
                              <span className="font-[family-name:var(--font-mono)] font-medium">{sub.patient}</span>
                              {': '}
                              {sub.detail}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Show substeps as done summary */}
                  {step.substeps && isDone && (
                    <div className="ml-9 mt-0.5 mb-1.5 space-y-0.5 pl-3 border-l-2 border-emerald-200">
                      {step.substeps.map((sub, j) => (
                        <div key={j} className="flex items-center gap-2 py-0.5 px-2">
                          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                          <span className="text-[11px] text-gray-500">
                            <span className="font-[family-name:var(--font-mono)]">{sub.patient}</span>
                            {': '}{sub.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50/50 shrink-0">
          {finished ? (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 cursor-pointer transition-colors"
            >
              <CheckCircle2 size={15} />
              Done — Return to Cadence
            </button>
          ) : (
            <div className="flex gap-2.5">
              <button className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white cursor-pointer transition-colors">
                <Pause size={14} /> Pause
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-300 cursor-pointer transition-colors"
              >
                <Square size={14} /> Stop & Review
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
