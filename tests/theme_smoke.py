#!/usr/bin/env python3
"""Smoke test: every personalization style loads on key pages without JS errors and with readable text.

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
PAGES = ["index.html#/home", "index.html#/biur/N01", "index.html#/new", "index.html#/tree", "status.html"]
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
                    print(f"ok? {tag}: " + json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in res.items()}, ensure_ascii=False))
                await ctx.close()
        await browser.close()
    if failures:
        print("\nFAILURES:\n" + "\n".join(failures))
        return 1
    print("\nall styles passed")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
