import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

function StatCard({ label, value, sublabel, color = "blue" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-2 mt-1.5">
        <span className={`text-2xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>
          {value}
        </span>
        {sublabel && <span className="text-xs text-slate-400 mb-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

function HorizontalBar({ label, value, max, color = "bg-blue-500" }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-28 truncate">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-700 w-8 text-right">{value}</span>
    </div>
  );
}

function RiskDistribution({ distribution }) {
  if (!distribution) return null;
  const total = (distribution.high || 0) + (distribution.medium || 0) + (distribution.low || 0);
  if (total === 0) return null;

  const segments = [
    { key: "high", label: "High", color: "bg-red-500", count: distribution.high || 0 },
    { key: "medium", label: "Medium", color: "bg-amber-500", count: distribution.medium || 0 },
    { key: "low", label: "Low", color: "bg-emerald-500", count: distribution.low || 0 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Risk Distribution</h3>
      <div className="flex rounded-full overflow-hidden h-4 mb-3">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            <span className="text-xs text-slate-600">
              {s.label}: <span className="font-medium">{s.count}</span> ({((s.count / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InterventionBreakdown({ byType }) {
  if (!byType || Object.keys(byType).length === 0) return null;
  const max = Math.max(...Object.values(byType));

  const barColors = [
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-red-500",
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Interventions by Type</h3>
      <div className="space-y-2.5">
        {Object.entries(byType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count], i) => (
            <HorizontalBar
              key={type}
              label={type.replace(/_/g, " ")}
              value={count}
              max={max}
              color={barColors[i % barColors.length]}
            />
          ))}
      </div>
    </div>
  );
}

function CrossSiteTable({ data }) {
  if (!data?.sites || data.sites.length === 0) return null;

  const bestRetention = Math.max(...data.sites.map((s) => s.retention_rate || 0));
  const worstRetention = Math.min(...data.sites.map((s) => s.retention_rate || 0));

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-800">Cross-Site Comparison</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/50">
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-5">Site</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Retention</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Patients</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">High Risk</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Interventions</th>
            <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider py-3 px-4">Open Queries</th>
          </tr>
        </thead>
        <tbody>
          {data.sites.map((site) => {
            const retention = site.retention_rate || 0;
            const retentionColor =
              retention === bestRetention
                ? "text-emerald-600 font-semibold"
                : retention === worstRetention
                ? "text-red-600 font-semibold"
                : "text-slate-700";

            return (
              <tr key={site.site_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-5">
                  <div className="text-sm font-medium text-slate-800">{site.site_name || site.name}</div>
                  <div className="text-xs text-slate-400">{site.location}</div>
                </td>
                <td className={`py-3 px-4 text-sm ${retentionColor}`}>
                  {(retention * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">{site.total_patients || site.patients}</td>
                <td className="py-3 px-4">
                  <span className={`text-sm ${(site.high_risk || 0) > 5 ? "text-red-600 font-medium" : "text-slate-700"}`}>
                    {site.high_risk || 0}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-slate-700">{site.total_interventions || site.interventions || 0}</td>
                <td className="py-3 px-4 text-sm text-slate-700">{site.open_queries || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SiteAnalytics({ currentSiteId }) {
  const [siteData, setSiteData] = useState(null);
  const [crossSiteData, setCrossSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("site"); // site | cross-site

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [site, cross] = await Promise.all([
        api.siteAnalytics(currentSiteId),
        api.crossSiteAnalytics(),
      ]);
      setSiteData(site);
      setCrossSiteData(cross);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Performance metrics and insights</p>
        </div>
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("site")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "site" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            This Site
          </button>
          <button
            onClick={() => setViewMode("cross-site")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "cross-site" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Sites
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading analytics...</div>
      ) : viewMode === "site" && siteData ? (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              label="Retention Rate"
              value={`${((siteData.retention_rate || 0) * 100).toFixed(1)}%`}
              color="emerald"
            />
            <StatCard
              label="Patients at Risk"
              value={siteData.patients_at_risk || siteData.high_risk || 0}
              sublabel={`of ${siteData.total_patients || 0}`}
              color="red"
            />
            <StatCard
              label="Avg Query Days"
              value={siteData.avg_query_resolution_days?.toFixed(1) || "—"}
              sublabel="days"
              color="amber"
            />
            <StatCard
              label="Interventions"
              value={siteData.interventions_this_month || siteData.total_interventions || 0}
              sublabel="this month"
              color="blue"
            />
            <StatCard
              label="Monitoring Ready"
              value={siteData.monitoring_readiness ? `${siteData.monitoring_readiness}%` : "—"}
              color="purple"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-5">
            <RiskDistribution distribution={siteData.risk_distribution} />
            <InterventionBreakdown byType={siteData.interventions_by_type} />
          </div>

          {/* Outcome breakdown */}
          {siteData.interventions_by_outcome && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Intervention Outcomes</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(siteData.interventions_by_outcome).map(([outcome, count]) => {
                  const colors = {
                    positive: "text-emerald-600 bg-emerald-50",
                    neutral: "text-slate-600 bg-slate-50",
                    negative: "text-red-600 bg-red-50",
                    pending: "text-amber-600 bg-amber-50",
                  };
                  return (
                    <div key={outcome} className={`rounded-lg p-3 ${colors[outcome] || "bg-slate-50 text-slate-600"}`}>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs font-medium capitalize mt-0.5">{outcome}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === "cross-site" && crossSiteData ? (
        <div className="space-y-5">
          {/* Summary cards */}
          {crossSiteData.summary && (
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Total Patients"
                value={crossSiteData.summary.total_patients || 0}
                color="blue"
              />
              <StatCard
                label="Avg Retention"
                value={`${((crossSiteData.summary.avg_retention_rate || 0) * 100).toFixed(1)}%`}
                color="emerald"
              />
              <StatCard
                label="Total At Risk"
                value={crossSiteData.summary.total_high_risk || 0}
                color="red"
              />
              <StatCard
                label="Total Interventions"
                value={crossSiteData.summary.total_interventions || 0}
                color="purple"
              />
            </div>
          )}

          <CrossSiteTable data={crossSiteData} />
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 text-sm">No analytics data available</div>
      )}
    </div>
  );
}
