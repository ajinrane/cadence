export const agentActivityLog = [
  {
    id: 1,
    status: 'completed',
    message: 'Analyzed 23 patient records for dropout signals',
    timestamp: '2 min ago',
    icon: 'check',
  },
  {
    id: 2,
    status: 'running',
    message: 'Scheduling 5 overdue visits across 2 trials',
    timestamp: 'In progress',
    icon: 'loader',
  },
  {
    id: 3,
    status: 'running',
    message: 'Drafting outreach messages for 3 high-risk patients',
    timestamp: 'In progress',
    icon: 'loader',
  },
  {
    id: 4,
    status: 'awaiting',
    message: 'Awaiting CRC approval: Offer ride service to PT-0047',
    timestamp: 'Pending',
    icon: 'pause',
  },
  {
    id: 5,
    status: 'completed',
    message: 'Updated knowledge base with 4 new intervention outcomes',
    timestamp: '8 min ago',
    icon: 'check',
  },
  {
    id: 6,
    status: 'completed',
    message: 'Cross-site analysis: transport barriers ↑12% this month',
    timestamp: '15 min ago',
    icon: 'check',
  },
];

export const knowledgeBaseInterventions = [
  {
    name: 'Ride Service Coordination',
    successRate: 0.73,
    sampleSize: 48,
    sites: 3,
    agentExecutable: true,
    description: 'Arrange transportation for patients with mobility or distance barriers',
  },
  {
    name: 'Flexible Visit Scheduling',
    successRate: 0.68,
    sampleSize: 62,
    sites: 4,
    agentExecutable: true,
    description: 'Offer alternative visit times including evenings and weekends',
  },
  {
    name: 'Proactive Phone Outreach',
    successRate: 0.61,
    sampleSize: 85,
    sites: 5,
    agentExecutable: true,
    description: 'Contact patients before missed visits with personalized reminders',
  },
  {
    name: 'Caregiver Engagement',
    successRate: 0.58,
    sampleSize: 34,
    sites: 2,
    agentExecutable: false,
    description: 'Involve caregivers in visit planning and medication reminders',
  },
  {
    name: 'Protocol Simplification Request',
    successRate: 0.52,
    sampleSize: 19,
    sites: 2,
    agentExecutable: false,
    description: 'Request PI review of visit burden for at-risk patients',
  },
  {
    name: 'Financial Assistance Navigation',
    successRate: 0.65,
    sampleSize: 27,
    sites: 3,
    agentExecutable: true,
    description: 'Connect patients with stipend programs and expense reimbursement',
  },
];

export const interventionHistory = [
  {
    id: 1,
    timestamp: '2026-02-08 09:15',
    crc: 'Sarah M.',
    type: 'Ride Service',
    patient: 'PT-0025',
    outcome: 'Patient attended next visit',
    agentExecutable: true,
  },
  {
    id: 2,
    timestamp: '2026-02-07 14:30',
    crc: 'James K.',
    type: 'Phone Outreach',
    patient: 'PT-0123',
    outcome: 'Rescheduled 2 missed visits',
    agentExecutable: true,
  },
  {
    id: 3,
    timestamp: '2026-02-07 11:00',
    crc: 'Sarah M.',
    type: 'Flexible Scheduling',
    patient: 'PT-0048',
    outcome: 'Moved to evening slot — patient retained',
    agentExecutable: true,
  },
  {
    id: 4,
    timestamp: '2026-02-06 16:45',
    crc: 'Maria L.',
    type: 'Caregiver Engagement',
    patient: 'PT-0003',
    outcome: 'Caregiver committed to transport support',
    agentExecutable: false,
  },
  {
    id: 5,
    timestamp: '2026-02-06 10:20',
    crc: 'James K.',
    type: 'Protocol Simplification',
    patient: 'PT-0057',
    outcome: 'PI approved reduced visit frequency',
    agentExecutable: false,
  },
];

