## SAR Demo Dataset

This folder contains a compact, derived dataset for SAR/STR narrative generation.

### Source files referenced

- `HI-Small_Trans.csv`: primary structural reference for the transaction file.
- `accounts.csv`: reference for account/customer style and account-level metadata patterns.
- `alerts.csv`: reference for suspicious flow motifs such as fan-in and rapid movement.

### Files created

- `transactions_single_bank.csv`: 50 transactions total, with 21 suspicious and 29 non-suspicious rows.
- `bank_reference.csv`: bank and platform ID lookup for transaction-level bank codes.
- `annexure_a_individuals.csv`: Annexure A fields for individual customers.
- `annexure_b_entities.csv`: Annexure B fields for legal persons/entities.
- `annexure_c_accounts.csv`: Annexure C account master with holder, related person, status, and FY totals.
- `demo_case_customers_single_bank.csv`: 6 hand-picked demo customers for SAR narrative walkthroughs.
- `rule_thresholds.csv`: explicit demo thresholds used in this mini dataset.
- `rule_hits.csv`: customer-level summary of triggered scenarios and narrative pointers.

### Design choices

- The transaction schema is based on `HI-Small_Trans.csv`, but the duplicated `Account` columns were clarified into `From Account` and `To Account`.
- `From Bank` and `To Bank` now use numeric-style bank IDs, aligned with the source dataset convention. Use `bank_reference.csv` to resolve those IDs to bank or platform names.
- All `AC...` accounts are modeled as accounts held with one reporting bank, `BARCLAYS_IN`.
- The `From Bank` and `To Bank` columns now reflect a single-bank perspective:
  - Bank ID `10` is the reporting bank, `BARCLAYS_IN`.
  - Other bank IDs represent external banks and crypto exchange platforms.
  - Bank ID `999001` is used for physical cash deposit and withdrawal points.
- Currency was standardized to `INR` so the rules align with the thresholds you listed.
- Extra columns were added to support SAR use cases: `Primary Account Number`, `Primary Customer ID`, `Counterparty Customer ID`, `Branch City`, `Channel`, `Account Status`, `Rule Tags`, and `Scenario Group`.
- The suspicious rows are intentionally concentrated into a few coherent cases:
- cash structuring below INR 10,00,000
- many-to-one fund transfer
- one-to-many fund transfer
- dormant account reactivation with rapid cash-out
- repeated cash deposits just below INR 50,000
- suspicious inflow followed by transfer to crypto exchange

### Most useful files for narrative generation

- Start with `demo_case_customers_single_bank.csv` to pick a case for the one-bank-view dataset.
- Use `rule_hits.csv` to understand why the customer is suspicious.
- Use `transactions_single_bank.csv` for chronology and transaction pattern description from the reporting bank perspective.
- Use `bank_reference.csv` to resolve transaction bank IDs to their real-world labels.
- Use Annexures A, B, and C for customer/entity/account details needed in the STR pack.
