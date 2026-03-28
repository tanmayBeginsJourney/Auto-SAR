# Auto-SAR MVP Master Build Prompt

Build the complete Auto-SAR MVP end to end in this repository.

This is a Barclays hackathon project. The goal is not enterprise perfection. The goal is to deliver a reliable, explainable, testable product demo that matches the supplied mockups closely and can be run locally after the user adds an OpenAI API key to `.env`.

The product theme is:

- `SAR Narrative Generation with Audit Trail`

The product must demonstrate a believable end-to-end STR/SAR workflow with:

- an L1 Analyst journey
- a Principal Officer journey
- deterministic structured form autofill
- AI-assisted grounds-of-suspicion drafting
- visible audit trail and explainability
- validation, submission, review, and final decision

Do not stop after one screen or one API. Build the full runnable MVP.

## Mission

Create a working demo product called `Auto-SAR` that helps automate STR / SAR preparation with:

- an analyst case queue
- case-centric data assembly
- STR form autofill from known data
- high-quality grounds-of-suspicion drafting
- pre-submission validation
- PO review and decision flow
- immutable submission snapshot
- XML export and demo-friendly audit evidence

The final output must be a runnable local web app with frontend, backend, persistence, OpenAI integration, and all core interactions needed for a live demo.

## Non-Negotiable Build Scope

Implement all of the following:

- the full frontend for all screens in `screen_mockups/`
- the full backend and all APIs needed by the screens
- local persistence for drafts, workflow state, review state, audit trail, and submission snapshots
- seeded demo auth or role switching for `L1 Analyst` and `Principal Officer`
- role-based access control
- deterministic STR autofill from source facts
- narrative generation using OpenAI
- lightweight retrieval over local docs
- pre-submission validation
- analyst submission to PO
- PO review, request-information, and approval flow
- final XML export and audit summary
- focused automated tests
- a README with setup and local run steps

If any requirement is underspecified, choose the thinnest real implementation that preserves the intended workflow and does not invent unsupported facts.

## Hard MVP Constraints

These constraints override any more ambitious architecture idea in this prompt:

- do not design new product screens beyond the existing mockup set
- do not require database schema changes to succeed
- do not require new SQLite tables to make the MVP work
- do not turn the build into a data-model redesign project

The current screen set and current dataset are enough for a strong demo if implemented carefully.

Where this prompt refers to concepts such as drafts, snapshots, PO reviews, notifications, or audit ledger entries, the implementation may use:

- file-backed JSON or JSONL state
- a local app-state folder
- backend-managed structured artifacts
- in-memory state only when losing persistence would not break the core demo

Prefer file-backed persistence over schema migrations for this hackathon build.

## Delivery Priorities

Optimize for these priorities, in order:

1. Working end-to-end demo
2. UI very close to the supplied HTML mockups
3. Correct use of the demo dataset
4. Clear workflow and explainability
5. Clean, maintainable code with focused tests

Do not over-engineer.

## Authoritative Tech Stack

Use this stack. Do not treat the old problem-statement options as live alternatives.

- Frontend: `React 18 + Vite + TypeScript`
- Styling: `Tailwind CSS`
- Routing: `React Router`
- Backend: `FastAPI + Python 3.11`
- API models: `Pydantic`
- Database: `SQLite`
- DB access: `SQLAlchemy` or direct `sqlite3` if significantly faster
- AI: `OpenAI API`
- Retrieval: lightweight local retrieval over chunked local docs stored in SQLite or local JSON
- Testing:
  - frontend: `Vitest + Testing Library`
  - backend: `pytest`
  - browser smoke: `Playwright` if feasible

## Explicitly Do Not Use

Do not build this MVP around:

- `Streamlit`
- `Gradio`
- `PostgreSQL`
- `ChromaDB`
- `Weaviate`
- `Milvus`
- any separate vector DB service
- cloud-first infra such as AWS Step Functions, DynamoDB, Amplify, or Bedrock
- Docker unless absolutely necessary

Old references to those technologies in earlier drafts were only loose ideation and must not drive the build.

## Why This Stack

This stack is intentionally chosen because it is the fastest defensible path to:

- matching the mockups closely
- building real APIs
- using the existing SQLite demo data directly
- adding app-state persistence quickly
- running locally without external infra

## Repository Inputs And Source Of Truth

Use these repository inputs:

- `screen_mockups/`
- `sar_demo_dataset/`
- `samples/`
- `rag_docs/`

Treat them with this priority:

1. `sar_demo_dataset/sar_demo_minimal.db`
   - primary runtime database for the MVP
   - source of truth for core case facts, alerts, transactions, entities, adverse media, and employees
2. `sar_demo_dataset/bank_reference.csv`
   - runtime enrichment for bank names and `Bank_Type`
   - use it for crypto exchange detection and explainable logic
3. `sar_demo_dataset/rule_thresholds.csv`
   - reference file for explaining rule logic
   - use it for audit text and help text, not as a live rule engine
4. `sar_demo_dataset/demo_case_examples.md`
   - reference for the three linked demo stories and expected walkthroughs
5. `sar_demo_dataset/README.md`
   - reference for scope and dataset interpretation
6. `sar_demo_dataset/minimal_schema.sql`
   - reference for the exact minimal relational shape of the dataset
7. `sar_demo_dataset/minimal_seed.sql`
   - reference for seeded demo rows and case linkage
8. other files under `sar_demo_dataset/`
   - reference only unless a field fallback is trivial and safe
9. `samples/SBA (1).pdf`
   - use as the structural reference for the STR form
10. `samples/sar_guide_good_and_bad_examples.pdf`
   - use as the main narrative-quality and compliance-writing guidance source
11. `rag_docs/`
   - use if files are present for additional local guidance retrieval

Important:

- `screen_mockups/` is the visual source of truth
- `sar_demo_dataset/sar_demo_minimal.db` is the factual source of truth for the demo
- if any referenced guidance file is missing, continue with the best available local sources and document the fallback
- if `rag_docs/` is empty, skip retrieval over that folder and continue
- if `samples/` is empty or a referenced PDF is unavailable, continue using the narrative-quality, structure, and compliance instructions already encoded in this prompt

## Product Context

Auto-SAR is an MVP to help automate filing Suspicious Transaction Reports / Suspicious Activity Reports.

Business context:

- Banks must file clear, regulator-ready suspicious activity reports.
- Drafting the narrative is manual, time-consuming, and risky.
- Regulators care about chronology, specificity, completeness, and defensibility.
- The system should reduce analyst effort while preserving transparency and human control.

This is a hackathon-scale build, but quality is not negotiable on the core workflow.

## Core Product Principles

### 1. Do not hallucinate facts

Never invent:

- customer identifiers
- transactions
- dates
- amounts
- branch codes
- people or entities
- adverse media facts
- legal conclusions

If data is missing:

