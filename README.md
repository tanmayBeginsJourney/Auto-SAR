# Auto-SAR

End-to-end STR/SAR workflow: analysts assemble case data, draft grounds of suspicion with optional AI assistance, run validation, and submit; Principal Officers review, request information, approve, and export filings. The stack pairs a **FastAPI** backend with a **React (Vite + TypeScript)** frontend.

## Features

- **Analyst path:** dashboard, data assembly, STR autofill, grounds editor, pre-submission validation, submit to PO  
- **PO path:** queue, case review, diff/snapshot views, RFI, approval, XML / PDF dossier / ledger exports  
- **Compliance-oriented tooling:** explainable risk signals, paragraph-level provenance, hash-chained audit events tied to workflow actions  
- **Narrative support:** OpenAI-backed generation with **local** regulatory document retrieval (no separate vector service); deterministic template path when no API key is set  

Persistence is **layered**: relational case data (configurable SQLite path), workflow drafts, audit ledger, and generated artifacts under paths you control—suitable for local development and adaptable to other storage backends via configuration.

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI app, services, tests |
| `frontend/` | SPA |
| `sar_demo_dataset/` | Schema, seed, bundled DB; see `demo_case_examples.md` for case walkthroughs |
| `rag_docs/` | Reference PDFs for guidance retrieval |
| `samples/` | Additional prompt/form references |
| `runtime_state/` | **Generated** workflow and audit files (ignored by git—created at runtime) |

## Prerequisites

- Python 3.11+  
- Node.js 18+ (for the frontend)

## Setup

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` if you want live model calls (optional).  
2. Backend: `python -m pip install -r backend/requirements.txt`  
3. Frontend: `cd frontend && npm install`

## Run locally

**Backend** (from repo root):

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**

```powershell
cd frontend
npm run dev
```

Open the app at [http://127.0.0.1:5173](http://127.0.0.1:5173). The UI expects the API at `http://127.0.0.1:8000` (see `frontend/src/lib/api.ts`).

## Demo roles

Use the login screen to choose **L1 Analyst** or **Principal Officer**. Session choice is stored in the browser for convenience; case data and audit history are persisted by the **server** under `runtime_state/`.

## Tests

```powershell
cd backend
pytest
```

```powershell
cd frontend
npm run test
npm run build
```
