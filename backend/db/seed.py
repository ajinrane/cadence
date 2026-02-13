"""
Seed Postgres from existing in-memory data sources.
Imports constants from data/seed.py, knowledge modules, staff, auth.
Generates embeddings where possible (graceful fallback if API unavailable).
"""

import random
import uuid
import asyncio
import logging
from datetime import datetime, timedelta

import asyncpg

# Existing seed data imports
from data.seed import (
    ORGANIZATIONS, SITES, TRIALS, SITE_TRIAL_ENROLLMENTS,
    PROTOCOL_SNIPPETS, generate_patient,
    _generate_interventions, _generate_data_queries, _generate_monitoring_visits,
)
from knowledge.base_knowledge import BASE_KNOWLEDGE
from knowledge.site_knowledge import SITE_KNOWLEDGE_SEED
from knowledge.cross_site import CROSS_SITE_INSIGHTS
from agent.actions.staff import STAFF_SEED
from auth import hash_password

logger = logging.getLogger("cadence.seed")


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _embed_texts(embeddings, texts: list[str]) -> list[str | None]:
    """Embed texts and return pgvector strings. Returns None per item on failure."""
    if not embeddings or not texts:
        return [None] * len(texts)
    try:
        vectors = await embeddings.embed_batch(texts)
        return [embeddings.to_pgvector(v) for v in vectors]
    except Exception as e:
        logger.warning(f"Embedding failed ({e}). Seeding without vectors.")
        return [None] * len(texts)


