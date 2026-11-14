#!/usr/bin/env python3
"""Smoke test: every personalization style loads on key pages without JS errors and with readable text,
and the redesigned top/bottom bars work in every style (icons resolve, 44px targets, labels, active state, "more" sheet).

Usage: python3 tests/theme_smoke.py [base_url]   (default http://127.0.0.1:8765/)
Needs: pip install playwright && python -m playwright install chromium
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
STYLES = ["classic", "editorial", "depth", "discovery"]
PAGES = ["index.html#/home", "index.html#/biur/N01", "index.html#/new", "index.html#/tree", "index.html#/read", "index.html#/read/tanya/3401310006", "status.html"]
TONES = ["light", "dark"]

CONTRAST_JS = """() => {
  const rgb = s => (s.match(/[\\d.]+/g) || []).slice(0, 4).map(Number);
  const lum = c => { const x = c.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return x[0] * .2126 + x[1] * .7152 + x[2] * .0722; };
  const con = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const cs = getComputedStyle(document.documentElement);
  const v = n => { const d = document.createElement('i'); d.style.color = cs.getPropertyValue(n); document.body.appendChild(d); const c = rgb(getComputedStyle(d).color); d.remove(); return c; };
  return { style: document.documentElement.dataset.style, tone: document.documentElement.dataset.tone,
    ink: con(v('--ink'), v('--paper')), ink3: con(v('--ink-3'), v('--card')), accent: con(v('--accent'), v('--paper')), accentCard: con(v('--accent'), v('--card')),
    btn: !!document.querySelector('.chs-btn') };
}"""

EXPECT_ACTIVE = {"index.html#/home": "home", "index.html#/biur/N01": "home", "index.html#/new": "new", "index.html#/tree": "tree", "index.html#/read": "read", "index.html#/read/tanya/3401310006": "read", "status.html": "sysstatus"}

BARS_JS = """(expect) => {
  const out = { problems: [] }, P = m => out.problems.push(m);
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const bar = document.querySelector('.bottombar');
  if (!vis(bar)) P('bottom bar not visible');
  const items = [...document.querySelectorAll('#bn > .bn-i')];
  out.items = items.length;
  if (items.length < 4 || items.length > 6) P('bottom bar has ' + items.length + ' items (want 4-6)');
  for (const it of items) {
    const r = it.getBoundingClientRect(), lab = it.getAttribute('aria-label');
    if (!lab) P('bottom item without aria-label: ' + it.dataset.nav);
    if (r.width < 44 || r.height < 44) P('bottom item < 44px: ' + (lab || it.dataset.nav) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (r.right > innerWidth + 1 || r.left < -1) P('bottom item off-screen: ' + lab);
    if (!it.querySelector('.bn-ic svg') || !it.querySelector('.bn-l')) P('bottom item missing icon/label: ' + lab);
  }
  for (const u of document.querySelectorAll('.top use, .bottombar use')) {
    const id = (u.getAttribute('href') || '').slice(1), sym = document.getElementById(id);
    if (!sym || sym.tagName.toLowerCase() !== 'symbol') P('icon does not resolve: #' + id);
  }
  for (const s of document.querySelectorAll('#bn > .bn-i svg')) { const r = s.getBoundingClientRect(); if (r.width < 16 || r.height < 16) P('icon too small'); }
  const cur = document.querySelector('.bottombar .bn-i[aria-current="page"]');
  out.active = cur ? cur.dataset.nav : null;
  if (expect && out.active !== expect) P('active item ' + out.active + ' != ' + expect);
  const shown = cur && cur.closest('#bn') ? cur : document.querySelector('.bottombar:has(.bn-s[aria-current="page"]) #bn-more');
  const other = items.find(i => i !== shown && i.id !== 'bn-more');
  if (expect && !shown) P('active state not shown in the bar');
  if (shown && other) {
    const sig = e => { const c = getComputedStyle(e), ic = getComputedStyle(e.querySelector('.bn-ic')), l = getComputedStyle(e.querySelector('.bn-l')); return [c.color, ic.backgroundColor, ic.backgroundImage, l.boxShadow, getComputedStyle(e, '::after').content, getComputedStyle(e, '::after').backgroundColor].join('|'); };
    if (sig(shown) === sig(other)) P('active item looks the same as the others');
  }
  for (const t of document.querySelectorAll('.top .tool, .top .chs-btn')) {
    if (!vis(t)) continue;
    const r = t.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) P('top tool < 44px: ' + (t.id || t.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (!t.getAttribute('aria-label') && !(t.textContent || '').trim()) P('top tool without accessible name: ' + (t.id || t.className));
  }
  return out;
}"""

OVERLAP_JS = """() => {
  const kids = [...document.querySelectorAll('.top :is(.nav-i,.tool,.chs-btn,.mode-btn,.brand,.psw,.history-arrow,.history-topics)')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none');
  const bad = [];
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
    if (kids[i].contains(kids[j]) || kids[j].contains(kids[i])) continue;
    const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push((kids[i].id || kids[i].className) + ' / ' + (kids[j].id || kids[j].className));
  }
  return bad;
}"""


async def check_more(page, tag: str, failures: list[str]) -> None:
    more = page.locator("#bn-more")
    if await more.count() == 0:
        failures.append(f"{tag}: no 'more' button in the bottom bar"); return
    await more.click(); await page.wait_for_timeout(200)
    st = await page.evaluate("""() => { const s = document.getElementById('bn-sheet'); const r = s && s.getBoundingClientRect();
      return { open: !!s && !s.hidden && r.height > 0, n: s ? s.querySelectorAll('.bn-grid .bn-i').length : 0, exp: document.getElementById('bn-more').getAttribute('aria-expanded'),
               style: !!(s && s.querySelector('.bn-style')), small: s ? [...s.querySelectorAll('.bn-grid .bn-i')].filter(e => { const q = e.getBoundingClientRect(); return q.width < 44 || q.height < 44; }).length : 0 }; }""")
    if not st["open"] or st["exp"] != "true":
        failures.append(f"{tag}: 'more' sheet did not open ({st})")
    if st["n"] < 4 or not st["style"] or st["small"]:
        failures.append(f"{tag}: 'more' sheet content wrong ({st})")
    await page.keyboard.press("Escape"); await page.wait_for_timeout(150)
    closed = await page.evaluate("() => document.getElementById('bn-sheet').hidden && document.getElementById('bn-more').getAttribute('aria-expanded') === 'false'")
    if not closed:
        failures.append(f"{tag}: Escape did not close the 'more' sheet")


async def main() -> int:
    failures: list[str] = []
    async with async_playwright() as p:
        exe = os.environ.get("CHROME_PATH")
        browser = await p.chromium.launch(**({"executable_path": exe} if exe else {}), args=["--no-sandbox"])
        for style in STYLES:
            for tone in TONES:
                ctx = await browser.new_context(viewport={"width": 390, "height": 844}, color_scheme=tone, service_workers="block")
                await ctx.add_init_script(f"try{{localStorage.setItem('chavruta-style-v1', JSON.stringify({{style:'{style}',size:'m',seen:true}}));}}catch(e){{}}")
                page = await ctx.new_page()
                errors: list[str] = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "favicon" not in m.text else None)
                for path in PAGES:
                    errors.clear()
                    await page.goto(BASE + path, wait_until="load", timeout=60000)
                    await page.wait_for_timeout(1200)
                    res = await page.evaluate(CONTRAST_JS)
                    tag = f"{style}/{tone} {path}"
                    if res["style"] != style:
                        failures.append(f"{tag}: data-style={res['style']}")
                    if not res["btn"]:
                        failures.append(f"{tag}: personalization button missing")
                    for k, lo in (("ink", 7), ("ink3", 4.5), ("accent", 4.5), ("accentCard", 4.5)):
                        if res[k] < lo:
                            failures.append(f"{tag}: contrast {k} {res[k]:.2f} < {lo}")
                    real = [e for e in errors if "net::ERR" not in e]
                    if real:
                        failures.append(f"{tag}: JS errors: {real[:3]}")
                    bars = await page.evaluate(BARS_JS, EXPECT_ACTIVE.get(path))
                    failures.extend(f"{tag}: bars: {m}" for m in bars["problems"])
                    if path in ("index.html#/home", "status.html"):
                        await check_more(page, tag, failures)
                    res["bar_items"], res["active"] = bars["items"], bars["active"]
                    print(f"ok? {tag}: " + json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in res.items()}, ensure_ascii=False))
                await ctx.close()
        # כותרת במסך רחב: שום פריט לא עולה על אחר
        for style in STYLES:
            for width, path in ((1920, "index.html#/biur/N01"), (1440, "index.html#/home"), (1280, "index.html#/biur/N01"), (1024, "index.html#/home")):
                ctx = await browser.new_context(viewport={"width": width, "height": 700}, service_workers="block")
                await ctx.add_init_script(f"try{{localStorage.setItem('chavruta-style-v1', JSON.stringify({{style:'{style}',size:'m',seen:true}}));}}catch(e){{}}")
                page = await ctx.new_page()
                await page.goto(BASE + path, wait_until="load", timeout=60000)
                await page.wait_for_timeout(900)
                bad = await page.evaluate(OVERLAP_JS)
                if bad:
                    failures.append(f"{style} {width}px {path}: header items overlap: {bad[:3]}")
                print(f"ok? header {style} {width}px {path}: overlaps={len(bad)}")
                await ctx.close()
        await browser.close()
    if failures:
        print("\nFAILURES:\n" + "\n".join(failures))
        return 1
    print("\nall styles passed")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
