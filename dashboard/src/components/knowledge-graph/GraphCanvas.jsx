import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PatientNode from './nodes/PatientNode';
import InterventionNode from './nodes/InterventionNode';
import OutcomeNode from './nodes/OutcomeNode';
import LearningNode from './nodes/LearningNode';
import WeightedEdge from './edges/WeightedEdge';
import { NODE_COLORS } from '../../utils/knowledgeGraphData';

const nodeTypes = {
  patient: PatientNode,
  intervention: InterventionNode,
  outcome: OutcomeNode,
  crcLearning: LearningNode,
};

const edgeTypes = {
  weighted: WeightedEdge,
};

const miniMapNodeColor = (node) => NODE_COLORS[node.type] || '#506690';

function GraphCanvasInner({
  layoutNodes,
  displayEdges,
  highlightedPath,
  onNodeClick,
  onNodeHover,
  currentMonth,
  isPruning,
  prunedNodeIds,
  containerRef,
}) {
  const { fitView } = useReactFlow();

  // Convert to React Flow format
  const rfNodes = useMemo(() => {
    return layoutNodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        _isCurrentMonth: node.month === currentMonth,
        _isPruneTarget: isPruning && prunedNodeIds?.has(node.id),
        _isHighlighted: highlightedPath?.nodeIds?.has(node.id) || false,
      },
    }));
  }, [layoutNodes, currentMonth, isPruning, prunedNodeIds, highlightedPath]);

  const rfEdges = useMemo(() => {
    return displayEdges.map((edge) => {
      const isHighlighted = highlightedPath?.edgeIds?.has(edge.id);
      // Determine highlight color from source node type
      const sourceNode = layoutNodes.find((n) => n.id === edge.source);
      const highlightColor = sourceNode ? NODE_COLORS[sourceNode.type] : '#8b5cf6';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'weighted',
        data: {
          ...edge.data,
          _highlighted: isHighlighted,
          _highlightColor: highlightColor,
        },
        markerEnd: { type: 'arrowclosed', color: '#9ca3af', width: 14, height: 14 },
      };
    });
  }, [displayEdges, highlightedPath, layoutNodes]);

  // Fit view when graph changes (useEffect, not useMemo — this is a side effect)
  useEffect(() => {
    if (rfNodes.length > 0) {
      const timer = setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
      return () => clearTimeout(timer);
    }
  }, [rfNodes.length, fitView]);

  // Re-fit when container resizes (e.g. detail panel opens/closes)
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;
    let timer;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => fitView({ padding: 0.15, duration: 200 }), 100);
    });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [containerRef, fitView]);

  const handleNodeClick = useCallback(
    (_event, node) => onNodeClick?.(node.id),
    [onNodeClick]
  );

  const handleNodeMouseEnter = useCallback(
    (_event, node) => onNodeHover?.(node.id),
    [onNodeHover]
  );

  const handleNodeMouseLeave = useCallback(
    () => onNodeHover?.(null),
    [onNodeHover]
  );

  const handlePaneClick = useCallback(
    () => onNodeClick?.(null),
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      onPaneClick={handlePaneClick}
      colorMode="light"
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background
        variant="dots"
        gap={20}
        size={1}
        color="#e5e7eb"
        style={{ opacity: 0.6 }}
      />
      <Controls
        showInteractive={false}
        position="bottom-right"
      />
      <MiniMap
        nodeColor={miniMapNodeColor}
        maskColor="rgba(255, 255, 255, 0.7)"
        style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8 }}
        position="bottom-left"
      />
    </ReactFlow>
  );
}

export default function GraphCanvas(props) {
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <GraphCanvasInner {...props} containerRef={containerRef} />
      </ReactFlowProvider>
    </div>
  );
}
