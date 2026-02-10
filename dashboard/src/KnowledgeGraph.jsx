import { useState, useMemo, useCallback, useEffect, Component } from 'react';
import { ArrowUpDown, Copy, Check, Info } from 'lucide-react';

import GraphCanvas from './components/knowledge-graph/GraphCanvas';
import TemporalSlider from './components/knowledge-graph/TemporalSlider';
import KnowledgeLossToggle from './components/knowledge-graph/KnowledgeLossToggle';
import GraphMetricsPanel from './components/knowledge-graph/GraphMetricsPanel';
import GraphLegend from './components/knowledge-graph/GraphLegend';
import NodeDetailPanel from './components/knowledge-graph/NodeDetailPanel';

import { allNodes, allEdges, nodeCountByMonth } from './utils/knowledgeGraphData';
import {
  filterByMonth,
  computeLayout,
  computeGraphMetrics,
  pruneForKnowledgeLoss,
  getConnectedPath,
} from './utils/graphAlgorithms';

// -- Error Boundary -----------------------------------------------------------
class GraphErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Graph rendering failed.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-[var(--color-agent-cyan)] hover:underline cursor-pointer"
            >
              Try refreshing the tab
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// -- Empty State --------------------------------------------------------------
function EmptyState({ month }) {
  const messages = {
    1: 'Month 1: Initial patient enrollment. Knowledge graph begins to form as CRCs start their work...',
    2: 'Month 2: First interventions underway. Connections emerging between patients and care strategies...',
  };
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <p className="text-xs text-gray-400 max-w-md text-center leading-relaxed">
        {messages[month] || `Month ${month}: Building knowledge...`}
      </p>
    </div>
  );
}

