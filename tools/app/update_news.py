"""Update only news; learning data and presentation assets are never rebuilt."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from chavruta import news


def stamp_news_version(index, payload):
    if not index.exists():
        return
    digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]
    tag = '<meta name="chavruta-news-version" content="' + digest + '">'
    page = index.read_text(encoding="utf-8")
    if 'name="chavruta-news-version"' in page:
        page = re.sub(r'<meta name="chavruta-news-version" content="[^"]*">', tag, page)
    else:
        page = page.replace('<head>', '<head>\n' + tag, 1)
    index.write_text(page, encoding="utf-8")


def update(output, collect=False):
    mon = ROOT / "data/monitor"
    mon.mkdir(parents=True, exist_ok=True)
    observations = news.load(mon / "observations.json")
    # Seed observations from the PREVIOUS scan before a fresh scan overwrites
    # checked_at. This migration cannot make an undated item new again.
    old = news.load(mon / "snapshot.json")
    media = news.source_media(ROOT)
    news.project(old, {}, {}, observations, media=media, filtered=False)
    if collect:
        from chavruta import monitor
        monitor.run()
    snapshot = news.load(mon / "snapshot.json")
    relevance, summaries = news.load(mon / "relevance.json"), news.load(mon / "summaries.json")
    feed = news.project(snapshot, relevance, summaries, observations, media=media)
    payload = news.pack(feed)
    for name, data in (("observations.json", observations),):
        (mon / name).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    all_items = news.project(snapshot, relevance, summaries, observations, media=media, filtered=False)["items"]
    pending = [{k: i[k] for k in ("key", "source", "source_id", "title", "url", "lang", "blurb", "medium", "first_seen")}
               for i in all_items if i["fresh"] and not i["cls"] and i["medium"] not in news.SPOKEN]
    (mon / "pending.json").write_text(json.dumps(pending, ensure_ascii=False, indent=1), encoding="utf-8")
    output.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    (output / "new.js").write_text('window.__D("new",' + serialized + ');\n', encoding="utf-8")
    stamp_news_version(output.parent / "index.html", payload)
    report = {"generated": payload["generated"], "items": len(payload["items"]), "pending": len(pending),
              "counts": feed["counts"], "sources": payload["health"]}
    (mon / "health.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "sources"}, ensure_ascii=False))
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collect", action="store_true")
    parser.add_argument("--output", type=Path, default=ROOT / "out/app/data")
    args = parser.parse_args()
    update(args.output, args.collect)
