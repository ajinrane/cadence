import { useMemo } from 'react';
import {
  ArrowLeft, User, MapPin, Phone, Clock, FlaskConical,
  Bot, Activity
} from 'lucide-react';
import RiskBadge from './components/RiskBadge';
import RiskGauge from './components/RiskGauge';
import AgentActionCard from './components/AgentActionCard';
import KnowledgeBaseCard from './components/KnowledgeBaseCard';
import InterventionLog from './components/InterventionLog';
import AgentWorkflowPreview from './components/AgentWorkflowPreview';
import PatientJourneyTimeline from './components/PatientJourneyTimeline';
import {
  formatDate, getAgentStatus, getStatusLabel, getStatusColor,
} from './utils/formatters';
import { getPatientRiskFactors, getPatientActions } from './utils/mockData';

export default function PatientDetail({ patient, onBack }) {
  const riskFactors = useMemo(() => getPatientRiskFactors(patient), [patient]);
  const actions = useMemo(() => getPatientActions(patient), [patient]);
  const agentStatus = getAgentStatus(patient);
  const statusColor = getStatusColor(agentStatus);

  if (!patient) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Patient not found</p>
        <button onClick={onBack} className="mt-4 text-sm text-[var(--color-agent-blue)] hover:underline cursor-pointer">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const quickStats = [
    { icon: User, label: 'Age', value: `${patient.age || '—'} / ${patient.gender || '—'}` },
    { icon: MapPin, label: 'Distance', value: `${patient.distance_from_site_miles?.toFixed(1) || '—'} mi` },
    { icon: Phone, label: 'Contact Pref', value: patient.contact_method_preference || '—' },
    { icon: Clock, label: 'Last Contact', value: `${patient.days_since_last_contact}d ago` },
    { icon: FlaskConical, label: 'Visits', value: `${patient.completed_visits}/${patient.scheduled_visits} completed` },
    { icon: Activity, label: 'Status', value: patient.status || '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Patient Header */}
      <div className="card animate-fade-in">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Risk Gauge */}
          <div className="shrink-0">
            <RiskGauge score={patient.dropout_risk} level={patient.risk_level} />
          </div>

          {/* Patient Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
                {patient.patient_id}
              </h2>
              <RiskBadge level={patient.risk_level} size="lg" />
              <span className="font-[family-name:var(--font-mono)] text-xs text-gray-400">
                {patient.trial_id}
              </span>
            </div>

            {/* Agent status */}
            <div className="flex items-center gap-2 mb-4">
              <Bot size={14} style={{ color: statusColor }} />
              <span className="text-xs font-medium" style={{ color: statusColor }}>
                {getStatusLabel(agentStatus)}
              </span>
              {agentStatus === 'intervention_queued' && (
                <span className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">
                  — {actions.length} action(s) in queue
                </span>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickStats.map((stat, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon size={11} className="text-gray-400" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient Journey Timeline */}
      <div data-demo-scroll="patient-journey">
        <PatientJourneyTimeline patient={patient} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Risk Factors */}
          <div className="card animate-fade-in stagger-1" data-demo-scroll="risk-factors">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-[var(--color-risk-high)]" />
              <h3 className="text-sm font-semibold text-gray-900">Dropout Risk Analysis</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">ML model + behavioral signals</p>

            <div className="space-y-3">
              {riskFactors.map((factor, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-900">{factor.name}</span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                        factor.impact === 'HIGH'
                          ? 'bg-[var(--color-risk-high)]/12 text-[var(--color-risk-high)]'
                          : 'bg-[var(--color-risk-medium)]/12 text-[var(--color-risk-medium)]'
                      }`}
                    >
                      {factor.impact}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                    {factor.explanation}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${factor.contribution}%`,
                          background: factor.impact === 'HIGH'
                            ? 'linear-gradient(90deg, #ef4444, #f87171)'
                            : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-gray-400">
                      {factor.contribution}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw risk factors from CSV */}
            {patient.top_3_risk_factors && (
              <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Model Output</p>
                <p className="text-xs text-gray-500 font-[family-name:var(--font-mono)]">
                  {patient.top_3_risk_factors}
                </p>
              </div>
            )}
          </div>

          {/* Autonomous Intervention Queue */}
          <div className="card animate-fade-in stagger-2" data-demo-scroll="intervention-queue">
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-[var(--color-agent-cyan)]" />
              <h3 className="text-sm font-semibold text-gray-900">Autonomous Intervention Queue</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Agent-generated action plan based on institutional knowledge
            </p>

            <div className="space-y-3">
              {actions.map((action, i) => (
                <AgentActionCard key={i} action={action} index={i} />
              ))}
              {actions.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">
                  No interventions queued — patient risk below threshold
                </p>
              )}
            </div>
          </div>

          {/* Intervention Log */}
          <div className="animate-fade-in stagger-3">
            <InterventionLog patientId={patient.patient_id} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Knowledge Base */}
          <div className="animate-fade-in stagger-1">
            <KnowledgeBaseCard />
          </div>

          {/* Agent Workflow Preview */}
          <div className="animate-fade-in stagger-2">
            <AgentWorkflowPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
