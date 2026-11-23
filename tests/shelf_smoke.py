#!/usr/bin/env python3
"""PR smoke test: the editions shelf renders book cards from the local tree+catalog.

Usage: python3 tests/shelf_smoke.py [base_url]   (default http://127.0.0.1:8765/)
Needs: pip install playwright && python -m playwright install chromium
"""
from __future__ import annotations

import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
if not BASE.endswith("/"):
    BASE += "/"
URL = BASE + "index.html#/read?tab=editions&r=8"


def main() -> int:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        try:
            context = browser.new_context(viewport={"width": 1365, "height": 1000})
            origin = BASE.rstrip("/")

            def route_handler(route):
                url = route.request.url
                if url.startswith(origin + "/") or url.startswith(origin + "?"):
                    return route.continue_()
                # Allow about: and data: only; abort anything off-origin.
                if url.startswith("data:") or url.startswith("about:"):
                    return route.continue_()
                return route.abort()

            context.route("**/*", route_handler)
            page = context.new_page()
            page.on("pageerror", lambda exc: errors.append(str(exc)))
            page.goto(URL, wait_until="domcontentloaded")
            failed = page.get_by_text("לא ניתן לטעון את המהדורות כעת")
            cards = page.locator(".books-card")
            try:
                cards.first.wait_for(state="visible", timeout=30000)
            except Exception:
                if failed.count():
                    raise SystemExit("editions shelf failed to load: catalog/tree mismatch or load error")
                raise SystemExit("timed out waiting for .books-card on the editions shelf")
            n = cards.count()
            if n < 12:
                raise SystemExit(f"expected at least 12 shelf cards for the Rebbe, got {n}")
            if failed.count():
                raise SystemExit("editions shelf showed a load-error message")
        finally:
            browser.close()
    if errors:
        raise SystemExit("page errors: " + " | ".join(errors))
    print(f"shelf_smoke ok: {n} cards")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
