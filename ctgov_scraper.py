"""
ClinicalTrials.gov Cardiometabolic Trial Dropout Scraper
=========================================================
Pulls completed Phase III cardiometabolic trials with results data from
ClinicalTrials.gov API v2. Extracts participant flow, protocol details,
site distribution, and dropout patterns.

Usage:
    python ctgov_scraper.py

Outputs:
    - ctgov_cardiometabolic_trials.json  (full structured data)
    - ctgov_cardiometabolic_trials.csv   (flattened for analysis)
    - ctgov_dropout_analysis.csv         (dropout-specific analysis view)

Requirements:
    pip install requests pandas
"""

import requests
import pandas as pd
import json
import time
import math
from datetime import datetime
from pathlib import Path

# ============================================================================
# CONFIGURATION
# ============================================================================

BASE_URL = "https://clinicaltrials.gov/api/v2/studies"
OUTPUT_DIR = Path(".")
RATE_LIMIT_DELAY = 1.2  # seconds between requests (API limit ~50/min)

# Cardiometabolic search conditions
CONDITION_QUERIES = [
    "diabetes type 2",
    "NASH",
    "MASH",
    "nonalcoholic steatohepatitis",
    "cardiovascular disease",
    "heart failure",
    "atherosclerosis",
    "dyslipidemia",
    "hypertension",
    "obesity",
    "metabolic syndrome",
]

# Minimum enrollment to filter out tiny pilot studies
MIN_ENROLLMENT = 200

# ============================================================================
# API INTERACTION
# ============================================================================


