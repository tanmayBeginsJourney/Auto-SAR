BEGIN TRANSACTION;

INSERT INTO customers (
    customer_id, customer_type, name, occupation_or_business, date_of_birth_or_incorporation,
    nationality_or_constitution, pan, address, phone, email, source_of_funds,
    declared_income, risk_tier, last_cdd_refresh, kyc_status, watchlist_status
) VALUES
    ('IND003', 'INDIVIDUAL', 'Amit Verma', 'Real Estate Consultant', '1983-11-03', 'Indian', 'AFVPV5521K', '17 Maple Court Baner Pune Maharashtra 411045', '+91-20-45007890', 'amit.verma@example.com', 'Property brokerage and client receipts', 'INR 1800000 p.a.', 'HIGH', '2022-08-30', 'Current', 'Clear'),
    ('ENT001', 'ENTITY', 'Vertex Exports Pvt Ltd', 'Textile export and trade finance', '2016-04-11', 'Private Limited Company', 'AACCV1184R', '301 Meridian Towers Lower Parel Mumbai Maharashtra 400013', '+91-22-40011223', 'compliance@vertexexports.example.com', 'Export receivables and trade settlements', 'INR 42000000 p.a.', 'HIGH', '2022-09-10', 'Current', 'Match Under Review'),
    ('IND011', 'INDIVIDUAL', 'Pooja Iyer', 'Compliance Officer', '1989-10-30', 'Indian', 'ADHPI5508C', '9 Palm Meadows Sarjapur Road Bengaluru Karnataka 560102', '+91-80-43003344', 'pooja.iyer@example.com', 'Salary and inward transfers', 'INR 1900000 p.a.', 'HIGH', '2022-09-18', 'Current', 'Possible PEP Match'),
    ('IND004', 'INDIVIDUAL', 'Neha Kapoor', 'Architect', '1988-06-19', 'Indian', 'AJKPK3418M', '22 Silver Arcade Kothrud Pune Maharashtra 411038', '+91-20-46004567', 'neha.kapoor@example.com', 'Professional income and salary credits', 'INR 1500000 p.a.', 'MEDIUM', '2022-08-12', 'Current', 'Clear'),
    ('IND002', 'INDIVIDUAL', 'Priya Nair', 'Finance Analyst', '1990-01-22', 'Indian', 'BQHPN4412L', '8 Coral Enclave Velachery Chennai Tamil Nadu 600042', '+91-44-43004567', 'priya.nair@example.com', 'Salary credits', 'INR 1350000 p.a.', 'MEDIUM', '2022-08-02', 'Current', 'Clear'),
    ('IND010', 'INDIVIDUAL', 'Rohit Bansal', 'Operations Manager', '1987-03-08', 'Indian', 'AFKPB2301Q', '14 Tulip Gardens Whitefield Bengaluru Karnataka 560066', '+91-80-42001122', 'rohit.bansal@example.com', 'Salary and internal transfers', 'INR 1680000 p.a.', 'MEDIUM', '2022-08-08', 'Current', 'Clear'),
    ('ENT003', 'ENTITY', 'Saffron Buildtech Pvt Ltd', 'Construction contracting and project advances', '2015-02-07', 'Private Limited Company', 'ABBCS7701H', '18 Commerce House Satpur MIDC Nashik Maharashtra 422007', '+91-253-2409988', 'accounts@saffronbuildtech.example.com', 'Project receivables', 'INR 31000000 p.a.', 'MEDIUM', '2022-08-16', 'Current', 'Clear'),
    ('ENT004', 'ENTITY', 'Eastline Logistics LLP', 'Logistics and transport management', '2018-06-25', 'Limited Liability Partnership', 'AAHFE4410E', '77 Freight Plaza Aerocity New Delhi Delhi 110037', '+91-11-42110022', 'ops@eastlinelogistics.example.com', 'Operating revenue and logistics settlements', 'INR 24000000 p.a.', 'MEDIUM', '2022-08-20', 'Current', 'Clear'),
    ('IND006', 'INDIVIDUAL', 'Kavita Rao', 'HR Executive', '1992-09-12', 'Indian', 'AZVPR6654E', '44 Lake Homes Dwarka Delhi 110075', '+91-11-41005678', 'kavita.rao@example.com', 'Salary and peer transfers', 'INR 1200000 p.a.', 'LOW', '2022-08-01', 'Current', 'Clear');

