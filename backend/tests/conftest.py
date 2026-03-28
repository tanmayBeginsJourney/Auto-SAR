from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
RUNTIME = ROOT / "runtime_state"
sys.path.insert(0, str(ROOT / "backend"))


@pytest.fixture(autouse=True)
def clear_runtime_state():
    for folder in ["cases", "audit_ledger", "artifacts"]:
        target = RUNTIME / folder
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True, exist_ok=True)
    yield
