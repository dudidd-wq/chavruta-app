/* חברותא · התאמה אישית — רץ ב-<head> לפני הציור הראשון (מוזרק כ-inline על ידי tools/app/apply_personalize.py). */
(function () {
  var K = "chavruta-style-v1", r = document.documentElement, mq = window.matchMedia("(prefers-color-scheme: dark)");
  function read() { var s = {}; try { s = JSON.parse(localStorage.getItem(K) || "{}") || {}; } catch (e) {} return {
    style: /^(classic|editorial|depth|discovery)$/.test(s.style) ? s.style : "classic",
    accent: /^#[0-9a-f]{6}$/i.test(s.accent || "") ? s.accent.toLowerCase() : "",
    size: /^(s|m|l|xl)$/.test(s.size) ? s.size : "m", seen: !!s.seen }; }
  function hx(c) { c = (c || "").trim(); if (/^#[0-9a-f]{3}$/i.test(c)) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : ""; }
  function rgb(c) { return [1, 3, 5].map(function (i) { return parseInt(c.slice(i, i + 2), 16); }); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return "#" + x.map(function (v, i) { return Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, "0"); }).join(""); }
  function lum(c) { var x = rgb(c).map(function (v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return x[0] * .2126 + x[1] * .7152 + x[2] * .0722; }
  function con(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function fit(acc, paper, card) { var dark = lum(paper) < .2, to = dark ? "#ffffff" : "#000000", v = acc;
    for (var i = 0; i <= 20; i++) { v = mix(acc, to, i / 20); if (con(v, paper) >= 4.5 && con(v, card) >= 4.5) break; }
    return { c: v, changed: v !== acc, on: con("#ffffff", v) >= con("#111111", v) ? "#ffffff" : "#111111" }; }
  function tone() { var st = r.getAttribute("data-style"), t = r.getAttribute("data-theme");
    if (st === "depth") return "dark"; if (t === "light" || t === "dark") return t; return mq.matches ? "dark" : "light"; }
  function apply(s) {
    s = s || read();
    r.setAttribute("data-style", s.style); r.setAttribute("data-size", s.size);
    if (s.style === "depth") { r.setAttribute("data-theme", "dark"); r.setAttribute("data-chs-forced", ""); }
    else if (r.hasAttribute("data-chs-forced")) { r.removeAttribute("data-chs-forced"); var t = null; try { t = localStorage.getItem("chavruta-theme"); } catch (e) {}
      if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme"); }
    r.setAttribute("data-tone", tone());
    var el = document.getElementById("chs-accent"), res = null;
    if (el) el.textContent = "";
    if (s.accent) {
      var cs = getComputedStyle(r), paper = hx(cs.getPropertyValue("--paper")) || "#ffffff", card = hx(cs.getPropertyValue("--card")) || paper, ink = hx(cs.getPropertyValue("--ink")) || "#111111";
      res = fit(s.accent, paper, card); var a = res.c;
      if (!el) { el = document.createElement("style"); el.id = "chs-accent"; document.head.appendChild(el); }
      el.textContent = ":root:root:root:root{--accent:" + a + " !important;--accent-2:" + mix(a, ink, .28) + " !important;--accent-soft:" + mix(paper, a, .12) +
        " !important;--accent-line:" + mix(paper, a, .45) + " !important;--on-accent:" + res.on + ";}";
    }
    var m = document.querySelector('meta[name="theme-color"]'); if (m) { var p = hx(getComputedStyle(r).getPropertyValue("--paper")); if (p) m.setAttribute("content", p); }
    return res;
  }
  window.chavrutaStyle = { key: K, read: read, apply: apply, tone: tone, contrast: con, mix: mix, fit: fit, hex: hx };
  apply();
  mq.addEventListener && mq.addEventListener("change", function () { apply(); });
})();