INSERT INTO accounts (
    account_number, customer_id, account_type, branch_city, account_status,
    date_opened, fy_cumulative_debits, fy_cumulative_credits
) VALUES
    ('AC1003', 'IND003', 'Deposit - Current', 'Pune', 'Active - Under Review', '2019-07-22', 3245000, 4561000),
    ('AC2001', 'ENT001', 'Deposit - Current', 'Mumbai', 'Active - Under Review', '2016-04-11', 3745000, 4125000),
    ('AC1011', 'IND011', 'Deposit - Savings', 'Bengaluru', 'Active - Under Review', '2021-04-18', 805700, 1038000),
    ('AC1004', 'IND004', 'Deposit - Savings', 'Pune', 'Active', '2020-11-04', 36000, 1053000),
    ('AC1002', 'IND002', 'Deposit - Savings', 'Chennai', 'Active', '2021-03-12', 59000, 1036000),
    ('AC1010', 'IND010', 'Deposit - Savings', 'Bengaluru', 'Active', '2021-08-25', 25000, 1029000),
    ('AC2003', 'ENT003', 'Deposit - Current', 'Nashik', 'Active', '2015-02-07', 925000, 0),
    ('AC2004', 'ENT004', 'Deposit - Current', 'Delhi', 'Active', '2018-06-25', 1135000, 0),
    ('AC1006', 'IND006', 'Deposit - Savings', 'Delhi', 'Active', '2021-02-28', 15000, 299000);

INSERT INTO employees (employee_id, employee_name, employee_level) VALUES
    ('EMP001', 'Naina Kapoor', 'ANALYST'),
    ('EMP002', 'Vivek Rao', 'ANALYST'),
    ('EMP003', 'Ritu Sharma', 'PO'),
    ('EMP004', 'Arman Gill', 'ANALYST'),
    ('EMP005', 'Karan Mehta', 'PO'),
    ('EMP006', 'Sana Khan', 'ANALYST');

INSERT INTO cases (
    case_id, customer_id, primary_account_number, stage, assigned_employee_id, start_time,
    primary_scenario, case_priority, high_velocity, pep_match, smurfing,
    cross_border_remittance, aml_screening_list, case_summary
) VALUES
    ('CASE001', 'IND003', 'AC1003', 'IN_PROGRESS', 'EMP003', '2022-09-16 09:15:00', 'Cash structuring followed by large outbound layering transfer', 1, 1, 0, 1, 0, 0, 'Amit Verma made four cash deposits between INR 975000 and INR 991000 across two days and then moved INR 3200000 by RTGS to Vertex Exports, well above his earlier baseline activity.'),
    ('CASE002', 'ENT001', 'AC2001', 'PENDING_REVIEW', 'EMP005', '2022-09-21 11:45:00', 'Pass-through entity account dispersing funds to multiple beneficiaries', 2, 1, 0, 0, 0, 1, 'Vertex Exports received INR 3200000 from Amit Verma and dispersed INR 3170000 to four beneficiary accounts within two hours, creating a clear pass-through layering pattern.'),
    ('CASE003', 'IND011', 'AC1011', 'OPEN', 'EMP001', '2022-09-21 15:10:00', 'Suspicious inflow followed by same-day crypto transfer', 3, 1, 1, 0, 0, 0, 'Pooja Iyer received INR 780000 from Vertex Exports and transferred INR 765000 to Binance later the same day, far above her normal salary pattern and alongside a PEP-style screening match.');

INSERT INTO alert_rules (rule_id, rule_name, threshold_logic, configured_value, time_window) VALUES
    ('R01', 'High value cash deposits in a day', 'Aggregate cash deposits to one account in a day', 'INR 1000000', '1 day'),
    ('R04', 'High value non-cash withdrawals in a day', 'Aggregate non-cash debits from one account in a day', 'INR 1500000', '1 day'),
    ('R05', 'Sudden high value transaction for the client', 'Transaction above absolute floor and above prior largest transaction', 'Greater than INR 1500000 and greater than 200 percent of prior largest', 'Rolling historical baseline'),
    ('R06', 'Sudden increase in value of transactions in a month', 'Current month transaction value exceeds prior average', 'Greater than 250 percent of prior 3-month average', 'Monthly'),
    ('R08', 'Splitting of cash deposits just below INR 1000000', 'Repeated near-threshold cash deposits', '3 or more deposits between INR 900000 and INR 999999', '3 days'),
    ('R12', 'One to many fund transfer', 'One remitter pays multiple beneficiaries', '4 or more unique beneficiaries from one sender', '2 days'),
    ('R14', 'High value transfer to crypto exchange after suspicious inflow', 'Customer receives material inflow and transfers funds to a crypto exchange wallet', 'Transfer above INR 500000 to a crypto exchange within 24 hours of high-risk inward credit', '24 hours');

