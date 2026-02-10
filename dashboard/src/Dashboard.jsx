import { useMemo } from 'react';
import { TrendingDown, Clock, Brain, DollarSign, TrendingUp, Zap, Users, Target, Info } from 'lucide-react';
import SummaryCard from './components/SummaryCard';
import PatientTable from './components/PatientTable';
import AgentActivityPanel from './components/AgentActivityPanel';
import { knowledgeBaseInterventions } from './utils/mockData';

function ImpactMetrics() {
  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Impact Overview</h3>
        <p className="text-sm text-gray-600">Last 30 days &bull; Across 3 pilot sites</p>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Metric 1: Dropouts Prevented */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-green-600" />
              <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                -45%
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-green-900 mb-1">12</p>
          <p className="text-sm font-medium text-green-800 mb-1">
            Dropouts prevented
          </p>
          <p className="text-xs text-green-600">
            vs. historical baseline (21 dropouts)
          </p>
        </div>

        {/* Metric 2: Time Saved */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-blue-200 px-2 py-1 rounded-full">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Phase 2
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-900 mb-1">18 hrs</p>
          <p className="text-sm font-medium text-blue-800 mb-1">
            Per week saved per CRC
          </p>
          <p className="text-xs text-blue-600">
            via agent automation (projected)
          </p>
        </div>

        {/* Metric 3: Knowledge Base */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-600" />
              <span className="text-xs font-bold text-purple-700">
                +32 this week
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-900 mb-1">247</p>
          <p className="text-sm font-medium text-purple-800 mb-1">
            Interventions logged
          </p>
          <p className="text-xs text-purple-600">
            Knowledge base from 3 sites
          </p>
        </div>

        {/* Metric 4: Cost Savings */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div className="bg-amber-200 px-2 py-1 rounded-full">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                <Target className="w-3 h-3" />
                ROI
              </span>
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-900 mb-1">$240K</p>
          <p className="text-sm font-medium text-amber-800 mb-1">
            Saved in re-recruitment costs
          </p>
          <p className="text-xs text-amber-600">
            12 patients &times; $20K avg. cost
          </p>
        </div>

      </div>

      {/* Context banner */}
      <div className="mt-4 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Pilot Results &bull; 3 Sites, 2,084 Patients Monitored
            </p>
            <p className="text-xs text-gray-700">
              Early intervention on 47 high-risk patients achieved 74% retention rate
              (vs. 45% historical baseline). CRCs report 60% reduction in time spent on
              manual scheduling and follow-up tasks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ patients, onSelectPatient, onNavigateToKG }) {
  const stats = useMemo(() => {
    const total = patients.length;
    const high = patients.filter((p) => p.risk_level === 'High').length;
    const activeInterventions = patients.filter((p) => p.dropout_risk > 0.5).length;
    const kbSize = knowledgeBaseInterventions.length;
    return { total, high, activeInterventions, kbSize };
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Impact Metrics */}
      <div data-tour-target="impact-metrics">
        <ImpactMetrics />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <SummaryCard
          title="Patients Monitored"
          value={stats.total}
          subtitle="Across all active trials"
          icon="users"
          color="#3b82f6"
        />
        <SummaryCard
          title="High Risk Alerts"
          value={stats.high}
          subtitle="Require immediate attention"
          icon="alert"
          color="#ef4444"
          pulse
        />
        <SummaryCard
          title="Active Interventions"
          value={stats.activeInterventions}
          subtitle="Agent-monitored actions"
          icon="activity"
          color="#f59e0b"
        />
        <SummaryCard
          title="Knowledge Base"
          value={`${stats.kbSize} protocols`}
          subtitle="Cross-site intervention library"
          icon="book"
          color="#8b5cf6"
        />
      </div>

      {/* Quick Stats Bar */}
      <div className="flex items-center gap-6 px-4 py-2.5 rounded-lg bg-white border border-gray-200 animate-fade-in stagger-1">
        <span className="text-xs text-gray-500">
          System learns from: <span className="text-gray-900 font-semibold">14 CRCs</span> across <span className="text-gray-900 font-semibold">5 sites</span>
        </span>
        <span className="w-px h-4 bg-gray-200" />
        <span className="text-xs text-gray-500">
          Avg intervention success rate: <span className="text-[var(--color-risk-low)] font-semibold">64%</span>
        </span>
        <span className="w-px h-4 bg-gray-200" />
        <span className="text-xs text-gray-500">
          Model AUC: <span className="text-[var(--color-agent-cyan)] font-semibold">0.96</span>
        </span>
      </div>

      {/* Risk Score Context — compact */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100 animate-fade-in stagger-1">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Risk scores (0&ndash;1)</span> generated by ML model (AUC 0.96) trained on 2,084 patients across 3 sites.
          <span className="text-red-600 font-medium"> High &gt;0.7</span> &middot;
          <span className="text-amber-600 font-medium"> Medium 0.4&ndash;0.7</span> &middot;
          <span className="text-emerald-600 font-medium"> Low &lt;0.4</span>.
          Agent recommendations draw from 247+ logged interventions.
        </p>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Patient Table */}
        <div className="animate-fade-in stagger-2" data-tour-target="patient-table">
          <PatientTable patients={patients} onSelectPatient={onSelectPatient} onNavigateToKG={onNavigateToKG} />
        </div>

        {/* Sidebar: Agent Activity */}
        <div className="animate-fade-in stagger-3">
          <AgentActivityPanel />
        </div>
      </div>
    </div>
  );
}
