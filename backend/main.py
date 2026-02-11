"""
Cadence API
FastAPI application serving the agent and patient data endpoints.
Multi-site: all endpoints accept optional site_id filter.
"""

import os
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from agent.llm import get_llm, usage_tracker
from agent.executor import AgentExecutor
from agent.actions.database import DatabaseActionProvider
from agent.actions.tasks import TaskManager
from agent.actions.monitoring import MonitoringPrepManager
from agent.actions.handoff import HandoffGenerator
from agent.protocols import ProtocolManager
from data.seed import PatientDatabase

# -- App state ----------------------------------------------------------------

db: PatientDatabase | None = None
agent: AgentExecutor | None = None
task_manager: TaskManager | None = None
protocol_manager: ProtocolManager | None = None
monitoring_manager: MonitoringPrepManager | None = None
handoff_generator: HandoffGenerator | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and agent on startup."""
    global db, agent, task_manager, protocol_manager, monitoring_manager, handoff_generator

    db = PatientDatabase(seed=42)

    # Initialize managers
    task_manager = TaskManager(db)
    protocol_manager = ProtocolManager(db)
    monitoring_manager = MonitoringPrepManager(db)
    handoff_generator = HandoffGenerator(db, task_manager, protocol_manager, monitoring_manager)

    # Initialize LLM + agent
    llm = get_llm()
    action_provider = DatabaseActionProvider(
        db,
        task_manager=task_manager,
        protocol_manager=protocol_manager,
        monitoring_manager=monitoring_manager,
        handoff_generator=handoff_generator,
    )
    agent = AgentExecutor(llm, action_provider)

    print(f"[OK] Cadence API started")
    print(f"   LLM: {os.environ.get('LLM_PROVIDER', 'claude')} / {os.environ.get('LLM_MODEL', 'default')}")
    print(f"   Sites: {len(db.sites)}")
    print(f"   Patients: {len(db.patients)}")
    print(f"   Trials: {len(db.trials)}")
    print(f"   Tasks: {len(task_manager.tasks)}")
    print(f"   Protocols: {len(db.protocols)}")
    print(f"   Interventions: {len(db.interventions)}")
    print(f"   Data queries: {len(db.data_queries)}")

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
