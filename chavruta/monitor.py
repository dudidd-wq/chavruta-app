"""מנטר עדכונים — בודק את המקורות שב־config/sources.yaml ומזהה פריטים חדשים.

לכל מקור נשמר מצב (מה כבר נראה) ב־data/monitor/state/<id>.json.
פריטים חדשים נכתבים ליומן data/monitor/log/<תאריך>.jsonl,
ותמונת מצב עדכנית נכתבת ל־data/monitor/snapshot.json — ממנה נבנה מדור "מה חדש".

סוגי זיהוי:
  rss          — פיד RSS/Atom (גם פודקאסטים ויוטיוב)
  json_catalog — קטלוג JSON (maamarim.com)
  wp_media     — ממשק המדיה של וורדפרס (קובצי PDF חדשים)
  page_diff    — השוואת קישורים בדף בין ריצה לריצה; בריצה הראשונה נקבע בסיס בלבד
  browser      — האתר חוסם קוד; נבדק דרך הדפדפן (ראו browser_checks)
  none         — לא נעקב אוטומטית

תפקיד הפריט נקבע לפי המקור:
  analysis → מועמד לטריגר לנושא + תמיד גם "מה חדש"
  whatsnew → "מה חדש" בלבד
  primary עם whatsnew:true (לה״ק) → מקור ראשוני + "מה חדש"
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import feedparser
import requests
import yaml
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "sources.yaml"
MON = ROOT / "data" / "monitor"
HEADERS = {"User-Agent": "Mozilla/5.0 (chavruta-monitor)", "Accept-Encoding": "gzip, deflate, br"}
MIN_INTERVAL = 1.0
KEEP_SEEN = 2000
FIRST_RUN_SURFACE = 5          # בריצה הראשונה: כמה פריטים אחרונים להציג מכל מקור עם פיד
_last = 0.0


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _get(url: str) -> requests.Response:
    global _last
    wait = MIN_INTERVAL - (time.time() - _last)
    if wait > 0:
        time.sleep(wait)
    for attempt in range(3):
        r = requests.get(url, headers=HEADERS, timeout=25)
        _last = time.time()
        if r.status_code not in (429, 500, 502, 503, 504) or attempt == 2:
            r.raise_for_status()
            return r
        try:
            delay = min(30, max(1, int(r.headers.get("Retry-After", 2 ** (attempt + 1)))))
        except ValueError:
            delay = 2 ** (attempt + 1)
        time.sleep(delay)


def _iid(*parts: str) -> str:
    return hashlib.sha1("|".join(p or "" for p in parts).encode()).hexdigest()[:16]


def _text(html: str, limit: int = 1500) -> str:
    """תיאור הפריט כטקסט נקי — לתקציר במדור "מה חדש"."""
    if not html:
        return ""
    t = BeautifulSoup(html, "lxml").get_text(" ")
    t = re.sub(r"\s+", " ", unescape(t)).strip()
    return t[:limit]


# ---------- גלאים: כל אחד מחזיר רשימת פריטים, מהחדש לישן ----------

def detect_rss(url: str) -> list[dict]:
    feed = feedparser.parse(_get(url).content)
    items = []
    for e in feed.entries:
        date = e.get("published") or e.get("updated") or ""
        link = e.get("link") or ""
        blurb = ""
        for c in e.get("content") or []:
            blurb = blurb or c.get("value", "")
        blurb = _text(e.get("summary") or blurb)
        items.append({"id": e.get("id") or link or _iid(e.get("title", ""), date),
                      "title": (e.get("title") or "").strip(), "url": link, "date": date, "blurb": blurb})
    return items


def detect_json_catalog(url: str, item_url: str = "") -> list[dict]:
    data = _get(url).json()
    rows = data if isinstance(data, list) else next((v for k, v in data.items() if k in ("items", "maamarim", "catalog", "data") and isinstance(v, list)), None)
    if rows is None:
        raise ValueError("Catalog does not contain an item list")
    items = []
    for row in rows:
        title = row.get("title") or row.get("dh") or ""
        when = row.get("published_at") or row.get("uploaded_at") or ""
        items.append({"id": str(row.get("id")), "title": title, "date": when,
                      "url": item_url.format(id=row.get("id")) if item_url else "",
                      "extra": {k: row.get(k) for k in ("en", "mugah", "year") if row.get(k)}})
    return items  # בקטלוג אין סדר כרונולוגי; החדש מזוהה לפי מזהה שלא נראה


def detect_wp_media(url: str) -> list[dict]:
    return [{"id": str(m["id"]), "title": BeautifulSoup(m["title"]["rendered"], "lxml").get_text(),
             "url": m.get("source_url", ""), "date": m.get("date", ""),
             "blurb": _text((m.get("caption") or {}).get("rendered", "") or (m.get("description") or {}).get("rendered", ""))}
            for m in _get(url).json()]


def detect_sitemap(url: str, filter: str = "", follow: str = "") -> list[dict]:
    """מפת אתר: כל כתובת היא פריט. filter — ביטוי לסינון כתובות; follow — אילו מפות־משנה לפתוח."""
    text = _get(url).text
    if "<sitemapindex" in text:
        subs = re.findall(r"<loc>([^<]+)</loc>", text)
        subs = [s for s in subs if not follow or re.search(follow, s)]
        items = []
        for s in subs[:5]:
            items += detect_sitemap(s, filter=filter)
        return sorted(items, key=lambda x: x["date"], reverse=True)
    rows = re.findall(r"<url>(.*?)</url>", text, re.S)
    items = []
    for row in rows:
        loc = re.search(r"<loc>([^<]+)</loc>", row)
        if not loc:
            continue
        loc = unescape(loc.group(1).strip())
        if filter and not re.search(filter, loc):
            continue
        mod = re.search(r"<lastmod>([^<]+)</lastmod>", row)
        slug = urlparse(loc).path.rstrip("/").split("/")[-1]
        items.append({"id": loc, "title": unquote(slug).replace("-", " "), "url": loc,
                      "date": mod.group(1) if mod else ""})
    return sorted(items, key=lambda x: x["date"], reverse=True)


def detect_torahtable(url: str) -> list[dict]:
    """TorahTable: דף הפרסום מגיע עם נתונים מובנים (__NEXT_DATA__) — רשימת הגליונות."""
    html = _get(url).text
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return []
    props = json.loads(m.group(1)).get("props", {}).get("pageProps", {})
    items = []
    for p in props.get("initialPrintouts", []):
        week = p.get("week") or {}
        title = " · ".join(x for x in [week.get("name", ""), str(week.get("year", "") or ""),
                                       p.get("description", "")] if x)
        items.append({"id": str(p["id"]), "title": title[:200], "url": p.get("file", ""),
                      "date": p.get("published_at", "")})
    return sorted(items, key=lambda x: x["date"], reverse=True)


def detect_page_diff(url: str) -> list[dict]:
    soup = BeautifulSoup(_get(url).text, "lxml")
    for tag in soup(["script", "style", "nav", "header", "footer"]):
        tag.decompose()
    host = urlparse(url).netloc
    # טביעת תוכן: אם הטקסט השתנה בלי קישור חדש (למשל גוגל סייטס), עדיין יופיע עדכון
    body = re.sub(r"\s+", " ", soup.get_text(" ")).strip()
    items, seen = [{"id": "content:" + hashlib.sha1(body.encode()).hexdigest()[:16],
                    "title": "עדכון בתוכן הדף", "url": url, "date": ""}], set()
    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True)
        href = urljoin(url, a["href"])
        if len(text) < 6 or href in seen or href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        same_site = urlparse(href).netloc in (host, "") or "drive.google" in href
        if not same_site:
            continue
        seen.add(href)
        items.append({"id": href, "title": text[:200], "url": href, "date": ""})
    return items


def detect_kehot(url: str) -> list[dict]:
    """חנות קה״ת: דף "What's New" מחולק לחודשים; מוציאים מכל חודש את קודי הפריטים וכותרותיהם."""
    home = _get(url).text
    soup = BeautifulSoup(home, "lxml")
    months = ("January February March April May June July August September October November December").split()
    depts = []
    for a in soup.find_all("a", href=True):
        if a.get_text(strip=True) in months and "products.asp?dept=" in a["href"]:
            depts.append((urljoin(url, a["href"]), months.index(a.get_text(strip=True)) + 1))
    items, seen = [], set()
    today = datetime.now(timezone.utc)
    for d, mon in depts:
        # The publisher supplies a month only, not a publication day.
        yr = today.year if mon <= today.month else today.year - 1
        end = datetime(yr + (mon == 12), mon % 12 + 1, 1, tzinfo=timezone.utc) - timedelta(days=1)
        dt = min(end, today).strftime("%Y-%m-%d")
        lines = [x.strip() for x in BeautifulSoup(_get(d).text, "lxml").get_text("\n").split("\n") if x.strip()]
        for k, x in enumerate(lines):
            if re.fullmatch(r"[A-Z]{1,4}-[A-Z0-9.]+", x) and k + 1 < len(lines) and x not in seen:
                seen.add(x)
                items.append({"id": x, "title": lines[k + 1][:200], "url": d, "date": "", "catalog_month": f"{yr}-{mon:02d}"})
    return items


def detect_kehot_kuntreisim(url: str) -> list[dict]:
    """קה״ת – קונטרסים (kehot.org/Kuntreisim): כרטיסים עם כותרת וקובץ PDF; תאריך ההעלאה מופיע בנתיב הקובץ."""
    import html as _h
    t = _get(url).text
    items, seen = [], set()
    for title, href in re.findall(r'<div class="card-block">\s*<div>(.*?)</div>.*?href=\'([^\']+)\'', t, re.S):
        href = href.strip()
        if href in seen:
            continue
        seen.add(href)
        date = ""
        m = re.search(r"/(\d{1,2})/(\d{1,2})/(\d{4})/", href)
        if m:
            date = f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
        else:
            m = re.search(r"/(\d{4})/(\d{2})/(\d{2})/", href)
            if m:
                date = "-".join(m.groups())
        items.append({"id": href, "title": _h.unescape(title.strip())[:200], "url": urljoin(url, href), "date": date})
    return items


DETECTORS = {"kehot_kuntreisim": detect_kehot_kuntreisim, "kehot": detect_kehot, "rss": detect_rss, "json_catalog": detect_json_catalog, "wp_media": detect_wp_media,
             "sitemap": detect_sitemap, "torahtable": detect_torahtable, "page_diff": detect_page_diff}
RECENT = ("kehot", "kehot_kuntreisim")   # אתרי קטלוג עם תאריך: מציגים את כל מה שבחלון הזמן, לא רק את החדש מהריצה האחרונה


def _recent(items: list[dict], days: int = 45) -> list[dict]:
    cut = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    return sorted([it for it in items if it.get("date", "") >= cut or it.get("catalog_month", "") >= cut[:7]], key=lambda it: it.get("date") or it.get("catalog_month", ""), reverse=True)


ORDERED = ("rss", "wp_media", "sitemap", "torahtable")   # מקורות שהסדר בהם כרונולוגי


# ---------- מצב ----------

def _state_path(sid: str) -> Path:
    return MON / "state" / f"{sid}.json"


def load_state(sid: str) -> dict | None:
    p = _state_path(sid)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


def save_state(sid: str, state: dict) -> None:
    p = _state_path(sid)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")


def sources() -> list[dict]:
    cfg = yaml.safe_load(CONFIG.read_text(encoding="utf-8"))
    out = []
    for role in ("primary", "analysis", "whatsnew"):
        for s in cfg.get(role, []):
            s = dict(s)
            s["role"] = role
            out.append(s)
    return out


def sections_for(src: dict) -> list[str]:
    """לאיזה מדור הולך פריט מהמקור."""
    if src["role"] == "analysis":
        return ["trigger", "whatsnew"]
    if src["role"] == "whatsnew":
        return ["whatsnew"]
    return ["primary", "whatsnew"] if src.get("whatsnew") else ["primary"]


def check(src: dict) -> dict:
    """בודק מקור אחד. מחזיר תוצאה לתמונת המצב."""
    detect = src.get("detect") or {}
    dtype = detect.get("type", "none")
    res = {"id": src["id"], "name": src["name"], "role": src["role"], "lang": src.get("lang", "he"),
           "site": src.get("url", ""), "detect": dtype, "medium": src.get("medium", "text"), "sections": sections_for(src),
           "checked_at": _now(), "status": "", "new": [], "latest": [], "total": 0}
    if dtype in ("none", "") or dtype not in DETECTORS:
        res["status"] = "browser" if dtype == "browser" else "manual"
        return res
    try:
        extra = {k: detect[k] for k in ("filter", "follow", "item_url") if k in detect}
        items = DETECTORS[dtype](detect["url"], **extra)
        items = [it for it in items if "/cdn-cgi/" not in it.get("url", "")]   # קישורי הגנת דוא״ל של Cloudflare אינם פרסומים
        if detect.get("keep"):   # אתר כללי: נשארים רק פריטים בתחום (חסידות, מאמרים, שיחות)
            items = [it for it in items if re.search(detect["keep"], it["title"])]
    except Exception as e:  # מקור אחד שנופל לא עוצר את השאר
        res["status"] = "error"
        res["error"] = f"{type(e).__name__}: {str(e)[:160]}"
        return res
    res["total"] = len(items)
    res["last_success_at"] = res["checked_at"]
    state = load_state(src["id"])
    first_run = state is None
    seen = set((state or {}).get("seen", []))
    new = [it for it in items if it["id"] not in seen]
    if first_run:
        res["status"] = "baseline"
        # פיד מסודר מהחדש לישן — מציגים את האחרונים; בדף ובקטלוג אין סדר אמין, לא מציגים
        res["latest"] = items[:FIRST_RUN_SURFACE] if dtype in ORDERED else (_recent(items) if dtype in RECENT else [])
    else:
        res["status"] = "ok"
        res["new"] = new
        res["latest"] = (items[:FIRST_RUN_SURFACE] if dtype in ORDERED else
                         _recent(items) if dtype in RECENT else new[:FIRST_RUN_SURFACE])
    all_ids = [it["id"] for it in items] + [i for i in (state or {}).get("seen", []) if i not in
                                            {it["id"] for it in items}]
    save_state(src["id"], {"seen": all_ids[:KEEP_SEEN], "updated": _now(), "count": len(items)})
    return res


def run(only: list[str] | None = None) -> dict:
    srcs = [s for s in sources() if not only or s["id"] in only]
    snap_path = MON / "snapshot.json"
    old = json.loads(snap_path.read_text(encoding="utf-8")) if snap_path.exists() else {}
    previous = {r["id"]: r for r in old.get("sources", [])}
    results = []
    for s in srcs:
        r = check(s)
        prev = previous.get(r["id"], {})
        if r["status"] == "error":
            r["latest"] = prev.get("latest", [])
            r["total"] = prev.get("total", 0)
            r["last_success_at"] = prev.get("last_success_at") or (prev.get("checked_at", "") if prev.get("status") in ("ok", "baseline") else "")
            r["retained"] = bool(r["latest"])
        elif r["status"] in ("ok", "baseline"):
            # Unordered sources return only newly discovered links; keep their
            # previous entries until the news projection expires them.
            merged = {it.get("id") or it.get("url"): it for it in r["latest"]}
            for it in prev.get("latest", []):
                merged.setdefault(it.get("id") or it.get("url"), it)
            r["latest"] = list(merged.values())[:250]
        prior_items = {it.get("id") or it.get("url"): it for it in prev.get("latest", [])}
        for it in r["latest"]:
            prior = prior_items.get(it.get("id") or it.get("url"), {})
            it["first_seen"] = prior.get("first_seen") or it.get("first_seen") or (prev.get("last_success_at") or prev.get("checked_at") if prior else None) or r["checked_at"]
        results.append(r)
        print(f"{r['status']:9} {r['id']:20} total={r['total']:<5} new={len(r['new'])}"
              + (f"  {r.get('error')}" if r.get("error") else ""), file=sys.stderr)
    stamp = _now()
    log = MON / "log" / f"{stamp[:10]}.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as f:
        for r in results:
            for it in r["new"]:
                f.write(json.dumps({"source": r["id"], "sections": r["sections"], "detected_at": stamp,
                                    **it}, ensure_ascii=False) + "\n")
    if only and snap_path.exists():   # ריצה חלקית: מעדכנים רק את המקורות שנבדקו
        fresh = {r["id"]: r for r in results}
        results = [fresh.pop(r["id"], r) for r in old.get("sources", [])] + list(fresh.values())
    snap = {"generated_at": stamp, "sources": results}
    # מיזוג עם בדיקות דפדפן קודמות (לה״ק, טעם החיים) — הן נכתבות בנפרד
    browser = MON / "browser_checks.json"
    if browser.exists():
        snap["browser_checks"] = json.loads(browser.read_text(encoding="utf-8"))
    snap_path.write_text(json.dumps(snap, ensure_ascii=False, indent=1), encoding="utf-8")
    return snap


if __name__ == "__main__":
    run(sys.argv[1:] or None)

