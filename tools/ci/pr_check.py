#!/usr/bin/env python3
"""PR checks for chavruta-app: HTML/JSON validity and a guard against source text or secrets."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATUS_JSON = ROOT / "data/project-status.json"
STATUS_JS = ROOT / "data/project-status.js"
STATUS_HTML = ROOT / "status.html"

BLOCKED_KEYS = {
    "text",
    "body",
    "content",
    "ocr",
    "quote",
    "excerpt",
    "snippet",
    "match",
    "context",
    "citation_text",
    "segments_text",
}
def _secret_re() -> re.Pattern[str]:
    parts = [
        "sk-" + "ant-",
        "sk-" + "proj-",
        "xai" + "-",
        "ghp" + "_",
        "gho" + "_",
        "github_" + "pat_",
        r"AIza[0-9A-Za-z_-]{20,}",
        r"-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----",
    ]
    return re.compile("(?:%s)" % "|".join(parts), re.I)


SECRET_RE = _secret_re()
# Hebrew-heavy source-like payloads (not titles).
LONG_HEBREW_RE = re.compile(r"[\u0590-\u05FF]{80,}")
FORBIDDEN_PATH_PARTS = (
    "chabadlibrary-cache",
    "sources_open",
    "ocr/",
    "corpus/",
)
REQUIRED_COVERAGE_FIELDS = {"name", "linked", "total", "pct", "status", "status_label"}


class HtmlCheck(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[str] = []
        self.seen: set[str] = set()
        self.errors: list[str] = []

    def handle_starttag(self, tag, attrs) -> None:
        self.tags.append(tag)
        self.seen.add(tag)
        ad = dict(attrs)
        if tag == "html":
            if ad.get("lang") != "he":
                self.errors.append("html lang must be he")
            if ad.get("dir") != "rtl":
                self.errors.append("html dir must be rtl")
        if tag == "meta" and ad.get("name") == "robots":
            content = (ad.get("content") or "").lower()
            if "noindex" not in content:
                self.errors.append("status page must be noindex")

    def error(self, message: str) -> None:  # pragma: no cover
        self.errors.append(message)


def _walk(obj, path="$"):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.lower() in BLOCKED_KEYS:
                raise SystemExit(f"blocked key {key} at {path}")
            yield from _walk(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from _walk(value, f"{path}[{i}]")
    elif isinstance(obj, str):
        yield path, obj


def check_status_json() -> None:
    if not STATUS_JSON.is_file():
        raise SystemExit(f"missing {STATUS_JSON.relative_to(ROOT)}")
    data = json.loads(STATUS_JSON.read_text(encoding="utf-8"))
    for key in ("generated", "generated_label", "coverage", "correlation", "sefaria", "qa"):
        if key not in data:
            raise SystemExit(f"project-status.json missing {key}")
    rows = data["coverage"]["rows"]
    if not rows:
        raise SystemExit("coverage.rows is empty")
    for row in rows:
        missing = REQUIRED_COVERAGE_FIELDS - set(row)
        if missing:
            raise SystemExit(f"coverage row missing {missing}")
        if row["name"] == "אדמו״ר הזקן":
            if row["linked"] != 8390 or row["total"] != 9542 or row["status"] != "final":
                raise SystemExit("Adah\"z coverage must stay 8,390/9,542 final unless intentionally updated")
        elif row["status"] != "in_progress":
            raise SystemExit(f"{row['name']} must be marked in_progress until finalized")
    qa = {s["id"]: s for s in data["qa"]["strata"]}
    if qa["rule_haiku"]["agree_pct"] != 92.4 or qa["sonnet"]["agree_pct"] != 70.6:
        raise SystemExit("QA rates must stay 92.4 / 70.6 until a new review replaces them")
    if data["qa"]["status"] != "pending_review":
        raise SystemExit("QA must stay labelled pending_review until a further review")
    for path, value in _walk(data):
        if len(value) > 400:
            raise SystemExit(f"oversized string at {path}")
        if LONG_HEBREW_RE.search(value) and "generated_label" not in path:
            # Titles and short notes only; a long Hebrew run is treated as source text.
            raise SystemExit(f"possible source text at {path}")
    js = STATUS_JS.read_text(encoding="utf-8")
    if "window.CHAVRUTA_PROJECT_STATUS" not in js:
        raise SystemExit("project-status.js is missing the global assignment")
    # The JS wrapper must carry the same payload as the JSON.
    assign = js[js.find("{"): js.rfind("}") + 1]
    if json.loads(assign) != data:
        raise SystemExit("project-status.js does not match project-status.json")


def check_status_html() -> None:
    raw = STATUS_HTML.read_text(encoding="utf-8")
    parser = HtmlCheck()
    parser.feed(raw)
    if "html" not in parser.seen or "main" not in parser.seen:
        raise SystemExit("status.html is missing html/main")
    if "טיוטה" not in raw:
        raise SystemExit("status.html must keep the draft banner")
    if 'id="sys-root"' not in raw:
        raise SystemExit("status.html is missing the status root")
    if parser.errors:
        raise SystemExit("; ".join(parser.errors))


# Existing news monitor logs may be jsonl; source/OCR dumps may not be added.
ALLOWED_JSONL_PREFIXES = ("data/monitor/",)
STATUS_PATHS = (
    "status.html",
    "status.js",
    "status.css",
    "data/project-status.json",
    "data/project-status.js",
    "tools/app/build_project_status.py",
    "tools/ci/pr_check.py",
)


def check_repo_guard() -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        if ".git" in path.parts:
            continue
        for part in FORBIDDEN_PATH_PARTS:
            if part in rel:
                raise SystemExit(f"forbidden path committed: {rel}")
        if path.suffix == ".jsonl" and not rel.startswith(ALLOWED_JSONL_PREFIXES):
            raise SystemExit(f"jsonl data files must not be committed: {rel}")
        # Scan status artifacts and small text files for secrets. Skip binary and large app bundles.
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff2", ".woff", ".ttf", ".mp4", ".pdf"}:
            continue
        if path.stat().st_size > 1_000_000 and rel not in STATUS_PATHS:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if SECRET_RE.search(text):
            raise SystemExit(f"possible secret in {rel}")
        if rel in STATUS_PATHS or rel.startswith("data/project-status"):
            if "ocr" in rel.lower() and path.suffix in {".json", ".txt", ".md"}:
                raise SystemExit(f"ocr artifact must not be published: {rel}")


def main() -> int:
    check_status_json()
    check_status_html()
    check_repo_guard()
    print("pr-check ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
