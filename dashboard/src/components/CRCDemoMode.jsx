import { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, X,
  ChevronRight, Sparkles, User
} from 'lucide-react';

// ── Demo Script ────────────────────────────────────────────────────
// Each step has: tab to show, narration (teleprompter), subtext, duration,
// optional actions (select patient, toggle KG controls), scroll targets.
const STEPS = [
  // ─── CHAPTER 1: OPENING ───────────────────────────────────────
  {
    id: 'intro',
    chapter: 'Morning',
    tab: 'overview',
    narration: "It's 7:45 AM on a Monday. Sarah Chen, a Clinical Research Coordinator at Memorial Hospital, opens Cadence to start her day.",
    subtext: 'She manages 47 patients across 3 active clinical trials.',
    duration: 8000,
  },
  {
    id: 'overview-impact',
    chapter: 'Morning',
    tab: 'overview',
    narration: "Right away she sees the big picture — 12 dropouts prevented this month, $240K saved in re-recruitment costs. Her model is running at 0.96 AUC accuracy.",
    subtext: 'These numbers update in real-time as the system processes new patient data.',
    duration: 8000,
  },
  {
    id: 'overview-agent-demo',
    chapter: 'Morning',
    tab: 'overview',
    narration: "The live demo shows Cadence orchestrating across 3 applications — scheduling, email confirmation, EDC logging — in 22 seconds flat. A task that takes Sarah 15 minutes by hand.",
    subtext: 'Full audit trail maintained at every step for 21 CFR Part 11 compliance.',
    duration: 8000,
  },
  {
    id: 'overview-roi',
    chapter: 'Morning',
    tab: 'overview',
    narration: "The ROI calculator lets sponsors plug in their own numbers. At scale — 1,000 patients, 10 sites — Cadence projects $6M in annual savings.",
    subtext: 'Before vs. After: 100 min per intervention manually, 3 min with Cadence.',
    duration: 8000,
  },

  // ─── CHAPTER 2: DAILY WORKFLOW ────────────────────────────────
  {
    id: 'workflow-open',
    chapter: 'Task Triage',
    tab: 'workflow',
    narration: "Sarah moves to her daily task queue. Cadence has already triaged overnight — 14 tasks sorted by priority, categorized by type.",
    subtext: 'Patient calls, scheduling, data entry, EDC updates, follow-ups — all in one view.',
    duration: 8000,
  },
  {
    id: 'workflow-agent-tasks',
    chapter: 'Task Triage',
    tab: 'workflow',
    narration: "Five tasks are marked 'Agent-Capable' with a purple bot icon. Appointment reminders, routine check-in calls, EDC data entry — the AI can execute these autonomously.",
    subtext: 'One click to assign. The agent handles execution, Sarah reviews the audit trail.',
    duration: 8000,
  },
  {
    id: 'workflow-team',
    chapter: 'Task Triage',
    tab: 'workflow',
    narration: "The Team tab shows capacity across all CRCs. Sarah can reassign tasks, see who's overloaded, and let the agent balance the workload.",
    subtext: "This frees up 4.5 hours of Sarah's day for direct patient care.",
    duration: 7000,
  },
  {
    id: 'workflow-alert',
    chapter: 'Task Triage',
    tab: 'workflow',
    narration: "A red flag catches her eye: PT-0112 hasn't been contacted in 66 days. The system caught this overnight and escalated it to the top of her queue.",
    subtext: 'Without Cadence, this patient would have silently dropped out — no one would notice for weeks.',
    duration: 8000,
  },

  // ─── CHAPTER 3: RISK MONITOR ──────────────────────────────────
  {
    id: 'risk-overview',
    chapter: 'Risk Monitor',
    tab: 'dashboard',
    action: 'clearPatient',
    narration: "Sarah switches to the Risk Monitor. Every patient has an ML-generated dropout risk score, updated daily. Eight patients are flagged high-risk today.",
    subtext: 'The model was trained on 2,084 patients across 3 pilot sites — 0.96 AUC accuracy.',
    duration: 8000,
  },
  {
    id: 'risk-table',
    chapter: 'Risk Monitor',
    tab: 'dashboard',
    narration: "The table shows each patient's score, top risk factors, and status. Color-coded: red for high risk, amber for medium, green for low. She can sort, filter, and click into any patient.",
    subtext: "The model doesn't just predict — it explains. Top 3 risk factors shown for every patient.",
    duration: 8000,
  },
  {
    id: 'risk-pt0112',
    chapter: 'Risk Monitor',
    tab: 'dashboard',
    narration: "PT-0112 jumps out at the top — risk score 0.71. The model has identified three factors: transportation barriers, 66 days since last contact, and only 3 of 18 visits completed.",
    subtext: "This is a patient who's about to drop out. But Cadence caught it in time.",
    duration: 8000,
  },

  // ─── CHAPTER 4: PATIENT DEEP DIVE ────────────────────────────
  {
    id: 'patient-open',
    chapter: 'Patient Detail',
    tab: 'dashboard',
    action: 'selectPatient:PT-0112',
    narration: "Sarah clicks into the full patient profile. PT-0112 is 56 years old, male, lives 55.4 miles from the site. No caregiver support. Prefers phone contact.",
    subtext: 'The risk gauge shows 0.71 — deep in the red zone. Agent status: intervention queued.',
    duration: 9000,
  },
  {
    id: 'patient-journey',
    chapter: 'Patient Detail',
    tab: 'dashboard',
    action: 'selectPatient:PT-0112',
    narration: "The Patient Journey Timeline tells the complete story. Enrolled Month 1. Missed Visit 2 in Month 2 — car trouble. The agent arranged a ride, which worked once.",
    subtext: 'But by Month 4, rides fell through again. Risk climbed: 0.15 to 0.38 to 0.56 to 0.71.',
    duration: 9000,
    scrollTarget: 'patient-journey',
  },
  {
    id: 'patient-escalation',
    chapter: 'Patient Detail',
    tab: 'dashboard',
    action: 'selectPatient:PT-0112',
    narration: "The timeline shows the agent's escalation path. First it tried automated outreach. When that failed, it arranged ride services. When rides failed, it escalated to Sarah for a manual home visit.",
    subtext: "The system knows when to act autonomously and when to escalate to a human.",
    duration: 9000,
  },
  {
    id: 'patient-intervention',
    chapter: 'Patient Detail',
    tab: 'dashboard',
    action: 'selectPatient:PT-0112',
    narration: "Right now, a new intervention is queued. The agent recommends ride service coordination — 73% success rate from 48 similar cases across all 3 sites. Plus flexible visit scheduling.",
    subtext: "These recommendations come from the institutional knowledge base — not just this patient's history.",
    duration: 9000,
    scrollTarget: 'intervention-queue',
  },
  {
    id: 'patient-risk-factors',
    chapter: 'Patient Detail',
    tab: 'dashboard',
    action: 'selectPatient:PT-0112',
    narration: "The risk analysis breaks down exactly why this patient is at risk. Distance from site: 42% contribution. Contact gap: 35%. Low visit completion: 23%. Each factor has a clear explanation.",
    subtext: "This isn't a black box. CRCs and PIs can see exactly what the model is thinking.",
    duration: 8000,
    scrollTarget: 'risk-factors',
  },

  // ─── CHAPTER 5: KNOWLEDGE GRAPH ───────────────────────────────
  {
    id: 'kg-intro',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    action: 'clearPatient',
    narration: "Sarah checks the Knowledge Graph — Cadence's secret weapon. Every intervention, every outcome, every lesson learned by every CRC, captured and connected.",
    subtext: '89 nodes of institutional knowledge accumulated over 12 months across 3 sites.',
    duration: 9000,
  },
  {
    id: 'kg-nodes',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    narration: "Blue nodes are patients. Amber are interventions. Green are outcomes. Purple are CRC learnings. Every connection represents real clinical knowledge.",
    subtext: 'Click any node to see its details, connections, and the full evidence chain.',
    duration: 8000,
  },
  {
    id: 'kg-compounding',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    narration: "This is knowledge compounding. When a CRC at Site A discovers that transport assistance reduces dropout by 83%, CRCs at Sites B and C benefit immediately.",
    subtext: "No more reinventing the wheel. No more tribal knowledge locked in one person's head.",
    duration: 8000,
  },
  {
    id: 'kg-cross-site',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    action: 'kgKnowledgeLoss:false',
    narration: "The graph shows cross-site learning paths. A discovery in Month 6 at one site propagates to other sites by Month 7 and 8 — compounding returns on institutional knowledge.",
    subtext: 'This is why multi-site trials get exponentially better over time with Cadence.',
    duration: 8000,
  },
  {
    id: 'kg-loss-intro',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    action: 'kgKnowledgeLoss:true',
    narration: "Now the critical question: what happens when an experienced CRC leaves? Sarah toggles 'Knowledge Loss'...",
    subtext: "Watch carefully. This is the problem every clinical trial organization faces.",
    duration: 7000,
  },
  {
    id: 'kg-loss-impact',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    action: 'kgKnowledgeLoss:true',
    narration: "Nodes disappear. Connections break. Months of hard-won expertise — gone. In traditional trials, this happens every time a CRC walks out the door. 30% annual turnover.",
    subtext: "Without Cadence, a third of your institutional knowledge vanishes every year.",
    duration: 9000,
  },
  {
    id: 'kg-loss-solution',
    chapter: 'Knowledge Graph',
    tab: 'knowledgegraph',
    action: 'kgKnowledgeLoss:true',
    narration: "With Cadence, none of this is lost. Every interaction, every insight, every successful intervention is permanently captured in the knowledge graph. CRCs come and go — the knowledge stays.",
    subtext: "This is the difference between tribal knowledge and institutional memory.",
    duration: 9000,
  },

  // ─── CHAPTER 6: CLOSING ───────────────────────────────────────
  {
    id: 'summary-time',
    chapter: 'Summary',
    tab: 'overview',
    action: 'kgKnowledgeLoss:false',
    narration: "Sarah's morning triage is complete. What used to take 3 hours now takes 15 minutes. Five agent tasks are already executing. Three high-risk patients have intervention plans.",
    subtext: "She'll spend the rest of her day where she's needed most: with her patients.",
    duration: 9000,
  },
  {
    id: 'summary-numbers',
    chapter: 'Summary',
    tab: 'overview',
    narration: "The pilot results speak for themselves. 74% retention rate — up from 45% baseline. 12 dropouts prevented. $240K saved. 18 hours per week freed per CRC.",
    subtext: 'And the knowledge base grows stronger every single day.',
    duration: 8000,
  },
  {
    id: 'closing',
    chapter: 'Summary',
    tab: 'overview',
    narration: "Cadence: AI agents that predict dropout, execute retention interventions, and compound institutional knowledge across every site, every trial, every CRC.",
    subtext: 'Clinical trials lose 30% of patients. We fix that.',
    duration: 12000,
    isFinal: true,
  },
];

