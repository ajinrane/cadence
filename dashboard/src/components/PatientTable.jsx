import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Eye, Zap, ChevronLeft, ChevronRight, Network } from 'lucide-react';
import { hasKGNode } from '../utils/patientMapping';
import RiskBadge from './RiskBadge';
import { formatRiskScore, getAgentRecommendation, getAgentStatus, getStatusLabel, getStatusColor } from '../utils/formatters';

const PAGE_SIZE = 12;

export default function PatientTable({ patients, onSelectPatient, onNavigateToKG }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('dropout_risk');
  const [sortDir, setSortDir] = useState('desc');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let data = [...patients];

    if (riskFilter !== 'all') {
      data = data.filter((p) => p.risk_level?.toLowerCase() === riskFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.patient_id?.toLowerCase().includes(q) ||
          p.trial_id?.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [patients, search, sortKey, sortDir, riskFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  }

  const columns = [
    { key: 'patient_id', label: 'Patient ID', w: 'w-[100px]' },
    { key: 'trial_id', label: 'Trial ID', w: 'w-[120px]' },
    { key: 'risk_level', label: 'Risk', w: 'w-[90px]' },
    { key: 'dropout_risk', label: 'Score', w: 'w-[80px]' },
    { key: 'days_since_last_contact', label: 'Days Silent', w: 'w-[90px]' },
    { key: 'recommendation', label: 'Agent Recommendation', w: 'flex-1' },
    { key: 'status', label: 'Status', w: 'w-[140px]' },
    { key: 'actions', label: '', w: 'w-[160px]' },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients or trials..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-agent-blue)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['all', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => { setRiskFilter(f); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                riskFilter === f
                  ? 'bg-[var(--color-agent-blue)] text-white'
                  : 'bg-gray-100 text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400 font-[family-name:var(--font-mono)]">
          {filtered.length} patients
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 ${col.w} ${
                    col.key !== 'actions' && col.key !== 'recommendation' && col.key !== 'status'
                      ? 'cursor-pointer hover:text-gray-700 select-none'
                      : ''
                  }`}
                  onClick={() => {
                    if (col.key !== 'actions' && col.key !== 'recommendation' && col.key !== 'status') {
                      toggleSort(col.key);
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <ArrowUpDown size={11} className="text-[var(--color-agent-blue)]" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((patient) => {
              const rowClass =
                patient.risk_level === 'High'
                  ? 'risk-row-high'
                  : patient.risk_level === 'Medium'
                  ? 'risk-row-medium'
                  : '';
              const agentStatus = getAgentStatus(patient);
              const statusColor = getStatusColor(agentStatus);

              return (
                <tr
                  key={patient.patient_id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowClass}`}
                >
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-medium text-gray-900">
                    {patient.patient_id}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-gray-500">
                    {patient.trial_id}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={patient.risk_level} />
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-semibold" style={{ color: patient.dropout_risk > 0.7 ? '#ef4444' : patient.dropout_risk > 0.4 ? '#f59e0b' : '#10b981' }}>
                    {formatRiskScore(patient.dropout_risk)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <span className={patient.days_since_last_contact > 45 ? 'text-[var(--color-risk-high)] font-semibold' : ''}>
                      {patient.days_since_last_contact}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {getAgentRecommendation(patient)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${agentStatus === 'intervention_queued' ? 'agent-pulse' : ''}`}
                        style={{ backgroundColor: statusColor }}
                      />
                      <span style={{ color: statusColor }}>
                        {getStatusLabel(agentStatus)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPatient(patient.patient_id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 text-xs transition-colors cursor-pointer"
                      >
                        <Eye size={12} /> Details
                      </button>
                      <button
                        onClick={() => onSelectPatient(patient.patient_id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--color-agent-blue)]/10 text-[var(--color-agent-blue)] hover:bg-[var(--color-agent-blue)]/20 text-xs transition-colors cursor-pointer"
                      >
                        <Zap size={12} /> Intervene
                      </button>
                      {hasKGNode(patient.patient_id) && onNavigateToKG && (
                        <button
                          onClick={() => onNavigateToKG(patient.patient_id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--color-agent-purple)]/10 text-[var(--color-agent-purple)] hover:bg-[var(--color-agent-purple)]/20 text-xs transition-colors cursor-pointer"
                        >
                          <Network size={12} /> Graph
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 text-gray-500 cursor-pointer disabled:cursor-default transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  page === i
                    ? 'bg-[var(--color-agent-blue)] text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 text-gray-500 cursor-pointer disabled:cursor-default transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
