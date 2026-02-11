import { useState, useCallback } from "react";
import { api } from "../../api/client";

function CollapsibleSection({ title, icon, count, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">{icon}</span>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {count != null && (
            <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function CriticalPatientCard({ patient }) {
  const riskPct = ((patient.risk_score || 0) * 100).toFixed(0);
  const riskColor = patient.risk_score >= 0.7 ? "text-red-600" : patient.risk_score >= 0.4 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-800">{patient.name}</span>
          <span className="text-xs text-slate-400 ml-2">{patient.patient_id}</span>
        </div>
        <span className={`text-sm font-bold ${riskColor}`}>{riskPct}% risk</span>
      </div>
      <div className="text-xs text-slate-500 space-y-0.5">
        <p>Trial: {patient.trial_name}</p>
        <p>Days since contact: <span className={patient.days_since_contact > 14 ? "text-red-600 font-medium" : ""}>{patient.days_since_contact}</span></p>
        {patient.next_visit && <p>Next visit: {patient.next_visit}</p>}
        {patient.visits_missed > 0 && (
          <p className="text-red-600 font-medium">Missed visits: {patient.visits_missed}</p>
        )}
      </div>
      {patient.risk_factors?.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Risk Factors</span>
          <ul className="mt-0.5 space-y-0.5">
            {patient.risk_factors.map((f, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                <span className="mt-0.5">*</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {patient.recent_interventions?.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Recent Interventions</span>
          <div className="mt-0.5 space-y-0.5">
            {patient.recent_interventions.map((intv, i) => (
              <p key={i} className="text-xs text-slate-600">
                {intv.date}: {intv.type} &mdash;{" "}
                <span className={intv.outcome === "positive" ? "text-emerald-600" : "text-slate-400"}>
                  {intv.outcome}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HandoffContent({ data }) {
  const overview = data.site_overview || {};
  const critical = data.critical_patients || [];
  const tasks = data.open_tasks || {};
  const protocols = data.protocol_reference || [];
  const works = data.what_works_here || {};
  const dates = data.upcoming_dates || {};
  const monitoring = data.monitoring_status || {};
  const queries = data.open_queries || {};
  const interventions = data.intervention_history || {};

  return (
    <div className="space-y-4">
      {/* Site Overview */}
      <CollapsibleSection title="Site Overview" icon="🏥" defaultOpen={true}>
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{overview.total_patients || 0}</p>
            <p className="text-[10px] text-blue-600 uppercase font-medium">Total Patients</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-emerald-700">{overview.active || 0}</p>
            <p className="text-[10px] text-emerald-600 uppercase font-medium">Active</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-700">{overview.high_risk || 0}</p>
            <p className="text-[10px] text-red-600 uppercase font-medium">High Risk</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{overview.at_risk || 0}</p>
            <p className="text-[10px] text-amber-600 uppercase font-medium">At Risk</p>
          </div>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <p><span className="text-slate-400">Site:</span> {overview.site_name} — {overview.location}</p>
          <p><span className="text-slate-400">PI:</span> {overview.pi}</p>
          <p><span className="text-slate-400">Avg Risk Score:</span> {((overview.avg_risk_score || 0) * 100).toFixed(1)}%</p>
        </div>
        {overview.trials?.length > 0 && (
          <div className="mt-3">
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Active Trials</span>
            <div className="mt-1 space-y-1.5">
              {overview.trials.map((t) => (
                <div key={t.trial_id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
                  <div>
                    <span className="font-medium text-slate-700">{t.name}</span>
                    <span className="text-slate-400 ml-2">{t.condition}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600">{t.enrolled} enrolled</span>
                    {t.high_risk > 0 && <span className="text-red-600 ml-2">{t.high_risk} high risk</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Critical Patients */}
      <CollapsibleSection title="Critical Patients" icon="⚠️" count={critical.length} defaultOpen={true}>
        {critical.length === 0 ? (
          <p className="text-xs text-slate-400">No critical patients at this time</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {critical.map((p) => (
              <CriticalPatientCard key={p.patient_id} patient={p} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Open Tasks */}
      <CollapsibleSection title="Open Tasks" icon="📋" count={tasks.total_pending}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-red-50 rounded p-2.5 text-center">
            <p className="text-lg font-bold text-red-700">{tasks.overdue || 0}</p>
            <p className="text-[10px] text-red-600 uppercase">Overdue</p>
          </div>
          <div className="bg-orange-50 rounded p-2.5 text-center">
            <p className="text-lg font-bold text-orange-700">{tasks.urgent?.length || 0}</p>
            <p className="text-[10px] text-orange-600 uppercase">Urgent</p>
          </div>
          <div className="bg-amber-50 rounded p-2.5 text-center">
            <p className="text-lg font-bold text-amber-700">{tasks.high?.length || 0}</p>
            <p className="text-[10px] text-amber-600 uppercase">High Priority</p>
          </div>
        </div>
        {tasks.by_category && (
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">By Category</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(tasks.by_category).map(([cat, count]) => (
                <span key={cat} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {cat.replace(/_/g, " ")}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Protocol Quick Reference */}
      <CollapsibleSection title="Protocol Reference" icon="📄" count={protocols.length}>
        {protocols.length === 0 ? (
          <p className="text-xs text-slate-400">No protocols loaded</p>
        ) : (
          <div className="space-y-2">
            {protocols.map((p, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-800">{p.name}</span>
                  {p.is_site_specific && (
                    <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-200 px-1 py-0.5 rounded">
                      Site-specific
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{p.trial_id} · v{p.version}</p>
                {p.sections?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.sections.map((s, si) => (
                      <span key={si} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* What Works Here */}
      <CollapsibleSection title="What Works Here" icon="✨" defaultOpen={true}>
        {/* Intervention stats */}
        {works.intervention_stats && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-emerald-50 rounded p-3">
              <p className="text-lg font-bold text-emerald-700">
                {((works.intervention_stats.positive_outcome_rate || 0) * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-emerald-600 uppercase">Positive Outcome Rate</p>
            </div>
            <div className="bg-blue-50 rounded p-3">
              <p className="text-lg font-bold text-blue-700">
                {((works.intervention_stats.system_success_rate || 0) * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-blue-600 uppercase">System Rec Success</p>
            </div>
          </div>
        )}

        {/* Best intervention types */}
        {works.best_intervention_types?.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Best Intervention Types</span>
            <div className="mt-1 space-y-1">
              {works.best_intervention_types.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-1.5">
                  <span className="text-slate-700">{t.type?.replace(/_/g, " ")}</span>
                  <span className="text-emerald-600 font-medium">{((t.success_rate || 0) * 100).toFixed(0)}% success ({t.positive}/{t.total})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge base */}
        {works.knowledge_base?.length > 0 && (
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Institutional Knowledge</span>
            <div className="mt-1 space-y-1.5">
              {works.knowledge_base.map((kb, i) => (
                <div key={i} className="bg-blue-50 border border-blue-100 rounded p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-medium text-blue-700 uppercase">{kb.category}</span>
                    <span className="text-[10px] text-blue-400">{kb.source}</span>
                  </div>
                  <p className="text-xs text-blue-800">{kb.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Upcoming Dates */}
      <CollapsibleSection
        title="Upcoming Dates"
        icon="📅"
        count={(dates.visits_this_week?.length || 0) + (dates.overdue_visits?.length || 0)}
      >
        {dates.overdue_visits?.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] uppercase text-red-600 font-semibold tracking-wide">Overdue Visits</span>
            <div className="mt-1 space-y-1">
              {dates.overdue_visits.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-red-50 rounded px-3 py-1.5">
                  <span className="text-red-700">{v.name} ({v.patient_id})</span>
                  <span className="text-red-600">{v.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {dates.visits_this_week?.length > 0 ? (
          <div>
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">This Week</span>
            <div className="mt-1 space-y-1">
              {dates.visits_this_week.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-1.5">
                  <div>
                    <span className="text-slate-700 font-medium">{v.name}</span>
                    <span className="text-slate-400 ml-1.5">{v.trial_name}</span>
                  </div>
                  <span className="text-slate-600">{v.date}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No visits scheduled this week</p>
        )}
        {dates.monitoring_visits?.length > 0 && (
          <div className="mt-3">
            <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wide">Monitoring Visits</span>
            <div className="mt-1 space-y-1">
              {dates.monitoring_visits.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-purple-50 rounded px-3 py-1.5">
                  <span className="text-purple-700">{v.type?.replace(/_/g, " ")}</span>
                  <span className="text-purple-600">{v.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Monitoring Status */}
      <CollapsibleSection title="Monitoring Status" icon="🔍" count={monitoring.upcoming}>
        <div className="text-xs text-slate-600 space-y-1.5">
          <p>Total visits: {monitoring.total_visits || 0}</p>
          <p>Upcoming: {monitoring.upcoming || 0}</p>
          {monitoring.readiness && <p>Readiness: {monitoring.readiness}</p>}
          {monitoring.next_visit && (
            <div className="bg-slate-50 rounded p-2.5 mt-2">
              <p className="font-medium text-slate-700">Next: {monitoring.next_visit.type?.replace(/_/g, " ")}</p>
              <p className="text-slate-500">Date: {monitoring.next_visit.date}</p>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Open Queries */}
      <CollapsibleSection title="Open Data Queries" icon="❓" count={queries.total_open}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {queries.by_status && Object.entries(queries.by_status).map(([status, count]) => (
            <div key={status} className="bg-slate-50 rounded p-2 text-center">
              <p className="text-sm font-bold text-slate-700">{count}</p>
              <p className="text-[10px] text-slate-400 capitalize">{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
        {queries.queries?.slice(0, 5).map((q, i) => (
          <div key={i} className="text-xs bg-slate-50 rounded p-2.5 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{q.field || q.type}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                q.status === "open" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
              }`}>
                {q.status}
              </span>
            </div>
            <p className="text-slate-500 mt-0.5">{q.description}</p>
          </div>
        ))}
      </CollapsibleSection>

      {/* Intervention History */}
      <CollapsibleSection title="Intervention History" icon="📊" count={interventions.total}>
        {interventions.by_outcome && (
          <div className="flex gap-2 mb-3">
            {Object.entries(interventions.by_outcome).map(([outcome, count]) => {
              const colors = {
                positive: "bg-emerald-50 text-emerald-700",
                neutral: "bg-slate-100 text-slate-600",
                negative: "bg-red-50 text-red-700",
                pending: "bg-amber-50 text-amber-700",
              };
              return (
                <div key={outcome} className={`flex-1 rounded p-2 text-center ${colors[outcome] || "bg-slate-50 text-slate-600"}`}>
                  <p className="text-sm font-bold">{count}</p>
                  <p className="text-[10px] capitalize">{outcome}</p>
                </div>
              );
            })}
          </div>
        )}
        {interventions.recent?.slice(0, 5).map((intv, i) => (
          <div key={i} className="text-xs bg-slate-50 rounded p-2.5 mb-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{intv.type?.replace(/_/g, " ")}</span>
              <span className={`text-[10px] font-medium ${
                intv.outcome === "positive" ? "text-emerald-600" : intv.outcome === "negative" ? "text-red-600" : "text-slate-400"
              }`}>
                {intv.outcome}
              </span>
            </div>
            <p className="text-slate-500">{intv.date} &middot; {intv.patient_name || intv.patient_id}</p>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}

export default function HandoffView({ currentSiteId }) {
  const [handoffData, setHandoffData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState([]);
  const [askingQuestion, setAskingQuestion] = useState(false);

  const generateHandoff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.handoff(currentSiteId);
      setHandoffData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId]);

  const handleAsk = async () => {
    if (!question.trim() || askingQuestion) return;
    setAskingQuestion(true);
    try {
      const result = await api.handoffAsk(currentSiteId, question);
      setQaHistory((prev) => [...prev, { q: question, a: result.response || result.answer || JSON.stringify(result) }]);
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAskingQuestion(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">CRC Handoff</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Comprehensive site briefing for onboarding
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!handoffData && !loading && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">New CRC Onboarding</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Generate a comprehensive briefing for this site. Includes critical patients,
            open tasks, protocol references, intervention history, and institutional knowledge.
          </p>
          <button
            onClick={generateHandoff}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
          >
            I&apos;m a new CRC — brief me
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <div className="flex justify-center gap-1 mb-4">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-slate-500">Compiling your site briefing...</p>
          <p className="text-xs text-slate-400 mt-1">Pulling from patients, tasks, protocols, interventions, and knowledge base</p>
        </div>
      )}

      {handoffData && !loading && (
        <>
          {/* Generated timestamp */}
          <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generated {new Date(handoffData.generated_at).toLocaleString()}
            <button
              onClick={generateHandoff}
              className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          <HandoffContent data={handoffData} />

          {/* Q&A Section */}
          <div className="mt-8 bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Ask a Question</h3>
            <p className="text-xs text-slate-400 mb-3">
              Have questions about this site? Ask and Cadence will answer based on all available data.
            </p>

            {qaHistory.length > 0 && (
              <div className="space-y-3 mb-4">
                {qaHistory.map((qa, i) => (
                  <div key={i}>
                    <p className="text-xs font-medium text-slate-700 mb-1">Q: {qa.q}</p>
                    <div className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded p-3">
                      {qa.a}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Which patients need immediate attention? What retention strategies work best here?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-400 transition-colors"
              />
              <button
                onClick={handleAsk}
                disabled={askingQuestion || !question.trim()}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {askingQuestion ? "Asking..." : "Ask"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
