from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

from ..config import get_config


GEO_REFERENCE = {
    "Pune": {"countryCode": "IN", "countryName": "India", "city": "Pune", "lat": 18.5204, "lng": 73.8567, "riskRegionType": "standard", "resolutionSource": "branch_city"},
    "Mumbai": {"countryCode": "IN", "countryName": "India", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777, "riskRegionType": "elevated", "resolutionSource": "branch_city"},
    "Bengaluru": {"countryCode": "IN", "countryName": "India", "city": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "riskRegionType": "elevated", "resolutionSource": "branch_city"},
}


def _csv_path(filename: str) -> Path:
    return get_config().root_dir / "sar_demo_dataset" / filename


@lru_cache(maxsize=1)
def load_bank_reference() -> dict[str, dict[str, str]]:
    with _csv_path("bank_reference.csv").open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return {row["Bank_ID"]: row for row in reader}


@lru_cache(maxsize=1)
def load_rule_thresholds() -> dict[str, dict[str, str]]:
    with _csv_path("rule_thresholds.csv").open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return {row["Rule_ID"]: row for row in reader}


def get_bank(bank_id: str | None) -> dict[str, str] | None:
    if not bank_id:
        return None
    return load_bank_reference().get(str(bank_id))


def bank_name(bank_id: str | None) -> str | None:
    bank = get_bank(bank_id)
    return bank["Bank_Name"] if bank else bank_id


def bank_type(bank_id: str | None) -> str | None:
    bank = get_bank(bank_id)
    return bank["Bank_Type"] if bank else None


def is_crypto_bank(bank_id: str | None) -> bool:
    return bank_type(bank_id) == "Crypto Exchange"


def get_rule(rule_id: str | None) -> dict[str, str] | None:
    if not rule_id:
        return None
    return load_rule_thresholds().get(rule_id)
