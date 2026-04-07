from __future__ import annotations

import difflib
import json
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..config import get_config
from ..database import get_db
from .audit import append_ledger_event, read_ledger, validate_ledger
from .reference_data import GEO_REFERENCE, bank_name, bank_type, get_bank, get_rule, is_crypto_bank
from .runtime_state import (
    add_case_version,
    get_case_artifacts_dir,
    get_case_file,
    read_case_json,
    read_workflow,
    save_workflow,
    update_workflow_stage,
    utc_now_iso,
    write_case_json,
)


SLA_LIMITS = {"OPEN": 72, "IN_PROGRESS": 72, "PENDING_REVIEW": 24, "SUBMITTED": 24, "RFI_REQUESTED": 48}
RISK_BASE = {"LOW": 20, "MEDIUM": 35, "HIGH": 45}
FLAG_WEIGHTS = {
    "pep_match": 12,
    "smurfing": 10,
    "high_velocity": 8,
    "aml_screening_list": 10,
    "cross_border_remittance": 6,
}
RULE_BONUS = {"R14": 10, "R08": 10, "R12": 5, "R05": 8, "R01": 4, "R04": 2, "R06": 2}
SANCTIONED_MAP_NODES = [
    {
        "locationKey": "tehran-sanctioned",
        "label": "",
        "lat": 35.6892,
        "lng": 51.3890,
        "country": "Iran",
        "city": "Tehran",
        "linkedCaseCount": 0,
        "linkedAlertCount": 0,
        "totalAmount": 0,
        "highestRiskLevel": "CRITICAL",
        "riskReason": "Sanctioned Country High Risk",
        "caseIds": [],
        "resolutionSource": "static-policy-overlay",
        "severity": "critical",
    },
    {
        "locationKey": "pyongyang-sanctioned",
        "label": "",
        "lat": 39.0392,
        "lng": 125.7625,
        "country": "North Korea",
        "city": "Pyongyang",
        "linkedCaseCount": 0,
        "linkedAlertCount": 0,
        "totalAmount": 0,
        "highestRiskLevel": "CRITICAL",
        "riskReason": "Sanctioned Country High Risk",
        "caseIds": [],
        "resolutionSource": "static-policy-overlay",
        "severity": "critical",
    },
    {
        "locationKey": "damascus-sanctioned",
        "label": "",
        "lat": 33.5138,
        "lng": 36.2765,
        "country": "Syria",
        "city": "Damascus",
        "linkedCaseCount": 0,
        "linkedAlertCount": 0,
        "totalAmount": 0,
        "highestRiskLevel": "CRITICAL",
        "riskReason": "Sanctioned Country High Risk",
        "caseIds": [],
        "resolutionSource": "static-policy-overlay",
        "severity": "critical",
    },
]


def _parse_dt(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00")) if "T" in value else datetime.fromisoformat(value)
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)


def _query_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_db() as conn:
        return [dict(row) for row in conn.execute(query, params).fetchall()]


def _query_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_db() as conn:
        row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def demo_now() -> datetime:
    latest_case = _query_one("select max(start_time) as latest_start from cases")
    latest_start = _parse_dt(latest_case["latest_start"])
    actual_now = datetime.now(UTC)
    if actual_now - latest_start > timedelta(days=120):
        return latest_start + timedelta(hours=8)
    return actual_now


def get_demo_users() -> dict[str, Any]:
    analysts = _query_all(
        "select employee_id, employee_name, employee_level from employees where employee_level='ANALYST' order by employee_id"
    )
    pos = _query_all(
        "select employee_id, employee_name, employee_level from employees where employee_level='PO' order by employee_id"
    )
    return {
        "analyst": {"user_id": analysts[0]["employee_id"], "user_name": analysts[0]["employee_name"], "role": "ANALYST"},
        "po": {"user_id": pos[0]["employee_id"], "user_name": pos[0]["employee_name"], "role": "PO"},
        "allAnalysts": analysts,
        "allPOs": pos,
    }


def _effective_po_route(_: str) -> dict[str, Any]:
    return get_demo_users()["po"]


