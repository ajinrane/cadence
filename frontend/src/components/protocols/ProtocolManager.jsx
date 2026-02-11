import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

function ChunkSection({ chunk, isExpanded, onToggle }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700">{chunk.header}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{chunk.content}</p>
        </div>
      )}
    </div>
  );
}

function ProtocolCard({ protocol, isExpanded, onToggle }) {
  const [expandedChunks, setExpandedChunks] = useState(new Set());

  const toggleChunk = (idx) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
      <div
        onClick={onToggle}
        className="flex items-center justify-between p-4 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-800 truncate">{protocol.name}</h3>
              {protocol.site_id && (
                <span className="text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded shrink-0">
                  Site-specific
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {protocol.trial_id} &middot; v{protocol.version} &middot; {protocol.chunks?.length || 0} sections
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {protocol.chunks?.map((chunk, i) => (
            <ChunkSection
              key={i}
              chunk={chunk}
              isExpanded={expandedChunks.has(i)}
              onToggle={() => toggleChunk(i)}
            />
          ))}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Have questions? Ask about this protocol in Chat
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResults({ results }) {
  if (!results) return null;
  if (results.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No matching sections found</p>;
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg divide-y divide-slate-100 mb-6">
      <div className="px-4 py-2.5 bg-blue-50">
        <span className="text-xs font-medium text-blue-700">{results.length} matching sections</span>
      </div>
      {results.map((r, i) => (
        <div key={i} className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-800">{r.protocol_name || r.header}</span>
            <span className="text-[10px] text-slate-400">{r.trial_id}</span>
          </div>
          <p className="text-sm text-slate-600 line-clamp-3">{r.content || r.snippet}</p>
        </div>
      ))}
    </div>
  );
}

export default function ProtocolManager({ currentSiteId }) {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    trial_id: "",
    site_id: "",
    content: "",
  });

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.protocols({ site_id: currentSiteId });
      setProtocols(Array.isArray(data) ? data : data.protocols || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSiteId]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchProtocols({
        query: searchQuery,
        site_id: currentSiteId,
      });
      setSearchResults(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.name.trim() || !uploadForm.content.trim()) return;
    try {
      await api.uploadProtocol(uploadForm);
      setShowUpload(false);
      setUploadForm({ name: "", trial_id: "", site_id: "", content: "" });
      fetchProtocols();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Protocols</h1>
          <p className="text-sm text-slate-400 mt-0.5">{protocols.length} protocols loaded</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Upload Protocol
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Upload zone */}
      {showUpload && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Upload Protocol Document</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Protocol name"
              value={uploadForm.name}
              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Trial ID (e.g., trial_cardio)"
                value={uploadForm.trial_id}
                onChange={(e) => setUploadForm({ ...uploadForm, trial_id: e.target.value })}
                className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder="Site ID (optional, for amendments)"
                value={uploadForm.site_id}
                onChange={(e) => setUploadForm({ ...uploadForm, site_id: e.target.value })}
                className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400"
              />
            </div>
            <textarea
              placeholder="Paste protocol text here. Sections should start with numbered headers (e.g., '1. Introduction')."
              value={uploadForm.content}
              onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-400 resize-none h-40 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Upload
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search protocols (e.g., 'informed consent', 'adverse events')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      <SearchResults results={searchResults} />

      {/* Protocol list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading protocols...</div>
      ) : protocols.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          No protocols found. Upload one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {protocols.map((p) => (
            <ProtocolCard
              key={p.id || p.name}
              protocol={p}
              isExpanded={expandedId === (p.id || p.name)}
              onToggle={() => setExpandedId(expandedId === (p.id || p.name) ? null : (p.id || p.name))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
