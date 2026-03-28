from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


Role = Literal["ANALYST", "PO"]


class ActorContext(BaseModel):
    role: Role
    user_id: str
    user_name: str


class AdverseMediaReviewUpdate(BaseModel):
    adverse_media_id: str
    review_status: Literal["RELEVANT", "NOT_RELEVANT", "UNREVIEWED"]


class StageCompleteRequest(BaseModel):
    note: str | None = None


class StrAutofillUpdateRequest(BaseModel):
    values: dict[str, Any]


class NarrativeGenerateRequest(BaseModel):
    regenerate: bool = False


class NarrativeUpdateRequest(BaseModel):
    final_text: str
    sections: list[dict[str, Any]] = Field(default_factory=list)
    edit_reason: str | None = None


class NarrativeRegenerateSectionRequest(BaseModel):
    section_id: str
    instruction: str | None = None


class CopilotQuestionRequest(BaseModel):
    question: str


class SubmitCaseRequest(BaseModel):
    analyst_notes: str | None = None


class RequestInformationRequest(BaseModel):
    comment: str


class ApproveCaseRequest(BaseModel):
    decision_note: str | None = None


class UploadAttemptRequest(BaseModel):
    note: str | None = None