async def seed_database(pool: asyncpg.Pool, embeddings=None):
    """Full seed: orgs → sites → trials → enrollments → staff → patients →
    events → interventions → queries → monitoring → protocols → chunks →
    knowledge (T1/T2/T3) → suggestions → users.
    """
    logger.info("Starting database seed...")

    # Use deterministic random seed (same data as PatientDatabase)
    random.seed(42)

    async with pool.acquire() as conn:
        # ── 1. Organizations ─────────────────────────────────────────
        for org in ORGANIZATIONS:
            await conn.execute(
                "INSERT INTO organizations (organization_id, name, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                org["organization_id"], org["name"], org["type"],
            )
        logger.info(f"  Organizations: {len(ORGANIZATIONS)}")

        # ── 2. Sites ─────────────────────────────────────────────────
        for site in SITES:
            await conn.execute(
                "INSERT INTO sites (site_id, organization_id, name, location, pi_name, crc_count) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
                site["site_id"], site["organization_id"], site["name"],
                site["location"], site["pi_name"], site["crc_count"],
            )
        logger.info(f"  Sites: {len(SITES)}")

        # ── 3. Trials ────────────────────────────────────────────────
        for trial in TRIALS:
            await conn.execute(
                "INSERT INTO trials (trial_id, name, phase, condition, sponsor, expected_duration_weeks, visit_schedule) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING",
                trial["trial_id"], trial["name"], trial["phase"],
                trial["condition"], trial["sponsor"],
                trial["expected_duration_weeks"], trial["visit_schedule"],
            )
        logger.info(f"  Trials: {len(TRIALS)}")

        # ── 4. Site-Trial Enrollments ────────────────────────────────
        for e in SITE_TRIAL_ENROLLMENTS:
            await conn.execute(
                "INSERT INTO site_trial_enrollments (site_id, trial_id, enrolled, pi) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                e["site_id"], e["trial_id"], e["enrolled"], e.get("pi", ""),
            )
        logger.info(f"  Enrollments: {len(SITE_TRIAL_ENROLLMENTS)}")

        # ── 5. Staff ─────────────────────────────────────────────────
        for s in STAFF_SEED:
            await conn.execute(
                "INSERT INTO staff (id, name, email, role, site_id, active, specialties, max_patient_load) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING",
                s["id"], s["name"], s["email"], s["role"], s["site_id"],
                s["active"], s["specialties"], s["max_patient_load"],
            )
        logger.info(f"  Staff: {len(STAFF_SEED)}")

        # ── 6. Patients + Events ─────────────────────────────────────
        trial_map = {t["trial_id"]: t for t in TRIALS}
        site_map = {s["site_id"]: s for s in SITES}
        all_patients = []
        all_events = []

        for enrollment in SITE_TRIAL_ENROLLMENTS:
            trial = trial_map[enrollment["trial_id"]]
            site = site_map[enrollment["site_id"]]
            for i in range(1, enrollment["enrolled"] + 1):
                patient = generate_patient(trial, site, i)
                all_patients.append(patient)
                for event in patient["events"]:
                    all_events.append({
                        "id": f"evt_{_uid()}",
                        "patient_id": patient["patient_id"],
                        **event,
                    })

        # Insert patients
        for p in all_patients:
            await conn.execute(
                """INSERT INTO patients (patient_id, site_id, organization_id, name, age, sex,
                   trial_id, status, enrollment_date, weeks_enrolled, dropout_risk_score,
                   risk_factors, recommended_actions, next_visit_date, visits_completed,
                   visits_missed, last_contact_date, phone)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                   ON CONFLICT DO NOTHING""",
                p["patient_id"], p["site_id"], p["organization_id"], p["name"],
                p["age"], p["sex"], p["trial_id"], p["status"],
                datetime.strptime(p["enrollment_date"], "%Y-%m-%d").date(),
                p["weeks_enrolled"], p["dropout_risk_score"],
                p["risk_factors"], p["recommended_actions"],
                datetime.strptime(p["next_visit_date"], "%Y-%m-%d").date() if p["next_visit_date"] else None,
                p["visits_completed"], p["visits_missed"],
                datetime.strptime(p["last_contact_date"], "%Y-%m-%d").date() if p["last_contact_date"] else None,
                p["phone"],
            )
        logger.info(f"  Patients: {len(all_patients)}")

        # Insert events
        for e in all_events:
            await conn.execute(
                "INSERT INTO patient_events (id, patient_id, type, date, note) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
                e["id"], e["patient_id"], e["type"],
                datetime.strptime(e["date"], "%Y-%m-%d").date(), e["note"],
            )
        logger.info(f"  Patient events: {len(all_events)}")

        # ── 7. Interventions ─────────────────────────────────────────
        all_interventions = []
        for patient in all_patients:
            interventions = _generate_interventions(patient)
            all_interventions.extend(interventions)

        for intv in all_interventions:
            await conn.execute(
                """INSERT INTO interventions (id, patient_id, site_id, trial_id, type, date, outcome, notes, triggered_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING""",
                intv["id"], intv["patient_id"], intv["site_id"], intv["trial_id"],
                intv["type"], datetime.strptime(intv["date"], "%Y-%m-%d").date(),
                intv["outcome"], intv["notes"], intv["triggered_by"],
            )
        logger.info(f"  Interventions: {len(all_interventions)}")

        # ── 8. Data Queries ──────────────────────────────────────────
        all_queries = _generate_data_queries(all_patients)
        for q in all_queries:
            await conn.execute(
                """INSERT INTO data_queries (id, patient_id, site_id, trial_id, field, description, status, opened_date, resolved_date, assigned_to)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING""",
                q["id"], q["patient_id"], q["site_id"], q["trial_id"],
                q["field"], q["description"], q["status"],
                datetime.strptime(q["opened_date"], "%Y-%m-%d").date(),
                datetime.strptime(q["resolved_date"], "%Y-%m-%d").date() if q.get("resolved_date") else None,
                q["assigned_to"],
            )
        logger.info(f"  Data queries: {len(all_queries)}")

        # ── 9. Monitoring Visits ─────────────────────────────────────
        all_visits = _generate_monitoring_visits(SITES)
        for v in all_visits:
            await conn.execute(
                """INSERT INTO monitoring_visits (id, site_id, monitor_name, scheduled_date, status, checklist)
                   VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING""",
                v["id"], v["site_id"], v["monitor_name"],
                datetime.strptime(v["scheduled_date"], "%Y-%m-%d").date(),
                v["status"], v["checklist"],
            )
        logger.info(f"  Monitoring visits: {len(all_visits)}")

        # ── 10. Protocols + Chunks ───────────────────────────────────
        protocol_chunks_flat = []
        for proto in PROTOCOL_SNIPPETS:
            proto_id = f"proto_{_uid()}"
            upload_date = (datetime.now() - timedelta(days=random.randint(10, 90))).strftime("%Y-%m-%d")

            await conn.execute(
                """INSERT INTO protocols (id, trial_id, site_id, name, version, upload_date, uploaded_by)
                   VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING""",
                proto_id, proto["trial_id"], proto.get("site_id"),
                proto["name"], proto["version"],
                datetime.strptime(upload_date, "%Y-%m-%d").date(),
                "System (seed data)",
            )

            # Chunk the protocol content
            chunks = _chunk_protocol(proto["content"])
            for chunk in chunks:
                chunk_id = f"chunk_{_uid()}"
                protocol_chunks_flat.append({
                    "id": chunk_id,
                    "protocol_id": proto_id,
                    "header": chunk["header"],
                    "content": chunk["content"],
                })

        # Embed protocol chunks
        chunk_texts = [f"{c['header']}\n{c['content']}" for c in protocol_chunks_flat]
        chunk_embeddings = await _embed_texts(embeddings, chunk_texts)

        for i, chunk in enumerate(protocol_chunks_flat):
            await conn.execute(
                """INSERT INTO protocol_chunks (id, protocol_id, header, content, embedding)
                   VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING""",
                chunk["id"], chunk["protocol_id"], chunk["header"], chunk["content"],
                chunk_embeddings[i],
            )
        logger.info(f"  Protocols: {len(PROTOCOL_SNIPPETS)}, Chunks: {len(protocol_chunks_flat)}")

        # ── 11. Knowledge Tier 1 (Base) ──────────────────────────────
        t1_texts = [e["content"] for e in BASE_KNOWLEDGE]
        t1_embeddings = await _embed_texts(embeddings, t1_texts)

        for i, entry in enumerate(BASE_KNOWLEDGE):
            await conn.execute(
                """INSERT INTO knowledge_entries (id, tier, site_id, category, subcategory, content,
                   source, author, created_at, trial_id, tags, therapeutic_area,
                   effectiveness_score, status, embedding)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING""",
                entry["id"], entry["tier"], None,
                entry["category"], entry.get("subcategory"),
                entry["content"], None, None, None, None,
                entry.get("tags", []), entry.get("therapeutic_area"),
                None, "active", t1_embeddings[i],
            )
        logger.info(f"  Tier 1 knowledge: {len(BASE_KNOWLEDGE)}")

        # ── 12. Knowledge Tier 2 (Site) ──────────────────────────────
        t2_texts = [e["content"] for e in SITE_KNOWLEDGE_SEED]
        t2_embeddings = await _embed_texts(embeddings, t2_texts)

        for i, entry in enumerate(SITE_KNOWLEDGE_SEED):
            created_at = None
            if entry.get("created_at"):
                created_at = datetime.strptime(entry["created_at"], "%Y-%m-%d").date()

            await conn.execute(
                """INSERT INTO knowledge_entries (id, tier, site_id, category, subcategory, content,
                   source, author, created_at, trial_id, tags, therapeutic_area,
                   effectiveness_score, status, last_validated_at, embedding)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING""",
                entry["id"], entry["tier"], entry["site_id"],
                entry["category"], None,
                entry["content"], entry.get("source"), entry.get("author"),
                created_at, entry.get("trial_id"),
                entry.get("tags", []), None,
                entry.get("effectiveness_score"), "active",
                created_at,  # last_validated_at = created_at for seed data
                t2_embeddings[i],
            )
        logger.info(f"  Tier 2 knowledge: {len(SITE_KNOWLEDGE_SEED)}")

        # ── 13. Knowledge Tier 3 (Cross-Site) ────────────────────────
        t3_texts = [e["content"] for e in CROSS_SITE_INSIGHTS]
        t3_embeddings = await _embed_texts(embeddings, t3_texts)

        for i, entry in enumerate(CROSS_SITE_INSIGHTS):
            generated_at = None
            if entry.get("generated_at"):
                generated_at = datetime.strptime(entry["generated_at"], "%Y-%m-%d").date()

            await conn.execute(
                """INSERT INTO knowledge_entries (id, tier, site_id, category, subcategory, content,
                   source, author, created_at, trial_id, tags, therapeutic_area,
                   effectiveness_score, sites_involved, evidence_count, confidence,
                   generated_at, status, embedding)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) ON CONFLICT DO NOTHING""",
                entry["id"], entry["tier"], None,
                entry["category"], None,
                entry["content"], None, None,
                generated_at, None,
                [], entry.get("therapeutic_area"),
                None, entry.get("sites_involved"),
                entry.get("evidence_count"), entry.get("confidence"),
                generated_at, "active",
                t3_embeddings[i],
            )
        logger.info(f"  Tier 3 knowledge: {len(CROSS_SITE_INSIGHTS)}")

        # ── 14. Knowledge Suggestions ────────────────────────────────
        suggestions = _build_suggestions()
        sugg_texts = [s["content"] for s in suggestions]
        sugg_embeddings = await _embed_texts(embeddings, sugg_texts)

        for i, s in enumerate(suggestions):
            await conn.execute(
                """INSERT INTO knowledge_suggestions (id, tier, status, site_id, category, content,
                   source, source_detail, ui_note, author, created_at, trial_id, tags,
                   evidence_count, confidence, embedding)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING""",
                s["id"], s["tier"], s["status"], s["site_id"],
                s["category"], s["content"],
                s["source"], s["source_detail"], s["ui_note"],
                s["author"], datetime.now().date(),
                s.get("trial_id"), s.get("tags", []),
                s.get("evidence_count", 0), s.get("confidence", 0.0),
                sugg_embeddings[i],
            )
        logger.info(f"  Knowledge suggestions: {len(suggestions)}")

        # ── 15. Users ────────────────────────────────────────────────
        seed_users = [
            {
                "id": "user_admin", "email": "admin@cadence.health",
                "name": "Admin", "role": "admin",
                "site_id": None, "organization_id": None,
                "password": "cadence123", "first_login": False,
            },
            {
                "id": "user_crc_columbia", "email": "crc@columbia.edu",
                "name": "CRC Columbia", "role": "crc",
                "site_id": "site_columbia", "organization_id": "org_columbia",
                "password": "cadence123", "first_login": False,
            },
            {
                "id": "user_crc_va", "email": "crc@va.gov",
                "name": "CRC VA", "role": "crc",
                "site_id": "site_va_lb", "organization_id": "org_va_lb",
                "password": "cadence123", "first_login": False,
            },
            {
                "id": "user_crc_sinai", "email": "crc@sinai.edu",
                "name": "CRC Sinai", "role": "crc",
                "site_id": "site_sinai", "organization_id": "org_sinai",
                "password": "cadence123", "first_login": False,
            },
        ]

        for u in seed_users:
            await conn.execute(
                """INSERT INTO users (id, email, name, role, site_id, organization_id, active, password_hash, first_login, preferences, onboarded_tabs)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING""",
                u["id"], u["email"], u["name"], u["role"],
                u.get("site_id"), u.get("organization_id"),
                True, hash_password(u["password"]),
                u.get("first_login", True), {}, [],
            )
        logger.info(f"  Users: {len(seed_users)}")

    # Reset random seed
    random.seed()

    # Mark as seeded
    from db.connection import mark_seeded
    await mark_seeded("1.0")
    logger.info("Seed complete!")


