export function formatRiskScore(score) {
  return (score * 100).toFixed(1) + '%';
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export function getRiskColor(level) {
  switch (level?.toLowerCase()) {
    case 'high': return { text: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' };
    case 'medium': return { text: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' };
    case 'low': return { text: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' };
    default: return { text: '#7a8fb8', bg: 'transparent', border: 'transparent' };
  }
}

export function getAgentRecommendation(patient) {
  if (!patient) return 'Monitor';
  const risk = patient.dropout_risk;
  const days = patient.days_since_last_contact;
  const transport = patient.has_transportation_issues;
  const missed = patient.missed_visits;

  if (risk > 0.7 && days > 60) return 'Schedule urgent call';
  if (transport) return 'Offer transport assistance';
  if (missed >= 3) return 'Protocol adherence review';
  if (risk > 0.5 && days > 30) return 'Schedule follow-up call';
  if (risk > 0.3) return 'Send engagement message';
  return 'Continue monitoring';
}

export function getAgentStatus(patient) {
  if (!patient) return 'monitoring';
  if (patient.dropout_risk > 0.7) return 'intervention_queued';
  if (patient.dropout_risk > 0.4) return 'monitoring';
  return 'stable';
}

export function getStatusLabel(status) {
  switch (status) {
    case 'intervention_queued': return 'Intervention Queued';
    case 'monitoring': return 'Agent Monitoring';
    case 'stable': return 'Stable — Low Priority';
    default: return 'Monitoring';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case 'intervention_queued': return '#ef4444';
    case 'monitoring': return '#3b82f6';
    case 'stable': return '#10b981';
    default: return '#7a8fb8';
  }
}
