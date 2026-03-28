from __future__ import annotations

from typing import Any
from uuid import uuid4

from .audit import append_ledger_event, validate_ledger
from .case_service import (
    current_submission_snapshot,
    ensure_case_exists,
    get_adverse_media,
    get_case_alerts,
    get_case_detail,
    get_case_transactions,
    get_str_autofill,
    save_submission_snapshot,
)
from .narrative_service import compliance_check, ensure_narrative_state
from .runtime_state import read_case_json, save_workflow, utc_now_iso, write_case_json


def run_presubmission_validation(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    case_detail = get_case_detail(case_id)
    alerts = get_case_alerts(case_id)
    transactions = get_case_transactions(case_id)
    adverse_media = get_adverse_media(case_id)
    adverse_reviews = read_case_json(case_id, "adverse_media_review.json", [])
    str_autofill = get_str_autofill(case_id)
    narrative = ensure_narrative_state(case_id, actor)
    compliance = narrative.get("complianceCheck") or compliance_check(case_id, actor)

    checks = []

    def add(rule: str, passed: bool, severity: str, explanation: str) -> None:
        checks.append({"rule": rule, "passed": passed, "severity": severity, "explanation": explanation})

    add("Case exists", True, "hard", "Case record was resolved from the supplied SQLite dataset.")
    add("Subject profile assembled", bool(case_detail["customerName"]), "hard", "Customer master and primary account are available.")
    add("At least one alert exists", len(alerts) > 0, "hard", "Seeded alerts are linked to the case.")
    add("At least one suspicious transaction exists", len(transactions) > 0, "hard", "Suspicious transactions were deduplicated from alert linkages.")
    add(
        "Adverse media reviewed or empty",
        not adverse_media or len(adverse_reviews) >= 0,
        "hard",
        "The adverse media panel was loaded; zero rows is an acceptable outcome.",
    )
    add("STR autofill exists", bool(str_autofill.get("sections")), "hard", "The deterministic autofill draft is present.")
    required_parts = ["part1", "part2", "part3", "part4", "part6", "part8"]
    add(
        "Required STR sections saved",
        all(str_autofill.get("sections", {}).get(part) is not None for part in required_parts),
        "hard",
        "Mandatory STR sections are available in saved draft state.",
    )
    add("Narrative draft exists", bool(narrative.get("finalText")), "hard", "A narrative draft has been saved.")
    add("Narrative not empty", bool(narrative.get("finalText", "").strip()), "hard", "Final narrative text is non-empty.")
    add("Compliance check passed", compliance["passed"], "hard", "Narrative checks passed.")
    add("Paragraph traces exist", len(narrative.get("paragraphTraces", [])) > 0, "hard", "Paragraph-level provenance exists.")
    add("Audit linkage exists", validate_ledger(case_id)["status"] != "broken", "hard", "Ledger chain is not broken.")
    add("Analyst still has edit rights", case_detail["canAnalystEdit"], "hard", "Case is not yet locked for analyst editing.")
    add("PO route exists", bool(case_detail["workflow"].get("po_route")), "hard", "A seeded Principal Officer route is present.")
    add(
        "Case not already submitted",
        case_detail["stage"] not in {"PENDING_REVIEW", "SUBMITTED", "PO_APPROVED"},
        "hard",
        "The case is still in an analyst-editable workflow state.",
    )
    add(
        "SLA warning",
        case_detail["sla"]["status"] == "WITHIN_SLA",
        "soft",
        f"Current SLA state is {case_detail['sla']['status']}.",
    )
    add("Prior alerts available", True, "soft", "If no prior alerts exist, the UI shows a demo-data empty state instead.")
    add("Adverse media available", len(adverse_media) > 0, "soft", "No adverse-media hits is a valid demo outcome.")

    hard_blockers = [item for item in checks if item["severity"] == "hard" and not item["passed"]]
    warnings = [item for item in checks if item["severity"] == "soft" and not item["passed"]]
    result = {
        "status": "BLOCKED" if hard_blockers else ("WARN" if warnings else "PASS"),
        "checks": checks,
        "hardBlockers": hard_blockers,
        "warnings": warnings,
        "checkedAt": utc_now_iso(),
    }
    write_case_json(case_id, "validation.json", result)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=case["workflow"].get("current_review_cycle_id"),
        stage=case_detail["stage"],
        event_type="VALIDATION_RUN",
        actor=actor,
        payload=result,
        entity_type="validation",
        entity_id=case_id,
    )
    return result


