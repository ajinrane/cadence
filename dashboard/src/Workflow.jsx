import { useState } from 'react';
import {
  Phone, FlaskConical, ClipboardList, FileText, Users, TestTube,
  Settings, Search, Plus, Bot, Clock, Calendar, CheckCircle2,
  AlertTriangle, ChevronRight, Eye, Sparkles, X, Circle,
  Loader2, MapPin, User, Play
} from 'lucide-react';

// ─── Mock Data ───────────────────────────────────────────────

const categories = [
  { icon: Phone, label: 'Patient Outreach', count: 12, overdue: 3, color: '#3b82f6' },
  { icon: FlaskConical, label: 'Recruitment', count: 8, overdue: 0, color: '#8b5cf6' },
  { icon: ClipboardList, label: 'IRB & Compliance', count: 4, urgent: 1, color: '#f59e0b' },
  { icon: FileText, label: 'Documentation', count: 6, overdue: 0, color: '#6b7280' },
  { icon: Users, label: 'Team Coordination', count: 5, overdue: 0, color: '#10b981' },
  { icon: TestTube, label: 'Lab & Clinical', count: 3, overdue: 0, color: '#06b6d4' },
  { icon: Settings, label: 'Admin & Training', count: 2, overdue: 0, color: '#9ca3af' },
];

const calendarBlocks = [
  { time: '8:00 AM', endTime: '8:30 AM', title: 'Team Standup', duration: 30, type: 'meeting', color: '#e5e7eb', textColor: '#374151' },
  { time: '9:00 AM', endTime: '10:00 AM', title: 'Agent: Patient Calls', duration: 60, type: 'agent', color: '#dbeafe', textColor: '#1d4ed8', patients: ['PT-0047', 'PT-0112', 'PT-0089'] },
  { time: '10:30 AM', endTime: '11:15 AM', title: 'IRB Amendment Review', duration: 45, type: 'compliance', color: '#fef3c7', textColor: '#92400e' },
  { time: '12:00 PM', endTime: '1:00 PM', title: 'Lunch Break', duration: 60, type: 'break', color: '#f3f4f6', textColor: '#9ca3af' },
  { time: '1:00 PM', endTime: '2:00 PM', title: 'PI Meeting — Trial NCT12345679', duration: 60, type: 'meeting', color: '#d1fae5', textColor: '#065f46' },
  { time: '2:30 PM', endTime: '3:30 PM', title: 'Agent: EDC Documentation', duration: 60, type: 'agent', color: '#dbeafe', textColor: '#1d4ed8' },
];

const timeSlots = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'];

