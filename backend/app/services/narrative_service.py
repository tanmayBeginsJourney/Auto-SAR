from __future__ import annotations

import hashlib
import json
import re
import time
from typing import Any

from openai import OpenAI

from ..config import get_config
from .audit import append_ledger_event, read_ledger
from .case_service import (
    ensure_case_exists,
    get_adverse_media,
    get_case_alerts,
    get_case_detail,
    get_case_transactions,
    get_str_autofill,
    kyc_payload,
    prior_alerts,
)
from .reference_data import get_rule
from .retrieval import retrieve_guidance
from .runtime_state import add_case_version, read_case_json, utc_now_iso, write_case_json


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _clean_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    if not text.startswith("{"):
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]
    return json.loads(text)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    return text


def _split_narrative_sections(text: str) -> list[dict[str, str]]:
    text = _strip_code_fences(text)
    if not text:
        return []

    marker_pattern = re.compile(
        r"(?im)^\s*(Introduction|Body|Conclusion)\s*:\s*"
    )
    matches = list(marker_pattern.finditer(text))
    if matches:
        sections: list[dict[str, str]] = []
        for index, match in enumerate(matches):
            title = match.group(1).title()
            start = match.end()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            body = text[start:end].strip()
            if body:
                sections.append(
                    {
                        "id": title.lower(),
                        "title": title,
                        "text": body,
                    }
                )
        if sections:
            return sections

    parts = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    default_titles = ["Introduction", "Body", "Conclusion"]
    if len(parts) >= 3:
        return [
            {"id": default_titles[index].lower(), "title": default_titles[index], "text": part}
            for index, part in enumerate(parts[:3])
        ]
    if len(parts) == 1:
        return [{"id": "body", "title": "Body", "text": parts[0]}]
    return [
        {"id": f"section-{index + 1}", "title": f"Section {index + 1}", "text": part}
        for index, part in enumerate(parts)
    ]


def _normalize_sections(payload: dict[str, Any]) -> list[dict[str, Any]]:
    lowered_payload = {str(key).lower(): value for key, value in payload.items()}
    raw_sections = payload.get("sections")
    if isinstance(raw_sections, list):
        normalized = []
        for index, section in enumerate(raw_sections):
            if not isinstance(section, dict):
                continue
            text = str(section.get("text") or "").strip()
            if not text:
                continue
            title = str(section.get("title") or section.get("id") or f"Section {index + 1}").strip()
            section_id = str(section.get("id") or title.lower().replace(" ", "_")).strip()
            normalized.append({"id": section_id, "title": title, "text": text})
        if normalized:
            return normalized

    keyed_sections = []
    for section_id, title in [("introduction", "Introduction"), ("body", "Body"), ("conclusion", "Conclusion")]:
        text = payload.get(section_id, lowered_payload.get(section_id))
        if isinstance(text, str) and text.strip():
            keyed_sections.append({"id": section_id, "title": title, "text": text.strip()})
    if keyed_sections:
        return keyed_sections

    narrative_text = (
        payload.get("grounds_of_suspicion_narrative")
        or lowered_payload.get("grounds_of_suspicion_narrative")
        or payload.get("finalText")
        or lowered_payload.get("finaltext")
        or payload.get("final_text")
        or lowered_payload.get("final_text")
        or payload.get("narrative")
        or lowered_payload.get("narrative")
        or payload.get("draft")
        or lowered_payload.get("draft")
    )
    if isinstance(narrative_text, str) and narrative_text.strip():
        return _split_narrative_sections(narrative_text)

    string_values = [value.strip() for value in payload.values() if isinstance(value, str) and value.strip()]
    if string_values:
        return _split_narrative_sections(max(string_values, key=len))

    return []


def _serialize_usage(usage: Any) -> Any:
    if usage is None:
        return None
    if hasattr(usage, "model_dump"):
        return usage.model_dump()
    if isinstance(usage, dict):
        return usage
    return str(usage)