// -- Main Component -----------------------------------------------------------
export default function KnowledgeGraph({ initialNodeId, onNavigateToDashboard, demoKnowledgeLoss }) {
  const [currentMonth, setCurrentMonth] = useState(12);
  const [knowledgeLossActive, setKnowledgeLossActive] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [layoutDirection, setLayoutDirection] = useState('TB');
  const [highlightedPath, setHighlightedPath] = useState(null);
  const [copied, setCopied] = useState(false);

  // Step 1: Filter by month
  const { visibleNodes, visibleEdges } = useMemo(
    () => filterByMonth(allNodes, allEdges, currentMonth),
    [currentMonth]
  );

  // Step 2: Baseline metrics (before any pruning)
  const baselineMetrics = useMemo(
    () => computeGraphMetrics(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges]
  );

  // Step 3: Apply knowledge loss if active
  const { displayNodes, displayEdges, prunedCount, lostInsightLabels } = useMemo(() => {
    if (!knowledgeLossActive || isPruning) {
      return {
        displayNodes: visibleNodes,
        displayEdges: visibleEdges,
        prunedCount: 0,
        lostInsightLabels: [],
      };
    }
    const result = pruneForKnowledgeLoss(visibleNodes, visibleEdges);
    return {
      displayNodes: result.nodes,
      displayEdges: result.edges,
      prunedCount: result.prunedCount,
      lostInsightLabels: result.lostInsightLabels,
    };
  }, [visibleNodes, visibleEdges, knowledgeLossActive, isPruning]);

  // Step 4: Layout
  const layoutNodes = useMemo(
    () => computeLayout(displayNodes, displayEdges, layoutDirection),
    [displayNodes, displayEdges, layoutDirection]
  );

  // Step 5: Display metrics
  const metrics = useMemo(
    () => computeGraphMetrics(displayNodes, displayEdges),
    [displayNodes, displayEdges]
  );

  // CRC node count for toggle guard
  const crcNodeCount = useMemo(
    () => visibleNodes.filter((n) => n.type === 'crcLearning').length,
    [visibleNodes]
  );

  // Selected node details
  const selectedNode = useMemo(
    () => (selectedNodeId ? displayNodes.find((n) => n.id === selectedNodeId) || null : null),
    [selectedNodeId, displayNodes]
  );

  const connectedEdges = useMemo(
    () => selectedNodeId
      ? displayEdges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      : [],
    [selectedNodeId, displayEdges]
  );

  // Handlers
  const handleToggleKnowledgeLoss = useCallback(() => {
    if (!knowledgeLossActive) {
      // Pruning animation: show targets for 2s, then prune
      setIsPruning(true);
      setTimeout(() => {
        setIsPruning(false);
        setKnowledgeLossActive(true);
      }, 2000);
    } else {
      setKnowledgeLossActive(false);
      setIsPruning(false);
    }
  }, [knowledgeLossActive]);

  const handleNodeHover = useCallback(
    (nodeId) => {
      if (!nodeId) {
        setHighlightedPath(null);
        return;
      }
      const path = getConnectedPath(nodeId, displayNodes, displayEdges);
      setHighlightedPath(path);
    },
    [displayNodes, displayEdges]
  );

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // Pruning preview: get the IDs that WOULD be pruned
  const prunePreviewIds = useMemo(() => {
    if (!isPruning) return new Set();
    const result = pruneForKnowledgeLoss(visibleNodes, visibleEdges);
    return result.prunedNodeIds;
  }, [isPruning, visibleNodes, visibleEdges]);

  // Demo mode: external control of knowledge loss toggle
  useEffect(() => {
    if (demoKnowledgeLoss === true) {
      setKnowledgeLossActive(true);
      setIsPruning(false);
    } else if (demoKnowledgeLoss === false) {
      setKnowledgeLossActive(false);
      setIsPruning(false);
    }
  }, [demoKnowledgeLoss]);

  // Navigate to a specific node when arriving from another tab
  useEffect(() => {
    if (initialNodeId) {
      const raf = requestAnimationFrame(() => setSelectedNodeId(initialNodeId));
      return () => cancelAnimationFrame(raf);
    }
  }, [initialNodeId]);

  const hasEdges = displayEdges.length > 0;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold font-[family-name:var(--font-display)] text-gray-900 leading-none mb-1">
            Institutional Knowledge Graph
          </h2>
          <p className="text-xs text-gray-400">
            How CRC expertise compounds over time — and what&apos;s lost to turnover
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <button
            onClick={() => setLayoutDirection((d) => (d === 'TB' ? 'LR' : 'TB'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            title="Toggle layout direction"
          >
            <ArrowUpDown size={11} />
            {layoutDirection === 'TB' ? 'Top → Down' : 'Left → Right'}
          </button>
          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 hover:border-[var(--color-agent-cyan)]/50 hover:text-[var(--color-agent-cyan)] transition-colors cursor-pointer"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied!' : 'Share Demo'}
          </button>
        </div>
      </div>

      {/* Compact graph context */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-purple-50 border border-purple-100 mb-5">
        <Info className="w-4 h-4 text-purple-500 shrink-0" />
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">Knowledge Graph:</span> Maps
          <span className="text-blue-600 font-medium"> patients</span> &rarr;
          <span className="text-amber-600 font-medium"> interventions</span> &rarr;
          <span className="text-emerald-600 font-medium"> outcomes</span> &rarr;
          <span className="text-purple-600 font-medium"> learnings</span>.
          Toggle &ldquo;Knowledge Loss&rdquo; to see what disappears when experienced CRCs leave.
        </p>
      </div>

      {/* Controls row */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-6" data-tour-target="temporal-slider">
          <TemporalSlider
            value={currentMonth}
            onChange={(m) => {
              setCurrentMonth(m);
              setKnowledgeLossActive(false);
              setIsPruning(false);
              setSelectedNodeId(null);
            }}
            nodeCountByMonth={nodeCountByMonth}
          />
        </div>
        <div className="col-span-3">
          <KnowledgeLossToggle
            active={knowledgeLossActive}
            onToggle={handleToggleKnowledgeLoss}
            prunedCount={knowledgeLossActive ? prunedCount : 0}
            lostInsightLabels={knowledgeLossActive ? lostInsightLabels : []}
            crcNodeCount={crcNodeCount}
            disabled={isPruning}
          />
        </div>
        <div className="col-span-3 flex items-end">
          <GraphLegend />
        </div>
      </div>

      {/* Graph + Detail Panel */}
      <div className="grid grid-cols-12 gap-4">
        <div className={`${selectedNode ? 'col-span-9' : 'col-span-12'} transition-all`}>
          <div
            className="card overflow-hidden"
            style={{ padding: 0, height: '56vh', minHeight: 400 }}
          >
            <GraphErrorBoundary>
              {!hasEdges && displayNodes.length <= 18 && currentMonth <= 1 ? (
                <EmptyState month={currentMonth} />
              ) : (
                <GraphCanvas
                  layoutNodes={layoutNodes}
                  displayEdges={displayEdges}
                  highlightedPath={highlightedPath}
                  onNodeClick={setSelectedNodeId}
                  onNodeHover={handleNodeHover}
                  currentMonth={currentMonth}
                  isPruning={isPruning}
                  prunedNodeIds={prunePreviewIds}
                />
              )}
            </GraphErrorBoundary>
          </div>
        </div>
        {selectedNode && (
          <div className="col-span-3">
            <NodeDetailPanel
              node={selectedNode}
              connectedEdges={connectedEdges}
              onClose={() => setSelectedNodeId(null)}
              onNavigateToDashboard={onNavigateToDashboard}
            />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="mt-4">
        <GraphMetricsPanel
          metrics={metrics}
          baselineMetrics={baselineMetrics}
          knowledgeLossActive={knowledgeLossActive}
        />
      </div>
    </div>
  );
}