// ── Chapter colors ─────────────────────────────────────────────────
const CHAPTER_COLORS = {
  'Morning':         { bg: 'bg-blue-500/20',   text: 'text-blue-300',   border: 'border-blue-500/30' },
  'Task Triage':     { bg: 'bg-amber-500/20',  text: 'text-amber-300',  border: 'border-amber-500/30' },
  'Risk Monitor':    { bg: 'bg-red-500/20',     text: 'text-red-300',    border: 'border-red-500/30' },
  'Patient Detail':  { bg: 'bg-purple-500/20',  text: 'text-purple-300', border: 'border-purple-500/30' },
  'Knowledge Graph': { bg: 'bg-cyan-500/20',    text: 'text-cyan-300',   border: 'border-cyan-500/30' },
  'Summary':         { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

// ── Main Component ─────────────────────────────────────────────────
export default function CRCDemoMode({
  active,
  onClose,
  onSwitchTab,
  onSelectPatient,
  onClearPatient,
  onSetKGKnowledgeLoss,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);

  // Reset when demo opens (via setTimeout to avoid synchronous setState in effect)
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      setCurrentStep(0);
      setPaused(false);
      setTextVisible(false);
      setProgressWidth(0);
    }, 0);
    return () => clearTimeout(timer);
  }, [active]);

  // Execute step actions when step changes
  useEffect(() => {
    if (!active) return;

    const step = STEPS[currentStep];
    if (!step) return;

    // Switch tab
    onSwitchTab(step.tab);

    // Execute action after a short delay for tab render
    if (step.action) {
      const timer = setTimeout(() => {
        if (step.action === 'clearPatient') {
          onClearPatient();
        } else if (step.action.startsWith('selectPatient:')) {
          const patientId = step.action.split(':')[1];
          onSelectPatient(patientId);
        } else if (step.action.startsWith('kgKnowledgeLoss:')) {
          const value = step.action.split(':')[1] === 'true';
          onSetKGKnowledgeLoss(value);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentStep, active, onSwitchTab, onSelectPatient, onClearPatient, onSetKGKnowledgeLoss]);

  // Scroll to targets
  useEffect(() => {
    if (!active) return;
    const step = STEPS[currentStep];
    if (!step) return;

    const scrollTimer = setTimeout(() => {
      if (step.scrollTarget) {
        const el = document.querySelector(`[data-demo-scroll="${step.scrollTarget}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, step.action ? 1200 : 400);

    return () => clearTimeout(scrollTimer);
  }, [currentStep, active]);

  // Text fade-in (use rAF to avoid synchronous setState in effect)
  useEffect(() => {
    if (!active) return;
    const raf = requestAnimationFrame(() => setTextVisible(false));
    const timer = setTimeout(() => setTextVisible(true), 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [currentStep, active]);

  // Auto-advance timer with progress animation
  useEffect(() => {
    if (!active || paused) return;
    const step = STEPS[currentStep];
    if (!step || step.isFinal) return;

    // Animate progress bar (rAF to avoid synchronous setState in effect)
    const resetRaf = requestAnimationFrame(() => setProgressWidth(0));
    const startTime = Date.now();
    const duration = step.duration;

    const frameInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgressWidth(pct);
    }, 50);

    const advanceTimer = setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    }, duration);

    return () => {
      cancelAnimationFrame(resetRaf);
      clearInterval(frameInterval);
      clearTimeout(advanceTimer);
    };
  }, [currentStep, active, paused]);

  // Cleanup on close — resets KG state and clears patient selection
  const handleClose = useCallback(() => {
    onSetKGKnowledgeLoss(false);
    onClearPatient();
    onClose();
  }, [onClose, onSetKGKnowledgeLoss, onClearPatient]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentStep((s) => Math.max(s - 1, 0));
      } else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, handleClose]);

  if (!active) return null;

  const step = STEPS[currentStep];
  if (!step) return null;

  const chapterStyle = CHAPTER_COLORS[step.chapter] || CHAPTER_COLORS['Morning'];
  const overallProgress = ((currentStep + 1) / STEPS.length) * 100;

  // Group steps by chapter for dot indicators
  const chapters = [...new Set(STEPS.map((s) => s.chapter))];
  const currentChapterIndex = chapters.indexOf(step.chapter);

  return (
    <>
      {/* Dim overlay behind narrator bar for focus */}
      <div
        className="fixed inset-0 z-[190] pointer-events-none transition-opacity duration-500"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 30%)' }}
      />

      {/* Narrator Bar — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[200]">
        {/* Overall progress bar */}
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Main narrator panel */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
          {/* Step progress bar (per-step) */}
          <div className="h-[2px] bg-white/5">
            <div
              className="h-full bg-blue-400/60 transition-none"
              style={{ width: `${progressWidth}%` }}
            />
          </div>

          <div className="max-w-[1440px] mx-auto px-6 py-5">
            <div className="flex items-start gap-6">

              {/* Left: CRC Avatar + Info */}
              <div className="shrink-0 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <User size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">Sarah Chen</p>
                  <p className="text-[10px] text-gray-400">CRC, Memorial Hospital</p>
                  <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-medium ${chapterStyle.bg} ${chapterStyle.text} border ${chapterStyle.border}`}>
                    {step.chapter}
                  </div>
                </div>
              </div>

              {/* Center: Narration */}
              <div className={`flex-1 min-w-0 transition-all duration-500 ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <p className="text-[15px] text-white font-medium leading-relaxed mb-1.5">
                  {step.narration}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {step.subtext}
                </p>
              </div>

              {/* Right: Controls */}
              <div className="shrink-0 flex flex-col items-end gap-3">
                {/* Step counter */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-[family-name:var(--font-mono)]">
                    {currentStep + 1} / {STEPS.length}
                  </span>
                  {paused && (
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/20">
                      Paused
                    </span>
                  )}
                </div>

                {/* Transport controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentStep((s) => Math.max(s - 1, 0))}
                    disabled={currentStep === 0}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                    title="Previous (Left Arrow)"
                  >
                    <SkipBack size={14} />
                  </button>
                  <button
                    onClick={() => setPaused((p) => !p)}
                    className="p-2 rounded-lg text-white bg-white/10 hover:bg-white/20 cursor-pointer transition-colors"
                    title="Play/Pause (Space)"
                  >
                    {paused ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                  {step.isFinal ? (
                    <button
                      onClick={handleClose}
                      className="px-3 py-1.5 rounded-lg text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Finish Demo
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                      title="Next (Right Arrow)"
                    >
                      <SkipForward size={14} />
                    </button>
                  )}
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                    title="End Demo (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Chapter dots */}
                <div className="flex items-center gap-1.5">
                  {chapters.map((ch, i) => (
                    <div
                      key={ch}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentChapterIndex
                          ? 'w-4 bg-blue-400'
                          : i < currentChapterIndex
                            ? 'w-1.5 bg-blue-400/40'
                            : 'w-1.5 bg-white/15'
                      }`}
                      title={ch}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* Keyboard hints */}
            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/5">
              <span className="text-[9px] text-gray-600 flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-[family-name:var(--font-mono)]">Space</kbd> pause
              </span>
              <span className="text-[9px] text-gray-600 flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-[family-name:var(--font-mono)]">&larr; &rarr;</kbd> navigate
              </span>
              <span className="text-[9px] text-gray-600 flex items-center gap-1.5">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-gray-400 font-[family-name:var(--font-mono)]">Esc</kbd> exit
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
