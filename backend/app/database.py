from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import get_config


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    config = get_config()
    conn = sqlite3.connect(config.resolve(config.sqlite_db_path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
