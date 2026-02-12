const API_BASE = import.meta.env.VITE_API_URL || "";

async function get(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function post(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function patch(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  health: () => get("/api/health"),
  sites: () => get("/api/sites"),
  dashboard: (siteId) => get("/api/dashboard", { site_id: siteId }),
  // Patients
  patients: (params) => get("/api/patients", params),
  patientRegistry: (params) => get("/api/patients/registry", params),
  patient: (id) => get(`/api/patients/${id}`),
  patientSummary: (id) => get(`/api/patients/${id}/summary`),
  addNote: (id, note) => post(`/api/patients/${id}/note`, note),
  // Trials
  trials: (siteId) => get("/api/trials", { site_id: siteId }),
  // Tasks
  tasks: (params) => get("/api/tasks", params),
  tasksToday: (siteId) => get("/api/tasks/today", { site_id: siteId }),
  createTask: (task) => post("/api/tasks", task),
  updateTask: (id, updates) => patch(`/api/tasks/${id}`, updates),
  // Protocols
  protocols: (params) => get("/api/protocols", params),
  protocol: (id) => get(`/api/protocols/${id}`),
  uploadProtocol: (data) => post("/api/protocols/upload", data),
  searchProtocols: (data) => post("/api/protocols/search", data),
  // Monitoring
  monitoring: (siteId) => get("/api/monitoring", { site_id: siteId }),
  monitoringPrep: (visitId) => get(`/api/monitoring/${visitId}/prep`),
  createMonitoring: (data) => post("/api/monitoring", data),
  updateChecklist: (visitId, itemId, data) => patch(`/api/monitoring/${visitId}/checklist/${itemId}`, data),
  // Interventions
  logIntervention: (data) => post("/api/interventions", data),
  interventions: (params) => get("/api/interventions", params),
  interventionStats: (siteId) => get("/api/interventions/stats", { site_id: siteId }),
  // Queries
  queries: (params) => get("/api/queries", params),
  updateQuery: (id, data) => patch(`/api/queries/${id}`, data),
  queryStats: (siteId) => get("/api/queries/stats", { site_id: siteId }),
  // Analytics
  siteAnalytics: (siteId) => get(`/api/analytics/site/${siteId}`),
  crossSiteAnalytics: () => get("/api/analytics/cross-site"),
  // Knowledge
  knowledge: (params) => get("/api/knowledge", params),
  knowledgeStats: () => get("/api/knowledge/stats"),
  addKnowledge: (data) => post("/api/knowledge", data),
  searchKnowledge: (query, siteId) => get("/api/knowledge/search", { q: query, site_id: siteId }),
  crossSiteInsights: () => get("/api/knowledge/cross-site"),
  staleKnowledge: (siteId) => get("/api/knowledge/stale", { site_id: siteId }),
  validateKnowledge: (entryId) => patch(`/api/knowledge/${entryId}/validate`),
  archiveKnowledge: (entryId) => patch(`/api/knowledge/${entryId}/archive`),
  knowledgeSuggestions: (siteId) => get("/api/knowledge/suggestions", { site_id: siteId }),
  approveSuggestion: (id) => post(`/api/knowledge/suggestions/${id}/approve`),
  dismissSuggestion: (id) => post(`/api/knowledge/suggestions/${id}/dismiss`),
  // Staff
  staff: (params) => get("/api/staff", params),
  staffDetail: (id) => get(`/api/staff/${id}`),
  createStaff: (data) => post("/api/staff", data),
  updateStaff: (id, data) => patch(`/api/staff/${id}`, data),
  staffTasks: (id, params) => get(`/api/staff/${id}/tasks`, params),
  staffPatients: (id) => get(`/api/staff/${id}/patients`),
  staffWorkload: (siteId) => get("/api/staff/workload", { site_id: siteId }),
  assignTask: (taskId, staffId) => patch(`/api/tasks/${taskId}/assign`, { staff_id: staffId }),
  assignPatient: (patientId, staffId) => patch(`/api/patients/${patientId}/assign`, { staff_id: staffId }),
  // Handoff
  handoff: (siteId) => get(`/api/handoff/${siteId}`),
  handoffAsk: (siteId, question) => post(`/api/handoff/${siteId}/ask`, { question }),
  // Chat
  chat: (message, context) => post("/api/chat", { message, context }),
  chatReset: () => post("/api/chat/reset"),
  usage: () => get("/api/usage"),
};
