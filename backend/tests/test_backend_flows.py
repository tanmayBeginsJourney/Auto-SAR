from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.case_service import dashboard_summary, get_case_transactions, get_str_autofill
from app.services.narrative_service import compliance_check, generate_narrative, save_narrative
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
