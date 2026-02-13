"""
Patient CSV importer — preview, import, and template generation.
"""

import csv
import io
import uuid
from datetime import datetime, date


# Column alias mapping: target field → list of recognized CSV header names
COLUMN_ALIASES = {
    "patient_id": ["patient_id", "subject_id", "id", "subject", "participant_id", "patientid", "subjectid"],
    "name":       ["name", "patient_name", "subject_name", "full_name", "participant_name"],
    "age":        ["age", "patient_age"],
    "sex":        ["sex", "gender"],
    "trial_id":   ["trial_id", "trial", "study", "protocol", "study_id", "nct", "trialid"],
    "enrollment_date": ["enrollment_date", "enrolled", "start_date", "enrollment", "consent_date"],
    "status":     ["status", "patient_status"],
    "phone":      ["phone", "phone_number", "contact", "telephone"],
    "email":      ["email", "email_address"],
}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%d-%b-%Y",
    "%d-%B-%Y",
    "%m-%d-%Y",
    "%d/%m/%Y",
]


def _parse_date(date_str: str) -> date | None:
    """Try multiple date formats. Returns date object or None."""
    if not date_str or not date_str.strip():
        return None
    cleaned = date_str.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def _clean_csv(content: str) -> str:
    """Strip BOM, excess whitespace, empty lines."""
    # Remove BOM
    if content.startswith("\ufeff"):
        content = content[1:]
    # Remove carriage returns for consistency
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    # Filter empty lines but keep content
    lines = [line for line in content.split("\n") if line.strip()]
    return "\n".join(lines)


def _detect_delimiter(content: str) -> str:
    """Detect CSV delimiter using csv.Sniffer, fallback to comma."""
    try:
        sample = content[:4096]
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
        return dialect.delimiter
    except csv.Error:
        return ","


