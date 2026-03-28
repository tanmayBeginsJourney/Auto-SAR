# Auto-SAR

Auto-SAR is a runnable Barclays hackathon MVP for `SAR Narrative Generation with Audit Trail`.

It delivers a complete local analyst-to-Principal-Officer STR/SAR workflow on top of the supplied demo SQLite dataset:

- L1 analyst dashboard and case workspace
- deterministic STR autofill from known facts
- OpenAI-assisted grounds-of-suspicion drafting with local guidance retrieval
- visible audit trail and paragraph provenance
- pre-submission validation and immutable submission snapshot
- PO dashboard, review, request-information, approval, and export
- XML, audit-dossier PDF, and ledger JSON artifacts

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, React Router
- Backend: FastAPI, Pydantic, sqlite3
- AI: OpenAI Responses API wrapper with local deterministic fallback if no key is set
- Retrieval: local PDF/text chunking over `samples/` and `rag_docs/`
- Persistence: supplied SQLite DB plus file-backed runtime state under `runtime_state/`

## Repo layout

- [frontend](/C:/codeing/Auto-SAR/frontend)
- [backend](/C:/codeing/Auto-SAR/backend)
- [runtime_state](/C:/codeing/Auto-SAR/runtime_state)
- [screen_mockups](/C:/codeing/Auto-SAR/screen_mockups)
- [sar_demo_dataset](/C:/codeing/Auto-SAR/sar_demo_dataset)

## Setup

1. Copy [.env.example](/C:/codeing/Auto-SAR/.env.example) to `.env`.
2. Add your OpenAI key.
3. Install backend deps:

```powershell
python -m pip install -r backend\requirements.txt
```

4. Install frontend deps:

```powershell
cd frontend
npm install
```

## Run locally

Backend:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Demo roles

- `L1 Analyst`: Naina Kapoor
- `Principal Officer`: Ritu Sharma

Use the login screen to pick a role. The sidebar also includes a role switcher for quick demos.

## Recommended demo flow

1. Log in as `L1 Analyst`.
2. Open `CASE001` or `CASE003` from the analyst dashboard.
3. Review Data Assembly and adverse media.
4. Save STR Autofill.
5. Generate and edit Grounds of Suspicion.
6. Run validation and submit to PO.
7. Switch to `Principal Officer`.
8. Review `CASE002` or the case you just submitted.
9. Approve and download the XML, PDF dossier, and ledger JSON.

## Runtime state

Mutable app state is stored outside the supplied SQLite schema:

- `runtime_state/cases/<caseId>/str_autofill.json`
- `runtime_state/cases/<caseId>/narrative.json`
- `runtime_state/cases/<caseId>/submission_snapshot.json`
- `runtime_state/cases/<caseId>/po_review.json`
- `runtime_state/audit_ledger/<caseId>.jsonl`
- `runtime_state/artifacts/<caseId>/<reviewCycleId>/...`

Delete generated files under `runtime_state/cases`, `runtime_state/audit_ledger`, and `runtime_state/artifacts` to reset the working state. The retrieval cache in `runtime_state/retrieval_index.json` can be kept.

## Tests

Backend:

```powershell
cd backend
pytest
```

Frontend:

```powershell
cd frontend
npm run test
npm run build
```

## Verified locally

- backend import and startup
- retrieval index build over local PDFs/docs
- backend pytest suite: `6 passed`
- frontend Vitest suite: `4 passed`
- frontend production build
- backend HTTP probe on `http://127.0.0.1:8000/api/dashboard/summary`
- built frontend HTTP probe on `http://127.0.0.1:4173`

I did not add Playwright in this pass; the browser verification here is via build plus HTTP smoke and the focused automated test coverage above.

## Notes

- Narrative generation uses OpenAI when `OPENAI_API_KEY` is present. If the key is missing, the backend falls back to a deterministic local template so the rest of the demo remains usable.
- The PO dashboard ships with a seeded pending-review package for `CASE002` so the PO journey is demoable immediately.
- The crypto paragraph requirement is enforced for crypto-touching cases such as `CASE003`.