- leave it blank
- make it editable where appropriate
- mark it unavailable
- do not fabricate it

### 2. Narrative generation is controlled drafting

The LLM is not the investigator and not the analyst.

It should generate narrative text only from:

- structured SQL case facts
- linked suspicious transactions
- KYC / customer / account data
- adverse media rows
- prior alerts if available
- local guidance chunks
- a fixed narrative structure

### 3. Audit trail must be visible

For every major AI-generated output, preserve:

- source facts used
- source transaction IDs
- source alert IDs
- prompt payload or prompt version
- retrieved guidance snippets
- generated paragraph outputs

Also preserve explainability for deterministic features such as:

- dashboard risk score
- SLA status
- validation blockers
- adverse media relevance review

### 4. Match the mockups closely

Reuse the HTML mockups as the visual guide. Preserve:

- layout
- cards
- tables
- sidebars
- stepper flow
- CTA placement
- read-only vs editable states

Replace hardcoded mock values with live backend values.

### 5. Every important UI value must be explainable

Any non-trivial derived value must be explainable in plain language:

- risk score
- SLA state
- alert reasoning
- narrative generation
- compliance-check result
- submission blockers

Prefer API fields such as:

- `explanation`
- `factors`
- `sourceType`
- `sourceReferences`

## Local Runtime Expectations

The final app must run locally after the user adds their OpenAI key to `.env`.

