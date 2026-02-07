# ClinicalTrials.gov Cardiometabolic Dropout Scraper

Pulls completed Phase III cardiometabolic trials from ClinicalTrials.gov API v2 and extracts participant flow, dropout patterns, protocol details, and site distribution data.

## Setup

```bash
pip install requests pandas scikit-learn joblib numpy
```

## Usage

```bash
python ctgov_scraper.py
```

Runtime depends on the number of matching trials. Expect 15-45 minutes due to API rate limiting (~50 requests/min).

## Outputs

| File | Format | Contents |
|------|--------|----------|
| `ctgov_cardiometabolic_trials.json` | JSON | Full structured data with metadata |
| `ctgov_cardiometabolic_trials.csv` | CSV | Flattened records for spreadsheet analysis |
| `ctgov_dropout_analysis.csv` | CSV | Dropout-focused view sorted by dropout rate |
| `ctgov_graph_nodes.csv` | CSV | Graph node table (trial, arm, period, outcome, country) |
| `ctgov_graph_edges.csv` | CSV | Graph edge table with dropout-event weights |
| `ctgov_graph_provenance.csv` | CSV | Trial-level extraction and confidence metadata |

## Train Model

After running the scraper, train a baseline dropout-weight model:

```bash
python train_dropout_model.py
```

Optional args:

```bash
python train_dropout_model.py --edges ctgov_graph_edges.csv --nodes ctgov_graph_nodes.csv --output-dir model_artifacts --target graph_weight --test-size 0.2
```

Training outputs (in `model_artifacts/` by default):
- `dropout_weight_model.joblib` - serialized sklearn pipeline + metadata
- `metrics.json` - split settings and MAE/RMSE/R2
- `feature_importance.csv` - ranked feature importances
- `scored_dropout_events.csv` - predictions vs actual weights for all rows

## Predict Risk

Score existing graph dropout events (ranked for CRC prioritization):

```bash
python predict_dropout_risk.py --from-graph
```

Score new context rows:

```bash
python predict_dropout_risk.py --input new_dropout_contexts.csv
```

If `new_dropout_contexts.csv` does not exist, the script creates a template with required model feature columns.

Prediction output:
- `model_artifacts/dropout_risk_predictions.csv`

## What It Captures

**Participant Flow (Dropout Data)**
- Total started, completed, discontinued per trial
- Dropout rate calculation
- Discontinuation reasons with counts (e.g., "Adverse Event (23); Lost to Follow-up (15); Withdrawal by Subject (12)")
- Top dropout reason per trial

**Protocol Details**
- Trial design (arms, allocation, masking)
- Conditions, interventions, eligibility criteria
- Outcome measures and timeframes
- Start/completion dates, enrollment

**Site Distribution**
- Total sites, number of countries
- Geographic breakdown by country and state
- Sponsor and sponsor class

## Conditions Searched

The scraper queries these cardiometabolic conditions:
- Diabetes type 2, NASH/MASH, cardiovascular disease
- Heart failure, atherosclerosis, dyslipidemia
- Hypertension, obesity, metabolic syndrome

Filters: Phase 3 | Completed | Has Results | Enrollment >= 200

## Customization

Edit the configuration section at the top of `ctgov_scraper.py`:

- `CONDITION_QUERIES` - add/remove condition search terms
- `MIN_ENROLLMENT` - change minimum enrollment threshold
- `RATE_LIMIT_DELAY` - adjust delay between API calls (don't go below 1.0s)

## Using in Claude Code

This script is designed to be run as-is in Claude Code:

```bash
claude "Run the ClinicalTrials.gov scraper and summarize the dropout patterns"
```

Or add to your project's CLAUDE.md:

```markdown
## Data Pipeline
- `ctgov_scraper.py` pulls cardiometabolic trial dropout data from ClinicalTrials.gov
- Output CSVs are in the project root
- Run periodically to refresh data (API data updates as new results are posted)
```

## Data Notes

- Not all completed trials have results posted - the API filters for `HasResults`
- Participant flow data quality varies; some trials report minimal dropout reasons
- Enrollment count may be "ESTIMATED" vs "ACTUAL" - check `enrollment_type` field
- Dropout rate is calculated as `(started - completed) / started` using first and last periods
- Trials may appear under multiple condition searches; deduplication is by NCT ID
