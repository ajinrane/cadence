"""
Cadence API
FastAPI application serving the agent and patient data endpoints.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from agent.llm import get_llm, usage_tracker
from agent.executor import AgentExecutor
from agent.actions.database import DatabaseActionProvider
from data.seed import PatientDatabase

# ── App state ────────────────────────────────────────────────────────────

db: PatientDatabase | None = None
agent: AgentExecutor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and agent on startup."""
    global db, agent

    db = PatientDatabase(seed=42)
    llm = get_llm()
    action_provider = DatabaseActionProvider(db)
    agent = AgentExecutor(llm, action_provider)

    print(f"✅ Cadence API started")
    print(f"   LLM: {os.environ.get('LLM_PROVIDER', 'claude')} / {os.environ.get('LLM_MODEL', 'default')}")
    print(f"   Patients: {len(db.patients)}")
    print(f"   Trials: {len(db.trials)}")

    yield

    print("👋 Cadence API shutting down")


app = FastAPI(
    title="Cadence API",
    description="CRC Operating System — Agent & Patient Data API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for local development and Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite dev
        "http://localhost:3000",     # Alternate
        "https://*.vercel.app",      # Vercel deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ──────────────────────────────────────────────

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


# ── Routes ───────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"service": "cadence-api", "version": "0.1.0", "status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main agent endpoint. Send a message, get a response with actions."""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")

    result = await agent.handle_message(request.message, request.context)
    return ChatResponse(**result)


@app.post("/api/chat/reset")
async def reset_chat():
    """Reset conversation history."""
    if agent:
        agent.reset()
    return {"status": "ok", "message": "Conversation reset"}


@app.get("/api/patients")
async def get_patients(
    trial_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """Get patient list with optional filters."""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    patients = db.patients

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


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    """Get a single patient with full details."""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    patient = next((p for p in db.patients if p["patient_id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return patient


@app.get("/api/trials")
async def get_trials():
    """Get all trials at this site."""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return {"trials": db.trials}


@app.get("/api/dashboard")
async def get_dashboard():
    """Get dashboard summary stats."""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return db.summary()


@app.get("/api/usage")
async def get_usage():
    """Get LLM usage and cost tracking."""
    return usage_tracker.summary()


@app.get("/api/usage/detailed")
async def get_usage_detailed():
    """Get detailed per-request usage data."""
    return {
        "summary": usage_tracker.summary(),
        "requests": usage_tracker.requests[-50:],  # Last 50
    }


@app.get("/api/health")
async def health():
    """Health check for monitoring."""
    return {
        "status": "healthy",
        "db_loaded": db is not None,
        "agent_ready": agent is not None,
        "patients": len(db.patients) if db else 0,
    }
