/* חברותא · פאנל "התאמה אישית": סגנון, צבע מוביל, תאורה וגודל טקסט. נשמר ב-localStorage (chavruta-style-v1).
   משתמש ב-window.chavrutaStyle (סקריפט ה-head) ובממשק window.chavrutaPreferences כשהוא קיים (index.html). */
(function () {
  "use strict";
  var CS = window.chavrutaStyle; if (!CS) return;
  var r = document.documentElement, P = function () { return window.chavrutaPreferences; };
  var STYLES = [
    { id: "classic", name: "קלאסי", d: "העיצוב הנוכחי: נייר חם וסריף" },
    { id: "editorial", name: "מגזין", d: "טיפוגרפיה נועזת, הרבה אוויר, צבע אחד" },
    { id: "depth", name: "אור ועומק", d: "כהה, אור זהוב ועץ הספירות" },
    { id: "discovery", name: "גילוי", d: "בהיר וצבעוני, נוח למתחילים" }];
  var ACCENTS = [["#c8321f", "אדום־כתום"], ["#76283a", "בורדו"], ["#b7791f", "זהב"], ["#0b7268", "טורקיז"],
    ["#1d5fa8", "כחול"], ["#4d6b1f", "זית"], ["#c43d64", "אלמוג"], ["#3b4252", "גרפיט"]];
  var SIZES = [["s", "קטן", 18, ".85rem"], ["m", "רגיל", 21, "1rem"], ["l", "גדול", 24, "1.18rem"], ["xl", "גדול מאוד", 28, "1.36rem"]];
  var MODES = [["system", "אוטומטי"], ["light", "בהיר"], ["dark", "כהה"]];

  function save(patch) {
    var s = CS.read(); for (var k in patch) s[k] = patch[k];
    try { localStorage.setItem(CS.key, JSON.stringify(s)); } catch (e) {}
    var res = CS.apply(s); syncPrefs(); render(res); decorate(); return res;
  }
  function getMode() { var p = P(); if (p) return p.get().theme; var t = null; try { t = localStorage.getItem("chavruta-theme"); } catch (e) {} return t === "light" || t === "dark" ? t : "system"; }
  function setMode(m) {
    var p = P();
    if (p) p.update({ theme: m });
    else {
      try {
        if (m === "system") localStorage.removeItem("chavruta-theme"); else localStorage.setItem("chavruta-theme", m);
        var k = "chavruta-reading-preferences-v1", d = JSON.parse(localStorage.getItem(k) || "null");
        if (d && d.version === 1 && d.preferences) { d.preferences.theme = m; localStorage.setItem(k, JSON.stringify(d)); }
      } catch (e) {}
      if (m === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", m);
    }
    render(CS.apply()); decorate();
  }
  function syncPrefs() {
    var s = CS.read(), p = P(); if (!p) return;
    var px = SIZES.filter(function (x) { return x[0] === s.size; })[0][2];
    if (p.get().font !== px) p.update({ font: px });
    if (s.style === "depth" && r.getAttribute("data-theme") !== "dark") r.setAttribute("data-theme", "dark");
  }
  // The reading-preferences script rewrites data-theme on every change; re-assert the style layer after it.
  window.addEventListener("prefchange", function () { CS.apply(); });

  /* ---------- panel ---------- */
  var panel, scrim, opener;
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function build() {
    scrim = el("div", { class: "chs-scrim", hidden: "" });
    panel = el("section", { class: "chs-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "chs-title", hidden: "", tabindex: "-1" });
    panel.innerHTML =
      '<div class="chs-hd"><h2 id="chs-title">התאמה אישית: סגנון וצבעים</h2><button type="button" class="chs-x" aria-label="סגירה">×</button></div>' +
      '<p class="chs-p">בחרו איך חברותא נראית אצלכם. השינוי מוצג מיד ונשמר במכשיר הזה בלבד.</p>' +
      '<h3 class="chs-h" id="chs-h-style">סגנון</h3><div class="chs-styles" role="radiogroup" aria-labelledby="chs-h-style">' +
      STYLES.map(function (s) { return '<button type="button" class="chs-style" role="radio" data-style="' + s.id + '"><span class="chs-thumb" data-s="' + s.id + '" aria-hidden="true"></span><b>' + s.name + '</b><small>' + s.d + '</small></button>'; }).join("") + '</div>' +
      '<h3 class="chs-h" id="chs-h-acc">צבע מוביל</h3><div class="chs-sw" role="radiogroup" aria-labelledby="chs-h-acc">' +
      '<button type="button" class="chs-c def" role="radio" data-acc="" aria-label="צבע ברירת המחדל של הסגנון" title="ברירת המחדל של הסגנון"></button>' +
      ACCENTS.map(function (a) { return '<button type="button" class="chs-c" role="radio" data-acc="' + a[0] + '" style="--c:' + a[0] + '" aria-label="' + a[1] + '" title="' + a[1] + '"></button>'; }).join("") +
      '<label class="chs-custom"><input type="color" id="chs-color" value="#c8321f" aria-label="צבע לבחירה חופשית">צבע אחר</label></div><p class="chs-note" id="chs-note" aria-live="polite"></p>' +
      '<h3 class="chs-h" id="chs-h-mode">תאורה</h3><div class="chs-seg" role="radiogroup" aria-labelledby="chs-h-mode">' +
      MODES.map(function (m) { return '<button type="button" role="radio" data-mode="' + m[0] + '">' + m[1] + '</button>'; }).join("") + '</div>' +
      '<h3 class="chs-h" id="chs-h-size">גודל טקסט</h3><div class="chs-seg size" role="radiogroup" aria-labelledby="chs-h-size">' +
      SIZES.map(function (z) { return '<button type="button" role="radio" data-size="' + z[0] + '" aria-label="' + z[1] + '" style="font-size:' + z[3] + '">א</button>'; }).join("") + '</div>' +
      '<div class="chs-prev" aria-hidden="true"><small>תצוגה מקדימה</small><p>״אלה תולדות נח, נח איש צדיק תמים היה בדורותיו, את האלהים התהלך נח״.</p><span class="btn primary">להמשך הלימוד</span> <a class="chs-link" tabindex="-1">קישור למקור</a></div>' +
      '<div class="chs-row"><button type="button" class="btn" data-act="reset">איפוס לברירת המחדל</button>' +
      (document.getElementById("disp-btn") ? '<button type="button" class="btn ghost" data-act="reading">הגדרות קריאה מתקדמות</button>' : '') +
      '<button type="button" class="btn primary" data-act="close">סיום</button></div>';
    document.body.appendChild(scrim); document.body.appendChild(panel);
    scrim.addEventListener("click", close);
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") { var f = panel.querySelectorAll("button:not([disabled]), input"); var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    panel.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.classList.contains("chs-x") || b.dataset.act === "close") return close();
      if (b.dataset.style) return save({ style: b.dataset.style, seen: true });
      if (b.hasAttribute("data-acc")) return save({ accent: b.dataset.acc });
      if (b.dataset.mode) return setMode(b.dataset.mode);
      if (b.dataset.size) return save({ size: b.dataset.size });
      if (b.dataset.act === "reset") { save({ style: "classic", accent: "", size: "m", seen: true }); return setMode("system"); }
      if (b.dataset.act === "reading") { close(); document.getElementById("disp-btn").click(); }
    });
    panel.querySelector("#chs-color").addEventListener("input", function (e) { save({ accent: e.target.value }); });
  }
  function render(res) {
    if (!panel) return;
    var s = CS.read(), mode = getMode();
    panel.querySelectorAll(".chs-style").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.style === s.style)); });
    panel.querySelectorAll(".chs-c").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.acc === s.accent)); });
    var custom = s.accent && !ACCENTS.some(function (a) { return a[0] === s.accent; });
    panel.querySelector(".chs-custom").style.borderStyle = custom ? "solid" : "dashed";
    if (s.accent) panel.querySelector("#chs-color").value = s.accent;
    panel.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.mode === mode)); b.disabled = s.style === "depth"; });
    panel.querySelectorAll(".chs-seg [data-size]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.size === s.size)); });
    var note = panel.querySelector("#chs-note");
    note.textContent = s.style === "depth" ? "״אור ועומק״ הוא סגנון כהה, ולכן התאורה קבועה." : "";
    if (res && res.changed) note.textContent = (note.textContent ? note.textContent + " " : "") + "הגוון הותאם מעט כדי שהטקסט יישאר קריא.";
  }
  function open(e) {
    if (!panel) build();
    opener = (e && e.currentTarget) || document.activeElement;
    render(CS.apply()); scrim.hidden = false; panel.hidden = false;
    document.querySelectorAll(".chs-btn").forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
    (panel.querySelector('.chs-style[aria-checked="true"]') || panel).focus();
    dismissToast();
  }
  function close() {
    if (!panel) return; panel.hidden = true; scrim.hidden = true;
    document.querySelectorAll(".chs-btn").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
    if (opener && opener.focus) opener.focus();
  }
  window.chavrutaStyle.open = open; window.chavrutaStyle.close = close;

  /* ---------- entry points ---------- */
  function addButton() {
    if (document.querySelector(".chs-btn")) return;
    var host = document.querySelector(".top .tools") || document.querySelector(".top");
    var b = el("button", { type: "button", class: "tool chs-btn", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-label": "סגנון וצבעים", title: "התאמה אישית: סגנון וצבעים" },
      '<svg aria-hidden="true"><use href="#n-style"/></svg><span class="lbl">סגנון</span>');
    b.addEventListener("click", open);
    if (host && host.classList.contains("tools")) host.insertBefore(b, host.firstChild); else if (host) { b.style.marginInlineStart = "auto"; host.appendChild(b); }
    else { b.className = "chs-fab on chs-btn"; document.body.appendChild(b); }
  }
  var toast;
  function dismissToast() { if (toast) { toast.remove(); toast = null; } var s = CS.read(); if (!s.seen) { s.seen = true; try { localStorage.setItem(CS.key, JSON.stringify(s)); } catch (e) {} } }
  function maybeToast() {
    var s = CS.read(); if (s.seen || toast) return;
    if (!/^#\/?(home)?(\?|$)/.test(location.hash || "#/home")) return;
    toast = el("div", { class: "chs-toast", role: "status" }, '<p><b>חדש:</b> אפשר לבחור לחברותא סגנון וצבעים משלכם.</p><button type="button" class="y">לבחירה</button><button type="button" class="n">לא עכשיו</button>');
    toast.querySelector(".y").addEventListener("click", open);
    toast.querySelector(".n").addEventListener("click", dismissToast);
    document.body.appendChild(toast);
  }

  /* ---------- discovery: "מאיפה מתחילים" from existing app routes ---------- */
  var TOPICS = ["אור אין סוף", "צמצום", "דירה בתחתונים", "עשר הספירות", "אהבה ויראה", "ביטול", "רצוא ושוב", "שמחה", "תשובה", "תפילה", "שבת"];
  function decorate() {
    var view = document.getElementById("view"); if (!view) return;
    var old = view.querySelector(".chs-start"), s = CS.read(), hero = view.querySelector(".h-hero");
    if (s.style !== "discovery" || !hero) { if (old) old.remove(); return; }
    if (old) return;
    var wk = view.querySelector(".pc.is-week h3 a"), wkName = wk ? wk.textContent.trim() : "", wkHref = wk ? wk.getAttribute("href") : "#/biurim";
    var box = el("section", { class: "chs-start no-print", "aria-labelledby": "chs-start-h" });
    box.innerHTML = '<h2 id="chs-start-h">מאיפה מתחילים?</h2><div class="chs-start-grid">' +
      '<a class="chs-go" href="#/daily"><span><b>יש לי 5 דקות</b><small>לימוד יומי: תניא, תורה אור ולקוטי תורה</small></span><i aria-hidden="true">←</i></a>' +
      '<a class="chs-go" href="' + wkHref + '"><span><b>' + (wkName ? "פרשת השבוע: " + wkName.replace(/^פרשת\s*/, "") : "הפרשיות") + '</b><small>המאמרים והמקורות על הפרשה</small></span><i aria-hidden="true">←</i></a>' +
      '<a class="chs-go" href="#/biur/N01"><span><b>שרשרת אחת, כל הדורות</b><small>״אלה תולדות נח״ — מאדמו״ר הזקן ועד הרבי</small></span><i aria-hidden="true">←</i></a>' +
      '<a class="chs-go" href="#/learn/foundations"><span><b>מה זו חסידות?</b><small>יסודות החסידות ועבודת ה׳</small></span><i aria-hidden="true">←</i></a></div>' +
      '<div class="chs-chips" aria-label="נושאים לגילוי">' + TOPICS.map(function (t) { return '<a href="#/topics/' + encodeURIComponent(t) + '">' + t + '</a>'; }).join("") + '<a href="#/topics">כל הנושאים ←</a></div>';
    hero.insertAdjacentElement("afterend", box);
  }

  /* גיליון "עוד" בסרגל התחתון: באפליקציה shell.js בונה ומחווט אותו; בעמודים סטטיים (status.html) — כאן.
     בשניהם מוסיפים לגיליון את "סגנון וצבעים". */
  function wireMore() {
    var more = document.getElementById("bn-more"), sheet = document.getElementById("bn-sheet");
    if (!more || !sheet) return;
    function shut(focus) { if (sheet.hidden) return; sheet.hidden = true; more.setAttribute("aria-expanded", "false"); document.body.classList.remove("bn-sheet-open"); if (focus) more.focus(); }
    var grid = sheet.querySelector(".bn-grid");
    if (grid && !grid.querySelector(".bn-style")) {
      var st = el("button", { type: "button", class: "bn-i bn-s bn-style", "aria-label": "סגנון וצבעים", "aria-haspopup": "dialog" },
        '<span class="bn-ic" aria-hidden="true"><svg aria-hidden="true"><use href="#n-style"/></svg></span><span class="bn-l" aria-hidden="true">סגנון וצבעים</span>');
      st.addEventListener("click", function (e) { e.stopPropagation(); shut(); open({ currentTarget: more }); });
      grid.appendChild(st);
    }
    if (more.dataset.wired) return;
    more.dataset.wired = "1";
    more.addEventListener("click", function () { if (!sheet.hidden) return shut(); sheet.hidden = false; more.setAttribute("aria-expanded", "true"); document.body.classList.add("bn-sheet-open"); var f = sheet.querySelector(".bn-grid a, .bn-grid button"); if (f) f.focus(); });
    var x = sheet.querySelector(".bn-x"); if (x) x.addEventListener("click", function () { shut(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) { e.stopPropagation(); shut(true); } }, true);
    document.addEventListener("click", function (e) { if (!sheet.hidden && !sheet.contains(e.target) && !more.contains(e.target)) shut(); });
  }
  function init() {
    addButton(); wireMore(); syncPrefs(); CS.apply(); decorate(); maybeToast();
    var view = document.getElementById("view");
    if (view && window.MutationObserver) new MutationObserver(function () { decorate(); }).observe(view, { childList: true });
    window.addEventListener("hashchange", function () { setTimeout(function () { decorate(); maybeToast(); }, 50); });
    // header may be re-rendered by the app; keep the button present
    if (window.MutationObserver) { var top = document.querySelector(".top"); if (top) new MutationObserver(addButton).observe(top, { childList: true, subtree: true });
      var bnav = document.querySelector(".bottombar"); if (bnav) new MutationObserver(wireMore).observe(bnav, { childList: true, subtree: true }); }
    window.addEventListener("storage", function (e) { if (e.key === CS.key) { render(CS.apply()); decorate(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
