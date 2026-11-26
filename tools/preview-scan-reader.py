#!/usr/bin/env python3
"""Local preview for the built-in typography scan viewer.

Serves the app from the repo root and same-origin proxies HebrewBooks
page-feed PDFs at /hb-page/<book>/<page> and allowlisted Internet Archive
page images at /ia-page/<id>/<page> so the built-in reader can draw them
without a cross-origin fetch.

Usage (from the repository root):
  python3 tools/preview-scan-reader.py
  # then open http://127.0.0.1:8765/#/read/tzavaat-harivash/8157910003?view=split
"""
from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HB_RE = re.compile(r"^/hb-page/(\d{1,8})/(\d{1,5})$")
IA_RE = re.compile(r"^/ia-page/(nybc208211|nybc208212)/(\d{1,5})$")
IA_MAX = {"nybc208211": 370, "nybc208212": 466}
CACHE = Path("/workspace/chavruta/work/t7-catalog-20261125/hb-proxy-cache")
IA_CACHE = Path("/workspace/chavruta/work/t8-scan-sync-20261126/ia-proxy-cache")
UA = "Mozilla/5.0 (compatible; ChavrutaScanPreview/1.0)"


def hb_url(book: str, page: str) -> str:
    return f"https://beta.hebrewbooks.org/pagefeed/hebrewbooks_org_{book}_{page}.pdf"


def ia_url(ident: str, page: str) -> str:
    return f"https://archive.org/download/{ident}/page/n{int(page) - 1}.jpg"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0]
        m = HB_RE.match(path)
        if m:
            self._proxy_hb(m.group(1), m.group(2))
            return
        m = IA_RE.match(path)
        if m:
            self._proxy_ia(m.group(1), m.group(2))
            return
        if path.startswith("/hb-page/"):
            self.send_error(404, "not a hebrewbooks page")
            return
        if path.startswith("/ia-page/"):
            self.send_error(404, "not an allowlisted internet archive page")
            return
        super().do_GET()

    def _proxy_hb(self, book: str, page: str) -> None:
        CACHE.mkdir(parents=True, exist_ok=True)
        dest = CACHE / f"{book}_{page}.pdf"
        data = dest.read_bytes() if dest.is_file() and dest.stat().st_size > 8 else None
        if data is None:
            req = urllib.request.Request(hb_url(book, page), headers={"User-Agent": UA, "Accept": "application/pdf"})
            try:
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()
            except urllib.error.HTTPError as e:
                self.send_error(e.code, "hebrewbooks pagefeed error")
                return
            except Exception:
                self.send_error(502, "hebrewbooks pagefeed unavailable")
                return
            if not data.startswith(b"%PDF-") or len(data) > 6 * 1024 * 1024:
                self.send_error(502, "invalid hebrewbooks payload")
                return
            dest.write_bytes(data)
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(data)

    def _proxy_ia(self, ident: str, page: str) -> None:
        n = int(page)
        if n < 1 or n > IA_MAX[ident]:
            self.send_error(404, "not an allowlisted internet archive page")
            return
        IA_CACHE.mkdir(parents=True, exist_ok=True)
        dest = IA_CACHE / f"{ident}_{n:04d}.jpg"
        data = dest.read_bytes() if dest.is_file() and dest.stat().st_size > 8 else None
        if data is None:
            req = urllib.request.Request(ia_url(ident, page), headers={"User-Agent": UA, "Accept": "image/jpeg"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = resp.read()
            except urllib.error.HTTPError as e:
                self.send_error(e.code, "internet archive page error")
                return
            except Exception:
                self.send_error(502, "internet archive page unavailable")
                return
            if not (data.startswith(b"\xff\xd8\xff") or data.startswith(b"\x89PNG")) or len(data) > 6 * 1024 * 1024:
                self.send_error(502, "invalid internet archive payload")
                return
            dest.write_bytes(data)
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(data)


def main() -> int:
    p = argparse.ArgumentParser(description="Preview the typography scan reader with same-origin HebrewBooks and Internet Archive proxies.")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8765)
    args = p.parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"http://{args.host}:{args.port}/#/read/sefer-hazichronot-yiddish/9530100001?view=split", flush=True)
    httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