export function getPatientRiskFactors(patient) {
  if (!patient) return [];
  const factors = [];

  if (patient.missed_visits >= 3) {
    factors.push({
      name: 'High Missed Visit Count',
      impact: 'HIGH',
      explanation: `Patient has missed ${patient.missed_visits} scheduled visits, indicating significant disengagement from the trial protocol.`,
      contribution: 35,
    });
  } else if (patient.missed_visits >= 1) {
    factors.push({
      name: 'Missed Visits Detected',
      impact: patient.missed_visits >= 2 ? 'HIGH' : 'MEDIUM',
      explanation: `${patient.missed_visits} missed visit(s) detected. Each missed visit increases dropout probability by ~15%.`,
      contribution: 20 + patient.missed_visits * 5,
    });
  }

  if (patient.days_since_last_contact > 45) {
    factors.push({
      name: 'Extended Contact Gap',
      impact: 'HIGH',
      explanation: `${patient.days_since_last_contact} days since last contact. Patients with >30-day gaps are 3.2x more likely to drop out.`,
      contribution: 30,
    });
  } else if (patient.days_since_last_contact > 20) {
    factors.push({
      name: 'Growing Contact Gap',
      impact: 'MEDIUM',
      explanation: `${patient.days_since_last_contact} days since last contact. Recommend outreach within 7 days.`,
      contribution: 18,
    });
  }

  if (patient.has_transportation_issues) {
    factors.push({
      name: 'Transportation Barrier',
      impact: 'HIGH',
      explanation: `Patient flagged with transportation issues. Distance: ${patient.distance_from_site_miles?.toFixed(1)} miles from site.`,
      contribution: 25,
    });
  } else if (patient.distance_from_site_miles > 40) {
    factors.push({
      name: 'High Distance from Site',
      impact: 'MEDIUM',
      explanation: `Patient lives ${patient.distance_from_site_miles?.toFixed(1)} miles from trial site. Distance >30mi correlates with 1.8x dropout risk.`,
      contribution: 15,
    });
  }

  if (patient.completed_visits === 0 && patient.scheduled_visits > 0) {
    factors.push({
      name: 'No Completed Visits',
      impact: 'HIGH',
      explanation: `Patient has not completed any of ${patient.scheduled_visits} scheduled visits. Early disengagement is a strong dropout predictor.`,
      contribution: 28,
    });
  }

  if (patient.comorbidity_count >= 3) {
    factors.push({
      name: 'Multiple Comorbidities',
      impact: 'MEDIUM',
      explanation: `${patient.comorbidity_count} comorbidities may create competing healthcare demands and visit fatigue.`,
      contribution: 12,
    });
  }

  if (!patient.has_caregiver_support && patient.age > 60) {
    factors.push({
      name: 'No Caregiver Support (Elderly)',
      impact: 'MEDIUM',
      explanation: `Patient aged ${patient.age} without caregiver support. Elderly patients without support are 2.1x more likely to drop out.`,
      contribution: 14,
    });
  }

  // Sort by contribution and return top 3
  factors.sort((a, b) => b.contribution - a.contribution);
  return factors.slice(0, 3);
}

export function getPatientActions(patient) {
  if (!patient) return [];
  const actions = [];

  if (patient.dropout_risk > 0.7) {
    actions.push({
      priority: 'HIGH PRIORITY',
      description: 'Schedule immediate welfare call — patient at critical dropout risk',
      evidence: '72% success rate (n=34 similar cases)',
      autoExecute: true,
    });
  }

  if (patient.has_transportation_issues || patient.distance_from_site_miles > 40) {
    actions.push({
      priority: patient.dropout_risk > 0.6 ? 'HIGH PRIORITY' : 'MEDIUM',
      description: 'Arrange ride service for upcoming visits',
      evidence: '73% retention when transport barrier resolved (n=48)',
      autoExecute: true,
    });
  }

  if (patient.missed_visits >= 2) {
    actions.push({
      priority: 'HIGH PRIORITY',
      description: 'Initiate protocol adherence review and reschedule missed visits',
      evidence: '61% re-engagement rate with proactive rescheduling (n=85)',
      autoExecute: false,
    });
  }

  if (patient.days_since_last_contact > 30) {
    actions.push({
      priority: 'MEDIUM',
      description: `Send personalized outreach via ${patient.contact_method_preference || 'phone'} — ${patient.days_since_last_contact} days since last contact`,
      evidence: '68% response rate with preferred contact method (n=62)',
      autoExecute: true,
    });
  }

  if (!patient.has_caregiver_support && patient.dropout_risk > 0.5) {
    actions.push({
      priority: 'MEDIUM',
      description: 'Explore caregiver engagement — identify support network',
      evidence: '58% improvement with caregiver involvement (n=34)',
      autoExecute: false,
    });
  }

  return actions.slice(0, 4);
}

export const agentWorkflows = [
  {
    title: 'Schedule & Confirm Visits',
    description: 'Agent books slots, sends confirmations, logs in EDC',
    icon: 'calendar',
  },
  {
    title: 'Barrier Detection & Resolution',
    description: 'Agent identifies transport issues, offers ride service, tracks outcomes',
    icon: 'shield',
  },
  {
    title: 'Protocol Compliance Monitoring',
    description: 'Agent flags deviations, suggests corrective actions',
    icon: 'clipboard',
  },
  {
    title: 'Cross-Site Knowledge Synthesis',
    description: 'Agent identifies what works across similar trials',
    icon: 'network',
  },
];