def _load_case_row(case_id: str) -> dict[str, Any] | None:
    return _query_one(
        """
        select c.*, cu.name as customer_name, cu.customer_type, cu.risk_tier, cu.pan, cu.occupation_or_business,
               cu.declared_income, cu.kyc_status, cu.watchlist_status, cu.last_cdd_refresh,
               cu.source_of_funds, cu.date_of_birth_or_incorporation, cu.nationality_or_constitution,
               acc.branch_city, acc.account_type, acc.account_status, acc.date_opened,
               acc.fy_cumulative_debits, acc.fy_cumulative_credits,
               emp.employee_name as assigned_employee_name, emp.employee_level as assigned_employee_level
        from cases c
        join customers cu on cu.customer_id = c.customer_id
        join accounts acc on acc.account_number = c.primary_account_number
        join employees emp on emp.employee_id = c.assigned_employee_id
        where c.case_id = ?
        """,
        (case_id,),
    )


def ensure_case_exists(case_id: str) -> dict[str, Any]:
    case = _load_case_row(case_id)
    if not case:
        raise KeyError(f"Case {case_id} was not found")
    workflow = read_workflow(case_id, case["stage"], _effective_po_route(case_id))
    case["effective_stage"] = workflow["current_stage"]
    case["workflow"] = workflow
    return case


