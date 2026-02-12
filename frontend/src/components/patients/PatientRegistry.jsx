import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

function RiskDot({ score }) {
  const color =
    score >= 0.7 ? "bg-red-500" : score >= 0.4 ? "bg-amber-500" : "bg-emerald-500";
  return <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />;
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    at_risk: "bg-red-50 text-red-700 border-red-200",
    withdrawn: "bg-slate-100 text-slate-500 border-slate-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status] || styles.active}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const isActive = sortBy === field;
  return (
    <th
      className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-slate-600 select-none"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && (
          <svg className={`w-3 h-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  );
}

function ExpandedPatientCard({ patient, onAddNote, staffList, staffLookup, onReassign }) {
  const [noteText, setNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("general");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTo, setReassignTo] = useState("");
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingSummary(true);
    api.patientSummary(patient.patient_id)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSummary(false);
      });
    return () => { cancelled = true; };
  }, [patient.patient_id]);

  const handleSubmitNote = () => {
    if (noteText.trim()) {
      onAddNote(patient.patient_id, { content: noteText, category: noteCategory });
      setNoteText("");
      setShowNoteForm(false);
    }
  };

  return (
    <tr>
      <td colSpan={8} className="px-4 py-4 bg-slate-50 border-b border-slate-100">
        <div className="grid grid-cols-3 gap-4">
          {/* Risk Factors */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-slate-800 mb-2 uppercase tracking-wide">Risk Factors</h4>
            {patient.risk_factors?.length > 0 ? (
              <ul className="space-y-1">
                {patient.risk_factors.map((f, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">*</span>
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No risk factors identified</p>
            )}
          </div>

          {/* Recommended Actions */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-slate-800 mb-2 uppercase tracking-wide">Recommended Actions</h4>
            {patient.recommended_actions?.length > 0 ? (
              <ul className="space-y-1">
                {patient.recommended_actions.map((a, i) => (
                  <li key={i} className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No actions recommended</p>
            )}
          </div>

          {/* Recent Interventions & Notes */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-slate-800 mb-2 uppercase tracking-wide">
              Recent Activity
            </h4>
            {loadingSummary ? (
              <p className="text-xs text-slate-400">Loading...</p>
            ) : summary ? (
              <div className="space-y-1.5">
                {summary.recent_interventions?.slice(0, 3).map((intv, i) => (
                  <div key={i} className="text-xs text-slate-600">
                    <span className="text-slate-400">{intv.date}:</span> {intv.type} &mdash;{" "}
                    <span className={intv.outcome === "positive" ? "text-emerald-600" : "text-slate-500"}>
                      {intv.outcome}
                    </span>
                  </div>
                ))}
                {summary.notes?.slice(0, 2).map((note, i) => (
                  <div key={i} className="text-xs text-slate-500 italic bg-slate-50 rounded px-2 py-1">
                    {note.content}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No recent activity</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Add Note
          </button>
          <button className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
            Flag for PI
          </button>
          {staffList.length > 0 && (
            <button
              onClick={() => setShowReassign(!showReassign)}
              className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
            >
              Reassign CRC
            </button>
          )}
        </div>

        {showReassign && (
          <div className="mt-3 flex gap-2 items-center">
            <span className="text-xs text-slate-500">Current: {staffLookup[patient.primary_crc_id] || "Unassigned"}</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400"
            >
              <option value="">Select CRC...</option>
              {staffList.filter(s => s.role !== "research_assistant" && s.id !== patient.primary_crc_id).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role_label})</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (reassignTo) {
                  onReassign(patient.patient_id, reassignTo);
                  setShowReassign(false);
                  setReassignTo("");
                }
              }}
              disabled={!reassignTo}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reassign
            </button>
          </div>
        )}

        {showNoteForm && (
          <div className="mt-3 flex gap-2 items-end">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this patient..."
              className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
              rows={2}
            />
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-2 focus:outline-none focus:border-blue-400"
            >
              <option value="general">General</option>
              <option value="clinical">Clinical</option>
              <option value="compliance">Compliance</option>
              <option value="communication">Communication</option>
            </select>
            <button
              onClick={handleSubmitNote}
              className="text-xs bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Save
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function PatientRegistry({ currentSiteId, dataVersion, preferences = {} }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState(preferences.default_sort || "dropout_risk_score");
  const [sortDir, setSortDir] = useState("desc");
  const [activeFilter, setActiveFilter] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [staffFilter, setStaffFilter] = useState("all");

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.patientRegistry({
        site_id: currentSiteId,
        sort_by: sortBy,
      });
      setPatients(Array.isArray(data) ? data : data.patients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId, sortBy]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Refetch when data changes externally (e.g., patient reassigned via chat)
  useEffect(() => {
    if (dataVersion > 0) fetchPatients();
  }, [dataVersion]);

  // Fetch staff for CRC column + filter
  useEffect(() => {
    if (!currentSiteId) return;
    api.staff({ site_id: currentSiteId })
      .then((res) => setStaffList(res.staff || []))
      .catch(() => {});
  }, [currentSiteId]);

  const staffLookup = Object.fromEntries(staffList.map((s) => [s.id, s.name]));

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const handleAddNote = async (patientId, note) => {
    try {
      await api.addNote(patientId, note);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReassign = async (patientId, staffId) => {
    try {
      await api.assignPatient(patientId, staffId);
      // Update local state
      setPatients((prev) =>
        prev.map((p) => p.patient_id === patientId ? { ...p, primary_crc_id: staffId } : p)
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const contactDays = preferences.needs_contact_days || 14;
  const twoWeeksAgo = new Date(Date.now() - contactDays * 86400000).toISOString().split("T")[0];

  const filteredPatients = patients
    .filter((p) => {
      // Staff filter
      if (staffFilter !== "all" && p.primary_crc_id !== staffFilter) return false;
      if (!activeFilter) return true;
      if (activeFilter === "high_risk") return p.dropout_risk_score >= 0.7;
      if (activeFilter === "overdue") return p.next_visit_date && p.next_visit_date < today;
      if (activeFilter === "needs_contact") return p.last_contact_date && p.last_contact_date < twoWeeksAgo;
      if (activeFilter === "this_week") return p.next_visit_date && p.next_visit_date >= today && p.next_visit_date <= weekAhead;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const filters = [
    { id: "high_risk", label: "High Risk", count: patients.filter((p) => p.dropout_risk_score >= 0.7).length },
    { id: "overdue", label: "Overdue", count: patients.filter((p) => p.next_visit_date && p.next_visit_date < today).length },
    { id: "needs_contact", label: "Needs Contact", count: patients.filter((p) => p.last_contact_date && p.last_contact_date < twoWeeksAgo).length },
    { id: "this_week", label: "This Week", count: patients.filter((p) => p.next_visit_date && p.next_visit_date >= today && p.next_visit_date <= weekAhead).length },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Patient Registry</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filteredPatients.length} of {patients.length} patients
          </p>
        </div>

        {/* Staff filter */}
        {staffList.length > 0 && (
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-blue-400"
          >
            <option value="all">All Team Members</option>
            {staffList.filter(s => s.role !== "research_assistant").map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(activeFilter === f.id ? null : f.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === f.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`ml-1.5 ${activeFilter === f.id ? "text-blue-200" : "text-slate-400"}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading patients...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">No patients match the current filter</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <SortHeader label="Name" field="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Patient ID" field="patient_id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Trial</th>
                <SortHeader label="Risk Score" field="dropout_risk_score" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Status" field="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Next Visit" field="next_visit_date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Last Contact" field="last_contact_date" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Primary CRC</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p) => (
                <>
                  <tr
                    key={p.patient_id}
                    onClick={() => setExpandedId(expandedId === p.patient_id ? null : p.patient_id)}
                    className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      expandedId === p.patient_id ? "bg-slate-50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{p.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 font-mono">{p.patient_id}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.trial_name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <RiskDot score={p.dropout_risk_score} />
                        <span className={`text-sm font-medium ${
                          p.dropout_risk_score >= 0.7 ? "text-red-600" : p.dropout_risk_score >= 0.4 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {(p.dropout_risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.next_visit_date || "—"}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.last_contact_date || "—"}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {p.primary_crc_id ? staffLookup[p.primary_crc_id] || "—" : "—"}
                    </td>
                  </tr>
                  {expandedId === p.patient_id && (
                    <ExpandedPatientCard
                      key={`expanded-${p.patient_id}`}
                      patient={p}
                      onAddNote={handleAddNote}
                      staffList={staffList}
                      staffLookup={staffLookup}
                      onReassign={handleReassign}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