def _audit_heading(entry: dict[str, Any]) -> str:
    return {
        "NARRATIVE_GENERATED": "Initial draft generated",
        "NARRATIVE_REGENERATED": "Draft regenerated",
        "NARRATIVE_MANUALLY_EDITED": "Draft saved",
        "NARRATIVE_COPILOT_ASKED": "User asked Saaregama",
        "NARRATIVE_COPILOT_APPLIED": "Saaregama applied the changes to draft",
    }.get(entry.get("event_type", ""), entry.get("event_type", "Audit event").replace("_", " ").title())


def _audit_description(entry: dict[str, Any]) -> str:
    payload = entry.get("payload_json", {})
    event_type = entry.get("event_type")
    if event_type == "NARRATIVE_GENERATED":
        return f'Generated the first narrative draft using {payload.get("model", "the configured model")}.'
    if event_type == "NARRATIVE_REGENERATED":
        instruction = payload.get("instruction")
        if instruction:
            return f'Regenerated the draft with instruction: "{instruction}"'
        return f'Regenerated the narrative draft using {payload.get("model", "the configured model")}.'
    if event_type == "NARRATIVE_MANUALLY_EDITED":
        reason = payload.get("editReason") or "Analyst review edit"
        return f'Draft content was saved manually. Reason: "{reason}"'
    if event_type == "NARRATIVE_COPILOT_ASKED":
        answer = str(payload.get("answer", "")).strip()
        answer_excerpt = answer[:180].rstrip()
        if answer and len(answer) > 180:
            answer_excerpt += "..."
        if answer_excerpt:
            return f'User asked "{payload.get("question", "")}"\nSaaregama replied: "{answer_excerpt}"'
        return f'User asked "{payload.get("question", "")}"'
    if event_type == "NARRATIVE_COPILOT_APPLIED":
        model = payload.get("model")
        if model:
            return f'Applied Saaregama response from query "{payload.get("question", "")}" to the draft editor using {model}.'
        return f'Applied Saaregama response from query "{payload.get("question", "")}" to the draft editor.'
    return "Narrative activity was recorded."


def _narrative_audit_entries(case_id: str) -> list[dict[str, Any]]:
    supported_types = {
        "NARRATIVE_GENERATED",
        "NARRATIVE_REGENERATED",
        "NARRATIVE_MANUALLY_EDITED",
        "NARRATIVE_COPILOT_ASKED",
        "NARRATIVE_COPILOT_APPLIED",
    }
    entries = []
    for entry in read_ledger(case_id):
        if entry.get("event_type") not in supported_types:
            continue
        entries.append(
            {
                "eventId": entry.get("event_id"),
                "occurredAt": entry.get("occurred_at"),
                "heading": _audit_heading(entry),
                "description": _audit_description(entry),
            }
        )
    return list(reversed(entries))