const tasks = [
  {
    id: 1, title: 'Call Patient PT-0047 — Dropout Risk', category: 'Patient Outreach',
    priority: 'HIGH', dueTime: 'Today, 2:00 PM', duration: '15 min', assignee: 'Sarah Chen',
    status: 'Not Started', agentCapable: true,
    notes: 'Patient prefers calls before 3pm. Transportation issues flagged — offer ride service. Last contact 47 days ago.',
  },
  {
    id: 2, title: 'Submit Protocol Amendment to IRB', category: 'IRB & Compliance',
    priority: 'HIGH', dueTime: 'Today, 5:00 PM', duration: '45 min', assignee: 'Michael Torres',
    status: 'In Progress', agentCapable: false,
    notes: 'Amendment for dosing schedule change. PI signed off yesterday. Upload to IRB portal + email notification.',
  },
  {
    id: 3, title: 'Screen 3 Recruitment Candidates', category: 'Recruitment',
    priority: 'MEDIUM', dueTime: 'Today, 3:00 PM', duration: '30 min', assignee: 'Jessica Park',
    status: 'Not Started', agentCapable: true,
    notes: 'New referrals from cardiology. Check inclusion/exclusion criteria against protocol NCT12345670.',
  },
  {
    id: 4, title: 'Update Trial Binder with Latest Protocol', category: 'Documentation',
    priority: 'MEDIUM', dueTime: 'Today, 4:00 PM', duration: '20 min', assignee: 'Sarah Chen',
    status: 'Not Started', agentCapable: false,
    notes: 'Protocol v3.2 received. File in regulatory binder and update version log.',
  },
  {
    id: 5, title: 'Review Lab Results for Trial NCT12345674', category: 'Lab & Clinical',
    priority: 'LOW', dueTime: 'Tomorrow', duration: '25 min', assignee: 'Michael Torres',
    status: 'Not Started', agentCapable: false,
    notes: 'Weekly lab panel review. Flag any out-of-range values for PI notification.',
  },
  {
    id: 6, title: 'Schedule Next Month\'s PI Meetings', category: 'Team Coordination',
    priority: 'LOW', dueTime: 'Tomorrow', duration: '15 min', assignee: 'Jessica Park',
    status: 'Not Started', agentCapable: true,
    notes: 'Coordinate across 3 trial PIs. Check availability and book conference rooms.',
  },
  {
    id: 7, title: 'Follow Up on 2 Patient No-Shows', category: 'Patient Outreach',
    priority: 'MEDIUM', dueTime: 'Today, 4:30 PM', duration: '20 min', assignee: 'Sarah Chen',
    status: 'Not Started', agentCapable: true,
    notes: 'PT-0123 missed visit on Feb 6. PT-0135 missed visit on Feb 5. Determine barrier and reschedule.',
  },
  {
    id: 8, title: 'Respond to IRB Clarification Request', category: 'IRB & Compliance',
    priority: 'HIGH', dueTime: 'Tomorrow, 10:00 AM', duration: '30 min', assignee: 'Michael Torres',
    status: 'Not Started', agentCapable: false,
    notes: 'IRB requested additional safety data for continuing review. Compile AE summary from last quarter.',
  },
  {
    id: 9, title: 'Enter Visit Data for 5 Patients', category: 'Documentation',
    priority: 'MEDIUM', dueTime: 'Today, 3:00 PM', duration: '40 min', assignee: 'David Kim',
    status: 'In Progress', agentCapable: true,
    notes: 'Data entry for Week 8 visits. 3 patients have pending lab results to reconcile.',
  },
  {
    id: 10, title: 'Complete GCP Training Module', category: 'Admin & Training',
    priority: 'LOW', dueTime: 'Friday', duration: '60 min', assignee: 'David Kim',
    status: 'Not Started', agentCapable: false,
    notes: 'Annual GCP refresher. Must complete before March 1st deadline. Module 3 of 5 remaining.',
  },
  {
    id: 11, title: 'Coordinate Transport for PT-0047 Visit', category: 'Patient Outreach',
    priority: 'HIGH', dueTime: 'Today, 1:00 PM', duration: '15 min', assignee: 'Jessica Park',
    status: 'Not Started', agentCapable: true,
    notes: 'Patient lives 45 miles away. Arrange ride service voucher. Visit scheduled for Thursday.',
  },
  {
    id: 12, title: 'File Adverse Event Report for NCT12345674', category: 'Lab & Clinical',
    priority: 'HIGH', dueTime: 'Today, 11:00 AM', duration: '30 min', assignee: 'David Kim',
    status: 'Not Started', agentCapable: false,
    notes: 'Grade 2 AE reported yesterday. Need to file in EDC within 24 hours. PI already notified.',
  },
];

const teamMembers = [
  { name: 'Sarah Chen', role: 'Senior CRC', tasks: 12, hours: 6, current: 'Patient call (15m)', available: 2, avatar: 'SC' },
  { name: 'Michael Torres', role: 'CRC', tasks: 10, hours: 5, current: 'IRB submission', available: 3, avatar: 'MT' },
  { name: 'Jessica Park', role: 'CRC', tasks: 8, hours: 4, current: 'Lab coordination', available: 4, avatar: 'JP' },
  { name: 'David Kim', role: 'CRC I', tasks: 6, hours: 3.5, current: 'Data entry', available: 4.5, avatar: 'DK' },
];

const memberLookup = Object.fromEntries(teamMembers.map(m => [m.name, m]));

// ─── Sub-components ──────────────────────────────────────────

