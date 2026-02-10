import { useState } from 'react';
import {
  TrendingDown, DollarSign, Brain, ArrowRight,
  CalendarCheck, BarChart3, Network, Bot, Zap,
  Clock, CheckCircle2, Users, Play, ChevronRight, Activity
} from 'lucide-react';
import DesktopSimulator from './components/DesktopSimulator';
import ROICalculator from './components/ROICalculator';

const STATS = [
  { value: '12', label: 'dropouts prevented', color: '#10b981' },
  { value: '$240K', label: 'saved in pilot', color: '#8b5cf6' },
  { value: '0.96', label: 'model AUC', color: '#3b82f6' },
  { value: '74%', label: 'retention rate', color: '#f59e0b' },
];

const BEFORE_AFTER = [
  { metric: 'Time per intervention', before: '100 min', after: '3 min', icon: Clock },
  { metric: 'Patient retention', before: '45%', after: '74%', icon: Users },
  { metric: 'CRC hours on outreach', before: '18 hrs/wk', after: '2 hrs/wk', icon: TrendingDown },
  { metric: 'Knowledge captured', before: '0%', after: '100%', icon: Brain },
];

const FEATURES = [
  {
    tab: 'workflow',
    icon: CalendarCheck,
    title: 'Daily Workflow',
    description: 'See how AI agents handle 30% of CRC tasks — patient calls, scheduling, EDC updates — with full audit trails.',
    stat: '30%',
    statLabel: 'of tasks automatable',
    color: '#3b82f6',
  },
  {
    tab: 'dashboard',
    icon: BarChart3,
    title: 'Risk Monitor',
    description: 'ML model trained on 2,084 patients identifies dropout risk with 96% accuracy. Agent recommends interventions that worked for similar patients.',
    stat: '0.96',
    statLabel: 'AUC accuracy',
    color: '#ef4444',
  },
  {
    tab: 'knowledgegraph',
    icon: Network,
    title: 'Knowledge Graph',
    description: 'Watch institutional expertise compound across sites over 12 months. Toggle "Knowledge Loss" to see what walks out the door when CRCs leave.',
    stat: '247',
    statLabel: 'interventions logged',
    color: '#8b5cf6',
  },
];

export default function PitchOverview({ onSwitchTab, onStartCRCDemo }) {
  const [showFullDemo, setShowFullDemo] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <DesktopSimulator isOpen={showFullDemo} onClose={() => setShowFullDemo(false)} />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ── Hero ──────────────────────────────────────── */}
        <section className="text-center max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 mb-5">
            <Bot size={13} /> Autonomous CRC Operations Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-[family-name:var(--font-display)] leading-tight mb-4">
            Clinical trials lose 30% of patients.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              We fix that.
            </span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            AI agents that predict dropout risk, execute retention interventions,
            and compound institutional knowledge across sites — so CRCs can focus
            on what matters: patient care.
          </p>

          {/* Key stats */}
          <div className="inline-flex items-center gap-8 bg-white rounded-2xl px-8 py-5 border border-gray-200 shadow-sm">
            {STATS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-10 bg-gray-200 -ml-3" />}
                <div className="text-center">
                  <p className="text-2xl font-bold font-[family-name:var(--font-display)]" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Live Demo ────────────────────────────────── */}
        <section>
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)] mb-1">
              Watch the Agent Work
            </h2>
            <p className="text-sm text-gray-500">
              Schedules appointment, sends confirmation, updates EDC — in 22 seconds
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-gray-300 shadow-xl bg-slate-800" style={{ height: 520 }}>
            <DesktopSimulator embedded />
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={() => setShowFullDemo(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 cursor-pointer transition-colors shadow-sm"
            >
              <Play size={14} className="fill-current" /> Watch Fullscreen
            </button>
            <button
              onClick={onStartCRCDemo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-700 hover:to-blue-700 cursor-pointer transition-all shadow-sm shadow-purple-500/20"
            >
              <Users size={14} /> CRC Day-in-the-Life
            </button>
            <div className="flex items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Zap size={12} className="text-amber-500" /> 3 apps orchestrated</span>
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-blue-500" /> 22 sec vs 15 min manual</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Zero-error audit trail</span>
            </div>
          </div>
        </section>

        {/* ── Before / After Strip ─────────────────────── */}
        <section>
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)] mb-1">
              Before & After
            </h2>
            <p className="text-sm text-gray-500">
              One at-risk patient intervention, manual vs. Cadence
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BEFORE_AFTER.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Icon size={14} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">{item.metric}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2.5">
                    <span className="text-lg font-bold text-red-400 line-through">{item.before}</span>
                    <ArrowRight size={14} className="text-gray-300" />
                    <span className="text-lg font-bold text-emerald-600">{item.after}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── ROI Calculator ───────────────────────────── */}
        <section>
          <ROICalculator />
        </section>

        {/* ── Feature Cards ────────────────────────────── */}
        <section>
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)] mb-1">
              Explore the Platform
            </h2>
            <p className="text-sm text-gray-500">
              Click into each module to see the full product
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.tab}
                  onClick={() => onSwitchTab(f.tab)}
                  className="group text-left bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:border-gray-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${f.color}15` }}>
                      <Icon size={20} style={{ color: f.color }} />
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1.5 font-[family-name:var(--font-display)]">
                    {f.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    {f.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-[family-name:var(--font-display)]" style={{ color: f.color }}>
                      {f.stat}
                    </span>
                    <span className="text-[10px] text-gray-400">{f.statLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
