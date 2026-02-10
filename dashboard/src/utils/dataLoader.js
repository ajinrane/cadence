import Papa from 'papaparse';

async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
    });
  });
}

export async function loadAllData() {
  const [predictions, patients] = await Promise.all([
    loadCSV('/data/predictions.csv'),
    loadCSV('/data/synthetic_patients.csv'),
  ]);

  // Build patient map for quick lookup
  const patientMap = {};
  patients.forEach((p) => {
    patientMap[p.patient_id] = p;
  });

  // Merge predictions with patient data
  const merged = predictions.map((pred) => {
    const patient = patientMap[pred.patient_id] || {};
    return {
      ...patient,
      ...pred,
      dropout_risk: parseFloat(pred.dropout_risk) || 0,
      age: parseInt(patient.age) || null,
      distance_from_site_miles: parseFloat(patient.distance_from_site_miles) || null,
      scheduled_visits: parseInt(patient.scheduled_visits) || 0,
      completed_visits: parseInt(patient.completed_visits) || 0,
      missed_visits: parseInt(patient.missed_visits) || 0,
      days_since_last_contact: parseInt(patient.days_since_last_contact) || 0,
      comorbidity_count: parseInt(patient.comorbidity_count) || 0,
      has_transportation_issues: patient.has_transportation_issues === true || patient.has_transportation_issues === 'True',
      has_caregiver_support: patient.has_caregiver_support === true || patient.has_caregiver_support === 'True',
      previous_trial_participation: patient.previous_trial_participation === true || patient.previous_trial_participation === 'True',
    };
  });

  // Sort by dropout risk descending
  merged.sort((a, b) => b.dropout_risk - a.dropout_risk);

  return merged;
}