def _risk_payload(case: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    score = RISK_BASE.get(case["risk_tier"], 40)
    factors: list[dict[str, Any]] = [
        {
            "name": f"Customer risk tier: {case['risk_tier']}",
            "contribution": RISK_BASE.get(case["risk_tier"], 40),
            "factualBasis": f"Customer master record marks the subject as {case['risk_tier']} risk.",
            "sourceReferences": ["customers.risk_tier"],
        }
    ]
    for flag, weight in FLAG_WEIGHTS.items():
        if case.get(flag):
            score += weight
            factors.append(
                {
                    "name": flag.replace("_", " ").title(),
                    "contribution": weight,
                    "factualBasis": f"Case flag `{flag}` is set on the source case record.",
                    "sourceReferences": [f"cases.{flag}"],
                }
            )
    alert_intensity = min(len(alerts) * 4, 12)
    if alert_intensity:
        score += alert_intensity
        factors.append(
            {
                "name": "Alert intensity",
                "contribution": alert_intensity,
                "factualBasis": f"{len(alerts)} triggered alerts are linked to this case.",
                "sourceReferences": ["alerts.alert_id"],
            }
        )
    seen_rules = set()
    for alert in alerts:
        if alert["rule_id"] in seen_rules:
            continue
        seen_rules.add(alert["rule_id"])
        bonus = RULE_BONUS.get(alert["rule_id"])
        if bonus:
            score += bonus
            rule = get_rule(alert["rule_id"])
            factors.append(
                {
                    "name": f"{alert['rule_id']} severity bonus",
                    "contribution": bonus,
                    "factualBasis": rule["Rule_Name"] if rule else alert["alert_name"],
                    "sourceReferences": [f"alerts.rule_id:{alert['rule_id']}"],
                }
            )
    score = min(score, 100)
    if score >= 85:
        level = "CRITICAL"
    elif score >= 70:
        level = "HIGH"
    elif score >= 50:
        level = "MEDIUM"
    else:
        level = "LOW"
    return {
        "riskScore": score,
        "riskLevel": level,
        "riskFactors": factors,
        "riskExplanation": "Risk score combines seeded customer tier, case flags, alert volume, and rule-severity bonuses.",
    }


def _sla_payload(case: dict[str, Any], effective_stage: str) -> dict[str, Any]:
    started = _parse_dt(case["start_time"])
    hours = SLA_LIMITS.get(effective_stage, 72)
    deadline = started + timedelta(hours=hours)
    remaining = deadline - demo_now()
    remaining_hours = round(remaining.total_seconds() / 3600, 1)
    if remaining.total_seconds() <= 0:
        human = f"Breached by {abs(int(remaining.total_seconds() // 3600))}h"
        status = "BREACHED"
    elif remaining.total_seconds() < 12 * 3600:
        human = f"{int(remaining.total_seconds() // 3600)} hrs"
        status = "AT_RISK"
    else:
        human = f"{int(remaining.total_seconds() // 3600)} hrs"
        status = "WITHIN_SLA"
    return {
        "status": status,
        "remainingHours": remaining_hours,
        "display": human,
        "deadline": deadline.isoformat(),
        "explanation": f"{effective_stage} cases get {hours} hours from the case start time.",
        "demoClock": demo_now().isoformat(),
    }


def _enrich_transaction(row: dict[str, Any]) -> dict[str, Any]:
    direction = "INBOUND" if row["transaction_type"] == "Credit" else "OUTBOUND"
    return {
        **row,
        "direction": direction,
        "signedAmount": row["amount"] if row["transaction_type"] == "Credit" else -row["amount"],
        "fromBankName": bank_name(row.get("from_bank")),
        "toBankName": bank_name(row.get("to_bank")),
        "fromBankType": bank_type(row.get("from_bank")),
        "toBankType": bank_type(row.get("to_bank")),
        "isCryptoTouch": is_crypto_bank(row.get("from_bank")) or is_crypto_bank(row.get("to_bank")),
        "counterpartyLabel": row.get("counterparty_customer_id") or "Unavailable",
    }


def get_case_alerts(case_id: str) -> list[dict[str, Any]]:
    alerts = _query_all(
        """
        select a.*, ar.rule_name, ar.threshold_logic, ar.configured_value, ar.time_window
        from alerts a
        join alert_rules ar on ar.rule_id = a.rule_id
        where a.case_id = ?
        order by a.triggered_at
        """,
        (case_id,),
    )
    by_alert = {alert["alert_id"]: alert for alert in alerts}
    for alert in by_alert.values():
        alert["transactions"] = []
        alert["explanation"] = (
            f"{alert['rule_name']}: {alert['threshold_logic']} ({alert['configured_value']} / {alert['time_window']})."
        )
    rows = _query_all(
        """
        select at.alert_id, t.*
        from alert_transactions at
        join transactions t on t.transaction_id = at.transaction_id
        join alerts a on a.alert_id = at.alert_id
        where a.case_id = ?
        order by t.txn_timestamp
        """,
        (case_id,),
    )
    for row in rows:
        by_alert[row["alert_id"]]["transactions"].append(_enrich_transaction(row))
    return alerts


def get_case_transactions(case_id: str) -> list[dict[str, Any]]:
    rows = _query_all(
        """
        select distinct t.*
        from alerts a
        join alert_transactions at on at.alert_id = a.alert_id
        join transactions t on t.transaction_id = at.transaction_id
        where a.case_id = ?
        order by t.txn_timestamp
        """,
        (case_id,),
    )
    return [_enrich_transaction(row) for row in rows]


def _value_at_risk(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(abs(txn["amount"]) for txn in transactions)
    return {"valueAtRisk": total, "calculation": "Sum of distinct suspicious linked transaction amounts for the case."}


def get_case_detail(case_id: str) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    alerts = get_case_alerts(case_id)
    transactions = get_case_transactions(case_id)
    risk = _risk_payload(case, alerts)
    sla = _sla_payload(case, case["effective_stage"])
    value = _value_at_risk(transactions)
    return {
        "caseId": case["case_id"],
        "customerId": case["customer_id"],
        "customerName": case["customer_name"],
        "customerType": case["customer_type"],
        "primaryAccountNumber": case["primary_account_number"],
        "assignedEmployee": {
            "employeeId": case["assigned_employee_id"],
            "name": case["assigned_employee_name"],
            "level": case["assigned_employee_level"],
        },
        "stage": case["effective_stage"],
        "startTime": case["start_time"],
        "summary": case["case_summary"],
        "totalAlerts": len(alerts),
        "totalAmount": value["valueAtRisk"],
        "branchCity": case["branch_city"],
        **risk,
        "sla": sla,
        **value,
        "isCryptoCase": any(txn["isCryptoTouch"] for txn in transactions),
        "workflow": case["workflow"],
        "canAnalystEdit": not case["workflow"].get("locked_for_analyst", False),
    }


def list_cases(search: str | None = None, status: str | None = None, trigger_type: str | None = None, customer_segment: str | None = None) -> list[dict[str, Any]]:
    query = """
        select c.case_id
        from cases c
        join customers cu on cu.customer_id = c.customer_id
        where 1=1
    """
    params: list[Any] = []
    if search:
        query += " and (lower(c.case_id) like ? or lower(cu.name) like ?)"
        like = f"%{search.lower()}%"
        params.extend([like, like])
    case_ids = [row["case_id"] for row in _query_all(query, tuple(params))]
    results: list[dict[str, Any]] = []
    for case_id in case_ids:
        detail = get_case_detail(case_id)
        if status and detail["stage"] != status:
            continue
        if customer_segment and detail["customerType"] != customer_segment:
            continue
        if trigger_type:
            alerts = get_case_alerts(case_id)
            rule_ids = {alert["rule_id"] for alert in alerts}
            names = {alert["alert_name"] for alert in alerts}
            if trigger_type not in rule_ids and trigger_type not in names:
                continue
        results.append(detail)
    results.sort(key=lambda item: item["sla"]["remainingHours"])
    return results


def dashboard_summary() -> dict[str, Any]:
    cases = list_cases()
    open_alerts = sum(case["totalAlerts"] for case in cases if case["stage"] != "PO_APPROVED")
    return {
        "openAlerts": open_alerts,
        "breachingSla": sum(1 for case in cases if case["sla"]["status"] == "BREACHED"),
        "inProgress": sum(1 for case in cases if case["stage"] in {"OPEN", "IN_PROGRESS", "RFI_REQUESTED"}),
        "pendingPoReview": sum(1 for case in cases if case["stage"] in {"PENDING_REVIEW", "SUBMITTED"}),
        "activeCaseCount": len(cases),
        "subtitle": f"{len(cases)} Active Cases ({open_alerts} Alerts) · Sorted by SLA deadline",
        "demoClock": demo_now().isoformat(),
    }


def kyc_payload(case_id: str) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    return {
        "caseId": case_id,
        "customerName": case["customer_name"],
        "customerId": case["customer_id"],
        "pan": case["pan"],
        "occupationOrBusiness": case["occupation_or_business"],
        "declaredIncome": case["declared_income"],
        "riskTier": case["risk_tier"],
        "kycStatus": case["kyc_status"],
        "watchlistStatus": case["watchlist_status"],
        "lastCddRefresh": case["last_cdd_refresh"],
        "sourceOfFunds": case["source_of_funds"],
        "primaryAccount": {
            "accountNumber": case["primary_account_number"],
            "accountType": case["account_type"],
            "branchCity": case["branch_city"],
            "accountStatus": case["account_status"],
            "dateOpened": case["date_opened"],
            "fyCumulativeDebits": case["fy_cumulative_debits"],
            "fyCumulativeCredits": case["fy_cumulative_credits"],
        },
    }


def prior_alerts(case_id: str) -> list[dict[str, Any]]:
    case = ensure_case_exists(case_id)
    return _query_all(
        """
        select a.*, c.case_id as other_case_id
        from alerts a
        join cases c on c.case_id = a.case_id
        where c.customer_id = ? and c.case_id != ?
        order by a.triggered_at desc
        """,
        (case["customer_id"], case_id),
    )


def entity_graph(case_id: str) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    transactions = get_case_transactions(case_id)
    nodes = [
        {"id": case["customer_id"], "label": case["customer_name"], "type": "CUSTOMER"},
        {"id": case["primary_account_number"], "label": case["primary_account_number"], "type": "ACCOUNT"},
    ]
    edges = [{"source": case["customer_id"], "target": case["primary_account_number"], "label": "owns"}]
    seen = {case["customer_id"], case["primary_account_number"]}
    for txn in transactions:
        counterparty = txn.get("counterparty_customer_id") or txn.get("toBankName")
        if counterparty and counterparty not in seen:
            seen.add(counterparty)
            nodes.append({"id": counterparty, "label": counterparty, "type": "COUNTERPARTY"})
        if counterparty:
            edges.append({"source": case["primary_account_number"], "target": counterparty, "label": txn["payment_format"]})
        for bank_id in [txn.get("from_bank"), txn.get("to_bank")]:
            bank = get_bank(bank_id)
            if bank and bank["Bank_Name"] not in seen:
                seen.add(bank["Bank_Name"])
                nodes.append({"id": bank["Bank_Name"], "label": bank["Bank_Name"], "type": "BANK"})
                edges.append({"source": case["primary_account_number"], "target": bank["Bank_Name"], "label": "bank"})
    return {"nodes": nodes, "edges": edges}


def get_adverse_media(case_id: str) -> list[dict[str, Any]]:
    case = ensure_case_exists(case_id)
    rows = _query_all("select * from adverse_media where customer_id = ? order by article_date desc", (case["customer_id"],))
    reviews = {item["adverse_media_id"]: item for item in read_case_json(case_id, "adverse_media_review.json", [])}
    return [{**row, "review": reviews.get(row["adverse_media_id"], {"review_status": "UNREVIEWED"})} for row in rows]


def update_adverse_media_review(case_id: str, adverse_media_id: str, review_status: str, actor: dict[str, Any]) -> dict[str, Any]:
    reviews = read_case_json(case_id, "adverse_media_review.json", [])
    reviews = [item for item in reviews if item["adverse_media_id"] != adverse_media_id]
    review = {
        "case_id": case_id,
        "adverse_media_id": adverse_media_id,
        "review_status": review_status,
        "reviewed_by": actor["user_name"],
        "reviewed_by_id": actor["user_id"],
        "reviewed_at": utc_now_iso(),
    }
    reviews.append(review)
    write_case_json(case_id, "adverse_media_review.json", reviews)
    workflow = ensure_case_exists(case_id)["workflow"]
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage=workflow["current_stage"],
        event_type="ADVERSE_MEDIA_REVIEWED",
        actor=actor,
        payload=review,
        entity_type="adverse_media",
        entity_id=adverse_media_id,
    )
    return review


def _str_autofill_default(case_id: str) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    transactions = get_case_transactions(case_id)
    is_entity = case["customer_type"] == "ENTITY"
    return {
        "caseId": case_id,
        "sections": {
            "part1": {
                "reportingEntityName": get_config().reporting_entity_name,
                "entityId": get_config().reporting_entity_id,
                "entityCategory": get_config().reporting_entity_category,
            },
            "part2": {
                "principalOfficerName": get_config().principal_officer_name,
                "principalOfficerTitle": get_config().principal_officer_title,
                "principalOfficerEmail": get_config().principal_officer_email,
                "principalOfficerPhone": get_config().principal_officer_phone,
            },
            "part3": {
                "branchCity": case["branch_city"],
                "branchCode": get_config().branch_code_fallback,
                "reportingLocation": case["branch_city"],
            },
            "part4": {
                "individuals": []
                if is_entity
                else [
                    {
                        "role": "Primary Subject",
                        "name": case["customer_name"],
                        "customerId": case["customer_id"],
                        "pan": case["pan"],
                        "occupation": case["occupation_or_business"],
                        "declaredIncome": case["declared_income"],
                    }
                ]
            },
            "part5": {
                "entities": [
                    {
                        "role": "Primary Subject",
                        "name": case["customer_name"],
                        "customerId": case["customer_id"],
                        "business": case["occupation_or_business"],
                    }
                ]
                if is_entity
                else []
            },
            "part6": {
                "accounts": [
                    {
                        "accountNumber": case["primary_account_number"],
                        "accountType": case["account_type"],
                        "branchCity": case["branch_city"],
                        "accountStatus": case["account_status"],
                    }
                ]
            },
            "part7": {
                "groundsSummary": "Detailed grounds of suspicion are drafted in the next stage from the linked case facts."
            },
            "part8": {
                "suspiciousTransactions": [
                    {
                        "transactionId": txn["transaction_id"],
                        "date": txn["txn_timestamp"],
                        "mode": txn["payment_format"],
                        "amount": txn["amount"],
                        "direction": txn["direction"],
                    }
                    for txn in transactions
                ]
            },
        },
        "fieldMeta": {
            "autofilledFields": [
                "part1",
                "part2",
                "part3.branchCity",
                "part4",
                "part5",
                "part6",
                "part8",
            ],
            "editableFields": ["part3.branchCode", "part7.groundsSummary"],
        },
        "updatedAt": utc_now_iso(),
        "updatedBy": "system",
    }


def get_str_autofill(case_id: str) -> dict[str, Any]:
    saved = read_case_json(case_id, "str_autofill.json", None)
    if saved:
        return saved
    generated = _str_autofill_default(case_id)
    write_case_json(case_id, "str_autofill.json", generated)
    return generated


def save_str_autofill(case_id: str, values: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    before = get_str_autofill(case_id)
    payload = {
        **before,
        **values,
        "updatedAt": utc_now_iso(),
        "updatedBy": actor["user_name"],
    }
    write_case_json(case_id, "str_autofill.json", payload)
    add_case_version(case_id, "str_autofill.json", payload)
    workflow = ensure_case_exists(case_id)["workflow"]
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage=workflow["current_stage"],
        event_type="STR_AUTOFILL_EDITED",
        actor=actor,
        payload={"beforeHash": hash(json.dumps(before, sort_keys=True)), "afterHash": hash(json.dumps(payload, sort_keys=True))},
        entity_type="str_autofill",
        entity_id=case_id,
    )
    return payload


def refresh_str_autofill(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    payload = _str_autofill_default(case_id)
    write_case_json(case_id, "str_autofill.json", payload)
    workflow = ensure_case_exists(case_id)["workflow"]
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage=workflow["current_stage"],
        event_type="STR_AUTOFILL_GENERATED",
        actor=actor,
        payload={"fieldCount": len(payload["sections"])},
        entity_type="str_autofill",
        entity_id=case_id,
    )
    return payload


def complete_stage(case_id: str, stage_name: str, actor: dict[str, Any], note: str | None = None) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    next_stage = case["workflow"]["current_stage"]
    if stage_name in {"data-assembly", "str-autofill", "grounds"}:
        next_stage = "IN_PROGRESS"
    workflow = update_workflow_stage(case_id, case["workflow"], next_stage, actor, note=note, lock_analyst=False)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage=workflow["current_stage"],
        event_type=f"{stage_name.upper().replace('-', '_')}_COMPLETED",
        actor=actor,
        payload={"note": note},
        entity_type="stage",
        entity_id=stage_name,
    )
    return workflow


