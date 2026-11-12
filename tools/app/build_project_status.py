#!/usr/bin/env python3
"""Build the public project-status payload for the Chavruta status page.

Reads local pipeline summaries and writes only aggregated counts, titles,
and rates. Never copies OCR text, scanned text, quoted source text, secrets,
or citation match strings.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")

# Hebrew labels for cited Kabbalah work slugs (titles only).
WORK_LABELS = {
    "zohar": "זהר",
    "tz": "תיקוני זהר",
    "zh": "זהר חדש",
    "ec": "עץ חיים",
    "pec": "פרי עץ חיים",
    "pardes": "פרדס רמונים",
    "mm": "מקדש מלך על הזהר",
    "ramaz": "פירוש הרמ״ז על הזהר",
    "shelah": "של״ה",
    "shaar_hakavanot": "שער הכוונות",
    "shaar_hapesukim": "שער הפסוקים",
    "shaar_hamitzvot": "שער המצוות",
    "shaar_hagilgulim": "שער הגלגולים",
    "shaar_hahakdamot": "שער ההקדמות",
    "shaar_maamarei_rashbi": "שער מאמרי רשב״י",
    "shaar_maamarei_razal": "שער מאמרי רז״ל",
    "shaar_ruach_hakodesh": "שער רוח הקודש",
    "yetzirah": "ספר יצירה",
    "bahir": "ספר הבהיר",
    "reshit_chochmah": "ראשית חכמה",
    "lt_arizal": "לקוטי תורה / טעמי המצוות לאריז״ל",
    "sefer_halikutim": "ספר הליקוטים",
    "mevo_shearim": "מבוא שערים",
    "emek_hamelech": "עמק המלך",
    "asara_maamarot": "עשרה מאמרות (רמ״ע)",
    "meorei_or": "מאורי אור",
}

ADMOR_ORDER = [
    "אדמו״ר הזקן",
    "אדמו״ר האמצעי",
    "אדמו״ר מהר״ש",
    "אדמו״ר הרש״ב",
    "אדמו״ר הריי״צ",
    "הרבי",
]

GROUP_ORDER = ["חב\"ד", "קבלה", "מהר\"ל"]

# Fields that must never be copied into the public payload.
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
    "he",
    "en",
    "raw",
    "citation_text",
    "segments_text",
}


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _pct(n: int, total: int) -> float:
    if not total:
        return 0.0
    return round(1000 * n / total) / 10


def _now_label() -> tuple[str, str]:
    now = datetime.now(TZ)
    # 13.11.2026, 01:45
    label = now.strftime("%d.%m.%Y, %H:%M") + " שעון ישראל"
    return now.isoformat(timespec="minutes"), label


def _work_label(slug: str) -> str:
    if not slug:
        return "לא זוהה"
    return WORK_LABELS.get(slug, slug)


def _iter_jsonl(path: Path):
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                yield json.loads(line)


def build_coverage(root: Path) -> dict:
    adhz_summary = _load(root / "ops/wp007/SUMMARY_adhz_v2.json")
    rest_summary = _load(root / "run_wp007_rest/SUMMARY_rules.json")
    accept_path = root / "run_wp007_rest/ACCEPT.json"
    accept = _load(accept_path) if accept_path.exists() else {}

    rows = [
        {
            "id": "adhz",
            "name": "אדמו״ר הזקן",
            "linked": int(adhz_summary["linked"]),
            "total": int(adhz_summary["citations"]),
            "pct": float(adhz_summary["linked_pct"]),
            "status": "final",
            "status_label": "סופי",
        }
    ]

    by_rebbe = rest_summary["by_rebbe"]
    rest_linked = 0
    rest_total = 0
    for name in ADMOR_ORDER:
        if name not in by_rebbe:
            continue
        item = by_rebbe[name]
        linked = int(item["linked"])
        total = int(item["n"])
        rest_linked += linked
        rest_total += total
        rows.append(
            {
                "id": name,
                "name": name,
                "linked": linked,
                "total": total,
                "pct": float(item["pct"]),
                "status": "in_progress",
                "status_label": "בתהליך",
            }
        )

    # Haiku agreements are a subset of the rule-linked rows, not extra links.
    confirmed = len(accept)
    return {
        "rows": rows,
        "totals": {
            "linked": int(adhz_summary["linked"]) + rest_linked,
            "total": int(adhz_summary["citations"]) + rest_total,
            "pct": _pct(
                int(adhz_summary["linked"]) + rest_linked,
                int(adhz_summary["citations"]) + rest_total,
            ),
        },
        "rest": {
            "linked": rest_linked,
            "total": rest_total,
            "pct": float(rest_summary["linked_pct"]),
            "status": "in_progress",
            "status_label": "בתהליך",
            "rule_haiku_confirmed": confirmed,
            "note": f"הקישורים לפי הכללים. Haiku אישר {confirmed:,} מהם; הכרעת המשך עדיין רצה.",
        },
    }


def build_correlation(root: Path) -> dict:
    counts: dict[str, Counter] = defaultdict(Counter)
    adhz = root / "ops/wp007/links_adhz_v2.jsonl"
    if adhz.exists():
        for rec in _iter_jsonl(adhz):
            work = rec.get("work") or ""
            counts["אדמו״ר הזקן"][work] += 1
    rest = root / "run_wp007_rest/links_rules.jsonl"
    if rest.exists():
        for rec in _iter_jsonl(rest):
            rebbe = rec.get("rebbe") or ""
            work = rec.get("work") or ""
            if rebbe:
                counts[rebbe][work] += 1

    work_totals: Counter = Counter()
    for c in counts.values():
        work_totals.update(c)
    works = [
        {"id": slug, "label": _work_label(slug), "total": work_totals[slug]}
        for slug, _ in work_totals.most_common()
    ]
    admorim = []
    for name in ADMOR_ORDER:
        if name not in counts:
            continue
        c = counts[name]
        admorim.append(
            {
                "name": name,
                "total": sum(c.values()),
                "by_work": {slug: int(c[slug]) for slug, _ in work_totals.most_common() if c[slug]},
            }
        )
    return {
        "description": "מספר הפניות לכל יצירה, לפי האדמו״ר המצטט. ספירה מצטברת בלבד, כולל הפניות שטרם קושרו.",
        "admorim": admorim,
        "works": works,
    }


def build_sefaria(root: Path) -> dict:
    ingest = _load(root / "ops/sources/SEFARIA_INGEST.json")
    titles_in = ingest.get("titles") or {}
    groups: dict[str, dict] = {}
    titles_out = []
    for sefaria_title, rec in titles_in.items():
        group = rec.get("group") or "אחר"
        status = rec.get("status") or "unknown"
        g = groups.setdefault(
            group,
            {
                "name": group,
                "titles": 0,
                "done": 0,
                "partial": 0,
                "failed": 0,
                "segments": 0,
            },
        )
        g["titles"] += 1
        if status in g:
            g[status] += 1
        segments = int(rec.get("segments") or 0)
        g["segments"] += segments
        status_label = {"done": "נקלט", "partial": "חלקי", "failed": "נכשל"}.get(
            status, status
        )
        note = None
        if status != "done":
            note = "לא נמצא במלואו בספריא" if status == "failed" else "נקלט חלקית"
        titles_out.append(
            {
                "sefaria_title": sefaria_title,
                "work": rec.get("work") or sefaria_title,
                "group": group,
                "segments": segments,
                "status": status,
                "status_label": status_label,
                "licenses": list(rec.get("licenses") or []),
                "note": note,
            }
        )
    group_list = []
    seen = set()
    for name in GROUP_ORDER + list(groups):
        if name in groups and name not in seen:
            group_list.append(groups[name])
            seen.add(name)
    titles_out.sort(key=lambda t: (GROUP_ORDER.index(t["group"]) if t["group"] in GROUP_ORDER else 99, t["work"], t["sefaria_title"]))
    done = sum(1 for t in titles_out if t["status"] == "done")
    return {
        "source": "Sefaria",
        "titles_done": done,
        "titles_total": len(titles_out),
        "segments": sum(t["segments"] for t in titles_out),
        "groups": group_list,
        "titles": titles_out,
    }


def build_qa(root: Path) -> dict:
    qa = _load(root / "ops/wp007/QA_openai_adhz.json")
    strata = qa.get("by_stratum") or {}
    rule = strata.get("rule=haiku") or {}
    sonnet = strata.get("sonnet") or {}
    return {
        "scope": "מדגם 5% מקישורי אדמו״ר הזקן",
        "sample_frac": qa.get("sample_frac"),
        "status": "pending_review",
        "status_label": "ממתין לבדיקה נוספת",
        "strata": [
            {
                "id": "rule_haiku",
                "label": "כשהכללים ו־Haiku הסכימו",
                "agree_pct": rule.get("agree_pct"),
                "agree": rule.get("agree"),
                "n": rule.get("n"),
            },
            {
                "id": "sonnet",
                "label": "הכרעות Sonnet",
                "agree_pct": sonnet.get("agree_pct"),
                "agree": sonnet.get("agree"),
                "n": sonnet.get("n"),
            },
        ],
    }


def _assert_safe(obj, path="$"):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.lower() in BLOCKED_KEYS:
                raise ValueError(f"blocked key {key} at {path}")
            _assert_safe(value, f"{path}.{key}")
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            _assert_safe(value, f"{path}[{i}]")
    elif isinstance(obj, str) and len(obj) > 400:
        raise ValueError(f"oversized string at {path} ({len(obj)} chars)")


def build(root: Path) -> dict:
    iso, label = _now_label()
    payload = {
        "generated": iso,
        "generated_label": label,
        "timezone": "Asia/Jerusalem",
        "coverage": build_coverage(root),
        "correlation": build_correlation(root),
        "sefaria": build_sefaria(root),
        "qa": build_qa(root),
    }
    _assert_safe(payload)
    return payload


def write_payload(payload: dict, out_json: Path) -> None:
    out_json.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    out_json.write_text(text, encoding="utf-8")
    js_path = out_json.with_suffix(".js")
    js_path.write_text(
        "window.CHAVRUTA_PROJECT_STATUS = " + text.rstrip() + ";\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data-root",
        type=Path,
        default=Path("/workspace/chavruta/phase0"),
        help="Directory that holds ops/ and run_wp007_rest/",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/project-status.json"),
        help="Output JSON path (also writes a matching .js file)",
    )
    args = parser.parse_args(argv)
    root = args.data_root.resolve()
    if not root.exists():
        print(f"data root not found: {root}", file=sys.stderr)
        return 2
    payload = build(root)
    write_payload(payload, args.out)
    print(f"wrote {args.out} and {args.out.with_suffix('.js')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
