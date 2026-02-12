import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const TIER_CONFIG = {
  1: { label: "Foundational", color: "bg-blue-100 text-blue-700", desc: "Core CRC knowledge that ships with Cadence" },
  2: { label: "Site-Specific", color: "bg-emerald-100 text-emerald-700", desc: "Knowledge from your site's experience" },
  3: { label: "Cross-Site", color: "bg-purple-100 text-purple-700", desc: "Patterns discovered across all sites" },
};

const CATEGORY_COLORS = {
  retention_strategy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  retention: "bg-emerald-50 text-emerald-700 border-emerald-200",
  workflow: "bg-blue-50 text-blue-700 border-blue-200",
  protocol_tip: "bg-amber-50 text-amber-700 border-amber-200",
  onboarding: "bg-indigo-50 text-indigo-700 border-indigo-200",
  lesson_learned: "bg-rose-50 text-rose-700 border-rose-200",
  intervention_pattern: "bg-orange-50 text-orange-700 border-orange-200",
  phases: "bg-slate-50 text-slate-700 border-slate-200",
  dropout_reasons: "bg-red-50 text-red-700 border-red-200",
  visits: "bg-cyan-50 text-cyan-700 border-cyan-200",
  regulatory: "bg-violet-50 text-violet-700 border-violet-200",
  therapeutic_areas: "bg-pink-50 text-pink-700 border-pink-200",
  crc_workflow: "bg-blue-50 text-blue-700 border-blue-200",
  adverse_events: "bg-red-50 text-red-700 border-red-200",
  data_management: "bg-gray-50 text-gray-700 border-gray-200",
  pattern: "bg-purple-50 text-purple-700 border-purple-200",
  comparison: "bg-amber-50 text-amber-700 border-amber-200",
  recommendation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  benchmark: "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  stale: { label: "Needs Review", color: "bg-amber-100 text-amber-700" },
  draft: { label: "Draft", color: "bg-blue-100 text-blue-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500" },
};

