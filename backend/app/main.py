from __future__ import annotations

from contextlib import asynccontextmanager
from functools import wraps
from typing import Callable

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .schemas import (
    ActorContext,
    AdverseMediaReviewUpdate,
    ApproveCaseRequest,
    CopilotApplyRequest,
    CopilotQuestionRequest,
    NarrativeRegenerateSectionRequest,
    NarrativeUpdateRequest,
    StageCompleteRequest,
    StrAutofillUpdateRequest,
    SubmitCaseRequest,
    RequestInformationRequest,
    UploadAttemptRequest,
)
from .services.case_service import (
    analyst_performance,
    complete_stage,
    current_submission_snapshot,
    dashboard_summary,
    ensure_case_exists,
    ensure_initial_pending_submission,
    entity_graph,
    get_adverse_media,
    get_case_alerts,
    get_case_detail,
    get_case_transactions,
    get_demo_users,
    get_str_autofill,
    get_submission_confirmation,
    kyc_payload,
    list_cases,
    narrative_diff,
    po_cases,
    po_dashboard_summary,
    po_map_risk,
    po_review_payload,
    prior_alerts,
    refresh_str_autofill,
    save_str_autofill,
    update_adverse_media_review,
    weekly_filings,
)
from .services.export_service import (
    get_artifact_path,
    get_decision,
    record_fiu_upload_attempt,
)
from .services.narrative_service import (
    compliance_check,
    copilot_answer,
    record_copilot_apply,
    generate_narrative,
    get_grounds,
    get_narrative_audit,
    regenerate_section,
    save_narrative,
)
from .services.retrieval import build_retrieval_index
from .services.validation_service import (
    approve_case,
    get_presubmission_validation,
    request_information,
    run_presubmission_validation,
    submit_case,
    validate_approval,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    build_retrieval_index()
    for case_id in ["CASE001", "CASE002", "CASE003"]:
        case = ensure_case_exists(case_id)
        if case["stage"] in {"PENDING_REVIEW", "SUBMITTED"}:
            ensure_initial_pending_submission(case_id)
    yield


app = FastAPI(title="Auto-SAR", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_actor(
    x_demo_role: str | None = Header(default=None),
    x_demo_user_id: str | None = Header(default=None),
    x_demo_user_name: str | None = Header(default=None),
) -> ActorContext:
    demo_users = get_demo_users()
    if (x_demo_role or "").upper() == "PO":
        return ActorContext(
            role="PO",
            user_id=x_demo_user_id or demo_users["po"]["user_id"],
            user_name=x_demo_user_name or demo_users["po"]["user_name"],
        )
    return ActorContext(
        role="ANALYST",
        user_id=x_demo_user_id or demo_users["analyst"]["user_id"],
        user_name=x_demo_user_name or demo_users["analyst"]["user_name"],
    )


def require_role(role: str) -> Callable[[ActorContext], ActorContext]:
    def dependency(actor: ActorContext = Depends(get_actor)) -> ActorContext:
        if actor.role != role:
            raise HTTPException(status_code=403, detail=f"{role} role required")
        return actor

    return dependency


def handle_errors(func: Callable) -> Callable:
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc

    return wrapper


@app.get("/api/auth/demo-users")
@handle_errors
def demo_users():
    return get_demo_users()


@app.get("/api/dashboard/summary")
@handle_errors
def api_dashboard_summary(_: ActorContext = Depends(require_role("ANALYST"))):
    return dashboard_summary()


@app.get("/api/cases")
@handle_errors
def api_list_cases(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    triggerType: str | None = Query(default=None),
    customerSegment: str | None = Query(default=None),
    _: ActorContext = Depends(get_actor),
):
    return list_cases(search=search, status=status, trigger_type=triggerType, customer_segment=customerSegment)


@app.get("/api/cases/{case_id}")
@handle_errors
def api_case_detail(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_case_detail(case_id)


@app.get("/api/cases/{case_id}/alerts")
@handle_errors
def api_case_alerts(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_case_alerts(case_id)


@app.get("/api/cases/{case_id}/kyc")
@handle_errors
def api_case_kyc(case_id: str, _: ActorContext = Depends(require_role("ANALYST"))):
    return kyc_payload(case_id)


@app.get("/api/cases/{case_id}/transactions")
@handle_errors
def api_case_transactions(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_case_transactions(case_id)


@app.get("/api/cases/{case_id}/prior-alerts")
@handle_errors
def api_case_prior_alerts(case_id: str, _: ActorContext = Depends(get_actor)):
    return prior_alerts(case_id)


@app.get("/api/cases/{case_id}/entity-graph")
@handle_errors
def api_case_entity_graph(case_id: str, _: ActorContext = Depends(get_actor)):
    return entity_graph(case_id)


@app.get("/api/cases/{case_id}/adverse-media")
@handle_errors
def api_case_adverse_media(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_adverse_media(case_id)


@app.put("/api/cases/{case_id}/adverse-media-review")
@handle_errors
def api_update_adverse_media(case_id: str, request: AdverseMediaReviewUpdate, actor: ActorContext = Depends(require_role("ANALYST"))):
    return update_adverse_media_review(case_id, request.adverse_media_id, request.review_status, actor.model_dump())


@app.post("/api/cases/{case_id}/data-assembly/complete-stage")
@handle_errors
def api_complete_data_assembly(case_id: str, request: StageCompleteRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return complete_stage(case_id, "data-assembly", actor.model_dump(), request.note)


@app.get("/api/cases/{case_id}/str-autofill")
@handle_errors
def api_get_str_autofill(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_str_autofill(case_id)


@app.put("/api/cases/{case_id}/str-autofill")
@handle_errors
def api_put_str_autofill(case_id: str, request: StrAutofillUpdateRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return save_str_autofill(case_id, request.values, actor.model_dump())


@app.post("/api/cases/{case_id}/str-autofill/refresh")
@handle_errors
def api_refresh_str_autofill(case_id: str, actor: ActorContext = Depends(require_role("ANALYST"))):
    return refresh_str_autofill(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/str-autofill/complete-stage")
@handle_errors
def api_complete_str_autofill(case_id: str, request: StageCompleteRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return complete_stage(case_id, "str-autofill", actor.model_dump(), request.note)


@app.get("/api/cases/{case_id}/grounds")
@handle_errors
def api_get_grounds(case_id: str, actor: ActorContext = Depends(get_actor)):
    return get_grounds(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/narrative/generate")
@handle_errors
def api_generate_narrative(case_id: str, actor: ActorContext = Depends(require_role("ANALYST"))):
    return generate_narrative(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/narrative/regenerate-section")
@handle_errors
def api_regenerate_section(case_id: str, request: NarrativeRegenerateSectionRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return regenerate_section(case_id, request.section_id, actor.model_dump(), request.instruction)


@app.put("/api/cases/{case_id}/narrative")
@handle_errors
def api_put_narrative(case_id: str, request: NarrativeUpdateRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return save_narrative(case_id, actor.model_dump(), request.final_text, request.sections, request.edit_reason)


@app.get("/api/cases/{case_id}/narrative/audit")
@handle_errors
def api_narrative_audit(case_id: str, actor: ActorContext = Depends(get_actor)):
    return get_narrative_audit(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/narrative/copilot")
@handle_errors
def api_narrative_copilot(case_id: str, request: CopilotQuestionRequest, actor: ActorContext = Depends(get_actor)):
    return copilot_answer(case_id, actor.model_dump(), request.question, request.current_draft)


@app.post("/api/cases/{case_id}/narrative/copilot/apply")
@handle_errors
def api_narrative_copilot_apply(case_id: str, request: CopilotApplyRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return record_copilot_apply(
        case_id,
        actor.model_dump(),
        request.question,
        request.suggested_text,
        request.model,
        request.raw_response_id,
    )


@app.post("/api/cases/{case_id}/narrative/compliance-check")
@handle_errors
def api_narrative_compliance(case_id: str, actor: ActorContext = Depends(get_actor)):
    return compliance_check(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/narrative/complete-stage")
@handle_errors
def api_complete_grounds(case_id: str, request: StageCompleteRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return complete_stage(case_id, "grounds", actor.model_dump(), request.note)


@app.get("/api/cases/{case_id}/presubmission-validation")
@handle_errors
def api_get_validation(case_id: str, actor: ActorContext = Depends(get_actor)):
    return get_presubmission_validation(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/presubmission-validation/run")
@handle_errors
def api_run_validation(case_id: str, actor: ActorContext = Depends(require_role("ANALYST"))):
    return run_presubmission_validation(case_id, actor.model_dump())


@app.post("/api/cases/{case_id}/submit")
@handle_errors
def api_submit_case(case_id: str, request: SubmitCaseRequest, actor: ActorContext = Depends(require_role("ANALYST"))):
    return submit_case(case_id, actor.model_dump(), request.analyst_notes)


@app.get("/api/cases/{case_id}/submission-confirmation")
@handle_errors
def api_submission_confirmation(case_id: str, _: ActorContext = Depends(get_actor)):
    return get_submission_confirmation(case_id)


@app.get("/api/po/dashboard/summary")
@handle_errors
def api_po_dashboard_summary(_: ActorContext = Depends(require_role("PO"))):
    return po_dashboard_summary()


@app.get("/api/po/cases")
@handle_errors
def api_po_cases(search: str | None = Query(default=None), status: str | None = Query(default=None), _: ActorContext = Depends(require_role("PO"))):
    return po_cases(search=search, status=status)


@app.get("/api/po/map-risk")
@handle_errors
def api_po_map(_: ActorContext = Depends(require_role("PO"))):
    return po_map_risk()


@app.get("/api/po/analytics/weekly-filings")
@handle_errors
def api_weekly_filings(_: ActorContext = Depends(require_role("PO"))):
    return weekly_filings()


@app.get("/api/po/analytics/analyst-performance")
@handle_errors
def api_analyst_performance(_: ActorContext = Depends(require_role("PO"))):
    return analyst_performance()


@app.get("/api/po/cases/{case_id}/review")
@handle_errors
def api_po_review(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    return po_review_payload(case_id)


@app.post("/api/po/cases/{case_id}/request-information")
@handle_errors
def api_request_information(case_id: str, request: RequestInformationRequest, actor: ActorContext = Depends(require_role("PO"))):
    return request_information(case_id, actor.model_dump(), request.comment)


@app.get("/api/po/cases/{case_id}/diff")
@handle_errors
def api_po_diff(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    return narrative_diff(case_id)


@app.get("/api/po/cases/{case_id}/audit-ledger")
@handle_errors
def api_po_audit(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    review = po_review_payload(case_id)
    return review["auditLedger"]


@app.get("/api/po/cases/{case_id}/paragraph-traces")
@handle_errors
def api_po_traces(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    review = po_review_payload(case_id)
    return review["paragraphTraces"]


@app.post("/api/po/cases/{case_id}/validate-approval")
@handle_errors
def api_validate_approval(case_id: str, actor: ActorContext = Depends(require_role("PO"))):
    return validate_approval(case_id, actor.model_dump())


@app.post("/api/po/cases/{case_id}/approve")
@handle_errors
def api_approve_case(case_id: str, request: ApproveCaseRequest, actor: ActorContext = Depends(require_role("PO"))):
    return approve_case(case_id, actor.model_dump(), request.decision_note)


@app.get("/api/po/cases/{case_id}/decision")
@handle_errors
def api_decision(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    return get_decision(case_id)


@app.get("/api/po/cases/{case_id}/export/xml")
@handle_errors
def api_export_xml(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    path = get_artifact_path(case_id, "xml")
    return FileResponse(path, media_type="application/xml", filename=path.name)


@app.get("/api/po/cases/{case_id}/export/audit-dossier")
@handle_errors
def api_export_pdf(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    path = get_artifact_path(case_id, "pdf")
    return FileResponse(path, media_type="application/pdf", filename=path.name)


@app.get("/api/po/cases/{case_id}/export/ledger-json")
@handle_errors
def api_export_ledger(case_id: str, _: ActorContext = Depends(require_role("PO"))):
    path = get_artifact_path(case_id, "json")
    return FileResponse(path, media_type="application/json", filename=path.name)


@app.post("/api/po/cases/{case_id}/export/fiu-upload-attempt")
@handle_errors
def api_fiu_upload(case_id: str, request: UploadAttemptRequest, actor: ActorContext = Depends(require_role("PO"))):
    return record_fiu_upload_attempt(case_id, actor.model_dump(), request.note)
