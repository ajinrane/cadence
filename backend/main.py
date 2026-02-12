"""
Cadence API
FastAPI application serving the agent and patient data endpoints.
Multi-site: all endpoints accept optional site_id filter.
"""

import os
import random
import uuid
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import auth

from agent.llm import get_llm, usage_tracker
from agent.executor import AgentExecutor
from agent.actions.database import DatabaseActionProvider
from agent.actions.tasks import TaskManager
from agent.actions.monitoring import MonitoringPrepManager
from agent.actions.handoff import HandoffGenerator
from agent.actions.staff import StaffManager
from agent.patient_resolver import PatientResolver
from agent.protocols import ProtocolManager
from knowledge import KnowledgeManager
from data.seed import PatientDatabase

# -- App state ----------------------------------------------------------------

db: PatientDatabase | None = None
agent: AgentExecutor | None = None
task_manager: TaskManager | None = None
protocol_manager: ProtocolManager | None = None
monitoring_manager: MonitoringPrepManager | None = None
handoff_generator: HandoffGenerator | None = None
knowledge_manager: KnowledgeManager | None = None
staff_manager: StaffManager | None = None
patient_resolver: PatientResolver | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and agent on startup."""
    global db, agent, task_manager, protocol_manager, monitoring_manager, handoff_generator, knowledge_manager, staff_manager, patient_resolver

    db = PatientDatabase(seed=42)
    auth.init_users()

    # Initialize managers
    task_manager = TaskManager(db)
    protocol_manager = ProtocolManager(db)
    monitoring_manager = MonitoringPrepManager(db)
    knowledge_manager = KnowledgeManager(db)
    staff_manager = StaffManager(db, task_manager)
    handoff_generator = HandoffGenerator(db, task_manager, protocol_manager, monitoring_manager, staff_manager)
    patient_resolver = PatientResolver(db)

    # Initialize LLM + agent
    llm = get_llm()
    action_provider = DatabaseActionProvider(
        db,
        task_manager=task_manager,
        protocol_manager=protocol_manager,
        monitoring_manager=monitoring_manager,
        handoff_generator=handoff_generator,
        knowledge_manager=knowledge_manager,
        staff_manager=staff_manager,
        patient_resolver=patient_resolver,
    )
    agent = AgentExecutor(llm, action_provider)

    kg_stats = knowledge_manager.get_stats()
    print(f"[OK] Cadence API started")
    print(f"   LLM: {os.environ.get('LLM_PROVIDER', 'claude')} / {os.environ.get('LLM_MODEL', 'default')}")
    print(f"   Sites: {len(db.sites)}")
    print(f"   Patients: {len(db.patients)}")
    print(f"   Trials: {len(db.trials)}")
    print(f"   Tasks: {len(task_manager.tasks)}")
    print(f"   Staff: {len(staff_manager.staff)}")
    print(f"   Protocols: {len(db.protocols)}")
    print(f"   Interventions: {len(db.interventions)}")
    print(f"   Data queries: {len(db.data_queries)}")
    print(f"   Knowledge: {kg_stats['total']} entries (T1: {kg_stats['by_tier'][1]}, T2: {kg_stats['by_tier'][2]}, T3: {kg_stats['by_tier'][3]})")
    print(f"   Users: {len(auth.users)}")

    yield

    print("Cadence API shutting down")


app = FastAPI(
    title="Cadence API",
    description="CRC Operating System -- Agent & Patient Data API (Multi-Site)",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- Request/Response models --------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    actions_taken: list
    data: list
    requires_approval: bool
    pending_actions: list
    meta: dict

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    patient_id: Optional[str] = None
    trial_id: Optional[str] = None
    site_id: str
    due_date: str
    priority: Optional[str] = "normal"
    category: Optional[str] = "documentation"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None

class ProtocolUpload(BaseModel):
    content: str
    name: str
    trial_id: str
    site_id: Optional[str] = None
    version: Optional[str] = "1.0"

class ProtocolSearch(BaseModel):
    query: str
    site_id: Optional[str] = None
    trial_id: Optional[str] = None

class NoteCreate(BaseModel):
    content: str
    category: Optional[str] = "general"
    author: Optional[str] = "CRC"

class InterventionCreate(BaseModel):
    patient_id: str
    type: str
    outcome: Optional[str] = "pending"
    notes: Optional[str] = ""
    triggered_by: Optional[str] = "manual"

class MonitoringCreate(BaseModel):
    site_id: str
    monitor_name: str
    date: str

class ChecklistUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class QueryUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None

class HandoffQuestion(BaseModel):
    question: str
    context: Optional[dict] = None

class StaffCreate(BaseModel):
    name: str
    email: str
    role: str
    site_id: str
    specialties: Optional[list[str]] = []
    max_patient_load: Optional[int] = 20

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    specialties: Optional[list[str]] = None
    max_patient_load: Optional[int] = None

class AssignRequest(BaseModel):
    staff_id: str

class KnowledgeCreate(BaseModel):
    site_id: str
    category: str
    content: str
    source: str
    author: Optional[str] = None
    trial_id: Optional[str] = None
    tags: Optional[list[str]] = []

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    name: str
    role: Optional[str] = "crc"
    site_id: Optional[str] = None
    organization_id: Optional[str] = None
    password: Optional[str] = "cadence123"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    site_id: Optional[str] = None
    organization_id: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

class OrgCreate(BaseModel):
    name: str
    type: Optional[str] = "clinical_site"

class SiteAdminCreate(BaseModel):
    name: str
    organization_id: str
    location: str
    pi_name: str
    crc_count: Optional[int] = 0

class SiteAdminUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    pi_name: Optional[str] = None
    crc_count: Optional[int] = None

class TrialCreate(BaseModel):
    name: str
    phase: str
    condition: str
    sponsor: str
    expected_duration_weeks: Optional[int] = 52
    visit_schedule: Optional[str] = ""

class SiteTrialEnroll(BaseModel):
    trial_id: str
    enrolled: Optional[int] = 0
    pi: Optional[str] = ""

class TabPreferences(BaseModel):
    preferences: dict


# -- Routes: Core -------------------------------------------------------------

@app.get("/")
async def root():
    return {"service": "cadence-api", "version": "0.2.0", "status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    result = await agent.handle_message(request.message, request.context)
    return ChatResponse(**result)


@app.post("/api/chat/reset")
async def reset_chat():
    if agent:
        agent.reset()
    return {"status": "ok", "message": "Conversation reset"}


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "db_loaded": db is not None,
        "agent_ready": agent is not None,
        "patients": len(db.patients) if db else 0,
        "sites": len(db.sites) if db else 0,
        "tasks": len(task_manager.tasks) if task_manager else 0,
    }


@app.get("/api/usage")
async def get_usage():
    return usage_tracker.summary()


@app.get("/api/usage/detailed")
async def get_usage_detailed():
    return {
        "summary": usage_tracker.summary(),
        "requests": usage_tracker.requests[-50:],
    }


# -- Routes: Organizations & Sites --------------------------------------------

@app.get("/api/organizations")
async def get_organizations():
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return {"organizations": db.organizations}


@app.get("/api/sites")
async def get_sites():
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return {"sites": db.sites}


@app.get("/api/sites/{site_id}")
async def get_site(site_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    site = next((s for s in db.sites if s["site_id"] == site_id), None)
    if not site:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    return site


# -- Routes: Patients ----------------------------------------------------------

@app.get("/api/patients")
async def get_patients(
    site_id: Optional[str] = None,
    trial_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patients = db.patients

    if site_id:
        patients = [p for p in patients if p["site_id"] == site_id]
    if trial_id:
        patients = [p for p in patients if p["trial_id"] == trial_id]
    if risk_level:
        thresholds = {"high": 0.7, "medium": 0.4, "low": 0.0}
        min_r = thresholds.get(risk_level, 0)
        patients = [p for p in patients if p["dropout_risk_score"] >= min_r]
        if risk_level != "high":
            max_r = {"low": 0.4, "medium": 0.7}.get(risk_level, 1.0)
            patients = [p for p in patients if p["dropout_risk_score"] < max_r]
    if status:
        patients = [p for p in patients if p["status"] == status]

    patients = sorted(patients, key=lambda p: p["dropout_risk_score"], reverse=True)
    return {"patients": patients[:limit], "total": len(patients)}


@app.get("/api/patients/registry")
async def get_patient_registry(
    site_id: Optional[str] = None,
    trial_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: Optional[str] = "risk_score",
):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patients = db.patients

    if site_id:
        patients = [p for p in patients if p["site_id"] == site_id]
    if trial_id:
        patients = [p for p in patients if p["trial_id"] == trial_id]
    if status:
        patients = [p for p in patients if p["status"] == status]

    sort_keys = {
        "risk_score": lambda p: p["dropout_risk_score"],
        "next_visit": lambda p: p.get("next_visit_date") or "9999-99-99",
        "last_contact": lambda p: p.get("last_contact_date") or "0000-00-00",
        "name": lambda p: p["name"],
        "trial": lambda p: p["trial_name"],
    }
    key_fn = sort_keys.get(sort_by, sort_keys["risk_score"])
    reverse = sort_by in ("risk_score",)
    patients = sorted(patients, key=key_fn, reverse=reverse)

    return {"patients": patients, "total": len(patients)}


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patient = next((p for p in db.patients if p["patient_id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@app.get("/api/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patient = next((p for p in db.patients if p["patient_id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    tasks = task_manager.list_tasks(patient_id=patient_id, status="pending")[:5] if task_manager else []
    notes = [n for n in db.patient_notes if n["patient_id"] == patient_id][-5:]
    queries = [q for q in db.data_queries if q["patient_id"] == patient_id and q["status"] in ("open", "in_progress")]

    return {
        "patient": patient,
        "upcoming_tasks": tasks,
        "recent_notes": notes,
        "open_queries": queries,
        "recent_interventions": patient.get("interventions", [])[-5:],
    }


@app.post("/api/patients/{patient_id}/note")
async def add_patient_note(patient_id: str, note: NoteCreate):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patient = next((p for p in db.patients if p["patient_id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    from datetime import datetime
    import uuid
    note_record = {
        "id": f"note_{uuid.uuid4().hex[:8]}",
        "patient_id": patient_id,
        "site_id": patient["site_id"],
        "author": note.author,
        "content": note.content,
        "timestamp": datetime.now().isoformat(),
        "category": note.category,
    }
    db.patient_notes.append(note_record)
    patient["notes"].append(note_record)
    return note_record


# -- Routes: Trials ------------------------------------------------------------

@app.get("/api/trials")
async def get_trials(site_id: Optional[str] = None):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    if site_id:
        trial_ids = set(
            e["trial_id"] for e in db.site_trial_enrollments if e["site_id"] == site_id
        )
        trials = [t for t in db.trials if t["trial_id"] in trial_ids]
    else:
        trials = db.trials
    return {"trials": trials}


# -- Routes: Dashboard ---------------------------------------------------------

@app.get("/api/dashboard")
async def get_dashboard(site_id: Optional[str] = None):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return db.summary(site_id=site_id)


# -- Routes: Tasks -------------------------------------------------------------

@app.get("/api/tasks")
async def list_tasks(
    site_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
):
    if not task_manager:
        raise HTTPException(status_code=503, detail="Task manager not initialized")
    tasks = task_manager.list_tasks(
        site_id=site_id,
        start_date=start_date,
        end_date=end_date,
        status=status,
        category=category,
    )
    return {"tasks": tasks, "total": len(tasks)}


@app.get("/api/tasks/today")
async def tasks_today(site_id: Optional[str] = None):
    if not task_manager:
        raise HTTPException(status_code=503, detail="Task manager not initialized")
    return task_manager.today_summary(site_id=site_id)


@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    if not task_manager:
        raise HTTPException(status_code=503, detail="Task manager not initialized")
    return task_manager.add_task(task.model_dump())


@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, updates: TaskUpdate):
    if not task_manager:
        raise HTTPException(status_code=503, detail="Task manager not initialized")
    result = task_manager.update_task(task_id, updates.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return result


# -- Routes: Protocols ---------------------------------------------------------

@app.get("/api/protocols")
async def list_protocols(site_id: Optional[str] = None, trial_id: Optional[str] = None):
    if not protocol_manager:
        raise HTTPException(status_code=503, detail="Protocol manager not initialized")
    return {"protocols": protocol_manager.list_protocols(site_id=site_id, trial_id=trial_id)}


@app.get("/api/protocols/{protocol_id}")
async def get_protocol(protocol_id: str):
    if not protocol_manager:
        raise HTTPException(status_code=503, detail="Protocol manager not initialized")
    proto = protocol_manager.get_protocol(protocol_id)
    if not proto:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")
    return proto


@app.post("/api/protocols/upload")
async def upload_protocol(data: ProtocolUpload):
    if not protocol_manager:
        raise HTTPException(status_code=503, detail="Protocol manager not initialized")
    return protocol_manager.upload(
        content=data.content,
        name=data.name,
        trial_id=data.trial_id,
        site_id=data.site_id,
        version=data.version,
    )


@app.post("/api/protocols/search")
async def search_protocols(data: ProtocolSearch):
    if not protocol_manager:
        raise HTTPException(status_code=503, detail="Protocol manager not initialized")
    return {"results": protocol_manager.search(
        query=data.query,
        site_id=data.site_id,
        trial_id=data.trial_id,
    )}


# -- Routes: Monitoring -------------------------------------------------------

@app.get("/api/monitoring")
async def list_monitoring(site_id: Optional[str] = None):
    if not monitoring_manager:
        raise HTTPException(status_code=503, detail="Monitoring manager not initialized")
    return {"visits": monitoring_manager.list_visits(site_id=site_id)}


@app.get("/api/monitoring/{visit_id}/prep")
async def get_monitoring_prep(visit_id: str):
    if not monitoring_manager:
        raise HTTPException(status_code=503, detail="Monitoring manager not initialized")
    prep = monitoring_manager.get_prep(visit_id)
    if not prep:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")
    return prep


@app.post("/api/monitoring")
async def create_monitoring(data: MonitoringCreate):
    if not monitoring_manager:
        raise HTTPException(status_code=503, detail="Monitoring manager not initialized")
    return monitoring_manager.schedule_visit(
        site_id=data.site_id,
        monitor_name=data.monitor_name,
        date=data.date,
    )


@app.patch("/api/monitoring/{visit_id}/checklist/{item_id}")
async def update_checklist(visit_id: str, item_id: str, updates: ChecklistUpdate):
    if not monitoring_manager:
        raise HTTPException(status_code=503, detail="Monitoring manager not initialized")
    result = monitoring_manager.update_checklist_item(
        visit_id, item_id, updates.model_dump(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    return result


# -- Routes: Interventions -----------------------------------------------------

@app.post("/api/interventions")
async def log_intervention(data: InterventionCreate):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    patient = next((p for p in db.patients if p["patient_id"] == data.patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {data.patient_id} not found")

    from datetime import datetime
    import uuid
    intervention = {
        "id": f"int_{uuid.uuid4().hex[:8]}",
        "patient_id": data.patient_id,
        "site_id": patient["site_id"],
        "trial_id": patient["trial_id"],
        "type": data.type,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "outcome": data.outcome,
        "notes": data.notes,
        "triggered_by": data.triggered_by,
    }
    db.interventions.append(intervention)
    patient["interventions"].append(intervention)
    return intervention


@app.get("/api/interventions")
async def list_interventions(
    site_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    trial_id: Optional[str] = None,
):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    interventions = db.interventions
    if site_id:
        interventions = [i for i in interventions if i["site_id"] == site_id]
    if patient_id:
        interventions = [i for i in interventions if i["patient_id"] == patient_id]
    if trial_id:
        interventions = [i for i in interventions if i["trial_id"] == trial_id]
    return {"interventions": sorted(interventions, key=lambda i: i["date"], reverse=True), "total": len(interventions)}


@app.get("/api/interventions/stats")
async def intervention_stats(site_id: Optional[str] = None):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    interventions = db.interventions
    if site_id:
        interventions = [i for i in interventions if i["site_id"] == site_id]

    from datetime import datetime, timedelta
    total = len(interventions)
    by_outcome = {}
    by_type = {}
    for i in interventions:
        by_outcome[i["outcome"]] = by_outcome.get(i["outcome"], 0) + 1
        by_type[i["type"]] = by_type.get(i["type"], 0) + 1

    system_rec = [i for i in interventions if i["triggered_by"] == "system_recommendation"]
    system_positive = len([i for i in system_rec if i["outcome"] == "positive"])

    return {
        "total": total,
        "by_outcome": by_outcome,
        "by_type": by_type,
        "system_recommended": len(system_rec),
        "system_success_rate": round(system_positive / max(len(system_rec), 1), 2),
        "this_week": len([
            i for i in interventions
            if i["date"] >= (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        ]),
    }


# -- Routes: Data Queries -----------------------------------------------------

@app.get("/api/queries")
async def list_queries(site_id: Optional[str] = None, status: Optional[str] = None):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    queries = db.data_queries
    if site_id:
        queries = [q for q in queries if q["site_id"] == site_id]
    if status:
        queries = [q for q in queries if q["status"] == status]
    return {"queries": queries, "total": len(queries)}


@app.patch("/api/queries/{query_id}")
async def update_query(query_id: str, updates: QueryUpdate):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    query = next((q for q in db.data_queries if q["id"] == query_id), None)
    if not query:
        raise HTTPException(status_code=404, detail=f"Query {query_id} not found")
    if updates.status:
        query["status"] = updates.status
        if updates.status == "resolved":
            from datetime import datetime
            query["resolved_date"] = datetime.now().strftime("%Y-%m-%d")
    if updates.assigned_to:
        query["assigned_to"] = updates.assigned_to
    return query


@app.get("/api/queries/stats")
async def query_stats(site_id: Optional[str] = None):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    queries = db.data_queries
    if site_id:
        queries = [q for q in queries if q["site_id"] == site_id]

    from datetime import datetime
    resolved = [q for q in queries if q["status"] == "resolved" and q.get("resolved_date") and q.get("opened_date")]
    avg_days = 0
    if resolved:
        total_days = sum(
            (datetime.fromisoformat(q["resolved_date"]) - datetime.fromisoformat(q["opened_date"])).days
            for q in resolved
        )
        avg_days = round(total_days / len(resolved), 1)

    return {
        "total": len(queries),
        "open": len([q for q in queries if q["status"] == "open"]),
        "in_progress": len([q for q in queries if q["status"] == "in_progress"]),
        "resolved": len([q for q in queries if q["status"] == "resolved"]),
        "avg_resolution_days": avg_days,
    }


# -- Routes: Analytics ---------------------------------------------------------

@app.get("/api/analytics/site/{site_id}")
async def site_analytics(site_id: str):
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    from datetime import datetime, timedelta
    patients = [p for p in db.patients if p["site_id"] == site_id]
    active = [p for p in patients if p["status"] in ("active", "at_risk")]
    withdrawn = [p for p in patients if p["status"] == "withdrawn"]

    interventions = [i for i in db.interventions if i["site_id"] == site_id]
    queries = [q for q in db.data_queries if q["site_id"] == site_id]

    resolved = [q for q in queries if q["status"] == "resolved" and q.get("resolved_date") and q.get("opened_date")]
    avg_resolution = 0
    if resolved:
        total_days = sum(
            (datetime.fromisoformat(q["resolved_date"]) - datetime.fromisoformat(q["opened_date"])).days
            for q in resolved
        )
        avg_resolution = round(total_days / len(resolved), 1)

    risk_distribution = {"high": 0, "medium": 0, "low": 0}
    for p in active:
        if p["dropout_risk_score"] >= 0.7:
            risk_distribution["high"] += 1
        elif p["dropout_risk_score"] >= 0.4:
            risk_distribution["medium"] += 1
        else:
            risk_distribution["low"] += 1

    # Monitoring readiness
    readiness = None
    if monitoring_manager:
        upcoming = [v for v in db.monitoring_visits if v["site_id"] == site_id and v["status"] == "upcoming"]
        if upcoming:
            prep = monitoring_manager.get_prep(upcoming[0]["id"])
            if prep:
                readiness = prep["summary"]["readiness_pct"]

    return {
        "site_id": site_id,
        "retention_rate": round((len(active) / max(len(patients), 1)) * 100, 1),
        "total_patients": len(patients),
        "active": len(active),
        "withdrawn": len(withdrawn),
        "avg_risk_score": round(sum(p["dropout_risk_score"] for p in active) / max(len(active), 1), 3),
        "risk_distribution": risk_distribution,
        "interventions_total": len(interventions),
        "interventions_this_month": len([
            i for i in interventions
            if i["date"] >= (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        ]),
        "queries_open": len([q for q in queries if q["status"] in ("open", "in_progress")]),
        "avg_query_resolution_days": avg_resolution,
        "monitoring_readiness_pct": readiness,
    }


@app.get("/api/analytics/cross-site")
async def cross_site_analytics():
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    from datetime import datetime, timedelta
    sites_data = []
    for site in db.sites:
        sid = site["site_id"]
        patients = [p for p in db.patients if p["site_id"] == sid]
        active = [p for p in patients if p["status"] in ("active", "at_risk")]
        interventions = [i for i in db.interventions if i["site_id"] == sid]
        queries = [q for q in db.data_queries if q["site_id"] == sid]

        sites_data.append({
            "site_id": sid,
            "site_name": site["name"],
            "total_patients": len(patients),
            "active": len(active),
            "retention_rate": round((len(active) / max(len(patients), 1)) * 100, 1),
            "avg_risk_score": round(sum(p["dropout_risk_score"] for p in active) / max(len(active), 1), 3),
            "high_risk": len([p for p in active if p["dropout_risk_score"] >= 0.7]),
            "interventions_total": len(interventions),
            "queries_open": len([q for q in queries if q["status"] in ("open", "in_progress")]),
        })

    return {"sites": sites_data}


# -- Routes: Staff -------------------------------------------------------------

@app.get("/api/staff")
async def list_staff(site_id: Optional[str] = None, role: Optional[str] = None):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    return {"staff": staff_manager.list_staff(site_id=site_id, role=role)}


@app.get("/api/staff/workload")
async def staff_workload(site_id: Optional[str] = None):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    return {
        "workload": staff_manager.get_workload(site_id=site_id),
        "capacity": staff_manager.get_capacity_recommendations(),
    }


@app.get("/api/staff/{staff_id}")
async def get_staff_detail(staff_id: str):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    s = staff_manager.get_staff(staff_id)
    if not s:
        raise HTTPException(status_code=404, detail=f"Staff {staff_id} not found")
    return s


@app.post("/api/staff")
async def create_staff(data: StaffCreate):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    return staff_manager.add_staff(data.model_dump())


@app.patch("/api/staff/{staff_id}")
async def update_staff(staff_id: str, data: StaffUpdate):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    result = staff_manager.update_staff(staff_id, data.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail=f"Staff {staff_id} not found")
    return result


@app.get("/api/staff/{staff_id}/tasks")
async def get_staff_tasks(staff_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    tasks = staff_manager.get_staff_tasks(staff_id, start_date=start_date, end_date=end_date)
    return {"tasks": tasks, "total": len(tasks)}


@app.get("/api/staff/{staff_id}/patients")
async def get_staff_patients(staff_id: str):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    patients = staff_manager.get_staff_patients(staff_id)
    return {"patients": patients, "total": len(patients)}


@app.patch("/api/tasks/{task_id}/assign")
async def assign_task(task_id: str, data: AssignRequest):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    result = staff_manager.assign_task(task_id, data.staff_id)
    if not result:
        raise HTTPException(status_code=404, detail="Task or staff not found")
    return result


@app.patch("/api/patients/{patient_id}/assign")
async def assign_patient(patient_id: str, data: AssignRequest):
    if not staff_manager:
        raise HTTPException(status_code=503, detail="Staff manager not initialized")
    result = staff_manager.assign_patient(patient_id, data.staff_id)
    if not result:
        raise HTTPException(status_code=404, detail="Patient or staff not found")
    return result


# -- Routes: Knowledge ---------------------------------------------------------

@app.get("/api/knowledge")
async def list_knowledge(
    tier: Optional[int] = None,
    site_id: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    if search:
        results = knowledge_manager.search(
            query=search, site_id=site_id, tier=tier, category=category, limit=20
        )
        return {"entries": results, "total": len(results)}
    entries = knowledge_manager.get_entries(tier=tier, site_id=site_id, category=category)
    return {"entries": entries, "total": len(entries)}


@app.get("/api/knowledge/stats")
async def knowledge_stats():
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    return knowledge_manager.get_stats()


@app.get("/api/knowledge/search")
async def search_knowledge(
    q: str = "",
    site_id: Optional[str] = None,
    tier: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 10,
):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    results = knowledge_manager.search(
        query=q, site_id=site_id, tier=tier, category=category, limit=limit
    )
    return {"query": q, "results": results, "total": len(results)}


@app.get("/api/knowledge/cross-site")
async def cross_site_insights(
    category: Optional[str] = None,
    therapeutic_area: Optional[str] = None,
):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    insights = knowledge_manager.cross_site.get_insights(
        category=category, therapeutic_area=therapeutic_area
    )
    # Also include dynamic computed insights
    dynamic = knowledge_manager.cross_site.compute_insights(knowledge_manager.db)
    return {"insights": insights + dynamic, "total": len(insights) + len(dynamic)}


@app.post("/api/knowledge")
async def add_knowledge(data: KnowledgeCreate):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    entry = knowledge_manager.add_site_entry(
        site_id=data.site_id,
        category=data.category,
        content=data.content,
        source=data.source,
        author=data.author,
        trial_id=data.trial_id,
        tags=data.tags,
    )
    return entry


@app.get("/api/knowledge/stale")
async def stale_knowledge(site_id: Optional[str] = None):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    stale = knowledge_manager.lifecycle.get_stale_entries(site_id=site_id)
    return {"entries": stale, "total": len(stale)}


@app.patch("/api/knowledge/{entry_id}/validate")
async def validate_knowledge(entry_id: str):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    entry = knowledge_manager.lifecycle.validate(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    return entry


@app.patch("/api/knowledge/{entry_id}/archive")
async def archive_knowledge(entry_id: str):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    entry = knowledge_manager.lifecycle.archive(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Entry {entry_id} not found")
    return entry


@app.get("/api/knowledge/suggestions")
async def knowledge_suggestions(site_id: Optional[str] = None):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    suggestions = knowledge_manager.pattern_detector.get_suggestions(site_id=site_id)
    return {"suggestions": suggestions, "total": len(suggestions)}


@app.post("/api/knowledge/suggestions/{suggestion_id}/approve")
async def approve_suggestion(suggestion_id: str):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    entry = knowledge_manager.pattern_detector.approve_suggestion(suggestion_id)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Suggestion {suggestion_id} not found")
    return entry


@app.post("/api/knowledge/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion(suggestion_id: str):
    if not knowledge_manager:
        raise HTTPException(status_code=503, detail="Knowledge manager not initialized")
    result = knowledge_manager.pattern_detector.dismiss_suggestion(suggestion_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Suggestion {suggestion_id} not found")
    return result


# -- Routes: Handoff -----------------------------------------------------------

@app.get("/api/handoff/{site_id}")
async def get_handoff(site_id: str):
    if not handoff_generator:
        raise HTTPException(status_code=503, detail="Handoff generator not initialized")
    return handoff_generator.generate(site_id)


@app.post("/api/handoff/{site_id}/ask")
async def ask_handoff(site_id: str, data: HandoffQuestion):
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    context = {"site_id": site_id, "mode": "handoff_onboarding"}
    result = await agent.handle_message(data.question, context)
    return ChatResponse(**result)


# -- Routes: Auth (public) ----------------------------------------------------

@app.post("/api/auth/login")
async def login(data: LoginRequest):
    user = auth.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_token(user)
    return {"token": token, "user": user}


@app.get("/api/auth/me")
async def get_me(request: Request):
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# -- Routes: Preferences ------------------------------------------------------

@app.get("/api/preferences/me")
async def get_my_preferences(request: Request):
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "preferences": user.get("preferences", {}),
        "first_login": user.get("first_login", False),
        "onboarded_tabs": user.get("onboarded_tabs", []),
    }


@app.patch("/api/preferences/me/{tab}")
async def update_tab_preferences(tab: str, data: TabPreferences, request: Request):
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    full_user = next((u for u in auth.users if u["id"] == user["id"]), None)
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    if "preferences" not in full_user:
        full_user["preferences"] = {}
    full_user["preferences"][tab] = data.preferences
    if "onboarded_tabs" not in full_user:
        full_user["onboarded_tabs"] = []
    if tab not in full_user["onboarded_tabs"]:
        full_user["onboarded_tabs"].append(tab)
    return {"tab": tab, "preferences": full_user["preferences"][tab]}


@app.patch("/api/preferences/me/first-login-complete")
async def mark_first_login_complete(request: Request):
    user = auth.get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    full_user = next((u for u in auth.users if u["id"] == user["id"]), None)
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    full_user["first_login"] = False
    return {"status": "ok"}


# -- Routes: Admin (requires admin/sponsor role) ------------------------------

@app.get("/api/admin/overview")
async def admin_overview(admin=Depends(auth.require_admin)):
    return {
        "organizations": len(db.organizations),
        "sites": len(db.sites),
        "trials": len(db.trials),
        "patients": len(db.patients),
        "users": len([u for u in auth.users if u["active"]]),
        "staff": len(staff_manager.staff) if staff_manager else 0,
        "tasks_pending": len([t for t in task_manager.tasks if t["status"] == "pending"]) if task_manager else 0,
        "knowledge_entries": knowledge_manager.get_stats()["total"] if knowledge_manager else 0,
        "llm_cost": usage_tracker.summary().get("total_cost", 0),
    }


# -- Admin: Organizations --

@app.get("/api/admin/organizations")
async def admin_list_orgs(admin=Depends(auth.require_admin)):
    return {"organizations": db.organizations}


@app.post("/api/admin/organizations")
async def admin_create_org(data: OrgCreate, admin=Depends(auth.require_admin)):
    org = {
        "organization_id": f"org_{uuid.uuid4().hex[:8]}",
        "name": data.name,
        "type": data.type,
    }
    db.organizations.append(org)
    return org


# -- Admin: Sites --

@app.get("/api/admin/sites")
async def admin_list_sites(admin=Depends(auth.require_admin)):
    enriched = []
    for site in db.sites:
        sid = site["site_id"]
        enriched.append({
            **site,
            "patient_count": len([p for p in db.patients if p["site_id"] == sid]),
            "trial_count": len([e for e in db.site_trial_enrollments if e["site_id"] == sid]),
            "staff_count": len([s for s in staff_manager.staff if s["site_id"] == sid]) if staff_manager else 0,
            "user_count": len([u for u in auth.users if u.get("site_id") == sid and u["active"]]),
        })
    return {"sites": enriched}


@app.post("/api/admin/sites")
async def admin_create_site(data: SiteAdminCreate, admin=Depends(auth.require_admin)):
    # Verify organization exists
    org = next((o for o in db.organizations if o["organization_id"] == data.organization_id), None)
    if not org:
        raise HTTPException(status_code=404, detail=f"Organization {data.organization_id} not found")
    site = {
        "site_id": f"site_{uuid.uuid4().hex[:8]}",
        "organization_id": data.organization_id,
        "name": data.name,
        "location": data.location,
        "pi_name": data.pi_name,
        "crc_count": data.crc_count,
    }
    db.sites.append(site)
    return site


@app.patch("/api/admin/sites/{site_id}")
async def admin_update_site(site_id: str, data: SiteAdminUpdate, admin=Depends(auth.require_admin)):
    site = next((s for s in db.sites if s["site_id"] == site_id), None)
    if not site:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    for key in ("name", "location", "pi_name", "crc_count"):
        val = getattr(data, key)
        if val is not None:
            site[key] = val
    return site


# -- Admin: Users --

@app.get("/api/admin/users")
async def admin_list_users(admin=Depends(auth.require_admin)):
    return {"users": auth.list_users()}


@app.post("/api/admin/users")
async def admin_create_user(data: UserCreate, admin=Depends(auth.require_admin)):
    if any(u["email"] == data.email for u in auth.users):
        raise HTTPException(status_code=409, detail=f"Email {data.email} already exists")
    return auth.create_user(data.model_dump())


@app.patch("/api/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: UserUpdate, admin=Depends(auth.require_admin)):
    result = auth.update_user(user_id, data.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return result


@app.delete("/api/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin=Depends(auth.require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    if not auth.delete_user(user_id):
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return {"status": "ok", "message": f"User {user_id} deactivated"}


# -- Admin: Trials --

@app.get("/api/admin/trials")
async def admin_list_trials(admin=Depends(auth.require_admin)):
    enriched = []
    for trial in db.trials:
        tid = trial["trial_id"]
        site_enrollments = [e for e in db.site_trial_enrollments if e["trial_id"] == tid]
        enriched.append({
            **trial,
            "site_count": len(site_enrollments),
            "total_enrolled": sum(e["enrolled"] for e in site_enrollments),
            "patient_count": len([p for p in db.patients if p["trial_id"] == tid]),
            "sites": site_enrollments,
        })
    return {"trials": enriched}


@app.post("/api/admin/trials")
async def admin_create_trial(data: TrialCreate, admin=Depends(auth.require_admin)):
    trial = {
        "trial_id": f"NCT{random.randint(10000000, 99999999):08d}",
        "name": data.name,
        "phase": data.phase,
        "condition": data.condition,
        "sponsor": data.sponsor,
        "expected_duration_weeks": data.expected_duration_weeks,
        "visit_schedule": data.visit_schedule,
    }
    db.trials.append(trial)
    return trial


@app.post("/api/admin/sites/{site_id}/trials")
async def admin_enroll_site_trial(site_id: str, data: SiteTrialEnroll, admin=Depends(auth.require_admin)):
    site = next((s for s in db.sites if s["site_id"] == site_id), None)
    if not site:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    trial = next((t for t in db.trials if t["trial_id"] == data.trial_id), None)
    if not trial:
        raise HTTPException(status_code=404, detail=f"Trial {data.trial_id} not found")
    existing = next((e for e in db.site_trial_enrollments
                     if e["site_id"] == site_id and e["trial_id"] == data.trial_id), None)
    if existing:
        raise HTTPException(status_code=409, detail="Trial already enrolled at this site")
    enrollment = {
        "site_id": site_id,
        "trial_id": data.trial_id,
        "enrolled": data.enrolled,
        "pi": data.pi or site.get("pi_name", ""),
    }
    db.site_trial_enrollments.append(enrollment)
    return enrollment


@app.delete("/api/admin/sites/{site_id}/trials/{trial_id}")
async def admin_unenroll_site_trial(site_id: str, trial_id: str, admin=Depends(auth.require_admin)):
    idx = next(
        (i for i, e in enumerate(db.site_trial_enrollments)
         if e["site_id"] == site_id and e["trial_id"] == trial_id),
        None,
    )
    if idx is None:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.site_trial_enrollments.pop(idx)
    return {"status": "ok", "message": f"Trial {trial_id} removed from site {site_id}"}
