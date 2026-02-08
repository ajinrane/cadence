# Cadence System Architecture

## System Overview
Cadence combines trial context data and site-level patient engagement signals to predict dropout risk early enough for CRC intervention. In practice, data flows from ingestion to feature engineering, then into a logistic regression model that outputs risk scores and explanations. Those outputs power a CRC dashboard, where coordinators act on high-risk patients and log interventions. Over time, intervention outcomes feed a learning layer that captures institutional knowledge and improves retention strategy across sites.

## Data Flow Diagram

```text
+---------------------+
| ClinicalTrials.gov  |
|     Scraper         |
+----------+----------+
           | Trial metadata
           v
+---------------------+
|  Patient Records    |
|  (Site systems)     |
+----------+----------+
           | Demographics, visits, contact
           v
+---------------------+
| Feature Engineering |
| - Visit completion  |
| - Contact recency   |
| - Behavioral signals|
+----------+----------+
           |
           v
+---------------------+
|  Dropout Model      |
| (Logistic Reg)      |
+----------+----------+
           | Risk scores + factors
           v
+---------------------+
|   CRC Dashboard     |
| - Patient list      |
| - Risk alerts       |
| - Detail views      |
+----------+----------+
           |
           v
+---------------------+
|  CRC Interventions  |
| - Notes captured    |
| - Tactics logged    |
+----------+----------+
           |
           v
+---------------------+
| Knowledge Graph     |
| (Future: learns     |
|  what works)        |
+---------------------+
```

## Component Details

### 1. Data Ingestion
- Currently: ClinicalTrials.gov scraper for trial metadata.
- Production: Integration with site EMR/EDC systems (Epic, Medidata, etc.).
- Patient-level behavioral data: visit history, contact logs, engagement patterns.

### 2. Prediction Engine
- Logistic regression model (current: 0.96 AUC-ROC).
- Features: 15 behavioral and demographic signals.
- Outputs: Risk score (0-1), risk level (High/Medium/Low), top 3 risk factors.
- Updates: Daily batch scoring, real-time option for critical events.

### 3. CRC Dashboard
- Patient list view with sortable risk scores.
- Individual patient pages with full history + risk breakdown.
- Alert system for newly high-risk patients.
- Mobile-responsive (CRCs work on tablets at sites).

### 4. Knowledge Capture
- CRCs document interventions and outcomes.
- System tags: what was tried (ride service, schedule flex, etc.).
- Links interventions to patient risk factors.
- Future: ML learns which tactics work for which risk profiles.

### 5. Feedback Loop (Future)
- Intervention effectiveness tracking.
- Protocol-specific retention playbooks.
- Cross-site knowledge sharing (anonymized).
- Continuous model improvement from real outcomes.

## Technical Stack
- Backend: Python (scikit-learn, pandas).
- Model: Logistic Regression with L2 regularization.
- Dashboard: Streamlit (current prototype).
- Database: CSV files (prototype), PostgreSQL for production.
- Deployment: Cloud-based (AWS/GCP), HIPAA-compliant infrastructure.

## Security & Compliance
- HIPAA compliance: encryption at rest and in transit.
- PHI handling: minimal data, de-identification where possible.
- Access control: role-based, audit logging.
- IRB approval: required for each pilot site.

## Scalability Considerations
- Current: Single-site prototype.
- Phase 1 (6 months): 3 pilot sites, ~50 trials, ~2,000 patients.
- Phase 2 (12 months): 20+ sites, ~500 trials, ~20,000 patients.
- Architecture supports horizontal scaling (stateless prediction API).