function PriorityBadge({ priority }) {
  const config = {
    HIGH: 'bg-red-500 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    LOW: 'bg-emerald-500 text-white',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config[priority] || config.LOW}`}>
      {priority}
    </span>
  );
}

function AgentBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
      <Bot size={11} /> Agent Available
    </span>
  );
}

function StatusDot({ status }) {
  const colors = {
    'Not Started': 'bg-gray-300',
    'In Progress': 'bg-blue-500',
    'Done': 'bg-emerald-500',
  };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || colors['Not Started']}`} />;
}

// ─── Agent Modal ─────────────────────────────────────────────

function AgentModal({ task, onClose }) {
  const steps = [
    'Check patient contact preference',
    `Find optimal call time (${task.dueTime?.split(', ')[1] || '2-3pm'})`,
    'Generate talking points from risk analysis',
    'Execute call via phone system',
    'Log outcome in EDC system',
    'Update patient dropout risk score',
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bot size={16} className="text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 font-[family-name:var(--font-display)]">
              Assign to AI Agent
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Task */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">Task</p>
            <p className="text-sm font-medium text-gray-900">{task.title}</p>
          </div>

          {/* Agent Actions */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">Agent Actions</p>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-sm text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Approval Mode */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">Approval Mode</p>
            <div className="space-y-2">
              {['Auto-Execute Daily', 'Execute Once', 'Review Draft First'].map((mode, i) => (
                <label key={mode} className="flex items-center gap-2.5 cursor-pointer group">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    i === 1 ? 'border-blue-500' : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {i === 1 && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </span>
                  <span className={`text-sm ${i === 1 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{mode}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <button onClick={onClose} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer transition-colors">
              Assign to Agent <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workflow Component ─────────────────────────────────

// Helper: renders task title with clickable patient IDs
function TaskTitle({ title, onNavigateToDashboard }) {
  if (!onNavigateToDashboard) return <span>{title}</span>;
  const parts = title.split(/(PT-\d{4})/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^PT-\d{4}$/.test(part) ? (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onNavigateToDashboard(part); }}
            className="font-[family-name:var(--font-mono)] text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer transition-colors mx-0.5"
          >
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function Workflow({ onNavigateToDashboard }) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [viewMode, setViewMode] = useState('my');
  const [taskStatuses, setTaskStatuses] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const totalTasks = categories.reduce((s, c) => s + c.count, 0);
  const agentTasks = tasks.filter((t) => t.agentCapable).length;

  // Cycle task status: Not Started -> In Progress -> Done -> Not Started
  function cycleStatus(taskId) {
    setTaskStatuses(prev => {
      const current = prev[taskId] || tasks.find(t => t.id === taskId)?.status || 'Not Started';
      const next = current === 'Not Started' ? 'In Progress' : current === 'In Progress' ? 'Done' : 'Not Started';
      return { ...prev, [taskId]: next };
    });
  }

  // Filter tasks based on view mode, search, and category
  const filteredTasks = tasks.filter(task => {
    // View mode filter
    if (viewMode === 'my' && task.assignee !== 'Sarah Chen') return false;

    // Category filter
    if (activeCategory !== null && task.category !== categories[activeCategory]?.label) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(q);
      const matchesCategory = task.category.toLowerCase().includes(q);
      const matchesAssignee = task.assignee.toLowerCase().includes(q);
      if (!matchesTitle && !matchesCategory && !matchesAssignee) return false;
    }

    return true;
  });

  // Group tasks by assignee for Team Tasks view
  const grouped = {};
  filteredTasks.forEach(task => {
    if (!grouped[task.assignee]) grouped[task.assignee] = [];
    grouped[task.assignee].push(task);
  });

  // Renders a single task card (shared between My Tasks and Team Tasks views)
  function renderTaskCard(task) {
    const status = taskStatuses[task.id] || task.status;

    // Button config based on status
    let buttonLabel, ButtonIcon, buttonClasses;
    if (status === 'Not Started') {
      buttonLabel = 'Start Task';
      ButtonIcon = Play;
      buttonClasses = 'bg-gray-900 text-white hover:bg-gray-800';
    } else if (status === 'In Progress') {
      buttonLabel = 'Mark Done';
      ButtonIcon = CheckCircle2;
      buttonClasses = 'bg-gray-900 text-white hover:bg-gray-800';
    } else {
      buttonLabel = 'Completed';
      ButtonIcon = CheckCircle2;
      buttonClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default';
    }

    return (
      <div
        key={task.id}
        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow px-5 py-4"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <h4 className="text-sm font-semibold text-gray-900">
              <TaskTitle title={task.title} onNavigateToDashboard={onNavigateToDashboard} />
            </h4>
          </div>
          {task.agentCapable && (
            <button onClick={() => setModalTask(task)} className="shrink-0 cursor-pointer bg-transparent border-none p-0">
              <AgentBadge />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
          <span className="flex items-center gap-1">
            <ClipboardList size={11} /> {task.category}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} /> {task.dueTime}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} /> {task.duration}
          </span>
          <span className="flex items-center gap-1">
            <User size={11} /> {task.assignee}
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status={status} /> {status}
          </span>
        </div>

        {/* Notes */}
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          {task.notes}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
            <Eye size={12} /> View Details
          </button>
          <button
            onClick={() => cycleStatus(task.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${buttonClasses}`}
          >
            <ButtonIcon size={12} /> {buttonLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-[family-name:var(--font-body)]">
      {/* Agent Modal */}
      {modalTask && <AgentModal task={modalTask} onClose={() => setModalTask(null)} />}

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
              Daily Workflow
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Saturday, February 8, 2025</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('my')}
                className={`px-3 py-2 text-xs font-medium cursor-pointer ${viewMode === 'my' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >My Tasks</button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-3 py-2 text-xs font-medium cursor-pointer ${viewMode === 'team' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >Team Tasks</button>
            </div>
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 w-56 transition-all"
              />
            </div>
            {/* New Task */}
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors shadow-sm">
              <Plus size={14} /> New Task
            </button>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-5">

          {/* ── LEFT SIDEBAR: Categories ────────────────── */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
              Task Categories
            </h3>

            {categories.map((cat, i) => {
              const Icon = cat.icon;
              const isActive = activeCategory === i;
              return (
                <button
                  key={i}
                  onClick={() => setActiveCategory(isActive ? null : i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all ${
                    isActive ? 'bg-white shadow-sm border border-gray-200' : 'hover:bg-white/60'
                  }`}
                >
                  <Icon size={15} style={{ color: cat.color }} className="shrink-0" />
                  <span className={`text-sm flex-1 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {cat.label}
                  </span>
                  <span className="text-xs font-medium text-gray-400 tabular-nums">{cat.count}</span>
                  {cat.overdue > 0 && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{cat.overdue}</span>
                  )}
                  {cat.urgent > 0 && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">!</span>
                  )}
                </button>
              );
            })}

            <div className="border-t border-gray-200 mt-3 pt-3 px-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">All Tasks</span>
                <span className="text-sm font-bold text-gray-900">{totalTasks}</span>
              </div>
            </div>

            {/* Agent stats mini card */}
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Bot size={14} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Agent Coverage</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 font-[family-name:var(--font-display)]">30%</p>
              <p className="text-[11px] text-blue-600 mt-0.5">of today's tasks can be fully automated</p>
            </div>
          </div>

          {/* ── MAIN CONTENT: Calendar + Tasks ──────────── */}
          <div className="space-y-5">

            {/* Calendar Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Today's Schedule</h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  <Sparkles size={11} />
                  AI optimized 8 tasks for maximum efficiency
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="relative">
                  {/* Time column + events */}
                  <div className="space-y-0">
                    {timeSlots.map((slot, i) => {
                      const block = calendarBlocks.find((b) => b.time.startsWith(slot.replace(' AM', ':00 AM').replace(' PM', ':00 PM')) || b.time.startsWith(slot));
                      const matchedBlock = calendarBlocks.find((b) => {
                        const slotHour = parseInt(slot);
                        const blockHour = parseInt(b.time);
                        const slotIsPM = slot.includes('PM');
                        const blockIsPM = b.time.includes('PM');
                        return slotHour === blockHour && slotIsPM === blockIsPM;
                      });

                      return (
                        <div key={slot} className="flex items-stretch gap-4 min-h-[44px]">
                          {/* Time label */}
                          <span className="w-14 text-[11px] font-[family-name:var(--font-mono)] text-gray-400 pt-1 text-right shrink-0">
                            {slot}
                          </span>

                          {/* Event or empty slot */}
                          <div className="flex-1 border-t border-gray-100 pt-1 pb-1">
                            {matchedBlock ? (
                              <div
                                className="rounded-lg px-3 py-2"
                                style={{ backgroundColor: matchedBlock.color }}
                              >
                                <div className="flex items-center gap-2">
                                  {matchedBlock.type === 'agent' && <Bot size={13} style={{ color: matchedBlock.textColor }} />}
                                  <span className="text-xs font-semibold" style={{ color: matchedBlock.textColor }}>
                                    {matchedBlock.title}
                                  </span>
                                  <span className="text-[10px] ml-auto" style={{ color: matchedBlock.textColor, opacity: 0.7 }}>
                                    {matchedBlock.duration}m
                                  </span>
                                </div>
                                {matchedBlock.patients && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {matchedBlock.patients.map((p) => (
                                      <button
                                        key={p}
                                        onClick={() => onNavigateToDashboard?.(p)}
                                        className="text-[10px] font-[family-name:var(--font-mono)] px-1.5 py-0.5 rounded bg-white/50 hover:bg-white/80 cursor-pointer transition-colors border-none"
                                        style={{ color: matchedBlock.textColor }}
                                      >
                                        {p}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full min-h-[32px]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Task List */}
            <div data-tour-target="workflow-tasks">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Tasks ({filteredTasks.length})</h3>
                <span className="text-xs text-gray-400">Sorted by priority</span>
              </div>

              {viewMode === 'my' ? (
                <div className="space-y-2.5">
                  {filteredTasks.map((task) => renderTaskCard(task))}
                </div>
              ) : (
                <div>
                  {Object.entries(grouped).map(([assignee, assigneeTasks]) => {
                    const member = memberLookup[assignee];
                    return (
                      <div key={assignee} className="mb-6">
                        <div className="flex items-center gap-3 mb-3 px-1">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                            {member?.avatar || assignee.split(' ').map(w => w[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{assignee}</p>
                            <p className="text-[11px] text-gray-500">{member?.role || 'CRC'} &middot; {assigneeTasks.length} tasks</p>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {assigneeTasks.map((task) => renderTaskCard(task))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR: Team ─────────────────────── */}
          <div className="space-y-4">
            {/* Team Overview Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Overview</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">{totalTasks}</p>
                  <p className="text-[10px] text-gray-500">tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">75%</p>
                  <p className="text-[10px] text-gray-500">capacity</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600 font-[family-name:var(--font-display)]">12</p>
                  <p className="text-[10px] text-blue-500">agent tasks</p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {teamMembers.map((member, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                    {member.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                    <p className="text-[11px] text-gray-500">{member.role}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Today</span>
                    <span className="text-xs font-medium text-gray-700">{member.tasks} tasks · {member.hours} hrs</span>
                  </div>
                  {/* Capacity bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(member.hours / 8) * 100}%`,
                        backgroundColor: member.hours > 6 ? '#ef4444' : member.hours > 4 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Loader2 size={10} className="text-blue-500" /> {member.current}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-600">{member.available} hrs free</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 text-center px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                    View Calendar
                  </button>
                  <button className="flex-1 text-center px-2 py-1.5 rounded-lg bg-blue-50 text-[11px] font-medium text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors border border-blue-100">
                    Assign Task
                  </button>
                </div>
              </div>
            ))}

            {/* Agent Coverage card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={15} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Agent Coverage</span>
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                <span className="font-semibold">30%</span> of today's tasks can be fully automated. Assign agent-capable tasks to free up <span className="font-semibold">4.5 hours</span> of CRC time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
