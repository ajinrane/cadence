import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const STATUS_STYLES = {
  ready: { icon: "check", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Ready" },
  needs_attention: { icon: "alert", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Needs Attention" },
  not_started: { icon: "x", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Not Started" },
};

function StatusIcon({ status }) {
  if (status === "ready") {
    return (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === "needs_attention") {
    return (
      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ProgressBar({ percentage }) {
  const color =
    percentage >= 80 ? "bg-emerald-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

function ChecklistItem({ item, visitId, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.not_started;

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg`}>
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => item.status === "needs_attention" && setExpanded(!expanded)}
      >
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-800">{item.category?.replace(/_/g, " ")}</span>
          {item.description && (
            <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        {item.status === "needs_attention" && (
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {expanded && item.status === "needs_attention" && (
        <div className="px-4 pb-3 border-t border-amber-100 pt-2.5">
          {item.patient_ids?.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-slate-500 block mb-1">Affected patients:</span>
              <div className="flex flex-wrap gap-1">
                {item.patient_ids.map((pid) => (
                  <span key={pid} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">
                    {pid}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.notes && (
            <p className="text-xs text-slate-500 italic">{item.notes}</p>
          )}
          <button
            onClick={() => onUpdate(visitId, item.id, { status: "ready" })}
            className="mt-2 text-xs bg-emerald-600 text-white px-3 py-1 rounded-md hover:bg-emerald-700 transition-colors font-medium"
          >
            Mark as Ready
          </button>
        </div>
      )}
    </div>
  );
}

function VisitCard({ visit, isActive, onSelect }) {
  const isUpcoming = visit.status === "upcoming";
  const visitDate = new Date(visit.scheduled_date || visit.date);
  const dateStr = visitDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      onClick={() => isUpcoming && onSelect(visit.id)}
      className={`bg-white border rounded-lg p-4 transition-all ${
        isActive
          ? "border-blue-400 ring-1 ring-blue-100"
          : isUpcoming
          ? "border-slate-200 hover:border-slate-300 cursor-pointer"
          : "border-slate-100 opacity-60"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{visit.type?.replace(/_/g, " ") || "Monitoring Visit"}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{dateStr}</p>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
            visit.status === "upcoming"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : visit.status === "completed"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}
        >
          {visit.status}
        </span>
      </div>
      {visit.monitor_name && (
        <p className="text-xs text-slate-500 mt-1.5">Monitor: {visit.monitor_name}</p>
      )}
    </div>
  );
}

export default function MonitoringPrep({ currentSiteId, preferences = {} }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [prep, setPrep] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(false);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.monitoring(currentSiteId);
      const visitList = Array.isArray(data) ? data : data.visits || [];
      setVisits(visitList);
      // Auto-select first upcoming visit
      const upcoming = visitList.find((v) => v.status === "upcoming");
      if (upcoming) setSelectedVisitId(upcoming.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    if (!selectedVisitId) {
      setPrep(null);
      return;
    }
    setLoadingPrep(true);
    api.monitoringPrep(selectedVisitId)
      .then((data) => setPrep(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPrep(false));
  }, [selectedVisitId]);

  const handleUpdateChecklist = async (visitId, itemId, data) => {
    try {
      await api.updateChecklist(visitId, itemId, data);
      // Refresh prep
      const freshPrep = await api.monitoringPrep(visitId);
      setPrep(freshPrep);
    } catch (err) {
      setError(err.message);
    }
  };

  const readinessPct = prep?.summary?.readiness_pct ?? prep?.readiness_pct ?? 0;
  const checklist = prep?.checklist || [];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Monitoring Visit Prep</h1>
          <p className="text-sm text-slate-400 mt-0.5">{visits.length} visits tracked</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading visits...</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Visit list */}
          <div className="col-span-1 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Visits</h2>
            {visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                isActive={selectedVisitId === visit.id}
                onSelect={setSelectedVisitId}
              />
            ))}
            {visits.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No monitoring visits scheduled</p>
            )}
          </div>

          {/* Checklist */}
          <div className="col-span-2">
            {!selectedVisitId ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Select an upcoming visit to see the prep checklist
              </div>
            ) : loadingPrep ? (
              <div className="text-center py-12 text-slate-400 text-sm">Loading prep checklist...</div>
            ) : (
              <>
                {/* Readiness summary */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-800">Readiness</h2>
                    <span
                      className={`text-lg font-bold ${
                        readinessPct >= 80
                          ? "text-emerald-600"
                          : readinessPct >= 50
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {readinessPct}%
                    </span>
                  </div>
                  <ProgressBar percentage={readinessPct} />
                  {prep?.summary?.summary && (
                    <p className="text-xs text-slate-500 mt-3">{prep.summary.summary}</p>
                  )}
                </div>

                {/* Checklist items */}
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Checklist ({checklist.length} items)
                </h2>
                <div className="space-y-2">
                  {checklist.map((item, i) => (
                    <ChecklistItem
                      key={item.id || i}
                      item={item}
                      visitId={selectedVisitId}
                      onUpdate={handleUpdateChecklist}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
