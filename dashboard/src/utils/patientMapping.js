// Mapping between Dashboard patient IDs (PT-0XXX) and Knowledge Graph node IDs (PAT-XXX)
// These 3 patients appear in Dashboard, Workflow, CommandCenter, AND Knowledge Graph.

export const DASHBOARD_TO_KG = {
  'PT-0047': 'PAT-001',
  'PT-0112': 'PAT-007',
  'PT-0089': 'PAT-009',
};

export const KG_TO_DASHBOARD = {
  'PAT-001': 'PT-0047',
  'PAT-007': 'PT-0112',
  'PAT-009': 'PT-0089',
};

export const hasKGNode = (dashboardId) => dashboardId in DASHBOARD_TO_KG;
export const patientIdToNodeId = (dashboardId) => DASHBOARD_TO_KG[dashboardId] || null;
export const nodeIdToPatientId = (kgNodeId) => KG_TO_DASHBOARD[kgNodeId] || null;
