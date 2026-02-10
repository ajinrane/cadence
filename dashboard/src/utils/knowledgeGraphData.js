// ============================================================================
// Knowledge Graph Dataset — Hardcoded Investor Demo Narrative
// ============================================================================
// 12-month longitudinal story across 3 clinical trial sites showing how
// CRC institutional knowledge compounds over time.
//
// Sites:
//   Site A — Metro Academic Medical Center (Sarah M., lead CRC)
//   Site B — Community Hospital (James K., lead CRC)
//   Site C — Rural Clinic (Maria L., lead CRC)
//
// Narrative arc:
//   M1-2:  Enrollment + early reactive interventions
//   M3-5:  First CRC learnings emerge from outcomes
//   M6:    KEY — Site A discovers transport-dropout correlation
//   M7:    Site B applies Site A's insight (cross-site transfer)
//   M8:    Compounding — transport + scheduling = 83% retention
//   M9-12: Mature knowledge graph, validated cross-site patterns
// ============================================================================

// -- Node color constants (used by components) --------------------------------
export const NODE_COLORS = {
  patient: '#3b82f6',
  intervention: '#f59e0b',
  outcome: '#10b981',
  crcLearning: '#8b5cf6',
};

// -- Patients (18) ------------------------------------------------------------
export const patients = [
  // Site A — Metro Academic Medical Center (6 patients, Month 1)
  { id: 'PAT-001', type: 'patient', month: 1, data: { label: 'PT-0047', riskLevel: 'high', site: 'Site A', status: 'retained', age: 62, distance: 15 } },
  { id: 'PAT-002', type: 'patient', month: 1, data: { label: 'PT-3012', riskLevel: 'medium', site: 'Site A', status: 'active', age: 45, distance: 8 } },
  { id: 'PAT-003', type: 'patient', month: 1, data: { label: 'PT-1958', riskLevel: 'high', site: 'Site A', status: 'retained', age: 71, distance: 22 } },
  { id: 'PAT-004', type: 'patient', month: 1, data: { label: 'PT-4401', riskLevel: 'low', site: 'Site A', status: 'active', age: 38, distance: 3 } },
  { id: 'PAT-005', type: 'patient', month: 1, data: { label: 'PT-2203', riskLevel: 'medium', site: 'Site A', status: 'retained', age: 55, distance: 28 } },
  { id: 'PAT-006', type: 'patient', month: 1, data: { label: 'PT-3877', riskLevel: 'low', site: 'Site A', status: 'active', age: 49, distance: 5 } },

  // Site B — Community Hospital (6 patients, Month 1)
  { id: 'PAT-007', type: 'patient', month: 1, data: { label: 'PT-0112', riskLevel: 'high', site: 'Site B', status: 'retained', age: 67, distance: 35 } },
  { id: 'PAT-008', type: 'patient', month: 1, data: { label: 'PT-6034', riskLevel: 'medium', site: 'Site B', status: 'active', age: 42, distance: 12 } },
  { id: 'PAT-009', type: 'patient', month: 1, data: { label: 'PT-0089', riskLevel: 'medium', site: 'Site B', status: 'retained', age: 58, distance: 18 } },
  { id: 'PAT-010', type: 'patient', month: 1, data: { label: 'PT-7103', riskLevel: 'high', site: 'Site B', status: 'dropped', age: 73, distance: 7 } },

  // Site B late enrollment (Month 2)
  { id: 'PAT-011', type: 'patient', month: 2, data: { label: 'PT-7745', riskLevel: 'medium', site: 'Site B', status: 'retained', age: 51, distance: 25 } },
  { id: 'PAT-012', type: 'patient', month: 2, data: { label: 'PT-8201', riskLevel: 'low', site: 'Site B', status: 'active', age: 44, distance: 9 } },

  // Site C — Rural Clinic (6 patients, Month 2-3)
  { id: 'PAT-013', type: 'patient', month: 2, data: { label: 'PT-9010', riskLevel: 'high', site: 'Site C', status: 'retained', age: 63, distance: 42 } },
  { id: 'PAT-014', type: 'patient', month: 2, data: { label: 'PT-9284', riskLevel: 'medium', site: 'Site C', status: 'active', age: 36, distance: 38 } },
  { id: 'PAT-015', type: 'patient', month: 3, data: { label: 'PT-9501', riskLevel: 'high', site: 'Site C', status: 'retained', age: 69, distance: 55 } },
  { id: 'PAT-016', type: 'patient', month: 3, data: { label: 'PT-9733', riskLevel: 'medium', site: 'Site C', status: 'active', age: 47, distance: 31 } },
  { id: 'PAT-017', type: 'patient', month: 3, data: { label: 'PT-9890', riskLevel: 'low', site: 'Site C', status: 'active', age: 56, distance: 28 } },
  { id: 'PAT-018', type: 'patient', month: 3, data: { label: 'PT-9945', riskLevel: 'medium', site: 'Site C', status: 'retained', age: 41, distance: 45 } },
];

