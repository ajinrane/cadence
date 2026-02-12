import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const ROLE_COLORS = {
  lead_crc: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  crc: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  research_assistant: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  site_admin: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  pi: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

function getInitials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function getAvatarColor(role) {
  const map = {
    lead_crc: "from-blue-500 to-indigo-600",
    crc: "from-emerald-500 to-teal-600",
    research_assistant: "from-purple-500 to-violet-600",
    site_admin: "from-amber-500 to-orange-600",
    pi: "from-red-500 to-rose-600",
  };
  return map[role] || "from-slate-500 to-slate-600";
}

function utilizationColor(pct) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function utilizationLabel(pct) {
  if (pct >= 90) return { text: "At capacity", color: "text-red-600" };
  if (pct >= 70) return { text: "Heavy load", color: "text-amber-600" };
  return { text: "Available", color: "text-emerald-600" };
}

function StaffCard({ staff, onSelect, isExpanded }) {
  const colors = ROLE_COLORS[staff.role] || ROLE_COLORS.crc;
  const util = utilizationLabel(staff.utilization_pct || 0);

  return (
    <div
      className={`bg-white border rounded-lg transition-all cursor-pointer hover:border-slate-300 ${
        isExpanded ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
      }`}
      onClick={() => onSelect(isExpanded ? null : staff.id)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(staff.role)} flex items-center justify-center shrink-0`}>
            <span className="text-white font-semibold text-sm">{getInitials(staff.name)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 truncate">{staff.name}</h3>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {staff.role_label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{staff.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{staff.patient_count}</p>
            <p className="text-[10px] text-slate-400">Patients</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-800">{staff.pending_task_count}</p>
            <p className="text-[10px] text-slate-400">Tasks</p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-medium ${util.color}`}>{util.text}</span>
              <span className="text-[10px] text-slate-400">{Math.min(staff.utilization_pct, 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${utilizationColor(staff.utilization_pct)} transition-all duration-500`}
                style={{ width: `${Math.min(staff.utilization_pct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && <StaffDetail staff={staff} />}
    </div>
  );
}

function StaffDetail({ staff }) {
  const [patients, setPatients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.staffPatients(staff.id).catch(() => ({ patients: [] })),
      api.staffTasks(staff.id).catch(() => ({ tasks: [] })),
    ]).then(([pData, tData]) => {
      setPatients(pData.patients || []);
      setTasks(tData.tasks || []);
      setLoading(false);
    });
  }, [staff.id]);

  if (loading) {
    return (
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="animate-pulse flex gap-4">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-3 bg-slate-100 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 px-4 py-3 space-y-3">
      {/* Specialties */}
      {staff.specialties?.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">Trial Specialties</p>
          <div className="flex flex-wrap gap-1">
            {staff.specialties.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Patients */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">
          Patients ({patients.length})
        </p>
        {patients.length === 0 ? (
          <p className="text-xs text-slate-400">No assigned patients</p>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {patients.slice(0, 8).map(p => {
              const riskColor = p.dropout_risk_score >= 0.7 ? "text-red-500" : p.dropout_risk_score >= 0.4 ? "text-amber-500" : "text-emerald-500";
              return (
                <div key={p.patient_id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate">{p.name}</span>
                  <span className={`font-medium ${riskColor}`}>{(p.dropout_risk_score * 100).toFixed(0)}%</span>
                </div>
              );
            })}
            {patients.length > 8 && (
              <p className="text-[10px] text-slate-400">+{patients.length - 8} more</p>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">
          Pending Tasks ({tasks.filter(t => t.status === "pending").length})
        </p>
        {tasks.filter(t => t.status === "pending").length === 0 ? (
          <p className="text-xs text-slate-400">No pending tasks</p>
        ) : (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {tasks.filter(t => t.status === "pending").slice(0, 5).map(t => {
              const prioColor = t.priority === "urgent" ? "bg-red-100 text-red-700" : t.priority === "high" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
              return (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${prioColor}`}>{t.priority}</span>
                  <span className="text-slate-700 truncate flex-1">{t.title}</span>
                  <span className="text-slate-400 shrink-0">{t.due_date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CapacityTable({ capacity }) {
  if (!capacity || capacity.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Capacity Recommendations</h3>
      <div className="space-y-2">
        {capacity.map(c => (
          <div key={c.staff_id} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarColor(c.role)} flex items-center justify-center`}>
                <span className="text-white font-semibold text-[9px]">{getInitials(c.name)}</span>
              </div>
              <span className="text-slate-700 font-medium">{c.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{c.current_patients}/{c.max_load} patients</span>
              <span className="font-semibold text-emerald-600">+{c.available_capacity} available</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StaffDirectory({ currentSiteId }) {
  const [staff, setStaff] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, workloadRes] = await Promise.all([
        api.staff({ site_id: currentSiteId }),
        api.staffWorkload(currentSiteId),
      ]);
      setStaff(staffRes.staff || []);
      setWorkload(workloadRes.workload || []);
      setCapacity(workloadRes.capacity || []);
    } catch {
      // silently handle
    }
    setLoading(false);
  }, [currentSiteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStaff = roleFilter === "all"
    ? staff
    : staff.filter(s => s.role === roleFilter);

  const roles = [...new Set(staff.map(s => s.role))];

  // Summary stats
  const totalPatients = staff.reduce((acc, s) => acc + (s.patient_count || 0), 0);
  const totalTasks = staff.reduce((acc, s) => acc + (s.pending_task_count || 0), 0);
  const avgUtil = staff.length > 0
    ? Math.round(staff.reduce((acc, s) => acc + (s.utilization_pct || 0), 0) / staff.length)
    : 0;

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
            <div className="h-20 bg-slate-100 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-slate-100 rounded-lg" />
            <div className="h-48 bg-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Your Team</h1>
            <p className="text-xs text-slate-400 mt-0.5">{staff.length} team members at this site</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Team Size</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{staff.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Total Patients</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalPatients}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Pending Tasks</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{totalTasks}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Avg Utilization</p>
            <p className={`text-xl font-bold mt-0.5 ${avgUtil >= 90 ? "text-red-600" : avgUtil >= 70 ? "text-amber-600" : "text-emerald-600"}`}>
              {avgUtil}%
            </p>
          </div>
        </div>

        {/* Role filter pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              roleFilter === "all" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {roles.map(role => {
            const colors = ROLE_COLORS[role] || ROLE_COLORS.crc;
            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  roleFilter === role ? `${colors.bg} ${colors.text}` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            );
          })}
        </div>

        {/* Staff cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStaff.map(s => (
            <StaffCard
              key={s.id}
              staff={s}
              onSelect={setSelectedId}
              isExpanded={selectedId === s.id}
            />
          ))}
        </div>

        {/* Capacity recommendations */}
        <CapacityTable capacity={capacity.filter(c => c.site_id === currentSiteId)} />
      </div>
    </div>
  );
}
