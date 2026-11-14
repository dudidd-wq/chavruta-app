#!/usr/bin/env python3
"""Inject the personalization layer (personalize.css/.js + pre-paint head script) into the built pages.

Idempotent. The app HTML is generated in the private source repo and published by publish_pages.sh,
which overwrites index.html/sw.js; run this after every publish until the hooks move into the source build:
    python3 tools/app/apply_personalize.py
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES = ["index.html", "status.html"]
HEAD_JS = ROOT / "personalize-head.js"


def short_hash(*paths: Path) -> str:
    h = hashlib.sha256()
    for p in paths:
        h.update(p.read_bytes())
    return h.hexdigest()[:12]


def inject(page: Path, ver: str, head_js: str) -> bool:
    raw = page.read_text(encoding="utf-8")
    html = re.sub(r'\n?<link rel="stylesheet" href="personalize\.css[^"]*" id="chs-css">', "", raw)
    html = re.sub(r'\n?<script id="chs-head">.*?</script>', "", html, flags=re.S)
    html = re.sub(r'\n?<script src="personalize\.js[^"]*" id="chs-js" defer></script>', "", html)
    m = re.search(r'<link rel="stylesheet" href="app\.css[^"]*">', html)
    if not m:
        raise SystemExit(f"{page.name}: app.css link not found")
    css = f'\n<link rel="stylesheet" href="personalize.css?v={ver}" id="chs-css">'
    html = html[: m.end()] + css + html[m.end():]
    # Last thing in <head>: after the reading-preferences script, so the style layer wins.
    html = html.replace("</head>", f'<script id="chs-head">{head_js}</script>\n</head>', 1)
    html = html.replace("</body>", f'<script src="personalize.js?v={ver}" id="chs-js" defer></script>\n</body>', 1)
    if html != raw:
        page.write_text(html, encoding="utf-8")
        return True
    return False


def patch_sw(ver: str) -> None:
    sw = ROOT / "sw.js"
    raw = sw.read_text(encoding="utf-8")
    text = re.sub(r'const CACHE_VERSION = "[^"]*";', f'const CACHE_VERSION = "v3-{ver[:6]}";', raw)
    for asset in ("./personalize.css", "./personalize.js"):
        if f'"{asset}"' not in text:
            text = text.replace('  "./print.css",', f'  "./print.css",\n  "{asset}",', 1)
    if text != raw:
        sw.write_text(text, encoding="utf-8")


def main() -> None:
    ver = short_hash(ROOT / "personalize.css", ROOT / "personalize.js", HEAD_JS)
    head_js = "\n".join(line for line in HEAD_JS.read_text(encoding="utf-8").splitlines() if not line.startswith("/*"))
    for name in PAGES:
        changed = inject(ROOT / name, ver, head_js)
        print(f"{name}: {'updated' if changed else 'unchanged'}")
    patch_sw(ver)
    print(f"personalize v={ver}")


if __name__ == "__main__":
    main()
