from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from xml.etree.ElementTree import Element, SubElement, tostring

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from .audit import append_ledger_event, read_ledger, sha256_file
from .case_service import current_submission_snapshot, ensure_case_exists
from .runtime_state import get_case_artifacts_dir, read_case_json, utc_now_iso, write_case_json


def build_xml_string(snapshot: dict[str, Any]) -> str:
    root = Element("SARFiling")
    metadata = SubElement(root, "Metadata")
    SubElement(metadata, "CaseId").text = snapshot["case"]["caseId"]
    SubElement(metadata, "SubmissionId").text = snapshot["submissionId"]
    SubElement(metadata, "SubmittedAt").text = snapshot["submittedAt"]

    subject = SubElement(root, "Subject")
    SubElement(subject, "Name").text = snapshot["case"]["customerName"]
    SubElement(subject, "CustomerId").text = snapshot["case"]["customerId"]
    SubElement(subject, "RiskLevel").text = snapshot["case"]["riskLevel"]

    narrative = SubElement(root, "Narrative")
    narrative.text = snapshot["narrative"]["finalText"]

    transactions = SubElement(root, "SuspiciousTransactions")
    for txn in snapshot["transactions"]:
        txn_el = SubElement(transactions, "Transaction")
        SubElement(txn_el, "TransactionId").text = txn["transaction_id"]
        SubElement(txn_el, "Timestamp").text = txn["txn_timestamp"]
        SubElement(txn_el, "Amount").text = str(txn["amount"])
        SubElement(txn_el, "Direction").text = txn["direction"]
        SubElement(txn_el, "Mode").text = txn["payment_format"]
    return tostring(root, encoding="unicode")


def _write_pdf(snapshot: dict[str, Any], target: Path, decision: dict[str, Any] | None, artifacts: list[dict[str, Any]]) -> None:
    styles = getSampleStyleSheet()
    doc = SimpleDocTemplate(str(target), pagesize=A4)
    story = [
        Paragraph("Auto-SAR Audit Dossier", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Case ID: {snapshot['case']['caseId']}", styles["Heading2"]),
        Paragraph(f"Subject: {snapshot['case']['customerName']}", styles["Normal"]),
        Paragraph(f"Risk: {snapshot['case']['riskLevel']} ({snapshot['case']['riskScore']})", styles["Normal"]),
        Spacer(1, 10),
        Paragraph("Narrative", styles["Heading2"]),
        Paragraph(snapshot["narrative"]["finalText"].replace("\n", "<br/>"), styles["BodyText"]),
        Spacer(1, 10),
        Paragraph("Validation", styles["Heading2"]),
    ]
    for item in snapshot["validation"]["checks"]:
        story.append(Paragraph(f"{item['rule']}: {'PASS' if item['passed'] else 'FAIL'}", styles["Normal"]))
    story.extend([Spacer(1, 10), Paragraph("Artifacts", styles["Heading2"])])
    for artifact in artifacts:
        story.append(Paragraph(f"{artifact['name']}: {artifact['sha256']}", styles["Code"]))
    if decision:
        story.extend([Spacer(1, 10), Paragraph("PO Decision", styles["Heading2"])])
        story.append(Paragraph(json.dumps(decision), styles["Code"]))
    story.extend([Spacer(1, 10), Paragraph("Audit Ledger Excerpt", styles["Heading2"])])
    for entry in read_ledger(snapshot["case"]["caseId"])[-8:]:
        story.append(Paragraph(f"{entry['event_type']} [{entry['event_hash'][:16]}...]", styles["Code"]))
    doc.build(story)


def generate_export_bundle(case_id: str, actor: dict[str, Any], decision_note: str | None = None) -> dict[str, Any]:
    snapshot = current_submission_snapshot(case_id)
    if not snapshot:
        raise KeyError("Submission snapshot not found")
    review = read_case_json(case_id, "po_review.json", {"comments": [], "decision": None})
    cycle_dir = get_case_artifacts_dir(case_id, snapshot["reviewCycleId"])

    xml_path = cycle_dir / f"{snapshot['submissionId']}.xml"
    xml_path.write_text(build_xml_string(snapshot), encoding="utf-8")

    ledger_path = cycle_dir / f"{snapshot['submissionId']}_ledger.json"
    ledger_path.write_text(json.dumps(read_ledger(case_id), indent=2), encoding="utf-8")

    artifacts = [
        {"name": "XML", "type": "xml", "path": str(xml_path), "sha256": sha256_file(xml_path)},
        {"name": "Ledger JSON", "type": "json", "path": str(ledger_path), "sha256": sha256_file(ledger_path)},
    ]

    pdf_path = cycle_dir / f"{snapshot['submissionId']}_audit_dossier.pdf"
    _write_pdf(snapshot, pdf_path, review.get("decision"), artifacts)
    artifacts.append({"name": "Audit Dossier PDF", "type": "pdf", "path": str(pdf_path), "sha256": sha256_file(pdf_path)})

    bundle = {
        "caseId": case_id,
        "submissionId": snapshot["submissionId"],
        "reviewCycleId": snapshot["reviewCycleId"],
        "approvedAt": utc_now_iso(),
        "approvedBy": actor,
        "decisionNote": decision_note,
        "artifacts": artifacts,
    }
    write_case_json(case_id, "artifact_bundle.json", bundle)
    for artifact in artifacts:
        append_ledger_event(
            case_id=case_id,
            review_cycle_id=snapshot["reviewCycleId"],
            stage="PO_APPROVED",
            event_type=f"ARTIFACT_{artifact['type'].upper()}_GENERATED",
            actor=actor,
            payload=artifact,
            entity_type="artifact",
            entity_id=artifact["name"],
            artifact_path=artifact["path"],
        )
    return bundle


def get_decision(case_id: str) -> dict[str, Any]:
    case = ensure_case_exists(case_id)
    snapshot = current_submission_snapshot(case_id)
    bundle = read_case_json(case_id, "artifact_bundle.json", None)
    review = read_case_json(case_id, "po_review.json", {"comments": [], "decision": None})
    return {"case": case, "snapshot": snapshot, "bundle": bundle, "review": review}


def get_artifact_path(case_id: str, artifact_type: str) -> Path:
    bundle = read_case_json(case_id, "artifact_bundle.json", None)
    if not bundle:
        raise KeyError("Artifacts not generated")
    for artifact in bundle["artifacts"]:
        if artifact["type"] == artifact_type:
            return Path(artifact["path"])
    raise KeyError(f"Artifact {artifact_type} not found")


def record_fiu_upload_attempt(case_id: str, actor: dict[str, Any], note: str | None = None) -> dict[str, Any]:
    decision = get_decision(case_id)
    payload = {"attemptedAt": utc_now_iso(), "actor": actor, "note": note, "status": "Stub recorded"}
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=decision["snapshot"]["reviewCycleId"] if decision["snapshot"] else None,
        stage="PO_APPROVED",
        event_type="FIU_UPLOAD_ATTEMPTED",
        actor=actor,
        payload=payload,
        entity_type="export",
        entity_id=case_id,
    )
    return payload