class PatientImporter:
    def __init__(self, pool, repos: dict, embeddings=None):
        self.pool = pool
        self.repos = repos
        self.embeddings = embeddings

    def preview_csv(self, csv_content: str) -> dict:
        """Parse CSV and auto-detect column mappings. No DB writes."""
        cleaned = _clean_csv(csv_content)
        if not cleaned:
            raise ValueError("CSV contains no data")

        delimiter = _detect_delimiter(cleaned)
        reader = csv.DictReader(io.StringIO(cleaned), delimiter=delimiter)

        if not reader.fieldnames:
            raise ValueError("CSV contains no headers")

        # Normalize original headers
        raw_headers = [h.strip() for h in reader.fieldnames]
        normalized = [h.lower().replace(" ", "_") for h in raw_headers]

        # Auto-detect mappings
        detected_columns = {}  # target_field → original CSV header
        matched_normalized = set()

        for target, aliases in COLUMN_ALIASES.items():
            for i, norm in enumerate(normalized):
                if norm in aliases and norm not in matched_normalized:
                    detected_columns[target] = raw_headers[i]
                    matched_normalized.add(norm)
                    break

        # Unmapped columns
        unmapped = [raw_headers[i] for i, norm in enumerate(normalized)
                    if norm not in matched_normalized]

        # Read all rows for count, preview first 10
        all_rows = []
        for row in reader:
            # Remap keys to original (stripped) headers
            cleaned_row = {}
            for key, val in row.items():
                cleaned_key = key.strip() if key else key
                cleaned_row[cleaned_key] = val.strip() if val else ""
            all_rows.append(cleaned_row)

        # Build preview with target field names
        reverse_map = {v: k for k, v in detected_columns.items()}
        preview_rows = []
        for row in all_rows[:10]:
            mapped_row = {}
            for orig_header, value in row.items():
                target = reverse_map.get(orig_header, orig_header)
                mapped_row[target] = value
            preview_rows.append(mapped_row)

        # Warnings
        warnings = []
        if "name" not in detected_columns:
            warnings.append("No 'name' column detected — required for import")
        if "trial_id" not in detected_columns:
            warnings.append("No 'trial_id' column detected — will need manual mapping or default")

        return {
            "detected_columns": detected_columns,
            "unmapped_columns": unmapped,
            "preview_rows": preview_rows,
            "total_rows": len(all_rows),
            "warnings": warnings,
        }

    async def import_csv(self, csv_content: str, column_mapping: dict,
                         site_id: str) -> dict:
        """
        Validate and import patients from CSV.

        Args:
            csv_content: Raw CSV text
            column_mapping: {target_field: csv_header} e.g. {"patient_id": "Subject ID"}
            site_id: From JWT — enforces multi-site isolation
        """
        # --- Setup ---
        site = await self.repos["sites"].get_site(site_id)
        if not site:
            raise ValueError(f"Site '{site_id}' not found")
        organization_id = site["organization_id"]

        site_trials = await self.repos["sites"].get_trials_for_site(site_id)
        valid_trial_ids = {t["trial_id"] for t in site_trials}
        default_trial_id = site_trials[0]["trial_id"] if site_trials else None

        # Existing patient IDs at this site (for duplicate detection)
        existing_rows = await self.pool.fetch(
            "SELECT patient_id FROM patients WHERE site_id = $1", site_id
        )
        existing_ids = {r["patient_id"] for r in existing_rows}

        # Site code for auto-generated IDs
        site_code = site_id.split("_")[-1][:3].upper()

        # --- Parse CSV ---
        cleaned = _clean_csv(csv_content)
        delimiter = _detect_delimiter(cleaned)
        reader = csv.DictReader(io.StringIO(cleaned), delimiter=delimiter)

        # Build reverse mapping: csv_header → target_field
        header_to_target = {v: k for k, v in column_mapping.items()}

        errors = []
        warnings = []
        valid_patients = []
        batch_ids = set()  # Track IDs within this import batch
        skipped = 0

        for row_idx, raw_row in enumerate(reader, start=2):
            # Map CSV headers to target fields
            row = {}
            for csv_header, value in raw_row.items():
                csv_header_stripped = csv_header.strip() if csv_header else ""
                target = header_to_target.get(csv_header_stripped, csv_header_stripped)
                row[target] = value.strip() if value else ""

            # --- Validate patient_id ---
            patient_id = row.get("patient_id", "").strip()
            if not patient_id:
                patient_id = f"PT-{site_code}-IMP-{uuid.uuid4().hex[:4].upper()}"
                warnings.append({"row": row_idx, "message": f"Auto-generated patient_id: {patient_id}"})

            if patient_id in existing_ids:
                errors.append({"row": row_idx, "message": f"Duplicate: patient_id '{patient_id}' already exists at this site"})
                skipped += 1
                continue

            if patient_id in batch_ids:
                errors.append({"row": row_idx, "message": f"Duplicate within CSV: patient_id '{patient_id}'"})
                skipped += 1
                continue

            # --- Validate name (required) ---
            name = row.get("name", "").strip()
            if not name:
                errors.append({"row": row_idx, "message": "Missing required field 'name'"})
                continue

            # --- Validate age ---
            age_raw = row.get("age", "").strip()
            if age_raw:
                try:
                    age = int(float(age_raw))
                except ValueError:
                    errors.append({"row": row_idx, "message": f"Invalid age '{age_raw}' (must be a number)"})
                    continue
            else:
                age = 50

            # --- Validate sex ---
            sex_raw = row.get("sex", "").strip().lower()
            if sex_raw in ("m", "male"):
                sex = "Male"
            elif sex_raw in ("f", "female"):
                sex = "Female"
            else:
                sex = "Unknown"

            # --- Validate trial_id ---
            trial_id = row.get("trial_id", "").strip()
            if trial_id and trial_id not in valid_trial_ids:
                warnings.append({"row": row_idx, "message": f"Trial '{trial_id}' not enrolled at this site"})
            if not trial_id:
                trial_id = default_trial_id
                if not trial_id:
                    errors.append({"row": row_idx, "message": "No trial_id provided and no trials enrolled at site"})
                    continue

            # --- Validate enrollment_date ---
            enrollment_date = _parse_date(row.get("enrollment_date", ""))
            if not enrollment_date:
                enrollment_date = date.today()

            # --- Validate status ---
            status = row.get("status", "").strip().lower()
            if status not in ("active", "at_risk", "withdrawn", "screen_failed"):
                status = "active"

            # --- Phone (optional) ---
            phone = row.get("phone", "").strip() or None

            # --- Build patient dict ---
            patient = {
                "patient_id": patient_id,
                "site_id": site_id,
                "organization_id": organization_id,
                "name": name,
                "age": age,
                "sex": sex,
                "trial_id": trial_id,
                "status": status,
                "enrollment_date": enrollment_date,
                "weeks_enrolled": 0,
                "dropout_risk_score": 0.5,
                "risk_factors": [],
                "recommended_actions": [],
                "next_visit_date": None,
                "visits_completed": 0,
                "visits_missed": 0,
                "last_contact_date": enrollment_date,
                "phone": phone,
                "primary_crc_id": None,
            }

            valid_patients.append(patient)
            batch_ids.add(patient_id)

        # --- Bulk insert patients ---
        inserted_ids = await self.repos["patients"].bulk_insert_patients(valid_patients)
        inserted_set = set(inserted_ids)

        # Track patients that passed validation but failed DB insert (e.g., FK violation)
        for p in valid_patients:
            if p["patient_id"] not in inserted_set:
                warnings.append({
                    "row": "N/A",
                    "message": f"Patient '{p['patient_id']}' passed validation but failed DB insert (check trial_id FK)",
                })

        # --- Create enrollment events (only for successfully inserted patients) ---
        events = [
            {
                "id": f"event_{uuid.uuid4().hex[:8]}",
                "patient_id": pid,
                "type": "enrollment",
                "date": next(p["enrollment_date"] for p in valid_patients if p["patient_id"] == pid),
                "note": "Patient enrolled via CSV import.",
            }
            for pid in inserted_ids
        ]
        await self.repos["patients"].bulk_insert_events(events)

        return {
            "success_count": len(inserted_ids),
            "skipped_count": skipped,
            "error_count": len(errors),
            "errors": errors,
            "warnings": warnings,
            "imported_patient_ids": inserted_ids,
        }

    @staticmethod
    def get_csv_template() -> str:
        """Return CSV template with headers and 3 example rows."""
        output = io.StringIO()
        headers = ["patient_id", "name", "age", "sex", "trial_id",
                    "enrollment_date", "status", "phone"]
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        writer.writerows([
            {
                "patient_id": "PT-001",
                "name": "Jane Smith",
                "age": "45",
                "sex": "Female",
                "trial_id": "NCT05891234",
                "enrollment_date": "2024-01-15",
                "status": "active",
                "phone": "(555) 123-4567",
            },
            {
                "patient_id": "PT-002",
                "name": "Robert Johnson",
                "age": "62",
                "sex": "Male",
                "trial_id": "NCT06234567",
                "enrollment_date": "2024-02-03",
                "status": "active",
                "phone": "(555) 987-6543",
            },
            {
                "patient_id": "PT-003",
                "name": "Maria Garcia",
                "age": "38",
                "sex": "Female",
                "trial_id": "NCT06789012",
                "enrollment_date": "2024-03-10",
                "status": "active",
                "phone": "(555) 456-7890",
            },
        ])
        return output.getvalue()
