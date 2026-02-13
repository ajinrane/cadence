-- Cadence Database Schema
-- Neon Postgres with pgvector for RAG-enabled search

CREATE EXTENSION IF NOT EXISTS vector;

-- ===== REFERENCE TABLES =====

CREATE TABLE IF NOT EXISTS organizations (
    organization_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'clinical_site',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
    site_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(organization_id),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    pi_name TEXT NOT NULL,
    crc_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sites_org ON sites(organization_id);

CREATE TABLE IF NOT EXISTS trials (
    trial_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phase TEXT NOT NULL,
    condition TEXT NOT NULL,
    sponsor TEXT NOT NULL,
    expected_duration_weeks INTEGER DEFAULT 52,
    visit_schedule TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_trial_enrollments (
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    trial_id TEXT NOT NULL REFERENCES trials(trial_id),
    enrolled INTEGER DEFAULT 0,
    pi TEXT DEFAULT '',
    PRIMARY KEY (site_id, trial_id)
);

-- ===== STAFF (before patients for FK) =====

CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'crc',
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    active BOOLEAN DEFAULT TRUE,
    specialties JSONB DEFAULT '[]'::jsonb,
    max_patient_load INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_site ON staff(site_id);

-- ===== PATIENTS =====

CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    organization_id TEXT NOT NULL REFERENCES organizations(organization_id),
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL,
    trial_id TEXT NOT NULL REFERENCES trials(trial_id),
    status TEXT NOT NULL DEFAULT 'active',
    enrollment_date DATE NOT NULL,
    weeks_enrolled INTEGER DEFAULT 0,
    dropout_risk_score REAL DEFAULT 0.0,
    risk_factors JSONB DEFAULT '[]'::jsonb,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    next_visit_date DATE,
    visits_completed INTEGER DEFAULT 0,
    visits_missed INTEGER DEFAULT 0,
    last_contact_date DATE,
    phone TEXT,
    primary_crc_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patients_site ON patients(site_id);
CREATE INDEX IF NOT EXISTS idx_patients_trial ON patients(trial_id);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_risk ON patients(dropout_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_patients_crc ON patients(primary_crc_id);
CREATE INDEX IF NOT EXISTS idx_patients_next_visit ON patients(next_visit_date);

-- ===== PATIENT EVENTS (normalized from patient.events array) =====

CREATE TABLE IF NOT EXISTS patient_events (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    date DATE NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_patient ON patient_events(patient_id);

-- ===== PATIENT NOTES =====

CREATE TABLE IF NOT EXISTS patient_notes (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    author TEXT DEFAULT 'CRC',
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    category TEXT DEFAULT 'general',
    embedding vector(1536)
);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_site ON patient_notes(site_id);

-- ===== INTERVENTIONS =====

CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    trial_id TEXT NOT NULL REFERENCES trials(trial_id),
    type TEXT NOT NULL,
    date DATE NOT NULL,
    outcome TEXT DEFAULT 'pending',
    notes TEXT DEFAULT '',
    triggered_by TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interventions_patient ON interventions(patient_id);
CREATE INDEX IF NOT EXISTS idx_interventions_site ON interventions(site_id);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON interventions(date DESC);

-- ===== DATA QUERIES =====

CREATE TABLE IF NOT EXISTS data_queries (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(patient_id),
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    trial_id TEXT NOT NULL REFERENCES trials(trial_id),
    field TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    opened_date DATE NOT NULL,
    resolved_date DATE,
    assigned_to TEXT DEFAULT 'CRC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queries_site ON data_queries(site_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON data_queries(status);

-- ===== MONITORING VISITS =====

CREATE TABLE IF NOT EXISTS monitoring_visits (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    monitor_name TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    status TEXT DEFAULT 'upcoming',
    checklist JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monitoring_site ON monitoring_visits(site_id);

-- ===== TASKS =====

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    patient_id TEXT REFERENCES patients(patient_id),
    trial_id TEXT REFERENCES trials(trial_id),
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    due_date DATE NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pending',
    category TEXT DEFAULT 'documentation',
    created_by TEXT DEFAULT 'system',
    assigned_to TEXT REFERENCES staff(id) ON DELETE SET NULL,
    completed_date DATE,
    snoozed_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_site ON tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_patient ON tasks(patient_id);

-- ===== PROTOCOLS =====

CREATE TABLE IF NOT EXISTS protocols (
    id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL REFERENCES trials(trial_id),
    site_id TEXT REFERENCES sites(site_id),
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    upload_date DATE NOT NULL,
    uploaded_by TEXT DEFAULT 'CRC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_protocols_trial ON protocols(trial_id);

CREATE TABLE IF NOT EXISTS protocol_chunks (
    id TEXT PRIMARY KEY,
    protocol_id TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    header TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_protocol ON protocol_chunks(protocol_id);

-- ===== KNOWLEDGE ENTRIES (all 3 tiers in one table) =====

CREATE TABLE IF NOT EXISTS knowledge_entries (
    id TEXT PRIMARY KEY,
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
    site_id TEXT REFERENCES sites(site_id),
    category TEXT NOT NULL,
    subcategory TEXT,
    content TEXT NOT NULL,
    source TEXT,
    author TEXT,
    created_at DATE,
    trial_id TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    therapeutic_area TEXT,
    effectiveness_score REAL,
    sites_involved JSONB,
    evidence_count INTEGER,
    confidence REAL,
    generated_at DATE,
    status TEXT DEFAULT 'active',
    last_validated_at DATE,
    reference_count INTEGER DEFAULT 0,
    last_referenced_at DATE,
    embedding vector(1536),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_tier ON knowledge_entries(tier);
CREATE INDEX IF NOT EXISTS idx_knowledge_site ON knowledge_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_entries(status);

-- ===== KNOWLEDGE SUGGESTIONS =====

CREATE TABLE IF NOT EXISTS knowledge_suggestions (
    id TEXT PRIMARY KEY,
    tier INTEGER DEFAULT 2,
    status TEXT DEFAULT 'draft',
    site_id TEXT NOT NULL REFERENCES sites(site_id),
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'cadence_analysis',
    source_detail TEXT DEFAULT '',
    ui_note TEXT DEFAULT '',
    author TEXT DEFAULT 'Cadence AI',
    created_at DATE,
    trial_id TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    effectiveness_score REAL,
    evidence_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    approved_at DATE,
    dismissed_at DATE,
    embedding vector(1536)
);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON knowledge_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_site ON knowledge_suggestions(site_id);

-- ===== USERS =====

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'crc',
    site_id TEXT REFERENCES sites(site_id),
    organization_id TEXT REFERENCES organizations(organization_id),
    active BOOLEAN DEFAULT TRUE,
    password_hash TEXT NOT NULL,
    first_login BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    onboarded_tabs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===== SEED TRACKING =====

CREATE TABLE IF NOT EXISTS _seed_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    seeded_at TIMESTAMPTZ,
    seed_version TEXT,
    CHECK (id = 1)
);