def _section_text(case_id: str, section_id: str, dossier: dict[str, Any]) -> str:
    case = dossier["case"]
    subject = dossier["subject"]
    transactions = dossier["transactions"]
    alerts = dossier["alerts"]
    adverse = dossier["adverseMedia"]
    intro = (
        f"{subject['customerName']} ({subject['customerId']}) was escalated under case {case['caseId']} "
        f"after {len(alerts)} alert(s) linked unusual activity on account {case['primaryAccountNumber']}. "
        f"The subject is recorded as {subject['riskTier']} risk and the case summary cites {case['summary'].lower()}."
    )
    chronological = []
    for txn in transactions[:6]:
        bank_context = txn["toBankName"] if txn["direction"] == "OUTBOUND" else txn["fromBankName"]
        chronological.append(
            f"On {txn['txn_timestamp']}, transaction {txn['transaction_id']} moved INR {txn['amount']:,} via "
            f"{txn['payment_format']} ({txn['direction'].lower()}) through {bank_context}."
        )
    body = " ".join(chronological)
    if dossier["isCryptoCase"]:
        source_fiat = next((txn for txn in transactions if txn["direction"] == "INBOUND"), None) or next(
            (txn for txn in transactions if not txn["isCryptoTouch"]),
            None,
        )
        crypto_txn = next((txn for txn in transactions if txn["isCryptoTouch"]), None)
        if source_fiat and crypto_txn:
            body += (
                f" Funds associated with transaction {source_fiat['transaction_id']} on {source_fiat['txn_timestamp']} "
                f"were then transferred to a crypto exchange in transaction {crypto_txn['transaction_id']} "
                f"for INR {crypto_txn['amount']:,}, which creates a same-day movement from fiat funds into a crypto platform."
            )
    if adverse:
        body += f" Adverse media linked to the subject includes {adverse[0]['headline']}."
    conclusion = (
        f"The activity appears unusual because the timing, value, and counterparties do not align with the "
        f"documented profile and triggered {', '.join(alert['rule_id'] for alert in alerts)}. "
        "On that basis the activity merits STR escalation and continued monitoring."
    )
    return {"introduction": intro, "body": body, "conclusion": conclusion}[section_id]


def build_case_dossier(case_id: str) -> dict[str, Any]:
    case = get_case_detail(case_id)
    subject = kyc_payload(case_id)
    alerts = get_case_alerts(case_id)
    transactions = get_case_transactions(case_id)
    adverse = get_adverse_media(case_id)
    prior = prior_alerts(case_id)
    guidance_query = f"{case['summary']} {' '.join(alert['alert_name'] for alert in alerts)} suspicious activity chronology"
    guidance = retrieve_guidance(guidance_query, limit=5)
    risk = {
        "riskScore": case["riskScore"],
        "riskLevel": case["riskLevel"],
        "riskFactors": case["riskFactors"],
        "riskExplanation": case["riskExplanation"],
    }
    rules = [
        {
            "ruleId": alert["rule_id"],
            "ruleName": alert["rule_name"],
            "thresholdLogic": alert["threshold_logic"],
            "configuredValue": alert["configured_value"],
            "reference": get_rule(alert["rule_id"]),
        }
        for alert in alerts
    ]
    return {
        "case": case,
        "subject": subject,
        "account": subject["primaryAccount"],
        "alerts": alerts,
        "transactions": transactions,
        "adverseMedia": adverse,
        "priorAlerts": prior,
        "risk": risk,
        "ruleReferences": rules,
        "guidance": guidance,
        "strAutofill": get_str_autofill(case_id),
        "isCryptoCase": case["isCryptoCase"],
    }


def _paragraph_traces(sections: list[dict[str, Any]], dossier: dict[str, Any], retrieved_chunks: list[dict[str, Any]], origin: str) -> list[dict[str, Any]]:
    transaction_ids = [txn["transaction_id"] for txn in dossier["transactions"]]
    alert_ids = [alert["alert_id"] for alert in dossier["alerts"]]
    chunk_ids = [chunk["chunkId"] for chunk in retrieved_chunks]
    traces = []
    for section in sections:
        traces.append(
            {
                "traceId": f"trace_{section['id']}",
                "sectionId": section["id"],
                "sectionTitle": section["title"],
                "text": section["text"],
                "sourceTransactionIds": transaction_ids,
                "sourceAlertIds": alert_ids,
                "retrievedChunkIds": chunk_ids,
                "origin": origin,
            }
        )
    return traces


def _fallback_generation(case_id: str, dossier: dict[str, Any]) -> dict[str, Any]:
    sections = [
        {"id": "introduction", "title": "Introduction", "text": _section_text(case_id, "introduction", dossier)},
        {"id": "body", "title": "Body", "text": _section_text(case_id, "body", dossier)},
        {"id": "conclusion", "title": "Conclusion", "text": _section_text(case_id, "conclusion", dossier)},
    ]
    return {
        "sections": sections,
        "finalText": "\n\n".join(section["text"] for section in sections),
        "model": "fallback-local-template",
        "usage": None,
        "latencyMs": 0,
    }


