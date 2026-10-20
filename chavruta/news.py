"""News projection shared by the full build and the independent daily update.

Only checked summaries are public. Dates from a publisher and first observation
are separate; neither a new scan nor a failure makes an old item new again.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
WINDOW_DAYS = 30
RELEVANT = {"מקור": "makor", "ביאור": "biur", "גיליון": "gilyon"}
SPOKEN = ("shiur", "podcast", "rebbe_recording")


def when(value):
    if not value:
        return None
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        try:
            result = parsedate_to_datetime(str(value))
        except (TypeError, ValueError, OverflowError):
            return None
    return result.astimezone(timezone.utc) if result.tzinfo else result.replace(tzinfo=timezone.utc)


def item_key(item):
    return hashlib.sha1(f"{item['url']}|{item['title']}".encode()).hexdigest()[:16]


def load(path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else (default if default is not None else {})


def source_media(root=ROOT):
    # The snapshot carries this field in new scans. YAML is needed only to
    # migrate snapshots produced before that field existed.
    try:
        import yaml
    except ImportError:
        return {}
    cfg = yaml.safe_load((root / "config/sources.yaml").read_text(encoding="utf-8"))
    return {s["name"]: s.get("medium", "text") for role in ("primary", "analysis", "whatsnew") for s in cfg.get(role, [])}


def project(snapshot, relevance, summaries, observations, *, now=None, media=None, filtered=True):
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=WINDOW_DAYS)
    media = media or {}
    candidates = []
    source_rows = snapshot.get("sources", [])
    names = {s["id"]: s for s in source_rows}
    checks = snapshot.get("browser_checks", {})
    for sid, check in checks.items():
        src = names.get(sid)
        if not src:
            continue
        for raw in check.get("items", []):
            # Legacy browser dates are discovery dates, not publisher dates.
            candidates.append((src, raw, check.get("checked_at", ""), True))
    for src in source_rows:
        candidates.extend((src, raw, src.get("last_success_at") or src.get("checked_at", ""), False) for raw in src.get("latest", []))
    items, seen = [], set()
    for src, raw, observed_at, browser in candidates:
        url = raw.get("url") or src.get("site", "")
        if urlparse(url).scheme not in ("http", "https") or not raw.get("title") or raw["title"].startswith("עדכון בתוכן הדף"):
            continue
        item = {"group": "hanacha" if src["id"] == "lahak" else "analysis" if src.get("role") == "analysis" else "world",
                "source": src["name"], "source_id": src["id"], "title": raw["title"], "url": url,
                "sub": raw.get("issued_for", ""), "blurb": raw.get("blurb", ""), "pdf": raw.get("pdf", "") if urlparse(raw.get("pdf", "")).scheme in ("http", "https") else "",
                "lang": raw.get("lang", src.get("lang", "he")), "medium": src.get("medium", media.get(src["name"], "text"))}
        key = item_key(item)
        if key in seen:
            continue
        seen.add(key)
        # Never rebase a known observation onto today's scan time.
        first = observations.setdefault(key, raw.get("first_seen") or (raw.get("date") if browser else None) or observed_at)
        # The shop exposes a month, not a precise publication day. Older scans
        # synthesized a day for it; that must not be presented as a real date.
        published = when(raw.get("published_at") if browser else raw.get("date")) if src.get("detect") != "kehot" else None
        discovered = when(first)
        effective = published or discovered
        cls = relevance.get(key, {}).get("cls", "")
        if not cls and item["medium"] == "bulletin":
            cls = "גיליון"
        summary = summaries.get(key, {})
        fresh = bool(effective and cutoff <= effective <= now + timedelta(days=1))
        item.update(key=key, date=published, date_s=published.strftime("%d.%m.%Y") if published else "",
                    first_seen=discovered.isoformat() if discovered else "", effective=effective.isoformat() if effective else "",
                    date_kind="published" if published else "discovered" if discovered else "unknown",
                    cls=cls, kind=RELEVANT.get(cls, "") if item["medium"] not in SPOKEN else "", fresh=fresh,
                    summary=summary.get("he", "") if summary.get("checked") is True else "",
                    summary_checked=summary.get("checked") is True,
                    source_stale=src.get("status") == "error")
        items.append(item)
    items.sort(key=lambda i: (i["effective"], i["key"]), reverse=True)
    shown = [i for i in items if i["kind"] and i["fresh"]] if filtered else items
    counts = Counter(s.get("status", "manual") for s in source_rows)
    health = [{"id": s["id"], "name": s["name"], "status": s.get("status", "manual"),
               "checked": s.get("checked_at", ""), "lastSuccess": s.get("last_success_at", ""),
               "retained": bool(s.get("retained"))} for s in source_rows]
    return {"items": shown, "generated": snapshot.get("generated_at", ""), "counts": dict(counts), "health": health,
            "sources": len(source_rows), "window": WINDOW_DAYS, "lahak_checked": checks.get("lahak", {}).get("checked_at", ""),
            "n_makor": sum(i["kind"] == "makor" for i in shown), "n_biur": sum(i["kind"] == "biur" for i in shown),
            "n_gilyon": sum(i["kind"] == "gilyon" for i in shown), "n_shown": len(shown),
            "n_old": sum(bool(i["kind"]) and not i["fresh"] for i in items),
            "n_unclassified": sum(not i["cls"] and i["fresh"] and i["medium"] not in SPOKEN for i in items),
            "n_reupload": sum(i["cls"] == "ישן" for i in items), "n_dup": sum(i["cls"] == "כפול" for i in items),
            "n_spoken": sum(i["medium"] in SPOKEN for i in items), "n_out": sum(i["cls"] == "לא רלוונטי" for i in items)}


def whatsnew(filtered=True, *, root=ROOT, now=None):
    mon = root / "data/monitor"
    observations = load(mon / "observations.json")
    return project(load(mon / "snapshot.json"), load(mon / "relevance.json"), load(mon / "summaries.json"),
                   observations, now=now, media=source_media(root), filtered=filtered)


def pack(feed):
    return {"items": [{"id": i["key"], "k": i["kind"], "src": i["source"], "sid": i["source_id"],
                       "t": i["title"], "u": i["url"], "d": i["date"].date().isoformat() if i["date"] else "",
                       "ds": i["date_s"], "seen": i["first_seen"], "sort": i["effective"], "dateKind": i["date_kind"],
                       "lang": i["lang"], "s": i["summary"], "checked": i["summary_checked"], "pdf": i["pdf"],
                       "stale": i["source_stale"]} for i in feed["items"]],
            "generated": feed["generated"], "sources": feed["sources"], "window": feed["window"],
            "n": {"makor": feed["n_makor"], "biur": feed["n_biur"], "gilyon": feed["n_gilyon"]},
            "health": feed["health"], "pending": feed["n_unclassified"]}
