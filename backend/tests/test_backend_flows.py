from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.case_service import dashboard_summary, get_case_transactions, get_str_autofill, list_cases, po_map_risk
from app.services.narrative_service import _normalize_sections, compliance_check, generate_narrative, save_narrative
from app.services.validation_service import submit_case


def test_dashboard_aggregation_uses_live_counts():
    summary = dashboard_summary()
    assert summary["openAlerts"] == 8
    assert summary["activeCaseCount"] == 3
    assert summary["pendingPoReview"] == 1


def test_case_transactions_are_deduplicated():
    transactions = get_case_transactions("CASE001")
    ids = [item["transaction_id"] for item in transactions]
    assert len(ids) == len(set(ids))
    assert len(ids) == 5


def test_str_autofill_maps_primary_subject_and_account():
    autofill = get_str_autofill("CASE003")
    assert autofill["sections"]["part1"]["reportingEntityName"] == "Barclays Bank PLC - India Operations"
    assert autofill["sections"]["part4"]["individuals"][0]["name"] == "Pooja Iyer"
    assert autofill["sections"]["part6"]["accounts"][0]["accountNumber"] == "AC1011"


def test_normalize_sections_accepts_full_narrative_text():
    sections = _normalize_sections(
        {
            "grounds_of_suspicion_narrative": (
                "Introduction: Intro facts.\n\n"
                "Body: Body facts.\n\n"
                "Conclusion: Closing rationale."
            )
        }
    )
    assert [section["id"] for section in sections] == ["introduction", "body", "conclusion"]
    assert sections[0]["text"] == "Intro facts."
    assert sections[2]["text"] == "Closing rationale."


def test_normalize_sections_accepts_single_section_regeneration():
    sections = _normalize_sections({"conclusion": "Updated conclusion text."})
    assert sections == [{"id": "conclusion", "title": "Conclusion", "text": "Updated conclusion text."}]


def test_crypto_detection_and_compliance_logic():
    actor = {"role": "ANALYST", "user_id": "EMP001", "user_name": "Naina Kapoor"}
    transactions = get_case_transactions("CASE003")
    assert any(txn["isCryptoTouch"] for txn in transactions)

    generated = generate_narrative("CASE003", actor)
    assert "crypto exchange" in generated["finalText"].lower() or "crypto platform" in generated["finalText"].lower()
    passed = compliance_check("CASE003", actor)
    assert passed["passed"] is True

    save_narrative(
        "CASE003",
        actor,
        "Pooja Iyer received suspicious funds and activity looks unusual, but the narrative omits the crypto movement.",
        [],
        "negative test",
    )
    failed = compliance_check("CASE003", actor)
    assert failed["passed"] is False
    assert any(check["rule"] == "Crypto paragraph included" and not check["pass"] for check in failed["checks"])


def test_submission_blocks_when_required_artifacts_are_missing():
    actor = {"role": "ANALYST", "user_id": "EMP001", "user_name": "Naina Kapoor"}
    try:
        submit_case("CASE001", actor, "Attempting premature submission")
    except ValueError as exc:
        assert "blocked" in str(exc).lower()
    else:
        raise AssertionError("Submission should have been blocked without a narrative draft")


def test_api_smoke_for_analyst_and_po_routes():
    client = TestClient(app)
    analyst_headers = {"X-Demo-Role": "ANALYST"}
    po_headers = {"X-Demo-Role": "PO"}

    assert client.get("/api/dashboard/summary", headers=analyst_headers).status_code == 200
    assert client.get("/api/cases/CASE001/grounds", headers=analyst_headers).status_code == 200
    assert client.get("/api/po/dashboard/summary", headers=po_headers).status_code == 200
    assert client.post("/api/po/cases/CASE002/validate-approval", headers=po_headers).status_code == 200


def test_case_risk_scores_are_varied_and_case001_is_highest():
    scores = {item["caseId"]: item["riskScore"] for item in list_cases()}
    assert scores["CASE001"] == 97
    assert scores["CASE003"] == 85
    assert scores["CASE002"] == 84
    assert len(set(scores.values())) == 3


def test_po_map_includes_sanctioned_country_hotspots():
    nodes = po_map_risk()["nodes"]
    sanctioned = {node["country"]: node for node in nodes if node["riskReason"] == "Sanctioned Country High Risk"}
    assert {"Iran", "North Korea", "Syria"}.issubset(set(sanctioned))
    assert all(node["severity"] == "critical" for node in sanctioned.values())