INSERT INTO alerts (alert_id, case_id, rule_id, alert_name, alert_text, triggered_at) VALUES
    ('AL001', 'CASE001', 'R08', 'Structured cash deposits below INR 1000000', 'Four branch cash deposits of INR 975000, INR 982000, INR 991000 and INR 988000 occurred within two days and all sit just below the INR 1000000 threshold.', '2022-09-15 16:25:00'),
    ('AL002', 'CASE001', 'R01', 'Daily cash deposits above INR 1000000', 'Cash deposits into AC1003 totaled INR 1957000 on 14-Sep-2022 and INR 1979000 on 15-Sep-2022, breaching the daily threshold on both days.', '2022-09-15 16:25:00'),
    ('AL003', 'CASE001', 'R05', 'Sudden high-value outward RTGS', 'Amit Verma sent INR 3200000 to Vertex Exports on 16-Sep-2022, which is well above INR 1500000 and far higher than his prior largest known transaction of INR 130000.', '2022-09-16 09:15:00'),
    ('AL004', 'CASE002', 'R12', 'One-to-many outward transfers', 'Vertex Exports paid four different beneficiaries INR 780000, INR 825000, INR 760000 and INR 805000 within two hours on 21-Sep-2022.', '2022-09-21 11:45:00'),
    ('AL005', 'CASE002', 'R04', 'High value non-cash withdrawals in a day', 'The same-day outward non-cash debits from AC2001 totaled INR 3170000, which is well above the INR 1500000 daily threshold.', '2022-09-21 11:45:00'),
    ('AL006', 'CASE002', 'R06', 'Sudden monthly transaction value spike', 'Vertex Exports moved INR 6402000 during Sep-2022 versus an average of about INR 645000 across the prior three months.', '2022-09-21 11:45:00'),
    ('AL007', 'CASE003', 'R14', 'Crypto transfer after suspicious inflow', 'Pooja Iyer received INR 780000 from Vertex Exports at 10:00 and transferred INR 765000 to Binance at 15:10 on the same day.', '2022-09-21 15:10:00'),
    ('AL008', 'CASE003', 'R06', 'Sudden monthly transaction value spike', 'Pooja Iyer usually shows about INR 100000 of monthly account activity, but Sep-2022 reached INR 1545000 after the suspicious inward transfer and crypto movement.', '2022-09-21 15:10:00');