function TierBadge({ tier }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[1];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
      T{tier} {config.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function CategoryPill({ category }) {
  const color = CATEGORY_COLORS[category] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      {category.replace(/_/g, " ")}
    </span>
  );
}

function KnowledgeCard({ entry, onValidate, onArchive }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = entry.content.length > 200;
  const showActions = entry.status === "stale" && (onValidate || onArchive);

  return (
    <div className={`bg-white border rounded-lg p-4 hover:border-slate-300 transition-colors ${
      entry.status === "stale" ? "border-amber-200" : "border-slate-200"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TierBadge tier={entry.tier} />
          <CategoryPill category={entry.category} />
          {entry.status && entry.status !== "active" && <StatusBadge status={entry.status} />}
          {entry.therapeutic_area && entry.therapeutic_area !== "General" && (
            <span className="text-[10px] text-slate-400 font-medium">{entry.therapeutic_area}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entry.reference_count > 0 && (
            <span className="text-[10px] text-slate-400 font-medium" title="Times referenced">
              {entry.reference_count} refs
            </span>
          )}
          {entry.effectiveness_score != null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              entry.effectiveness_score >= 0.8 ? "bg-emerald-100 text-emerald-700" :
              entry.effectiveness_score >= 0.6 ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {(entry.effectiveness_score * 100).toFixed(0)}% effective
            </span>
          )}
          {entry.confidence != null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              entry.confidence >= 0.85 ? "bg-emerald-100 text-emerald-700" :
              entry.confidence >= 0.7 ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {(entry.confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {isLong && !expanded ? entry.content.slice(0, 200) + "..." : entry.content}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {entry.source && <span>{entry.source}</span>}
          {entry.created_at && <span>{entry.created_at}</span>}
          {entry.evidence_count != null && <span>{entry.evidence_count} data points</span>}
          {entry.last_validated_at && <span className="text-slate-300">Validated: {entry.last_validated_at}</span>}
        </div>
        {showActions && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onValidate(entry.id)}
              className="text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded transition-colors"
            >
              Still valid
            </button>
            <button
              onClick={() => onArchive(entry.id)}
              className="text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded transition-colors"
            >
              Archive
            </button>
          </div>
        )}
      </div>
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, onApprove, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = suggestion.content.length > 200;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700">
            AI Suggestion
          </span>
          <CategoryPill category={suggestion.category} />
          {suggestion.confidence != null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              suggestion.confidence >= 0.85 ? "bg-emerald-100 text-emerald-700" :
              suggestion.confidence >= 0.7 ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {(suggestion.confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
        {suggestion.evidence_count > 0 && (
          <span className="text-[10px] text-blue-500 font-medium">{suggestion.evidence_count} data points</span>
        )}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        {isLong && !expanded ? suggestion.content.slice(0, 200) + "..." : suggestion.content}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-slate-400">{suggestion.source}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove(suggestion.id)}
            className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-xs font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, onSearch, placeholder = "Search knowledge..." }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

function AddEntryForm({ currentSiteId, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    category: "retention_strategy",
    content: "",
    source: "",
    author: "",
    trial_id: "",
    tags: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "retention_strategy", "workflow", "protocol_tip",
    "onboarding", "lesson_learned", "intervention_pattern",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.content.trim() || !form.source.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        site_id: currentSiteId,
        category: form.category,
        content: form.content.trim(),
        source: form.source.trim(),
        author: form.author.trim() || null,
        trial_id: form.trial_id.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setForm({ category: "retention_strategy", content: "", source: "", author: "", trial_id: "", tags: "" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-800">Add Site Knowledge</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Source</label>
          <input
            type="text"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="e.g. CRC Maria, Columbia"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Knowledge</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Share what you've learned..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Author (optional)</label>
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Your name"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Trial (optional)</label>
          <input
            type="text"
            value={form.trial_id}
            onChange={(e) => setForm({ ...form, trial_id: e.target.value })}
            placeholder="NCT..."
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Tags (comma-separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="retention, nash"
            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={!form.content.trim() || !form.source.trim() || submitting}
          className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Adding..." : "Add Entry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-5 gap-3">
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        <p className="text-xs text-slate-400 mt-0.5">Total Entries</p>
      </div>
      {[1, 2, 3].map((tier) => {
        const config = TIER_CONFIG[tier];
        return (
          <div key={tier} className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-800">{stats.by_tier?.[tier] || 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">T{tier}: {config.label}</p>
          </div>
        );
      })}
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <p className="text-2xl font-bold text-blue-600">{stats.suggestions_pending || 0}</p>
        <p className="text-xs text-slate-400 mt-0.5">Suggestions</p>
      </div>
    </div>
  );
}

export default function KnowledgeBase({ currentSiteId }) {
  const [viewMode, setViewMode] = useState("all"); // all | tier1 | tier2 | tier3
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [staleEntries, setStaleEntries] = useState([]);

  const tierMap = { all: null, tier1: 1, tier2: 2, tier3: 3 };
  const currentTier = tierMap[viewMode];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    try {
      const [entriesData, statsData, suggestionsData, staleData] = await Promise.allSettled([
        api.knowledge({ tier: currentTier, site_id: viewMode === "tier2" ? currentSiteId : undefined, category: categoryFilter || undefined }),
        api.knowledgeStats(),
        api.knowledgeSuggestions(currentSiteId),
        api.staleKnowledge(currentSiteId),
      ]);
      if (entriesData.status === "fulfilled") setEntries(entriesData.value.entries || []);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (suggestionsData.status === "fulfilled") setSuggestions(suggestionsData.value.suggestions || []);
      if (staleData.status === "fulfilled") setStaleEntries(staleData.value.entries || []);
      const failures = [entriesData, statsData, suggestionsData, staleData].filter(r => r.status === "rejected");
      if (failures.length === 4) throw new Error(failures[0].reason?.message || "All knowledge requests failed");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentTier, currentSiteId, categoryFilter, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchKnowledge(searchQuery, currentSiteId);
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentSiteId]);

  const handleAddEntry = useCallback(async (data) => {
    await api.addKnowledge(data);
    setShowAddForm(false);
    fetchData();
  }, [fetchData]);

  const handleValidate = useCallback(async (entryId) => {
    try {
      await api.validateKnowledge(entryId);
      setStaleEntries((prev) => prev.filter((e) => e.id !== entryId));
      fetchData();
    } catch {}
  }, [fetchData]);

  const handleArchive = useCallback(async (entryId) => {
    try {
      await api.archiveKnowledge(entryId);
      setStaleEntries((prev) => prev.filter((e) => e.id !== entryId));
      fetchData();
    } catch {}
  }, [fetchData]);

  const handleApprove = useCallback(async (suggestionId) => {
    try {
      await api.approveSuggestion(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      fetchData();
    } catch {}
  }, [fetchData]);

  const handleDismiss = useCallback(async (suggestionId) => {
    try {
      await api.dismissSuggestion(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch {}
  }, []);

  const displayEntries = searchResults || entries;

  // Get unique categories for filter
  const categories = [...new Set(displayEntries.map((e) => e.category))].sort();

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Knowledge Base</h1>
          <p className="text-sm text-slate-400 mt-0.5">Three-tier knowledge infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "tier2" && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Knowledge
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <StatsPanel stats={stats} />

      {/* Suggestions section */}
      {suggestions.length > 0 && (
        <div className="mt-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Suggested Insights ({suggestions.length})
            <span className="text-[10px] font-normal text-slate-400 ml-1">Patterns detected by Cadence AI</span>
          </h2>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((s) => (
              <SuggestionCard
                key={s.id}
                suggestion={s}
                onApprove={handleApprove}
                onDismiss={handleDismiss}
              />
            ))}
            {suggestions.length > 3 && (
              <p className="text-xs text-slate-400 text-center">+{suggestions.length - 3} more suggestions</p>
            )}
          </div>
        </div>
      )}

      {/* Stale entries section */}
      {staleEntries.length > 0 && (
        <div className="mt-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Needs Review ({staleEntries.length})
            <span className="text-[10px] font-normal text-slate-400 ml-1">Knowledge that may be outdated</span>
          </h2>
          <div className="space-y-2">
            {staleEntries.slice(0, 3).map((entry) => (
              <KnowledgeCard
                key={entry.id}
                entry={entry}
                onValidate={handleValidate}
                onArchive={handleArchive}
              />
            ))}
            {staleEntries.length > 3 && (
              <p className="text-xs text-slate-400 text-center">+{staleEntries.length - 3} more entries need review</p>
            )}
          </div>
        </div>
      )}

      {/* Tier toggle + Search */}
      <div className="flex items-center gap-4 mt-4 mb-4">
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          {[
            { key: "all", label: "All" },
            { key: "tier1", label: "Foundational" },
            { key: "tier2", label: "Site" },
            { key: "tier3", label: "Cross-Site" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setViewMode(key); setCategoryFilter(""); setSearchQuery(""); setSearchResults(null); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search across all knowledge tiers..."
          />
        </div>
      </div>

      {/* Tier description */}
      {currentTier && (
        <p className="text-xs text-slate-400 mb-3">{TIER_CONFIG[currentTier].desc}</p>
      )}

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
              !categoryFilter ? "bg-blue-50 text-blue-700 border-blue-200" : "text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                categoryFilter === cat ? "bg-blue-50 text-blue-700 border-blue-200" : "text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Add entry form */}
      {showAddForm && (
        <div className="mb-4">
          <AddEntryForm
            currentSiteId={currentSiteId}
            onSubmit={handleAddEntry}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Search results indicator */}
      {searchResults && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500">
            {searchResults.length} results for &quot;{searchQuery}&quot;
          </p>
          <button
            onClick={() => { setSearchQuery(""); setSearchResults(null); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading knowledge base...</div>
      ) : displayEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {searchResults ? "No results found" : "No entries in this category"}
        </div>
      ) : (
        <div className="space-y-3">
          {(categoryFilter
            ? displayEntries.filter((e) => e.category === categoryFilter)
            : displayEntries
          ).map((entry) => (
            <KnowledgeCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