def search_trials(condition: str, page_token: str = None) -> dict:
    """Search for completed Phase III trials with results for a condition."""
    params = {
        "query.cond": condition,
        "filter.overallStatus": "COMPLETED",
        "query.term": "AREA[Phase]PHASE3 AND AREA[HasResults]true",
        "pageSize": 100,
        "countTotal": "true",
        "format": "json",
    }
    if page_token:
        params["pageToken"] = page_token

    try:
        resp = requests.get(BASE_URL, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            print("  Rate limited. Waiting 60s...")
            time.sleep(60)
            return search_trials(condition, page_token)
        raise
    except requests.exceptions.RequestException as e:
        print(f"  Request error: {e}")
        return {"studies": []}


def fetch_full_study(nct_id: str) -> dict:
    """Fetch complete study record including results section."""
    url = f"{BASE_URL}/{nct_id}"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            print(f"  Rate limited on {nct_id}. Waiting 60s...")
            time.sleep(60)
            return fetch_full_study(nct_id)
        print(f"  Error fetching {nct_id}: {e}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"  Request error for {nct_id}: {e}")
        return None


# ============================================================================
# DATA EXTRACTION
# ============================================================================


def extract_identification(protocol: dict) -> dict:
    """Extract trial identification info."""
    id_mod = protocol.get("identificationModule", {})
    status_mod = protocol.get("statusModule", {})
    sponsor_mod = protocol.get("sponsorCollaboratorsModule", {})
    design_mod = protocol.get("designModule", {})

    return {
        "nct_id": id_mod.get("nctId"),
        "brief_title": id_mod.get("briefTitle"),
        "official_title": id_mod.get("officialTitle"),
        "org_study_id": id_mod.get("orgStudyIdInfo", {}).get("id"),
        "sponsor": sponsor_mod.get("leadSponsor", {}).get("name"),
        "sponsor_class": sponsor_mod.get("leadSponsor", {}).get("class"),
        "overall_status": status_mod.get("overallStatus"),
        "start_date": status_mod.get("startDateStruct", {}).get("date"),
        "completion_date": status_mod.get("completionDateStruct", {}).get("date"),
        "study_type": design_mod.get("studyType"),
        "allocation": design_mod.get("designInfo", {}).get("allocation"),
        "intervention_model": design_mod.get("designInfo", {}).get("interventionModel"),
        "masking": design_mod.get("designInfo", {}).get("maskingInfo", {}).get("masking"),
        "enrollment_count": design_mod.get("enrollmentInfo", {}).get("count"),
        "enrollment_type": design_mod.get("enrollmentInfo", {}).get("type"),
    }


def extract_conditions_interventions(protocol: dict) -> dict:
    """Extract conditions and interventions."""
    cond_mod = protocol.get("conditionsModule", {})
    arms_mod = protocol.get("armsInterventionsModule", {})

    conditions = cond_mod.get("conditions", [])
    interventions = arms_mod.get("interventions", [])
    arms = arms_mod.get("armGroups", [])

    return {
        "conditions": "; ".join(conditions),
        "num_arms": len(arms),
        "arm_names": "; ".join([a.get("label", "") for a in arms]),
        "interventions": "; ".join(
            [f"{i.get('type', '')}: {i.get('name', '')}" for i in interventions]
        ),
        "intervention_types": "; ".join(
            list(set([i.get("type", "") for i in interventions]))
        ),
    }


def extract_eligibility(protocol: dict) -> dict:
    """Extract eligibility criteria."""
    elig = protocol.get("eligibilityModule", {})
    return {
        "min_age": elig.get("minimumAge"),
        "max_age": elig.get("maximumAge"),
        "sex": elig.get("sex"),
        "healthy_volunteers": elig.get("healthyVolunteers"),
        "eligibility_criteria": elig.get("eligibilityCriteria", "")[:500],  # truncate
    }


def extract_locations(protocol: dict) -> dict:
    """Extract site locations and geographic distribution."""
    contacts_mod = protocol.get("contactsLocationsModule", {})
    locations = contacts_mod.get("locations", [])

    countries = {}
    states = {}
    total_sites = len(locations)

    for loc in locations:
        country = loc.get("country", "Unknown")
        state = loc.get("state", "")
        countries[country] = countries.get(country, 0) + 1
        if state:
            key = f"{state}, {country}"
            states[key] = states.get(key, 0) + 1

    return {
        "total_sites": total_sites,
        "num_countries": len(countries),
        "countries": "; ".join([f"{k} ({v})" for k, v in sorted(countries.items(), key=lambda x: -x[1])]),
        "top_states": "; ".join(
            [f"{k} ({v})" for k, v in sorted(states.items(), key=lambda x: -x[1])[:10]]
        ),
    }


def extract_participant_flow(results: dict) -> dict:
    """Extract participant flow data, including robust dropout metrics."""
    flow = results.get("participantFlowModule", {})
    if not flow:
        return {
            "has_participant_flow": False,
            "flow_groups": "",
            "flow_periods": "",
            "milestone_events": "",
            "dropout_events": "",
            "num_periods": 0,
            "total_started": None,
            "total_completed": None,
            "total_discontinued": None,
            "dropout_rate": None,
            "discontinuation_reasons": "",
            "top_dropout_reason": None,
            "top_dropout_reason_count": None,
            "dropout_reference_period": None,
            "dropout_reference_method": None,
            "dropout_completed_capped": False,
        }

    # Extract groups (arms)
    groups = flow.get("groups", [])
    group_info = []
    for g in groups:
        group_info.append(
            {
                "id": g.get("id"),
                "title": g.get("title"),
                "description": g.get("description", "")[:200],
            }
        )

    # Extract periods (enrollment -> treatment -> follow-up)
    periods = flow.get("periods", [])
    period_data = []
    milestone_events = []
    dropout_events = []
    period_totals = []
    total_started = None
    total_completed = None
    total_discontinued = 0
    discontinuation_reasons = {}
    dropout_reference_period = None
    dropout_reference_method = None
    dropout_completed_capped = False

    for period in periods:
        p_title = period.get("title", "")
        period_started = 0
        period_completed = 0

        # Milestones (Started, Completed, Not Completed)
        milestones = period.get("milestones", [])
        for ms in milestones:
            ms_type = ms.get("type", "")
            achievements = ms.get("achievements", [])
            for ach in achievements:
                count_str = ach.get("numSubjects") or ach.get("numUnits") or "0"
                try:
                    count = int(count_str)
                except (ValueError, TypeError):
                    count = 0

                if ms_type.upper() == "STARTED":
                    period_started += count
                elif ms_type.upper() == "COMPLETED":
                    period_completed += count

                milestone_events.append(
                    {
                        "period_title": p_title,
                        "milestone_type": ms_type,
                        "group_id": ach.get("groupId"),
                        "count": count,
                    }
                )

        # Drop withdrawals, the key dropout data.
        drop_withdraws = period.get("dropWithdraws", [])
        for dw in drop_withdraws:
            reason = dw.get("type", "Unknown")
            counts = dw.get("reasons", []) or dw.get("counts", [])
            reason_total = 0
            for c in counts:
                count_str = c.get("numSubjects") or c.get("numUnits") or "0"
                try:
                    count = int(count_str)
                except (ValueError, TypeError):
                    count = 0
                reason_total += count
                total_discontinued += count
                dropout_events.append(
                    {
                        "period_title": p_title,
                        "reason": reason,
                        "group_id": c.get("groupId"),
                        "discontinued_n": count,
                    }
                )

            if reason in discontinuation_reasons:
                discontinuation_reasons[reason] += reason_total
            else:
                discontinuation_reasons[reason] = reason_total

        period_data.append(
            {
                "title": p_title,
                "num_milestones": len(milestones),
                "num_drop_reasons": len(drop_withdraws),
            }
        )
        period_totals.append(
            {
                "title": p_title,
                "started": period_started,
                "completed": period_completed,
            }
        )

    # Pick a consistent denominator period for dropout metrics.
    # Prefer "Overall Study" if present; otherwise use the period with the
    # largest STARTED count to avoid cross-segment denominator mismatches.
    reference_period = None
    overall_candidates = [
        p for p in period_totals if p["started"] > 0 and "overall" in (p["title"] or "").lower()
    ]
    if overall_candidates:
        reference_period = max(overall_candidates, key=lambda p: p["started"])
        dropout_reference_method = "overall_period"
    else:
        started_candidates = [p for p in period_totals if p["started"] > 0]
        if started_candidates:
            reference_period = max(started_candidates, key=lambda p: p["started"])
            dropout_reference_method = "max_started_period"

    if reference_period:
        dropout_reference_period = reference_period["title"]
        total_started = reference_period["started"]
        total_completed = reference_period["completed"]

        if total_started > 0 and total_completed > total_started:
            total_completed = total_started
            dropout_completed_capped = True

    # Calculate dropout rate
    dropout_rate = None
    if total_started and total_started > 0:
        dropout_rate = round(
            max(0.0, min(100.0, (total_started - (total_completed or 0)) / total_started * 100)),
            1,
        )

    # Sort discontinuation reasons by frequency
    sorted_reasons = sorted(discontinuation_reasons.items(), key=lambda x: -x[1])
    reasons_str = "; ".join([f"{reason} ({count})" for reason, count in sorted_reasons])

    return {
        "has_participant_flow": True,
        "flow_groups": json.dumps(group_info),
        "flow_periods": json.dumps(period_data),
        "milestone_events": json.dumps(milestone_events),
        "dropout_events": json.dumps(dropout_events),
        "num_periods": len(periods),
        "total_started": total_started,
        "total_completed": total_completed,
        "total_discontinued": total_discontinued,
        "dropout_rate": dropout_rate,
        "discontinuation_reasons": reasons_str,
        "top_dropout_reason": sorted_reasons[0][0] if sorted_reasons else None,
        "top_dropout_reason_count": sorted_reasons[0][1] if sorted_reasons else None,
        "dropout_reference_period": dropout_reference_period,
        "dropout_reference_method": dropout_reference_method,
        "dropout_completed_capped": dropout_completed_capped,
    }


def extract_protocol_amendments(protocol: dict) -> dict:
    """Extract protocol amendment/version history if available."""
    # Amendments aren't directly in the API but we can check for large protocol changes
    # via secondary IDs and description updates
    desc = protocol.get("descriptionModule", {})
    return {
        "has_detailed_description": bool(desc.get("detailedDescription")),
        "brief_summary_length": len(desc.get("briefSummary", "")),
    }


def extract_outcomes(results: dict) -> dict:
    """Extract primary/secondary outcome measures."""
    outcomes = results.get("outcomeMeasuresModule", {})
    measures = outcomes.get("outcomeMeasures", [])

    primary = [m for m in measures if m.get("type") == "PRIMARY"]
    secondary = [m for m in measures if m.get("type") == "SECONDARY"]

    return {
        "num_primary_outcomes": len(primary),
        "num_secondary_outcomes": len(secondary),
        "primary_outcome_titles": "; ".join([m.get("title", "") for m in primary]),
        "primary_timeframes": "; ".join([m.get("timeFrame", "") for m in primary]),
    }


def extract_adverse_events_summary(results: dict) -> dict:
    """Extract high-level adverse event summary."""
    ae_mod = results.get("adverseEventsModule", {})
    if not ae_mod:
        return {"has_ae_data": False}

    return {
        "has_ae_data": True,
        "ae_frequency_threshold": ae_mod.get("frequencyThreshold"),
        "ae_timeframe": ae_mod.get("timeFrame"),
        "ae_description": (ae_mod.get("description") or "")[:300],
    }


def process_study(study_data: dict, search_condition: str) -> dict:
    """Process a single study into a flat record."""
    protocol = study_data.get("protocolSection", {})
    results = study_data.get("resultsSection", {})
    derived = study_data.get("derivedSection", {})

    record = {"search_condition": search_condition}
    record.update(extract_identification(protocol))
    record.update(extract_conditions_interventions(protocol))
    record.update(extract_eligibility(protocol))
    record.update(extract_locations(protocol))
    record.update(extract_participant_flow(results))
    record.update(extract_protocol_amendments(protocol))
    record.update(extract_outcomes(results))
    record.update(extract_adverse_events_summary(results))

    # Add derived section data
    cond_browse = derived.get("conditionBrowseModule", {})
    meshes = cond_browse.get("meshes", [])
    record["mesh_terms"] = "; ".join([m.get("term", "") for m in meshes])

    return record


def _safe_load_json_array(value):
    """Best-effort parse for JSON-encoded list columns."""
    if not value or not isinstance(value, str):
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _to_int(value):
    """Coerce count-like values to int when possible."""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None


def _compute_recency_decay(completion_date, reference_ts, half_life_days=365 * 8):
    """Exponential decay factor using completion date recency."""
    dt = pd.to_datetime(completion_date, errors="coerce")
    ref_dt = pd.to_datetime(reference_ts, errors="coerce")
    if pd.isna(dt) or pd.isna(ref_dt):
        return 1.0

    age_days = max((ref_dt - dt).days, 0)
    return 0.5 ** (age_days / half_life_days)


def _build_graph_exports(records: list, scraped_at: str):
    """Build node/edge/provenance tables for context graph ingestion."""
    nodes = []
    edges = []
    provenance = []

    def _fallback_dropout_rows(rec):
        rows = []
        reason_chunks = [c for c in (rec.get("discontinuation_reasons") or "").split("; ") if c]
        for chunk in reason_chunks:
            reason = chunk
            discontinued_n = 0
            if chunk.endswith(")") and " (" in chunk:
                reason = chunk.rsplit(" (", 1)[0]
                count_text = chunk.rsplit(" (", 1)[1].rstrip(")")
                discontinued_n = _to_int(count_text) or 0
            rows.append(
                {
                    "period_title": "Unspecified Period",
                    "reason": reason,
                    "group_id": None,
                    "discontinued_n": discontinued_n,
                }
            )
        return rows

    for record in records:
        nct_id = record.get("nct_id")
        if not nct_id:
            continue

        enrollment_count = _to_int(record.get("enrollment_count"))
        total_started = _to_int(record.get("total_started"))
        total_completed = _to_int(record.get("total_completed"))
        dropout_rate = record.get("dropout_rate")
        has_flow = bool(record.get("has_participant_flow"))
        recency_decay = _compute_recency_decay(record.get("completion_date"), scraped_at)

        # Trial node
        nodes.append({
            "node_type": "trial",
            "node_id": nct_id,
            "trial_id": nct_id,
            "label": record.get("brief_title"),
            "phase": "PHASE3",
            "search_condition": record.get("search_condition"),
            "conditions": record.get("conditions"),
            "sponsor_class": record.get("sponsor_class"),
            "enrollment_count": enrollment_count,
            "start_date": record.get("start_date"),
            "completion_date": record.get("completion_date"),
            "num_countries": _to_int(record.get("num_countries")),
            "total_sites": _to_int(record.get("total_sites")),
        })

        # Arm nodes + edges
        group_rows = _safe_load_json_array(record.get("flow_groups"))
        group_map = {}
        for g in group_rows:
            gid = g.get("id")
            if not gid:
                continue
            group_map[gid] = g.get("title") or gid
            arm_node_id = f"{nct_id}::arm::{gid}"
            nodes.append({
                "node_type": "arm",
                "node_id": arm_node_id,
                "trial_id": nct_id,
                "arm_id": gid,
                "label": g.get("title") or gid,
                "description": g.get("description"),
            })
            edges.append({
                "edge_type": "trial_has_arm",
                "source_id": nct_id,
                "target_id": arm_node_id,
                "trial_id": nct_id,
            })

        # Period nodes + edges
        period_rows = _safe_load_json_array(record.get("flow_periods"))
        period_index = {}
        for idx, p in enumerate(period_rows):
            period_title = p.get("title") or f"Period {idx + 1}"
            period_node_id = f"{nct_id}::period::{idx + 1}"
            period_index[period_title] = period_node_id
            nodes.append({
                "node_type": "period",
                "node_id": period_node_id,
                "trial_id": nct_id,
                "period_order": idx + 1,
                "label": period_title,
            })
            edges.append({
                "edge_type": "trial_has_period",
                "source_id": nct_id,
                "target_id": period_node_id,
                "trial_id": nct_id,
            })

        # Dropout event edges (primary weighting table)
        dropout_rows = _safe_load_json_array(record.get("dropout_events"))
        # Backward-compatibility fallback: synthesize dropout events from
        # discontinuation string when detailed event rows were not captured
        # or when legacy parsed rows exist but all have zero counts.
        event_sum = sum((_to_int(ev.get("discontinued_n")) or 0) for ev in dropout_rows)
        if (not dropout_rows or event_sum == 0) and record.get("discontinuation_reasons"):
            dropout_rows = _fallback_dropout_rows(record)
        for idx, event in enumerate(dropout_rows):
            reason = event.get("reason") or "Unknown"
            period_title = event.get("period_title") or "Unspecified Period"
            discontinued_n = _to_int(event.get("discontinued_n")) or 0
            group_id = event.get("group_id")

            if group_id and group_id in group_map:
                source_id = f"{nct_id}::arm::{group_id}"
            else:
                source_id = nct_id

            target_id = period_index.get(period_title, nct_id)
            period_rate = None
            trial_rate = None
            if total_started and total_started > 0:
                trial_rate = round(discontinued_n / total_started, 6)
                period_rate = trial_rate

            evidence_quality = 1.0
            if not has_flow:
                evidence_quality = 0.0
            elif total_started in (None, 0):
                evidence_quality = 0.6
            elif not reason or reason == "Unknown":
                evidence_quality = 0.7

            base_rate = trial_rate or 0.0
            size_factor = math.log1p(total_started) if total_started and total_started > 0 else 0.0
            graph_weight = round(base_rate * size_factor * evidence_quality * recency_decay, 8)

            edges.append({
                "edge_type": "dropout_event",
                "edge_id": f"{nct_id}::dropout::{idx + 1}",
                "source_id": source_id,
                "target_id": target_id,
                "trial_id": nct_id,
                "reason": reason,
                "period_title": period_title,
                "arm_id": group_id,
                "discontinued_n": discontinued_n,
                "started_n": total_started,
                "completed_n": total_completed,
                "rate_within_period": period_rate,
                "rate_vs_trial_start": trial_rate,
                "base_rate": base_rate,
                "size_factor_log1p_started": round(size_factor, 6),
                "recency_decay": round(recency_decay, 6),
                "evidence_quality": evidence_quality,
                "graph_weight": graph_weight,
                "source_path": "resultsSection.participantFlowModule.periods[*].dropWithdraws",
            })

        # Outcome context edges
        primary_titles = (record.get("primary_outcome_titles") or "").split("; ")
        primary_timeframes = (record.get("primary_timeframes") or "").split("; ")
        for idx, title in enumerate([t for t in primary_titles if t]):
            timeframe = primary_timeframes[idx] if idx < len(primary_timeframes) else None
            outcome_node_id = f"{nct_id}::outcome::primary::{idx + 1}"
            nodes.append({
                "node_type": "outcome",
                "node_id": outcome_node_id,
                "trial_id": nct_id,
                "label": title,
                "outcome_type": "PRIMARY",
                "timeframe": timeframe,
            })
            edges.append({
                "edge_type": "trial_has_outcome",
                "source_id": nct_id,
                "target_id": outcome_node_id,
                "trial_id": nct_id,
                "outcome_type": "PRIMARY",
            })

        # Site context edges
        country_entries = [c for c in (record.get("countries") or "").split("; ") if c]
        for country_entry in country_entries:
            country_name = country_entry.rsplit(" (", 1)[0]
            country_node_id = f"{nct_id}::country::{country_name}"
            nodes.append({
                "node_type": "country",
                "node_id": country_node_id,
                "trial_id": nct_id,
                "label": country_name,
            })
            edges.append({
                "edge_type": "trial_has_country",
                "source_id": nct_id,
                "target_id": country_node_id,
                "trial_id": nct_id,
            })

        # Provenance row
        provenance.append({
            "trial_id": nct_id,
            "scraped_at": scraped_at,
            "extractor_version": "v2_graph_weighted_export",
            "has_participant_flow": has_flow,
            "dropout_rate_pct": dropout_rate,
            "started_n": total_started,
            "completed_n": total_completed,
            "recency_decay": round(recency_decay, 6),
            "missing_enrollment": enrollment_count is None,
            "parse_warning": "",
        })

    return (
        pd.DataFrame(nodes).drop_duplicates(),
        pd.DataFrame(edges).drop_duplicates(),
        pd.DataFrame(provenance).drop_duplicates(),
    )


# ============================================================================
# MAIN PIPELINE
# ============================================================================


def run_scraper():
    """Main scraper pipeline."""
    print("=" * 70)
    print("ClinicalTrials.gov Cardiometabolic Trial Dropout Scraper")
    print("=" * 70)
    print(f"Start time: {datetime.now().isoformat()}")
    print(f"Searching {len(CONDITION_QUERIES)} condition queries")
    print(f"Filters: Phase 3, Completed, Has Results, Enrollment >= {MIN_ENROLLMENT}")
    print()

    # Step 1: Collect all unique NCT IDs matching our criteria
    all_nct_ids = {}  # nct_id -> search_condition that found it
    
    for i, condition in enumerate(CONDITION_QUERIES):
        print(f"[{i+1}/{len(CONDITION_QUERIES)}] Searching: {condition}")
        
        page_token = None
        condition_count = 0
        
        while True:
            data = search_trials(condition, page_token)
            studies = data.get("studies", [])
            total = data.get("totalCount", "?")
            
            if not studies:
                break
                
            for study in studies:
                protocol = study.get("protocolSection", {})
                nct_id = protocol.get("identificationModule", {}).get("nctId")
                enrollment_raw = protocol.get("designModule", {}).get("enrollmentInfo", {}).get("count")
                enrollment = _to_int(enrollment_raw)

                if nct_id and enrollment is not None and enrollment >= MIN_ENROLLMENT:
                    if nct_id not in all_nct_ids:
                        all_nct_ids[nct_id] = condition
                        condition_count += 1
            
            # Check for next page
            page_token = data.get("nextPageToken")
            if not page_token:
                break
            time.sleep(RATE_LIMIT_DELAY)
        
        print(f"  Found {condition_count} new trials (total unique: {len(all_nct_ids)}) [API reports {total} total matches]")
        time.sleep(RATE_LIMIT_DELAY)

    print(f"\nTotal unique trials to fetch: {len(all_nct_ids)}")
    print(f"Estimated time: ~{len(all_nct_ids) * RATE_LIMIT_DELAY / 60:.1f} minutes")
    print()

    # Step 2: Fetch full records for each trial
    records = []
    errors = []
    
    for i, (nct_id, search_cond) in enumerate(all_nct_ids.items()):
        if (i + 1) % 25 == 0 or i == 0:
            print(f"  Fetching {i+1}/{len(all_nct_ids)}: {nct_id}")
        
        study_data = fetch_full_study(nct_id)
        if study_data:
            try:
                record = process_study(study_data, search_cond)
                records.append(record)
            except Exception as e:
                errors.append({"nct_id": nct_id, "error": str(e)})
                print(f"  Parse error for {nct_id}: {e}")
        else:
            errors.append({"nct_id": nct_id, "error": "fetch_failed"})
        
        time.sleep(RATE_LIMIT_DELAY)

    print(f"\nSuccessfully processed: {len(records)} trials")
    print(f"Errors: {len(errors)}")

    # Step 3: Save outputs
    print("\nSaving outputs...")

    scraped_at = datetime.now().isoformat()

    # Full JSON
    json_path = OUTPUT_DIR / "ctgov_cardiometabolic_trials.json"
    with open(json_path, "w") as f:
        json.dump({
            "metadata": {
                "scraped_at": scraped_at,
                "conditions_searched": CONDITION_QUERIES,
                "filters": {
                    "phase": "PHASE3",
                    "status": "COMPLETED",
                    "has_results": True,
                    "min_enrollment": MIN_ENROLLMENT,
                },
                "total_trials": len(records),
                "errors": len(errors),
            },
            "trials": records,
            "errors": errors,
        }, f, indent=2, default=str)
    print(f"  JSON: {json_path}")

    # Main CSV
    df = pd.DataFrame(records)
    csv_path = OUTPUT_DIR / "ctgov_cardiometabolic_trials.csv"
    df.to_csv(csv_path, index=False)
    print(f"  CSV:  {csv_path} ({len(df)} rows, {len(df.columns)} columns)")

    # Dropout analysis view
    if len(df) > 0:
        dropout_cols = [
            "nct_id", "brief_title", "search_condition", "conditions",
            "sponsor", "sponsor_class",
            "enrollment_count", "num_arms", "total_sites", "num_countries",
            "start_date", "completion_date",
            "has_participant_flow", "total_started", "total_completed",
            "total_discontinued", "dropout_rate",
            "discontinuation_reasons", "top_dropout_reason", "top_dropout_reason_count",
            "num_periods",
        ]
        # Only include columns that exist
        dropout_cols = [c for c in dropout_cols if c in df.columns]
        df_dropout = df[dropout_cols].copy()
        
        # Sort by dropout rate descending
        if "dropout_rate" in df_dropout.columns:
            df_dropout = df_dropout.sort_values("dropout_rate", ascending=False)
        
        dropout_path = OUTPUT_DIR / "ctgov_dropout_analysis.csv"
        df_dropout.to_csv(dropout_path, index=False)
        print(f"  Dropout analysis: {dropout_path}")

        # Print summary stats
        print("\n" + "=" * 70)
        print("SUMMARY STATISTICS")
        print("=" * 70)
        
        has_flow = df["has_participant_flow"].sum()
        print(f"Trials with participant flow data: {has_flow}/{len(df)}")
        
        if "dropout_rate" in df.columns:
            valid_rates = df["dropout_rate"].dropna()
            if len(valid_rates) > 0:
                print(f"\nDropout Rate Distribution (n={len(valid_rates)}):")
                print(f"  Mean:   {valid_rates.mean():.1f}%")
                print(f"  Median: {valid_rates.median():.1f}%")
                print(f"  Std:    {valid_rates.std():.1f}%")
                print(f"  Min:    {valid_rates.min():.1f}%")
                print(f"  Max:    {valid_rates.max():.1f}%")
                print(f"  Q25:    {valid_rates.quantile(0.25):.1f}%")
                print(f"  Q75:    {valid_rates.quantile(0.75):.1f}%")

        if "top_dropout_reason" in df.columns:
            reason_counts = df["top_dropout_reason"].value_counts().head(10)
            print(f"\nMost Common Primary Dropout Reason (across trials):")
            for reason, count in reason_counts.items():
                print(f"  {reason}: {count} trials")

        if "enrollment_count" in df.columns:
            print(f"\nEnrollment Distribution:")
            enrollments = df["enrollment_count"].dropna()
            print(f"  Mean:   {enrollments.mean():.0f}")
            print(f"  Median: {enrollments.median():.0f}")
            print(f"  Range:  {enrollments.min():.0f} - {enrollments.max():.0f}")

        if "total_sites" in df.columns:
            sites = df["total_sites"].dropna()
            if sites.sum() > 0:
                print(f"\nSite Distribution:")
                print(f"  Mean sites/trial:   {sites.mean():.0f}")
                print(f"  Median sites/trial: {sites.median():.0f}")

    # Graph-ready exports
    if records:
        print("\nBuilding graph-ready outputs...")
        graph_nodes_df, graph_edges_df, graph_prov_df = _build_graph_exports(records, scraped_at)

        nodes_path = OUTPUT_DIR / "ctgov_graph_nodes.csv"
        edges_path = OUTPUT_DIR / "ctgov_graph_edges.csv"
        prov_path = OUTPUT_DIR / "ctgov_graph_provenance.csv"

        graph_nodes_df.to_csv(nodes_path, index=False)
        graph_edges_df.to_csv(edges_path, index=False)
        graph_prov_df.to_csv(prov_path, index=False)

        print(f"  Graph nodes:       {nodes_path} ({len(graph_nodes_df)} rows)")
        print(f"  Graph edges:       {edges_path} ({len(graph_edges_df)} rows)")
        print(f"  Graph provenance:  {prov_path} ({len(graph_prov_df)} rows)")

    print(f"\nCompleted at: {datetime.now().isoformat()}")
    print("=" * 70)


if __name__ == "__main__":
    run_scraper()
