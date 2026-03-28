# Demo Case Examples

These 3 cases are meant to exercise the full demo flow:

- open a `case_id`
- inspect the subject customer and account
- view triggered alerts
- open linked transactions
- understand the `why` in plain language
- optionally show adverse media and simple entity visualisation

## CASE001: Amit Verma

- `case_id`: `CASE001`
- `customer_id`: `IND003`
- `primary_account`: `AC1003`
- `scenario`: Cash structuring followed by large outbound layering transfer
- `why`: Amit Verma deposited cash four times just below the INR 1000000 threshold and then sent INR 3200000 to Vertex Exports the next day. The pattern is numerically tight and easy to explain.

Alerts:
- `AL001` / `R08`: 4 near-threshold cash deposits
- `AL002` / `R01`: daily cash totals above INR 1000000
- `AL003` / `R05`: sudden high-value outward RTGS

Key transactions:
- `T006` = INR 975000 cash deposit
- `T007` = INR 982000 cash deposit
- `T008` = INR 991000 cash deposit
- `T009` = INR 988000 cash deposit
- `T010` = INR 3200000 RTGS to `ENT001`

Threshold math:
- 14-Sep total = `975000 + 982000 = 1957000`
- 15-Sep total = `991000 + 988000 = 1979000`
- prior largest known baseline transfer = `130000`
- suspicious outward RTGS = `3200000`

## CASE002: Vertex Exports Pvt Ltd

- `case_id`: `CASE002`
- `customer_id`: `ENT001`
- `primary_account`: `AC2001`
- `scenario`: Pass-through entity account dispersing funds to multiple beneficiaries
- `why`: Vertex Exports received INR 3200000 from Amit Verma and quickly dispersed INR 3170000 to four different beneficiaries. The account also shows a very large Sep-2022 value spike versus its normal June-Aug baseline.

Alerts:
- `AL004` / `R12`: one-to-many outward transfers
- `AL005` / `R04`: same-day non-cash debits above INR 1500000
- `AL006` / `R06`: sudden monthly value spike

Key transactions:
- `T010` = inward INR 3200000 from `IND003`
- `T023` = INR 780000 to `IND011`
- `T024` = INR 825000 to `IND004`
- `T025` = INR 760000 to `IND002`
- `T026` = INR 805000 to `IND010`

Threshold math:
- same-day outward total = `780000 + 825000 + 760000 + 805000 = 3170000`
- prior 3-month average value is about `645000`
- Sep-2022 total value is `6402000`

Adverse media:
- `AM001`: Dow Jones hit marked `LIKELY`
- `AM002`: World Check hit marked `PERFECT_MATCH`

## CASE003: Pooja Iyer

- `case_id`: `CASE003`
- `customer_id`: `IND011`
- `primary_account`: `AC1011`
- `scenario`: Suspicious inflow followed by same-day crypto transfer
- `why`: Pooja Iyer usually receives salary-like credits of INR 81000, but on 21-Sep-2022 she received INR 780000 from Vertex Exports and sent INR 765000 to Binance the same day.

Alerts:
- `AL007` / `R14`: high-value crypto transfer after suspicious inflow
- `AL008` / `R06`: sudden monthly value spike

Key transactions:
- `T023` = INR 780000 received from `ENT001`
- `T044` = INR 765000 sent to `BINANCE_EXCHANGE`

Threshold math:
- suspicious inward credit = `780000`
- crypto transfer = `765000`
- both occur on `2022-09-21`
- prior monthly activity is around `100000`, while Sep-2022 reaches `1545000`

Adverse media:
- `AM003`: World Check hit marked `PERFECT_MATCH`

## Suggested Frontend Checks

1. Open `CASE001` and confirm the UI shows 3 alerts and 5 linked key transactions.
2. Open `CASE002` and confirm the UI shows the inbound from `CASE001` plus the 4 beneficiary payouts.
3. Open `CASE003` and confirm the UI shows the suspicious receipt from `CASE002`, the Binance transfer, and the adverse media row.
