# Cadence — CRC Operating System

AI-powered operating system for Clinical Research Coordinators. Prevents clinical trial patient dropout by preserving institutional knowledge and predicting risk.

## Architecture

```
┌─────────────────────────────────────┐
│  PRESENTATION (swappable)           │
│  v1: React web chat ← YOU ARE HERE  │
│  v2: Desktop copilot (Electron)     │
│  v3: Mobile (React Native)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  AGENT CORE                         │
│  Planner → Executor → Actions       │
│  LLM-agnostic (Claude / OpenAI)     │
│  Cost tracking per request          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ACTION LAYER (swappable)           │
│  v1: Database queries ← YOU ARE HERE│
│  v2: Desktop control (screen)       │
│  v3: CTMS APIs (Medidata, Veeva)    │
└─────────────────────────────────────┘
```

The agent core stays the same regardless of interface or execution backend. To add desktop copilot support later, implement `DesktopActionProvider` with the same interface as `DatabaseActionProvider`.

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your API key(s)

# Run
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the chat interface connects to the backend automatically.

## Swapping LLM Providers

Change two env vars in `backend/.env`:
```bash
# Use Claude (default)
LLM_PROVIDER=claude
LLM_MODEL=claude-sonnet-4-20250514

# Use OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o

# Use cheaper models
LLM_MODEL=claude-haiku-4-5-20251001
LLM_MODEL=gpt-4o-mini
```

Cost tracking is automatic — check `/api/usage` for per-request and cumulative costs.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main agent endpoint |
| `/api/chat/reset` | POST | Reset conversation |
| `/api/patients` | GET | List patients (filterable) |
| `/api/patients/{id}` | GET | Patient details |
| `/api/trials` | GET | Trial list |
| `/api/dashboard` | GET | Summary stats |
| `/api/usage` | GET | LLM cost tracking |
| `/api/health` | GET | Health check |

## Example Queries

- "Show me all high-risk patients"
- "Which patients have overdue visits in the NASH trial?"
- "What retention strategies work for fasting visits?"
- "Give me a summary of patient PT-1234-001"
- "Schedule a follow-up call for patients at risk this week"

## Fake Data

The app ships with realistic fake data:
- 3 trials (NASH, Alzheimer's, Heart Failure/GLP-1)
- ~135 patients with risk scores, timelines, and visit histories
- 7 institutional knowledge base entries from "experienced CRCs"

## Future: Desktop Copilot Migration

When ready to add desktop control:

1. Create `backend/agent/actions/desktop.py`
2. Implement `DesktopActionProvider(ActionProvider)`
3. Same action types (schedule_visit, send_reminder, etc.) but executed via screen control
4. Swap the provider in `main.py`
5. Build Electron/Tauri shell around the frontend

The agent planner and LLM layer remain untouched.