// -- Interventions (28) -------------------------------------------------------
export const interventions = [
  // Month 2 — Early reactive (CRCs responding to missed visits)
  { id: 'INT-001', type: 'intervention', month: 2, data: { label: 'Reminder Call', category: 'reminder_call', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-002', type: 'intervention', month: 2, data: { label: 'Reminder Call', category: 'reminder_call', executedBy: 'James K.', site: 'Site B' } },
  { id: 'INT-003', type: 'intervention', month: 2, data: { label: 'Transport Assist', category: 'transport_assist', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-004', type: 'intervention', month: 2, data: { label: 'Reminder Call', category: 'reminder_call', executedBy: 'Maria L.', site: 'Site C' } },
  { id: 'INT-005', type: 'intervention', month: 2, data: { label: 'Visit Window Adjust', category: 'visit_window_adjust', executedBy: 'James K.', site: 'Site B' } },

  // Month 3 — Escalation interventions
  { id: 'INT-006', type: 'intervention', month: 3, data: { label: 'Caregiver Outreach', category: 'caregiver_outreach', executedBy: 'James K.', site: 'Site B' } },
  { id: 'INT-007', type: 'intervention', month: 3, data: { label: 'Transport Assist', category: 'transport_assist', executedBy: 'Maria L.', site: 'Site C' } },
  { id: 'INT-008', type: 'intervention', month: 3, data: { label: 'Reminder Call', category: 'reminder_call', executedBy: 'Maria L.', site: 'Site C' } },
  { id: 'INT-009', type: 'intervention', month: 3, data: { label: 'Visit Window Adjust', category: 'visit_window_adjust', executedBy: 'Sarah M.', site: 'Site A' } },

  // Month 4 — Learnings start influencing interventions
  { id: 'INT-010', type: 'intervention', month: 4, data: { label: 'Transport Assist', category: 'transport_assist', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-011', type: 'intervention', month: 4, data: { label: 'Timed Reminder', category: 'reminder_call', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-012', type: 'intervention', month: 4, data: { label: 'Caregiver Outreach', category: 'caregiver_outreach', executedBy: 'Maria L.', site: 'Site C' } },

  // Month 5 — Combined strategies emerge
  { id: 'INT-013', type: 'intervention', month: 5, data: { label: 'Transport + Reminder', category: 'transport_assist', executedBy: 'Maria L.', site: 'Site C' } },
  { id: 'INT-014', type: 'intervention', month: 5, data: { label: 'Evening Reminder', category: 'reminder_call', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-015', type: 'intervention', month: 5, data: { label: 'Visit Window Adjust', category: 'visit_window_adjust', executedBy: 'James K.', site: 'Site B' } },

  // Month 6 — KEY: Proactive transport interventions (pre-dropout)
  { id: 'INT-016', type: 'intervention', month: 6, data: { label: 'Proactive Transport', category: 'transport_assist', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-017', type: 'intervention', month: 6, data: { label: 'Flexible Scheduling', category: 'visit_window_adjust', executedBy: 'James K.', site: 'Site B' } },
  { id: 'INT-018', type: 'intervention', month: 6, data: { label: 'Transport + Reminder', category: 'transport_assist', executedBy: 'Maria L.', site: 'Site C' } },

  // Month 7 — Site B applies Site A's transport insight
  { id: 'INT-019', type: 'intervention', month: 7, data: { label: 'Proactive Transport', category: 'transport_assist', executedBy: 'James K.', site: 'Site B' } },
  { id: 'INT-020', type: 'intervention', month: 7, data: { label: 'Early Intervention', category: 'reminder_call', executedBy: 'Maria L.', site: 'Site C' } },
  { id: 'INT-021', type: 'intervention', month: 7, data: { label: 'Combined Strategy', category: 'transport_assist', executedBy: 'James K.', site: 'Site B' } },

  // Month 8 — Refined compound strategies
  { id: 'INT-022', type: 'intervention', month: 8, data: { label: 'Full Protocol', category: 'transport_assist', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-023', type: 'intervention', month: 8, data: { label: 'Optimized Outreach', category: 'reminder_call', executedBy: 'Maria L.', site: 'Site C' } },

  // Month 9 — Precision interventions
  { id: 'INT-024', type: 'intervention', month: 9, data: { label: 'Precision Protocol', category: 'transport_assist', executedBy: 'Sarah M.', site: 'Site A' } },
  { id: 'INT-025', type: 'intervention', month: 9, data: { label: 'Caregiver Protocol', category: 'caregiver_outreach', executedBy: 'Maria L.', site: 'Site C' } },

  // Month 10
  { id: 'INT-026', type: 'intervention', month: 10, data: { label: 'Telehealth Bridge', category: 'visit_window_adjust', executedBy: 'Maria L.', site: 'Site C' } },

  // Month 11
  { id: 'INT-027', type: 'intervention', month: 11, data: { label: 'End-of-Trial Engage', category: 'reminder_call', executedBy: 'James K.', site: 'Site B' } },

  // Month 12
  { id: 'INT-028', type: 'intervention', month: 12, data: { label: 'Final Follow-Up', category: 'reminder_call', executedBy: 'Sarah M.', site: 'Site A' } },
];

// -- Outcomes (25) ------------------------------------------------------------
export const outcomes = [
  // Month 2
  { id: 'OUT-001', type: 'outcome', month: 2, data: { label: 'V2 Completed', category: 'compliance', positive: true, visitWindow: 'V2' } },
  { id: 'OUT-002', type: 'outcome', month: 2, data: { label: 'V2 Missed', category: 'dropout', positive: false, visitWindow: 'V2' } },

  // Month 3
  { id: 'OUT-003', type: 'outcome', month: 3, data: { label: 'Retained After Transport', category: 'retention', positive: true, visitWindow: 'V3' } },
  { id: 'OUT-004', type: 'outcome', month: 3, data: { label: 'V3 Attended', category: 'compliance', positive: true, visitWindow: 'V3' } },
  { id: 'OUT-005', type: 'outcome', month: 3, data: { label: 'Protocol Compliant', category: 'compliance', positive: true, visitWindow: 'V3' } },
  { id: 'OUT-006', type: 'outcome', month: 3, data: { label: 'Dropped — Lost to F/U', category: 'dropout', positive: false, visitWindow: 'V3' } },

  // Month 4
  { id: 'OUT-007', type: 'outcome', month: 4, data: { label: 'Retained', category: 'retention', positive: true, visitWindow: 'V4' } },
  { id: 'OUT-008', type: 'outcome', month: 4, data: { label: 'On-Time Visit', category: 'compliance', positive: true, visitWindow: 'V4' } },
  { id: 'OUT-009', type: 'outcome', month: 4, data: { label: 'At Risk', category: 'ae_pattern', positive: false, visitWindow: 'V4' } },

  // Month 5
  { id: 'OUT-010', type: 'outcome', month: 5, data: { label: 'Combo Retained', category: 'retention', positive: true, visitWindow: 'V5' } },
  { id: 'OUT-011', type: 'outcome', month: 5, data: { label: 'Visit Attended', category: 'compliance', positive: true, visitWindow: 'V5' } },
  { id: 'OUT-012', type: 'outcome', month: 5, data: { label: 'Protocol Compliant', category: 'compliance', positive: true, visitWindow: 'V5' } },

  // Month 6 — KEY outcomes
  { id: 'OUT-013', type: 'outcome', month: 6, data: { label: 'Proactive Retention', category: 'retention', positive: true, visitWindow: 'V6' } },
  { id: 'OUT-014', type: 'outcome', month: 6, data: { label: 'Retained', category: 'retention', positive: true, visitWindow: 'V6' } },
  { id: 'OUT-015', type: 'outcome', month: 6, data: { label: 'AE Signal Detected', category: 'ae_pattern', positive: false, visitWindow: 'V6' } },

  // Month 7
  { id: 'OUT-016', type: 'outcome', month: 7, data: { label: 'Site B Retention ↑', category: 'retention', positive: true, visitWindow: 'V7' } },
  { id: 'OUT-017', type: 'outcome', month: 7, data: { label: 'Retained', category: 'retention', positive: true, visitWindow: 'V7' } },

  // Month 8
  { id: 'OUT-018', type: 'outcome', month: 8, data: { label: 'Stable Retention', category: 'retention', positive: true, visitWindow: 'V8' } },
  { id: 'OUT-019', type: 'outcome', month: 8, data: { label: 'Site-Wide 85%+', category: 'retention', positive: true, visitWindow: 'V8' } },

  // Month 9
  { id: 'OUT-020', type: 'outcome', month: 9, data: { label: 'Long-Term Retained', category: 'retention', positive: true, visitWindow: 'V9' } },
  { id: 'OUT-021', type: 'outcome', month: 9, data: { label: 'Compliant Through V9', category: 'compliance', positive: true, visitWindow: 'V9' } },

  // Month 10
  { id: 'OUT-022', type: 'outcome', month: 10, data: { label: 'Telehealth Success', category: 'compliance', positive: true, visitWindow: 'V10' } },

  // Month 11
  { id: 'OUT-023', type: 'outcome', month: 11, data: { label: 'Retention Stabilized', category: 'retention', positive: true, visitWindow: 'V11' } },

  // Month 12
  { id: 'OUT-024', type: 'outcome', month: 12, data: { label: '85% Trial Retention', category: 'retention', positive: true, visitWindow: 'V12' } },
  { id: 'OUT-025', type: 'outcome', month: 12, data: { label: 'Trial Complete', category: 'compliance', positive: true, visitWindow: 'V12' } },
];

// -- CRC Learnings (18) -------------------------------------------------------
// Each learning has derivedFrom (patient IDs), appliedTo (intervention IDs),
// and evidenceStrength = confidence * min(1, sampleSize / 20)
export const crcLearnings = [
  // Month 3 — First learnings from early outcomes
  {
    id: 'CRC-001', type: 'crcLearning', month: 3,
    data: {
      label: '48hr Reminder Window',
      pattern: 'Reminder calls within 48 hours of a missed visit have 2.3x higher success rate than calls after 72+ hours.',
      confidence: 0.72, sampleSize: 8,
      derivedFrom: ['PAT-003', 'PAT-007', 'PAT-009'],
      appliedTo: ['INT-011'],
      evidenceStrength: 0.29, // 0.72 * min(1, 8/20)
    },
  },
  // Month 4
  {
    id: 'CRC-002', type: 'crcLearning', month: 4,
    data: {
      label: 'Distance-Dropout Risk',
      pattern: 'Patients >30 miles from site have 3x dropout risk without transportation assistance. Distance is strongest single predictor.',
      confidence: 0.78, sampleSize: 12,
      derivedFrom: ['PAT-005', 'PAT-007', 'PAT-013'],
      appliedTo: ['INT-010', 'INT-016'],
      evidenceStrength: 0.47, // 0.78 * min(1, 12/20)
    },
  },
  {
    id: 'CRC-003', type: 'crcLearning', month: 4,
    data: {
      label: 'Evening Call Timing',
      pattern: 'Evening calls (after 5pm) for working-age patients (<55) show 67% pickup rate vs 31% for daytime calls.',
      confidence: 0.68, sampleSize: 14,
      derivedFrom: ['PAT-002', 'PAT-008', 'PAT-014'],
      appliedTo: ['INT-014'],
      evidenceStrength: 0.48, // 0.68 * min(1, 14/20)
    },
  },

  // Month 5 — Combined strategy insights
  {
    id: 'CRC-004', type: 'crcLearning', month: 5,
    data: {
      label: 'Transport + Reminder Combo',
      pattern: 'Combined transport assistance with reminder calls yields 85% retention in patients who previously missed visits (n=4).',
      confidence: 0.75, sampleSize: 4,
      derivedFrom: ['PAT-005', 'PAT-013', 'PAT-014', 'PAT-003'],
      appliedTo: ['INT-013', 'INT-018'],
      evidenceStrength: 0.15, // 0.75 * min(1, 4/20)
    },
  },
  {
    id: 'CRC-005', type: 'crcLearning', month: 5,
    data: {
      label: 'Rural Early Intervention',
      pattern: 'Site C patients require intervention by V2 (not V3) to prevent disengagement. Rural sites need earlier touchpoints.',
      confidence: 0.70, sampleSize: 6,
      derivedFrom: ['PAT-013', 'PAT-015', 'PAT-016'],
      appliedTo: ['INT-020'],
      evidenceStrength: 0.21, // 0.70 * min(1, 6/20)
    },
  },

  // Month 6 — KEY LEARNING: Transport-dropout correlation
  {
    id: 'CRC-006', type: 'crcLearning', month: 6,
    data: {
      label: 'Transport = 67% Dropout Risk',
      pattern: 'Transportation barriers correlate with 67% dropout risk in suburban/rural patients. Proactive transport before V3 reduces this to 18%.',
      confidence: 0.88, sampleSize: 16,
      derivedFrom: ['PAT-005', 'PAT-007', 'PAT-013', 'PAT-015', 'PAT-003'],
      appliedTo: ['INT-016', 'INT-019'],
      evidenceStrength: 0.70, // 0.88 * min(1, 16/20)
    },
  },
  {
    id: 'CRC-007', type: 'crcLearning', month: 6,
    data: {
      label: 'Proactive > Reactive',
      pattern: 'Proactive intervention before V3 reduces dropout by 45% compared to reactive intervention after missed visit.',
      confidence: 0.82, sampleSize: 14,
      derivedFrom: ['PAT-004', 'PAT-005', 'PAT-009'],
      appliedTo: ['INT-016', 'INT-020'],
      evidenceStrength: 0.57, // 0.82 * min(1, 14/20)
    },
  },

  // Month 7 — Cross-site knowledge transfer
  {
    id: 'CRC-008', type: 'crcLearning', month: 7,
    data: {
      label: 'Cross-Site Transfer +23%',
      pattern: 'Site B retention improved +23% after applying Site A transport insights. Cross-site knowledge transfer validated.',
      confidence: 0.85, sampleSize: 18,
      derivedFrom: ['PAT-007', 'PAT-009', 'PAT-011'],
      appliedTo: ['INT-019', 'INT-021'],
      evidenceStrength: 0.77, // 0.85 * min(1, 18/20)
    },
  },
  {
    id: 'CRC-009', type: 'crcLearning', month: 7,
    data: {
      label: 'AE Escalation Protocol',
      pattern: '3 missed visits + comorbidity count ≥2 = escalate to PI immediately. Early AE detection pattern.',
      confidence: 0.79, sampleSize: 10,
      derivedFrom: ['PAT-010', 'PAT-003'],
      appliedTo: [],
      evidenceStrength: 0.40, // 0.79 * min(1, 10/20)
    },
  },
  {
    id: 'CRC-010', type: 'crcLearning', month: 7,
    data: {
      label: 'Visit Window Flexibility',
      pattern: 'Visit window flexibility (±3 days) reduces dropout by 31% with zero protocol impact. Low-cost, high-impact.',
      confidence: 0.80, sampleSize: 15,
      derivedFrom: ['PAT-009', 'PAT-006', 'PAT-012'],
      appliedTo: ['INT-017'],
      evidenceStrength: 0.60, // 0.80 * min(1, 15/20)
    },
  },

  // Month 8 — COMPOUNDING: Transport + scheduling = 83% retention
  {
    id: 'CRC-011', type: 'crcLearning', month: 8,
    data: {
      label: 'Transport + Scheduling = 83%',
      pattern: 'Transport assistance combined with flexible scheduling reduces dropout by 83% (n=12, cross-site validated). Strongest compound intervention.',
      confidence: 0.91, sampleSize: 12,
      derivedFrom: ['PAT-005', 'PAT-007', 'PAT-011', 'PAT-013'],
      appliedTo: ['INT-022', 'INT-023'],
      evidenceStrength: 0.55, // 0.91 * min(1, 12/20)
    },
  },
  {
    id: 'CRC-012', type: 'crcLearning', month: 8,
    data: {
      label: 'Optimal Contact Cadence',
      pattern: 'Optimal intervention cadence: every 14 days for high-risk patients, every 28 days for medium-risk. Over-contact causes fatigue.',
      confidence: 0.83, sampleSize: 18,
      derivedFrom: ['PAT-001', 'PAT-008', 'PAT-014'],
      appliedTo: ['INT-024'],
      evidenceStrength: 0.75, // 0.83 * min(1, 18/20)
    },
  },
  {
    id: 'CRC-013', type: 'crcLearning', month: 8,
    data: {
      label: 'Caregiver Engagement 3x',
      pattern: 'Caregiver engagement triples retention for patients >65 with comorbidity ≥2. Family involvement is critical for elderly.',
      confidence: 0.76, sampleSize: 8,
      derivedFrom: ['PAT-003', 'PAT-010', 'PAT-015'],
      appliedTo: ['INT-025'],
      evidenceStrength: 0.30, // 0.76 * min(1, 8/20)
    },
  },

  // Month 9 — Mature insights
  {
    id: 'CRC-014', type: 'crcLearning', month: 9,
    data: {
      label: 'Rural Telehealth Bridge',
      pattern: 'Site C rural protocol: monthly home visits + telehealth bridge = 78% retention for patients >40 miles from site.',
      confidence: 0.80, sampleSize: 9,
      derivedFrom: ['PAT-013', 'PAT-015', 'PAT-018'],
      appliedTo: ['INT-026'],
      evidenceStrength: 0.36, // 0.80 * min(1, 9/20)
    },
  },
  {
    id: 'CRC-015', type: 'crcLearning', month: 9,
    data: {
      label: 'Contact Preference Map',
      pattern: '73% of patients <55 prefer text reminders, but phone calls remain necessary for >65 age group (92% response rate).',
      confidence: 0.86, sampleSize: 18,
      derivedFrom: ['PAT-002', 'PAT-004', 'PAT-008', 'PAT-012'],
      appliedTo: ['INT-027'],
      evidenceStrength: 0.77, // 0.86 * min(1, 18/20)
    },
  },

  // Month 10 — Late-stage
  {
    id: 'CRC-016', type: 'crcLearning', month: 10,
    data: {
      label: 'End-of-Trial Fatigue',
      pattern: 'Increase contact frequency in final 3 months — end-of-trial fatigue causes 15% of late-stage dropouts.',
      confidence: 0.74, sampleSize: 11,
      derivedFrom: ['PAT-001', 'PAT-006', 'PAT-017'],
      appliedTo: ['INT-027', 'INT-028'],
      evidenceStrength: 0.41, // 0.74 * min(1, 11/20)
    },
  },

  // Month 11 — Near-completion synthesis
  {
    id: 'CRC-017', type: 'crcLearning', month: 11,
    data: {
      label: 'Institutional Playbook',
      pattern: '17 validated interventions across 3 sites. Composite retention rate: 89%. Playbook ready for next trial cycle.',
      confidence: 0.92, sampleSize: 18,
      derivedFrom: ['PAT-001', 'PAT-005', 'PAT-007', 'PAT-011', 'PAT-013'],
      appliedTo: [],
      evidenceStrength: 0.83, // 0.92 * min(1, 18/20)
    },
  },

  // Month 12 — Final knowledge
  {
    id: 'CRC-018', type: 'crcLearning', month: 12,
    data: {
      label: 'Knowledge Transfer Ready',
      pattern: 'Complete knowledge transfer protocol documented. 3 CRCs, 18 patients, 85% retention achieved. Ready for multi-trial deployment.',
      confidence: 0.95, sampleSize: 18,
      derivedFrom: ['PAT-001', 'PAT-003', 'PAT-005', 'PAT-007', 'PAT-013'],
      appliedTo: [],
      evidenceStrength: 0.86, // 0.95 * min(1, 18/20)
    },
  },
];

// -- Edges (~130) -------------------------------------------------------------
export const edges = [
  // ===== Month 2: Early reactive interventions =====
  // Patient → Intervention (received)
  { id: 'e-P03-I01', source: 'PAT-003', target: 'INT-001', month: 2, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P07-I02', source: 'PAT-007', target: 'INT-002', month: 2, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P05-I03', source: 'PAT-005', target: 'INT-003', month: 2, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P13-I04', source: 'PAT-013', target: 'INT-004', month: 2, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P09-I05', source: 'PAT-009', target: 'INT-005', month: 2, data: { relationship: 'received', weight: 1.0 } },

  // Intervention → Outcome (produced)
  { id: 'e-I01-O01', source: 'INT-001', target: 'OUT-001', month: 2, data: { relationship: 'produced', weight: 0.85 } },
  { id: 'e-I02-O02', source: 'INT-002', target: 'OUT-002', month: 2, data: { relationship: 'produced', weight: 0.20 } },

  // Patient → Outcome (experienced)
  { id: 'e-P03-O01', source: 'PAT-003', target: 'OUT-001', month: 2, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P07-O02', source: 'PAT-007', target: 'OUT-002', month: 2, data: { relationship: 'experienced', weight: 1.0 } },

  // ===== Month 3: Escalation + first learning =====
  { id: 'e-P07-I06', source: 'PAT-007', target: 'INT-006', month: 3, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P13-I07', source: 'PAT-013', target: 'INT-007', month: 3, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P15-I08', source: 'PAT-015', target: 'INT-008', month: 3, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P02-I09', source: 'PAT-002', target: 'INT-009', month: 3, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I03-O03', source: 'INT-003', target: 'OUT-003', month: 3, data: { relationship: 'produced', weight: 0.80 } },
  { id: 'e-I06-O04', source: 'INT-006', target: 'OUT-004', month: 3, data: { relationship: 'produced', weight: 0.75 } },
  { id: 'e-I05-O05', source: 'INT-005', target: 'OUT-005', month: 3, data: { relationship: 'produced', weight: 0.70 } },
  { id: 'e-I04-O06', source: 'INT-004', target: 'OUT-006', month: 3, data: { relationship: 'produced', weight: 0.15 } },

  { id: 'e-P05-O03', source: 'PAT-005', target: 'OUT-003', month: 3, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P07-O04', source: 'PAT-007', target: 'OUT-004', month: 3, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P09-O05', source: 'PAT-009', target: 'OUT-005', month: 3, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P10-O06', source: 'PAT-010', target: 'OUT-006', month: 3, data: { relationship: 'experienced', weight: 1.0 } },

  // Outcome → CRC Learning (informed): First learning emerges
  { id: 'e-O01-C01', source: 'OUT-001', target: 'CRC-001', month: 3, data: { relationship: 'informed', weight: 0.72 } },
  { id: 'e-O02-C01', source: 'OUT-002', target: 'CRC-001', month: 3, data: { relationship: 'informed', weight: 0.65 } },

  // ===== Month 4: Learnings influence new interventions =====
  { id: 'e-P16-I10', source: 'PAT-016', target: 'INT-010', month: 4, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P08-I11', source: 'PAT-008', target: 'INT-011', month: 4, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P14-I12', source: 'PAT-014', target: 'INT-012', month: 4, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I07-O07', source: 'INT-007', target: 'OUT-007', month: 4, data: { relationship: 'produced', weight: 0.82 } },
  { id: 'e-I11-O08', source: 'INT-011', target: 'OUT-008', month: 4, data: { relationship: 'produced', weight: 0.78 } },
  { id: 'e-I12-O09', source: 'INT-012', target: 'OUT-009', month: 4, data: { relationship: 'produced', weight: 0.35 } },

  { id: 'e-P13-O07', source: 'PAT-013', target: 'OUT-007', month: 4, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P08-O08', source: 'PAT-008', target: 'OUT-008', month: 4, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P14-O09', source: 'PAT-014', target: 'OUT-009', month: 4, data: { relationship: 'experienced', weight: 1.0 } },

  // Outcomes → CRC Learnings
  { id: 'e-O03-C02', source: 'OUT-003', target: 'CRC-002', month: 4, data: { relationship: 'informed', weight: 0.78 } },
  { id: 'e-O06-C02', source: 'OUT-006', target: 'CRC-002', month: 4, data: { relationship: 'informed', weight: 0.70 } },
  { id: 'e-O01-C03', source: 'OUT-001', target: 'CRC-003', month: 4, data: { relationship: 'informed', weight: 0.68 } },
  { id: 'e-O08-C03', source: 'OUT-008', target: 'CRC-003', month: 4, data: { relationship: 'informed', weight: 0.60 } },

  // CRC Learning → Intervention (recommends)
  { id: 'e-C01-I11', source: 'CRC-001', target: 'INT-011', month: 4, data: { relationship: 'recommends', weight: 0.72 } },
  { id: 'e-C02-I10', source: 'CRC-002', target: 'INT-010', month: 4, data: { relationship: 'recommends', weight: 0.78 } },

  // ===== Month 5: Combined strategies emerge =====
  { id: 'e-P14-I13', source: 'PAT-014', target: 'INT-013', month: 5, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P18-I14', source: 'PAT-018', target: 'INT-014', month: 5, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P06-I15', source: 'PAT-006', target: 'INT-015', month: 5, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I13-O10', source: 'INT-013', target: 'OUT-010', month: 5, data: { relationship: 'produced', weight: 0.85 } },
  { id: 'e-I14-O11', source: 'INT-014', target: 'OUT-011', month: 5, data: { relationship: 'produced', weight: 0.67 } },
  { id: 'e-I09-O12', source: 'INT-009', target: 'OUT-012', month: 5, data: { relationship: 'produced', weight: 0.70 } },

  { id: 'e-P14-O10', source: 'PAT-014', target: 'OUT-010', month: 5, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P18-O11', source: 'PAT-018', target: 'OUT-011', month: 5, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P06-O12', source: 'PAT-006', target: 'OUT-012', month: 5, data: { relationship: 'experienced', weight: 1.0 } },

  // Outcomes → CRC Learnings (compound insights)
  { id: 'e-O10-C04', source: 'OUT-010', target: 'CRC-004', month: 5, data: { relationship: 'informed', weight: 0.75 } },
  { id: 'e-O07-C05', source: 'OUT-007', target: 'CRC-005', month: 5, data: { relationship: 'informed', weight: 0.70 } },

  // CRC Learning → Intervention
  { id: 'e-C02-I13', source: 'CRC-002', target: 'INT-013', month: 5, data: { relationship: 'recommends', weight: 0.80 } },
  { id: 'e-C03-I14', source: 'CRC-003', target: 'INT-014', month: 5, data: { relationship: 'recommends', weight: 0.68 } },

  // CRC Learning → CRC Learning (builds_on)
  { id: 'e-C02-C04', source: 'CRC-002', target: 'CRC-004', month: 5, data: { relationship: 'builds_on', weight: 0.70 } },
  { id: 'e-C01-C05', source: 'CRC-001', target: 'CRC-005', month: 5, data: { relationship: 'builds_on', weight: 0.55 } },

  // ===== Month 6: KEY — Transport-dropout discovery =====
  { id: 'e-P04-I16', source: 'PAT-004', target: 'INT-016', month: 6, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P11-I17', source: 'PAT-011', target: 'INT-017', month: 6, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P18-I18', source: 'PAT-018', target: 'INT-018', month: 6, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I16-O13', source: 'INT-016', target: 'OUT-013', month: 6, data: { relationship: 'produced', weight: 0.90 } },
  { id: 'e-I17-O14', source: 'INT-017', target: 'OUT-014', month: 6, data: { relationship: 'produced', weight: 0.78 } },
  { id: 'e-I18-O15', source: 'INT-018', target: 'OUT-015', month: 6, data: { relationship: 'produced', weight: 0.25 } },

  { id: 'e-P04-O13', source: 'PAT-004', target: 'OUT-013', month: 6, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P11-O14', source: 'PAT-011', target: 'OUT-014', month: 6, data: { relationship: 'experienced', weight: 1.0 } },

  // KEY edges: Outcomes → CRC-006 (transport-dropout correlation)
  { id: 'e-O03-C06', source: 'OUT-003', target: 'CRC-006', month: 6, data: { relationship: 'informed', weight: 0.88 } },
  { id: 'e-O06-C06', source: 'OUT-006', target: 'CRC-006', month: 6, data: { relationship: 'informed', weight: 0.82 } },
  { id: 'e-O07-C06', source: 'OUT-007', target: 'CRC-006', month: 6, data: { relationship: 'informed', weight: 0.80 } },
  { id: 'e-O13-C07', source: 'OUT-013', target: 'CRC-007', month: 6, data: { relationship: 'informed', weight: 0.82 } },

  // Learnings recommending interventions
  { id: 'e-C06-I16', source: 'CRC-006', target: 'INT-016', month: 6, data: { relationship: 'recommends', weight: 0.88 } },
  { id: 'e-C07-I16', source: 'CRC-007', target: 'INT-016', month: 6, data: { relationship: 'recommends', weight: 0.82 } },

  // builds_on: CRC-002 → CRC-006 (distance insight → transport correlation)
  { id: 'e-C02-C06', source: 'CRC-002', target: 'CRC-006', month: 6, data: { relationship: 'builds_on', weight: 0.85 } },
  { id: 'e-C04-C06', source: 'CRC-004', target: 'CRC-006', month: 6, data: { relationship: 'builds_on', weight: 0.72 } },

  // ===== Month 7: Cross-site knowledge transfer =====
  { id: 'e-P07-I19', source: 'PAT-007', target: 'INT-019', month: 7, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P17-I20', source: 'PAT-017', target: 'INT-020', month: 7, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P11-I21', source: 'PAT-011', target: 'INT-021', month: 7, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I19-O16', source: 'INT-019', target: 'OUT-016', month: 7, data: { relationship: 'produced', weight: 0.88 } },
  { id: 'e-I20-O17', source: 'INT-020', target: 'OUT-017', month: 7, data: { relationship: 'produced', weight: 0.75 } },

  { id: 'e-P07-O16', source: 'PAT-007', target: 'OUT-016', month: 7, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P17-O17', source: 'PAT-017', target: 'OUT-017', month: 7, data: { relationship: 'experienced', weight: 1.0 } },

  // KEY: CRC-006 recommends cross-site intervention
  { id: 'e-C06-I19', source: 'CRC-006', target: 'INT-019', month: 7, data: { relationship: 'recommends', weight: 0.90 } },
  { id: 'e-C07-I20', source: 'CRC-007', target: 'INT-020', month: 7, data: { relationship: 'recommends', weight: 0.80 } },

  // Outcomes → CRC Learnings
  { id: 'e-O16-C08', source: 'OUT-016', target: 'CRC-008', month: 7, data: { relationship: 'informed', weight: 0.85 } },
  { id: 'e-O14-C08', source: 'OUT-014', target: 'CRC-008', month: 7, data: { relationship: 'informed', weight: 0.75 } },
  { id: 'e-O15-C09', source: 'OUT-015', target: 'CRC-009', month: 7, data: { relationship: 'informed', weight: 0.79 } },
  { id: 'e-O05-C10', source: 'OUT-005', target: 'CRC-010', month: 7, data: { relationship: 'informed', weight: 0.80 } },
  { id: 'e-O12-C10', source: 'OUT-012', target: 'CRC-010', month: 7, data: { relationship: 'informed', weight: 0.72 } },

  // CRC Learning → CRC Learning (compounding)
  { id: 'e-C06-C08', source: 'CRC-006', target: 'CRC-008', month: 7, data: { relationship: 'builds_on', weight: 0.90 } },
  { id: 'e-C05-C10', source: 'CRC-005', target: 'CRC-010', month: 7, data: { relationship: 'builds_on', weight: 0.65 } },

  { id: 'e-C10-I17', source: 'CRC-010', target: 'INT-017', month: 7, data: { relationship: 'recommends', weight: 0.80 } },

  // ===== Month 8: COMPOUNDING — Transport + Scheduling = 83% =====
  { id: 'e-P03-I22', source: 'PAT-003', target: 'INT-022', month: 8, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P15-I23', source: 'PAT-015', target: 'INT-023', month: 8, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I22-O18', source: 'INT-022', target: 'OUT-018', month: 8, data: { relationship: 'produced', weight: 0.92 } },
  { id: 'e-I21-O19', source: 'INT-021', target: 'OUT-019', month: 8, data: { relationship: 'produced', weight: 0.88 } },

  { id: 'e-P03-O18', source: 'PAT-003', target: 'OUT-018', month: 8, data: { relationship: 'experienced', weight: 1.0 } },

  // KEY compounding edges
  { id: 'e-O18-C11', source: 'OUT-018', target: 'CRC-011', month: 8, data: { relationship: 'informed', weight: 0.91 } },
  { id: 'e-O19-C11', source: 'OUT-019', target: 'CRC-011', month: 8, data: { relationship: 'informed', weight: 0.88 } },
  { id: 'e-O16-C12', source: 'OUT-016', target: 'CRC-012', month: 8, data: { relationship: 'informed', weight: 0.83 } },
  { id: 'e-O04-C13', source: 'OUT-004', target: 'CRC-013', month: 8, data: { relationship: 'informed', weight: 0.76 } },

  // CRC → CRC compounding
  { id: 'e-C06-C11', source: 'CRC-006', target: 'CRC-011', month: 8, data: { relationship: 'builds_on', weight: 0.92 } },
  { id: 'e-C10-C11', source: 'CRC-010', target: 'CRC-011', month: 8, data: { relationship: 'builds_on', weight: 0.85 } },
  { id: 'e-C08-C12', source: 'CRC-008', target: 'CRC-012', month: 8, data: { relationship: 'builds_on', weight: 0.78 } },

  { id: 'e-C11-I22', source: 'CRC-011', target: 'INT-022', month: 8, data: { relationship: 'recommends', weight: 0.91 } },
  { id: 'e-C12-I23', source: 'CRC-012', target: 'INT-023', month: 8, data: { relationship: 'recommends', weight: 0.83 } },

  // ===== Month 9: Precision interventions =====
  { id: 'e-P01-I24', source: 'PAT-001', target: 'INT-024', month: 9, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-P16-I25', source: 'PAT-016', target: 'INT-025', month: 9, data: { relationship: 'received', weight: 1.0 } },

  { id: 'e-I24-O20', source: 'INT-024', target: 'OUT-020', month: 9, data: { relationship: 'produced', weight: 0.90 } },
  { id: 'e-I25-O21', source: 'INT-025', target: 'OUT-021', month: 9, data: { relationship: 'produced', weight: 0.82 } },

  { id: 'e-P01-O20', source: 'PAT-001', target: 'OUT-020', month: 9, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-P16-O21', source: 'PAT-016', target: 'OUT-021', month: 9, data: { relationship: 'experienced', weight: 1.0 } },

  { id: 'e-O20-C14', source: 'OUT-020', target: 'CRC-014', month: 9, data: { relationship: 'informed', weight: 0.80 } },
  { id: 'e-O21-C15', source: 'OUT-021', target: 'CRC-015', month: 9, data: { relationship: 'informed', weight: 0.86 } },

  { id: 'e-C11-I24', source: 'CRC-011', target: 'INT-024', month: 9, data: { relationship: 'recommends', weight: 0.88 } },
  { id: 'e-C13-I25', source: 'CRC-013', target: 'INT-025', month: 9, data: { relationship: 'recommends', weight: 0.76 } },

  { id: 'e-C05-C14', source: 'CRC-005', target: 'CRC-014', month: 9, data: { relationship: 'builds_on', weight: 0.70 } },
  { id: 'e-C03-C15', source: 'CRC-003', target: 'CRC-015', month: 9, data: { relationship: 'builds_on', weight: 0.68 } },
  { id: 'e-C12-C15', source: 'CRC-012', target: 'CRC-015', month: 9, data: { relationship: 'builds_on', weight: 0.75 } },

  // ===== Month 10 =====
  { id: 'e-P18-I26', source: 'PAT-018', target: 'INT-026', month: 10, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-I26-O22', source: 'INT-026', target: 'OUT-022', month: 10, data: { relationship: 'produced', weight: 0.80 } },
  { id: 'e-P18-O22', source: 'PAT-018', target: 'OUT-022', month: 10, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-O22-C16', source: 'OUT-022', target: 'CRC-016', month: 10, data: { relationship: 'informed', weight: 0.74 } },
  { id: 'e-C14-I26', source: 'CRC-014', target: 'INT-026', month: 10, data: { relationship: 'recommends', weight: 0.80 } },
  { id: 'e-C15-C16', source: 'CRC-015', target: 'CRC-016', month: 10, data: { relationship: 'builds_on', weight: 0.70 } },

  // ===== Month 11 =====
  { id: 'e-P12-I27', source: 'PAT-012', target: 'INT-027', month: 11, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-I27-O23', source: 'INT-027', target: 'OUT-023', month: 11, data: { relationship: 'produced', weight: 0.85 } },
  { id: 'e-P12-O23', source: 'PAT-012', target: 'OUT-023', month: 11, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-O23-C17', source: 'OUT-023', target: 'CRC-017', month: 11, data: { relationship: 'informed', weight: 0.92 } },
  { id: 'e-C16-I27', source: 'CRC-016', target: 'INT-027', month: 11, data: { relationship: 'recommends', weight: 0.74 } },
  { id: 'e-C11-C17', source: 'CRC-011', target: 'CRC-017', month: 11, data: { relationship: 'builds_on', weight: 0.90 } },
  { id: 'e-C08-C17', source: 'CRC-008', target: 'CRC-017', month: 11, data: { relationship: 'builds_on', weight: 0.85 } },

  // ===== Month 12 =====
  { id: 'e-P01-I28', source: 'PAT-001', target: 'INT-028', month: 12, data: { relationship: 'received', weight: 1.0 } },
  { id: 'e-I28-O24', source: 'INT-028', target: 'OUT-024', month: 12, data: { relationship: 'produced', weight: 0.90 } },
  { id: 'e-I28-O25', source: 'INT-028', target: 'OUT-025', month: 12, data: { relationship: 'produced', weight: 0.88 } },
  { id: 'e-P01-O24', source: 'PAT-001', target: 'OUT-024', month: 12, data: { relationship: 'experienced', weight: 1.0 } },
  { id: 'e-O24-C18', source: 'OUT-024', target: 'CRC-018', month: 12, data: { relationship: 'informed', weight: 0.95 } },
  { id: 'e-O25-C18', source: 'OUT-025', target: 'CRC-018', month: 12, data: { relationship: 'informed', weight: 0.90 } },
  { id: 'e-C17-C18', source: 'CRC-017', target: 'CRC-018', month: 12, data: { relationship: 'builds_on', weight: 0.95 } },
  { id: 'e-C16-I28', source: 'CRC-016', target: 'INT-028', month: 12, data: { relationship: 'recommends', weight: 0.74 } },
];

// -- Aggregated exports -------------------------------------------------------
export const allNodes = [...patients, ...interventions, ...outcomes, ...crcLearnings];
export const allEdges = edges;

// -- Node count by month (for slider sparkline) -------------------------------
export const nodeCountByMonth = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1;
  return allNodes.filter((n) => n.month <= month).length;
});