def _openai_generate(dossier: dict[str, Any], instruction: str | None = None) -> dict[str, Any]:
    config = get_config()
    if not config.openai_api_key:
        return _fallback_generation(dossier["case"]["caseId"], dossier)

    client = OpenAI(api_key=config.openai_api_key)
    prompt_payload = {
        "instruction": instruction or "Draft the full grounds of suspicion narrative.",
        "dossier": dossier,
        "requirements": [
            "Do not invent facts.",
            "Use chronology with dates and amounts.",
            "Use introduction, body, and conclusion sections.",
            "Avoid placeholders and 'see attached'.",
            "Be explicit about why the activity is unusual.",
        ],
    }
    if dossier["isCryptoCase"]:
        prompt_payload["requirements"].append(
            "Include a factual paragraph stating that funds moved to a crypto exchange and identify the source fiat funds."
        )
    started = time.perf_counter()
    response = client.responses.create(
        model=config.openai_model,
        input=[
            {"role": "system", "content": "You draft regulator-ready STR/SAR narratives from supplied facts only. Return JSON only."},
            {"role": "user", "content": json.dumps(prompt_payload)},
        ],
    )
    latency_ms = int((time.perf_counter() - started) * 1000)
    raw_output = response.output_text or ""
    try:
        parsed = _clean_json(raw_output)
    except json.JSONDecodeError:
        parsed = {}
    sections = _normalize_sections(parsed)
    if not sections and raw_output.strip():
        sections = _split_narrative_sections(raw_output)
    if not sections:
        raise ValueError("Model did not return sections")
    return {
        "sections": sections,
        "finalText": "\n\n".join(section["text"] for section in sections),
        "model": config.openai_model,
        "usage": _serialize_usage(getattr(response, "usage", None)),
        "latencyMs": latency_ms,
        "rawResponseId": getattr(response, "id", None),
        "promptPayloadHash": _sha(json.dumps(prompt_payload, sort_keys=True)),
    }


def _run_generation(case_id: str, dossier: dict[str, Any], actor: dict[str, Any], instruction: str | None = None, event_type: str = "NARRATIVE_GENERATED") -> dict[str, Any]:
    retrieved = dossier["guidance"]
    generated = _openai_generate(dossier, instruction)
    sections = generated["sections"]
    paragraph_traces = _paragraph_traces(sections, dossier, retrieved, origin="AI_GENERATED")
    payload = {
        "caseId": case_id,
        "dossier": dossier,
        "sections": sections,
        "finalText": generated["finalText"],
        "aiDraftText": generated["finalText"],
        "promptVersion": get_config().prompt_version,
        "retrievedGuidance": retrieved,
        "paragraphTraces": paragraph_traces,
        "complianceCheck": None,
        "model": generated["model"],
        "usage": generated.get("usage"),
        "lastGeneratedAt": utc_now_iso(),
        "lastSavedAt": utc_now_iso(),
        "lastSavedBy": actor["user_name"],
        "promptPayloadHash": generated.get("promptPayloadHash"),
    }
    write_case_json(case_id, "narrative.json", payload)
    add_case_version(case_id, "narrative.json", payload)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=ensure_case_exists(case_id)["workflow"].get("current_review_cycle_id"),
        stage=ensure_case_exists(case_id)["workflow"]["current_stage"],
        event_type=event_type,
        actor=actor,
        payload={
            "model": generated["model"],
            "promptVersion": get_config().prompt_version,
            "instruction": instruction,
            "promptPayloadHash": generated.get("promptPayloadHash"),
            "retrievedChunkIds": [chunk["chunkId"] for chunk in retrieved],
            "sourceTransactionIds": [txn["transaction_id"] for txn in dossier["transactions"]],
            "sourceAlertIds": [alert["alert_id"] for alert in dossier["alerts"]],
            "outputHash": _sha(generated["finalText"]),
            "latencyMs": generated.get("latencyMs"),
        },
        entity_type="narrative",
        entity_id=case_id,
    )
    return payload


