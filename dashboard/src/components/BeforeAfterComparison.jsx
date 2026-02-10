import { useState } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, X, ArrowRight,
  Phone, FileText, Calendar, Brain, Bot, Zap, TrendingDown,
  Users, ChevronRight
} from 'lucide-react';

const MANUAL_STEPS = [
  { label: 'Check EDC for overdue patients', duration: '20 min', icon: FileText, pain: 'Manual scan of 50+ records' },
  { label: 'Cross-reference risk factors in spreadsheet', duration: '15 min', icon: AlertTriangle, pain: 'Data scattered across 3 systems' },
  { label: 'Decide who to call first', duration: '10 min', icon: Brain, pain: 'Gut feeling, no data model' },
  { label: 'Look up patient contact preferences', duration: '5 min', icon: Users, pain: 'Not always documented' },
  { label: 'Make outreach call', duration: '15 min', icon: Phone, pain: 'Often reaches voicemail' },
  { label: 'Schedule follow-up appointment', duration: '10 min', icon: Calendar, pain: 'Phone tag with scheduling' },
  { label: 'Log intervention in EDC + notes', duration: '15 min', icon: FileText, pain: 'Duplicate data entry' },
  { label: 'Email PI with status update', duration: '10 min', icon: FileText, pain: 'Manual summary writing' },
];

const CADENCE_STEPS = [
  { label: 'AI identifies high-risk patients automatically', duration: '0 min', icon: Brain, benefit: 'Model scans all patients daily (AUC 0.96)' },
  { label: 'Agent prioritizes by risk score + history', duration: '0 min', icon: Zap, benefit: 'Data-driven, not gut feeling' },
  { label: 'Agent pulls contact preferences', duration: '0 min', icon: Users, benefit: 'Integrated patient profiles' },
  { label: 'CRC reviews + approves agent plan', duration: '2 min', icon: CheckCircle2, benefit: 'Human-in-the-loop oversight' },
  { label: 'Agent executes call + schedules visit', duration: '1 min', icon: Bot, benefit: 'Cross-app automation' },
  { label: 'Auto-logs to EDC with audit trail', duration: '0 min', icon: FileText, benefit: 'Zero manual data entry' },
  { label: 'Knowledge base updated for future patients', duration: '0 min', icon: Brain, benefit: 'Institutional memory grows' },
];

const METRICS = [
  { label: 'Time per intervention', manual: '100 min', cadence: '3 min', improvement: '97%' },
  { label: 'Patient retention rate', manual: '45%', cadence: '74%', improvement: '+64%' },
  { label: 'CRC hours/week on outreach', manual: '18 hrs', cadence: '2 hrs', improvement: '89%' },
  { label: 'Knowledge captured', manual: '0%', cadence: '100%', improvement: 'New' },
];

export default function BeforeAfterComparison() {
  const [activeView, setActiveView] = useState('split'); // 'split', 'manual', 'cadence'
  const [hoveredStep, setHoveredStep] = useState(null);

  const manualTotal = MANUAL_STEPS.reduce((sum, s) => sum + parseInt(s.duration), 0);
  const cadenceTotal = CADENCE_STEPS.reduce((sum, s) => sum + parseInt(s.duration), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 font-[family-name:var(--font-display)]">
              Before & After: Patient Retention Workflow
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              How a single at-risk patient intervention changes with Cadence
            </p>
          </div>
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
            {[
              { key: 'split', label: 'Side by Side' },
              { key: 'manual', label: 'Manual Only' },
              { key: 'cadence', label: 'With Cadence' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`px-3 py-1.5 text-[11px] font-medium cursor-pointer transition-colors ${
                  activeView === key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="p-6">
        <div className={`grid gap-6 ${activeView === 'split' ? 'grid-cols-2' : 'grid-cols-1 max-w-xl mx-auto'}`}>
          {/* Manual Column */}
          {(activeView === 'split' || activeView === 'manual') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <X size={16} className="text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Without Cadence</h4>
                  <p className="text-[10px] text-gray-500">Manual CRC workflow — {manualTotal} min per patient</p>
                </div>
              </div>

              <div className="space-y-2">
                {MANUAL_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                      onMouseEnter={() => setHoveredStep(`manual-${i}`)}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="w-5 h-5 rounded-full bg-red-200 text-red-700 text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <Icon size={13} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">{step.label}</p>
                        <p className="text-[10px] text-red-600 mt-0.5">{step.pain}</p>
                      </div>
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                        {step.duration}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 p-3 rounded-lg bg-red-100 border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-800">Total time per patient</span>
                  <span className="text-lg font-bold text-red-900 font-[family-name:var(--font-display)]">{manualTotal} min</span>
                </div>
                <p className="text-[10px] text-red-700 mt-1">
                  With 47 at-risk patients, that's {Math.round(manualTotal * 47 / 60)} hours of CRC time per cycle
                </p>
              </div>
            </div>
          )}

          {/* Cadence Column */}
          {(activeView === 'split' || activeView === 'cadence') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">With Cadence</h4>
                  <p className="text-[10px] text-gray-500">Agent-augmented — {cadenceTotal} min CRC time</p>
                </div>
              </div>

              <div className="space-y-2">
                {CADENCE_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const isAutomated = parseInt(step.duration) === 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isAutomated
                          ? 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'
                          : 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50'
                      }`}
                      onMouseEnter={() => setHoveredStep(`cadence-${i}`)}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isAutomated ? 'bg-blue-200 text-blue-700' : 'bg-emerald-200 text-emerald-700'
                        }`}>
                          {i + 1}
                        </span>
                        <Icon size={13} className={isAutomated ? 'text-blue-500' : 'text-emerald-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">{step.label}</p>
                        <p className={`text-[10px] mt-0.5 ${isAutomated ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {step.benefit}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isAutomated
                          ? 'text-blue-700 bg-blue-100'
                          : 'text-emerald-700 bg-emerald-100'
                      }`}>
                        {isAutomated ? 'Auto' : step.duration}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 p-3 rounded-lg bg-emerald-100 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800">CRC time per patient</span>
                  <span className="text-lg font-bold text-emerald-900 font-[family-name:var(--font-display)]">{cadenceTotal} min</span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  {Math.round((1 - cadenceTotal / manualTotal) * 100)}% reduction — agent handles {CADENCE_STEPS.filter(s => parseInt(s.duration) === 0).length} of {CADENCE_STEPS.length} steps automatically
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metrics comparison bar */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Metrics Comparison</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {METRICS.map((metric, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-medium text-gray-500 mb-2">{metric.label}</p>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-red-600 line-through">{metric.manual}</span>
                  <ArrowRight size={10} className="text-gray-400" />
                  <span className="text-sm font-bold text-emerald-700">{metric.cadence}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {metric.improvement} {metric.improvement !== 'New' ? 'reduction' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