INSERT INTO transactions (
    transaction_id, txn_timestamp, from_bank, from_account, to_bank, to_account, amount,
    currency, payment_format, transaction_type, primary_account_number, primary_customer_id,
    counterparty_customer_id, branch_city, channel, account_status, scenario_group
) VALUES
    ('T001', '2022-05-10 11:20:00', '3208', 'EXT_HDFC_AMIT_01', '10', 'AC1003', 120000, 'INR', 'NEFT', 'Credit', 'AC1003', 'IND003', 'EXT_CLIENT_HDFC', 'Pune', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T002', '2022-06-12 13:05:00', '3209', 'EXT_ICICI_AMIT_02', '10', 'AC1003', 95000, 'INR', 'Cheque', 'Credit', 'AC1003', 'IND003', 'EXT_BROKER_ICICI', 'Pune', 'Branch', 'Active - Under Review', 'Historical baseline'),
    ('T003', '2022-08-18 16:25:00', '1420', 'EXT_SBI_AMIT_03', '10', 'AC1003', 110000, 'INR', 'IMPS', 'Credit', 'AC1003', 'IND003', 'EXT_PROPERTY_BUYER', 'Pune', 'Mobile App', 'Active - Under Review', 'Historical baseline'),
    ('T004', '2022-06-30 09:40:00', '10', 'AC2003', '10', 'AC1003', 130000, 'INR', 'NEFT', 'Credit', 'AC1003', 'IND003', 'ENT003', 'Pune', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T005', '2022-07-25 10:30:00', '10', 'AC1003', '1420', 'EXT_TAX_PUNE_01', 45000, 'INR', 'Transfer', 'Debit', 'AC1003', 'IND003', 'GOVT_TAX', 'Pune', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T006', '2022-09-14 10:10:00', '999001', 'CASH_COUNTER_PUN01', '10', 'AC1003', 975000, 'INR', 'Cash', 'Credit', 'AC1003', 'IND003', 'CASH_COUNTER', 'Pune', 'Branch', 'Active - Under Review', 'Structured cash deposit'),
    ('T007', '2022-09-14 13:40:00', '999001', 'CASH_COUNTER_PUN01', '10', 'AC1003', 982000, 'INR', 'Cash', 'Credit', 'AC1003', 'IND003', 'CASH_COUNTER', 'Pune', 'Branch', 'Active - Under Review', 'Structured cash deposit'),
    ('T008', '2022-09-15 11:05:00', '999001', 'CASH_COUNTER_PUN02', '10', 'AC1003', 991000, 'INR', 'Cash', 'Credit', 'AC1003', 'IND003', 'CASH_COUNTER', 'Pune', 'Branch', 'Active - Under Review', 'Structured cash deposit'),
    ('T009', '2022-09-15 16:25:00', '999001', 'CASH_COUNTER_PUN02', '10', 'AC1003', 988000, 'INR', 'Cash', 'Credit', 'AC1003', 'IND003', 'CASH_COUNTER', 'Pune', 'Branch', 'Active - Under Review', 'Structured cash deposit'),
    ('T010', '2022-09-16 09:15:00', '10', 'AC1003', '10', 'AC2001', 3200000, 'INR', 'RTGS', 'Debit', 'AC1003', 'IND003', 'ENT001', 'Pune', 'Online Banking', 'Active - Under Review', 'Layering transfer to linked entity'),
    ('T011', '2022-06-15 11:00:00', '10', 'AC2003', '10', 'AC2001', 310000, 'INR', 'RTGS', 'Credit', 'AC2001', 'ENT001', 'ENT003', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T012', '2022-06-18 15:10:00', '10', 'AC2001', '10', 'AC2004', 275000, 'INR', 'RTGS', 'Debit', 'AC2001', 'ENT001', 'ENT004', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T013', '2022-07-14 10:55:00', '10', 'AC2003', '10', 'AC2001', 325000, 'INR', 'RTGS', 'Credit', 'AC2001', 'ENT001', 'ENT003', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T014', '2022-07-18 13:45:00', '10', 'AC2001', '1420', 'EXT_GST_22', 40000, 'INR', 'Transfer', 'Debit', 'AC2001', 'ENT001', 'GOVT_GST', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T015', '2022-08-10 12:25:00', '10', 'AC2003', '10', 'AC2001', 290000, 'INR', 'RTGS', 'Credit', 'AC2001', 'ENT001', 'ENT003', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T016', '2022-08-16 17:20:00', '10', 'AC2001', '10', 'AC2004', 260000, 'INR', 'RTGS', 'Debit', 'AC2001', 'ENT001', 'ENT004', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Historical baseline'),
    ('T017', '2022-06-20 09:18:00', '10', 'AC2001', '10', 'AC1011', 81000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND011', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T018', '2022-07-20 09:18:00', '10', 'AC2001', '10', 'AC1011', 81000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND011', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T019', '2022-08-20 09:18:00', '10', 'AC2001', '10', 'AC1011', 81000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND011', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T020', '2022-06-08 09:02:00', '10', 'AC2001', '10', 'AC1010', 64000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND010', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T021', '2022-07-08 09:02:00', '10', 'AC2001', '10', 'AC1010', 64000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND010', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T022', '2022-08-08 09:02:00', '10', 'AC2001', '10', 'AC1010', 64000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND010', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Routine salary credit'),
    ('T023', '2022-09-21 10:00:00', '10', 'AC2001', '10', 'AC1011', 780000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND011', 'Mumbai', 'Online Banking', 'Active - Under Review', 'One-to-many outward transfer'),
    ('T024', '2022-09-21 10:20:00', '10', 'AC2001', '10', 'AC1004', 825000, 'INR', 'RTGS', 'Debit', 'AC2001', 'ENT001', 'IND004', 'Mumbai', 'Online Banking', 'Active - Under Review', 'One-to-many outward transfer'),
    ('T025', '2022-09-21 11:00:00', '10', 'AC2001', '10', 'AC1002', 760000, 'INR', 'NEFT', 'Debit', 'AC2001', 'ENT001', 'IND002', 'Mumbai', 'Online Banking', 'Active - Under Review', 'One-to-many outward transfer'),
    ('T026', '2022-09-21 11:45:00', '10', 'AC2001', '10', 'AC1010', 805000, 'INR', 'RTGS', 'Debit', 'AC2001', 'ENT001', 'IND010', 'Mumbai', 'Online Banking', 'Active - Under Review', 'One-to-many outward transfer'),
    ('T027', '2022-09-21 12:10:00', '10', 'AC2001', '2439', 'EXT_LOGISTICS_VENDOR_01', 32000, 'INR', 'IMPS', 'Debit', 'AC2001', 'ENT001', 'EXT_LOGISTICS_VENDOR', 'Mumbai', 'Online Banking', 'Active - Under Review', 'Month-end expense'),
    ('T028', '2022-06-02 09:05:00', '10', 'AC2004', '10', 'AC1002', 92000, 'INR', 'NEFT', 'Credit', 'AC1002', 'IND002', 'ENT004', 'Chennai', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T029', '2022-07-02 09:05:00', '10', 'AC2004', '10', 'AC1002', 92000, 'INR', 'NEFT', 'Credit', 'AC1002', 'IND002', 'ENT004', 'Chennai', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T030', '2022-08-02 09:05:00', '10', 'AC2004', '10', 'AC1002', 92000, 'INR', 'NEFT', 'Credit', 'AC1002', 'IND002', 'ENT004', 'Chennai', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T031', '2022-09-04 18:10:00', '10', 'AC1002', '3208', 'EXT_RENT_CHN_01', 28000, 'INR', 'Transfer', 'Debit', 'AC1002', 'IND002', 'EXT_LANDLORD', 'Chennai', 'Mobile App', 'Active', 'Routine household payment'),
    ('T032', '2022-06-12 09:20:00', '10', 'AC2004', '10', 'AC1004', 76000, 'INR', 'NEFT', 'Credit', 'AC1004', 'IND004', 'ENT004', 'Pune', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T033', '2022-07-12 09:20:00', '10', 'AC2004', '10', 'AC1004', 76000, 'INR', 'NEFT', 'Credit', 'AC1004', 'IND004', 'ENT004', 'Pune', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T034', '2022-08-12 09:20:00', '10', 'AC2004', '10', 'AC1004', 76000, 'INR', 'NEFT', 'Credit', 'AC1004', 'IND004', 'ENT004', 'Pune', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T035', '2022-09-15 20:05:00', '10', 'AC1004', '2439', 'EXT_UTILITY_11', 18000, 'INR', 'UPI', 'Debit', 'AC1004', 'IND004', 'EXT_UTILITY', 'Pune', 'Mobile App', 'Active', 'Utility payment'),
    ('T036', '2022-08-11 12:35:00', '999001', 'CASH_COUNTER_BLR03', '10', 'AC1010', 32000, 'INR', 'Cash', 'Credit', 'AC1010', 'IND010', 'CASH_COUNTER', 'Bengaluru', 'Branch', 'Active', 'Cash deposit'),
    ('T037', '2022-06-01 09:00:00', '10', 'AC2004', '10', 'AC1006', 88000, 'INR', 'NEFT', 'Credit', 'AC1006', 'IND006', 'ENT004', 'Delhi', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T038', '2022-07-01 09:00:00', '10', 'AC2004', '10', 'AC1006', 88000, 'INR', 'NEFT', 'Credit', 'AC1006', 'IND006', 'ENT004', 'Delhi', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T039', '2022-08-01 09:00:00', '10', 'AC2004', '10', 'AC1006', 88000, 'INR', 'NEFT', 'Credit', 'AC1006', 'IND006', 'ENT004', 'Delhi', 'Online Banking', 'Active', 'Routine salary credit'),
    ('T040', '2022-06-04 14:15:00', '11813', 'EXT_PNB_CONSULT_01', '10', 'AC1006', 35000, 'INR', 'IMPS', 'Credit', 'AC1006', 'IND006', 'EXT_CONSULT_CLIENT', 'Delhi', 'Mobile App', 'Active', 'Peer transfer'),
    ('T041', '2022-06-03 14:15:00', '10', 'AC1006', '10', 'AC1011', 15000, 'INR', 'UPI', 'Credit', 'AC1011', 'IND011', 'IND006', 'Bengaluru', 'Mobile App', 'Active - Under Review', 'Peer transfer'),
    ('T042', '2022-07-05 19:08:00', '10', 'AC1011', '2439', 'EXT_CARD_01', 22500, 'INR', 'UPI', 'Debit', 'AC1011', 'IND011', 'EXT_CARD_ISSUER', 'Bengaluru', 'Mobile App', 'Active - Under Review', 'Card payment'),
    ('T043', '2022-08-05 20:40:00', '10', 'AC1011', '36056', 'EXT_TRAVEL_01', 18200, 'INR', 'UPI', 'Debit', 'AC1011', 'IND011', 'EXT_TRAVEL_PORTAL', 'Bengaluru', 'Mobile App', 'Active - Under Review', 'Travel payment'),
    ('T044', '2022-09-21 15:10:00', '10', 'AC1011', '245335', 'BINANCE_WALLET_09', 765000, 'INR', 'Transfer', 'Debit', 'AC1011', 'IND011', 'BINANCE_EXCHANGE', 'Bengaluru', 'Online Banking', 'Active - Under Review', 'Crypto exchange transfer after suspicious inflow'),
    ('T045', '2022-09-24 10:05:00', '10', 'AC1002', '211050', 'COINDCX_WALLET_02', 31000, 'INR', 'Auto Debit', 'Debit', 'AC1002', 'IND002', 'COINDCX_EXCHANGE', 'Chennai', 'Standing Instruction', 'Active', 'Routine investment transfer');

INSERT INTO alert_transactions (alert_id, transaction_id) VALUES
    ('AL001', 'T006'),
    ('AL001', 'T007'),
    ('AL001', 'T008'),
    ('AL001', 'T009'),
    ('AL002', 'T006'),
    ('AL002', 'T007'),
    ('AL002', 'T008'),
    ('AL002', 'T009'),
    ('AL003', 'T010'),
    ('AL004', 'T023'),
    ('AL004', 'T024'),
    ('AL004', 'T025'),
    ('AL004', 'T026'),
    ('AL005', 'T023'),
    ('AL005', 'T024'),
    ('AL005', 'T025'),
    ('AL005', 'T026'),
    ('AL006', 'T010'),
    ('AL006', 'T023'),
    ('AL006', 'T024'),
    ('AL006', 'T025'),
    ('AL006', 'T026'),
    ('AL006', 'T027'),
    ('AL007', 'T023'),
    ('AL007', 'T044'),
    ('AL008', 'T023'),
    ('AL008', 'T044');

INSERT INTO entities (entity_id, entity_type, reference_value, display_name) VALUES
    ('EN001', 'CUSTOMER', 'IND003', 'Amit Verma'),
    ('EN002', 'CUSTOMER', 'ENT001', 'Vertex Exports Pvt Ltd'),
    ('EN003', 'CUSTOMER', 'IND011', 'Pooja Iyer'),
    ('EN004', 'ACCOUNT', 'AC1003', 'Amit Verma - AC1003'),
    ('EN005', 'ACCOUNT', 'AC2001', 'Vertex Exports - AC2001'),
    ('EN006', 'ACCOUNT', 'AC1011', 'Pooja Iyer - AC1011'),
    ('EN007', 'ACCOUNT', 'AC1004', 'Neha Kapoor - AC1004'),
    ('EN008', 'ACCOUNT', 'AC1002', 'Priya Nair - AC1002'),
    ('EN009', 'ACCOUNT', 'AC1010', 'Rohit Bansal - AC1010'),
    ('EN010', 'BANK', '10', 'BARCLAYS_IN'),
    ('EN011', 'BANK', '999001', 'CASH_DESK'),
    ('EN012', 'BANK', '245335', 'BINANCE_EXCHANGE'),
    ('EN013', 'BANK', '3208', 'HDFC_IN');

INSERT INTO adverse_media (
    adverse_media_id, customer_id, news_source, headline, article_date, match_confidence
) VALUES
    ('AM001', 'ENT001', 'DOW_JONES', 'Vertex Exports linked to invoice inflation inquiry in Mumbai customs review', '2022-08-29', 'LIKELY'),
    ('AM002', 'ENT001', 'WORLD_CHECK', 'Vertex Exports profile matched to a prior trade-based AML screening record', '2022-09-05', 'PERFECT_MATCH'),
    ('AM003', 'IND011', 'WORLD_CHECK', 'Pooja Iyer matched to a politically exposed associate screening profile', '2022-09-20', 'PERFECT_MATCH');

COMMIT;
