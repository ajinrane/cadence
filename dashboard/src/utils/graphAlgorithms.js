import dagre from 'dagre';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 70;

// -- Layout -------------------------------------------------------------------
export function computeLayout(nodes, edges, direction = 'TB') {
  if (nodes.length === 0) return [];

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    edgesep: 40,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });
}

// -- Connected Components (BFS) -----------------------------------------------
export function computeConnectedComponents(nodes, edges) {
  if (nodes.length === 0) return [];

  const adj = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  edges.forEach((e) => {
    if (adj[e.source]) adj[e.source].push(e.target);
    if (adj[e.target]) adj[e.target].push(e.source);
  });

  const visited = new Set();
  const components = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const neighbor of adj[current] || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

// -- Graph Metrics ------------------------------------------------------------
export function computeGraphMetrics(nodes, edges) {
  const n = nodes.length;
  const m = edges.length;

  if (n === 0) {
    return {
      knowledgeScore: 0,
      totalInsights: 0,
      density: 0,
      connectedComponents: 0,
      interventionSuccessRate: 0,
      totalNodes: 0,
      totalEdges: 0,
      largestComponentPct: 0,
    };
  }

  // Density (undirected interpretation)
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? m / maxEdges : 0;

  // Connected components
  const components = computeConnectedComponents(nodes, edges);
  const largestSize = Math.max(...components.map((c) => c.length), 0);
  const largestComponentPct = n > 0 ? (largestSize / n) * 100 : 0;

  // Total CRC Learning nodes (insights)
  const totalInsights = nodes.filter((nd) => nd.type === 'crcLearning').length;

  // Knowledge score: sum of CRC learning edge weights / max possible (all at 1.0)
  const nodeSet = new Set(nodes.map((nd) => nd.id));
  const crcEdges = edges.filter((e) => {
    const src = nodes.find((nd) => nd.id === e.source);
    const tgt = nodes.find((nd) => nd.id === e.target);
    return (src?.type === 'crcLearning' || tgt?.type === 'crcLearning') &&
      nodeSet.has(e.source) && nodeSet.has(e.target);
  });
  const crcWeightSum = crcEdges.reduce((sum, e) => sum + (e.data?.weight || 0), 0);
  const crcMaxWeight = crcEdges.length; // each could be 1.0
  const knowledgeScore = crcMaxWeight > 0
    ? Math.round((crcWeightSum / crcMaxWeight) * 100)
    : 0;

  // Intervention success rate: average weight of 'produced' edges
  const producedEdges = edges.filter(
    (e) => e.data?.relationship === 'produced' &&
      nodeSet.has(e.source) && nodeSet.has(e.target)
  );
  const interventionSuccessRate = producedEdges.length > 0
    ? Math.round(
        (producedEdges.reduce((sum, e) => sum + (e.data?.weight || 0), 0) /
          producedEdges.length) *
          100
      )
    : 0;

  return {
    knowledgeScore,
    totalInsights,
    density: Math.round(density * 1000) / 1000,
    connectedComponents: components.length,
    interventionSuccessRate,
    totalNodes: n,
    totalEdges: m,
    largestComponentPct: Math.round(largestComponentPct * 10) / 10,
  };
}

// -- Knowledge Loss Pruning ---------------------------------------------------
export function pruneForKnowledgeLoss(nodes, edges) {
  const crcNodes = nodes.filter((n) => n.type === 'crcLearning');

  if (crcNodes.length === 0) {
    return {
      nodes,
      edges,
      prunedCount: 0,
      prunedNodeIds: new Set(),
      lostInsightLabels: [],
    };
  }

  // Compute degree for each CRC node
  const degree = {};
  crcNodes.forEach((n) => {
    degree[n.id] = 0;
  });
  edges.forEach((e) => {
    if (degree[e.source] !== undefined) degree[e.source]++;
    if (degree[e.target] !== undefined) degree[e.target]++;
  });

  // Sort by degree descending, prune top 40%
  const sorted = [...crcNodes].sort(
    (a, b) => (degree[b.id] || 0) - (degree[a.id] || 0)
  );
  const pruneCount = Math.ceil(sorted.length * 0.4);
  const prunedNodeIds = new Set(sorted.slice(0, pruneCount).map((n) => n.id));
  const lostInsightLabels = sorted
    .slice(0, pruneCount)
    .map((n) => n.data?.label || n.id);

  const filteredNodes = nodes.filter((n) => !prunedNodeIds.has(n.id));
  const filteredEdges = edges.filter(
    (e) => !prunedNodeIds.has(e.source) && !prunedNodeIds.has(e.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    prunedCount: pruneCount,
    prunedNodeIds,
    lostInsightLabels,
  };
}

// -- Path Highlighting (BFS from a node) --------------------------------------
export function getConnectedPath(nodeId, nodes, edges) {
  const nodeSet = new Set(nodes.map((n) => n.id));
  const adj = {};
  const edgeMap = {};

  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  edges.forEach((e) => {
    if (nodeSet.has(e.source) && nodeSet.has(e.target)) {
      adj[e.source]?.push(e.target);
      adj[e.target]?.push(e.source);
      edgeMap[`${e.source}-${e.target}`] = e.id;
      edgeMap[`${e.target}-${e.source}`] = e.id;
    }
  });

  const visitedNodes = new Set();
  const visitedEdges = new Set();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visitedNodes.has(current)) continue;
    visitedNodes.add(current);

    for (const neighbor of adj[current] || []) {
      if (!visitedNodes.has(neighbor)) {
        queue.push(neighbor);
        const edgeId =
          edgeMap[`${current}-${neighbor}`] ||
          edgeMap[`${neighbor}-${current}`];
        if (edgeId) visitedEdges.add(edgeId);
      }
    }
  }

  return { nodeIds: visitedNodes, edgeIds: visitedEdges };
}

// -- Filter by month ----------------------------------------------------------
export function filterByMonth(allNodes, allEdges, month) {
  const visibleNodes = allNodes.filter((n) => n.month <= month);
  const nodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = allEdges.filter(
    (e) => e.month <= month && nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  return { visibleNodes, visibleEdges };
}