def _chunk_protocol(content: str) -> list[dict]:
    """Split protocol text into searchable chunks by section headers."""
    lines = content.strip().split("\n")
    chunks = []
    current_header = "Overview"
    current_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped and stripped[0].isdigit() and ". " in stripped[:5]:
            if current_lines:
                chunks.append({
                    "header": current_header,
                    "content": "\n".join(current_lines).strip(),
                })
            current_header = stripped
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        chunks.append({
            "header": current_header,
            "content": "\n".join(current_lines).strip(),
        })

    return chunks


def _build_suggestions() -> list[dict]:
    """Build the 6 seed suggestions (same as PatternDetector._seed_suggestions)."""
    seed = [
        {
            "site_id": "site_columbia", "category": "intervention_pattern",
            "content": "Caregiver outreach for BEACON-AD patients at Columbia has a 90% positive outcome rate when initiated within 24 hours of a missed visit. This is significantly higher than the 55% rate for outreach after 48+ hours. Consider making same-day caregiver outreach the default protocol for Alzheimer's missed visits.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — intervention outcome analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["caregiver", "alzheimers", "missed_visit", "timing"],
            "trial_id": "NCT06234567", "evidence_count": 12, "confidence": 0.82,
        },
        {
            "site_id": "site_columbia", "category": "retention_strategy",
            "content": "Columbia patients who receive both an SMS reminder AND a phone call before fasting visits have a 95% attendance rate, compared to 78% for SMS only and 70% for phone only. The combination works significantly better than either channel alone.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — reminder effectiveness analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["sms", "phone", "fasting", "dual_channel", "reminder"],
            "trial_id": None, "evidence_count": 34, "confidence": 0.88,
        },
        {
            "site_id": "site_va_lb", "category": "intervention_pattern",
            "content": "VA patients who attend the monthly 'research participant coffee hour' and then miss a visit respond to re-engagement calls at a 92% rate, compared to 58% for non-attendees. The social connection creates a stronger bond with the site that aids retention.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — social engagement vs retention analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["peer_support", "community", "retention", "re_engagement"],
            "trial_id": None, "evidence_count": 18, "confidence": 0.79,
        },
        {
            "site_id": "site_va_lb", "category": "workflow",
            "content": "VA patients scheduled before 9:00 AM have 15% fewer protocol deviations related to fasting violations. After 9 AM, many patients inadvertently break their fast due to medication routines. Morning scheduling should be prioritized for all fasting visits.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — deviation analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["fasting", "scheduling", "morning", "deviation"],
            "trial_id": None, "evidence_count": 22, "confidence": 0.85,
        },
        {
            "site_id": "site_sinai", "category": "retention_strategy",
            "content": "Sinai patients who receive the GLP-1 nausea management kit at enrollment AND a Day 3 nurse call have a combined dropout rate of only 3% during titration, compared to 12% for kit-only and 18% for neither. Both interventions together create the strongest safety net.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — titration dropout analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["glp1", "nausea", "titration", "combined_intervention"],
            "trial_id": "NCT06789012", "evidence_count": 28, "confidence": 0.91,
        },
        {
            "site_id": "site_sinai", "category": "intervention_pattern",
            "content": "At Mount Sinai, schedule accommodation (offering evening/weekend slots) combined with interpreter pre-booking results in 0% no-show rate for non-English-speaking patients. Without both accommodations, the no-show rate is 22%.",
            "source": "seed_data",
            "source_detail": "Cadence pattern detection — access barrier analysis",
            "ui_note": "This is an example insight. Real pattern detection activates as your team logs more interventions.",
            "tags": ["schedule_accommodation", "interpreter", "language", "access"],
            "trial_id": None, "evidence_count": 15, "confidence": 0.84,
        },
    ]

    suggestions = []
    for i, s in enumerate(seed):
        suggestions.append({
            "id": f"suggest_{i+1:03d}",
            "tier": 2,
            "status": "draft",
            "author": "Cadence AI",
            **s,
        })

    return suggestions
