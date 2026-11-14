#!/usr/bin/env python3
"""חברותא · שכבת ההתאמה האישית (סגנון, צבע, תאורה, גודל) וסט אייקוני הניווט — הזרקה לדפים הבנויים.

מקור אמת: במאגר המקור (dudidd-wq/chavruta) הקובץ הזה הוא tools/app/personalize_hooks.py, ו־build_assets.py
מזריק דרכו את הכול בזמן הבנייה (publish_pages.sh). במאגר chavruta-app הוא נשמר כ־tools/app/apply_personalize.py
— גיבוי בלבד, למקרה שפרסום יידחף ממקור ישן בלי השכבה:
    python3 tools/app/apply_personalize.py
אידמפוטנטי: מסיר הזרקות קודמות ומזריק מחדש.
מזריק: <link id="chs-css">, <script id="chs-head"> (לפני הציור הראשון), ספרייט האייקונים <svg class="chs-icons">,
<script id="chs-js" defer>, viewport-fit=cover, ותגי ה־PWA (manifest, apple-*, pwa.js) אם חסרים.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

PWA_HEAD = """<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="חברותא">
<meta name="theme-color" content="#faf7f0">"""
PWA_BODY = '<script src="pwa.js" defer></script>'
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
# אייקונים בתבנית/בכותרת שעוברים לסט החדש (באפליקציה הם כבר מוחלפים במקור; כאן — לדפים שנבנו ממקור ישן)
ICON_SWAPS = (('use href="#i-aa"', 'use href="#n-type"'), ('use href="#i-pdf"', 'use href="#n-pdf"'), ('use href="#i-toc"/></svg></button>', 'use href="#n-toc"/></svg></button>'))


def version(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8")); h.update(b"\0")
    return h.hexdigest()[:12]


def head_script(head_js: str) -> str:
    return "\n".join(line for line in head_js.splitlines() if not line.startswith("/*"))


def sprite_markup(sprite: str) -> str:
    return re.sub(r"<!--.*?-->\n?", "", sprite, flags=re.S).strip()


def inject_html(html: str, ver: str, head_js: str, sprite: str, pwa: bool = False) -> str:
    """מחזיר את הדף עם ההזרקות (אידמפוטנטי)."""
    html = re.sub(r'\n?<link rel="stylesheet" href="personalize\.css[^"]*" id="chs-css">', "", html)
    html = re.sub(r'\n?<script id="chs-head">.*?</script>', "", html, flags=re.S)
    html = re.sub(r'\n?<script src="personalize\.js[^"]*" id="chs-js" defer></script>', "", html)
    html = re.sub(r'\n?<svg class="chs-icons".*?</defs></svg>', "", html, flags=re.S)
    html = re.sub(r'<meta name="viewport"[^>]*>', VIEWPORT, html, count=1)
    m = re.search(r'<link rel="stylesheet" href="app\.css[^"]*">', html)
    if not m:
        raise ValueError("app.css link not found")
    html = html[: m.end()] + f'\n<link rel="stylesheet" href="personalize.css?v={ver}" id="chs-css">' + html[m.end():]
    if pwa and 'rel="manifest"' not in html:
        m = re.search(r"<script[ >]", html)
        head = "\n".join(l for l in PWA_HEAD.splitlines() if 'name="theme-color"' not in l or 'name="theme-color"' not in html)
        html = html[: m.start()] + head + "\n" + html[m.start():]
    # אחרון ב־<head>: אחרי סקריפט העדפות הקריאה, כדי ששכבת הסגנון תגבר.
    html = html.replace("</head>", f'<script id="chs-head">{head_script(head_js)}</script>\n</head>', 1)
    m = re.search(r"<body[^>]*>", html)
    html = html[: m.end()] + "\n" + sprite_markup(sprite) + html[m.end():]
    for a, b in ICON_SWAPS:
        html = html.replace(a, b)
    html = re.sub(r'(id="theme-btn"[^>]*>)<svg viewBox="0 0 24 24" aria-hidden="true">.*?</svg>',
                  lambda mm: mm.group(1) + _inline_icon(sprite, "n-palette"), html, count=1, flags=re.S)
    if pwa and PWA_BODY not in html:
        html = html.replace("</body>", PWA_BODY + "\n</body>", 1)
    html = html.replace("</body>", f'<script src="personalize.js?v={ver}" id="chs-js" defer></script>\n</body>', 1)
    return html


def _inline_icon(sprite: str, name: str) -> str:
    m = re.search(r'<symbol id="%s" viewBox="0 0 24 24">(.*?)</symbol>' % re.escape(name), sprite, re.S)
    return f'<svg viewBox="0 0 24 24" aria-hidden="true">{m.group(1)}</svg>'


def patch_sw(sw: Path, ver: str) -> None:
    raw = sw.read_text(encoding="utf-8")
    text = re.sub(r'const CACHE_VERSION = "[^"]*";', f'const CACHE_VERSION = "v4-{ver[:6]}";', raw)
    for asset in ("./personalize.css", "./personalize.js"):
        if f'"{asset}"' not in text:
            text = text.replace('  "./print.css",', f'  "./print.css",\n  "{asset}",', 1)
    if text != raw:
        sw.write_text(text, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    css, js = (root / "personalize.css").read_text(encoding="utf-8"), (root / "personalize.js").read_text(encoding="utf-8")
    head_js = (root / "personalize-head.js").read_text(encoding="utf-8")
    sprite = (root / "tools" / "app" / "nav-icons.svg").read_text(encoding="utf-8")
    ver = version(css, js, head_js, sprite)
    for name, pwa in (("index.html", True), ("status.html", False)):
        page = root / name
        raw = page.read_text(encoding="utf-8")
        html = inject_html(raw, ver, head_js, sprite, pwa=pwa)
        if html != raw:
            page.write_text(html, encoding="utf-8")
        print(f"{name}: {'updated' if html != raw else 'unchanged'}")
    patch_sw(root / "sw.js", ver)
    print(f"personalize v={ver}")


if __name__ == "__main__":
    main()
