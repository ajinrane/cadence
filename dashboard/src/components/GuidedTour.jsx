import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';

const STEPS = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Cadence',
    body: 'See how AI agents transform clinical trial operations — from automating CRC workflows to compounding institutional knowledge.',
    position: 'center',
    action: { type: 'switchTab', value: 'workflow' },
  },
  {
    id: 'workflow-tasks',
    target: 'workflow-tasks',
    title: 'Agent-Ready Task Queue',
    body: '30% of daily CRC tasks are fully automatable. Tasks flagged "Agent Available" can be delegated to AI agents — scheduling, calls, documentation.',
    position: 'bottom',
  },
  {
    id: 'dashboard-intro',
    target: null,
    title: 'ML-Powered Risk Monitoring',
    body: 'Our dropout prediction model (AUC 0.96) identifies at-risk patients before they drop out. Let\'s see the results.',
    position: 'center',
    action: { type: 'switchTab', value: 'dashboard' },
  },
  {
    id: 'impact',
    target: 'impact-metrics',
    title: '12 Dropouts Prevented, $240K Saved',
    body: 'Early intervention across 3 pilot sites achieved a 74% retention rate vs. 45% historical baseline. Each retained patient saves ~$20K in re-recruitment costs.',
    position: 'bottom',
  },
  {
    id: 'patients',
    target: 'patient-table',
    title: 'Real-Time Patient Monitoring',
    body: 'Every patient is scored in real-time. CRCs see exactly who needs attention and what intervention to use — no guesswork.',
    position: 'top',
  },
  {
    id: 'kg-intro',
    target: null,
    title: 'Institutional Knowledge Graph',
    body: 'This is where expertise compounds. Watch 12 months of CRC knowledge build into a living graph.',
    position: 'center',
    action: { type: 'switchTab', value: 'knowledgegraph' },
  },
  {
    id: 'temporal',
    target: 'temporal-slider',
    title: 'Knowledge Compounds Over Time',
    body: 'Drag the slider to see how interventions, outcomes, and CRC learnings accumulate. By Month 8, cross-site knowledge transfer begins — learnings from one site improve outcomes at another.',
    position: 'bottom',
  },
  {
    id: 'cta',
    target: null,
    title: 'Ready to Explore',
    body: 'You\'ve seen the three pillars: workflow automation, risk prediction, and knowledge capture. Try the Command Center (blue bot icon) to see natural language task execution.',
    position: 'center',
  },
];

export default function GuidedTour({ onComplete, onSwitchTab }) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const tooltipRef = useRef(null);

  const current = STEPS[step];

  // Measure the target element
  const measureTarget = useCallback(() => {
    if (!current.target) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour-target="${current.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const winH = window.innerHeight;
      // Clamp spotlight to visible viewport portion of the element
      const top = Math.max(56, rect.top - 8); // 56 = header height
      const bottom = Math.min(winH, rect.bottom + 8);
      setTargetRect({
        top,
        left: rect.left - 8,
        width: rect.width + 16,
        height: Math.max(60, bottom - top),
      });
    } else {
      setTargetRect(null);
    }
  }, [current.target]);

  useEffect(() => {
    // Execute step action (tab switch) before measuring
    if (current.action?.type === 'switchTab' && onSwitchTab) {
      onSwitchTab(current.action.value);
      // Wait for tab to render before measuring
      const timer = setTimeout(() => { requestAnimationFrame(measureTarget); }, 300);
      return () => clearTimeout(timer);
    }
    // Defer measurement to avoid synchronous setState in effect
    const raf = requestAnimationFrame(measureTarget);
    return () => cancelAnimationFrame(raf);
  }, [step, current.action, onSwitchTab, measureTarget]);

  // Re-measure on resize/scroll
  useEffect(() => {
    if (!current.target) return;
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [current.target, measureTarget]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  }, [step, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Tooltip position — clamp within viewport
  const tooltipStyle = {};
  const TOOLTIP_H = 200; // approximate tooltip height
  const TOOLTIP_W = 340;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

  if (current.position === 'center' || !targetRect) {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  } else if (current.position === 'bottom') {
    // If target is too tall and tooltip would go off-screen, show beside the top of target instead
    const bottomY = targetRect.top + targetRect.height + 12;
    if (bottomY + TOOLTIP_H > vh) {
      tooltipStyle.top = Math.max(80, Math.min(targetRect.top + 20, vh - TOOLTIP_H - 20));
      tooltipStyle.right = 32;
    } else {
      tooltipStyle.top = bottomY;
      tooltipStyle.left = Math.min(Math.max(TOOLTIP_W / 2 + 8, targetRect.left + targetRect.width / 2), vw - TOOLTIP_W / 2 - 8);
      tooltipStyle.transform = 'translateX(-50%)';
    }
  } else if (current.position === 'top') {
    const topY = targetRect.top - 12;
    if (topY - TOOLTIP_H < 60) {
      tooltipStyle.top = Math.max(80, targetRect.top + 20);
      tooltipStyle.right = 32;
    } else {
      tooltipStyle.top = topY;
      tooltipStyle.left = Math.min(Math.max(TOOLTIP_W / 2 + 8, targetRect.left + targetRect.width / 2), vw - TOOLTIP_W / 2 - 8);
      tooltipStyle.transform = 'translate(-50%, -100%)';
    }
  }

  return (
    <div className="fixed inset-0 z-[150]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight border ring */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-[var(--color-agent-cyan)] pointer-events-none"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 20px rgba(34,211,238,0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute z-[151] w-[340px] animate-fade-in"
        style={{ ...tooltipStyle, pointerEvents: 'auto' }}
      >
        <div className="bg-slate-900 border border-[var(--color-agent-cyan)]/30 rounded-xl p-5 shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--color-agent-cyan)]" />
              <h3 className="text-sm font-bold text-white font-[family-name:var(--font-display)]">
                {current.title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-500 hover:text-slate-300 cursor-pointer p-0.5"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {current.body}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step
                      ? 'bg-[var(--color-agent-cyan)]'
                      : i < step
                      ? 'bg-slate-600'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer px-2 py-1"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-agent-cyan)] text-slate-900 text-xs font-semibold hover:bg-[var(--color-agent-cyan)]/90 cursor-pointer transition-colors"
              >
                {step === STEPS.length - 1 ? 'Start Exploring' : 'Next'}
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
