import { useState, useEffect } from "react";
import { api } from "../../api/client";

const STEPS = [
  { label: "Welcome" },
  { label: "Briefing" },
  { label: "Patients" },
  { label: "Calendar" },
  { label: "Chat" },
];

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all ${
            i <= current ? "bg-blue-600" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function StepWelcome({ siteName, userName, onNext }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">
        Welcome to {siteName || "Your Site"}
      </h2>
      {userName && (
        <p className="text-sm text-blue-600 font-medium mb-4">Hi, {userName}!</p>
      )}
      <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
        Your team has been using Cadence to manage patients and preserve institutional
        knowledge. Let's get you up to speed.
      </p>
      <button
        onClick={onNext}
        className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Show Me Around
      </button>
    </div>
  );
}

function StepBriefing({ siteId, onNext, onNavigate }) {
  const [handoff, setHandoff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.handoff(siteId)
      .then(setHandoff)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">Generating your briefing...</p>
      </div>
    );
  }

  const overview = handoff?.site_overview || {};
  const criticalCount = handoff?.critical_patients?.length || 0;
  const openTasks = handoff?.open_tasks?.total_pending || 0;
  const trials = overview.trials || [];

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Your Briefing</h2>
      <p className="text-sm text-slate-500 mb-5">
        Here's a snapshot of what's happening at your site.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Active Patients</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{overview.active || 0}</p>
          <p className="text-xs text-slate-400">{overview.total_patients || 0} total enrolled</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">High Risk</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{overview.high_risk || 0}</p>
          <p className="text-xs text-slate-400">{criticalCount} critical</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Open Tasks</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{openTasks}</p>
          <p className="text-xs text-slate-400">{handoff?.open_tasks?.overdue || 0} overdue</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Active Trials</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{trials.length}</p>
          <p className="text-xs text-slate-400">
            {trials.map((t) => t.name?.split(" ")[0]).join(", ") || "None"}
          </p>
        </div>
      </div>

      <button
        onClick={() => onNavigate("handoff")}
        className="text-xs text-blue-600 hover:text-blue-700 transition-colors mb-5 block"
      >
        View Full Briefing &rarr;
      </button>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepPatients({ siteId, onNext, onNavigate }) {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.patientRegistry({ site_id: siteId, sort_by: "risk_score" })
      .then((data) => {
        const list = data.patients || [];
        setPatients(list.slice(0, 5));
        setTotal(data.total || list.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Your Patients</h2>
      <p className="text-sm text-slate-500 mb-5">
        {total > 0
          ? `Your site has ${total} enrolled patients. Here are the ones that need the most attention.`
          : "Your site's patient registry is ready for you."}
      </p>

      {loading ? (
        <div className="text-center py-6 text-sm text-slate-400">Loading patients...</div>
      ) : patients.length > 0 ? (
        <div className="space-y-2 mb-4">
          {patients.map((p) => (
            <div
              key={p.patient_id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3"
            >
              <div>
                <span className="text-sm font-medium text-slate-800">{p.name}</span>
                <span className="text-xs text-slate-400 ml-2">{p.trial_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    p.dropout_risk_score >= 0.7
                      ? "bg-red-500"
                      : p.dropout_risk_score >= 0.4
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
                <span className="text-xs text-slate-500">
                  {(p.dropout_risk_score * 100).toFixed(0)}% risk
                </span>
              </div>
            </div>
          ))}
          {total > 5 && (
            <p className="text-xs text-slate-400 text-center">
              +{total - 5} more patients
            </p>
          )}
        </div>
      ) : null}

      <button
        onClick={() => onNavigate("patients")}
        className="text-xs text-blue-600 hover:text-blue-700 transition-colors mb-5 block"
      >
        View All Patients &rarr;
      </button>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepCalendar({ siteId, onNext, onNavigate }) {
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tasksToday(siteId)
      .then((data) => {
        const tasks = Array.isArray(data) ? data : data.tasks || [];
        setTaskCount(tasks.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Your Calendar</h2>
      <p className="text-sm text-slate-500 mb-5">
        Cadence auto-generates tasks based on patient visit schedules and risk levels.
      </p>

      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center mb-5">
        {loading ? (
          <p className="text-sm text-slate-400">Loading today's tasks...</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-slate-800">{taskCount}</p>
            <p className="text-sm text-slate-500 mt-1">tasks for today</p>
          </>
        )}
      </div>

      <button
        onClick={() => onNavigate("calendar")}
        className="text-xs text-blue-600 hover:text-blue-700 transition-colors mb-5 block"
      >
        Open Calendar &rarr;
      </button>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepChat({ onComplete, onNavigate }) {
  const questions = [
    "Give me an overview of what's happening at this site",
    "Who are my high-risk patients?",
    "What tasks do I have today?",
    "What does this site's team know about retention?",
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Ask Cadence Anything</h2>
      <p className="text-sm text-slate-500 mb-5">
        Cadence is your AI assistant for patient management, task creation, and clinical trial
        operations. Try asking a question:
      </p>

      <div className="space-y-2 mb-6">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onNavigate("chat")}
            className="w-full text-left text-sm bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
          >
            "{q}"
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onComplete}
          className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Finish Setup
        </button>
      </div>
    </div>
  );
}

export default function NewCRCWelcome({ siteId, siteName, userName, onComplete, onNavigate }) {
  const [step, setStep] = useState(0);

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const handleComplete = () => {
    api.markFirstLoginComplete().catch(() => {});
    onComplete();
  };

  const handleNavigate = (page) => {
    api.markFirstLoginComplete().catch(() => {});
    onComplete();
    onNavigate(page);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full mx-4 p-8 animate-[scaleIn_0.2s_ease-out]">
        {/* Skip link */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-slate-400">
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleComplete}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip tour
            </button>
          </div>
        )}

        {/* Steps */}
        {step === 0 && <StepWelcome siteName={siteName} userName={userName} onNext={handleNext} />}
        {step === 1 && <StepBriefing siteId={siteId} onNext={handleNext} onNavigate={handleNavigate} />}
        {step === 2 && <StepPatients siteId={siteId} onNext={handleNext} onNavigate={handleNavigate} />}
        {step === 3 && <StepCalendar siteId={siteId} onNext={handleNext} onNavigate={handleNavigate} />}
        {step === 4 && <StepChat onComplete={handleComplete} onNavigate={handleNavigate} />}

        {/* Progress dots */}
        <ProgressDots current={step} total={STEPS.length} />
      </div>
    </div>
  );
}