Use environment variables like:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.4
OPENAI_COPILOT_MODEL=gpt-5.4
SQLITE_DB_PATH=./sar_demo_dataset/sar_demo_minimal.db
RAG_DOCS_DIR=./rag_docs
SYSTEM_PROMPT_REFERENCE=./samples/sar_guide_good_and_bad_examples.pdf
STR_FORM_REFERENCE=./samples/SBA (1).pdf
```

Use env variables rather than hardcoding model names. If `gpt-5.4` is not available in the user's account, fall back to the nearest suitable high-quality OpenAI model through config without changing the architecture.

## Existing Dataset And Demo Cases

Use `sar_demo_dataset/sar_demo_minimal.db`.

The source schema already includes:

- `customers`
- `accounts`
- `employees`
- `cases`
- `alert_rules`
- `alerts`
- `transactions`
- `alert_transactions`
- `entities`
- `adverse_media`

The current dataset intentionally contains three linked demo cases:

- `CASE001` / Amit Verma
- `CASE002` / Vertex Exports Pvt Ltd
- `CASE003` / Pooja Iyer

These are intentionally linked:

- `CASE001` feeds funds into `CASE002`
- `CASE002` feeds funds into `CASE003`

The real demo must be based on these dataset cases, not on placeholder IDs shown in static mockups.

If the mockup contains names like `CASE-20260219-ND` or other static sample text, treat that as visual wireframe content only. Use the seeded dataset for actual runtime values.

## Fast Data Strategy

Use the simplest persistence strategy:

1. Keep `sar_demo_minimal.db` as the primary database.
2. Do not modify the existing schema unless absolutely unavoidable.
3. Store app-state writes in lightweight file-backed artifacts such as JSON or JSONL under a local app data directory.
4. Keep factual reads in SQLite and keep workflow or audit state in simple local artifacts.

Do not split the app across multiple databases.

## Roles And Access

There are two roles:

- `ANALYST`
- `PO`

Fast acceptable implementation:

- a seeded demo login screen, or
- a role switcher if faster, provided routes and actions are still protected

RBAC rules:

- Analyst can view and work analyst-side cases before submission.
- Analyst can edit data-assembly review state, STR autofill draft, and narrative draft.
- Analyst can submit a case to PO.
- Analyst cannot edit a case after submission unless it is returned for information.
- PO can view submitted cases routed for review.
- PO can request information or approve.
- PO actions are decision-oriented and should not directly modify source facts.

Route guards must enforce this behavior, not just hidden buttons.

## Workflow State Machine

Implement the workflow explicitly.

Recommended stage values:

- `OPEN`
- `IN_PROGRESS`
- `PENDING_REVIEW`
- `SUBMITTED`
- `RFI_REQUESTED`
- `PO_APPROVED`

Minimum transitions:

- Analyst opens case -> `OPEN` or `IN_PROGRESS`
- Analyst saves work across stages
- Analyst submits -> `PENDING_REVIEW` or `SUBMITTED`
- PO requests information -> case returns to analyst-editable state
- PO approves -> final approved state

Use whichever names you want internally, but stay consistent across backend, UI, and tests.

## Required App-State Capabilities Without Schema Changes

The dataset DB does not contain all the mutable application state the product needs. Do not solve this by expanding the schema unless you truly must.

Instead, implement these capabilities using lightweight local artifacts such as JSON files, JSONL logs, or per-case documents:

- STR autofill draft storage
- narrative draft storage
- paragraph trace storage
- prompt-run metadata storage
- compliance-check result storage
- adverse-media review state
- case stage events
- immutable submission snapshots
- notification or routing records if needed
- PO review notes and decisions

Recommended file layout:

- `runtime_state/cases/<caseId>/str_autofill.json`
- `runtime_state/cases/<caseId>/narrative.json`
- `runtime_state/cases/<caseId>/submission_snapshot.json`
- `runtime_state/cases/<caseId>/po_review.json`
- `runtime_state/audit_ledger/<caseId>.jsonl`

If you prefer a different local layout, that is fine. The important requirement is that the capabilities exist without turning schema work into a blocker.

## Local Document Retrieval Strategy

Do not introduce `ChromaDB`.

Instead:

1. Extract text from local docs in `samples/` and `rag_docs/`
2. Chunk the text
3. Store chunks in SQLite or a local JSON artifact
4. Implement lightweight retrieval with simple keyword scoring or embeddings if fast enough

The retriever is only for:

- SAR narrative guidance
- compliance reminders
- template rules
- crypto-specific mandate checks

It is not a source of case facts.

## OpenAI Usage

Use OpenAI for:

- grounds-of-suspicion narrative drafting
- controlled section regeneration
- analyst copilot Q&A
- optional compliance checking

Use structured prompts and structured JSON outputs where useful.

Do not allow unsupported claims.

## Required Routes

Recommended frontend routes:

- `/login`
- `/analyst/dashboard`
- `/cases/:caseId/data-assembly`
- `/cases/:caseId/str-autofill`
- `/cases/:caseId/grounds-of-suspicion`
- `/cases/:caseId/pre-submission-validation`
- `/cases/:caseId/submission-confirmed`
- `/po/dashboard`
- `/po/cases/:caseId/review`
- `/po/cases/:caseId/decision`

## Mockup Files To Follow

These files must be referenced explicitly while building the corresponding features:

- `screen_mockups/L1_Analyst_Dashboard_1.html`
- `screen_mockups/Data_Assembly_3.html`
- `screen_mockups/STR Autofill_3b.html`
- `screen_mockups/grounds_of_suspicions_4.html`
- `screen_mockups/presubmission_validation_5.html`
- `screen_mockups/submitted_6.html`
- `screen_mockups/P0_Dashboard_2.html`
- `screen_mockups/P0_review_7.html`
- `screen_mockups/P0_submit_8.html`

Important note:

- some static mockup links use legacy filenames not present in the repo
- treat those as wireframe intent only
- keep the visual structure, but wire the real app to the routes and files above

## Screen-By-Screen Requirements

---

## Screen 1: L1 Analyst Dashboard

Visual source:

- `screen_mockups/L1_Analyst_Dashboard_1.html`

Purpose:

- primary analyst work queue
- case-first dashboard, not a raw transaction explorer
- one parent row = one case
- expanding a case shows its alerts
- under each alert, show linked transactions

Use:

- `sar_demo_dataset/sar_demo_minimal.db`
- `sar_demo_dataset/demo_case_examples.md`
- `sar_demo_dataset/rule_thresholds.csv`

Important demo behavior:

- the seeded dataset contains assignment values that may not perfectly match a strict analyst queue
- for the MVP, show all active demo cases visible to the analyst workflow
- do not accidentally hide `CASE001`, `CASE002`, or `CASE003`

Tables to use:

- `cases`
- `customers`
- `employees`
- `alerts`
- `alert_rules`
- `alert_transactions`
- `transactions`
- `adverse_media`

### KPI cards

Use live values, not mockup hardcoded values.

- `Open alerts`
  - count alerts for cases not fully closed
- `Breaching SLA`
  - derive from `cases.start_time`
  - demo rule:
    - `OPEN`: 72 hours
    - `IN_PROGRESS`: 72 hours
    - `PENDING_REVIEW`: 24 hours
- `In progress`
  - count active analyst cases
- `Pending PO review`
  - count cases waiting for PO

### Subtitle

Make the subtitle dynamic:

- `{active_case_count} Active Cases ({open_alert_count} Alerts) · Sorted by SLA deadline`

### Filters

- `Status` -> `cases.stage`
- `Trigger type` -> `alerts.rule_id` or `alerts.alert_name`
- `Customer segment` -> `customers.customer_type`

### Parent row columns

- `Case ID` -> `cases.case_id`
- `Customer` -> `customers.name`
- `Total Alerts` -> count of alerts for the case
- `Total Amount` -> sum of distinct linked transaction amounts across the case
- `Max Risk` -> deterministic demo score or clear severity badge
- `SLA Remaining` -> derived from `cases.start_time`
- `Status` -> workflow stage

### Max risk derivation

Make this a deterministic, explainable score from 0 to 100.

- base from customer risk tier:
  - `LOW` = 25
  - `MEDIUM` = 50
  - `HIGH` = 70
- add case-flag weights:
  - `pep_match` = +12
  - `smurfing` = +10
  - `high_velocity` = +8
  - `aml_screening_list` = +10
  - `cross_border_remittance` = +6
- add alert-intensity weight:
  - `+4` per alert, capped at `+12`
- add rule-severity bonuses:
  - `R14` = +8
  - `R08` = +6
  - `R12` = +6
  - `R05` = +5
  - `R01`, `R04`, `R06` = +3 each
- cap at `100`

Expose explainability in API and UI:

- `riskScore`
- `riskLevel`
- `riskFactors`
- `riskExplanation`

Use `rule_thresholds.csv` to explain rules. Do not rerun the full rule engine.

### Expanded row behavior

When a case expands:

- show each alert section
- each alert shows:
  - `alert_id`
  - `alert_name`
  - `alert_text`
  - `triggered_at`
- under each alert show linked transactions from `alert_transactions` plus `transactions`

For each transaction row show:

- `transaction_id`
- timestamp
- payment format
- scenario group
- signed amount
- channel
- counterparty where available

### API requirements

Implement:

- `GET /api/dashboard/summary`
- `GET /api/cases`
- `GET /api/cases/:caseId/alerts`
- `GET /api/cases/:caseId`

### Safe fallbacks

- `SLA Remaining` -> `N/A`
- `Max Risk` -> customer `risk_tier`
- `Breaching SLA` -> `0`
- no linked transactions -> show empty state

### Must-work actions

- expand row
- search
- click case ID or row to open case workspace

---

## Screen 2: Data Assembly

Visual source:

- `screen_mockups/Data_Assembly_3.html`

Purpose:

- case-centric detail review
- assemble subject profile
- review KYC
- review suspicious transactions
- review prior alerts
- inspect linked entities
- review adverse media
- continue to STR autofill

Use route param `caseId`.

Tables to use:

- `cases`
- `customers`
- `accounts`
- `employees`
- `alerts`
- `alert_rules`
- `alert_transactions`
- `transactions`
- `entities`
- `adverse_media`

### Header mapping

- breadcrumb: `Cases > Data Assembly`
- case ID -> `cases.case_id`
- customer name -> `customers.name`
- customer type badge:
  - `INDIVIDUAL` -> `PERS`
  - `ENTITY` -> `ENT`
- PII masking toggle:
  - active by default
- SLA:
  - same derivation as dashboard

### Left panel tabs

#### 1. KYC Profile

Show:

- customer name
- customer ID and PAN, masked by default
- occupation or business
- declared income
- risk tier
- KYC status
- watchlist status
- last CDD refresh
- primary account details

Primary account source:

- `cases.primary_account_number`
- `accounts`

#### 2. Transactions

Show only case-linked suspicious or review-relevant transactions first.

Build from:

- `alerts`
- `alert_transactions`
- `transactions`

Rules:

- fetch all alerts for the case
- fetch all linked transactions
- deduplicate by `transaction_id`
- sort by `txn_timestamp`

Show:

- transaction ID
- timestamp
- payment format
- direction
- signed amount
- branch city
- channel
- scenario group
- counterparty customer ID if available

#### 3. Prior Alerts

Current DB limitation:

- there is no dedicated historical closed-alert table

Recommended behavior:

- show alerts from the same customer in other cases if any exist
- otherwise show:
  - `No prior historical alerts available in demo dataset`

Do not invent a fake history system.

#### 4. Entity Graph

Do not build a heavy graph backend.

Build a lightweight network preview from:

- subject customer
- primary account
- counterparties in linked suspicious transactions
- relevant banks or entities

Return simple graph-ready nodes and edges.

### Right panel: Adverse Media

Purpose:

- let the analyst review whether adverse media hits are relevant before moving to STR autofill

Source:

- `adverse_media`

Show:

- source
- headline
- article date
- match confidence

Do not build a scraper.

Use seeded rows for the demo.

If enrichment is ever added, it must be backend-only and human-reviewed before persistence.

### Adverse media review actions

The mockup shows actions like:

- `Mark Relevant`
- `Marked Relevant`

The current source table does not contain review state, so add lightweight app persistence for it.

Recommended persistence shape:

- `runtime_state/cases/<caseId>/adverse_media_review.json`
  - or an equivalent lightweight store keyed by `case_id` and `adverse_media_id`
  - store:
    - `case_id`
    - `adverse_media_id`
    - `review_status`
    - `reviewed_by`
    - `reviewed_at`

Persist analyst review state if possible. If time is tight, keep the action thin but real.

### Continue button gating

`Verified. Continue to STR Autofill` should allow forward navigation only when:

- case exists
- customer exists
- primary account exists
- at least one alert exists
- at least one linked transaction exists
- adverse media section was loaded, even if empty

Do not require actual adverse media hits.

If there are zero rows:

- show `No adverse media results available for this subject`
- still allow continue

### API requirements

Implement:

- `GET /api/cases/:caseId`
- `GET /api/cases/:caseId/kyc`
- `GET /api/cases/:caseId/transactions`
- `GET /api/cases/:caseId/alerts`
- `GET /api/cases/:caseId/prior-alerts`
- `GET /api/cases/:caseId/entity-graph`
- `GET /api/cases/:caseId/adverse-media`
- `PUT /api/cases/:caseId/adverse-media-review`
- `POST /api/cases/:caseId/data-assembly/complete-stage`

### Adverse media endpoint notes

For `GET /api/cases/:caseId/adverse-media`:

- resolve the case
- resolve the case subject from `cases.customer_id`
- return media hits tied to the subject or otherwise clearly linked in the dataset
- also return any saved review state so the UI can show `Mark Relevant` vs `Marked Relevant`

### Must-work actions

- tab switching
- PII masking toggle
- mark relevant or equivalent review action
- continue to STR autofill

### Optional/non-core

- a sophisticated graph viewer
- live external media lookup

---

## Screen 3: STR Form Autofill

Visual source:

- `screen_mockups/STR Autofill_3b.html`

Purpose:

- deterministically populate the non-narrative STR sections
- show what was autofilled
- allow analyst edits where data is missing
- save the draft before moving to narrative generation

This screen must be deterministic and low-risk.

Do not call the LLM for this screen.

Use:

- `sar_demo_dataset/sar_demo_minimal.db`
- `samples/SBA (1).pdf`

### Data sources

From SQLite:

- `cases`
- `customers`
- `accounts`
- `alerts`
- `alert_rules`
- `alert_transactions`
- `transactions`
- `employees`
- `adverse_media`

From static config:

- reporting entity name
- FIU-IND entity ID
- branch metadata if not stored in DB
- principal officer details if not stored in DB

### Autofill sections

#### Part 1: Details of Reporting Entity

Use static config, not per-case DB rows.

Fields:

- Name of Reporting Entity
- Entity ID
- Entity Category

#### Part 2: Details of Principal Officer

Use static config unless later modeled separately.

Do not infer PO identity from the case assignee.

#### Part 3: Details of Reporting Branch / Location

Use:

- primary account branch city from `accounts`
- config for bank-specific reporting codes if available

If branch code is missing:

- leave blank
- make editable

#### Part 4: Details of Individuals

Populate from the case subject and any directly supported individuals.

Minimum safe rule:

- always include the primary subject row
- role = `Primary Subject`

Mask sensitive fields by default in the UI.

#### Part 5: Details of Legal Persons / Entities

If the case subject is an entity, include it here where appropriate.

Only include additional entities if directly supported by the data.

Do not invent relationship rows.

#### Part 6: Details of Accounts

Autofill from:

- `cases.primary_account_number`
- `accounts`

Always include the primary account.

You may include directly connected accounts only if they are deterministically case-relevant.

#### Part 7: Grounds of Suspicion summary field

Do not fully generate narrative text here.

At most, preserve a short deterministic summary or staged placeholder indicating that the detailed narrative will be created in the Grounds of Suspicion screen.

#### Part 8: Details of Suspicious Transactions / Action Taken

This is one of the most important sections on this screen.

Build from:

- `cases`
- `alerts`
- `alert_transactions`
- `transactions`

Behavior:

- gather all transactions linked to case alerts
- deduplicate by `transaction_id`
- sort chronologically
- show only case-relevant suspicious transactions

Fields:

- transaction ID
- date
- mode or type
- amount

Keep source facts read-only. If the analyst annotates rows, persist annotations separately.

### Autofill policy

Autofill confidently only when directly supported:

- case ID
- customer name
- PAN if present
- customer type
- occupation or business
- declared income
- risk tier
- primary account
- linked suspicious transactions
- branch city

Leave blank but editable when unavailable:

- reporting codes
- branch codes
- secondary people not modeled
- any regulatory field not represented in the data

Never infer:

- legal identifiers not present
- principal officer identity from assignee
- transaction purpose text unless already stored
- unsupported people or entities

### API requirements

Implement:

- `GET /api/cases/:caseId/str-autofill`
- `PUT /api/cases/:caseId/str-autofill`
- `POST /api/cases/:caseId/str-autofill/refresh`
- `POST /api/cases/:caseId/str-autofill/complete-stage`

Persist:

- current values
- autofilled vs manually edited state
- last updated timestamp
- last updated user

### Must-work actions

- load autofill values
- edit blank or editable fields
- save draft
- continue to Grounds of Suspicion

---

## Screen 4: Grounds of Suspicion

Visual source:

- `screen_mockups/grounds_of_suspicions_4.html`

Purpose:

- the main narrative generation workspace
- generate a high-quality, regulator-ready grounds-of-suspicion draft
- let the analyst review and edit it
- show why the AI wrote what it wrote

This is the most important screen in the product.

Use:

- `sar_demo_dataset/sar_demo_minimal.db`
- `samples/sar_guide_good_and_bad_examples.pdf`
- `samples/SBA (1).pdf`
- local docs in `rag_docs/` if present
- `sar_demo_dataset/bank_reference.csv`
- `sar_demo_dataset/rule_thresholds.csv`

### Core product principle

The generator must not improvise facts.

The narrative must be generated from:

1. case facts from SQL
2. alert-linked transactions from SQL
3. KYC and account data from SQL
4. adverse media from SQL
5. prior alerts if available
6. compliance guidance from local retrieval
7. a fixed narrative template

### Narrative quality requirements

Use `samples/sar_guide_good_and_bad_examples.pdf` as the main writing-quality and compliance guidance source.

The narrative should be:

- concise
- chronological
- factual
- specific about dates and amounts
- explicit about source and application of funds where supported
- clear about why the activity is unusual
- free from generic filler
- free from `see attached`
- free from unresolved placeholders

Use the guidance doc's logic around:

- five Ws plus how
- chronological organization
- introduction, body, conclusion structure
- explicit dates and amounts
- clear suspicious pattern explanation

### Main responsibilities

This screen must support:

- display of assembled case facts and risk drivers
- narrative draft generation
- analyst editing
- section regeneration
- audit trace visibility
- prompt run persistence
- lightweight copilot Q&A
- routing simple factual questions to SQL-backed answers where possible
- local retrieval for compliance reminders
- saving drafts

### Inputs to assemble before calling OpenAI

Build a structured dossier containing:

- case summary
- subject summary
- account summary
- triggered alerts
- linked suspicious transactions
- prior alerts if available
- adverse media rows and analyst relevance state
- risk factors and explanation
- rule descriptions from `rule_thresholds.csv`
- bank type enrichment from `bank_reference.csv`

### Crypto-specific mandate

If any case-linked transaction touches a bank whose `Bank_Type = Crypto Exchange`, the narrative must include a standardized paragraph that:

- explicitly states that funds moved to a crypto exchange
- references the source of fiat funds
- keeps the wording factual
- does not speculate beyond the available data

This matters especially for `CASE003` and any similar flow touching Binance-like rows from `bank_reference.csv`.

### Narrative structure

Recommended output structure:

1. Introduction
   - who the subject is
   - why the case was escalated
   - summary of suspicious pattern
2. Body
   - chronological transaction pattern
   - key dates, amounts, counterparties, and alert facts
   - source and application of funds
   - adverse media or contextual factors if supported
3. Conclusion
   - why the activity is unusual
   - why it merits STR filing
   - ongoing monitoring or investigation note if appropriate

### Copilot behavior

The copilot may:

- explain the generated narrative
- answer `why is this suspicious?`
- answer `which transactions were used?`
- answer `why is this paragraph included?`

For simple factual questions, prefer SQL-backed responses over LLM generation.

### Regenerate behavior

The `Regenerate section` action must be controlled:

- regenerate only the selected section
- preserve the factual dossier
- preserve audit trace and prompt run history
- do not wipe analyst edits outside the target section

### Audit requirements on this screen

Persist at least:

- dossier or source references used
- prompt payload or prompt version
- retrieved guidance chunks
- generated paragraph text
- paragraph-to-source references
- user edits after generation

### API requirements

Implement:

- `GET /api/cases/:caseId/grounds`
- `POST /api/cases/:caseId/narrative/generate`
- `POST /api/cases/:caseId/narrative/regenerate-section`
- `PUT /api/cases/:caseId/narrative`
- `GET /api/cases/:caseId/narrative/audit`
- `POST /api/cases/:caseId/narrative/copilot`
- `POST /api/cases/:caseId/narrative/compliance-check`
- `POST /api/cases/:caseId/narrative/complete-stage`

### Must-work actions

- generate draft
- edit draft
- regenerate a section
- inspect audit context in some visible form
- continue to pre-submission validation

### Optional/non-core

- a rich prompt console with advanced diffing
- complex multi-tab reasoning UI beyond what is needed to explain the draft

---

## Screen 5: Pre-submission Validation

Visual source:

- `screen_mockups/presubmission_validation_5.html`

Purpose:

- final analyst-side validation before submission to PO
- verify prior stages are complete
- surface blockers and warnings
- lock and submit the case

This screen validates. It does not regenerate.

Use:

- `sar_demo_dataset/sar_demo_minimal.db`
- saved STR autofill data
- saved narrative draft
- saved adverse media review state
- saved audit traces

### Validate all of the following

#### Stage 1

- case exists
- subject profile is assembled
- at least one alert exists
- at least one linked suspicious transaction exists
- adverse media section was reviewed or explicitly had no results

#### Stage 2

- STR autofill draft exists
- required sections are saved:
  - Part 1
  - Part 2
  - Part 3
  - Part 4
  - Part 6
  - Part 8

#### Stage 3

- narrative draft exists
- narrative is not empty
- narrative passes minimum quality checks
- compliance check passed
- paragraph traces exist
- audit linkage exists

#### Submission routing

- analyst still has edit rights
- analyst RBAC permits submission
- case is not already submitted
- PO route exists

#### SLA

- show whether the case is within SLA
- warning if close to breach
- do not block purely on warning unless your chosen rule says so

### Hard blockers

- no case found
- no narrative draft
- no STR autofill draft
- no linked suspicious transactions
- compliance failure on mandatory requirements
- missing PO route
- case already locked or submitted
- RBAC failure
- crypto case missing required standardized crypto paragraph

### Soft warnings

- SLA close to breach
- no prior alerts
- no adverse media hits
- optional STR fields blank
- low word count if fact coverage is still acceptable

### Narrative compliance checks

At minimum verify that the narrative:

- references the subject
- describes suspicious activity
- includes dates and amounts
- describes source and application of funds where supported
- explains why the activity is unusual
- is chronological
- does not contain placeholders
- does not contain `see attached`

### Submission snapshot

On submit, persist an immutable snapshot including:

- case details
- STR autofill values
- final narrative text
- analyst notes if any
- linked alerts
- linked transactions
- adverse media used
- generation traces
- compliance results
- submitting analyst
- submitted timestamp

### API requirements

Implement:

- `GET /api/cases/:caseId/presubmission-validation`
- `POST /api/cases/:caseId/presubmission-validation/run`
- `POST /api/cases/:caseId/submit`

### Submit behavior

`Submit to Principal Officer` must:

1. validate current saved state
2. block if hard blockers remain
3. persist immutable snapshot
4. lock analyst editing
5. update workflow stage
6. create workflow event
7. create PO notification
8. route to submission confirmation

### Must-work actions

- load validation screen
- show clear pass or warning rows
- go back to editor
- submit to PO

---

## Screen 6: Submission Confirmed

Visual source:

- `screen_mockups/submitted_6.html`

Purpose:

- confirm successful analyst submission
- show final summary
- make it clear the case is now locked

This screen is read-only.

Render it only for successfully submitted cases.

Show:

- confirmation that submission succeeded
- case is locked for analyst edits
- case is in PO queue
- filing summary from the frozen snapshot:
  - `caseId`
  - subject name
  - masked ID if available
  - risk level or score
  - value at risk
  - SLA status
  - submitted timestamp
  - submitted by
- PO notification status

Use snapshot values, not mutable draft state.

### API requirements

Implement:

- `GET /api/cases/:caseId/submission-confirmation`

### Must-work actions

- `Return to Case Queue`

Returning should refresh the analyst queue and keep the case non-editable.

---

## Screen 7: Principal Officer Dashboard

Visual source:

- `screen_mockups/P0_Dashboard_2.html`

Purpose:

- primary PO work queue
- show cases pending PO action
- show summary KPIs and a believable PO dashboard

Required behavior:

- list cases pending PO review
- support search and status filters
- show analyst name
- show subject or case summary
- show submission time
- show whether SLA is close to breach
- click into PO review

This screen needs more than a queue. It is the PO command center and must make global exposure legible in a way that is believable in a demo.

### KPI card mapping

Use live or derived values, not mockup placeholders:

- `Total open cases`
  - count all non-approved cases visible to the PO workflow
- `Total Value at Risk`
  - sum a defensible per-case `valueAtRisk`
  - recommended MVP rule:
    - use the sum of distinct suspicious linked transaction amounts for the case
    - expose the exact calculation in API response
- `Avg resolution time`
  - use stage events or submission timestamps if available
  - otherwise derive from `cases.start_time` to current state for closed or approved cases
- `Pending your approval`
  - count cases in `PENDING_REVIEW` or equivalent PO queue state

### Global Risk And Origination Map

The map in `screen_mockups/P0_Dashboard_2.html` is currently only a visual sketch. Replace it with a real, deterministic geospatial view.

The build should not depend on remote map tile APIs or flaky external services.

Use one of these safe implementations:

1. preferred:
   - a locally bundled world GeoJSON or TopoJSON asset rendered in the frontend
   - SVG or canvas-based map rendering
2. acceptable:
   - a lightweight React world-map library only if it has minimal dependency risk and no external API key requirement

Do not rely on Google Maps, Mapbox, or live tile servers for the MVP.

### Geospatial data model

Because the demo dataset does not provide full latitude and longitude for every event, add a small deterministic geo-reference layer in the app.

Create a local reference file such as:

- `app_geo_reference.json`
- `backend/app/reference/geo_reference.py`
- or equivalent

This reference layer should map known demo locations and institutions to:

- `countryCode`
- `countryName`
- `city`
- `lat`
- `lng`
- `riskRegionType`

Use the following sources to resolve locations:

1. `transactions.branch_city`
   - for domestic reporting-bank branch or cash-point geography
2. `transactions.from_bank` and `transactions.to_bank`
   - enrich using `sar_demo_dataset/bank_reference.csv`
3. known demo-country overrides
   - for counterparties or narrative destinations implied by the dataset, mockup, or case storyline
4. case-linked adverse media geography if clearly supported
   - only when factual and not speculative

### Map event aggregation logic

The PO map should not show arbitrary pins. It should show aggregated, explainable hotspots built from actual case-linked activity.

For each case, derive map points such as:

- origin locations of suspicious inbound flows
- destination locations of suspicious outbound flows
- sanctions or elevated-risk jurisdictions touched by linked transactions
- reporting-bank branch or primary domestic anchor

Each map node should expose:

- `locationKey`
- `label`
- `lat`
- `lng`
- `country`
- `city`
- `linkedCaseCount`
- `linkedAlertCount`
- `totalAmount`
- `highestRiskLevel`
- `riskReason`
- `caseIds`

### Map severity rules

Recommended severity mapping:

- `critical`
  - sanctioned or blacklist jurisdiction
  - or crypto exchange plus additional high-risk pattern
  - or multiple cases linked to the same risky geography
- `elevated`
  - cross-border pass-through destination
  - or high-value destination with poor source-of-funds clarity
  - or adverse media-linked geography
- `standard`
  - domestic reporting-bank or ordinary low-risk geography used only as context

### Map UX requirements

The map must support:

- realistic node placement at correct coordinates
- hover tooltip with factual summary
- click to filter queue or open related cases
- legend for `critical`, `elevated`, and `standard`
- empty-state fallback if too little geography is available

Tooltip content should be factual and explainable, for example:

- jurisdiction or city
- number of linked cases
- total suspicious volume
- dominant typology
- why the node is red or amber

### Geography fallback strategy

If exact geolocation is unavailable:

- fall back to country centroid for foreign jurisdictions
- fall back to branch city centroid for domestic activity
- never invent precise coordinates beyond the local reference mapping
- label fallback resolution source in the API, for example:
  - `resolutionSource = bank_reference`
  - `resolutionSource = branch_city`
  - `resolutionSource = static_demo_override`

### SAR inventory chart

The weekly SAR chart must use real or deterministically derived workflow data:

- cases submitted by day
- approvals by day
- optional 7-day average or rolling average

Do not hardcode the sample bars from the mockup.

### Action Required panel

This panel should be a live prioritized queue, not static cards.

Prioritization should sort by:

1. SLA urgency
2. risk score
3. value at risk
4. submission age

Each row should show:

- case ID
- subject
- analyst
- SLA remaining
- reason for urgency
- direct `Review` action

### Analyst performance panel

This should be a thin but real operations view.

Use:

- active case counts by analyst
- average turnaround time
- SLA-risk indicator derived from current queue and stage timing

If historical data is too sparse, use current workflow events and document that it is based on demo-window data.

### API requirements

Implement:

- `GET /api/po/dashboard/summary`
- `GET /api/po/cases`
- `GET /api/po/map-risk`
- `GET /api/po/analytics/weekly-filings`
- `GET /api/po/analytics/analyst-performance`

### Must-work actions

- view queue
- search
- open a case for review
- hover and click map nodes
- use map clicks to filter or focus the queue

### Optional/non-core

- animated route arcs between nodes
- time-lapse playback of case geography

---

## Screen 8: Principal Officer Review

Visual source:

- `screen_mockups/P0_review_7.html`

Purpose:

- review the full immutable analyst submission package
- inspect autofill, narrative, validation status, and audit evidence
- decide whether to approve or request information

Show:

- submission snapshot summary
- frozen STR autofill values
- final narrative text
- linked alerts and suspicious transactions
- adverse media used
- validation result summary
- audit trace references
- analyst name and submit timestamp

PO view is read-only for analyst-produced content.

### Layout contract

The left pane should behave as an immutable review dossier with tabs for:

- `Summary & Risk`
- `KYC Profile`
- `Transactions`
- `Prior Alerts`
- `Adverse Media`

The right pane should behave as the PO narrative review and decision workspace.

### Summary And Risk tab requirements

This tab must show:

- factual case summary
- AI or deterministic risk-feature breakdown
- matched typologies
- submission metadata
- audit-ledger excerpt for the case

The risk bars in the mockup must be backed by real factors from the case and not decorative percentages.

Expose for each factor:

- name
- contribution weight
- factual basis
- source references

### Transaction review requirements

The PO must be able to inspect the exact suspicious transactions that drove the narrative.

For each row, show:

- transaction ID
- date and timestamp
- amount
- direction
- origin and destination context
- linked alert IDs
- whether it was explicitly cited in the final narrative

### Narrative review requirements

The right pane must support:

- `Final version`
- `AI draft`
- `Diff view`

These cannot be decorative toggles. They must work.

Implementation guidance:

- `Final version`
  - the submitted analyst-reviewed version
- `AI draft`
  - the most recent raw generated version before analyst edits
- `Diff view`
  - a human-readable comparison between AI draft and final submitted version

Do not require a heavy diff engine. A paragraph-level or sentence-level diff is sufficient if reliable.

### Highlighted sentence / rationale behavior

When a sentence is highlighted, the PO should be able to inspect why it exists.

At minimum expose:

- source transactions
- source alerts
- retrieved guidance chunks if used
- paragraph trace ID
- whether the sentence was AI-generated, analyst-edited, or analyst-added

### Prompt console / trace inspection

The PO screen should expose a thin but real way to inspect the drafting provenance.

Minimum acceptable implementation:

- a drawer or modal showing prompt metadata
- model used
- generation timestamp
- retrieval chunks used
- paragraph trace links

Do not expose secrets or raw API keys.

### Comments and return flow

PO comments must be persisted and attributed.

If PO clicks `Return`:

- require a non-empty comment
- persist return reason
- create ledger event
- move case to `RFI_REQUESTED`
- unlock the analyst's editable stages
- preserve immutable submitted snapshot while opening a new working cycle for the analyst

### Approval gating

Before `Approve & Export to FIU`, re-check:

- case is still in a reviewable state
- latest submission snapshot exists
- XML export payload can be built successfully
- audit ledger for the case is internally consistent
- required compliance validations passed

If any of these fail, block approval with a concrete reason.

### Actions

- `Approve`
- `Request Information`

If time is tight, omit a third `Reject` state and use `Request Information` as the send-back path.

### Request information behavior

If PO requests information:

- create a PO review record
- persist PO notes
- move case into an analyst-visible RFI state
- unlock analyst editing for required stages

### API requirements

Implement:

- `GET /api/po/cases/:caseId/review`
- `POST /api/po/cases/:caseId/request-information`
- `GET /api/po/cases/:caseId/diff`
- `GET /api/po/cases/:caseId/audit-ledger`
- `GET /api/po/cases/:caseId/paragraph-traces`
- `POST /api/po/cases/:caseId/validate-approval`

### Must-work actions

- inspect submitted package
- enter PO comments
- request information
- switch between final, AI draft, and diff views
- inspect sentence or paragraph rationale
- continue to approval flow

---

## Screen 9: Principal Officer Final Decision

Visual source:

- `screen_mockups/P0_submit_8.html`

Purpose:

- final PO decision and export screen
- confirm approval
- provide export artifacts for the demo

### On approve

When the PO approves:

- create final PO review record
- mark case as approved
- create final workflow event
- keep submission snapshot immutable
- show final confirmation state

### Export requirements

Implement a real export flow that supports the demo reliably and with low dependency risk.

- generate downloadable XML representing the final filing package
- generate a demo-friendly audit dossier PDF
- generate ledger JSON export
- show checksum fields and artifact hashes

Use low-risk implementation choices:

- XML generation:
  - use Python standard library XML tooling such as `xml.etree.ElementTree`
  - avoid brittle schema-generation dependencies unless truly needed
- PDF generation:
  - prefer a reliable library with low runtime friction such as `reportlab`
  - do not use PDF stacks that commonly fail due to native OS dependencies
- artifact hashing:
  - compute SHA-256 in backend and persist it with the exported artifact record

For the MVP:

- `Download XML` must work
- `Internal Audit Dossier PDF` must work
- `Export full JSON` for the ledger must work
- `Upload directly to FIU portal` should be implemented as one of:
  - a safe local stub that opens a confirmation page and records an export-attempt ledger event
  - or an explicitly labeled non-integrated action that still records the user intent in the ledger

Do not leave the export buttons dead.

### Export payload rules

The XML and PDF must be generated from the immutable submission snapshot plus final PO decision data, not from mutable live case state.

This prevents drift between what was reviewed and what was exported.

### Audit dossier PDF contents

The PDF should include:

- case metadata
- subject summary
- STR autofill summary
- final approved narrative
- linked alerts and key transactions
- adverse media used
- validation summary
- PO decision metadata
- artifact hashes
- audit ledger excerpt

### Approval commit behavior

When PO approves:

- generate final approved artifact bundle
- persist artifact metadata
- hash each artifact
- append ledger events for approval and each export artifact
- seal the case review cycle
- keep prior snapshots immutable

### API requirements

Implement:

- `POST /api/po/cases/:caseId/approve`
- `GET /api/po/cases/:caseId/decision`
- `GET /api/po/cases/:caseId/export/xml`
- `GET /api/po/cases/:caseId/export/audit-dossier`
- `GET /api/po/cases/:caseId/export/ledger-json`
- `POST /api/po/cases/:caseId/export/fiu-upload-attempt`

### Must-work actions

- approve
- show final approved state
- download XML
- download audit PDF
- download ledger JSON

---

## Cross-Cutting Logic

## SLA Logic

Use a simple demo SLA derived from `cases.start_time`:

- `OPEN`: 72 hours
- `IN_PROGRESS`: 72 hours
- `PENDING_REVIEW`: 24 hours

Expose both human-friendly state and underlying explanation where useful.

## Total Amount On Dashboard

Sum distinct linked transactions per case to avoid double counting a transaction connected to multiple alerts.

## Search

Simple contains search is enough across:

- `cases.case_id`
- `customers.name`

## Rule Explainability

Use `sar_demo_dataset/rule_thresholds.csv` for plain-language descriptions of triggered rules and thresholds.

Do not rebuild the threshold engine.

## Crypto Detection

Use `sar_demo_dataset/bank_reference.csv` at runtime to detect whether any linked bank or counterparty bank is a crypto exchange.

If `Bank_Type = Crypto Exchange`:

- elevate explainability in dashboard and case detail
- require the standardized crypto paragraph in the narrative
- fail validation if the required paragraph is missing

## Adverse Media Review

Persist:

- relevance state
- reviewer
- review timestamp

The UI should visibly indicate whether a hit was reviewed and by whom if available.

## Audit Trail

The audit trail is one of the core product features, not just supporting metadata.

Implement it as a true append-only audit ledger.

The audit ledger should visibly explain:

- what facts were assembled
- what alerts and transactions were used
- what guidance chunks were retrieved
- what prompt was sent
- what paragraphs were generated
- what deterministic logic was applied

Keep it simple but real, and make it tamper-evident.

### Audit ledger design

Add a dedicated ledger artifact model, for example:

- `runtime_state/audit_ledger/<caseId>.jsonl`
  - each line is one append-only event with:
    - `event_id`
    - `case_id`
    - `review_cycle_id`
    - `stage`
    - `event_type`
    - `actor_type`
    - `actor_id`
    - `actor_name`
    - `created_at`
    - `payload_json`
    - `entity_type`
    - `entity_id`
    - `prev_event_hash`
    - `event_hash`
    - `artifact_hash`
    - `signature_label`

Recommended helper tables:

Recommended helper artifacts:

- `runtime_state/artifacts/<caseId>/`
  - exported XML, PDF, JSON, prompt bundles, snapshot bundles
- `runtime_state/cases/<caseId>/versions/`
  - versioned copies or references for narrative, autofill, comments, and review notes

### Canonical event hashing

Each event should be hashed from a canonical payload such as:

- case ID
- event type
- timestamp
- actor
- stage
- stable JSON payload
- previous event hash

This creates a simple hash chain:

- `event_hash = sha256(canonical_event_json + prev_event_hash)`

You do not need blockchain infrastructure. A deterministic hash chain inside SQLite is enough for the demo and is explainable.

### Minimum event coverage

Record events for at least:

- case opened
- data assembly loaded
- adverse media reviewed
- STR autofill generated
- STR autofill edited
- narrative generated
- narrative regenerated
- narrative manually edited
- compliance check run
- validation run
- submit to PO
- PO review opened
- PO comments added
- RFI returned
- PO approval
- XML generated
- PDF generated
- FIU upload attempted

### Manual edit capture

Manual changes are extremely important and must be first-class ledger events.

For narrative edits and STR autofill edits, persist:

- before value
- after value
- edit scope
- actor
- timestamp
- optional reason code if available

If storing full before and after text becomes too heavy, store:

- changed section identifier
- diff summary
- new canonical content
- content hash before and after

### AI generation capture

For initial STR narrative generation and every regeneration, persist:

- model name
- prompt version
- prompt payload hash
- retrieved chunk IDs
- source transaction IDs
- source alert IDs
- generated output hash
- latency
- token usage if available

### Snapshot and review-cycle model

Every analyst submission should create:

- immutable `submission_snapshot`
- new `review_cycle_id`

All PO review events and export artifacts should attach to that review cycle.

If the case is returned for information and resubmitted:

- create a new submission snapshot
- start a new review cycle
- preserve prior cycles

### Ledger UI expectations

The UI should support at least:

- compact timeline view
- filter by event type
- filter by actor
- export full ledger JSON
- show hashes for high-value events and artifacts

PO screens should be able to show:

- latest critical ledger events
- whether the ledger chain is internally valid
- artifact hashes for XML and PDF exports

### Ledger validation

Add a simple backend validation routine that:

- recalculates event hashes in order
- verifies `prev_event_hash` continuity
- verifies artifact hashes for generated files
- returns `valid`, `broken`, or `warning`

Approval and export should surface ledger validation status.

Examples:

- risk score should show factor breakdown
- SLA should show derivation logic
- adverse media review should show who marked it and when
- validation blockers should show exact failed rules
- narrative edits should show before or after hashes and actor
- XML and PDF exports should show persisted SHA-256 hashes

## Button And Interaction Expectations

The following actions must be truly functional in the MVP:

1. open the analyst dashboard and see live cases
2. expand a case and inspect alerts and linked transactions
3. open the case workspace
4. review data assembly tabs
5. review adverse media and mark relevance
6. continue to STR autofill
7. save STR autofill edits
8. generate grounds of suspicion
9. edit and regenerate narrative sections
10. run validation and see blockers or warnings
11. submit to PO
12. see analyst confirmation
13. open the PO dashboard
14. review the immutable submitted package
15. request information or approve
16. view realistic map hotspots in the PO dashboard
17. download XML on approval
18. download audit PDF and ledger JSON

The following can be thin real implementations or explicitly optional if they would derail the core demo:

- settings links
- notifications bell
- rich charts beyond current demo data
- advanced entity graph interactions
- advanced prompt console UX
- direct upload to FIU portal

## API Design Standards

All APIs should:

- return JSON except file downloads
- use typed request and response models
- return clear error messages
- avoid leaking internal stack traces
- shape data for direct frontend rendering where helpful

## Backend Structure

Keep backend route handlers thin.

Prefer:

- API router layer
- service layer for business logic
- DB layer or helpers
- LLM service wrapper
- retrieval service
- validation service
- export service

## Frontend Structure

Create a real application, not static HTML ports.

Keep:

- reusable layout shells
- role-specific sidebars
- screen-level containers
- shared cards and tables
- read-only vs editable states explicit

## Testing Requirements

Do not skip verification.

### Backend tests

Add focused tests for:

- dashboard aggregation
- case-linked transaction deduplication
- STR autofill mapping
- narrative compliance validation logic
- crypto-exchange detection using `bank_reference.csv`
- submission blocking rules

### Frontend tests

Add focused tests for:

- rendering of key data states
- validation blocker display
- locked vs editable states
- route protection by role

### Browser verification

If browser tooling is available, run smoke verification for:

1. analyst login or role selection
2. dashboard loads the three demo cases
3. open a case and continue through Data Assembly
4. save STR autofill
5. generate and save narrative
6. validate and submit to PO
7. switch to PO and review the submitted case
8. approve and download XML

If automated browser testing is too slow:

- still run browser-based manual verification
- document what was verified

## Execution Order

Implement in this order:

1. scaffold frontend and backend
2. wire SQLite reads and extend schema with app tables
3. implement seeded auth or role switching
4. implement analyst dashboard and case detail endpoints
5. implement Data Assembly
6. implement STR autofill with persistence
7. implement Grounds of Suspicion generation and audit trail
8. implement Pre-submission Validation and submission snapshot
9. implement Submission Confirmed
10. implement PO dashboard and PO review or decision flow
11. implement export
12. add focused automated tests
13. run the app and verify the full workflow

## Acceptance Criteria

The build is complete only when all of the following are true:

- the app runs locally
- both frontend and backend are implemented
- all 9 screens are functional
- the UI closely matches the supplied mockups
- the dashboard uses live data from the demo dataset
- the analyst can move a case through all analyst screens
- adverse media review works in a real persisted or minimally real way
- STR autofill persists edits
- narrative generation works through OpenAI
- the narrative quality is guided by `samples/sar_guide_good_and_bad_examples.pdf`
- audit trail is visible and persisted
- validation blocks truly incomplete submissions
- submission creates an immutable snapshot
- analyst loses edit access after submission
- PO can review the submitted package
- PO can request information or approve
- XML export works
- focused automated tests pass
- the README explains how to run and verify the app

## Final Build Instructions

- Be decisive.
- Prefer the fastest working solution that preserves intended behavior.
- Do not hallucinate missing facts.
- If a referenced guidance file is missing, use the best available local source and document the fallback.
- If a feature is too large, implement the thinnest real version instead of leaving a dead button.
- The core product demo must work end to end:
  1. analyst sees the case on the dashboard
  2. analyst opens the case and reviews data assembly plus media
  3. analyst completes STR autofill
  4. analyst generates and edits grounds of suspicion
  5. analyst checks pre-submission validation
  6. analyst submits
  7. PO reviews
  8. PO approves and exports

The final output must be a runnable, testable, end-to-end MVP, not a partial prototype.
