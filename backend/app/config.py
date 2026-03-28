from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class AppConfig:
    root_dir: Path = ROOT_DIR
    sqlite_db_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("SQLITE_DB_PATH", "./sar_demo_dataset/sar_demo_minimal.db")
        )
    )
    runtime_state_dir: Path = field(
        default_factory=lambda: ROOT_DIR / "runtime_state"
    )
    rag_docs_dir: Path = field(
        default_factory=lambda: Path(os.getenv("RAG_DOCS_DIR", "./rag_docs"))
    )
    str_form_reference: Path = field(
        default_factory=lambda: Path(os.getenv("STR_FORM_REFERENCE", "./samples/SBA (1).pdf"))
    )
    system_prompt_reference: Path = field(
        default_factory=lambda: Path(
            os.getenv(
                "SYSTEM_PROMPT_REFERENCE",
                "./samples/sar_guide_good_and_bad_examples.pdf",
            )
        )
    )
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5.4")
    openai_copilot_model: str = os.getenv("OPENAI_COPILOT_MODEL", os.getenv("OPENAI_MODEL", "gpt-5.4"))
    reporting_entity_name: str = "Barclays Bank PLC - India Operations"
    reporting_entity_id: str = "FIU-IND-RE-BARCLAYS-001"
    reporting_entity_category: str = "Banking Company"
    principal_officer_name: str = "Ritu Sharma"
    principal_officer_title: str = "Principal Officer"
    principal_officer_email: str = "ritu.sharma@barclays.demo"
    principal_officer_phone: str = "+91-22-4000-1100"
    branch_code_fallback: str = "BAR-IND-MVP"
    prompt_version: str = "autosar-v1"
    ledger_signature_label: str = "AUTO-SAR-DEMO"

    def resolve(self, path: Path) -> Path:
        return path if path.is_absolute() else (self.root_dir / path).resolve()


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    config = AppConfig()
    config.runtime_state_dir.mkdir(parents=True, exist_ok=True)
    (config.runtime_state_dir / "cases").mkdir(parents=True, exist_ok=True)
    (config.runtime_state_dir / "audit_ledger").mkdir(parents=True, exist_ok=True)
    (config.runtime_state_dir / "artifacts").mkdir(parents=True, exist_ok=True)
    return config
