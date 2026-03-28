from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..config import get_config
from .runtime_state import get_ledger_file


def _sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _canonical_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def read_ledger(case_id: str) -> list[dict[str, Any]]:
    path = get_ledger_file(case_id)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def append_ledger_event(
    *,
    case_id: str,
    review_cycle_id: str | None,
    stage: str,
    event_type: str,
    actor: dict[str, Any],
    payload: dict[str, Any],
    entity_type: str | None = None,
    entity_id: str | None = None,
    artifact_path: str | None = None,
) -> dict[str, Any]:
    config = get_config()
    entries = read_ledger(case_id)
    prev_event_hash = entries[-1]["event_hash"] if entries else "GENESIS"
    event = {
        "event_id": f"evt_{uuid4().hex[:12]}",
        "case_id": case_id,
        "review_cycle_id": review_cycle_id,
        "stage": stage,
        "event_type": event_type,
        "actor_type": actor.get("role"),
        "actor_id": actor.get("user_id"),
        "actor_name": actor.get("user_name"),
        "payload_json": payload,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "prev_event_hash": prev_event_hash,
        "artifact_hash": None,
        "signature_label": config.ledger_signature_label,
    }
    if artifact_path:
        path = Path(artifact_path)
        if path.exists():
            event["artifact_hash"] = sha256_file(path)
    canonical = _canonical_json(
        {
            "case_id": case_id,
            "review_cycle_id": review_cycle_id,
            "stage": stage,
            "event_type": event_type,
            "actor": actor,
            "payload_json": payload,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "artifact_hash": event["artifact_hash"],
        }
    )
    event["event_hash"] = _sha256_text(canonical + prev_event_hash)
    path = get_ledger_file(case_id)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=True) + "\n")
    return event


def validate_ledger(case_id: str) -> dict[str, Any]:
    entries = read_ledger(case_id)
    if not entries:
        return {"status": "warning", "message": "No ledger entries yet", "checkedEvents": 0}

    previous_hash = "GENESIS"
    broken_events: list[str] = []
    for entry in entries:
        canonical = _canonical_json(
            {
                "case_id": entry["case_id"],
                "review_cycle_id": entry.get("review_cycle_id"),
                "stage": entry["stage"],
                "event_type": entry["event_type"],
                "actor": {
                    "role": entry.get("actor_type"),
                    "user_id": entry.get("actor_id"),
                    "user_name": entry.get("actor_name"),
                },
                "payload_json": entry["payload_json"],
                "entity_type": entry.get("entity_type"),
                "entity_id": entry.get("entity_id"),
                "artifact_hash": entry.get("artifact_hash"),
            }
        )
        expected_hash = _sha256_text(canonical + previous_hash)
        if entry.get("prev_event_hash") != previous_hash or entry.get("event_hash") != expected_hash:
            broken_events.append(entry["event_id"])
        previous_hash = entry.get("event_hash") or previous_hash

    return {
        "status": "valid" if not broken_events else "broken",
        "message": "Ledger chain is internally consistent" if not broken_events else "Ledger chain verification failed",
        "checkedEvents": len(entries),
        "brokenEventIds": broken_events,
    }