def ensure_narrative_state(case_id: str, actor: dict[str, Any], allow_generation: bool = False) -> dict[str, Any]:
    saved = read_case_json(case_id, "narrative.json", None)
    if saved:
        return saved
    if allow_generation:
        return _run_generation(case_id, build_case_dossier(case_id), actor)
    return {
        "caseId": case_id,
        "dossier": build_case_dossier(case_id),
        "sections": [],
        "finalText": "",
        "aiDraftText": "",
        "retrievedGuidance": [],
        "paragraphTraces": [],
        "complianceCheck": None,
    }


def get_grounds(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    state = ensure_narrative_state(case_id, actor, allow_generation=True)
    return {"case": get_case_detail(case_id), "dossier": build_case_dossier(case_id), "narrative": state}


def generate_narrative(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    return _run_generation(case_id, build_case_dossier(case_id), actor)


def regenerate_section(case_id: str, section_id: str, actor: dict[str, Any], instruction: str | None = None) -> dict[str, Any]:
    current = ensure_narrative_state(case_id, actor, allow_generation=True)
    dossier = build_case_dossier(case_id)
    generated = _run_generation(
        case_id,
        dossier,
        actor,
        instruction=f"Regenerate only the {section_id} section. {instruction or ''}",
        event_type="NARRATIVE_REGENERATED",
    )
    regenerated_map = {section["id"]: section for section in generated["sections"]}
    current_sections = []
    for section in current["sections"] or generated["sections"]:
        current_sections.append(regenerated_map.get(section["id"], section) if section["id"] == section_id else section)
    current["sections"] = current_sections
    current["finalText"] = "\n\n".join(section["text"] for section in current_sections)
    current["aiDraftText"] = generated["aiDraftText"]
    current["paragraphTraces"] = _paragraph_traces(current_sections, dossier, dossier["guidance"], origin="AI_REGENERATED")
    current["lastSavedAt"] = utc_now_iso()
    current["lastSavedBy"] = actor["user_name"]
    write_case_json(case_id, "narrative.json", current)
    return current


def save_narrative(case_id: str, actor: dict[str, Any], final_text: str, sections: list[dict[str, Any]], edit_reason: str | None = None) -> dict[str, Any]:
    current = ensure_narrative_state(case_id, actor, allow_generation=True)
    before_hash = _sha(current.get("finalText", ""))
    if not sections:
        parts = [part.strip() for part in final_text.split("\n\n") if part.strip()]
        template_titles = ["Introduction", "Body", "Conclusion"]
        sections = [
            {"id": template_titles[index].lower(), "title": template_titles[index], "text": text}
            for index, text in enumerate(parts)
        ]
    current["sections"] = sections
    current["finalText"] = final_text
    current["lastSavedAt"] = utc_now_iso()
    current["lastSavedBy"] = actor["user_name"]
    current["paragraphTraces"] = _paragraph_traces(sections, current["dossier"], current.get("retrievedGuidance", []), origin="ANALYST_EDITED")
    write_case_json(case_id, "narrative.json", current)
    add_case_version(case_id, "narrative.json", current)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=ensure_case_exists(case_id)["workflow"].get("current_review_cycle_id"),
        stage=ensure_case_exists(case_id)["workflow"]["current_stage"],
        event_type="NARRATIVE_MANUALLY_EDITED",
        actor=actor,
        payload={"beforeHash": before_hash, "afterHash": _sha(final_text), "editReason": edit_reason},
        entity_type="narrative",
        entity_id=case_id,
    )
    return current


def compliance_check(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    state = ensure_narrative_state(case_id, actor, allow_generation=True)
    text = state.get("finalText", "")
    dossier = build_case_dossier(case_id)
    subject_name = dossier["subject"]["customerName"].lower()
    checks = [
        {"rule": "Subject referenced", "pass": subject_name in text.lower(), "severity": "hard"},
        {"rule": "Suspicious activity described", "pass": "suspicious" in text.lower() or "unusual" in text.lower(), "severity": "hard"},
        {"rule": "Contains dates", "pass": bool(re.search(r"2022-\d{2}-\d{2}", text)) or bool(re.search(r"\b\d{1,2}\s\w+\s\d{4}\b", text)), "severity": "hard"},
        {"rule": "Contains amounts", "pass": "INR" in text or bool(re.search(r"\d{2,}", text)), "severity": "hard"},
        {"rule": "No placeholders", "pass": "see attached" not in text.lower() and "tbd" not in text.lower(), "severity": "hard"},
        {"rule": "Chronological structure", "pass": len(state.get("sections", [])) >= 3, "severity": "soft"},
    ]
    if dossier["isCryptoCase"]:
        checks.append(
            {
                "rule": "Crypto paragraph included",
                "pass": "crypto exchange" in text.lower() or "crypto platform" in text.lower(),
                "severity": "hard",
            }
        )
    passed = all(item["pass"] for item in checks if item["severity"] == "hard")
    result = {
        "passed": passed,
        "checks": checks,
        "checkedAt": utc_now_iso(),
        "explanation": "Narrative is validated for subject reference, factual chronology, dates, amounts, and mandatory crypto wording when needed.",
    }
    state["complianceCheck"] = result
    write_case_json(case_id, "narrative.json", state)
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=ensure_case_exists(case_id)["workflow"].get("current_review_cycle_id"),
        stage=ensure_case_exists(case_id)["workflow"]["current_stage"],
        event_type="COMPLIANCE_CHECK_RUN",
        actor=actor,
        payload=result,
        entity_type="narrative",
        entity_id=case_id,
    )
    return result


def get_narrative_audit(case_id: str, actor: dict[str, Any]) -> dict[str, Any]:
    state = ensure_narrative_state(case_id, actor)
    return {
        "promptVersion": state.get("promptVersion"),
        "retrievedGuidance": state.get("retrievedGuidance", []),
        "paragraphTraces": state.get("paragraphTraces", []),
        "ledgerEntries": _narrative_audit_entries(case_id),
        "dossier": state.get("dossier"),
    }


def _extract_copilot_answer(payload: dict[str, Any], raw_text: str) -> str:
    for key in ["answer", "response", "guidance", "explanation", "summary"]:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    if raw_text.strip():
        return raw_text.strip()
    return "I prepared a draft update suggestion based on your instruction."


def _extract_copilot_suggested_text(payload: dict[str, Any], raw_text: str, current_draft: str) -> str:
    for key in ["suggested_text", "suggestedText", "updated_draft", "updatedDraft", "revised_draft", "revisedDraft"]:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    sections = _normalize_sections(payload)
    if sections:
        return "\n\n".join(section["text"] for section in sections)

    for value in payload.values():
        if isinstance(value, str) and value.strip() and value.strip() != raw_text.strip():
            return value.strip()

    return current_draft


def _fallback_copilot_answer(case_id: str, dossier: dict[str, Any], question: str, current_draft: str) -> dict[str, Any]:
    lower = question.lower()
    if "which transactions" in lower:
        answer = "The narrative uses transactions " + ", ".join(txn["transaction_id"] for txn in dossier["transactions"])
    elif "why is this suspicious" in lower:
        answer = dossier["case"]["riskExplanation"]
    elif "why is this paragraph included" in lower:
        answer = "Each paragraph traces back to the linked alerts, suspicious transactions, and retrieved local guidance shown in the audit panel."
    else:
        answer = (
            f"Case {case_id} involves {len(dossier['alerts'])} alert(s), {len(dossier['transactions'])} linked transaction(s), "
            f"and a risk score of {dossier['case']['riskScore']}."
        )
    suggested_text = current_draft or _fallback_generation(case_id, dossier)["finalText"]
    return {
        "answer": answer,
        "suggestedText": suggested_text,
        "model": "fallback-local-template",
        "usage": None,
        "rawResponseId": None,
    }


def copilot_answer(case_id: str, actor: dict[str, Any], question: str, current_draft: str | None = None) -> dict[str, Any]:
    dossier = build_case_dossier(case_id)
    existing_state = ensure_narrative_state(case_id, actor)
    draft_text = (current_draft or "").strip() or existing_state.get("finalText", "")
    config = get_config()

    if not config.openai_api_key:
        result = _fallback_copilot_answer(case_id, dossier, question, draft_text)
    else:
        client = OpenAI(api_key=config.openai_api_key)
        prompt_payload = {
            "question": question,
            "currentDraft": draft_text,
            "dossier": dossier,
            "instructions": [
                "Answer the analyst's freeform prompt using only supplied facts.",
                "Return JSON only.",
                "Include an 'answer' field with a concise explanation for the analyst.",
                "Include a 'suggested_text' field containing the full updated narrative draft to place into the editor.",
                "If the analyst asks for a small change, preserve the rest of the current draft and only adjust the requested parts.",
                "If the current draft is empty, you may produce a full draft from the supplied dossier facts.",
                "Do not invent facts, case history, or counterparties not present in the dossier.",
            ],
        }
        started = time.perf_counter()
        response = client.responses.create(
            model=config.openai_copilot_model,
            input=[
                {
                    "role": "system",
                    "content": "You are an AML analyst copilot. Help refine the current SAR narrative draft using only supplied case facts. Return JSON only.",
                },
                {"role": "user", "content": json.dumps(prompt_payload)},
            ],
        )
        latency_ms = int((time.perf_counter() - started) * 1000)
        raw_text = (response.output_text or "").strip()
        try:
            parsed = _clean_json(raw_text)
        except json.JSONDecodeError:
            parsed = {"answer": raw_text, "suggested_text": draft_text}
        result = {
            "answer": _extract_copilot_answer(parsed, raw_text),
            "suggestedText": _extract_copilot_suggested_text(parsed, raw_text, draft_text),
            "model": config.openai_copilot_model,
            "usage": _serialize_usage(getattr(response, "usage", None)),
            "rawResponseId": getattr(response, "id", None),
            "latencyMs": latency_ms,
        }

    append_ledger_event(
        case_id=case_id,
        review_cycle_id=ensure_case_exists(case_id)["workflow"].get("current_review_cycle_id"),
        stage=ensure_case_exists(case_id)["workflow"]["current_stage"],
        event_type="NARRATIVE_COPILOT_ASKED",
        actor=actor,
        payload={
            "question": question,
            "answer": result["answer"],
            "suggestedTextHash": _sha(result["suggestedText"]),
            "model": result.get("model"),
            "rawResponseId": result.get("rawResponseId"),
        },
        entity_type="copilot",
        entity_id=case_id,
    )
    return result


def record_copilot_apply(
    case_id: str,
    actor: dict[str, Any],
    question: str,
    suggested_text: str,
    model: str | None = None,
    raw_response_id: str | None = None,
) -> dict[str, Any]:
    append_ledger_event(
        case_id=case_id,
        review_cycle_id=ensure_case_exists(case_id)["workflow"].get("current_review_cycle_id"),
        stage=ensure_case_exists(case_id)["workflow"]["current_stage"],
        event_type="NARRATIVE_COPILOT_APPLIED",
        actor=actor,
        payload={
            "question": question,
            "suggestedTextHash": _sha(suggested_text),
            "model": model,
            "rawResponseId": raw_response_id,
        },
        entity_type="copilot",
        entity_id=case_id,
    )
    return {"status": "ok"}
