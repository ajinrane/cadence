import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const PRIORITY_COLORS = {
  urgent: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  normal: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  low: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", dot: "bg-slate-400" },
};

const CATEGORY_LABELS = {
  visit: "Visit",
  call: "Call",
  lab: "Lab",
  documentation: "Docs",
  intervention: "Intervention",
  query: "Query",
  monitoring: "Monitor",
  general: "General",
};

function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${c.bg} ${c.text} ${c.border} border`}>
      {priority}
    </span>
  );
}

function StaffInitials({ name }) {
  if (!name) return null;
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <span className="text-[9px] font-semibold bg-slate-200 text-slate-600 w-5 h-5 rounded-full flex items-center justify-center shrink-0" title={name}>
      {initials}
    </span>
  );
}

function TaskCard({ task, onComplete, onExpand, isExpanded, staffLookup }) {
  const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
  const isOverdue = task.due_date < formatDate(new Date()) && task.status !== "completed";
  const assignedName = staffLookup?.[task.assigned_to];

  return (
    <div
      className={`${c.bg} ${c.border} border rounded-lg p-2.5 mb-1.5 cursor-pointer hover:shadow-sm transition-all ${
        isOverdue ? "ring-1 ring-red-300" : ""
      }`}
      onClick={() => onExpand(task.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {assignedName && <StaffInitials name={assignedName} />}
          <div className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0 mt-1`} />
          <span className={`text-xs font-medium ${c.text} truncate`}>{task.title}</span>
        </div>
        {isOverdue && <span className="text-[9px] text-red-600 font-medium shrink-0">OVERDUE</span>}
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
          {task.patient_name && (
            <div className="text-xs text-slate-600">
              <span className="text-slate-400">Patient:</span> {task.patient_name}
              {task.patient_id && <span className="text-slate-400"> ({task.patient_id})</span>}
            </div>
          )}
          {task.trial_name && (
            <div className="text-xs text-slate-600">
              <span className="text-slate-400">Trial:</span> {task.trial_name}
            </div>
          )}
          {task.risk_score != null && (
            <div className="text-xs text-slate-600">
              <span className="text-slate-400">Risk:</span>{" "}
              <span className={task.risk_score >= 0.7 ? "text-red-600 font-medium" : ""}>
                {(task.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {task.description && (
            <p className="text-xs text-slate-500">{task.description}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <PriorityBadge priority={task.priority} />
            <span className="text-[10px] text-slate-400">
              {CATEGORY_LABELS[task.category] || task.category}
            </span>
          </div>
          {task.status !== "completed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              className="mt-1 w-full text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddTaskForm({ onSubmit, onCancel, siteId, staffList }) {
  const [form, setForm] = useState({
    title: "",
    patient_id: "",
    due_date: formatDate(new Date()),
    priority: "normal",
    category: "general",
    assigned_to: "",
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">New Task</h3>
      <div className="space-y-2.5">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
        />
        <input
          type="text"
          placeholder="Patient ID (optional)"
          value={form.patient_id}
          onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
          className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex gap-2">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
          >
            <option value="general">General</option>
            <option value="visit">Visit</option>
            <option value="call">Call</option>
            <option value="lab">Lab</option>
            <option value="documentation">Documentation</option>
            <option value="intervention">Intervention</option>
            <option value="query">Query</option>
            <option value="monitoring">Monitoring</option>
          </select>
          {staffList.length > 0 && (
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
            >
              <option value="">Assign to...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (form.title.trim()) {
                onSubmit({ ...form, site_id: siteId, status: "pending" });
              }
            }}
            className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Task
          </button>
          <button
            onClick={onCancel}
            className="text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskCalendar({ currentSiteId, dataVersion, preferences = {} }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(preferences.default_view || "week");
  const [baseDate, setBaseDate] = useState(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffFilter, setStaffFilter] = useState("all");

  const weekDates = getWeekDates(baseDate);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = formatDate(new Date());

  // Build staff ID → name lookup
  const staffLookup = {};
  staffList.forEach(s => { staffLookup[s.id] = s.name; });

  // Fetch staff list once on site change
  useEffect(() => {
    api.staff({ site_id: currentSiteId })
      .then(data => setStaffList(data.staff || []))
      .catch(() => {});
  }, [currentSiteId]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await api.tasks({ site_id: currentSiteId, start_date: startDate, end_date: endDate });
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId, baseDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Refetch when data changes externally (e.g., task created via chat)
  useEffect(() => {
    if (dataVersion > 0) fetchTasks();
  }, [dataVersion]);

  const handleComplete = async (taskId) => {
    try {
      await api.updateTask(taskId, { status: "completed" });
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await api.createTask(taskData);
      setShowAddForm(false);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const navigateWeek = (direction) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + direction * 7);
    setBaseDate(d);
  };

  const filteredTasks = staffFilter === "all"
    ? tasks
    : tasks.filter(t => t.assigned_to === staffFilter);

  const getTasksForDate = (dateStr) => {
    return filteredTasks.filter((t) => t.due_date === dateStr);
  };

  const overdueTasks = filteredTasks.filter((t) => t.due_date < today && t.status !== "completed");

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Task Calendar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filteredTasks.length} tasks this week &middot; {overdueTasks.length} overdue
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Staff filter */}
          {staffList.length > 0 && (
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 focus:outline-none focus:border-blue-400"
            >
              <option value="all">All Team</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "week" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "day" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Day
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Add Task
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {showAddForm && (
        <AddTaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowAddForm(false)}
          siteId={currentSiteId}
          staffList={staffList}
        />
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateWeek(-1)}
          className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          &larr; Prev
        </button>
        <span className="text-sm font-medium text-slate-700">
          {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} &mdash;{" "}
          {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={() => navigateWeek(1)}
          className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          Next &rarr;
        </button>
      </div>

      {/* Overdue section */}
      {overdueTasks.length > 0 && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
            Overdue ({overdueTasks.length})
          </h3>
          <div className="space-y-1">
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onExpand={setExpandedTaskId}
                isExpanded={expandedTaskId === task.id}
                staffLookup={staffLookup}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading tasks...</div>
      ) : view === "week" ? (
        /* Week view */
        <div className="grid grid-cols-7 gap-3">
          {weekDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const dayTasks = getTasksForDate(dateStr);
            const isToday = dateStr === today;

            return (
              <div key={dateStr} className="min-h-[200px]">
                <div
                  className={`text-center py-2 mb-2 rounded-lg ${
                    isToday ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <div className="text-xs font-medium">{dayNames[idx]}</div>
                  <div className={`text-lg font-semibold ${isToday ? "" : "text-slate-800"}`}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onExpand={setExpandedTaskId}
                      isExpanded={expandedTaskId === task.id}
                      staffLookup={staffLookup}
                    />
                  ))}
                  {dayTasks.length === 0 && (
                    <p className="text-[10px] text-slate-300 text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Day view */
        <div>
          <div className="text-center mb-4">
            <div className="text-sm font-medium text-slate-400">
              {baseDate.toLocaleDateString("en-US", { weekday: "long" })}
            </div>
            <div className="text-2xl font-semibold text-slate-800">
              {baseDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            {getTasksForDate(formatDate(baseDate)).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onExpand={setExpandedTaskId}
                isExpanded={expandedTaskId === task.id}
                staffLookup={staffLookup}
              />
            ))}
            {getTasksForDate(formatDate(baseDate)).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No tasks scheduled for this day</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
