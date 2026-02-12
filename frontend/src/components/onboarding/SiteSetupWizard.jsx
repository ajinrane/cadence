import { useState, useEffect } from "react";
import { api } from "../../api/client";

const STEPS = [
  { label: "Welcome" },
  { label: "Trials" },
  { label: "Patients" },
  { label: "Protocols" },
  { label: "Ready" },
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

function StepWelcome({ siteName, onNext }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
        <span className="text-white font-bold text-2xl">C</span>
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-3">Welcome to Cadence</h2>
      {siteName && (
        <p className="text-sm text-blue-600 font-medium mb-4">{siteName}</p>
      )}
      <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
        Cadence helps your team prevent patient dropout by organizing your workflow and
        preserving institutional knowledge. Let's get your site set up.
      </p>
      <button
        onClick={onNext}
        className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function StepTrials({ siteId, onNext }) {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.trials(siteId)
      .then((data) => setTrials(Array.isArray(data) ? data : data.trials || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Your Trials</h2>
      <p className="text-sm text-slate-500 mb-6">
        These trials have been set up for your site. Confirm they look correct.
      </p>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">Loading trials...</div>
      ) : trials.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-700">
            No trials assigned yet. Ask your admin to add trials for your site.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {trials.map((trial) => (
            <div
              key={trial.trial_id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{trial.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {trial.phase} &middot; {trial.condition}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{trial.trial_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mb-6">
        Missing a trial? Ask your admin to add it in the Admin panel.
      </p>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Looks Good
        </button>
      </div>
    </div>
  );
}

function StepPatients({ onNext, onNavigate }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Add Your Patients</h2>
      <p className="text-sm text-slate-500 mb-6">
        Cadence works best when it knows about your patients. How would you like to add them?
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 rounded-xl p-5 text-center hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Import from CSV</h3>
          <p className="text-xs text-slate-400">Coming soon</p>
        </div>

        <button
          onClick={() => {
            onNavigate("patients");
          }}
          className="border border-blue-200 bg-blue-50 rounded-xl p-5 text-center hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-blue-700 mb-1">Add Manually</h3>
          <p className="text-xs text-blue-500">Go to Patient Registry</p>
        </button>
      </div>

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

function StepProtocol({ siteId, onNext }) {
  const [trials, setTrials] = useState([]);

  useEffect(() => {
    api.trials(siteId)
      .then((data) => setTrials(Array.isArray(data) ? data : data.trials || []))
      .catch(() => {});
  }, [siteId]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Upload a Protocol</h2>
      <p className="text-sm text-slate-500 mb-6">
        Upload your trial protocols so Cadence can make them searchable. You can always do this later.
      </p>

      {trials.length > 0 && (
        <div className="space-y-2 mb-6">
          {trials.map((trial) => (
            <div
              key={trial.trial_id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3"
            >
              <span className="text-sm text-slate-700">{trial.name}</span>
              <span className="text-xs text-slate-400">Upload via Protocols tab</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {trials.length > 0 ? "Skip for Now" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function StepComplete({ onComplete }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-3">You're All Set!</h2>
      <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-2">
        Your site is ready. Here's what you can do with Cadence:
      </p>
      <ul className="text-sm text-slate-600 space-y-1.5 max-w-sm mx-auto text-left mb-8">
        <li className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">*</span>
          Chat with Cadence to manage patients and tasks
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">*</span>
          Track risk scores and prevent patient dropout
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">*</span>
          Build institutional knowledge your whole team can use
        </li>
        <li className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">*</span>
          Prep for monitoring visits automatically
        </li>
      </ul>
      <button
        onClick={onComplete}
        className="px-6 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export default function SiteSetupWizard({ siteId, siteName, onComplete, onNavigate }) {
  const [step, setStep] = useState(0);

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const handleComplete = () => {
    localStorage.setItem(`cadence_site_setup_${siteId}`, "true");
    onComplete();
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
              Skip setup
            </button>
          </div>
        )}

        {/* Steps */}
        {step === 0 && <StepWelcome siteName={siteName} onNext={handleNext} />}
        {step === 1 && <StepTrials siteId={siteId} onNext={handleNext} />}
        {step === 2 && <StepPatients onNext={handleNext} onNavigate={(page) => { handleComplete(); onNavigate(page); }} />}
        {step === 3 && <StepProtocol siteId={siteId} onNext={handleNext} />}
        {step === 4 && <StepComplete onComplete={handleComplete} />}

        {/* Progress dots */}
        <ProgressDots current={step} total={STEPS.length} />
      </div>
    </div>
  );
}
