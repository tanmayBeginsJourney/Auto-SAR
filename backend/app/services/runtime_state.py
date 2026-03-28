from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..config import get_config


UTC = timezone.utc


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _case_dir(case_id: str) -> Path:
    path = get_config().runtime_state_dir / "cases" / case_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _artifacts_dir(case_id: str) -> Path:
    path = get_config().runtime_state_dir / "artifacts" / case_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_case_file(case_id: str, filename: str) -> Path:
    return _case_dir(case_id) / filename


def get_case_artifacts_dir(case_id: str, review_cycle_id: str | None = None) -> Path:
    path = _artifacts_dir(case_id)
    if review_cycle_id:
        path = path / review_cycle_id
        path.mkdir(parents=True, exist_ok=True)
    return path


def get_ledger_file(case_id: str) -> Path:
    path = get_config().runtime_state_dir / "audit_ledger" / f"{case_id}.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return deepcopy(default)
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def read_case_json(case_id: str, filename: str, default: Any) -> Any:
    return _read_json(get_case_file(case_id, filename), default)


def write_case_json(case_id: str, filename: str, payload: Any) -> None:
    _write_json(get_case_file(case_id, filename), payload)


def read_workflow(case_id: str, seeded_stage: str, po_route: dict[str, Any]) -> dict[str, Any]:
    workflow = read_case_json(
        case_id,
        "workflow.json",
        {
            "case_id": case_id,
            "current_stage": seeded_stage,
            "locked_for_analyst": seeded_stage in {"PENDING_REVIEW", "SUBMITTED", "PO_APPROVED"},
            "current_review_cycle_id": None,
            "latest_submission_id": None,
            "po_route": po_route,
            "notifications": [],
            "stage_events": [],
            "review_cycles": [],
            "last_updated_at": utc_now_iso(),
        },
    )
    if "po_route" not in workflow:
        workflow["po_route"] = po_route
    return workflow


def save_workflow(case_id: str, workflow: dict[str, Any]) -> None:
    workflow["last_updated_at"] = utc_now_iso()
    write_case_json(case_id, "workflow.json", workflow)


def update_workflow_stage(
    case_id: str,
    workflow: dict[str, Any],
    stage: str,
    actor: dict[str, Any],
    note: str | None = None,
    lock_analyst: bool | None = None,
) -> dict[str, Any]:
    workflow["current_stage"] = stage
    if lock_analyst is not None:
        workflow["locked_for_analyst"] = lock_analyst
    workflow.setdefault("stage_events", []).append(
        {
            "event_id": f"stg_{uuid4().hex[:12]}",
            "stage": stage,
            "changed_at": utc_now_iso(),
            "actor": actor,
            "note": note,
        }
    )
    save_workflow(case_id, workflow)
    return workflow


def list_case_versions(case_id: str) -> list[dict[str, Any]]:
    return read_case_json(case_id, "versions/index.json", [])


def add_case_version(case_id: str, filename: str, payload: dict[str, Any]) -> dict[str, Any]:
    version_id = f"ver_{uuid4().hex[:12]}"
    path = get_case_file(case_id, f"versions/{version_id}_{filename}")
    _write_json(path, payload)
    index = list_case_versions(case_id)
    index.append(
        {
            "version_id": version_id,
            "filename": filename,
            "path": str(path),
            "created_at": utc_now_iso(),
        }
    )
    write_case_json(case_id, "versions/index.json", index)
    return index[-1]
