import { useState, useMemo } from 'react';
import {
  DollarSign, Users, MapPin, TrendingDown, Calculator,
  Zap, Clock, Brain, ChevronDown, ChevronUp
} from 'lucide-react';

// Default assumptions
const DEFAULTS = {
  patients: 500,
  sites: 5,
  costPerPatient: 20000,
  baselineDropoutRate: 30,
  crcSalary: 65000,
  crcsPerSite: 3,
};

function Slider({ label, value, onChange, min, max, step, prefix, suffix, icon: Icon }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
          <Icon size={13} className="text-gray-400" />
          {label}
        </label>
        <span className="text-sm font-bold text-gray-900 font-[family-name:var(--font-display)]">
          {prefix}{value.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="relative">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

export default function ROICalculator() {
  const [patients, setPatients] = useState(DEFAULTS.patients);
  const [sites, setSites] = useState(DEFAULTS.sites);
  const [costPerPatient, setCostPerPatient] = useState(DEFAULTS.costPerPatient);
  const [baselineDropout, setBaselineDropout] = useState(DEFAULTS.baselineDropoutRate);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const results = useMemo(() => {
    // Key assumptions
    const cadenceDropoutRate = baselineDropout * 0.55; // 45% reduction
    const dropoutsPrevented = Math.round(patients * (baselineDropout - cadenceDropoutRate) / 100);
    const reRecruitmentSavings = dropoutsPrevented * costPerPatient;

    // CRC time savings
    const crcs = sites * DEFAULTS.crcsPerSite;
    const hoursPerWeekSaved = 18; // per CRC
    const weeksPerYear = 48;
    const hourlyRate = DEFAULTS.crcSalary / 2080;
    const crcTimeSavings = Math.round(crcs * hoursPerWeekSaved * weeksPerYear * hourlyRate);

    // Cadence cost (rough estimate)
    const cadenceCost = sites * 50000; // $50K/site/year

    const totalSavings = reRecruitmentSavings + crcTimeSavings;
    const netSavings = totalSavings - cadenceCost;
    const roi = Math.round((netSavings / cadenceCost) * 100);

    return {
      dropoutsPrevented,
      reRecruitmentSavings,
      crcTimeSavings,
      cadenceCost,
      totalSavings,
      netSavings,
      roi,
      cadenceDropoutRate: Math.round(cadenceDropoutRate),
      crcs,
      hoursPerWeekSaved,
    };
  }, [patients, sites, costPerPatient, baselineDropout]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
            <Calculator size={16} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 font-[family-name:var(--font-display)]">
              ROI Calculator
            </h3>
            <p className="text-xs text-gray-500">
              Estimate your savings with Cadence based on trial parameters
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">

          {/* Left: Inputs */}
          <div className="space-y-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Trial Parameters</h4>

            <Slider
              label="Total patients enrolled"
              value={patients}
              onChange={setPatients}
              min={50}
              max={5000}
              step={50}
              prefix=""
              suffix=""
              icon={Users}
            />

            <Slider
              label="Number of sites"
              value={sites}
              onChange={setSites}
              min={1}
              max={50}
              step={1}
              prefix=""
              suffix=""
              icon={MapPin}
            />

            <Slider
              label="Cost to re-recruit one patient"
              value={costPerPatient}
              onChange={setCostPerPatient}
              min={5000}
              max={100000}
              step={1000}
              prefix="$"
              suffix=""
              icon={DollarSign}
            />

            <Slider
              label="Current dropout rate"
              value={baselineDropout}
              onChange={setBaselineDropout}
              min={5}
              max={60}
              step={1}
              prefix=""
              suffix="%"
              icon={TrendingDown}
            />

            {/* Assumptions toggle */}
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
            >
              {showAssumptions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showAssumptions ? 'Hide' : 'Show'} assumptions
            </button>

            {showAssumptions && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1.5">
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-600">Dropout reduction:</span> 45% (based on pilot data from 3 sites)
                </p>
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-600">CRC time saved:</span> 18 hrs/week per CRC (projected from Phase 2)
                </p>
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-600">CRCs per site:</span> {DEFAULTS.crcsPerSite} (industry average)
                </p>
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-600">CRC salary:</span> ${DEFAULTS.crcSalary.toLocaleString()}/yr (national median)
                </p>
                <p className="text-[10px] text-gray-500">
                  <span className="font-semibold text-gray-600">Cadence platform cost:</span> $50K/site/year (estimated)
                </p>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projected Annual Savings</h4>

            {/* Hero metric */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border-2 border-emerald-200">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Net Annual Savings</p>
              <p className="text-4xl font-bold text-emerald-900 font-[family-name:var(--font-display)]">
                ${(results.netSavings / 1000).toFixed(0)}K
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {results.roi}% ROI
                </span>
                <span className="text-[10px] text-emerald-600">
                  after Cadence platform cost
                </span>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown size={13} className="text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-700">Dropouts Prevented</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 font-[family-name:var(--font-display)]">
                  {results.dropoutsPrevented}
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  {baselineDropout}% → {results.cadenceDropoutRate}% dropout rate
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign size={13} className="text-purple-600" />
                  <span className="text-[10px] font-semibold text-purple-700">Re-recruitment Saved</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 font-[family-name:var(--font-display)]">
                  ${(results.reRecruitmentSavings / 1000000).toFixed(1)}M
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5">
                  {results.dropoutsPrevented} patients × ${costPerPatient.toLocaleString()}
                </p>
              </div>

              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={13} className="text-amber-600" />
                  <span className="text-[10px] font-semibold text-amber-700">CRC Time Savings</span>
                </div>
                <p className="text-2xl font-bold text-amber-900 font-[family-name:var(--font-display)]">
                  ${(results.crcTimeSavings / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {results.crcs} CRCs × {results.hoursPerWeekSaved} hrs/wk saved
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={13} className="text-gray-500" />
                  <span className="text-[10px] font-semibold text-gray-600">Platform Cost</span>
                </div>
                <p className="text-2xl font-bold text-gray-700 font-[family-name:var(--font-display)]">
                  ${(results.cadenceCost / 1000).toFixed(0)}K
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {sites} sites × $50K/year
                </p>
              </div>
            </div>

            {/* Summary bar */}
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Savings Breakdown</span>
                <span className="text-xs font-bold text-white">
                  ${(results.totalSavings / 1000).toFixed(0)}K total
                </span>
              </div>
              {/* Stacked bar */}
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(results.reRecruitmentSavings / results.totalSavings) * 100}%`,
                    background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                  }}
                  title="Re-recruitment savings"
                />
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(results.crcTimeSavings / results.totalSavings) * 100}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                  title="CRC time savings"
                />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-[10px] text-gray-400">Re-recruitment ({Math.round((results.reRecruitmentSavings / results.totalSavings) * 100)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-gray-400">CRC time ({Math.round((results.crcTimeSavings / results.totalSavings) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
