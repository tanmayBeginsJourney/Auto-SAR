PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS alert_transactions;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS adverse_media;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS alert_rules;

CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('INDIVIDUAL', 'ENTITY')),
    name TEXT NOT NULL,
    occupation_or_business TEXT,
    date_of_birth_or_incorporation TEXT,
    nationality_or_constitution TEXT,
    pan TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    source_of_funds TEXT,
    declared_income TEXT,
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('LOW', 'MEDIUM', 'HIGH')),
    last_cdd_refresh TEXT,
    kyc_status TEXT,
    watchlist_status TEXT
);

CREATE TABLE accounts (
    account_number TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    account_type TEXT NOT NULL,
    branch_city TEXT NOT NULL,
    account_status TEXT NOT NULL,
    date_opened TEXT,
    fy_cumulative_debits INTEGER NOT NULL,
    fy_cumulative_credits INTEGER NOT NULL
);

CREATE TABLE employees (
    employee_id TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    employee_level TEXT NOT NULL CHECK (employee_level IN ('PO', 'ANALYST'))
);

CREATE TABLE cases (
    case_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    primary_account_number TEXT NOT NULL REFERENCES accounts(account_number),
    stage TEXT NOT NULL CHECK (stage IN ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'SUBMITTED')),
    assigned_employee_id TEXT NOT NULL REFERENCES employees(employee_id),
    start_time TEXT NOT NULL,
    primary_scenario TEXT NOT NULL,
    case_priority INTEGER NOT NULL,
    high_velocity INTEGER NOT NULL CHECK (high_velocity IN (0, 1)),
    pep_match INTEGER NOT NULL CHECK (pep_match IN (0, 1)),
    smurfing INTEGER NOT NULL CHECK (smurfing IN (0, 1)),
    cross_border_remittance INTEGER NOT NULL CHECK (cross_border_remittance IN (0, 1)),
    aml_screening_list INTEGER NOT NULL CHECK (aml_screening_list IN (0, 1)),
    case_summary TEXT NOT NULL
);

CREATE TABLE alert_rules (
    rule_id TEXT PRIMARY KEY,
    rule_name TEXT NOT NULL,
    threshold_logic TEXT NOT NULL,
    configured_value TEXT NOT NULL,
    time_window TEXT NOT NULL
);

CREATE TABLE alerts (
    alert_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(case_id),
    rule_id TEXT NOT NULL REFERENCES alert_rules(rule_id),
    alert_name TEXT NOT NULL,
    alert_text TEXT NOT NULL,
    triggered_at TEXT NOT NULL
);

CREATE TABLE transactions (
    transaction_id TEXT PRIMARY KEY,
    txn_timestamp TEXT NOT NULL,
    from_bank TEXT NOT NULL,
    from_account TEXT NOT NULL,
    to_bank TEXT NOT NULL,
    to_account TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    payment_format TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Credit', 'Debit')),
    primary_account_number TEXT NOT NULL,
    primary_customer_id TEXT NOT NULL,
    counterparty_customer_id TEXT,
    branch_city TEXT NOT NULL,
    channel TEXT NOT NULL,
    account_status TEXT NOT NULL,
    scenario_group TEXT NOT NULL
);

CREATE TABLE alert_transactions (
    alert_id TEXT NOT NULL REFERENCES alerts(alert_id),
    transaction_id TEXT NOT NULL REFERENCES transactions(transaction_id),
    PRIMARY KEY (alert_id, transaction_id)
);

CREATE TABLE entities (
    entity_id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('CUSTOMER', 'ACCOUNT', 'BANK')),
    reference_value TEXT NOT NULL,
    display_name TEXT NOT NULL
);

CREATE TABLE adverse_media (
    adverse_media_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    news_source TEXT NOT NULL CHECK (news_source IN ('DOW_JONES', 'WORLD_CHECK')),
    headline TEXT NOT NULL,
    article_date TEXT NOT NULL,
    match_confidence TEXT NOT NULL CHECK (match_confidence IN ('LIKELY', 'UNLIKELY', 'PERFECT_MATCH'))
);

CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_cases_customer ON cases(customer_id);
CREATE INDEX idx_cases_employee ON cases(assigned_employee_id);
CREATE INDEX idx_alerts_case ON alerts(case_id);
CREATE INDEX idx_alerts_rule ON alerts(rule_id);
CREATE INDEX idx_alert_transactions_txn ON alert_transactions(transaction_id);
CREATE INDEX idx_transactions_primary_customer ON transactions(primary_customer_id);
CREATE INDEX idx_transactions_primary_account ON transactions(primary_account_number);
CREATE INDEX idx_adverse_media_customer ON adverse_media(customer_id);