def current_submission_snapshot(case_id: str) -> dict[str, Any] | None:
    return read_case_json(case_id, "submission_snapshot.json", None)


def save_submission_snapshot(case_id: str, snapshot: dict[str, Any]) -> None:
    write_case_json(case_id, "submission_snapshot.json", snapshot)
    review_cycle_id = snapshot["reviewCycleId"]
    cycle_path = get_case_artifacts_dir(case_id, review_cycle_id) / f"{snapshot['submissionId']}_snapshot.json"
    cycle_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")


def ensure_initial_pending_submission(case_id: str) -> dict[str, Any] | None:
    case = ensure_case_exists(case_id)
    if case["workflow"]["current_stage"] not in {"PENDING_REVIEW", "SUBMITTED"}:
        return None
    snapshot = current_submission_snapshot(case_id)
    if snapshot:
        return snapshot

    from .narrative_service import ensure_narrative_state
    from .validation_service import run_presubmission_validation

    actor = get_demo_users()["analyst"]
    narrative = ensure_narrative_state(case_id, actor, allow_generation=True)
    str_autofill = get_str_autofill(case_id)
    validation = run_presubmission_validation(case_id, actor)
    validation["checks"] = [
        {
            **check,
            "passed": True if check["rule"] in {"Analyst still has edit rights", "Case not already submitted"} else check["passed"],
        }
        for check in validation["checks"]
    ]
    validation["hardBlockers"] = [check for check in validation["checks"] if check["severity"] == "hard" and not check["passed"]]
    validation["warnings"] = [check for check in validation["checks"] if check["severity"] == "soft" and not check["passed"]]
    validation["status"] = "BLOCKED" if validation["hardBlockers"] else ("WARN" if validation["warnings"] else "PASS")
    alerts = get_case_alerts(case_id)
    transactions = get_case_transactions(case_id)
    review_cycle_id = f"cycle_{uuid4().hex[:10]}"
    submission_id = f"sub_{uuid4().hex[:10]}"
    submitted_at = utc_now_iso()
    case["workflow"]["current_review_cycle_id"] = review_cycle_id
    case["workflow"]["latest_submission_id"] = submission_id
    case["workflow"].setdefault("review_cycles", []).append(
        {"reviewCycleId": review_cycle_id, "submissionId": submission_id, "submittedAt": submitted_at}
    )
    case["workflow"]["locked_for_analyst"] = True
    save_workflow(case_id, case["workflow"])
    snapshot = {
        "submissionId": submission_id,
        "reviewCycleId": review_cycle_id,
        "case": get_case_detail(case_id),
        "strAutofill": str_autofill,
        "narrative": narrative,
        "validation": validation,
        "alerts": alerts,
        "transactions": transactions,
        "adverseMedia": get_adverse_media(case_id),
        "submittedAt": submitted_at,
        "submittedBy": actor,
        "poRoute": case["workflow"]["po_route"],
        "ledgerStatus": validate_ledger(case_id),
    }
    save_submission_snapshot(case_id, snapshot)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=review_cycle_id,
        stage=case["workflow"]["current_stage"],
        event_type="SEEDED_PENDING_SUBMISSION",
        actor=actor,
        payload={"submissionId": submission_id},
        entity_type="submission_snapshot",
        entity_id=submission_id,
    )
    return snapshot


