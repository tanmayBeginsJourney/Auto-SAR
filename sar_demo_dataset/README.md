## SAR Demo Dataset

This folder now contains two layers:

- the original CSV-style SAR demo sources
- a new minimal relational demo build for frontend and SQLite use

The minimal build keeps transactions dense enough for review flows, but keeps the rest of the master data intentionally small.

## Minimal Relational Build

New files added for the frontend-oriented demo:

- `minimal_schema.sql`: minimal SQLite schema for cases, alerts, transactions, KYC-like customer data, employees, entities, and adverse media
- `minimal_seed.sql`: seed data for the minimal schema
- `sar_demo_minimal.db`: ready-to-query SQLite database built from the schema and seed
- `demo_case_examples.md`: the 3 best demo cases with alert and transaction walkthroughs

### Minimal build counts

- `customers`: 9
- `accounts`: 9
- `employees`: 6
- `cases`: 3
- `alert_rules`: 7
- `alerts`: 8
- `transactions`: 45
- `entities`: 13
- `adverse_media`: 3

### The 3 linked demo cases

- `CASE001` / `IND003`: cash structuring below INR 1000000 followed by a large transfer to `ENT001`
- `CASE002` / `ENT001`: pass-through entity account receiving the funds from `CASE001` and dispersing them to four beneficiaries
- `CASE003` / `IND011`: suspicious inflow from `CASE002` followed by a same-day Binance transfer

These 3 cases are intentionally linked so the frontend can show:

- a case list
- case detail
- case-to-alert mapping
- alert-to-transaction mapping
- KYC profile information
- adverse media
- simple entity-style transaction visualisation

## Important Scope Choice

This build does **not** include any rule calculation code or threshold generation scripts.

The thresholds are stored as reference data and the triggered alerts are already mapped into the database. That keeps the demo deterministic and easy to test before implementing rule logic later.

## Existing Source Files Kept For Reference

These earlier files are still present and were used as the source material for the minimal build:

- `transactions_single_bank.csv`
- `bank_reference.csv`
- `annexure_a_individuals.csv`
- `annexure_b_entities.csv`
- `annexure_c_accounts.csv`
- `demo_case_customers_single_bank.csv`
- `rule_thresholds.csv`
- `rule_hits.csv`

## Suggested Starting Points

- Open `demo_case_examples.md` to understand the 3 core review flows.
- Open `sar_demo_minimal.db` if you want the frontend to query direct relational values.
- Open `minimal_schema.sql` if you want to see the exact minimal table structure.
- Open `minimal_seed.sql` if you want to inspect or tweak the demo rows manually.
