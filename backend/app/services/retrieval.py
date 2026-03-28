from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from ..config import get_config


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9]{3,}", text.lower()))


def _chunk_text(text: str, size: int = 1200, overlap: int = 150) -> list[str]:
    chunks: list[str] = []
    cursor = 0
    text = _normalize(text)
    while cursor < len(text):
        chunks.append(text[cursor : cursor + size])
        cursor += max(1, size - overlap)
    return [chunk for chunk in chunks if chunk]


def _extract_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return _extract_pdf(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def _source_files() -> list[Path]:
    config = get_config()
    files = []
    for path in [
        config.resolve(config.system_prompt_reference),
        config.resolve(config.str_form_reference),
    ]:
        if path.exists():
            files.append(path)
    rag_dir = config.resolve(config.rag_docs_dir)
    if rag_dir.exists():
        files.extend(sorted(p for p in rag_dir.iterdir() if p.is_file()))
    return files


def _cache_path() -> Path:
    return get_config().runtime_state_dir / "retrieval_index.json"


def build_retrieval_index(force: bool = False) -> list[dict[str, Any]]:
    cache_path = _cache_path()
    source_files = _source_files()
    source_signature = {
        str(path): path.stat().st_mtime for path in source_files if path.exists()
    }
    if not force and cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if cached.get("signature") == source_signature:
            return cached["chunks"]

    chunks: list[dict[str, Any]] = []
    for path in source_files:
        if not path.exists():
            continue
        text = _extract_text(path)
        for index, chunk in enumerate(_chunk_text(text)):
            chunks.append(
                {
                    "chunk_id": f"{path.stem}-{index}",
                    "source": path.name,
                    "path": str(path),
                    "content": chunk,
                    "tokens": sorted(_tokenize(chunk)),
                }
            )

    cache_path.write_text(
        json.dumps({"signature": source_signature, "chunks": chunks}, indent=2),
        encoding="utf-8",
    )
    return chunks


def retrieve_guidance(query: str, limit: int = 5) -> list[dict[str, Any]]:
    query_tokens = _tokenize(query)
    chunks = build_retrieval_index()
    scored: list[tuple[int, dict[str, Any]]] = []
    for chunk in chunks:
        overlap = len(query_tokens & set(chunk["tokens"]))
        phrase_bonus = sum(1 for token in query_tokens if token in chunk["content"].lower())
        score = overlap * 3 + phrase_bonus
        if score:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "chunkId": chunk["chunk_id"],
            "source": chunk["source"],
            "path": chunk["path"],
            "excerpt": chunk["content"][:420],
            "score": score,
        }
        for score, chunk in scored[:limit]
    ]