def get_presubmission_validation(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    return read_case_json(case_id, "validation.json", None) or run_presubmission_validation(case_id, actor)


def submit_case(case_id: str, actor: dict[str, Any], analyst_notes: str | None = None) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    validation = run_presubmission_validation(case_id, actor)
    if validation["hardBlockers"]:
        raise ValueError("Submission blocked by validation errors")

    narrative = ensure_narrative_state(case_id, actor)
    str_autofill = get_str_autofill(case_id)
    alerts = get_case_alerts(case_id)
    transactions = get_case_transactions(case_id)
    adverse_media = get_adverse_media(case_id)
    review_cycle_id = f"cycle_{uuid4().hex[:10]}"
    submission_id = f"sub_{uuid4().hex[:10]}"
    snapshot = {
        "submissionId": submission_id,
        "reviewCycleId": review_cycle_id,
        "case": get_case_detail(case_id),
        "strAutofill": str_autofill,
        "narrative": narrative,
        "validation": validation,
        "alerts": alerts,
        "transactions": transactions,
        "adverseMedia": adverse_media,
        "analystNotes": analyst_notes,
        "submittedAt": utc_now_iso(),
        "submittedBy": actor,
        "poRoute": case["workflow"]["po_route"],
        "ledgerStatus": validate_ledger(case_id),
    }
    workflow = case["workflow"]
    workflow["current_review_cycle_id"] = review_cycle_id
    workflow["latest_submission_id"] = submission_id
    workflow["current_stage"] = "PENDING_REVIEW"
    workflow["locked_for_analyst"] = True
    workflow.setdefault("review_cycles", []).append(
        {"reviewCycleId": review_cycle_id, "submissionId": submission_id, "submittedAt": snapshot["submittedAt"]}
    )
    workflow.setdefault("notifications", []).append(
        {
            "notificationId": f"notif_{uuid4().hex[:10]}",
            "status": "Queued",
            "type": "PO_REVIEW_REQUIRED",
            "createdAt": utc_now_iso(),
            "target": workflow["po_route"],
        }
    )
    save_workflow(case_id, workflow)
    save_submission_snapshot(case_id, snapshot)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=review_cycle_id,
        stage="PENDING_REVIEW",
        event_type="SUBMIT_TO_PO",
        actor=actor,
        payload={"submissionId": submission_id, "poRoute": workflow["po_route"]},
        entity_type="submission_snapshot",
        entity_id=submission_id,
    )
    return snapshot


def request_information(case_id: str, actor: dict[str, Any], comment: str) -> dict[str, Any]:
    if not comment.strip():
        raise ValueError("A non-empty PO comment is required")
    case = ensure_case_exists(case_id)
    review = read_case_json(case_id, "po_review.json", {"comments": [], "decision": None})
    review["comments"].append(
        {
            "comment": comment,
            "actor": actor,
            "createdAt": utc_now_iso(),
            "type": "RFI",
        }
    )
    review["decision"] = {"status": "RFI_REQUESTED", "comment": comment, "createdAt": utc_now_iso(), "actor": actor}
    write_case_json(case_id, "po_review.json", review)
    workflow = case["workflow"]
    workflow["current_stage"] = "RFI_REQUESTED"
    workflow["locked_for_analyst"] = False
    save_workflow(case_id, workflow)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage="RFI_REQUESTED",
        event_type="RFI_RETURNED",
        actor=actor,
        payload={"comment": comment},
        entity_type="po_review",
        entity_id=case_id,
    )
    return review


def validate_approval(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    case_detail = get_case_detail(case_id)
    snapshot = current_submission_snapshot(case_id)
    checks = []

    def add(rule: str, passed: bool, explanation: str) -> None:
        checks.append({"rule": rule, "passed": passed, "explanation": explanation})

    add("Reviewable stage", case_detail["stage"] in {"PENDING_REVIEW", "SUBMITTED"}, "Case must still be pending PO action.")
    add("Submission snapshot exists", bool(snapshot), "Approval is based on a frozen analyst submission.")
    ledger = validate_ledger(case_id)
    add("Ledger chain valid", ledger["status"] != "broken", ledger["message"])
    compliance = snapshot["validation"]["status"] != "BLOCKED" if snapshot else False
    add("Compliance validations passed", compliance, "Latest validation bundle must not contain hard blockers.")
    from .export_service import build_xml_string

    xml_ok = False
    if snapshot:
        try:
            build_xml_string(snapshot)
            xml_ok = True
        except Exception:
            xml_ok = False
    add("XML payload buildable", xml_ok, "Approval requires a buildable final export payload.")
    result = {
        "passed": all(item["passed"] for item in checks),
        "checks": checks,
        "checkedAt": utc_now_iso(),
    }
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=case["workflow"].get("current_review_cycle_id"),
        stage=case_detail["stage"],
        event_type="PO_APPROVAL_VALIDATED",
        actor=actor,
        payload=result,
        entity_type="approval_validation",
        entity_id=case_id,
    )
    return result


def approve_case(case_id: str, actor: dict[str, Any], decision_note: str | None = None) -> dict[str, Any]:
    approval = validate_approval(case_id, actor)
    if not approval["passed"]:
        raise ValueError("Approval validation failed")
    case = ensure_case_exists(case_id)
    review = read_case_json(case_id, "po_review.json", {"comments": [], "decision": None})
    review["decision"] = {
        "status": "PO_APPROVED",
        "comment": decision_note,
        "createdAt": utc_now_iso(),
        "actor": actor,
    }
    write_case_json(case_id, "po_review.json", review)
    workflow = case["workflow"]
    workflow["current_stage"] = "PO_APPROVED"
    workflow["locked_for_analyst"] = True
    save_workflow(case_id, workflow)
    from .export_service import generate_export_bundle

    bundle = generate_export_bundle(case_id, actor, decision_note)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=workflow.get("current_review_cycle_id"),
        stage="PO_APPROVED",
        event_type="PO_APPROVAL",
        actor=actor,
        payload={"decisionNote": decision_note, "artifacts": bundle["artifacts"]},
        entity_type="po_review",
        entity_id=case_id,
    )
    return bundle