def get_submission_confirmation(case_id: str) -> dict[str, Any]:
    snapshot = current_submission_snapshot(case_id) or ensure_initial_pending_submission(case_id)
    if not snapshot:
        raise KeyError("No submission snapshot found")
    return {"caseId": case_id, "locked": True, "inPoQueue": True, "snapshot": snapshot, "poNotificationStatus": "Queued"}


def po_cases(search: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
    items = []
    for case in list_cases(search=search):
        if case["stage"] not in {"PENDING_REVIEW", "SUBMITTED", "RFI_REQUESTED", "PO_APPROVED"}:
            continue
        if status and case["stage"] != status:
            continue
        ensure_initial_pending_submission(case["caseId"])
        items.append(
            {
                **case,
                "submission": current_submission_snapshot(case["caseId"]),
                "urgencyReason": "SLA urgency" if case["sla"]["status"] != "WITHIN_SLA" else "Awaiting PO action",
            }
        )
        items[-1]["analystName"] = items[-1]["submission"]["submittedBy"]["user_name"] if items[-1]["submission"] else case["assignedEmployee"]["name"]
    items.sort(key=lambda item: (item["sla"]["remainingHours"], -item["riskScore"], -item["valueAtRisk"]))
    return items


def po_dashboard_summary() -> dict[str, Any]:
    items = po_cases()
    approved = [item for item in items if item["stage"] == "PO_APPROVED"]
    pending = [item for item in items if item["stage"] in {"PENDING_REVIEW", "SUBMITTED"}]
    avg_resolution_hours = 0
    if approved:
        hours = []
        for item in approved:
            started = _parse_dt(item["startTime"])
            submitted_at = item["submission"]["submittedAt"] if item.get("submission") else utc_now_iso()
            hours.append((_parse_dt(submitted_at) - started).total_seconds() / 3600)
        avg_resolution_hours = round(sum(hours) / len(hours), 1)
    return {
        "totalOpenCases": len([item for item in items if item["stage"] != "PO_APPROVED"]),
        "totalValueAtRisk": sum(item["valueAtRisk"] for item in items),
        "avgResolutionTimeHours": avg_resolution_hours,
        "pendingYourApproval": len(pending),
        "actionRequired": [
            {
                "caseId": item["caseId"],
                "subject": item["customerName"],
                "analyst": item["analystName"],
                "slaRemaining": item["sla"]["display"],
                "reason": item["urgencyReason"],
            }
            for item in pending
        ],
    }


def po_map_risk() -> dict[str, Any]:
    nodes: dict[str, dict[str, Any]] = {}
    for item in po_cases():
        transactions = get_case_transactions(item["caseId"])
        alerts = get_case_alerts(item["caseId"])
        for txn in transactions:
            geo = GEO_REFERENCE.get(txn["branch_city"])
            if not geo:
                continue
            key = geo["city"]
            node = nodes.setdefault(
                key,
                {
                    "locationKey": key,
                    "label": geo["city"],
                    "lat": geo["lat"],
                    "lng": geo["lng"],
                    "country": geo["countryName"],
                    "city": geo["city"],
                    "linkedCaseCount": 0,
                    "linkedAlertCount": 0,
                    "totalAmount": 0,
                    "highestRiskLevel": item["riskLevel"],
                    "riskReason": "Branch-city aggregation of suspicious linked transactions.",
                    "caseIds": [],
                    "resolutionSource": geo["resolutionSource"],
                    "severity": geo["riskRegionType"],
                },
            )
            if item["caseId"] not in node["caseIds"]:
                node["caseIds"].append(item["caseId"])
                node["linkedCaseCount"] += 1
            node["linkedAlertCount"] = max(node["linkedAlertCount"], len(alerts))
            node["totalAmount"] += txn["amount"]
            if txn["isCryptoTouch"]:
                node["severity"] = "critical"
                node["riskReason"] = "Crypto-exchange-linked suspicious movement originated from this branch city."
    for node in SANCTIONED_MAP_NODES:
        nodes.setdefault(node["locationKey"], dict(node))
    return {"nodes": list(nodes.values())}


def weekly_filings() -> list[dict[str, Any]]:
    filings: dict[str, dict[str, Any]] = defaultdict(lambda: {"date": "", "submitted": 0, "approved": 0})
    for item in po_cases():
        submission = item.get("submission")
        if submission:
            day = submission["submittedAt"][:10]
            filings[day]["date"] = day
            filings[day]["submitted"] += 1
        if item["stage"] == "PO_APPROVED":
            day = item.get("workflow", {}).get("last_updated_at", utc_now_iso())[:10]
            filings[day]["date"] = day
            filings[day]["approved"] += 1
    return sorted(filings.values(), key=lambda row: row["date"])


def analyst_performance() -> list[dict[str, Any]]:
    by_analyst: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"analyst": "", "activeCases": 0, "avgTurnaroundHours": 0, "slaRiskCount": 0}
    )
    for case in list_cases():
        row = by_analyst[case["assignedEmployee"]["name"]]
        row["analyst"] = case["assignedEmployee"]["name"]
        row["activeCases"] += 1
        row["avgTurnaroundHours"] += max(0, demo_now().timestamp() - _parse_dt(case["startTime"]).timestamp()) / 3600
        if case["sla"]["status"] != "WITHIN_SLA":
            row["slaRiskCount"] += 1
    return [
        {
            **row,
            "avgTurnaroundHours": round(row["avgTurnaroundHours"] / row["activeCases"], 1) if row["activeCases"] else 0,
        }
        for row in by_analyst.values()
    ]


def po_review_payload(case_id: str) -> dict[str, Any]:
    ensure_initial_pending_submission(case_id)
    snapshot = current_submission_snapshot(case_id)
    if not snapshot:
        raise KeyError("No submission snapshot for review")
    narrative = snapshot["narrative"]
    return {
        "snapshot": snapshot,
        "poReview": read_case_json(case_id, "po_review.json", {"comments": [], "decision": None}),
        "auditLedger": read_ledger(case_id),
        "paragraphTraces": narrative.get("paragraphTraces", []),
    }


def narrative_diff(case_id: str) -> dict[str, Any]:
    review = po_review_payload(case_id)
    final_text = review["snapshot"]["narrative"].get("finalText", "")
    ai_text = review["snapshot"]["narrative"].get("aiDraftText", "")
    return {"lines": list(difflib.ndiff(ai_text.splitlines(), final_text.splitlines()))}
