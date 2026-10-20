/* חברותא · אפליקציה — עזרים כלליים. הכול בלי ספריות חיצוניות ובלי רשת. */
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const NS = "http://www.w3.org/2000/svg";
/* append / prepend / replaceChildren מתעלמים מ־null ו־false (אחרת הדפדפן כותב ״null״ בטקסט) */
for (const m of ["append", "prepend", "replaceChildren"]) { const o = Element.prototype[m]; Element.prototype[m] = function (...a) { return o.apply(this, a.flat().filter(x => x != null && x !== false)); }; }
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** בונה אלמנט: h("div", {class:"x", onclick:fn}, child, ...) */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (k.startsWith("aria-") && typeof v === "boolean") { e.setAttribute(k, String(v)); continue; }   // aria-pressed / aria-checked: ״true״ / ״false״
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "text") e.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.append(e);
  return e;
}
const icon = (id, cls) => { const s = document.createElementNS(NS, "svg"); if (cls) s.setAttribute("class", cls); s.setAttribute("aria-hidden", "true"); const u = document.createElementNS(NS, "use"); u.setAttribute("href", "#" + id); s.append(u); return s; };
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- עברית ---- */
const NUM = [[400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"], [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"]];
function gem(n) {
  let o = "";
  if (n === 15) o = "טו"; else if (n === 16) o = "טז";
  else for (const [v, c] of NUM) while (n >= v) { o += c; n -= v; }
  return o.length > 1 ? o.slice(0, -1) + "״" + o.slice(-1) : o + "׳";
}
const hebYear = y => gem(y - 5000);
const NIQ = /[֑-ׇ]/g;
function norm(s) {
  return String(s || "").replace(NIQ, "").replace(/־/g, " ").replace(/[׳״"'’]/g, "").replace(/[^א-ת0-9A-Za-z ]/g, " ").replace(/\s+/g, " ").trim();
}
/** עדכון תצוגת שם: בלי בס״ד פותח */
const cleanT = s => String(s || "").replace(/^בס["״]ד\.?\s*/, "").replace(/^בעזה["״]י\.?\s*/, "").trim();
const trunc = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

/* ---- ניתוב ---- */
function encId(s) { return encodeURIComponent(s).replace(/%3A/gi, ":").replace(/%2C/gi, ","); }
function parseHash(hash = location.hash) {
  let s = hash.replace(/^#\/?/, "");
  const qi = s.indexOf("?");
  const q = new URLSearchParams(qi >= 0 ? s.slice(qi + 1) : "");
  if (qi >= 0) s = s.slice(0, qi);
  const seg = s.split("/").filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  return { seg, q, raw: hash };
}
let MODE = "read";
function mkHash(seg, q0, opts) {
  const q = Object.assign({}, q0 || {});
  if (!(opts && opts.nomode) && q.mode === undefined) q.mode = MODE;
  const qs = q ? Object.entries(q).filter(([, v]) => v !== "" && v != null && v !== false).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v === true ? "1" : v)).join("&") : "";
  return "#/" + seg.map(encId).join("/") + (qs ? "?" + qs : "");
}
function go(hash, replace) {
  if (replace) { history.replaceState(null, "", hash); window.dispatchEvent(new HashChangeEvent("hashchange")); }
  else location.hash = hash;
}
/** מעדכן את הכתובת בלי להפעיל ניתוב מחדש (לסנכרון מצב: סינון, גלילה) */
function quietHash(hash) { try { history.replaceState(null, "", hash); } catch (e) {} }

/* ---- העתקה ---- */
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); }
  catch (e) { const ta = h("textarea", { style: { position: "fixed", opacity: 0 } }); ta.value = s; document.body.append(ta); ta.select(); try { document.execCommand("copy"); } catch (_) {} ta.remove(); }
  toast("הקישור הועתק");
}
function absUrl(hash) { return location.href.replace(/#.*$/, "") + hash; }
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const ltr = s => h("bdi", { dir: "ltr" }, s);
const fmt = n => Number(n).toLocaleString("he-IL");

/** עוטף מזהים לטיניים (U-day2, G5, ChatGPT…) ב־bdi כדי שלא ישברו את סדר המשפט העברי */
function proseHtml(html) {
  return String(html || "").replace(/(<[^>]+>)|([^<]+)/g, (m, tag, txt) => tag ? tag : txt.replace(/(?<![A-Za-z0-9])((?:U-[A-Za-z0-9-]+)|(?:[A-Z]\d{1,2}(?:-\d+)?)|ChatGPT|Grok|Gemini|PASS(?: בתנאי)?|REVISE|COVERAGE\.md|STATUS\.md|excerpts\.json|map\.json|hb:\d+:\d+)(?![A-Za-z0-9])/g, (x) => x.includes("PASS בתנאי") ? '<bdi>' + x + '</bdi>' : '<bdi dir="ltr">' + x + '</bdi>'));
}

/* טבלאות רחבות בטלפון (אותה פונקציה כמו ב־tools/site/nav.js) */
function chvStackTables(root) {
  [].forEach.call((root || document).querySelectorAll('table'), function (t) {
    if (t.classList.contains('stack')) return;
    var ths = t.querySelectorAll('thead th'); if (ths.length < 4) return;
    var lab = [].map.call(ths, function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); });
    t.classList.add('stack'); if (lab[0] === '#' || lab[0] === '') t.classList.add('lead2');
    [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) {
      var i = 0; [].forEach.call(tr.children, function (td) { if (lab[i] && !td.hasAttribute('data-label')) td.setAttribute('data-label', lab[i]); i += +(td.getAttribute('colspan') || 1); });
    });
  });
}


/* חברותא · טעינת נתונים. הנתונים נטענים בתגיות <script> (data/*.js) ולכן עובדים גם מ־file:// וגם מכל אחסון סטטי. */
const D = { chunks: {}, waiting: {}, loading: {} };
window.__D = (name, obj) => { D.chunks[name] = obj; (D.waiting[name] || []).forEach(f => f(obj)); D.waiting[name] = []; };
function chunkFile(name) { return name.startsWith("b:") ? `data/b-${name.slice(2)}.js` : `data/${name}.js`; }
function loadChunk(name) {
  if (D.chunks[name]) return Promise.resolve(D.chunks[name]);
  if (D.loading[name]) return D.loading[name];
  D.loading[name] = new Promise((res, rej) => {
    (D.waiting[name] = D.waiting[name] || []).push(res);
    const s = document.createElement("script");
    s.src = chunkFile(name); s.async = true;
    s.onerror = () => { delete D.loading[name]; rej(new Error("לא ניתן לטעון " + chunkFile(name))); };
    document.head.append(s);
  });
  return D.loading[name];
}

const S = { core: null, nodes: new Map(), docs: new Map(), docList: [], links: null, selNode: null, edgesOut: new Map(), edgesIn: new Map() };
const CAT = {
  covered: { label: "מכוסה בביאור", short: "מכוסה", cls: "acc" },
  mentioned: { label: "מוזכר בלבד", short: "מוזכר בלבד", cls: "warn" },
  excluded: { label: "הושמט / מחוץ להיקף", short: "הושמט", cls: "mute" },
  notext: { label: "הטקסט אינו בידינו", short: "אין טקסט", cls: "bad" },
  gap: { label: "פער", short: "פער", cls: "bad" },
};
const CHAPTER = { 0: "פתיחות", 1: "פרק א", 2: "פרק ב", 3: "פרק ג", 4: "פרק ד", 5: "פרק ה", 6: "פרק ו" };
const EDGE_KIND = ["הפניה", "אותו ד״ה", "ביאור על", "נוסח אחר"];
const gcol = g => `var(--g${g == null || g < 0 ? "x" : g})`;
const GS = { 0: "בעש״ט והמגיד", 1: "אדה״ז", 2: "האמצעי", 3: "הצמח צדק", 4: "מהר״ש", 5: "הרש״ב", 6: "הריי״צ", 7: "הרבי", "-1": "לא זוהה" };
const GEN_IDS = [0, 1, 2, 3, 4, 5, 6, 7];
const TYPES = ["מאמר", "הנחה", "שיחה", "מכתב", "הגהות ורשימות"];
const CATS = ["covered", "mentioned", "excluded", "notext"];

function initCore(core) {
  S.core = core;
  for (const n of core.nodes) S.nodes.set(n.id, n);
  S.docList = core.docs;
  for (const d of core.docs) S.docs.set(d.id, d);
  S.docByKey = new Map(); for (const d of core.docs) if (d.kind !== "dorot") S.docByKey.set(d.key, d);
  for (const e of core.edges) {
    (S.edgesOut.get(e[0]) || S.edgesOut.set(e[0], []).get(e[0])).push(e);
    (S.edgesIn.get(e[1]) || S.edgesIn.set(e[1], []).get(e[1])).push(e);
  }
  S.xref = core.xref || {};
  S.home = core.parsha;                   // פרשת הבית (בראשית): ספר ביאורים מלא
  S.par = null; setPar(S.home);
}
/* ---- פרשה נוכחית ----
   כל ביאור וכל פריט שייכים לפרשה (d.p / n.p). התצוגות (רשימת הביאורים, החקר, המקורות, הסטטוס) עובדות על הפרשה הנוכחית:
   S.verseDocs / S.chainDocs / S.dorotDocs / S.books / S.pnodes מתעדכנים ב־setPar. S.core.nodes ו־S.docList — כל הפרשיות יחד. */
const PAR_CACHE = new Map();
function docsOf(p) {
  let r = PAR_CACHE.get(p); if (r) return r;
  const ds = S.core.docs.filter(d => (d.p || S.home) === p);
  const nodes = S.core.nodes.filter(n => (n.p || S.home) === p);
  const cats = {}; for (const n of nodes) cats[n.cat] = (cats[n.cat] || 0) + 1;
  r = { p, verse: ds.filter(d => d.kind === "verse").sort((a, b) => a.order - b.order), chain: ds.filter(d => d.kind === "chain").sort((a, b) => a.seq - b.seq),
    dorot: ds.filter(d => d.kind === "dorot"), books: ds.filter(d => d.kind !== "dorot").sort((a, b) => a.n - b.n), nodes, cats };
  PAR_CACHE.set(p, r); return r;
}
/** האם יש לפרשה ביאורים באפליקציה (בראשית, נח) — אחרת יש לה רק מיפוי מקורות מעץ הידע */
function hasDocs(p) { return !!p && docsOf(p).books.length > 0; }
function setPar(p) {
  if (!hasDocs(p)) p = S.par || S.home;
  if (p === S.par) return;
  const r = docsOf(p);
  S.par = p; S.verseDocs = r.verse; S.chainDocs = r.chain; S.dorotDocs = r.dorot; S.books = r.books; S.pnodes = r.nodes; S.pcats = r.cats;
  S.counts = { total: r.nodes.length, cats: r.cats };
}
const isHome = (p = S.par) => p === S.home;
/** הכתובת של עמוד הפרשה (בבראשית: #/biurim; בשאר: #/parsha/<שם>) כמקטעים */
const parRoot = (p = S.par) => isHome(p) ? ["biurim"] : ["parsha", p];
/** סדר הספר: יחידות כלליות, ואחר כך לפי פרקים ופסוקים (יחידות פסוק ושרשראות מעורבות).
   בפרשה שאין בה יחידות פסוק (נח): השרשראות לפי פרק הפסוק שלהן, ובסוף — שרשראות על פסוק מן ההפטרה או מספר אחר */
function bookGroups(p = S.par) {
  if (!isHome(p)) {
    const D = docsOf(p), by = new Map(), rest = [];
    for (const d of D.chain) { if (d.cv) (by.get(d.cv[0]) || by.set(d.cv[0], []).get(d.cv[0])).push(d); else rest.push(d); }
    const out = [...by].sort((a, b) => a[0] - b[0]).map(([c, ds]) => ({ id: "c" + c, title: "פרק " + gem(c).replace(/[׳״]/g, ""), sub: ds.length + (ds.length === 1 ? " שרשרת" : " שרשראות"), docs: ds.sort((a, b) => a.cv[1] - b.cv[1] || a.seq - b.seq) }));
    if (rest.length) out.push({ id: "x", title: "מן ההפטרה ומפסוקים אחרים", sub: "פסוק העוגן אינו בפרשה עצמה", docs: rest });
    return out;
  }
  const H = docsOf(p);
  const out = [{ id: "g", title: "נושאים כלליים ופתיחות", sub: "יחידות כלליות, פתיחות והפטרות", docs: [...H.verse.filter(d => !d.range), ...H.chain.filter(d => !d.cv)].sort((a, b) => a.n - b.n) }];
  const ch = S.core.torah.chapters;
  for (let c = 1; c <= 6; c++) {
    const docs = [];
    for (const d of H.verse) if (d.range && d.range[0] === c) docs.push([d.range[1], 0, d]);
    for (const d of H.chain) if (d.cv && d.cv[0] === c) docs.push([d.cv[1], 1, d]);
    docs.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].n - b[2].n);
    out.push({ id: "c" + c, title: "פרק " + gem(c).replace(/[׳״]/g, ""), sub: ch[c].length + " פסוקים", docs: docs.map(x => x[2]) });
  }
  return out;
}
/** ביאורים אחרים החולקים פריטים עם ביאור נתון: [[docId, [nodeIds]]] לפי כמות */
function sharedDocs(did) {
  const mine = new Set((S.links?.d[did]) || []); const base = S.docs.get(did);
  const out = [];
  for (const [o, list] of Object.entries(S.links?.d || {})) {
    if (o === did) continue;
    const od = S.docs.get(o); if (!od) continue;
    if (base && ((base.kind === "chain" && od.kind === "dorot" && od.parent === base.id) || (base.kind === "dorot" && od.id === base.parent))) continue;
    const sh = list.filter(x => mine.has(x)); if (sh.length) out.push([o, sh]);
  }
  return out.sort((a, b) => b[1].length - a[1].length);
}
/** פריטים שכנים: חולקים יחידה/שרשרת עם הפריט */
function neighborsOf(n) {
  const keys = new Set([...(n.un || []), ...(n.ch || [])]);
  if (!keys.size) return [];
  return S.core.nodes.filter(o => o.id !== n.id && (o.un.some(k => keys.has(k)) || o.ch.some(k => keys.has(k))));
}
const getNode = id => S.nodes.get(id);
const getDoc = id => S.docs.get(id);
const loadDoc = id => loadChunk("b:" + id);
const loadLinks = () => S.links ? Promise.resolve(S.links) : loadChunk("links").then(l => (S.links = l));
const loadSearch = () => loadChunk("search");

function nodeTitle(n, max = 90) { return trunc(cleanT(n.t) || cleanT(n.ti) || n.id, max); }
function nodeYearLabel(n) { return n.ys || n.yw || n.yp || ""; }
function docShort(d) {
  if (d.kind === "dorot") return "שרשרת הדורות · " + (S.docs.get(d.parent)?.title || "");
  return d.title;
}
/** הפסוק בקיצור (לעמודת הפסוקים ברשימה): ״ו, ט״; לשרשרת שעוגנה אינו בפרשה — הספר בקיצור והפסוק הראשון */
const BOOK_ABBR = { "שיר השירים": "שה״ש", "מלכים א": "מל״א", "מלכים ב": "מל״ב", "שמואל א": "שמו״א", "שמואל ב": "שמו״ב", "דברי הימים א": "דהי״א", "דברי הימים ב": "דהי״ב" };
function anchorShort(d) {
  if (d.cv) return verseLabel(d.cv);
  const m = String(d.anchor || "").match(/(בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל [אב]|מלכים [אב]|ישעיה|ירמיה|יחזקאל|הושע|יואל|עמוס|עובדיה|יונה|מיכה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|תהלים|משלי|איוב|שיר השירים|רות|איכה|קהלת|אסתר|דניאל|עזרא|נחמיה|דברי הימים [אב]) ([א-ת]{1,3}, [א-ת]{1,3}(?:[–-][א-ת]{1,3})?)/);
  return m ? (BOOK_ABBR[m[1]] || m[1]) + " " + m[2] : "";
}
function verseLabel(r) {
  if (!r) return "";
  const [c1, v1, c2, v2] = r;
  if (c1 === c2) return `${gem(c1).replace(/[׳״]/g, "")}, ${gem(v1).replace(/[׳״]/g, "")}${v2 !== v1 ? "–" + gem(v2).replace(/[׳״]/g, "") : ""}`;
  return `${gem(c1).replace(/[׳״]/g, "")}, ${gem(v1).replace(/[׳״]/g, "")}–${gem(c2).replace(/[׳״]/g, "")}, ${gem(v2).replace(/[׳״]/g, "")}`;
}
function docWhere(d) {
  if (d.kind === "verse") return d.range ? "בראשית " + verseLabel(d.range) : "יחידה כללית";
  if (d.kind === "chain") return d.anchor;
  return "שרשרת הדורות";
}
/** כל המסמכים (47 ביאורים) שבהם הפריט משויך — [docId, parts[]] */
function docsOfNode(id) { return (S.links?.n[id]) || []; }
function stateClass(st) { return st === "PASS" ? "ok" : st === "PASS בתנאי" ? "warn" : "warn"; }


/* Personal reading environment. The dialog is rendered only when requested. */
function openReadingPreferences() {
  const P = window.chavrutaPreferences;
  if (!P) return;
  document.getElementById("reading-preferences")?.close();
  const dialog = h("dialog", { id: "reading-preferences", class: "reading-preferences no-print", "aria-labelledby": "chv-preferences-title" });
  const markup = "    <section class=\"reading-preferences-content\" id=\"reading-preferences-content\" aria-labelledby=\"chv-preferences-title\">\n      <div class=\"chv-preferences-heading\"><div><h2 id=\"chv-preferences-title\">סביבת הלימוד שלי</h2><p class=\"chv-pref-status\" role=\"status\" aria-live=\"polite\">כל שינוי מופיע מיד בקריאה.</p><p class=\"chv-pref-error\" role=\"alert\" hidden></p></div><button type=\"button\" data-action=\"type\" >סיום התאמה</button></div>\n      <div class=\"chv-pref-columns\">\n        <details open><summary>אותיות וריווח</summary><div class=\"chv-pref-fields\">\n          <label>גופן הקריאה<select data-pref=\"family\"><option value=\"frank\">פרנק ריהל ליברה</option><option value=\"assistant\">אסיסטנט</option><option value=\"arial\">Arial — מהמכשיר</option><option value=\"david\">David — אם מותקן</option><option value=\"narkisim\">Narkisim — אם מותקן</option><option value=\"times\">Times New Roman — אם מותקן</option></select></label>\n          <label for=\"chv-pref-font\">גודל האות <output aria-hidden=\"true\" data-value=\"font\">21</output><input type=\"range\" min=\"16\" max=\"36\" step=\"1\" value=\"21\" data-setting=\"font\" data-pref=\"font\" id=\"chv-pref-font\"></label>\n          <label>משקל האות<select data-pref=\"weight\"><option value=\"400\">רגיל</option><option value=\"500\">מודגש מעט</option></select></label>\n          <label for=\"chv-pref-leading\">מרווח בין שורות <output aria-hidden=\"true\" data-value=\"leading\">1.9</output><input type=\"range\" min=\"1.35\" max=\"2.5\" step=\"0.05\" value=\"1.9\" data-pref=\"leading\" id=\"chv-pref-leading\"></label>\n          <label for=\"chv-pref-paragraph\">מרווח בין פסקאות <output aria-hidden=\"true\" data-value=\"paragraph\">1</output><input type=\"range\" min=\"0.4\" max=\"2.5\" step=\"0.1\" value=\"1\" data-pref=\"paragraph\" id=\"chv-pref-paragraph\"></label>\n          <label for=\"chv-pref-word\">מרווח בין מילים <output aria-hidden=\"true\" data-value=\"word\">0</output><input type=\"range\" min=\"0\" max=\"0.5\" step=\"0.025\" value=\"0\" data-pref=\"word\" id=\"chv-pref-word\"></label>\n          <label for=\"chv-pref-letter\">מרווח בין אותיות <output aria-hidden=\"true\" data-value=\"letter\">0</output><input type=\"range\" min=\"0\" max=\"0.12\" step=\"0.01\" value=\"0\" data-pref=\"letter\" id=\"chv-pref-letter\"></label>\n          <label>יישור הטקסט<select data-pref=\"alignment\"><option value=\"justify\">לשני הצדדים</option><option value=\"right\">לימין</option></select></label>\n        </div></details>\n        <details><summary>צבעים ותאורה</summary><div class=\"chv-pref-fields\">\n          <label>תאורה<select data-pref=\"theme\"><option value=\"system\">לפי המכשיר</option><option value=\"light\">בהירה</option><option value=\"dark\">כהה</option></select></label>\n          <div class=\"chv-pref-wide\"><span>ערכת צבעים</span><div class=\"chv-palette-choices\" role=\"group\" aria-label=\"ערכת צבעים\"><button type=\"button\" data-palette=\"sefer\" aria-pressed=\"true\" >ספר</button><button type=\"button\" data-palette=\"techelet\" aria-pressed=\"false\" >תכלת</button><button type=\"button\" data-palette=\"zayit\" aria-pressed=\"false\" >זית</button><button type=\"button\" data-palette=\"dyo\" aria-pressed=\"false\" >ניגודיות</button></div></div>\n          <p class=\"chv-pref-caption chv-pref-wide\">הצבעים האישיים נשמרים בנפרד לתאורה בהירה וכהה. בחירת ערכה מחליפה את הצבעים האישיים.</p>\n          <label class=\"chv-color-field\">רקע הקריאה<input type=\"color\" data-color=\"paper\" value=\"#faf7f0\"></label>\n          <label class=\"chv-color-field\">צבע האותיות<input type=\"color\" data-color=\"ink\" value=\"#26211b\"></label>\n          <label class=\"chv-color-field\">קישורים והדגשות<input type=\"color\" data-color=\"accent\" value=\"#76283a\"></label>\n          <label class=\"chv-color-field\">רקע המקור<input type=\"color\" data-color=\"surface\" value=\"#fffdf9\"></label>\n          <label class=\"chv-color-field\">רקע הציטוט הנבחר<input type=\"color\" data-color=\"soft\" value=\"#f1e3e1\"></label>\n          <div class=\"chv-contrast chv-pref-wide\"><span class=\"chv-contrast-text\" aria-live=\"polite\"></span><button type=\"button\" data-personal=\"repair-contrast\"  hidden>שיפור ניגודיות</button></div>\n        </div></details>\n        <details><summary>פריסה ומקורות</summary><div class=\"chv-pref-fields\">\n          <label for=\"chv-pref-width\">רוחב שורת הקריאה <output aria-hidden=\"true\" data-value=\"width\">66 תווים בקירוב</output><input type=\"range\" min=\"40\" max=\"100\" step=\"2\" value=\"66\" data-pref=\"width\" id=\"chv-pref-width\"></label>\n          <label for=\"chv-pref-margin\">שוליים <output aria-hidden=\"true\" data-value=\"margin\">30</output><input type=\"range\" min=\"12\" max=\"64\" step=\"2\" value=\"30\" data-pref=\"margin\" id=\"chv-pref-margin\"></label>\n          <label>פתיחת מקור<select data-pref=\"sourcePlace\"><option value=\"auto\">לצד הטקסט, ובנייד מתחת לציטוט</option><option value=\"inline\">תמיד מתחת לציטוט</option></select></label>\n          <label class=\"chv-check\"><input type=\"checkbox\" data-pref=\"toc\" checked> תוכן עניינים</label>\n          <label class=\"chv-check\"><input type=\"checkbox\" data-pref=\"focus\"> מיקוד בקריאה</label>\n          <label class=\"chv-check\"><input type=\"checkbox\" data-pref=\"quoteTint\" checked> רקע לאזורי ציטוט</label>\n          <label class=\"chv-check chv-pref-wide\"><input type=\"checkbox\" data-pref=\"sourceLinked\" checked> אותם גופן, גודל וריווח גם במקור</label>\n          <div class=\"chv-source-prefs chv-pref-wide\" hidden><label>גופן המקור<select data-pref=\"sourceFamily\"><option value=\"frank\">פרנק ריהל ליברה</option><option value=\"assistant\">אסיסטנט</option><option value=\"arial\">Arial — מהמכשיר</option><option value=\"david\">David — אם מותקן</option><option value=\"narkisim\">Narkisim — אם מותקן</option><option value=\"times\">Times New Roman — אם מותקן</option></select></label><label for=\"chv-pref-sourceFont\">גודל המקור <output aria-hidden=\"true\" data-value=\"sourceFont\">20</output><input type=\"range\" min=\"16\" max=\"36\" step=\"1\" value=\"20\" data-pref=\"sourceFont\" id=\"chv-pref-sourceFont\"></label><label for=\"chv-pref-sourceLeading\">מרווח שורות במקור <output aria-hidden=\"true\" data-value=\"sourceLeading\">1.85</output><input type=\"range\" min=\"1.35\" max=\"2.5\" step=\"0.05\" value=\"1.85\" data-pref=\"sourceLeading\" id=\"chv-pref-sourceLeading\"></label></div>\n        </div></details>\n        <details><summary>הסביבות השמורות שלי</summary><div class=\"chv-pref-fields\">\n          <label class=\"chv-pref-wide\">שם לסביבה<input type=\"text\" class=\"chv-profile-name\" maxlength=\"40\" placeholder=\"למשל: לימוד ערב\"></label>\n          <button type=\"button\" data-personal=\"save-profile\" >שמירת סביבה חדשה</button>\n          <label class=\"chv-pref-wide\">סביבה שמורה<select class=\"chv-profile-select\"><option value=\"\">בחירת סביבה</option></select></label>\n          <div class=\"chv-pref-actions chv-pref-wide\"><button type=\"button\" data-personal=\"update-profile\"  disabled>עדכון הסביבה שנבחרה</button><button type=\"button\" data-personal=\"delete-profile\"  disabled>מחיקה</button></div>\n          <div class=\"chv-pref-actions chv-pref-wide\"><button type=\"button\" data-personal=\"export\" >ייצוא העדפות</button><label class=\"chv-import\">ייבוא העדפות<input type=\"file\" accept=\"application/json,.json\" class=\"chv-import-file\"></label></div>\n          <p class=\"chv-pref-caption chv-pref-wide\">השמירה היא בדפדפן הזה. להעברה למכשיר אחר אפשר לייצא ולייבא את ההעדפות.</p>\n        </div></details>\n      </div>\n      <div class=\"chv-preferences-footer\"><button type=\"button\" data-personal=\"reset\" >חזרה לעיצוב המקורי</button><button type=\"button\" data-personal=\"undo-reset\"  hidden>ביטול האיפוס</button><span>נוסח הלימוד נשאר כפי שהוא.</span></div>\n    </section>\n";
  dialog.append(h("div", { html: markup }));
  const shortcuts = h("nav", { class: "reading-shortcuts", "aria-label": "מצב לימוד וקישורי האתר" }, h("div", { class: "modesw sm", role: "radiogroup", "aria-label": "מצב עבודה" }, ...MODES.map(m => { const button = modeBtn(m); button.addEventListener("click", () => dialog.close()); return button; })));
  for (const [label, target] of [["סטטוס הביאורים", "status"], ["כיסוי המפה", "coverage"], ["מפתח עניינים", "topics"], ["אודות ושיטת העבודה", "about"]]) shortcuts.append(h("a", { href: mkHash([target]), onclick: () => dialog.close() }, label));
  shortcuts.append(h("button", { type: "button", onclick: () => { dialog.close(); requestAnimationFrame(showHelp); } }, "קיצורי מקלדת"));
  dialog.append(shortcuts);
  document.body.append(dialog);
  let state = P.get(), selected = "", undo = null;
  const query = selector => dialog.querySelector(selector);
  const all = selector => Array.from(dialog.querySelectorAll(selector));
  const message = (text, error = false) => { const el = query(error ? ".chv-pref-error" : ".chv-pref-status"); el.textContent = text; if (error) el.hidden = false; else query(".chv-pref-error").hidden = true; };
  const savedMessage = text => message(P.storageAvailable() ? text : "השינויים פעילים כעת, אך לא נשמרו בדפדפן. לשמירה אפשר לייצא את ההעדפות.");
  function change(action) {
    const anchor = captureAnchor(); action();
    requestAnimationFrame(() => restoreAnchor(anchor));
    savedMessage("ההעדפות נשמרות אוטומטית בדפדפן הזה.");
  }
  for (const key of ["family", "sourceFamily"]) {
    const select = query('[data-pref="' + key + '"]'); select.replaceChildren();
    for (const [id, font] of Object.entries(P.model.fonts)) select.append(h("option", { value: id }, font.label));
  }
  function render() {
    state = P.get();
    all("[data-pref]").forEach(input => { if (input.type === "checkbox") input.checked = state[input.dataset.pref]; else input.value = String(state[input.dataset.pref]); });
    all("[data-value]").forEach(out => { const key = out.dataset.value; out.textContent = key === "width" ? state.width + " תווים בקירוב" : ["font", "sourceFont", "margin"].includes(key) ? state[key] + " px" : key === "paragraph" ? Number(state[key].toFixed(2)) + " × גודל אות" : Number(state[key].toFixed(3)); });
    all("[data-palette]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.palette === state.palette)));
    const colors = P.colors(); all("[data-color]").forEach(input => input.value = colors[input.dataset.color]);
    const low = P.score(colors) < 4.5;
    query(".chv-contrast-text").textContent = low ? "הניגודיות נמוכה; ייתכן שהטקסט יהיה קשה לקריאה." : "ניגודיות הטקסט והקישורים טובה.";
    query('[data-personal="repair-contrast"]').hidden = !low;
    query(".chv-source-prefs").hidden = state.sourceLinked;
    const select = query(".chv-profile-select"); select.replaceChildren(h("option", { value: "" }, "בחירת סביבה"));
    for (const profile of P.profiles()) select.append(h("option", { value: profile.id }, profile.name));
    if (!P.profiles().some(x => x.id === selected)) selected = "";
    select.value = selected;
    for (const action of ["update-profile", "delete-profile"]) query('[data-personal="' + action + '"]').disabled = !selected;
  }
  all("[data-pref]").forEach(input => input.addEventListener(input.type === "range" ? "input" : "change", () => {
    const value = input.type === "checkbox" ? input.checked : input.type === "range" ? Number(input.value) : input.value;
    change(() => P.update({ [input.dataset.pref]: value }));
  }));
  all("[data-color]").forEach(input => input.addEventListener("input", () => { const custom = P.get().custom; custom[P.tone()][input.dataset.color] = input.value; change(() => P.update({ custom })); }));
  all("[data-palette]").forEach(button => button.addEventListener("click", () => change(() => P.update({ palette: button.dataset.palette, custom: { light: {}, dark: {} } }))));
  all('[data-action="type"]').forEach(button => button.addEventListener("click", () => dialog.close()));
  query(".chv-profile-select").addEventListener("change", e => { selected = e.target.value; const profile = P.profiles().find(x => x.id === selected); if (profile) { query(".chv-profile-name").value = profile.name; change(() => P.update(profile.prefs)); } else render(); });
  all("[data-personal]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.personal;
    if (action === "reset") { undo = P.get(); change(() => P.reset()); query('[data-personal="undo-reset"]').hidden = false; }
    if (action === "undo-reset" && undo) { change(() => P.update(undo)); undo = null; button.hidden = true; }
    if (action === "repair-contrast") change(() => P.repair());
    if (action === "save-profile" || action === "update-profile") {
      try { selected = P.saveProfile(query(".chv-profile-name").value, action === "update-profile" ? selected : null); render(); savedMessage("סביבת הלימוד נשמרה."); }
      catch (e) { message(e.message === "profile-limit" ? "אפשר לשמור עד שמונה סביבות. ניתן לעדכן סביבה קיימת." : "יש לתת שם לסביבת הלימוד.", true); }
    }
    if (action === "delete-profile") { P.removeProfile(selected); selected = ""; render(); savedMessage("הסביבה השמורה נמחקה."); }
    if (action === "export") {
      const url = URL.createObjectURL(new Blob([JSON.stringify(P.exportData(), null, 2)], { type: "application/json" }));
      const link = h("a", { href: url, download: "chavruta-reading-preferences.json" }); dialog.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }));
  query(".chv-import-file").addEventListener("change", async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try { if (file.size > 32768) throw Error("size"); const data = JSON.parse(await file.text()); selected = ""; change(() => P.importData(data)); savedMessage("ההעדפות יובאו והוחלו על סביבת הלימוד."); }
    catch (_) { message("לא ניתן לייבא את הקובץ. בחר קובץ העדפות שיוצא מחברותא.", true); }
    finally { e.target.value = ""; }
  });
  const unsubscribe = P.subscribe(render);
  dialog.addEventListener("keydown", e => {
    if (e.key !== "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
    const controls = Array.from(dialog.querySelectorAll("button,a[href],input,select,summary")).filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      e.preventDefault(); first.focus();
    }
  });
  dialog.addEventListener("close", () => { unsubscribe(); document.getElementById("disp-btn")?.setAttribute("aria-expanded", "false"); dialog.remove(); document.getElementById("disp-btn")?.focus({ preventScroll: true }); }, { once: true });
  dialog.addEventListener("click", e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  render(); dialog.showModal(); document.getElementById("disp-btn")?.setAttribute("aria-expanded", "true");
}

/* חברותא · מעטפת: סרגל עליון, מתג מצבי עבודה, העדפות תצוגה, ניתוב, קיצורי מקלדת, גיליון תחתון */
const VIEWS = {};
let routeSeq = 0;
const R = { cur: { seg: [], q: new URLSearchParams() }, view: null, ctx: null };
const MODE_KEY = "chavruta-mode";
const MODES = [
  { id: "read", n: 1, label: "קריאה", icon: "i-read", hint: "קריאה רציפה בעמודה אחת, הערות בשוליים" },
  { id: "links", n: 2, label: "קשרים", icon: "i-links", hint: "לוח קשרים לכל קטע, ציטוט או פריט שנבחר" },
  { id: "research", n: 3, label: "חקר", icon: "i-research", hint: "שלשלת דורות, מטריצת פסוק × דורות ומפה" },
];
const SelListeners = new Set();
function selectNode(id, opts = {}) { S.selNode = id || null; for (const f of SelListeners) f(id, opts); }

/* ---------- טולטיפ קל (ריחוף מעל פריט) ---------- */
let tipEl;
function showTip(html, x, y) {
  if (!tipEl) { tipEl = h("div", { class: "tip", role: "tooltip" }); document.body.append(tipEl); }
  tipEl.innerHTML = html; tipEl.hidden = false;
  const r = tipEl.getBoundingClientRect();
  let left = x + 12, top = y + 16;
  if (left + r.width > innerWidth - 8) left = x - r.width - 12;
  if (left < 8) left = 8;
  if (top + r.height > innerHeight - 8) top = y - r.height - 12;
  tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
}
function hideTip() { if (tipEl) tipEl.hidden = true; }

/* ---------- תפריטים צפים ---------- */
let menuEl = null, menuBtn = null;
function closeMenu() { menuEl?.remove(); menuEl = null; menuBtn?.setAttribute("aria-expanded", "false"); menuBtn = null; }
function openMenu(btn, content, cls) {
  if (menuBtn === btn) { closeMenu(); return; }
  closeMenu();
  menuEl = h("div", { class: "menu " + (cls || ""), role: "menu" }, content); menuBtn = btn; btn.setAttribute("aria-expanded", "true");
  document.body.append(menuEl);
  const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth;
  const left = clamp(r.left + (r.width - w) / 2, 8, innerWidth - w - 8);
  menuEl.style.left = left + "px";
  const below = r.bottom + 6, h2 = menuEl.offsetHeight;
  menuEl.style.top = (below + h2 > innerHeight - 70 && r.top > h2 + 12 ? r.top - h2 - 6 : below) + "px";
  menuEl.querySelector("button,a")?.focus({ preventScroll: true });
}
document.addEventListener("mousedown", e => { if (menuEl && !menuEl.contains(e.target) && !menuBtn?.contains(e.target)) closeMenu(); });

/* ---------- העדפות תצוגה ---------- */
const FS = [18, 20, 22];
function applyPrefs() { window.chavrutaPreferences.apply(); }
function setFont(id) { window.chavrutaPreferences.update({ family: id }); }
function setJustify(on) { window.chavrutaPreferences.update({ alignment: on ? "justify" : "right" }); }
function setFs(i) { window.chavrutaPreferences.update({ font: FS[clamp(i, 0, 2)] }); }
function displayMenu() { openReadingPreferences(); }
function pdfMenu() {
  const box = h("div", { class: "menu-body" });
  const add = (label, sub, fn) => box.append(h("button", { class: "menu-item", onclick: () => { closeMenu(); fn(); } }, h("b", null, label), sub ? h("small", null, sub) : null));
  if (R.view === "biur" && RD.meta) {
    const d = RD.meta;
    add("הפרק הנוכחי", RD.cur ? partTitle(RD.data, RD.cur) : "", () => window.chavrutaExport.printDoc(d, RD.cur || d.parts[0].id));
    add("הביאור כולו", trunc(d.title, 46), () => window.chavrutaExport.printDoc(d, "all"));
  }
  if (isHome()) {          // הספר המלא — לפרשת הבית בלבד
    add("הפרשה כולה כספר", "שער, תוכן עניינים וכל 47 הביאורים", () => window.chavrutaExport.printBook({ dorot: true }));
    add("הספר בלי שרשראות הדורות", "47 הביאורים בלבד", () => window.chavrutaExport.printBook({ dorot: false }));
  }
  if (R.view === "search") add("תוצאות החיפוש", "", () => $("#export-results")?.click());
  return box;
}

/* ---------- סרגל עליון, מצבים ---------- */
const NAVITEMS = [
  { id: "home", icon: "i-read", label: "פרשיות", href: () => mkHash(["home"]) },
  { id: "sources", icon: "i-list", label: "מקורות", href: () => mkHash(["sources"]) },
  { id: "tree", icon: "i-tree", label: "עץ הידע", href: () => mkHash(["tree"]) },
  { id: "daily", icon: "i-sun", label: "לימוד יומי", href: () => mkHash(["daily"]) },
  { id: "new", icon: "i-flag", label: "מה חדש", href: () => mkHash(["new"]) },
  { id: "search", icon: "i-search", label: "חיפוש", act: () => openPalette(), kbd: "/" },
];
function viewToNav(v) { return { home: "home", biurim: "home", biur: "home", parsha: "home", sources: "sources", item: "sources", search: "search", new: "new", daily: "daily", tree: R.cur.seg[1] === "p" ? "home" : "tree", status: "", coverage: "", closure: "" }[v] ?? ""; }
function modeBtn(m) {
  return h("button", { class: "mode-btn", role: "radio", "aria-checked": m.id === MODE, "data-mode": m.id, title: `${m.hint} (${m.n})`, onclick: () => setMode(m.id) }, icon(m.icon), h("span", { class: "lbl" }, m.label));
}
/** הפרשה של התצוגה הנוכחית: עמוד פרשה → הפרשה; ביאור → הפרשה שלו; פריט → הפרשה שלו; רשימת הביאורים → פרשת הבית;
   המקורות והסטטוס → הפרשה שנבחרה (?p=…) או הנוכחית; עץ הידע, לימוד יומי וכו׳ → אין */
function curParsha() {
  const { seg: p, q } = parseHash(), home = S.core?.parsha || "בראשית";
  if (p[0] === "parsha" && p[1]) return p[1];
  if (p[0] === "tree" && p[1] === "p" && p[2]) return p[2];
  if (p[0] === "biur") return getDoc(p[1])?.p || home;
  if (p[0] === "item") return getNode(p.slice(1).join("/"))?.p || home;
  if (p[0] === "biurim") return home;
  if (["sources", "status", "coverage", "closure"].includes(p[0])) return (hasDocs(q.get("p")) && q.get("p")) || S.par || home;
  return null;
}
/* בורר הפרשה (<details id="psw">, נבנה ב־tools/site/chrome.py): מסמן את הפרשה הנוכחית ונסגר בבחירה, בלחיצה בחוץ וב־Esc */
function buildParshaSel() {
  const d = $("#psw"); if (!d || d.dataset.ready) return; d.dataset.ready = "1";
  const sync = () => {
    const cur = curParsha();
    $$("a[data-parsha]", d).forEach(a => { if (a.dataset.parsha === cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const l = $(".psw-l", d); if (l) l.replaceChildren(...(cur ? [h("span", { class: "psw-p" }, "פרשת "), cur] : ["הפרשיות"]));
    d.querySelector("summary")?.setAttribute("aria-label", "בחירת פרשה (כעת: " + (cur ? "פרשת " + cur : "הפרשיות") + ")");
    d.open = false;
  };
  window.addEventListener("hashchange", sync); sync();
  d.addEventListener("click", e => { if (e.target.closest("a")) d.open = false; });
  document.addEventListener("click", e => { if (d.open && !d.contains(e.target)) d.open = false; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && d.open) { d.open = false; d.querySelector("summary")?.focus(); } });
}
function buildChrome() {
  const nav = $("#mainnav"); nav.textContent = "";
  for (const it of NAVITEMS) nav.append(h(it.act ? "button" : "a", { class: "nav-i", "data-nav": it.id, href: it.act ? null : it.href(), onclick: it.act ? it.act : null, title: it.kbd ? "קיצור: " + it.kbd : it.label, "aria-label": it.label }, icon(it.icon), h("span", { class: "lbl", "aria-hidden": "true" }, it.label)));
  const bn = $("#bn"); if (bn) { bn.textContent = ""; for (const it of NAVITEMS) bn.append(h(it.act ? "button" : "a", { class: "bn-i", "data-nav": it.id, href: it.act ? null : it.href(), onclick: it.act ? it.act : null }, icon(it.icon), h("span", null, it.label))); }
  const ms = $("#modesw"); ms.textContent = ""; for (const m of MODES) ms.append(modeBtn(m));
  $("#disp-btn").addEventListener("click", () => { closeMenu(); openReadingPreferences(); });
  $("#pdf-btn").addEventListener("click", e => openMenu(e.currentTarget, pdfMenu(), "menu-pdf"));
  $("#toc-btn")?.addEventListener("click", () => openToc());
  $("#reading-exit-focus")?.addEventListener("click", () => window.chavrutaPreferences.update({ focus: false }));
  applyPrefs();
}
function updateChrome() {
  const cur = viewToNav(R.view);
  $$(".nav-i, .bn-i").forEach(a => { if (a.dataset.nav === cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  updateModeUI();
  document.body.dataset.view = R.view || "";
  document.body.classList.toggle("has-modes", R.view === "biur" || R.view === "biurim" || (R.view === "parsha" && hasDocs(R.cur.seg[1])));
}
function updateModeUI() {
  document.body.dataset.mode = MODE;
  $$(".mode-btn").forEach(b => b.setAttribute("aria-checked", b.dataset.mode === MODE));
  document.body.dataset.sheet = isSheet() ? "1" : "0";
}
function isSheet() { return MODE === "read" ? innerWidth < 1000 : innerWidth < 900; }

/* ---------- מעבר מצב ללא איבוד מקום הקריאה ---------- */
function captureAnchor() {
  const art = $("article.biur");
  const topH = ($("#top")?.classList.contains("hidden") ? 0 : $("#top")?.offsetHeight || 0) + 4;
  if (art && R.view === "biur") {
    for (const el of art.querySelectorAll("p[id],li[id],h2[id],h3[id],h4[id],blockquote[id],tr[id],section.part[id]")) {
      const r = el.getBoundingClientRect();
      if (r.bottom > topH + 8) return { id: el.id, top: r.top, ratio: null };
    }
  }
  const mx = document.documentElement.scrollHeight - innerHeight;
  return { id: null, top: 0, ratio: mx > 0 ? scrollY / mx : 0 };
}
function restoreAnchor(a) {
  if (!a) return;
  if (a.id) { const el = document.getElementById(a.id); if (el) { window.scrollBy(0, el.getBoundingClientRect().top - a.top); return; } }
  if (a.ratio != null) { const mx = document.documentElement.scrollHeight - innerHeight; window.scrollTo(0, mx * a.ratio); }
}
const MODE_REROUTE = new Set(["biurim", "parsha"]);
function setMode(m, o = {}) {
  if (!MODES.some(x => x.id === m)) return;
  if (m === MODE && !o.force) return;
  const anc = captureAnchor();
  MODE = m; lsSet(MODE_KEY, m); updateModeUI();
  if (!o.noHash) quietHash(mkHash(R.cur.seg, Object.fromEntries([...R.cur.q].filter(([k]) => k !== "mode"))));
  const v = VIEWS[R.view];
  closeMenu();
  if (v && v.onMode) { try { v.onMode(m, anc); } catch (e) { console.error(e); } }
  else if (MODE_REROUTE.has(R.view)) { route({ keep: true }); return; }
  requestAnimationFrame(() => { restoreAnchor(anc); requestAnimationFrame(() => restoreAnchor(anc)); });
  toast("מצב " + MODES.find(x => x.id === m).label, true);
}

/* ---------- ניתוב ---------- */
async function route(opts = {}) {
  const seq = ++routeSeq;
  if (!S.core) return;
  const p = parseHash();
  let [view, ...rest] = p.seg;
  if (!view) { go(mkHash(["home"], {}, { nomode: true }), true); return; }
  const qm = p.q.get("mode");
  let modeChanged = false;
  if (qm && qm !== MODE && MODES.some(x => x.id === qm)) { MODE = qm; lsSet(MODE_KEY, qm); modeChanged = true; updateModeUI(); }
  const cp = curParsha(); if (cp && hasDocs(cp)) setPar(cp);          // הפרשה הנוכחית — לפני התצוגה (רשימות, חקר, מקורות)
  if (["status", "coverage", "closure"].includes(view)) { go(mkHash(parRoot(), { tab: "status", sub: view, mode: "research" }), true); return; }
  if (view === "map") { go(mkHash(parRoot(), { tab: "map", sel: p.q.get("sel") || "" }), true); return; }
  const handler = VIEWS[view];
  const main = $("#view");
  closeMenu(); hideTip(); closePalette?.(); Notes.hide?.();
  document.body.classList.remove("toc-open");
  if (!handler) { main.replaceChildren(h("div", { class: "empty" }, h("b", null, "העמוד לא נמצא"), "הכתובת אינה מוכרת. ", h("a", { href: mkHash(["home"]) }, "לדף הבית"))); R.view = ""; updateChrome(); return; }
  const sameView = R.view === view && R.cur.seg[1] === rest[0];
  R.cur = { seg: p.seg, q: p.q }; R.view = view;
  const prev = R.ctx || {};
  const ctx = { seq, same: sameView, modeChanged, keep: !!opts.keep, alive: () => seq === routeSeq, prevCleanup: prev.cleanup };
  if (sameView) ctx.cleanup = prev.cleanup; else { try { prev.cleanup?.(); } catch (e) { console.warn(e); } }
  R.ctx = ctx;
  document.body.classList.remove("hide-aside");
  updateChrome();
  await handler(rest, p.q, ctx);
  if (seq === routeSeq) {
    if (!p.q.get("mode")) quietHash(mkHash(p.seg, Object.fromEntries(p.q)));
    updateChrome();
  }
}

/* ---------- הודעה קצרה ---------- */
let toastT;
function toast(msg, quiet) {
  $(".toast")?.remove();
  const t = h("div", { class: "toast" + (quiet ? " quiet" : ""), role: "status" }, msg); document.body.append(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), quiet ? 1300 : 2400);
}

/* ---------- גיליון תחתון (נייד) / חלון עזרה ---------- */
function openToc() {
  if (!RD.meta) return;
  const d = RD.meta, doc = RD.data;
  const list = h("ol", { class: "toc-list" });
  for (const p of doc.parts) list.append(h("li", null, h("a", { href: mkHash(["biur", d.id, p.id]), onclick: e => { e.preventDefault(); gotoPart(d, p.id, true); document.body.classList.remove("toc-open"); $(".toc-sheet")?.remove(); } }, readingPartTitle(p.title))));
  $(".toc-sheet")?.remove();
  const sh = h("div", { class: "toc-sheet", role: "dialog", "aria-label": "תוכן עניינים" }, h("div", { class: "sheet-h" }, h("b", null, "תוכן הביאור"), h("button", { class: "icon-btn", "aria-label": "סגירה", onclick: () => sh.remove() }, icon("i-x"))), list);
  document.body.append(sh);
  sh.querySelector("a")?.focus();
}
function showHelp() {
  $(".help")?.remove();
  const rows = [["1 · 2 · 3", "קריאה · קשרים · חקר"], ["/", "חיפוש מהיר"], ["j · k", "פסקה הבאה · הקודמת"], ["[ · ]", "פרק קודם · הבא"], ["Esc", "סגירת חלון, הערה או חיפוש"], ["g", "חזרה לרשימת הביאורים"]];
  const el = h("div", { class: "help", role: "dialog", "aria-label": "קיצורי מקלדת", onclick: e => { if (e.target === el) el.remove(); } }, h("div", { class: "help-in" }, h("div", { class: "sheet-h" }, h("b", null, "קיצורי מקלדת"), h("button", { class: "icon-btn", "aria-label": "סגירה", onclick: () => el.remove() }, icon("i-x"))), h("dl", null, ...rows.flatMap(([k, v]) => [h("dt", null, h("kbd", null, k)), h("dd", null, v)]))));
  document.body.append(el); el.querySelector("button")?.focus();
}

/* ---------- סרגל שמתרחק בזמן קריאה ---------- */
(function () {
  let last = 0, ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, top = $("#top"); if (!top) return;
      const reading = R.view === "biur" && MODE !== "research";
      const hide = reading && y > 180 && y > last + 2 && !top.matches(":focus-within") && !menuEl;
      const show = y < last - 4 || y < 120 || !reading;
      if (hide) top.classList.add("hidden"); else if (show) top.classList.remove("hidden");
      document.body.classList.toggle("chrome-off", top.classList.contains("hidden"));
      last = y;
    });
  }, { passive: true });
  document.addEventListener("mousemove", e => { if (e.clientY < 36) $("#top")?.classList.remove("hidden"); }, { passive: true });
})();

/* ---------- מקלדת ---------- */
document.addEventListener("keydown", e => {
  if (document.querySelector("#reading-preferences[open]")) return;
  const tag = document.activeElement?.tagName, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag || "") || document.activeElement?.isContentEditable;
  if (e.key === "Escape") {
    if ($(".help")) { $(".help").remove(); return; }
    if ($(".pal")) { closePalette(); return; }
    if (menuEl) { const b = menuBtn; closeMenu(); b?.focus(); return; }
    if ($(".toc-sheet")) { $(".toc-sheet").remove(); return; }
    if (Notes.active) { Notes.hide(true); return; }
    if (R.view === "biur" && MODE !== "read" && !$("#aside").classList.contains("empty") && document.body.classList.contains("sheet-open")) { Aside.close(); return; }
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); openPalette(); return; }
  const m = MODES.find(x => String(x.n) === e.key); if (m) { e.preventDefault(); setMode(m.id); return; }
  if (e.key === "?") { showHelp(); return; }
  if (e.key === "g") { go(mkHash(parRoot())); return; }
  if (R.view === "biur") {
    if (e.key === "j" || e.key === "k") { e.preventDefault(); stepPara(e.key === "j" ? 1 : -1); }
    if (e.key === "]" || e.key === "[") { e.preventDefault(); stepPart(e.key === "]" ? 1 : -1); }
  }
});
window.addEventListener("resize", debounce(() => { updateModeUI(); window.dispatchEvent(new Event("relayout")); }, 150));


/* חברותא · סמל הפריט, כרטיס הפריט וקפיצה אל המקום המדויק בביאור */

/** סמן פריט: צורה לפי סוג (מאמר ○ · הנחה ▢ · שיחה ◇ · מכתב/הגהות △), מילוי לפי כיסוי; גוון = דור (בהדרגה של גוון אחד) */
function drawMark(parent, n, r, extraClass) {
  const g = sv("g", { class: "nd st-" + n.cat + (extraClass ? " " + extraClass : ""), "data-id": n.id }, parent);
  const col = gcol(n.g);
  sv("circle", { class: "halo", r: r + 4.5 }, g);
  const hollow = n.cat === "excluded" || n.cat === "notext";
  const common = { class: "mk", fill: hollow ? "var(--paper)" : col };
  let shape;
  if (n.ty === "מאמר") shape = sv("circle", { ...common, r }, g);
  else if (n.ty === "הנחה") shape = sv("rect", { ...common, x: -r, y: -r, width: 2 * r, height: 2 * r, rx: 2 }, g);
  else if (n.ty === "שיחה") shape = sv("rect", { ...common, x: -r * .92, y: -r * .92, width: r * 1.84, height: r * 1.84, rx: 1.5, transform: "rotate(45)" }, g);
  else shape = sv("path", { ...common, d: `M0,${-r * 1.1} L${r * 1.05},${r * .85} L${-r * 1.05},${r * .85} Z`, "stroke-linejoin": "round" }, g);
  if (hollow) { shape.setAttribute("stroke", col); shape.setAttribute("stroke-width", "2"); shape.style.stroke = col; }
  if (n.cat === "mentioned") { shape.setAttribute("fill-opacity", ".45"); shape.setAttribute("stroke-dasharray", "2.4 2"); }
  if (n.cat === "notext") sv("path", { d: `M${-r * .6},${-r * .6} L${r * .6},${r * .6} M${r * .6},${-r * .6} L${-r * .6},${r * .6}`, stroke: col, "stroke-width": 1.6, fill: "none", "pointer-events": "none" }, g);
  return g;
}
function glyphSvg(n, size = 20) {
  const s = sv("svg", { viewBox: "-14 -14 28 28", width: size, height: size, "aria-hidden": "true", class: "glyph" });
  const g = drawMark(s, n, 9); g.querySelector(".halo")?.remove();
  return s;
}
function rebbeChip(n) { return h("span", { class: "rb", style: { "--gc": gcol(n.g) } }, h("i", { class: "dot" }), n.rb || "מחבר לא זוהה"); }
function catChip(n) { const c = CAT[n.cat]; return h("span", { class: "tag " + c.cls, title: n.cs }, c.short); }
function srcName(n) { return n.src === "היברובוקס" ? "היברובוקס" : n.src === "אוצר החכמה" ? "אוצר החכמה (במנוי)" : n.src === "ספריית חב״ד" ? "ספריית חב״ד" : "המקור"; }
function partTitle(doc, pid) {
  const p = doc.parts.find(x => x.id === pid);
  return p ? trunc(p.title, 56) : pid;
}
const yearsLine = n => [n.ys ? "נאמר " + n.ys : "", n.yw ? "נכתב " + n.yw : "", n.yp ? "נדפס " + n.yp : ""].filter(Boolean).join(" · ");

/** היעד הטוב ביותר ל״פתח בביאור״ */
function bestTarget(nid, preferDoc) {
  const rows = docsOfNode(nid).map(r => [getDoc(r[0]), r[1]]).filter(r => r[0]);
  if (!rows.length) return null;
  const pri = d => d.kind === "verse" ? d.order : d.kind === "chain" ? 100 + d.seq : 200 + d.n;
  rows.sort((a, b) => ((b[1].length > 0) - (a[1].length > 0)) || (pri(a[0]) - pri(b[0])));
  const [doc, plist] = rows[0];
  if (plist.length) { const pk = plist[0][2][0]; return { doc: doc.id, part: plist[0][0], a: pk ? pk[0] : "", ex: pk ? pk[1] : "" }; }
  return { doc: doc.id, part: "sources", a: "" };
}
/** קפיצה לביאור (מזכירה את המקום שממנו יצאנו, כדי שאפשר יהיה לחזור) */
const NavBack = { stack: [] };
function jumpTo(docId, part, a, nid, opts = {}) {
  if (R.view === "biur" && RD.meta && !opts.noBack) NavBack.stack.push({ doc: RD.meta.id, title: RD.meta.title, anc: captureAnchor(), part: RD.cur, nid: S.selNode });
  go(mkHash(["biur", docId, part || ""].filter((x, i) => i < 2 || x), { a, n: nid }));
}
function openInBiur(nid, docId, part, a) {
  if (!docId) { const t = bestTarget(nid); if (!t) { toast("הפריט לא נותח בביאור"); return; } docId = t.doc; part = t.part; a = t.a; }
  jumpTo(docId, part, a, nid);
}
function backPill() {
  let el = $(".backpill");
  const top = NavBack.stack[NavBack.stack.length - 1];
  if (!top || R.view !== "biur" || (RD.meta && top.doc === RD.meta.id && false)) { el?.remove(); return; }
  if (!el) { el = h("button", { class: "backpill", onclick: () => { const t = NavBack.stack.pop(); go(mkHash(["biur", t.doc, t.part || ""].filter((x, i) => i < 2 || x), { a: t.anc?.id || "", n: t.nid || "" })); } }); document.body.append(el); }
  el.replaceChildren(icon("i-back"), h("span", null, "חזרה אל "), h("b", null, trunc(top.title, 38)));
}

/* ---------- כרטיס פריט ---------- */
function yrBox(label, v) { return h("div", { class: v ? "" : "na" }, h("small", null, label), h("b", null, v || "לא צוין")); }
function itemHead(n, o = {}) {
  const sub = [n.col || n.bk, n.pg ? "ע׳ " + n.pg : "", n.pgs ? (/^pdf/.test(n.pgs) ? n.pgs : "pdf " + n.pgs) : ""].filter(Boolean).join(" · ");
  return h("div", { class: "ihead" }, h("span", { class: "ig", style: { "--gc": gcol(n.g) } }, glyphSvg(n, 30)),
    h("div", null, h(o.h1 ? "h1" : "h3", { class: "ititle" }, trunc(cleanT(n.t), o.max || 150)),
      h("div", { class: "imeta" }, rebbeChip(n), n.gn ? h("span", null, n.gn) : null, yearsLine(n) ? h("span", null, yearsLine(n)) : null, catChip(n)),
      o.noSub ? null : (n.ti && cleanT(n.ti) !== cleanT(n.t) ? h("div", { class: "isub" }, trunc(cleanT(n.ti), 150)) : null),
      o.noSub || !sub ? null : h("div", { class: "isub" }, sub)));
}
function itemRow(n, o = {}) {
  const el = h(o.href ? "a" : "button", { class: "irow" + (o.cls ? " " + o.cls : ""), "data-id": n.id, href: o.href, onclick: o.onclick, title: nodeTitle(n, 140) },
    h("span", { class: "ig", style: { "--gc": gcol(n.g) } }, glyphSvg(n, 20)),
    h("span", { class: "it" }, h("b", null, nodeTitle(n, o.max || 70)), h("small", null, [n.rb, nodeYearLabel(n), n.gn].filter(Boolean).join(" · "))),
    o.tail ? h("span", { class: "tail" }, o.tail) : null);
  return el;
}

function appearances(nid, box) {
  loadLinks().then(() => {
    const rows = docsOfNode(nid).map(r => [getDoc(r[0]), r[1]]).filter(r => r[0]);
    box.textContent = "";
    if (!rows.length) { box.append(h("p", { class: "note" }, "הפריט אינו משויך לאף ביאור. ", CAT[getNode(nid).cat].label + ".  " + (getNode(nid).cn || ""))); return; }
    const pri = d => d.kind === "verse" ? d.order : d.kind === "chain" ? 100 + d.seq : 200 + d.n;
    rows.sort((a, b) => pri(a[0]) - pri(b[0]));
    const ul = h("ul", { class: "applist" });
    for (const [doc, plist] of rows) {
      const total = plist.reduce((s, p) => s + p[1], 0);
      const li = h("li", null, h("div", { class: "doc" }, h("a", { href: mkHash(["biur", doc.id], { n: nid }) }, doc.title), h("small", null, doc.kind === "verse" ? docWhere(doc) : "שרשרת", total ? " · " + total + " אזכורים" : " · משויך ליחידה")));
      if (plist.length) {
        const pts = h("ul", { class: "pts" });
        for (const [pid, cnt, picks] of plist) {
          const first = picks[0];
          const row = h("li", null, h("a", { href: mkHash(["biur", doc.id, pid], { a: first ? first[0] : "", n: nid }) }, partTitle(doc, pid) + (cnt > 1 ? " ×" + cnt : "")));
          const snip = picks.find(p => p[3]);
          if (snip) row.append(h("q", null, trunc(snip[3], 150)), snip[4] === "likely" ? h("small", { class: "hedge" }, " התאמה משוערת") : null);
          pts.append(row);
        }
        li.append(pts);
      }
      ul.append(li);
    }
    box.append(ul);
  });
}

function relatedList(nid, onpick) {
  const out = S.edgesOut.get(nid) || [], inc = S.edgesIn.get(nid) || [];
  if (!out.length && !inc.length) return null;
  const ul = h("ul", { class: "rel" });
  const add = (e, other, dir) => {
    const o = getNode(other); if (!o) return;
    ul.append(h("li", null, itemRow(o, { max: 60, tail: h("small", null, (dir === "out" ? "מפנה אל · " : "מופנה מ־ ") + EDGE_KIND[e[2]]), onclick: () => onpick(other) })));
  };
  out.slice(0, 14).forEach(e => add(e, e[1], "out")); inc.slice(0, 14).forEach(e => add(e, e[0], "in"));
  return ul;
}

/** כרטיס פריט מלא. mode: aside | page | print */
function itemCard(nid, opts = {}) {
  const n = getNode(nid), mode = opts.mode || "aside";
  if (!n) return h("div", { class: "empty" }, h("b", null, "פריט לא נמצא"), nid);
  const root = h("div", { class: "icard", "data-card": n.id });
  root.append(itemHead(n, { h1: mode === "page" }));
  root.append(h("div", { class: "yrs" }, yrBox("אמירה", n.ys), yrBox("כתיבה", n.yw), yrBox("פרסום ראשון", n.yp)));
  // אותו מאמר כורטס גם בשרשרת אחרת (twins.json): שני הפריטים נשמרים, וכאן — קישור אל התאום
  for (const t of (n.tw || [])) { const o = getNode(t); if (!o) continue;
    root.append(h("p", { class: "twin" }, "מופיע גם בשרשרת ", h("a", { href: mkHash(["item", t]) }, "״" + (o.chain || t) + "״"), h("small", null, " · אותו ד״ה, כרטיס נפרד"))); }
  if (n.ye) root.append(h("p", { class: "note" }, "שנת המהדורה שנסרקה: ", h("b", null, n.ye)));
  const notes = [["הערת האמירה", n.sn], ["הערת הפרסום", n.pn], ["בסיס לשנה", n.yb], ["מעמד", n.at], ["נרשם בידי", n.rec], ["מקור הנתונים", n.pv]].filter(x => x[1]);
  if (notes.length) root.append(h("details", null, h("summary", null, "הערות הכרטיס (" + notes.length + ")"), h("dl", { class: "notes" }, ...notes.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, trunc(v, 700))]))));
  const srcRow = h("div", { class: "acts" });
  if (n.u) srcRow.append(h("a", { class: "btn", href: n.u, target: "_blank", rel: "noopener noreferrer" }, "פתח במקור, " + srcName(n), icon("i-ext")));
  if (n.uh && n.uh !== n.u) srcRow.append(h("a", { class: "btn", href: n.uh, target: "_blank", rel: "noopener noreferrer" }, "גם בהיברובוקס", icon("i-ext")));
  if (n.ua && n.ua !== n.u) srcRow.append(h("a", { class: "btn", href: n.ua, target: "_blank", rel: "noopener noreferrer" }, "נוסח נוסף", icon("i-ext")));
  root.append(h("h4", { class: "sech" }, "מקור"), srcRow.children.length ? srcRow : h("p", { class: "note" }, "אין קישור מקור בכרטיס."));
  root.append(h("p", { class: "note" }, "מזהה ", ltr(n.id), n.xn ? ` · ${n.xn} קטעי מקור בידינו` : ""));
  root.append(h("h4", { class: "sech" }, "מופיע בביאורים"));
  const apBox = h("div", { class: "ap" }, h("p", { class: "note" }, "טוען…")); root.append(apBox); appearances(nid, apBox);
  const rel = relatedList(nid, id => (opts.onpick ? opts.onpick(id) : go(mkHash(["item", id]))));
  if (rel) root.append(h("h4", { class: "sech" }, "קשרים במפה"), rel);
  if (mode !== "print") {
    const act = h("div", { class: "acts no-print" });
    const openBtn = h("button", { class: "btn primary", onclick: () => openInBiur(nid) }, icon("i-book"), "פתח בביאור");
    act.append(openBtn);
    loadLinks().then(() => { if (!bestTarget(nid)) { openBtn.disabled = true; openBtn.title = "הפריט אינו משויך לביאור"; } });
    if (mode !== "page") act.append(h("a", { class: "btn", href: mkHash(["item", nid]) }, "עמוד הפריט"));
    act.append(h("button", { class: "btn", onclick: () => copyText(absUrl(mkHash(["item", nid]))) }, icon("i-link"), "העתק קישור"));
    act.append(h("button", { class: "btn", onclick: () => printCard(nid) }, icon("i-pdf"), "PDF"));
    root.append(act);
  }
  return root;
}

function nodeTipHtml(n) { return `<b>${esc(trunc(cleanT(n.t), 80))}</b><span>${esc(n.rb)}${nodeYearLabel(n) ? " · " + esc(nodeYearLabel(n)) : ""} · ${esc(n.gn)} · ${esc(CAT[n.cat].short)}</span>`; }
document.addEventListener("mouseover", e => {
  const el = e.target.closest?.("article.biur [data-n]"); if (!el) return;
  const n = getNode(el.getAttribute("data-n")); if (!n) return;
  let extra = ""; if (el.getAttribute("data-conf") === "likely") extra = "<br><span>התאמה משוערת של השורה לפריט</span>";
  showTip(nodeTipHtml(n) + extra, e.clientX, e.clientY);
});
document.addEventListener("mouseout", e => { if (e.target.closest?.("article.biur [data-n]")) hideTip(); });


/* חברותא · המפה המשנית: פריסת שנים לפי דורות (מנוע הציור) */
const MAPS = new Set();
const YMIN = 5492, YMAX = 5756;

/** פריסה: שורה לכל דור, ציר שנים מימין (עתיק) לשמאל (חדש), ואזור ״ללא שנה״ בקצה השמאלי. מחזיר {pos, rows, H} */
function layoutYears(nodes, W, o = {}) {
  const r = o.r || 6, pitch = r * 2 + (o.gap ?? 3);
  const LABW = o.labw ?? 124, UND = o.und ?? 190, TOP = o.top ?? 34;
  const xR = W - LABW - 14, xL = UND + 26;
  const xOf = y => xR - (y - YMIN) / (YMAX - YMIN) * (xR - xL);
  const gens = [...new Set(nodes.map(n => n.g))].sort((a, b) => a - b);
  const pos = new Map(), rows = [];
  let top = TOP;
  for (const g of gens) {
    const ns = nodes.filter(n => n.g === g);
    const dated = ns.filter(n => n.y).sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    const und = ns.filter(n => !n.y).sort((a, b) => (a.bk || "").localeCompare(b.bk || "", "he") || a.id.localeCompare(b.id));
    // ״נחיל״: מציבים כל נקודה בשנתה, ואם תפוס — קודם מוסיפים שורות (עד מקסימום), ורק אחר כך מזיזים הצידה
    const maxL = o.maxLanes ?? 8, placedPts = [], dpos = []; let usedL = 0;
    const free = (x, l) => { const yy = l * pitch; for (const q of placedPts) { const dx = q[0] - x, dy = q[1] - yy; if (dx * dx + dy * dy < pitch * pitch * .92) return false; } return true; };
    for (const n of dated) {
      const x0 = xOf(n.y); let done = false;
      for (let k = 0; k < 60 && !done; k++) {
        const offs = k === 0 ? [0] : [k * pitch * .5, -k * pitch * .5];
        for (const dx of offs) { const x = x0 + dx; if (x > xR + 4 || x < xL - UND * 0 - 6) continue;
          for (let l = 0; l < maxL; l++) if (free(x, l)) { placedPts.push([x, l * pitch]); dpos.push([n, x, l]); usedL = Math.max(usedL, l + 1); done = true; break; }
          if (done) break; }
      }
      if (!done) { const l = maxL; placedPts.push([x0, l * pitch]); dpos.push([n, x0, l]); usedL = Math.max(usedL, l + 1); }
    }
    const lanes = new Array(usedL);
    const cols = Math.max(1, Math.floor((UND - 14) / pitch));
    const urows = Math.ceil(und.length / cols);
    const nl = Math.max(usedL, urows, 1);
    const h = Math.max(o.minRow ?? 52, 26 + nl * pitch + 6);
    dpos.forEach(([n, x, l]) => pos.set(n.id, { x, y: top + 24 + l * pitch + r, g, und: false }));
    und.forEach((n, i) => pos.set(n.id, { x: UND - 8 - r - (i % cols) * pitch, y: top + 24 + Math.floor(i / cols) * pitch + r, g, und: true }));
    rows.push({ g, top, h, count: ns.length, undCount: und.length });
    top += h;
  }
  return { pos, rows, H: top + 8, xOf, xR, xL, UND, LABW, r, W };
}

function mapDraw(svg, L, nodes, o) {
  const { rows, pos } = L;
  svg.textContent = "";
  const gBg = sv("g", null, svg), gAx = sv("g", { class: "axis" }, svg), gEdges = sv("g", { class: "edges", "pointer-events": "none" }, svg), gNodes = sv("g", { class: "nodes" }, svg);
  rows.forEach((row, i) => {
    sv("rect", { x: 0, y: row.top, width: L.W, height: row.h, fill: i % 2 ? "transparent" : "var(--map-band)" }, gBg);
    const lab = sv("text", { x: L.W - 10, y: row.top + 22, "text-anchor": "start", class: "rowlab", direction: "rtl" }, gBg); lab.textContent = S.core.gens[row.g] || "מחבר לא זוהה";
    lab.setAttribute("text-anchor", "start");
    const sub = sv("text", { x: L.W - 10, y: row.top + 38, class: "rowsub", "text-anchor": "start" }, gBg); sub.textContent = row.count + " פריטים"; sub.setAttribute("data-row", row.g);
    if (!o.compact && row.undCount) { const u = sv("text", { x: L.UND - 2, y: row.top + 16, class: "rowsub", "text-anchor": "start" }, gBg); u.textContent = "ללא שנה · " + row.undCount; }
  });
  // ציר שנים
  const step = o.compact ? 50 : 25;
  for (let y = Math.ceil(YMIN / step) * step; y <= YMAX; y += step) {
    const x = L.xOf(y);
    sv("line", { x1: x, x2: x, y1: 18, y2: L.H, stroke: "var(--map-grid)", "stroke-width": 1 }, gAx);
    const t = sv("text", { x, y: 12, "text-anchor": "middle" }, gAx); t.textContent = hebYear(y);
  }
  if (!o.compact) { sv("line", { x1: L.UND + 10, x2: L.UND + 10, y1: 18, y2: L.H, stroke: "var(--rule)", "stroke-width": 1.5, "stroke-dasharray": "3 3" }, gAx); const t = sv("text", { x: L.UND - 2, y: 12, "text-anchor": "start" }, gAx); t.textContent = "ללא שנה מוכרת"; }
  const els = new Map();
  for (const n of nodes) {
    const p = pos.get(n.id); if (!p) continue;
    const g = drawMark(gNodes, n, L.r);
    g.setAttribute("transform", `translate(${p.x},${p.y})`);
    g.setAttribute("tabindex", "-1"); g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${nodeTitle(n, 60)} — ${n.rb}${nodeYearLabel(n) ? ", " + nodeYearLabel(n) : ""} — ${CAT[n.cat].short}`);
    els.set(n.id, g);
  }
  return { gEdges, els };
}

function curve(pa, pb) {
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return null;
  const lift = Math.min(70, 12 + Math.abs(dx) * .2);
  if (Math.abs(dy) < 3) return `M${pa.x},${pa.y} Q${(pa.x + pb.x) / 2},${pa.y - lift} ${pb.x},${pb.y}`;
  return `M${pa.x},${pa.y} C${pa.x},${pa.y + dy * .5} ${pb.x},${pb.y - dy * .5} ${pb.x},${pb.y}`;
}

/** מופע מפה (ראשי או מיני). opts: {nodes, compact, W, r, passes(n), onSelect(id), edges} */
class MapInst {
  constructor(host, opts) {
    this.host = host; this.o = opts; this.nodes = opts.nodes; this.pass = opts.passes || (() => true);
    this.sel = null; this.hot = new Set();
    this.svg = sv("svg", { role: "img", "aria-label": opts.label || "מפת הפריטים לפי דורות ושנים" });
    host.append(this.svg);
    this.draw();
    MAPS.add(this);
    if (!opts.compact && window.ResizeObserver) { this.ro = new ResizeObserver(debounce(() => { const w = this.host.clientWidth; if (Math.abs(w - 2 - this._w) > 14 && w > 0) this.draw(); }, 120)); this.ro.observe(host); }
    this.onClick = e => { const g = e.target.closest?.(".nd"); if (g) { this.o.onSelect?.(g.dataset.id, e); } };
    this.svg.addEventListener("click", this.onClick);
    this.svg.addEventListener("mousemove", e => { const g = e.target.closest?.(".nd"); if (g) { const n = getNode(g.dataset.id); showTip(nodeTipHtml(n), e.clientX, e.clientY); } else hideTip(); });
    this.svg.addEventListener("mouseleave", hideTip);
    this.svg.addEventListener("keydown", e => this.key(e));
    this.svg.addEventListener("focusin", e => { const g = e.target.closest?.(".nd"); if (g) { const n = getNode(g.dataset.id); const r = g.getBoundingClientRect(); showTip(nodeTipHtml(n), r.left, r.bottom); } });
    this.svg.addEventListener("focusout", hideTip);
  }
  width() { return this.o.W || Math.max((this.host.clientWidth || 900) - 2, 640); }
  draw() {
    const W = this.width(); this._w = W;
    this.L = layoutYears(this.nodes, W, { r: this.o.r, gap: this.o.gap, labw: this.o.labw, und: this.o.und, top: this.o.top, minRow: this.o.minRow });
    this.svg.setAttribute("viewBox", `0 0 ${W} ${this.L.H}`);
    if (this.o.compact) { this.svg.removeAttribute("width"); this.svg.setAttribute("width", "100%"); }
    else { this.svg.setAttribute("width", W); this.svg.setAttribute("height", this.L.H); }
    const d = mapDraw(this.svg, this.L, this.nodes, this.o);
    this.gEdges = d.gEdges; this.els = d.els;
    this.refresh();
  }
  setNodes(nodes) { this.nodes = nodes; this.draw(); }
  refresh() {
    let shown = 0;
    for (const [id, el] of this.els) {
      const n = getNode(id), ok = this.pass(n);
      el.classList.toggle("dim", !ok); if (ok) shown++;
      el.classList.toggle("sel", id === this.sel);
      el.classList.toggle("hot", this.hot.has(id));
      el.setAttribute("tabindex", id === (this.sel || this.firstId()) ? "0" : "-1");
    }
    this.shown = shown;
    this.drawEdges();
    for (const t of $$("[data-row]", this.svg)) {
      const g = +t.dataset.row; const tot = this.nodes.filter(n => n.g === g).length, sh = this.nodes.filter(n => n.g === g && this.pass(n)).length;
      t.textContent = sh === tot ? tot + " פריטים" : sh + " מתוך " + tot;
    }
  }
  firstId() { return this._first ||= this.nodes[0]?.id; }
  drawEdges() {
    const g = this.gEdges; g.textContent = "";
    const showAll = this.o.edges && this.o.edges();
    const drawn = new Set();
    const add = (e, on) => {
      const a = this.L.pos.get(e[0]), b = this.L.pos.get(e[1]); if (!a || !b) return;
      const key = e[0] + ">" + e[1]; if (drawn.has(key)) return; drawn.add(key);
      const d = curve(a, b); if (!d) return;
      sv("path", { class: "edge k" + e[2] + (on ? " on" : ""), d }, g);
    };
    if (showAll) for (const e of S.core.edges) { if (this.pass(getNode(e[0])) && this.pass(getNode(e[1]))) add(e, false); }
    if (this.sel) { for (const e of (S.edgesOut.get(this.sel) || [])) add(e, true); for (const e of (S.edgesIn.get(this.sel) || [])) add(e, true); }
  }
  setSel(id, scroll) {
    this.sel = id; this.refresh();
    if (scroll && id) this.reveal(id);
  }
  setHot(ids) { this.hot = new Set(ids || []); for (const [id, el] of this.els) el.classList.toggle("hot", this.hot.has(id)); }
  reveal(id) {
    const p = this.L.pos.get(id), sc = this.host; if (!p) return;
    if (sc.scrollWidth > sc.clientWidth + 2 || sc.scrollHeight > sc.clientHeight + 2) {
      const sx = this.svg.getBoundingClientRect().width / this.L.W;
      // ב־RTL scrollLeft שלילי; מחשבים לפי מיקום יחסי
      const r = sc.getBoundingClientRect(), s = this.svg.getBoundingClientRect();
      const targetX = s.left + p.x * sx, targetY = s.top + p.y * sx;
      const dx = targetX - (r.left + r.width / 2), dy = targetY - (r.top + r.height / 2);
      sc.scrollBy({ left: dx, top: dy, behavior: "smooth" });
    }
  }
  focusNode(id) { this.els.get(id)?.focus({ preventScroll: true }); }
  key(e) {
    const g = e.target.closest?.(".nd"); if (!g) return;
    const id = g.dataset.id;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.o.onSelect?.(id, e); return; }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dirs[e.key]; if (!d) return;
    e.preventDefault();
    const p = this.L.pos.get(id); let best = null, bs = 1e9;
    for (const [oid, q] of this.L.pos) {
      if (oid === id || !this.pass(getNode(oid))) continue;
      const dx = q.x - p.x, dy = q.y - p.y;
      const along = dx * d[0] + dy * d[1]; if (along <= 0.5) continue;
      const across = Math.abs(d[0] ? dy : dx);
      const sc = along + across * 2.2;
      if (sc < bs) { bs = sc; best = oid; }
    }
    if (best) { this.focusNode(best); this.els.get(best).setAttribute("tabindex", "0"); g.setAttribute("tabindex", "-1"); }
  }
  destroy() { MAPS.delete(this); this.ro?.disconnect(); this.svg.remove(); }
}
SelListeners.add((id, o) => {
  for (const m of MAPS) { if (o && o.hover) m.setHot(o.off ? [] : id ? [id] : []); else if (!o?.hover) m.setSel(id, !!(o && (o.open || o.reveal))); }
});



/* חברותא · ספר הביאורים (שער ותוכן) וקורא הביאור: עמודת קריאה אחת, הערות בשוליים, מצבי עבודה */

function stateChip(d) {
  if (!d.state) return null;
  return h("span", { class: "tag " + (/^PASS$/.test(d.state) ? "ok" : "warn") }, d.state);
}
function genStrip(d) {
  const ids = (S.links?.d[d.id]) || d.members || [];
  const cnt = {}; for (const i of ids) { const n = getNode(i); if (n) cnt[n.g] = (cnt[n.g] || 0) + 1; }
  const mx = Math.max(1, ...Object.values(cnt));
  return h("span", { class: "gstrip", role: "img", "aria-label": "פריטים לפי דורות: " + GEN_IDS.filter(g => cnt[g]).map(g => `${GS[g]} ${cnt[g]}`).join(", ") },
    ...GEN_IDS.map(g => h("i", { style: { "--v": (cnt[g] || 0) / mx }, title: `${GS[g]}: ${cnt[g] || 0}` })));
}
function readPos(id) { try { return JSON.parse(lsGet("chavruta-pos:" + id) || "null"); } catch (e) { return null; } }

/* ---------- השער והתוכן ---------- */
function libraryList(host, o = {}) {
  const groups = bookGroups();
  for (const g of groups) {
    if (!g.docs.length) continue;
    const sec = h("section", { class: "lib-grp" }, h("header", null, h("h2", null, g.title), h("span", null, g.sub)));
    const ol = h("ol", { class: "lib-list" });
    for (const d of g.docs) {
      const mem = (S.links?.d[d.id] || d.members || []).length;
      const dd = d.kind === "chain" ? S.docs.get(d.id + "d") : null;
      const pos = readPos(d.id);
      const vl = d.kind === "chain" ? anchorShort(d) : d.range ? verseLabel(d.range) : "כללי";
      ol.append(h("li", null, h("a", { class: "lib-i", href: mkHash(["biur", d.id]) },
        h("span", { class: "lib-v" }, vl, d.kind === "chain" ? h("small", null, "שרשרת") : null),
        h("span", { class: "lib-c" },
          h("span", { class: "lib-t" }, d.title),
          h("span", { class: "lib-m" }, mem + " פריטים", d.state && d.state !== "PASS" ? " · " + d.state : "", pos ? " · בקריאה" : ""),
          d.intro && !o.compact ? h("span", { class: "lib-p" }, d.intro) : null,
          MODE === "links" || o.strips ? genStrip(d) : null)),
        dd ? h("a", { class: "lib-dorot", href: mkHash(["biur", dd.id]) }, "שרשרת הדורות") : null));
    }
    sec.append(ol); host.append(sec);
  }
}
/** ״המשך מאיפה שעצרת״: הביאור שנקרא לאחרונה — בפרשה par, או בכל הפרשיות (בשער) */
function continueLink(par) {
  let best = null;
  for (const d of S.core.docs) { if (d.kind === "dorot" || (par && (d.p || S.home) !== par)) continue; const p = readPos(d.id); if (p && (!best || p.t > best.p.t)) best = { d, p }; }
  if (!best) return null;
  return h("a", { class: "continue", href: mkHash(["biur", best.d.id, best.p.part || ""].filter((x, i) => i < 2 || x), { a: best.p.id || "" }) }, h("small", null, "המשך מאיפה שעצרת"), h("b", null, trunc(best.d.title, 70)));
}
async function renderLibrary(main) {
  main.className = "main lib";
  main.textContent = "";
  const p = S.core.parsha;
  document.title = "פרשת " + p + " · חברותא";
  main.append(...parshaHead(p, {
    lede: `${S.books.length} ביאורים על דברי שבעת הרביים בשבת ${p}, לפי סדר הפסוקים. כל ציטוט מקושר אל מקורו, ואפשר לעבור בין קריאה, קשרים וחקר בלחיצה.`,
    stats: [[S.verseDocs.length, "יחידות פסוק"], [S.chainDocs.length, "שרשראות דורות"], [S.pnodes.length, "פריטי מקור"], [S.core.built.split("-").reverse().join("."), "עדכון אחרון"]],
    extra: continueLink(p) }));
  libraryList(main);
  main.append(parshaPager(p));
}
VIEWS.biurim = async function (rest, q, ctx) {
  Aside.detach();
  setPar(S.home);
  const main = $("#view");
  if (MODE === "research") { await Workspace.render(main, q, ctx); }
  else await renderLibrary(main);
  if (!ctx.keep) window.scrollTo(0, 0);
};
VIEWS.biurim.onMode = null;

/* ---------- קורא ---------- */
const RD = { doc: null, meta: null, data: null, art: null, cur: null, spy: null, onScroll: null, matches: [], sel: null, selEl: null };
function cleanupReader() { Tts.close(); RD.spy?.disconnect(); if (RD.onScroll) window.removeEventListener("scroll", RD.onScroll); RD.onScroll = null; Notes.hide?.(); Aside.detach(); $(".backpill")?.remove(); document.body.classList.remove("sheet-open"); }

function verseStrip(d) {
  const T = S.core.torah.chapters;
  const rng = d.range || d.cv; if (!rng) return null;
  const [c1, v1, c2, v2] = rng;
  // d.cv נקבע רק לעוגן בספר בראשית (build_app.chain_verse); עוגן מספר אחר (שיר השירים, ישעיה) — בלי רצועה.
  // נוסח הפסוקים שבידינו: הפרקים שב־core.torah (בראשית); פרק או פסוק חסר — בלי רצועה, ולא רצועה חלקית או שגויה
  for (let c = c1; c <= c2; c++) if (!T[c]) return null;
  const items = [];
  for (let c = c1; c <= c2; c++) { const a = c === c1 ? v1 : 1, b = c === c2 ? v2 : T[c].length; for (let v = a; v <= b; v++) items.push([c, v, T[c][v - 1]]); }
  if (!items.length || items.some(x => !x[2])) return null;
  const box = h("details", { class: "verses", open: items.length <= 3 ? "" : null });
  box.append(h("summary", null, h("b", null, "בראשית " + verseLabel(rng)), h("small", null, `${items.length === 1 ? "פסוק אחד" : items.length + " פסוקים"} · נוסח מנוקד (Sefaria, נחלת הכלל)`)));
  const vs = h("div", { class: "vs", lang: "he" }); let lastC = null;
  for (const [c, v, t] of items) { vs.append(h("sup", null, (c !== lastC && c1 !== c2 ? gem(c).replace(/[׳״]/g, "") + ":" : "") + gem(v).replace(/[׳״]/g, "")), t + " "); lastC = c; }
  box.append(vs);
  return box;
}

function wrapCells(art) {
  for (const td of $$("td", art)) { if (td.firstElementChild?.classList.contains("cell")) continue; const w = h("div", { class: "cell" }); while (td.firstChild) w.append(td.firstChild); td.append(w); }
  for (const t of $$("table", art)) t.classList.add("clamp");
}
function rowToggles(art) {
  for (const t of $$("table.clamp", art)) for (const tr of $$("tbody tr", t)) {
    const cells = $$("td .cell", tr);
    if (!cells.some(c => c.scrollHeight > c.clientHeight + 4)) continue;
    const first = tr.querySelector("td"); if (!first || first.querySelector(".rowtog")) continue;
    const b = h("button", { class: "rowtog no-print", "aria-expanded": "false", "aria-label": "הרחבת השורה", onclick: e => { e.stopPropagation(); const o = tr.classList.toggle("open"); b.setAttribute("aria-expanded", o); } }, icon("i-chev"));
    first.prepend(b);
  }
}

function scrollToEl(el, flash) {
  if (!el) return;
  const review = el.closest("details.reading-review") || (el.classList.contains("reading-editorial") && el.querySelector("details.reading-review"));
  if (review) review.open = true;
  window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - 110), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  if (flash) flashEl(el);
}
function flashEl(el) { el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl"); setTimeout(() => el.classList.remove("hl"), 3200); }
function gotoPart(d, pid, push, anchorId) {
  const sec = RD.art?.querySelector(`section.part[data-part="${CSS.escape(pid)}"]`); if (!sec) return;
  const target = anchorId ? RD.art.querySelector("#" + CSS.escape(anchorId)) : null;
  scrollToEl(target || sec, !!target);
  if (push) quietHash(mkHash(["biur", d.id, pid], anchorId ? { a: anchorId } : {}));
}
function stepPart(dir) {
  const ps = RD.data?.parts; if (!ps) return;
  const i = ps.findIndex(p => p.id === RD.cur), t = ps[clamp(i + dir, 0, ps.length - 1)];
  if (t) gotoPart(RD.meta, t.id, true);
}
function stepPara(dir) {
  const els = $$("p[id],li[id],blockquote[id]", RD.art).filter(e => e.offsetParent);
  const top = 120;
  let i = els.findIndex(e => e.getBoundingClientRect().top > top + (dir > 0 ? 6 : -6));
  if (dir > 0) { if (i < 0) return; } else { i = i < 0 ? els.length - 1 : i - 1; i = Math.max(0, i); const cur = els.findIndex(e => e.getBoundingClientRect().bottom > top); if (cur >= 0) i = Math.max(0, cur - (els[cur].getBoundingClientRect().top < top - 8 ? 0 : 1)); }
  scrollToEl(els[i], true);
}
function markNode(id) {
  $$(".nmatch", RD.art || document).forEach(e => e.classList.remove("nmatch"));
  RD.matches = [];
  if (!id || !RD.art) return;
  const els = $$(`[data-n="${CSS.escape(id)}"]`, RD.art);
  els.forEach(e => e.classList.add("nmatch"));
  RD.matches = els.filter(e => !els.some(o => o !== e && o.contains(e)));
}
function markSelEl(el) { $$(".selel", RD.art || document).forEach(e => e.classList.remove("selel")); RD.selEl = el || null; el?.classList.add("selel"); }

/* ---------- קטעי קצה: מי מפנה לכאן, מה עולה ---------- */
function endMatter(d, doc) {
  const box = h("footer", { class: "end no-print" });
  // מי מפנה לכאן
  const sh = sharedDocs(d.id);
  const explicit = (S.xref[d.id] || []).map(x => x[0]);
  const bl = h("section", { class: "end-sec", id: "backlinks" }, h("h2", null, "מי מפנה לכאן"),
    h("p", { class: "end-note" }, "ביאורים אחרים שנוגעים באותם מקורות, ורשומות שמזכירות ביאור זה במפורש."));
  if (!sh.length && !explicit.length) bl.append(h("p", { class: "end-empty" }, "אין ביאור אחר החולק פריטים עם ביאור זה."));
  else {
    const ul = h("ul", { class: "end-list" });
    const seen = new Set();
    const rows = [...explicit.filter(x => S.docs.get(x)).map(x => [x, (sh.find(s => s[0] === x) || [x, []])[1], true]), ...sh.map(s => [s[0], s[1], false])];
    for (const [id, nodes, exp] of rows) {
      if (seen.has(id)) continue; seen.add(id);
      const od = S.docs.get(id);
      ul.append(h("li", null, h("a", { href: mkHash(["biur", id], nodes[0] ? { n: nodes[0] } : {}) }, docShort(od)),
        h("small", null, [exp ? "מזכיר ביאור זה" : "", nodes.length ? nodes.length + " פריטים משותפים: " + nodes.slice(0, 2).map(i => trunc(cleanT(getNode(i)?.t), 28)).join("; ") : ""].filter(Boolean).join(" · "))));
      if (seen.size >= 8) break;
    }
    bl.append(ul);
    if (sh.length + explicit.length > 8) bl.append(h("p", { class: "end-note" }, `ועוד ${sh.length - 8 > 0 ? sh.length - 8 : ""} ביאורים. ב״קשרים״ אפשר לראות לכל פריט איפה עוד הוא מנותח.`));
  }
  // מה עולה
  const mem = (S.links.d[d.id] || []).map(getNode).filter(Boolean);
  const loose = mem.filter(n => n.cat !== "covered");
  const open = doc.parts.find(p => p.id === "open" || /פתוח לבקרה|שאלות שנבדקו/.test(p.title));
  const idx = S.books.findIndex(x => x.id === (d.kind === "dorot" ? d.parent : d.id));
  const next = S.books[idx + 1], dd = d.kind === "chain" ? S.docs.get(d.id + "d") : null;
  const up = h("section", { class: "end-sec", id: "whatnext" }, h("h2", null, "מה עולה מכאן"));
  const ul = h("ul", { class: "end-list" });
  if (open) ul.append(h("li", null, h("a", { href: mkHash(["biur", d.id, open.id]), onclick: e => { e.preventDefault(); gotoPart(d, open.id, true); } }, "השאלות שנבדקו: מה הוכרע ומה אין בידינו להכריע"), h("small", null, "בסוף הביאור, לפני בדיקה אנושית")));
  if (loose.length) ul.append(h("li", null, h("a", { href: mkHash(["sources"], { p: d.p || "", unit: d.kind === "verse" ? d.key : "", chain: d.kind !== "verse" ? (d.kind === "dorot" ? S.docs.get(d.parent)?.key : d.key) : "", st: "mentioned" }) }, `${loose.length} פריטים שהוזכרו או הושמטו ולא נותחו במלואם`), h("small", null, loose.slice(0, 3).map(n => trunc(cleanT(n.t), 30)).join("; "))));
  if (dd) ul.append(h("li", null, h("a", { href: mkHash(["biur", dd.id]) }, "שרשרת הדורות של המאמר"), h("small", null, "אותו מאמר, לפי סדר הדורות")));
  if (next) ul.append(h("li", null, h("a", { href: mkHash(["biur", next.id]) }, "הביאור הבא: " + trunc(next.title, 60)), h("small", null, docWhere(next))));
  up.append(ul.children.length ? ul : h("p", { class: "end-empty" }, "אין המשך מסומן."));
  box.append(bl, up);
  return box;
}
function roundsBox(d) {
  const det = h("details", { class: "rounds" });
  det.append(h("summary", null, "סבבי בקרה", stateChip(d), d.rounds?.length ? h("small", null, d.rounds.length + " סבבים") : null));
  const body = h("div", { class: "rbody" });
  if (d.rounds?.length) { const t = h("table", null, h("thead", null, h("tr", null, h("th", null, "סבב"), h("th", null, "בוחנים ופסיקה: ממצאים / התקבלו / נדחו")))); const tb = h("tbody"); d.rounds.forEach((r, i) => tb.append(h("tr", null, h("td", null, i + 1), h("td", null, r)))); t.append(tb); body.append(t); }
  if (d.rdec?.length) { body.append(h("h4", null, "הכרעות המחבר")); for (const r of d.rdec) body.append(h("p", null, h("b", null, r.title + ": "), r.summary)); }
  if (!d.rounds?.length && !d.rdec?.length) body.append(h("p", null, "אין נתוני סבבים ליחידה זו."));
  det.append(body); return det;
}
function pager(d) {
  const base = d.kind === "dorot" ? S.docs.get(d.parent) : d;
  const i = S.books.findIndex(x => x.id === base.id), prev = S.books[i - 1], next = S.books[i + 1];
  const a = (x, lab) => x ? h("a", { href: mkHash(["biur", x.id]) }, h("small", null, lab), trunc(x.title, 52)) : h("span");
  return h("nav", { class: "pager no-print", "aria-label": "מעבר בין ביאורים" }, a(next, "הבא ←"), a(prev, "→ הקודם"));
}

/* ---------- צד הקורא: הערות שוליים / קשרים / חקר ---------- */
const Aside = {
  el: null, inner: null,
  attach(el) { this.el = el; },
  detach() { this.el = null; this.inner = null; },
  open() { document.body.classList.add("sheet-open"); },
  close() { document.body.classList.remove("sheet-open"); },
  render() {
    const el = this.el; if (!el) return;
    Notes.note?.remove(); Notes.note = null;
    document.body.classList.remove("notes-side", "notes-inline");
    el.replaceChildren();
    const x = h("button", { class: "aside-x icon-btn", "aria-label": "סגירה", onclick: () => this.close() }, icon("i-x"));
    const inner = h("div", { class: "aside-in" }); this.inner = inner;
    el.append(x, inner);
    el.dataset.mode = MODE;
    if (MODE === "read") { inner.append(h("div", { class: "mnotes" })); if (Notes.active) Notes.show(Notes.active.sel, Notes.active.anchor, true); }
    else if (MODE === "links") Conn.render(inner);
    else Dock.render(inner);
  },
};
function readingInlineNotes() {
  const prefs = window.chavrutaPreferences.get();
  return MODE === "read" && (innerWidth < 1000 || prefs.sourcePlace === "inline" || prefs.focus);
}
const Notes = {
  active: null, note: null,
  host() { return Aside.inner?.querySelector(".mnotes"); },
  hide(returnFocus = false) {
    const anchor = this.active?.anchor;
    this.note?.remove(); this.note = null; this.active = null;
    this.host()?.replaceChildren(); document.body.classList.remove("notes-side", "notes-inline");
    markSelEl(null); if (MODE === "read") Aside.close();
    if (returnFocus && anchor?.isConnected) { anchor.focus({ preventScroll: true }); anchor.scrollIntoView({ block: "center", behavior: "auto" }); }
  },
  show(sel, anchor, keep) {
    const host = this.host(); if (!host || !anchor?.isConnected) return;
    this.note?.remove();
    this.active = { sel, anchor };
    const note = noteContent(sel); this.note = note;
    host.replaceChildren(note);
    const inline = readingInlineNotes();
    document.body.classList.toggle("notes-inline", inline);
    document.body.classList.toggle("notes-side", !inline && MODE === "read");
    if (inline) {
      const block = anchor.closest("blockquote") || anchor.closest("p,li") || anchor.closest(".scroll") || anchor.closest("table") || anchor;
      if (block.tagName === "LI") block.append(note); else block.after(note);
      note.classList.add("mnote-inline", "no-print"); Aside.close();
      if (!keep) note.scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    }
    Aside.close(); this.place(note, anchor);
  },
  place(note, anchor) {
    note = note || this.note; anchor = anchor || this.active?.anchor;
    const host = this.host(); if (!host || !note || !anchor?.isConnected || note.classList.contains("mnote-inline")) return;
    const top = anchor.getBoundingClientRect().top - host.getBoundingClientRect().top;
    const max = host.offsetHeight - note.offsetHeight - 8;
    note.style.top = clamp(top - 6, 0, Math.max(0, max)) + "px";
    const r = note.getBoundingClientRect(), over = r.bottom - (innerHeight - 12);
    if (over > 0) note.style.top = Math.max(0, parseFloat(note.style.top) - over) + "px";
  },
};
window.addEventListener("relayout", () => { if (R.view === "biur" && Notes.active) Aside.render(); });
window.addEventListener("prefchange", () => { if (R.view === "biur" && Notes.active) requestAnimationFrame(() => Aside.render()); });

function noteContent(sel) {
  const doc = RD.data;
  const n = sel.node ? getNode(sel.node) : null;
  const note = h("div", { class: "mnote", role: "note" });
  note.append(h("button", { class: "mnote-x icon-btn", "aria-label": "סגירת ההערה", onclick: () => Notes.hide(true) }, icon("i-x")));
  if (sel.ex && doc.ex[sel.ex]) {
    const [page, pdf, url, node, topic, text, verified, src] = doc.ex[sel.ex];
    note.append(h("div", { class: "mnote-h" }, h("b", { dir: "ltr" }, sel.ex), h("span", null, [n ? trunc(cleanT(n.t), 44) : src, page ? "ע׳ " + page : "", pdf ? "pdf " + pdf : ""].filter(Boolean).join(" · "))));
    if (topic) note.append(h("div", { class: "mnote-t" }, topic));
    note.append(h("p", { class: "mnote-b" }, text));
    if (verified) note.append(h("small", { class: "mnote-v" }, "אומת: " + verified));
  } else if (n) {
    note.append(itemHead(n, { max: 90, noSub: true }));
  }
  const acts = h("div", { class: "mnote-a" });
  if (n) acts.append(h("button", { class: "linkbtn", onclick: () => { setMode("links"); Conn.show(sel); Aside.open(); } }, "הצג קשרים"));
  const url = sel.ex && doc.ex[sel.ex]?.[2];
  if (url) acts.append(h("a", { class: "linkbtn", href: url, target: "_blank", rel: "noopener noreferrer" }, "פתח במקור", icon("i-ext")));
  else if (n?.u) acts.append(h("a", { class: "linkbtn", href: n.u, target: "_blank", rel: "noopener noreferrer" }, "פתח במקור", icon("i-ext")));
  if (n) acts.append(h("a", { class: "linkbtn", href: mkHash(["item", n.id]) }, "עמוד הפריט"));
  note.append(acts);
  return note;
}

/* ---------- בחירה בטקסט ---------- */
function pick(sel, el) {
  RD.sel = sel; markSelEl(el);
  if (sel.node) { S.selNode = sel.node; markNode(sel.node); }
  if (MODE === "read") Notes.show(sel, el);
  else if (MODE === "links") { Conn.show(sel); Aside.open(); }
  else { Dock.select(sel); Aside.open(); }
}
function onArticleClick(ev, d) {
  if (ev.target.closest(".mnote")) return;
  const t = ev.target; hideTip();
  if (t.closest?.("button.rowtog,.pcopy")) return;
  if (ev.type === "click" && (ev.ctrlKey || ev.metaKey || ev.button === 1) && t.closest("a[href^=http]")) return;
  const rl = t.closest?.("a.rowlink");
  if (rl) {
    ev.preventDefault();
    const sec = rl.closest("section.part"), n = rl.dataset.row;
    const tr = sec?.querySelector(`tr[data-row="${CSS.escape(n)}"]`) || RD.art.querySelector(`tr[data-row="${CSS.escape(n)}"]`);
    if (tr) { tr.classList.add("open"); scrollToEl(tr, true); if (tr.dataset.n) pick({ node: tr.dataset.n }, tr); }
    return;
  }
  if (t.closest("a") && !t.closest("a.nref")) return;
  const ex = t.closest?.("[data-ex]");
  if (ex) { ev.preventDefault(); const n = ex.closest("[data-n]")?.dataset.n || RD.data.ex[ex.dataset.ex]?.[3]; pick({ ex: ex.dataset.ex, node: n && getNode(n) ? n : null }, ex); return; }
  const nel = t.closest?.("[data-n]");
  if (nel && nel.closest("article")) { ev.preventDefault(); pick({ node: nel.dataset.n }, nel); return; }
  if (MODE === "links" && !getSelection()?.toString()) {
    const blk = t.closest?.("p[id],li[id],blockquote[id],tr[id],h3[id],h4[id]");
    if (blk && RD.art.contains(blk)) pick({ para: blk.id }, blk);
  }
}
function setupPcopy(art, d) {
  let btn = null, cur = null;
  const hide = () => { btn?.remove(); btn = null; cur = null; };
  art.addEventListener("mouseover", e => {
    if (matchMedia("(hover: none)").matches) return;
    const blk = e.target.closest?.("p[id],li[id],h3[id],h4[id],blockquote[id]");
    if (!blk || blk === cur) return;
    hide(); cur = blk;
    const sec = blk.closest("section.part"); if (!sec) return;
    btn = h("button", { class: "pcopy no-print", "aria-label": "העתקת קישור לפסקה זו", title: "העתק קישור לפסקה", onclick: ev => { ev.stopPropagation(); copyText(absUrl(mkHash(["biur", d.id, sec.dataset.part || ""].filter(Boolean), { a: blk.id }))); } }, icon("i-link"));
    sec.append(btn);
    btn.style.top = (blk.getBoundingClientRect().top - sec.getBoundingClientRect().top + 4) + "px";
  });
  art.addEventListener("mouseleave", e => { if (!e.relatedTarget?.closest?.(".pcopy")) hide(); });
}

function readingPartTitle(title) {
  return /נוסח קריאה נעול|שלב [0-9]+ \(ביאורים\)/.test(title) ? "על הביאור והבקרה" : title;
}
function readingEditorial(art) {
  const first = art.querySelector("section.part"), heading = first?.querySelector("h2");
  if (!first || !heading || readingPartTitle(heading.textContent) === heading.textContent || first.querySelector("p,ul,ol,table,blockquote")) return;
  first.classList.add("reading-editorial");
  first.replaceChildren(h("details", { class: "reading-review" }, h("summary", { class: "no-print", "data-reading-ui": "" }, "על הביאור והבקרה"), ...Array.from(first.childNodes)));
}
let readingPrintReviews = [];
window.addEventListener("beforeprint", () => { readingPrintReviews = $$("details.reading-review").map(el => [el, el.open]); readingPrintReviews.forEach(([el]) => { el.open = true; }); });
window.addEventListener("afterprint", () => { readingPrintReviews.forEach(([el, open]) => { el.open = open; }); readingPrintReviews = []; });

VIEWS.biur = async function (rest, q, ctx) {
  const docId = rest[0], partId = rest[1] || "";
  const d = getDoc(docId), main = $("#view");
  if (!d) { Aside.detach(); main.className = "main"; main.replaceChildren(h("div", { class: "empty" }, h("b", null, "הביאור לא נמצא"), docId, h("br"), h("a", { href: mkHash(["biurim"]) }, "לרשימת הביאורים"))); return; }
  const anchor = q.get("a") || "", nid = q.get("n") || "";
  if (ctx.same && RD.doc === d.id && RD.art?.isConnected) { if (ctx.modeChanged) VIEWS.biur.onMode(); afterRender(d, partId, anchor, nid, false, q.get("hl")); backPill(); return; }
  cleanupReader();
  main.className = "main"; main.replaceChildren(h("div", { class: "loading" }, "טוען את הביאור…"));
  let doc;
  try { [doc] = await Promise.all([loadDoc(d.id), loadLinks()]); } catch (e) { main.replaceChildren(h("div", { class: "empty" }, h("b", null, "שגיאה בטעינה"), String(e.message))); return; }
  if (!ctx.alive()) return;
  RD.doc = d.id; RD.meta = d; RD.data = doc; RD.cur = d.parts[0]?.id; RD.sel = null; S.selNode = null; Notes.active = null;
  document.title = trunc(doc.hero.h1 || d.title, 60) + " · חברותא";

  const art = h("article", { class: "biur", html: doc.html, lang: "he" });
  RD.art = art;
  readingEditorial(art);
  wrapCells(art);
  chvStackTables(art);
  for (const e of $$("[data-n]", art)) if (!getNode(e.dataset.n)) { e.removeAttribute("data-n"); e.setAttribute("data-out", "1"); e.classList.remove("nref", "rowref", "srcitem"); }
  art.addEventListener("click", ev => onArticleClick(ev, d));
  art.addEventListener("keydown", ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches?.("li.srcitem,.cite,.exref,.nref")) { ev.preventDefault(); onArticleClick(ev, d); } });
  for (const e of $$(".cite,.exref", art)) { if (!e.hasAttribute("tabindex")) e.setAttribute("tabindex", "0"); e.setAttribute("role", "button"); }
  setupPcopy(art, d);

  // כותרת
  const parent = d.kind === "dorot" ? S.docs.get(d.parent) : null;
  const nitems = (S.links.d[d.id] || []).length;
  const hero = h("header", { class: "hero" },
    h("nav", { class: "crumbs", "aria-label": "מיקום" }, h("a", { href: mkHash(["home"]) }, "חברותא"), h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("a", { href: parshaHrefOf(d.p || S.home) }, "פרשת " + (d.p || S.home)), parent ? [h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("a", { href: mkHash(["biur", parent.id]) }, trunc(parent.title, 40))] : null),
    h("h1", null, doc.hero.h1 || d.title),
    h("div", { class: "metaline" }, h("span", null, d.kind === "verse" ? docWhere(d) : d.kind === "chain" ? "שרשרת מאמרים · " + d.anchor : "שרשרת הדורות"), nitems ? h("span", null, nitems + " פריטים") : null, stateChip(d),
      h("button", { class: "linkbtn no-print", onclick: () => copyText(absUrl(mkHash(["biur", d.id]))) }, icon("i-link"), "העתק קישור"), Tts.button(art)),
    doc.hero.lead ? h("p", { class: "lead", html: doc.hero.lead }) : null,
    doc.hero.status ? h("p", { class: "statusline", html: doc.hero.status }) : null);
  const dd = d.kind === "chain" ? S.docs.get(d.id + "d") : null;
  if (dd) hero.append(h("p", { class: "no-print sibling" }, h("a", { class: "linkbtn", href: mkHash(["biur", dd.id]) }, "שרשרת הדורות של המאמר הזה")));

  const rail = h("nav", { class: "rail no-print", "aria-label": "תוכן עניינים" });
  const ol = h("ol");
  d.parts.forEach((p, i) => {
    const m = p.title.match(/^([א-ת]{1,3})\.\s/);
    ol.append(h("li", { "data-part": p.id }, h("a", { href: mkHash(["biur", d.id, p.id]), onclick: e => { e.preventDefault(); gotoPart(d, p.id, true); } }, h("i", { class: "tick" }, m ? m[1] : "·"), h("span", { class: "ttl" }, readingPartTitle(p.title).replace(/^[א-ת]{1,3}\.\s/, "")))));
  });
  rail.append(ol);
  const aside = h("aside", { class: "aside", id: "aside", "aria-label": "הערות וקשרים" });
  Aside.attach(aside);
  const col = h("div", { class: "col" }, hero, verseStrip(d), art, endMatter(d, doc), roundsBox(d), pager(d));
  const progress = h("div", { class: "progress no-print", "aria-hidden": "true" }, h("i"));
  main.className = "main reader";
  main.replaceChildren(progress, h("div", { class: "rd" }, rail, col, aside));
  Aside.render();
  requestAnimationFrame(() => rowToggles(art));

  const prog = $("i", progress); let saveT;
  RD.onScroll = () => {
    const r = art.getBoundingClientRect(), tot = r.height - innerHeight * .5;
    prog.style.width = (clamp((-r.top + innerHeight * .2) / Math.max(tot, 1), 0, 1) * 100).toFixed(1) + "%";
    clearTimeout(saveT); saveT = setTimeout(() => { const a = captureAnchor(); if (a.id && scrollY > 200) lsSet("chavruta-pos:" + d.id, JSON.stringify({ id: a.id, part: RD.cur, t: Date.now() })); }, 700);
  };
  window.addEventListener("scroll", RD.onScroll, { passive: true }); RD.onScroll();
  const lis = new Map($$("li[data-part]", rail).map(li => [li.dataset.part, li]));
  RD.spy = new IntersectionObserver(es => {
    for (const en of es) if (en.isIntersecting) { const pid = en.target.dataset.part; RD.cur = pid; lis.forEach(li => li.classList.remove("cur")); lis.get(pid)?.classList.add("cur"); }
  }, { rootMargin: "-12% 0px -75% 0px" });
  $$("section.part", art).forEach(s => RD.spy.observe(s));
  topicChips(d, art);
  afterRender(d, partId, anchor, nid, true, q.get("hl"));
  backPill();
  ctx.cleanup = cleanupReader;
};
VIEWS.biur.onMode = function () { Notes.active = Notes.active; Aside.close(); Aside.render(); if (RD.sel && MODE === "links") Conn.show(RD.sel, { quiet: true }); if (RD.sel && MODE === "research") Dock.select(RD.sel, true); };

function afterRender(d, partId, anchor, nid, first, hl) {
  const exId = R.cur.q.get("ex");
  if (exId) { const el = RD.art.querySelector(`[data-ex="${CSS.escape(exId)}"]`); if (el) { requestAnimationFrame(() => { el.closest("tr")?.classList.add("open"); scrollToEl(el, true); const nn = el.closest("[data-n]")?.dataset.n || RD.data.ex[exId]?.[3]; pick({ ex: exId, node: nn && getNode(nn) ? nn : null }, el); }); return; } }
  if (hl) { const sec = partId ? RD.art.querySelector(`section.part[data-part="${CSS.escape(partId)}"]`) : RD.art; if (sec && highlightWordsIn(sec, hl)) { const m = sec.querySelector("mark.sh"); if (m) { requestAnimationFrame(() => scrollToEl(m, false)); return; } } }
  if (nid && getNode(nid)) { S.selNode = nid; markNode(nid); RD.sel = { node: nid }; if (MODE === "links") Conn.show(RD.sel, { quiet: true }); else if (MODE === "research") Dock.select(RD.sel, true); }
  if (anchor) {
    const el = RD.art.querySelector("#" + CSS.escape(anchor));
    if (el) { requestAnimationFrame(() => { const tr = el.closest("tr"); if (tr) tr.classList.add("open"); scrollToEl(el, true); }); return; }
  }
  if (partId) { const sec = RD.art.querySelector(`section.part[data-part="${CSS.escape(partId)}"]`); if (sec) { requestAnimationFrame(() => scrollToEl(sec, false)); return; } }
  if (first) window.scrollTo(0, 0);
}
SelListeners.add((id, o) => {
  if (R.view !== "biur" || o?.inDoc || !id) return;
  markNode(id); RD.sel = { node: id };
  if (MODE === "links") Conn.show(RD.sel, { quiet: true }); else if (MODE === "research") Dock.select(RD.sel, true);
});

/* ״עניינים בפרק״: בסוף כל פרק — הערכים ממפתח העניינים שהפרק עוסק בהם בעיקר (לפי משקל), כקישורים למפתח.
   נטען אחרי הביאור (data/topics.js), ואינו נוגע בנוסח עצמו. */
async function topicChips(d, art) {
  let T; try { T = await loadChunk("topics"); } catch (e) { return; }
  if (RD.art !== art) return;
  if (!T._byPart) {
    T._byPart = new Map();
    for (const t of T.terms) for (const [did, pid, w] of t.s) { const k = did + "|" + pid; if (!T._byPart.has(k)) T._byPart.set(k, []); T._byPart.get(k).push([t.t, w, t.n]); }
  }
  for (const sec of art.querySelectorAll("section.part")) {
    const pid = sec.dataset.part; if (!pid || pid === "sources" || pid === "open" || pid === "iyun") continue;
    // משקל 2 לפחות (הופעה חוזרת או בכותרת), ערכים נדירים קודם כשהמשקל שווה
    const xs = (T._byPart.get(d.id + "|" + pid) || []).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1] || a[2] - b[2]).slice(0, 6);
    if (!xs.length) continue;
    sec.append(h("p", { class: "tp-inline no-print", "aria-label": "עניינים בפרק" }, h("span", null, "עניינים בפרק:"),
      ...xs.map(([t]) => h("a", { href: mkHash(["topics", t], {}, { nomode: true }) }, t))));
  }
}


/* הקראה קולית — Web Speech API של הדפדפן (בלי שרת). קוראים בלוק אחר בלוק, מקטעים קצרים (דפדפנים חותכים הקראה ארוכה),
   מסמנים את הבלוק הנקרא וגוללים אליו. "הטעמה": פתיחת קיצורים ברורים, הפסקה אחרי כותרות ובין משפטים, גובה קול לכותרות.
   הקול הוא קול העברית שבמכשיר; הגייה אשכנזית אינה נתמכת בדפדפן. */
const Tts = (() => {
  const SS = window.speechSynthesis;
  // פתיחת ראשי תיבות וקיצורים: מילון + קידומות (ו, ב, ה, ל, מ, כ, ש, ד) + תבניות (שנים, סעיף, חלק, פרק).
  const D = {
    "אדמו״ר": "אדמור", "אדה״ז": "אדמור הזקן", "אדה״ר": "אדם הראשון", "הרש״ב": "הרבי רבי שלום דובער", "הריי״צ": "הרבי רבי יוסף יצחק",
    "הצ״צ": "הצמח צדק", "הבעש״ט": "הבעל שם טוב", "מהר״ש": "רבי שמואל", "רש״י": "רשי", "הקב״ה": "הקדוש ברוך הוא", "ע״י": "על ידי",
    "ע״פ": "על פי", "ע״ד": "על דרך", "ד״ה": "דיבור המתחיל", "ש״פ": "שבת פרשת", "כו׳": "וכולי", "וכו׳": "וכולי", "גו׳": "וגומר",
    "המו״ל": "המוציא לאור", "ג״כ": "גם כן", "הנ״ל": "הנזכר לעיל", "כנ״ל": "כנזכר לעיל", "י״ל": "יש לומר", "חב״ד": "חבד",
    "כ״ק": "כבוד קדושת", "כמ״ש": "כמו שכתוב", "מ״ש": "מה שכתוב", "משא״כ": "משא כן", "לקו״ש": "לקוטי שיחות", "תו״מ": "תורת מנחם",
    "אוה״ת": "אור התורה", "חז״ל": "חכמינו זכרונם לברכה", "מבה״ח": "מברכים החודש", "ז״א": "זעיר אנפין", "ע״כ": "עד כאן",
    "צ״ל": "צריך להיות", "ואפ״ל": "ואפשר לומר", "אפ״ל": "אפשר לומר", "שמח״ת": "שמחת תורה", "ואח״כ": "ואחר כך", "אח״כ": "אחר כך",
    "א״כ": "אם כן", "וא״כ": "ואם כן", "לע״ל": "לעתיד לבוא", "עי״ז": "על ידי זה", "בג״ע": "בגן עדן", "נ״ע": "נשמתו עדן", "ב״ה": "ברוך השם",
    "ח״ו": "חס ושלום", "סה״מ": "ספר המאמרים", "א״ס": "אין סוף", "ח״ע": "חכמה עילאה", "מ״ה": "מה", "מ״מ": "מכל מקום", "טו״ר": "טוב ורע",
    "ית׳": "יתברך", "נק׳": "נקרא", "בחי׳": "בחינת", "אלקי׳": "אלקית", "פנימי׳": "פנימית", "דאצי׳": "דאצילות", "הוי׳": "הויה", "מל׳": "מלכות",
    "חכ׳": "חכמה", "עמ׳": "עמוד", "ע׳": "עמוד", "ר׳": "רבי", "סי׳": "סימן", "ס׳": "סעיף", "ה׳": "השם", "הי׳": "היה", "יהי׳": "יהיה",
    "שיהי׳": "שיהיה", "שהי׳": "שהיה", "ז״ל": "זכרונו לברכה", "ע״ה": "עליו השלום", "כ״ז": "כל זה", "ר״ל": "רוצה לומר", "הלכ׳": "הלכה",
    "ת״ח": "תלמיד חכם", "תנצב״ה": "תהא נשמתו צרורה בצרור החיים", "בע״ה": "בעזרת השם", "אי״ה": "אם ירצה השם", "ב״ב": "בבא בתרא",
    "פרק׳": "פרק", "וגו׳": "וגומר", "וכד׳": "וכדומה", "וכיו״ב": "וכיוצא בזה", "לדוגמ׳": "לדוגמה", "מוהרש״ב": "מוהר שלום דובער",
    "ע״ש": "על שם", "ע״ז": "על זה", "ע״ג": "על גבי", "בד״כ": "בדרך כלל", "בכ״מ": "בכל מקום", "וש״נ": "ושאר מקומות", "ועוד״": "ועוד",
  };
  const PRE = "ובהלמכשד";
  const isGem = w => /^[א-ת]{1,3}$/.test(w);
  const gem = w => { let n = 0; const m = { א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ך:20,ל:30,מ:40,ם:40,נ:50,ן:50,ס:60,ע:70,פ:80,ף:80,צ:90,ץ:90,ק:100,ר:200,ש:300,ת:400 }; for (const c of w) n += m[c] || 0; return n; };
  function expandToken(raw) {
    let t = raw.replace(/["]/g, "״").replace(/[']/g, "׳");
    t = t.replace(/^[״׳]+/, "").replace(/[״]+$/, "");              // סימני ציטוט בקצוות
    if (D[t]) return D[t];
    for (let k = 1; k <= 2 && k < t.length; k++) {                    // קידומות
      const p = t.slice(0, k), r = t.slice(k);
      if ([...p].every(c => PRE.includes(c)) && D[r]) return p + D[r];
    }
    let m;
    if ((m = t.match(/^ס״([א-ת]{1,2})$/))) return "סעיף " + gem(m[1]);
    if ((m = t.match(/^פ״([א-ת]{1,2})$/))) return "פרק " + gem(m[1]);
    if ((m = t.match(/^ח״([א-ת])$/)) && m[1] !== "ו" && m[1] !== "ע") return "חלק " + gem(m[1]);
    if ((m = t.match(/^[הבמלכש]?׳?(ת[א-ת]{0,3}״[א-ת])$/))) return m[1].replace("״", "");   // שנים: תשל״ז → תשלז
    if (/״/.test(t)) return t.replace(/״/g, "");                      // ראשי תיבות אחרים: בלי גרשיים, שיקרא כמילה
    if (/׳$/.test(t) && t.length > 2) return t.replace(/׳$/, "");
    return t;
  }
  function expandAbbr(text) { return text.replace(/[א-ת"״׳']+/g, w => /[א-ת]/.test(w) ? expandToken(w) : w); }
  const st = { open: false, blocks: [], i: 0, playing: false, bar: null, art: null, rate: +(lsGet("chv-tts-rate") || 0.95), voice: lsGet("chv-tts-voice") || "", emph: lsGet("chv-tts-emph") !== "0", gen: 0 };
  const supported = !!(SS && window.SpeechSynthesisUtterance);

  function clean(el, emph) {
    const c = el.cloneNode(true);
    c.querySelectorAll(".pcopy,sup,button,svg,[aria-hidden='true'],.no-print,script,style").forEach(n => n.remove());
    let t = c.textContent.replace(/\[[^\]]{0,80}\]/g, " ").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
    if (emph) t = expandAbbr(t);
    return t;
  }
  function collect(art) {
    const sel = "h1,h2,h3,h4,p,li,blockquote,tr";
    const all = [...art.querySelectorAll(sel)];
    return all.filter(e => !e.closest(".no-print,[hidden]") && (e.tagName === "TR" ? !e.querySelector("tr,p,li") : !e.querySelector(sel)))
      .filter(e => clean(e, false).length > 1);
  }
  function chunks(t) {
    const parts = t.match(/[^.!?:;]+[.!?:;]*/g) || [t], out = [];
    let cur = "";
    for (const p of parts) {
      if ((cur + p).length > 190 && cur) { out.push(cur); cur = p; } else cur += p;
    }
    if (cur.trim()) out.push(cur);
    return out.flatMap(s => { const r = []; while (s.length > 230) { let k = s.lastIndexOf(" ", 200); if (k < 60) k = 200; r.push(s.slice(0, k)); s = s.slice(k); } r.push(s); return r; });
  }
  function pickVoice() {
    const vs = SS.getVoices();
    return vs.find(v => v.voiceURI === st.voice) || vs.find(v => /^he|^iw/i.test(v.lang)) || null;
  }
  function mark(i) {
    st.art?.querySelectorAll(".tts-cur").forEach(n => n.classList.remove("tts-cur"));
    const b = st.blocks[i]; if (!b) return;
    b.classList.add("tts-cur");
    const r = b.getBoundingClientRect();
    if (r.top < 90 || r.bottom > innerHeight - 110) b.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    refresh();
  }
  function speakBlock() {
    const my = ++st.gen;
    if (st.i >= st.blocks.length) { stop(); return; }
    const el = st.blocks[st.i], head = /^H[1-4]$/.test(el.tagName);
    const parts = chunks(clean(el, st.emph));
    mark(st.i);
    let k = 0;
    const next = () => {
      if (my !== st.gen || !st.playing) return;
      if (k >= parts.length) { st.i++; setTimeout(() => { if (my === st.gen && st.playing) speakBlock(); }, st.emph ? (head ? 450 : 250) : 0); return; }
      const u = new SpeechSynthesisUtterance(parts[k++]);
      const v = pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "he-IL";
      u.rate = st.rate; u.pitch = st.emph && head ? 1.12 : 1;
      u.onend = next;
      u.onerror = e => { if (e.error === "interrupted" || e.error === "canceled") return; st.playing = false; refresh(); };
      SS.speak(u);
    };
    next();
  }
  function startIndex() {
    const idx = st.blocks.findIndex(b => b.getBoundingClientRect().top >= 60);
    return idx < 0 ? 0 : idx;
  }
  function play(from) {
    if (!supported) return;
    SS.cancel(); st.gen++;
    st.blocks = collect(st.art);
    st.i = from ?? (st.i < st.blocks.length && st.paused ? st.i : startIndex());
    st.paused = false; st.playing = true; refresh(); speakBlock();
  }
  function pause() { SS.cancel(); st.gen++; st.playing = false; st.paused = true; refresh(); }
  function stop() { if (supported) SS.cancel(); st.gen++; st.playing = false; st.paused = false; st.art?.querySelectorAll(".tts-cur").forEach(n => n.classList.remove("tts-cur")); refresh(); }
  function skip(d) { if (!st.blocks.length) st.blocks = collect(st.art); st.i = clamp(st.i + d, 0, st.blocks.length - 1); play(st.i); }

  let ui = {};
  function refresh() {
    if (!st.bar) return;
    ui.pp.textContent = st.playing ? "⏸" : "▶";
    ui.pp.setAttribute("aria-label", st.playing ? "השהה הקראה" : "הפעל הקראה");
    ui.pos.textContent = st.blocks.length ? `${Math.min(st.i + 1, st.blocks.length)} / ${st.blocks.length}` : "";
  }
  function buildBar() {
    const voices = () => SS.getVoices();
    ui.pp = h("button", { class: "tts-b", type: "button", onclick: () => st.playing ? pause() : play() }, "▶");
    ui.pos = h("span", { class: "tts-pos" });
    ui.rate = h("input", { type: "range", min: "0.6", max: "1.5", step: "0.05", value: String(st.rate), "aria-label": "מהירות", oninput: e => { st.rate = +e.target.value; lsSet("chv-tts-rate", st.rate); ui.rl.textContent = st.rate.toFixed(2) + "×"; } });
    ui.rl = h("span", { class: "tts-pos" }, st.rate.toFixed(2) + "×");
    ui.sel = h("select", { "aria-label": "קול", onchange: e => { st.voice = e.target.value; lsSet("chv-tts-voice", st.voice); if (st.playing) play(st.i); } });
    const fill = () => {
      const all = voices(), he = all.filter(v => /^he|^iw/i.test(v.lang)), other = all.filter(v => !he.includes(v));
      ui.sel.replaceChildren();
      const opt = v => h("option", { value: v.voiceURI, selected: (st.voice ? v.voiceURI === st.voice : v === (he[0] || all[0])) || null }, v.name + " · " + v.lang);
      if (he.length) ui.sel.append(h("optgroup", { label: "עברית" }, he.map(opt)));
      if (other.length) ui.sel.append(h("optgroup", { label: "שפות אחרות" }, other.map(opt)));
      if (!all.length) ui.sel.append(h("option", { value: "" }, "טוען קולות…"));
      ui.note.hidden = he.length > 0 || !all.length;
    };
    ui.note = h("div", { class: "tts-note", hidden: true }, "לא נמצא קול עברי בדפדפן הזה. אפשר להתקין קול עברי בהגדרות המערכת (או לנסות Chrome / Edge / Safari).");
    ui.em = h("label", { class: "tts-em" }, h("input", { type: "checkbox", checked: st.emph || null, onchange: e => { st.emph = e.target.checked; lsSet("chv-tts-emph", st.emph ? "1" : "0"); if (st.playing) play(st.i); } }), "הטעמה (פתיחת קיצורים והפסקות)");
    const bar = h("div", { class: "tts no-print", role: "region", "aria-label": "הקראה קולית" },
      h("div", { class: "tts-row" },
        h("button", { class: "tts-b", type: "button", "aria-label": "פסקה קודמת", onclick: () => skip(-1) }, "⏮"), ui.pp,
        h("button", { class: "tts-b", type: "button", "aria-label": "פסקה הבאה", onclick: () => skip(1) }, "⏭"),
        h("button", { class: "tts-b", type: "button", "aria-label": "עצור", onclick: stop }, "⏹"),
        ui.pos, h("span", { class: "tts-sp" }), ui.rate, ui.rl,
        h("button", { class: "tts-b", type: "button", "aria-label": "סגור", onclick: close }, "✕")),
      h("div", { class: "tts-row tts-row2" }, ui.sel, ui.em), ui.note);
    fill(); SS.addEventListener?.("voiceschanged", fill); setTimeout(fill, 400); setTimeout(fill, 1500);
    return bar;
  }
  function open(art) {
    if (!supported) return;
    st.art = art;
    if (!st.bar) st.bar = buildBar();
    document.body.append(st.bar); st.open = true; st.blocks = collect(art); st.i = 0; refresh();
  }
  function close() { stop(); st.bar?.remove(); st.open = false; st.art = null; }
  function button(art) {
    if (!supported) return null;
    return h("button", { class: "linkbtn no-print tts-open", type: "button", onclick: () => { if (st.open && st.art === art) { close(); } else { close(); open(art); play(); } } }, icon("i-speaker"), "הקראה");
  }
  return { button, close, stop };
})();


/* חברותא · מצב ״קשרים״ (לוח קשרים בסגנון ספריא) ולוח החקר שבתוך ביאור */

const GAB = ["בעש״ט", "אדה״ז", "אמצעי", "צ״צ", "מהר״ש", "רש״ב", "ריי״צ", "הרבי"];

/** קשתות מיניאטוריות: הפריט הנבחר וקרוביו על ציר הדורות (הדור הראשון מימין) */
function arcMini(n, onpick) {
  const W = 320, H = 104, pad = 12, base = 66, slot = (W - 2 * pad) / 8;
  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "arcmini", role: "img", "aria-label": "קשתות בין הפריט לפריטים הקרובים אליו, לפי דורות" });
  const sx = g => W - pad - (g < 0 ? 7.5 : g + .5) * slot;
  for (let g = 0; g < 8; g++) {
    sv("line", { x1: sx(g) + slot / 2, x2: sx(g) + slot / 2, y1: base - 4, y2: base + 4, class: "ax" }, svg);
    const t = sv("text", { x: sx(g), y: base + 20, "text-anchor": "middle", class: g === n.g ? "on" : "" }, svg); t.textContent = GAB[g];
  }
  sv("line", { x1: pad, x2: W - pad, y1: base, y2: base, class: "axis" }, svg);
  const rel = new Map();
  for (const e of (S.edgesOut.get(n.id) || [])) rel.set(e[1], e[2]);
  for (const e of (S.edgesIn.get(n.id) || [])) if (!rel.has(e[0])) rel.set(e[0], e[2]);
  const near = neighborsOf(n).filter(o => !rel.has(o.id));
  const pos = new Map(); const placed = {};
  const put = (o, strong) => {
    const k = o.g; const i = (placed[k] = (placed[k] || 0) + 1) - 1; const per = 5;
    const off = ((i % per) - (per - 1) / 2) * (slot / per * .9);
    const x = sx(o.g) + off; pos.set(o.id, { x, o, strong }); return x;
  };
  put(n, true);
  [...rel.keys()].map(getNode).filter(Boolean).slice(0, 14).forEach(o => put(o, true));
  near.sort((a, b) => Math.abs(a.g - n.g) - Math.abs(b.g - n.g)).slice(0, 10).forEach(o => put(o, false));
  const a = pos.get(n.id);
  for (const [id, p] of pos) {
    if (id === n.id) continue;
    const dx = Math.abs(p.x - a.x); const lift = Math.min(46, 8 + dx * .22);
    const k = rel.get(id);
    sv("path", { d: `M${a.x},${base} C${a.x},${base - lift * 1.3} ${p.x},${base - lift * 1.3} ${p.x},${base}`, class: "arc" + (p.strong ? " strong k" + (k ?? 0) : ""), fill: "none" }, svg);
  }
  for (const [id, p] of pos) {
    const g = sv("g", { class: "adot" + (id === n.id ? " me" : "") + (p.strong ? "" : " weak"), transform: `translate(${p.x},${base})`, tabindex: id === n.id ? "-1" : "0", role: "button", "aria-label": nodeTitle(p.o, 60) }, svg);
    sv("circle", { r: id === n.id ? 5.2 : 3.4, fill: gcol(p.o.g) }, g);
    const tt = sv("title", null, g); tt.textContent = `${nodeTitle(p.o, 60)} · ${p.o.rb}`;
    if (id !== n.id && onpick) { g.addEventListener("click", () => onpick(id)); g.addEventListener("keydown", e => { if (e.key === "Enter") onpick(id); }); }
  }
  return svg;
}

function occurrenceRows(n, onpick) {
  const ul = h("ul", { class: "occ" });
  const els = RD.art ? $$(`[data-n="${CSS.escape(n.id)}"]`, RD.art) : [];
  const main = els.filter(e => !els.some(o => o !== e && o.contains(e)));
  main.slice(0, 12).forEach((el, i) => {
    const blk = el.closest("p,li,blockquote,tr") || el;
    const sec = el.closest("section.part");
    ul.append(h("li", null, h("button", { class: "occ-i", onclick: () => { const tr = el.closest("tr"); tr?.classList.add("open"); scrollToEl(el, true); markSelEl(el); } },
      h("small", null, sec ? partTitle(RD.data, sec.dataset.part) : ""), h("span", null, trunc((el.textContent || blk.textContent || "").replace(/\s+/g, " "), 110)))));
  });
  if (main.length > 12) ul.append(h("li", { class: "note" }, `ועוד ${main.length - 12} מקומות`));
  return { ul, count: main.length };
}

const Conn = {
  host: null, cur: null, hist: [], filter: "all",
  render(host) { this.host = host; this.draw(); },
  show(sel, o = {}) {
    if (!o.quiet && this.cur && JSON.stringify(this.cur) !== JSON.stringify(sel)) this.hist.push(this.cur);
    if (this.hist.length > 30) this.hist.shift();
    this.cur = sel;
    if (!this.host?.isConnected) return;
    this.draw();
  },
  back() { const p = this.hist.pop(); if (p) { this.cur = p; this.draw(); if (p.node) { S.selNode = p.node; markNode(p.node); } } },
  draw() {
    const host = this.host; if (!host) return;
    const sel = this.cur;
    const head = h("header", { class: "conn-h" }, h("h2", null, "קשרים"),
      this.hist.length ? h("button", { class: "linkbtn", onclick: () => this.back() }, icon("i-back"), "חזרה") : null);
    const body = h("div", { class: "conn-b" });
    host.replaceChildren(h("div", { class: "conn" }, head, body));
    if (!sel) { body.append(h("div", { class: "empty-aside" }, h("b", null, "בחרו קטע"), h("p", null, "לחיצה על פסקה, על ציטוט, על שורה בטבלה או על פריט מקור פותחת כאן את הקשרים שלהם: איפה עוד נאמר, מי ביאר את אותו מקור, ומה אמרו הדורות הסמוכים."), h("p", { class: "hint" }, "קיצור: מקש 1 חוזר לקריאה בלי לוח."))); return; }
    if (sel.para) {
      const el = RD.art.querySelector("#" + CSS.escape(sel.para));
      const ids = [...new Set($$("[data-n]", el || document.createElement("p")).map(e => e.dataset.n))].filter(getNode);
      const sec = el?.closest("section.part");
      body.append(h("div", { class: "para-h" }, h("small", null, sec ? partTitle(RD.data, sec.dataset.part) : "פסקה"), h("p", { class: "para-q" }, trunc(el?.textContent || "", 150)),
        h("button", { class: "linkbtn", onclick: () => copyText(absUrl(mkHash(["biur", RD.meta.id, sec?.dataset.part || ""].filter(Boolean), { a: sel.para }))) }, icon("i-link"), "העתק קישור לפסקה")));
      body.append(h("h3", { class: "conn-sec" }, ids.length ? `${ids.length} פריטי מקור בפסקה` : "אין בפסקה זו הפניות למקורות"));
      const ul = h("div", { class: "rows" }); ids.forEach(i => ul.append(itemRow(getNode(i), { onclick: () => this.show({ node: i }) }))); body.append(ul);
      return;
    }
    const n = sel.node ? getNode(sel.node) : null;
    if (sel.ex && RD.data.ex[sel.ex]) {
      const [page, pdf, url, , topic, text] = RD.data.ex[sel.ex];
      body.append(h("blockquote", { class: "ex-q" }, h("small", null, h("b", { dir: "ltr" }, sel.ex), " · ", [page ? "ע׳ " + page : "", topic].filter(Boolean).join(" · ")), h("p", null, text), url ? h("a", { class: "linkbtn", href: url, target: "_blank", rel: "noopener noreferrer" }, "פתח במקור", icon("i-ext")) : null));
    }
    if (!n) { if (!sel.ex) body.append(h("p", { class: "note" }, "אין פריט מקור משויך.")); return; }
    this.nodeBody(body, n);
  },
  nodeBody(body, n, o = {}) {
    body.append(itemHead(n, { max: 110, noSub: !!o.compact }));
    const acts = h("div", { class: "acts tight" });
    if (n.u) acts.append(h("a", { class: "btn", href: n.u, target: "_blank", rel: "noopener noreferrer" }, "פתח במקור", icon("i-ext")));
    acts.append(h("a", { class: "btn", href: mkHash(["item", n.id]) }, "עמוד הפריט"));
    body.append(acts);
    body.append(h("div", { class: "arcwrap" }, arcMini(n, id => this.show({ node: id })), h("small", null, "הקשתות מחברות את הפריט להפניות במפה ולפריטים שנוגעים באותם נושאים, לפי דורות (הדור הראשון מימין).")));
    // קבוצות
    const inDoc = R.view === "biur" && RD.art?.isConnected;
    const occ = inDoc ? occurrenceRows(n, null) : { ul: null, count: 0 };
    const exs = inDoc && RD.data ? Object.entries(RD.data.ex).filter(([, v]) => v[3] === n.id) : [];
    const rows = docsOfNode(n.id).map(r => [getDoc(r[0]), r[1]]).filter(r => r[0] && (!inDoc || r[0].id !== RD.meta?.id));
    const pri = d => d.kind === "verse" ? d.order : d.kind === "chain" ? 100 + d.seq : 200 + d.n;
    rows.sort((a, b) => pri(a[0]) - pri(b[0]));
    const nb = neighborsOf(n); const byG = {}; nb.forEach(o2 => (byG[o2.g] = byG[o2.g] || []).push(o2));
    const gk = Object.keys(byG).map(Number).sort((a, b) => Math.abs(a - n.g) - Math.abs(b - n.g) || a - b);
    const edges = (S.edgesOut.get(n.id) || []).length + (S.edgesIn.get(n.id) || []).length;
    const kinds = [["all", "הכול", null], ...(inDoc ? [["quote", "בטקסט", occ.count + exs.length]] : []), ["biur", "ביאורים", rows.length], ["gen", "דורות", nb.length], ["ref", "הפניות", edges]];
    const bar = h("div", { class: "fbar", role: "group", "aria-label": "סינון הקשרים לפי סוג" });
    const secs = [];
    const apply = f => { this.filter = f; if (f === "quote" && !inDoc) f = "all"; bar.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === f)); secs.forEach(s => s.hidden = !(f === "all" || s.dataset.k === f)); };
    for (const [k, l, c] of kinds) bar.append(h("button", { class: "fchip", "data-k": k, "aria-pressed": k === this.filter, onclick: () => apply(k) }, l, c != null ? h("small", null, c) : null));
    body.append(bar);
    const mkSec = (k, title, content) => { const s = h("section", { class: "conn-s", "data-k": k }, h("h3", { class: "conn-sec" }, title), content); secs.push(s); body.append(s); return s; };
    // בטקסט
    const q = h("div", null);
    if (occ.count) q.append(occ.ul); else q.append(h("p", { class: "note" }, "הפריט אינו מצוטט בביאור הזה."));
    for (const [id, v] of exs.slice(0, 6)) q.append(h("details", { class: "exd" }, h("summary", null, h("b", { dir: "ltr" }, id), " ", v[0] ? "ע׳ " + v[0] + " · " : "", trunc(v[5], 70)), h("p", null, v[5])));
    if (inDoc) mkSec("quote", "ציטוטים בביאור הזה", q);
    // ביאורים אחרים
    const bl = h("div", { class: "rows" });
    if (!rows.length) bl.append(h("p", { class: "note" }, "לא נמצא ביאור אחר שמנתח את המקור הזה."));
    for (const [doc, plist] of rows) {
      const tot = plist.reduce((s, p) => s + p[1], 0), pk = plist[0]?.[2][0];
      const sn = plist.flatMap(p => p[2]).find(p => p[3]);
      bl.append(h("button", { class: "bcard", onclick: () => jumpTo(doc.id, plist[0]?.[0] || "", pk ? pk[0] : "", n.id) },
        h("b", null, trunc(docShort(doc), 70)), h("small", null, (doc.kind === "verse" ? docWhere(doc) : "שרשרת") + (tot ? " · " + tot + " אזכורים" : " · משויך ליחידה") + (plist[0] ? " · " + partTitle(doc, plist[0][0]) : "")),
        sn ? h("q", null, trunc(sn[3], 130)) : null));
    }
    mkSec("biur", inDoc ? "ביאורים אחרים שדנים בו" : "הביאורים שדנים בו", bl);
    // דורות סמוכים
    const gb = h("div", { class: "gnb" });
    if (!nb.length) gb.append(h("p", { class: "note" }, "אין פריטים שכנים באותה יחידה או שרשרת."));
    for (const g of gk) {
      const list = byG[g].sort((a, b) => (a.y || 9999) - (b.y || 9999));
      const grp = h("div", { class: "gnb-g" }, h("h4", null, GS[g], h("small", null, g === n.g ? " · אותו דור" : g === n.g - 1 ? " · הדור הקודם" : g === n.g + 1 ? " · הדור הבא" : ""), h("small", { class: "cnt" }, list.length)));
      const more = list.slice(4);
      list.slice(0, 4).forEach(o2 => grp.append(itemRow(o2, { max: 56, onclick: () => this.show({ node: o2.id }) })));
      if (more.length) { const det = h("details", null, h("summary", null, `עוד ${more.length}`)); more.forEach(o2 => det.append(itemRow(o2, { max: 56, onclick: () => this.show({ node: o2.id }) }))); grp.append(det); }
      gb.append(grp);
    }
    mkSec("gen", "הדורות הסמוכים", gb);
    // הפניות במפה
    const rl = relatedList(n.id, id => this.show({ node: id }));
    mkSec("ref", "הפניות במפה", rl || h("p", { class: "note" }, "אין הפניות מסומנות בין פריט זה לפריטים אחרים."));
    apply(this.filter);
  },
};

/* ---------- מצב חקר בתוך ביאור ---------- */
const Dock = {
  host: null, tab: "lineage", sel: null, lin: null,
  render(host) { this.host = host; this.draw(); },
  select(sel, quiet) { this.sel = sel; if (sel?.node) { S.selNode = sel.node; markNode(sel.node); } if (this.host?.isConnected) this.draw(); },
  draw() {
    const host = this.host, d = RD.meta; if (!host || !d) return;
    const ids = (S.links.d[d.id] || []);
    const tabs = h("div", { class: "tabs", role: "tablist" });
    for (const [id, l] of [["lineage", "שלשלת"], ["items", "פריטים"], ["ctl", "בקרה"]]) tabs.append(h("button", { role: "tab", "aria-selected": id === this.tab, onclick: () => { this.tab = id; this.draw(); } }, l));
    const body = h("div", { class: "dock-b" });
    host.replaceChildren(h("div", { class: "dock" }, h("header", { class: "conn-h" }, h("h2", null, "חקר הביאור"), h("small", null, ids.length + " פריטים")), tabs, body));
    const n = this.sel?.node ? getNode(this.sel.node) : null;
    if (this.tab === "lineage") {
      if (!ids.length) { body.append(h("p", { class: "note" }, "לביאור זה לא שויכו פריטי מקור.")); return; }
      body.append(h("p", { class: "note" }, "הפריטים שבביאור לפי דורות. לחיצה על פריט מסמנת בטקסט את כל מקומותיו."));
      this.lin = Lineage.create(ids.map(getNode).filter(Boolean), { compact: true, sel: n?.id, onPick: id => { this.sel = { node: id }; S.selNode = id; markNode(id); const m = RD.matches[0]; if (m) { m.closest("tr")?.classList.add("open"); scrollToEl(m, true); } this.draw(); } });
      body.append(this.lin.el);
      this.lin.layout();
      if (n) { const box = h("div", { class: "dock-sel" }); body.append(box); Conn.nodeBody(box, n, { compact: true }); }
    } else if (this.tab === "items") {
      const list = h("div", { class: "rows" });
      ids.map(getNode).filter(Boolean).sort((a, b) => (a.g < 0 ? 9 : a.g) - (b.g < 0 ? 9 : b.g) || (a.y || 9999) - (b.y || 9999)).forEach(x => list.append(itemRow(x, { cls: x.id === n?.id ? "on" : "", onclick: () => { this.sel = { node: x.id }; S.selNode = x.id; markNode(x.id); const m = RD.matches[0]; if (m) scrollToEl(m, true); this.tab = "lineage"; this.draw(); } })));
      body.append(list);
    } else {
      const doc = RD.data, st = S.core.status.details[d.key];
      body.append(h("div", { class: "conn-sec" }, "מצב הבקרה"), h("div", null, stateChip(d)));
      if (st) body.append(h("div", { class: "prose small", html: proseHtml(st) }));
      else if (d.sl || S.docs.get(d.parent)?.sl) body.append(h("p", { class: "prose small" }, d.sl || S.docs.get(d.parent).sl));      // שורת המצב שבראש הביאור (פרשות שאינן בראשית)
      else body.append(h("p", { class: "note" }, "אין פירוט סטטוס נפרד ליחידה זו."));
      const open = doc.parts.find(p => p.id === "open" || /פתוח לבקרה|שאלות שנבדקו/.test(p.title));
      if (open) body.append(h("p", null, h("button", { class: "btn", onclick: () => { Aside.close(); gotoPart(d, open.id, true); } }, icon("i-flag"), "קפיצה אל ״שאלות שנבדקו״")));
      if (d.rounds?.length) { body.append(h("h3", { class: "conn-sec" }, "סבבים")); d.rounds.forEach((r, i) => body.append(h("p", { class: "round" }, h("b", null, (i + 1) + ". "), r))); }
    }
  },
};


/* חברותא · מצב ״חקר״: שלשלת דורות, מטריצת פסוק × דורות, מפה משנית, מקורות וסטטוס */

/* ---------- עמודת פריט (לחקר ולמקורות) ---------- */
const Side = {
  el: null,
  mount(host) { this.el = h("aside", { class: "side", "aria-label": "כרטיס פריט", hidden: "" }); host.append(this.el); return this.el; },
  show(id) {
    const n = getNode(id); if (!this.el || !n) return;
    S.selNode = id;
    const body = h("div", { class: "side-b" });
    this.el.replaceChildren(h("header", { class: "conn-h" }, h("h2", null, "פריט"), h("button", { class: "icon-btn", "aria-label": "סגירה", onclick: () => this.close() }, icon("i-x"))), body);
    Conn.nodeBody(body, n);
    body.append(h("div", { class: "acts" }, h("button", { class: "btn primary", onclick: () => openInBiur(id) }, icon("i-book"), "פתח בביאור"), h("button", { class: "btn", onclick: () => copyText(absUrl(mkHash(["item", id]))) }, icon("i-link"), "העתק קישור")));
    this.el.hidden = false; this.el.parentElement?.classList.add("has-side"); document.body.classList.add("sheet-open");
    this.el.scrollTop = 0;
  },
  close() { if (!this.el) return; this.el.hidden = true; this.el.parentElement?.classList.remove("has-side"); document.body.classList.remove("sheet-open"); for (const f of SelListeners) f(null, {}); },
};

/* ---------- שלשלת דורות ---------- */
const Lineage = {
  create(nodes, o = {}) {
    const st = { nodes, sel: o.sel || null, lines: !!o.lines, dense: !!o.dense || !!o.compact };
    const el = h("div", { class: "lin" + (o.compact ? " compact" : "") });
    const svg = sv("svg", { class: "lin-lines", "aria-hidden": "true" });
    const rows = h("div", { class: "lin-rows" });
    el.append(rows, svg);
    const chips = new Map();
    function build() {
      rows.replaceChildren(); chips.clear();
      const gens = [...new Set(st.nodes.map(n => n.g))].sort((a, b) => (a < 0 ? 99 : a) - (b < 0 ? 99 : b));
      let ord = 0;
      for (const g of gens) {
        const ns = st.nodes.filter(n => n.g === g);
        const row = h("section", { class: "lin-row", "data-g": g },
          h("header", { class: "lin-lab" }, g >= 0 ? h("i", { class: "ord" }, gem(++ord).replace(/[׳״]/g, "")) : h("i", { class: "ord" }, "?"), h("b", null, o.compact ? GS[g] : (S.core.gens[g] || "מחבר לא זוהה")), h("small", null, ns.length + " פריטים")));
        const body = h("div", { class: "lin-body" });
        const byRb = new Map(); ns.forEach(n => { const k = n.rb || "—"; if (!byRb.has(k)) byRb.set(k, []); byRb.get(k).push(n); });
        for (const [rb, list] of [...byRb].sort((a, b) => b[1].length - a[1].length)) {
          list.sort((a, b) => (a.y || 9999) - (b.y || 9999) || a.id.localeCompare(b.id));
          const grp = h("div", { class: "lin-grp" });
          if (byRb.size > 1 || !o.compact) grp.append(h("h4", null, rb === "—" ? "מחבר לא זוהה" : rb, h("small", null, list.length)));
          const cw = h("div", { class: "lin-chips" });
          for (const n of list) {
            const b = h("button", { class: "lchip" + (st.dense ? " dn" : ""), "data-id": n.id, "aria-pressed": n.id === st.sel, title: `${nodeTitle(n, 90)}\n${n.rb}${nodeYearLabel(n) ? " · " + nodeYearLabel(n) : ""} · ${CAT[n.cat].short}`, onclick: () => pick(n.id) });
            b.append(glyphSvg(n, st.dense ? 18 : 16));
            if (!st.dense) b.append(h("span", { class: "lt" }, trunc(cleanT(n.t), 30)), n.ys || n.yw || n.yp ? h("small", null, nodeYearLabel(n)) : null);
            chips.set(n.id, b); cw.append(b);
          }
          grp.append(cw); body.append(grp);
        }
        row.append(body); rows.append(row);
      }
    }
    function pick(id) { api.setSel(id); o.onPick?.(id); }
    function drawLines() {
      svg.replaceChildren();
      const R0 = el.getBoundingClientRect();
      svg.setAttribute("width", R0.width); svg.setAttribute("height", R0.height); svg.setAttribute("viewBox", `0 0 ${R0.width} ${R0.height}`);
      const edges = [];
      if (st.sel) { for (const e of (S.edgesOut.get(st.sel) || [])) edges.push([e, true]); for (const e of (S.edgesIn.get(st.sel) || [])) edges.push([e, true]); }
      if (st.lines) for (const e of S.core.edges) if (chips.has(e[0]) && chips.has(e[1])) edges.push([e, false]);
      const seen = new Set();
      for (const [e, hot] of edges) {
        const a = chips.get(e[0]), b = chips.get(e[1]); if (!a || !b) continue;
        const k = e[0] + ">" + e[1]; if (seen.has(k)) continue; seen.add(k);
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const ax = ra.left + ra.width / 2 - R0.left, ay = ra.top + ra.height / 2 - R0.top, bx = rb.left + rb.width / 2 - R0.left, by = rb.top + rb.height / 2 - R0.top;
        const dy = by - ay;
        const d = Math.abs(dy) < 8 ? `M${ax},${ay - 8} Q${(ax + bx) / 2},${ay - 8 - Math.min(40, Math.abs(ax - bx) * .25)} ${bx},${by - 8}`
          : `M${ax},${ay + Math.sign(dy) * 8} C${ax},${ay + dy * .55} ${bx},${by - dy * .55} ${bx},${by - Math.sign(dy) * 8}`;
        sv("path", { d, class: "ln k" + e[2] + (hot ? " hot" : "") }, svg);
        if (hot) { const oid = e[0] === st.sel ? e[1] : e[0]; chips.get(oid)?.classList.add("rel"); }
      }
    }
    const api = {
      el, st,
      setSel(id) { chips.forEach(c => { c.classList.remove("rel"); c.setAttribute("aria-pressed", "false"); }); st.sel = id; chips.get(id)?.setAttribute("aria-pressed", "true"); drawLines(); },
      setNodes(ns) { st.nodes = ns; build(); this.layout(); },
      setOpts(p) { Object.assign(st, p); build(); this.layout(); },
      layout() { requestAnimationFrame(() => { drawLines(); if (st.sel) chips.get(st.sel)?.setAttribute("aria-pressed", "true"); }); },
      reveal(id) { chips.get(id)?.scrollIntoView({ block: "center", behavior: "smooth" }); },
    };
    build();
    if (window.ResizeObserver) { let w = 0; new ResizeObserver(() => { const nw = el.clientWidth; if (nw && Math.abs(nw - w) > 6) { w = nw; drawLines(); } }).observe(el); }
    return api;
  },
};

/* ---------- סינון נפוץ ---------- */
function wsFilterBar(f, onchange, o = {}) {
  const bar = h("div", { class: "ws-filters", role: "group", "aria-label": "סינון" });
  const sel = (label, key, opts) => h("label", null, h("span", null, label), h("select", { onchange: e => { f[key] = e.target.value; onchange(); } }, ...opts.map(([v, l]) => h("option", { value: v, selected: f[key] === v }, l))));
  bar.append(sel("ביאור", "doc", [["", "כל הביאורים"], ...S.verseDocs.map(d => ["u:" + d.key, `${d.verses === "כללי" ? "כללי" : d.verses} · ${trunc(d.title, 36)}`]), ...S.chainDocs.map(d => ["c:" + d.key, "שרשרת · " + trunc(d.title, 36)])]),
    sel("סוג", "ty", [["", "הכול"], ...TYPES.map(t => [t, t])]),
    sel("מצב כיסוי", "st", [["", "הכול"], ...CATS.map(c => [c, CAT[c].short])]));
  if (o.extra) bar.append(...o.extra);
  return bar;
}
const wsPass = f => n => {
  if (f.doc) { const [k, key] = [f.doc[0], f.doc.slice(2)]; if (!(k === "u" ? n.un : n.ch).includes(key)) return false; }
  if (f.ty && n.ty !== f.ty && !(f.ty === "הגהות ורשימות" && n.ty === "אחר")) return false;
  if (f.st && n.cat !== f.st) return false;
  if (f.q) { const hay = norm([n.t, n.ti, n.rb, n.col, n.bk].join(" ")); if (!norm(f.q).split(" ").every(w => hay.includes(w))) return false; }
  return true;
};

/* ---------- מטריצה ---------- */
function matrixView(host, f) {
  const mode = f.mx || "units";
  const docs = mode === "chains" ? S.chainDocs : S.verseDocs.filter(d => d.range).concat(S.verseDocs.filter(d => !d.range));
  const nodes = S.pnodes.filter(wsPass({ ...f, doc: "" }));
  const key = d => d.key;
  const cell = {}; let max = 1;
  for (const d of docs) for (const g of GEN_IDS) { const ms = nodes.filter(n => n.g === g && (mode === "chains" ? n.ch : n.un).includes(key(d))); cell[d.id + "|" + g] = ms; max = Math.max(max, ms.length); }
  const seg = h("div", { class: "seg", role: "group", "aria-label": "שורות המטריצה" });
  for (const [v, l] of [["units", "יחידות פסוק"], ["chains", "שרשראות מאמרים"]]) if (v !== "units" || S.verseDocs.length) seg.append(h("button", { "aria-pressed": mode === v, onclick: () => { f.mx = v; host.replaceChildren(); matrixView(host, f); } }, l));
  const wrap = h("div", { class: "mx-wrap", tabindex: 0, role: "region", "aria-label": "מטריצת פסוק × דורות (גלילה לצדדים)" });
  const tbl = h("table", { class: "mx" });
  const head = h("tr", null, h("th", { scope: "col", class: "mx-c0" }, mode === "chains" ? "שרשרת" : "פסוקים וביאור"));
  GEN_IDS.forEach((g, i) => head.append(h("th", { scope: "col" }, h("b", null, GS[g]), h("small", null, "דור " + gem(i + 1).replace(/[׳״]/g, "")))));
  head.append(h("th", { scope: "col" }, h("b", null, "סה״כ")));
  tbl.append(h("thead", null, head));
  const tb = h("tbody"); let last = null;
  const detail = h("section", { class: "mx-detail", "aria-live": "polite", hidden: "" });
  for (const d of docs) {
    const grpLab = mode === "units" ? (d.range ? "פרק " + gem(d.range[0]).replace(/[׳״]/g, "") : "נושאים כלליים") : "";
    if (grpLab && grpLab !== last) { tb.append(h("tr", { class: "mx-grp" }, h("th", { colspan: 10 }, grpLab))); last = grpLab; }
    const tr = h("tr", null, h("th", { scope: "row", class: "mx-r" }, h("a", { href: mkHash(["biur", d.id]) }, trunc(d.title, 52)), h("small", null, mode === "chains" ? d.anchor : docWhere(d))));
    let tot = 0;
    for (const g of GEN_IDS) {
      const ms = cell[d.id + "|" + g]; tot += ms.length;
      const cov = ms.filter(n => n.cat === "covered").length;
      const td = h("td", null);
      if (ms.length) {
        td.append(h("button", { class: "mx-cell", style: { "--p": Math.round(6 + 44 * ms.length / max) + "%" }, title: `${GS[g]} · ${trunc(d.title, 40)}: ${ms.length} פריטים, ${cov} מכוסים`, "aria-label": `${GS[g]}, ${trunc(d.title, 40)}: ${ms.length} פריטים`,
          onclick: e => { tbl.querySelectorAll(".mx-cell.on").forEach(x => x.classList.remove("on")); e.currentTarget.classList.add("on"); showDetail(d, g, ms); } }, h("b", null, ms.length), h("i", { class: "covbar" }, h("u", { style: { width: (cov / ms.length * 100) + "%" } }))));
      } else td.append(h("span", { class: "mx-empty", "aria-label": "אין פריטים" }, "·"));
      tr.append(td);
    }
    tr.append(h("td", { class: "mx-tot" }, tot || "·")); tb.append(tr);
  }
  tbl.append(tb); wrap.append(tbl);
  function showDetail(d, g, ms) {
    detail.hidden = false;
    detail.replaceChildren(h("header", null, h("h3", null, `${GS[g]} · ${trunc(d.title, 60)}`), h("small", null, `${mode === "chains" ? d.anchor : docWhere(d)} · ${ms.length} פריטים`), h("a", { class: "linkbtn", href: mkHash(["biur", d.id]) }, "פתח את הביאור")),
      h("div", { class: "rows cols" }, ...ms.sort((a, b) => (a.y || 9999) - (b.y || 9999)).map(n => itemRow(n, { max: 70, tail: catChip(n), onclick: () => Side.show(n.id) }))));
    detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  host.append(h("div", { class: "mx-bar" }, S.verseDocs.length ? seg : null, h("p", { class: "note" }, "כל תא מספר את הפריטים של הדור באותה יחידה. עוצמת הגוון = כמות; הפס הדק = כמה מהם מכוסים במלואם. לחיצה על תא פותחת את הרשימה.")), wrap, detail);
}

/* ---------- מפה (משנית) ---------- */
function mapView(host, f, o) {
  const gens = new Set(GEN_IDS.concat([-1]));
  const bar = h("div", { class: "ws-filters" });
  const gb = h("div", { class: "fbar" });
  for (const g of GEN_IDS) gb.append(h("button", { class: "fchip", "aria-pressed": true, onclick: e => { gens.has(g) ? gens.delete(g) : gens.add(g); e.currentTarget.setAttribute("aria-pressed", gens.has(g)); refresh(); } }, h("i", { class: "dot", style: { "--gc": gcol(g) } }), GS[g]));
  let edges = false;
  const eb = h("button", { class: "fchip", "aria-pressed": false, onclick: e => { edges = !edges; e.currentTarget.setAttribute("aria-pressed", edges); inst.drawEdges(); } }, "הצג קשרים");
  bar.append(gb, eb);
  const scroller = h("div", { class: "mapscroll", tabindex: 0, "aria-label": "המפה: חצים לתנועה בין פריטים, Enter לפתיחת כרטיס" });
  const legend = h("div", { class: "legend", "aria-label": "מקרא" }, h("span", null, "צורה:"));
  const mk = (ty, cat) => { const s = sv("svg", { viewBox: "-11 -11 22 22", width: 16, height: 16 }); drawMark(s, { id: "", ty, cat, g: 4 }, 7).querySelector(".halo")?.remove(); return s; };
  legend.append(h("span", null, mk("מאמר", "covered"), "מאמר"), h("span", null, mk("הנחה", "covered"), "הנחה"), h("span", null, mk("שיחה", "covered"), "שיחה"), h("span", null, mk("מכתב", "covered"), "מכתב והגהות"),
    h("span", { class: "sp" }, "כיסוי:"), h("span", null, mk("מאמר", "covered"), "מלא"), h("span", null, mk("מאמר", "mentioned"), "הוזכר בלבד"), h("span", null, mk("מאמר", "excluded"), "הושמט"), h("span", null, "גוון כהה יותר = דור מאוחר יותר; השורות מסומנות בשם הדור."));
  host.append(h("p", { class: "note" }, "מבט כולל משני: כל פריט במקומו לפי שנת האמירה. הקריאה והחקר העיקריים נעשים בשלשלת ובמטריצה."), bar, scroller, legend);
  const pass = filterPass(f);
  const inst = new MapInst(scroller, { nodes: S.pnodes, passes: n => pass(n) && gens.has(n.g), edges: () => edges, onSelect: id => { selectNode(id, { open: true }); Side.show(id); } });
  function filterPass(f) { const p = wsPass(f); return n => p(n); }
  function refresh() { inst.pass = n => pass(n) && gens.has(n.g); inst.refresh(); }
  SelListeners.add(o.listener = (id, oo) => { if (!scroller.isConnected) SelListeners.delete(o.listener); });
  o.inst = inst;
}

/* ---------- סביבת העבודה ---------- */
const Workspace = {
  tabs: [["lineage", "שלשלת דורות"], ["matrix", "פסוק × דורות"], ["books", "הביאורים"], ["map", "מפה"], ["sources", "מקורות"], ["status", "סטטוס וכיסוי"]],
  async render(main, q, ctx) {
    document.title = "חקר · פרשת " + S.par + " · חברותא";
    const tab = this.tabs.some(t => t[0] === q.get("tab")) ? q.get("tab") : "lineage";
    main.className = "main ws-main";
    const mx0 = S.verseDocs.length ? "units" : "chains";        // בפרשה בלי יחידות פסוק (נח) — שורות המטריצה הן השרשראות
    const f = { doc: q.get("doc") || "", ty: q.get("ty") || "", st: q.get("st") || "", q: "", mx: q.get("mx") || mx0 };
    const head = h("header", { class: "ws-h" },
      h("div", null, h("nav", { class: "crumbs", "aria-label": "מיקום" }, h("a", { href: mkHash(["home"]) }, "חברותא"), h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("a", { href: mkHash(parRoot(), { mode: "read" }) }, "פרשת " + S.par)),
        h("h1", null, "חקר פרשת " + S.par), h("p", null, `${fmt(S.pnodes.length)} פריטי מקור משבעה דורות, ${S.books.length} ביאורים. בחרו מבט, או חפשו.`)),
      searchField());
    const tabs = h("nav", { class: "ws-tabs", role: "tablist", "aria-label": "מבטי חקר" });
    for (const [id, l] of this.tabs) tabs.append(h("button", { role: "tab", "aria-selected": id === tab, onclick: () => { const p = Object.fromEntries([...R.cur.q].filter(([k]) => k !== "mode")); p.tab = id; go(mkHash(parRoot(), p)); } }, l));
    const body = h("div", { class: "ws-body" });
    const grid = h("div", { class: "ws" }, h("div", { class: "ws-main-col" }, body));
    main.replaceChildren(head, tabs, grid); this.lin = null;
    Side.mount(grid);
    const sync = () => quietHash(mkHash(parRoot(), { tab, doc: f.doc, ty: f.ty, st: f.st, mx: f.mx !== mx0 ? f.mx : "" }));
    if (tab === "lineage") {
      const dens = h("button", { class: "fchip", "aria-pressed": false }, "תצוגה צפופה");
      const lines = h("button", { class: "fchip", "aria-pressed": false }, "הצג את כל הקשרים");
      const draw = () => { lin.setNodes(S.pnodes.filter(wsPass(f))); cnt.textContent = `${S.pnodes.filter(wsPass(f)).length} מתוך ${S.pnodes.length} פריטים`; sync(); };
      const bar = wsFilterBar(f, draw, { extra: [dens, lines] });
      const cnt = h("span", { class: "cnt" });
      const lin = Lineage.create(S.pnodes.filter(wsPass(f)), { onPick: id => { selectNode(id, { inDoc: true }); Side.show(id); lin.layout(); } });
      dens.onclick = () => { const on = dens.getAttribute("aria-pressed") !== "true"; dens.setAttribute("aria-pressed", on); lin.setOpts({ dense: on }); };
      lines.onclick = () => { const on = lines.getAttribute("aria-pressed") !== "true"; lines.setAttribute("aria-pressed", on); lin.setOpts({ lines: on }); };
      body.append(bar, h("p", { class: "note" }, h("span", null, "הדורות מלמעלה למטה, מהראשון לאחרון; בכל דור הפריטים מקובצים תחת כל רבי ומסודרים לפי שנה. בחירת פריט מציירת קווים אל הפריטים שהוא נסמך עליהם או שנסמכים עליו. "), cnt), lin.el);
      cnt.textContent = `${S.pnodes.filter(wsPass(f)).length} מתוך ${S.pnodes.length} פריטים`;
      lin.layout(); Workspace.lin = lin;
      const sel = q.get("sel"); if (sel && getNode(sel)) { lin.setSel(sel); Side.show(sel); lin.reveal(sel); }
      ctx.cleanup = () => {};
    } else if (tab === "matrix") {
      const host = h("div"); const draw = () => { host.replaceChildren(); matrixView(host, f); sync(); };
      const bar = h("div", { class: "ws-filters" });
      const mk = (label, key, opts) => h("label", null, h("span", null, label), h("select", { onchange: e => { f[key] = e.target.value; draw(); } }, ...opts.map(([v, l]) => h("option", { value: v, selected: f[key] === v }, l))));
      bar.append(mk("סוג", "ty", [["", "הכול"], ...TYPES.map(t => [t, t])]), mk("מצב כיסוי", "st", [["", "הכול"], ...CATS.map(c => [c, CAT[c].short])]));
      body.replaceChildren(bar, host); draw();
    } else if (tab === "books") {
      const box = h("div", { class: "lib" }); libraryList(box, { strips: true, compact: true }); body.append(box);
    } else if (tab === "map") {
      const o = {}; mapView(body, f, o);
      const sel = q.get("sel"); if (sel && getNode(sel)) { o.inst.setSel(sel, true); Side.show(sel); }
      ctx.cleanup = () => o.inst?.destroy();
    } else if (tab === "sources") {
      await SourcesView.render(body, q, ctx, true);
    } else {
      await StatusViews.render(body, q.get("sub") || "status");
    }
  },
};
{
  const _show = Conn.show.bind(Conn);
  Conn.show = function (sel, o) { if (R.view !== "biur") { if (sel?.node) { Side.show(sel.node); if (Workspace.lin) Workspace.lin.setSel(sel.node); } return; } return _show(sel, o); };
}


/* חברותא · מקורות: טבלת 532 הפריטים עם מסננים, מיון, ועמוד פריט */

function yearOf(label) {
  if (!label) return null;
  const s = String(label).replace(/^ה['׳]/, "").replace(/[^א-ת]/g, "");
  let v = 0; for (const c of s) { const k = "אבגדהוזחטיכלמנסעפצקרשתךםןףץ".indexOf(c); if (k < 0) continue; const tbl = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80, "צ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400, "ך": 20, "ם": 40, "ן": 50, "ף": 80, "ץ": 90 }; v += tbl[c]; }
  return v >= 400 && v <= 800 ? 5000 + v : null;
}
function parseYearInput(s) {
  s = (s || "").trim(); if (!s) return null;
  if (/^\d+$/.test(s)) { let n = +s; if (n < 1000) n += 5000; return n; }
  return yearOf(s);
}
function nyear(n, k) { const key = "_y" + k; if (n[key] === undefined) n[key] = yearOf(n[k === "s" ? "ys" : k === "w" ? "yw" : "yp"]); return n[key]; }

const SORTS = {
  t: (a, b) => cleanT(a.t).localeCompare(cleanT(b.t), "he"),
  rb: (a, b) => ((a.g < 0 ? 99 : a.g) - (b.g < 0 ? 99 : b.g)) || cleanT(a.t).localeCompare(cleanT(b.t), "he"),
  ys: (a, b) => (nyear(a, "s") ?? 9999) - (nyear(b, "s") ?? 9999),
  yw: (a, b) => (nyear(a, "w") ?? 9999) - (nyear(b, "w") ?? 9999),
  yp: (a, b) => (nyear(a, "p") ?? 9999) - (nyear(b, "p") ?? 9999),
  ty: (a, b) => TYPE_ORDER.indexOf(a.ty) - TYPE_ORDER.indexOf(b.ty),
  cat: (a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat),
};

function srcFilter(q) {
  const qp = q.get("p");
  const f = { p: qp === "all" ? "all" : hasDocs(qp) ? qp : S.par, gens: q.get("g") ? new Set(q.get("g").split(",").map(Number)) : null, ty: q.get("ty") || "", st: q.get("st") || "", unit: q.get("unit") || "", chain: q.get("chain") || "", yk: q.get("yk") || "s", y1: q.get("y1") || "", y2: q.get("y2") || "", q: q.get("q") || "", sort: q.get("sort") || "rb", dir: q.get("dir") || "asc", cov: q.get("cov") || "" };
  return f;
}
function srcQuery(f) {
  const o = { p: f.p };
  if (f.gens) o.g = [...f.gens].join(","); if (f.ty) o.ty = f.ty; if (f.st) o.st = f.st; if (f.unit) o.unit = f.unit; if (f.chain) o.chain = f.chain;
  if (f.y1 || f.y2) { o.yk = f.yk; o.y1 = f.y1; o.y2 = f.y2; } if (f.q) o.q = f.q; if (f.cov) o.cov = f.cov;
  if (f.sort !== "rb") o.sort = f.sort; if (f.dir !== "asc") o.dir = f.dir;
  return o;
}
function srcPass(f) {
  const words = norm(f.q).split(" ").filter(Boolean);
  const y1 = parseYearInput(f.y1), y2 = parseYearInput(f.y2);
  return n => {
    if (f.p !== "all" && (n.p || S.home) !== f.p) return false;
    if (f.gens && !f.gens.has(n.g)) return false;
    if (f.ty && n.ty !== f.ty) return false;
    if (f.st && n.cat !== f.st) return false;
    if (f.unit && !n.un.includes(f.unit)) return false;
    if (f.chain && !n.ch.includes(f.chain)) return false;
    if (f.cov === "none" && (n.un.length || n.ch.length)) return false;
    if (y1 || y2) { const y = nyear(n, f.yk); if (y == null || (y1 && y < y1) || (y2 && y > y2)) return false; }
    if (words.length) { const hay = norm([n.t, n.ti, n.rb, n.col, n.bk, n.ys, n.yw, n.yp, n.gn, n.id].join(" ")); if (!words.every(w => hay.includes(w))) return false; }
    return true;
  };
}

let SRC_SEL = null;
const SourcesView = {};
VIEWS.sources = async function (rest, q, ctx) {
  const main = $("#view"); main.className = "main page wide"; main.textContent = "";
  document.title = "מקורות · חברותא";
  const grid = h("div", { class: "ws" }); const col = h("div", { class: "ws-main-col" }); grid.append(col); main.append(grid);
  Side.mount(grid);
  await SourcesView.render(col, q, ctx, false);
  if (!ctx.keep) window.scrollTo(0, 0);
};
SourcesView.render = async function (main, q, ctx, embedded) {
  const f = srcFilter(q);
  if (embedded) f.p = S.par;
  const scope = f.p === "all" ? S.core.nodes : docsOf(f.p).nodes, total = scope.length;
  const pdocs = f.p === "all" ? null : docsOf(f.p);            // היחידות והשרשראות במסננים — של הפרשה שנבחרה
  // בחירת הפרשה: המקורות של כל פרשה שיש בה ביאורים (בבראשית — מפת הפרשה; בנח — כרטיסי השרשראות), או כל הפרשיות יחד
  const pars = (S.core.parshiyot || []).map(x => x.n).filter(hasDocs);
  const parSel = h("label", null, "פרשה", h("select", { onchange: e => { f.p = e.target.value; f.unit = ""; f.chain = ""; go(mkHash(["sources"], srcQuery(f)), true); } },
    ...pars.map(x => h("option", { value: x, selected: f.p === x }, "פרשת " + x)), h("option", { value: "all", selected: f.p === "all" }, "כל הפרשיות")));
  const pname = f.p === "all" ? "בכל הפרשיות" : "בפרשת " + f.p;
  if (!embedded) main.append(h("h1", { class: "page-title" }, "מקורות"), h("p", { class: "lede" }, `${total} הפריטים ${pname}: מאמרים, הנחות, שיחות ומכתבים של שבעה הרביים. לכל פריט שלוש שנים (אמירה, כתיבה, פרסום), מקור, והמקומות שבהם הוא מנותח בביאורים.`));
  const sync = () => quietHash(embedded ? mkHash(parRoot(), { tab: "sources", ...srcQuery(f), p: "" }) : mkHash(["sources"], srcQuery(f)));
  const sel = (label, key, opts, val) => h("label", null, label, h("select", { onchange: e => { f[key] = e.target.value; refresh(); } }, ...opts.map(([v, l]) => h("option", { value: v, selected: v === val }, l))));
  const genSel = h("label", null, "הרבי / דור", h("select", { onchange: e => { f.gens = e.target.value === "" ? null : new Set([+e.target.value]); refresh(); } },
    h("option", { value: "" }, "כולם"), ...GEN_IDS.map(g => h("option", { value: g, selected: f.gens && f.gens.size === 1 && f.gens.has(g) }, S.core.gens[g])), h("option", { value: -1, selected: f.gens && f.gens.has(-1) && f.gens.size === 1 }, "לא זוהה")));
  const yk = h("select", { "aria-label": "סוג השנה", onchange: e => { f.yk = e.target.value; refresh(); } }, ...[["s", "שנת אמירה"], ["w", "שנת כתיבה"], ["p", "שנת פרסום"]].map(([v, l]) => h("option", { value: v, selected: f.yk === v }, l)));
  const yin = key => h("input", { type: "text", inputmode: "text", placeholder: "תשכ״ח או 5728", value: f[key], "aria-label": key === "y1" ? "משנה" : "עד שנה", style: { width: "6.4rem" }, oninput: debounce(e => { f[key] = e.target.value; refresh(); }, 200) });
  const vdocs = pdocs ? pdocs.verse : S.core.docs.filter(d => d.kind === "verse"), cdocs = pdocs ? pdocs.chain : S.core.docs.filter(d => d.kind === "chain");
  const unitSel = !vdocs.length ? null : sel("מכוסה ביחידה", "unit", [["", "הכול"], ...vdocs.map(d => [d.key, `${d.verses === "כללי" ? "כללי" : d.verses} · ${trunc(d.title, 34)}`])], f.unit);
  const chainSel = sel("בשרשרת", "chain", [["", "הכול"], ...cdocs.map(d => [d.key, (f.p === "all" ? "פרשת " + (d.p || S.home) + " · " : "") + trunc(d.title, 40)])], f.chain);
  const qin = h("label", null, "חיפוש בטבלה", h("input", { type: "search", value: f.q, placeholder: "כותרת, ספר, שנה…", oninput: debounce(e => { f.q = e.target.value; refresh(); }, 140) }));
  const filters = h("div", { class: "ws-filters srcf", role: "search", "aria-label": "מסנני המקורות" }, embedded ? null : parSel, qin, genSel,
    sel("סוג", "ty", [["", "הכול"], ...TYPES.map(t => [t, t])], f.ty), sel("סטטוס", "st", [["", "הכול"], ...CATS.map(c => [c, CAT[c].short])], f.st), unitSel, chainSel,
    h("label", null, "טווח שנים", h("span", { style: { display: "flex", gap: ".3rem", alignItems: "center" } }, yk, yin("y1"), "–", yin("y2"))),
    h("div", { style: { display: "flex", gap: ".4rem", marginInlineStart: "auto" } }, h("button", { class: "btn ghost", onclick: () => go(embedded ? mkHash(parRoot(), { tab: "sources" }) : mkHash(["sources"], { p: f.p }), true) }, "איפוס"), h("button", { class: "btn", onclick: () => exportItems(currentRows(), "מקורות — " + describeFilter()) }, icon("i-pdf"), "PDF")));
  const cnt = h("div", { class: "count", "aria-live": "polite" });
  const tw = h("div", { class: "dtw" });
  main.append(filters, cnt, tw);
  let rowsCache = [];
  const describeFilter = () => { const bits = []; if (f.gens) bits.push([...f.gens].map(g => S.core.gens[g] || "לא זוהה").join(", ")); if (f.ty) bits.push(f.ty); if (f.st) bits.push(CAT[f.st].short); if (f.unit) bits.push("יחידה " + f.unit); if (f.chain) bits.push("שרשרת " + f.chain.replace(/^.*\//, "")); if (f.y1 || f.y2) bits.push(`${f.y1 || "…"}–${f.y2 || "…"}`); if (f.q) bits.push("״" + f.q + "״"); return bits.join(" · ") || "הכול"; };
  const currentRows = () => rowsCache;
  const cols = [["t", "כותרת"], ["rb", "הרבי"], ["ys", "אמירה"], ["yw", "כתיבה"], ["yp", "פרסום"], ["ty", "סוג"], ["cat", "סטטוס"], ["x", "מכוסה ב"], ["u", "מקור"]];
  function refresh() {
    const pass = srcPass(f);
    const rows = scope.filter(pass);
    const sf = SORTS[f.sort] || SORTS.rb;
    rows.sort((a, b) => (f.dir === "desc" ? -1 : 1) * (sf(a, b) || a.id.localeCompare(b.id)));
    rowsCache = rows;
    cnt.replaceChildren(...[h("span", null, h("b", null, rows.length), ` מתוך ${total} פריטים`), rows.length < total ? h("span", { class: "tag" }, describeFilter()) : null].filter(Boolean));
    const thead = h("thead", null, h("tr", null, ...cols.map(([k, l]) => h("th", { scope: "col", "aria-sort": f.sort === k ? (f.dir === "asc" ? "ascending" : "descending") : null }, SORTS[k] ? h("button", { onclick: () => { if (f.sort === k) f.dir = f.dir === "asc" ? "desc" : "asc"; else { f.sort = k; f.dir = "asc"; } refresh(); } }, l, f.sort === k ? (f.dir === "asc" ? " ▲" : " ▼") : "") : l))));
    const tb = h("tbody");
    if (!rows.length) tb.append(h("tr", null, h("td", { colspan: cols.length }, h("div", { class: "empty" }, h("b", null, "אין פריטים שמתאימים"), "נסו להרחיב את הטווח או לאפס את המסננים."))));
    const LIM = 600;
    for (const n of rows.slice(0, LIM)) {
      const tr = h("tr", { "data-id": n.id, class: SRC_SEL === n.id ? "sel" : "", tabindex: 0, onclick: e => { if (e.target.closest("a")) return; pick(n.id, tr); }, onkeydown: e => { if (e.key === "Enter") pick(n.id, tr); } });
      const tags = h("div", { class: "tags" });
      n.un.slice(0, 4).forEach(k => { const d = S.docByKey.get(k); if (d) tags.append(h("a", { href: mkHash(["biur", d.id], { n: n.id }), title: d.title }, d.verses === "כללי" ? d.id : d.verses)); });
      n.ch.slice(0, 3).forEach(k => { const d = S.docByKey.get(k); if (d) tags.append(h("a", { href: mkHash(["biur", d.id], { n: n.id }), title: d.title }, trunc(k.replace(/^.*\//, ""), 14))); });
      if (n.un.length + n.ch.length > 7) tags.append(h("span", null, "+" + (n.un.length + n.ch.length - 7)));
      tr.append(h("td", { class: "tt" }, h("span", { class: "ig inl", style: { "--gc": gcol(n.g) } }, glyphSvg(n, 18)), nodeTitle(n, 90)),
        h("td", { class: "rbc" }, rebbeChip(n)), h("td", { class: "num" }, n.ys || "—"), h("td", { class: "num" }, n.yw || "—"), h("td", { class: "num" }, n.yp || "—"), h("td", null, n.gn), h("td", null, catChip(n)), h("td", null, tags),
        h("td", null, n.u ? h("a", { href: n.u, target: "_blank", rel: "noopener noreferrer", "aria-label": "פתח במקור" }, icon("i-ext")) : "—"));
      tb.append(tr);
    }
    if (rows.length > LIM) tb.append(h("tr", null, h("td", { colspan: cols.length }, `מוצגים ${LIM} הראשונים. צמצמו את המסננים כדי לראות את השאר.`)));
    tw.replaceChildren(h("table", { class: "dt" }, thead, tb));
    sync();
  }
  function pick(id, tr) {
    SRC_SEL = id; $$("tr.sel", tw).forEach(x => x.classList.remove("sel")); tr.classList.add("sel");
    selectNode(id, { open: true }); Side.show(id);
  }
  refresh();
};

/* ---------- עמוד פריט ---------- */
VIEWS.item = async function (rest, q, ctx) {
  const id = rest.join("/");
  const n = getNode(id);
  const main = $("#view"); main.className = "main page"; main.textContent = "";
  if (!n) { main.append(h("div", { class: "empty" }, h("b", null, "הפריט לא נמצא"), id, h("br"), h("a", { href: mkHash(["sources"]) }, "לרשימת המקורות"))); return; }
  document.title = nodeTitle(n, 50) + " · חברותא";
  const np = n.p || S.home;
  main.append(h("nav", { class: "crumbs", "aria-label": "מיקום" }, h("a", { href: parshaHrefOf(np) }, "פרשת " + np), h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("a", { href: mkHash(["sources"], { p: np }) }, "מקורות"), h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("span", { "aria-current": "page" }, n.rb || "מחבר לא זוהה")), h("div", { class: "itempage" }, itemCard(id, { mode: "page" })));
  selectNode(id, { inDoc: true });
  window.scrollTo(0, 0);
};

/* ---------- מקרא הפריטים: ייצוא רשימה ---------- */
function exportItems(nodes, title) { if (window.chavrutaExport) window.chavrutaExport.printItems(nodes, title); }


/* חברותא · כיסוי וסטטוס: תצוגות חיות על בסיס אותם נתונים של המפה והביאורים */

function kpi(v, label, cls) { return h("div", { class: "kpi " + (cls || "") }, h("b", null, v), h("span", null, label)); }
function stackbar(parts) {
  const tot = parts.reduce((s, p) => s + p[1], 0) || 1;
  return h("div", { class: "stackbar", role: "img", "aria-label": parts.map(p => p[2] + " " + p[1]).join(", ") }, ...parts.filter(p => p[1]).map(p => h("i", { class: p[0], style: { flex: p[1] / tot }, title: p[2] + " · " + p[1] })));
}
function pageHead(title, lede) { return [h("h1", { class: "page-title" }, title), lede ? h("p", { class: "lede" }, lede) : null]; }
const StatusViews = {};

/* פרשה שאינה פרשת הבית (נח): מצב כל שרשרת כתוב בשורת המצב שבראש הביאור (d.sl) — כאן כולן יחד, עם סבבי הבחינה ומוני הקישור */
StatusViews.parStatus = async function (main) {
  const docs = S.books, ls = (S.core.plinks || {})[S.par] || {};
  main.append(...pageHead("סטטוס הביאורים — פרשת " + S.par, `מצב הבקרה של כל שרשרת בפרשת ${S.par} כתוב בשורת המצב שבראש הביאור ובראש שרשרת הדורות שלו; כאן — כולן יחד. הנתונים נבנו מהקבצים של הפרויקט ביום ${S.core.built}.`));
  const cov = S.pnodes.filter(n => n.cat === "covered").length;
  main.append(h("div", { class: "kpis" }, kpi(docs.length, "ביאורי שרשראות"), kpi(S.dorotDocs.length, "שרשראות דורות"), kpi(S.pnodes.length, "פריטי מקור"), kpi(cov, "פריטים שמצוטטים בנוסח", "ok"),
    kpi((ls.quotes || {}).matched || 0, "ציטוטים שקושרו לקטע מקור"), kpi(((ls.rows || {}).matched || 0) + " / " + ((ls.rows || {}).total || 0), "שורות טבלה שקושרו לפריט")));
  main.append(h("div", { class: "sec-h" }, h("h2", null, "כל השרשראות"), h("span", { class: "chip mute" }, docs.length)));
  const tb = h("tbody");
  for (const d of docs) {
    const dd = S.docs.get(d.id + "d"), open = (d.parts || []).find(p => p.id === "open") ? d : dd && (dd.parts || []).find(p => p.id === "open") ? dd : null;
    tb.append(h("tr", { style: { cursor: "default" } },
      h("td", { class: "tt" }, h("a", { href: mkHash(["biur", d.id]) }, d.title), dd ? h("div", null, h("a", { class: "sm", href: mkHash(["biur", dd.id]) }, "שרשרת הדורות")) : null),
      h("td", { class: "num" }, d.anchor || "—"), h("td", null, d.sl || "—"), h("td", { class: "num" }, (d.rdec || []).length || "—"), h("td", { class: "num" }, (S.links?.d[d.id] || d.members || []).length),
      h("td", null, open ? h("a", { class: "btn sm", href: mkHash(["biur", open.id, "open"]) }, icon("i-flag"), "שאלות שנבדקו") : "—")));
  }
  main.append(h("div", { class: "dtw" }, h("table", { class: "dt" }, h("thead", null, h("tr", null, ...["שרשרת", "פסוק העוגן", "שורת המצב", "סבבי בחינה", "פריטים", "בקרה"].map(x => h("th", { scope: "col" }, x)))), tb)));
  for (const d of docs) {
    if (!(d.rdec || []).length) continue;
    main.append(h("details", { class: "unit" }, h("summary", null, h("b", null, d.title), h("span", { class: "chip mute" }, d.rdec.length + " סבבים")),
      h("div", { class: "ub" }, ...d.rdec.map(r => h("p", null, h("b", null, r.title + ": "), r.summary)), h("p", null, h("a", { class: "btn sm", href: mkHash(["biur", d.id]) }, icon("i-book"), "פתח את הביאור")))));
  }
};
StatusViews.status = async function (main, emb) {
  if (!isHome()) return StatusViews.parStatus(main);
  const St = S.core.status;
  const units = S.verseDocs;
  const cnt = {}; units.forEach(u => cnt[u.state] = (cnt[u.state] || 0) + 1);
  const ls = S.core.link_stats;
  main.append(...pageHead("סטטוס הביאורים — פרשת בראשית", "מצב הבקרה של כל הביאורים בפרשת בראשית, מה נשאר פתוח לבדיקה אנושית, ומה השתנה לאחרונה. (בפרשת נח — מצב כל שרשרת כתוב בראש הביאור שלה.) הנתונים נבנו מהקבצים של הפרויקט ביום " + S.core.built + "."));
  main.append(h("div", { class: "kpis" },
    kpi(units.length, "ביאורי פסוק"), kpi(S.chainDocs.length, "ביאורי שרשראות"), kpi(cnt["PASS"] || 0, "PASS", "ok"), kpi(cnt["PASS בתנאי"] || 0, "PASS בתנאי", "warn"), kpi(cnt["נסגר עם פתוחים"] || 0, "נסגר עם פתוחים", "warn"),
    kpi(S.pnodes.length, "פריטים במפה"), kpi(0, "פערי כיסוי", "ok")));
  main.append(h("div", { class: "sec-h" }, h("h2", null, "מה חדש וחשוב לדעת")), h("div", { class: "prose", html: proseHtml(St.important) }));
  main.append(h("div", { class: "sec-h" }, h("h2", null, "סיכום המצב")), h("div", { class: "prose", html: proseHtml(St.summary) }));
  // טבלה חיה
  main.append(h("div", { class: "sec-h" }, h("h2", null, "כל היחידות"), h("span", { class: "chip mute" }, units.length)));
  const tb = h("tbody");
  for (const u of units) {
    const open = (u.parts || []).find(p => p.id === "open");
    tb.append(h("tr", { style: { cursor: "default" } },
      h("td", { class: "tt" }, h("a", { href: mkHash(["biur", u.id]) }, u.title)),
      h("td", { class: "num" }, u.verses === "כללי" ? "כללי" : "בראשית " + u.verses), h("td", null, stateChip(u)),
      h("td", { class: "num" }, (u.rounds || []).length || "—"), h("td", { class: "num" }, u.covadd && u.covadd !== "—" ? u.covadd : "—"),
      h("td", { class: "num" }, (u.members || []).length),
      h("td", null, open ? h("a", { class: "btn sm", href: mkHash(["biur", u.id, "open"]) }, icon("i-flag"), "שאלות שנבדקו") : "—")));
  }
  main.append(h("div", { class: "dtw" }, h("table", { class: "dt" }, h("thead", null, h("tr", null, ...["יחידה", "פסוקים", "מצב", "סבבים", "תוספת כיסוי", "פריטים", "בקרה"].map(x => h("th", { scope: "col" }, x)))), tb)));
  // פירוט לפי יחידה
  main.append(h("div", { class: "sec-h" }, h("h2", null, "פירוט: מצב ופתוח לבקרה אנושית, לפי יחידה")));
  for (const u of units) {
    const det = St.details[u.key]; if (!det) continue;
    const d = h("details", { class: "unit", id: "st-" + u.key }, h("summary", null, h("b", null, u.title), stateChip(u), h("span", { class: "chip mute" }, u.verses === "כללי" ? "כללי" : u.verses)), h("div", { class: "ub" }, h("div", { class: "prose", html: proseHtml(det) }), h("p", null, h("a", { class: "btn sm", href: mkHash(["biur", u.id]) }, icon("i-book"), "פתח את הביאור"))));
    if (/פתוח/.test(u.state)) d.open = false;
    main.append(d);
  }
  // איכות הקישור
  main.append(h("div", { class: "sec-h" }, h("h2", null, "איכות הקישור בין המפה לביאורים"), h("span", { class: "chip mute" }, "נבנה אוטומטית")));
  main.append(h("div", { class: "kpis" }, kpi(ls.with_evidence, "פריטים שיש להם מקום מדויק בביאור"), kpi(ls.unresolved_keys, "מפתחות hb שלא נפתרו", ls.unresolved_keys === 0 ? "ok" : "bad"), kpi(ls.rows.matched + " / " + ls.rows.total, "שורות טבלה שקושרו לפריט"), kpi(ls.quotes.matched, "ציטוטים שקושרו לקטע מקור"), kpi(ls.rowlinks, "הפניות ״שורה N״ שנקשרו")));
  main.append(h("p", { class: "card-note" }, `שורות שהקישור שלהן ״משוער״ (${ls.rows.conf_likely}) מסומנות בקו מקווקו ובתיאור הריחוף, כדי שלא יוצג קישור ודאי במקום משוער. פירוט מלא בקובץ LINKAGE_REPORT.md שבתיקיית האפליקציה.`));
  if (location.hash.includes("#st-")) { }
};

StatusViews.coverage = async function (main, emb) {
  const home = isHome(), C = S.core.coverage, N = S.pnodes;
  main.append(...pageHead(home ? "כיסוי המפה" : "כיסוי המקורות — פרשת " + S.par, home ? "איך 532 פריטי המפה מתחלקים בין הביאורים. הספירות נחשבות חי מהנתונים; הטקסט המילולי מתוך דוח הכיסוי של הפרויקט."
    : `איך ${N.length} כרטיסי המקורות של השרשראות בפרשת ${S.par} מתחלקים. ״מכוסה״ = יש לו אזכור מזוהה בנוסח (ציטוט, מזהה קטע, קישור או שורת טבלה); ״אין טקסט״ = ידוע רק מהפניה.`));
  const cc = Object.assign({ covered: 0, mentioned: 0, excluded: 0, notext: 0 }, S.pcats);
  main.append(h("div", { class: "kpis" }, kpi(N.length, "פריטים במפה"), kpi(cc.covered, "מכוסים בביאור", "ok"), kpi(cc.mentioned, "מוזכרים בלבד", "warn"), kpi(cc.excluded, "הושמטו / מחוץ להיקף"), kpi(cc.notext, "הטקסט אינו בידינו", "bad"), kpi(0, "פערי כיסוי", "ok")));
  main.append(stackbar([["cv-ok", cc.covered, "מכוסים"], ["cv-m", cc.mentioned, "מוזכרים בלבד"], ["cv-x", cc.excluded, "הושמטו"], ["cv-n", cc.notext, "אין טקסט"]]));
  // לפי דור
  main.append(h("div", { class: "sec-h" }, h("h2", null, "לפי דורות")));
  const gtb = h("tbody");
  for (const g of GEN_IDS.concat([-1])) {
    const ns = N.filter(n => n.g === g); if (!ns.length) continue;
    const c = k => ns.filter(n => n.cat === k).length;
    gtb.append(h("tr", { style: { cursor: "default" } }, h("td", null, h("span", { class: "rb", style: { "--gc": gcol(g) } }, h("i", { class: "dot" }), S.core.gens[g] || "לא זוהה")), h("td", { class: "num" }, ns.length),
      ...CATS.map(k => h("td", { class: "num" }, c(k) ? h("a", { href: mkHash(["sources"], { p: S.par, g, st: k }) }, c(k)) : "—")),
      h("td", { style: { minWidth: "10rem" } }, stackbar([["cv-ok", c("covered"), "מכוסים"], ["cv-m", c("mentioned"), "מוזכרים"], ["cv-x", c("excluded"), "הושמטו"], ["cv-n", c("notext"), "אין טקסט"]]))));
  }
  main.append(h("div", { class: "dtw" }, h("table", { class: "dt" }, h("thead", null, h("tr", null, h("th", null, "דור"), h("th", null, "סה״כ"), ...CATS.map(k => h("th", null, CAT[k].short)), h("th", null, "חלוקה"))), gtb)));
  // לפי יחידה / שרשרת (חי)
  const docTable = (title, docs, key) => {
    main.append(h("div", { class: "sec-h" }, h("h2", null, title), h("span", { class: "chip mute" }, docs.length)));
    const tb = h("tbody");
    for (const d of docs) {
      const ns = d.members.map(getNode).filter(Boolean);
      const gset = new Set(ns.map(n => n.g));
      tb.append(h("tr", { style: { cursor: "default" } }, h("td", { class: "tt" }, h("a", { href: mkHash(["biur", d.id]) }, d.title)), h("td", { class: "num" }, docWhere(d)), h("td", { class: "num" }, ns.length ? h("a", { href: mkHash(parRoot(), { tab: "lineage", doc: (key === "unit" ? "u:" : "c:") + d.key }) }, ns.length) : 0),
        h("td", null, h("div", { class: "tags" }, ...[...gset].sort((a, b) => a - b).map(g => h("span", { class: "rb", style: { "--gc": gcol(g) } }, h("i", { class: "dot" }), (S.core.gens[g] || "?").replace("אדמו״ר ", ""))))),
        h("td", { class: "num" }, ns.filter(n => n.cat === "covered").length)));
    }
    main.append(h("div", { class: "dtw" }, h("table", { class: "dt" }, h("thead", null, h("tr", null, ...["ביאור", "היכן", "פריטים", "דורות", "מהם מכוסים"].map(x => h("th", null, x)))), tb)));
  };
  if (S.verseDocs.length) docTable("לפי יחידות הפסוק", S.verseDocs, "unit");
  docTable("לפי שרשראות", S.chainDocs, "chain");
  // הפריטים שאינם מכוסים במלואם
  const rest = N.filter(n => n.cat !== "covered").sort((a, b) => CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || a.g - b.g);
  main.append(h("div", { class: "sec-h" }, h("h2", null, "הפריטים שאינם מכוסים בביאור מלא"), h("span", { class: "chip mute" }, rest.length)));
  main.append(h("p", { class: "lede" }, "לכל פריט נרשם נימוק. לחיצה על שורה פותחת את הכרטיס שלו."));
  const rtb = h("tbody");
  for (const n of rest) rtb.append(h("tr", { tabindex: 0, onclick: e => { if (e.target.closest("a")) return; selectNode(n.id, { open: true }); Side.show(n.id); }, onkeydown: e => { if (e.key === "Enter") { selectNode(n.id, { open: true }); Side.show(n.id); } } },
    h("td", { class: "tt" }, nodeTitle(n, 80)), h("td", null, rebbeChip(n)), h("td", null, catChip(n)), h("td", null, trunc(n.cn || n.cs || "", 220))));
  main.append(h("div", { class: "dtw" }, h("table", { class: "dt" }, h("thead", null, h("tr", null, ...["פריט", "הרבי", "סטטוס", "נימוק"].map(x => h("th", null, x)))), rtb)));
  // הטקסט המקורי (דוח הכיסוי — של מפת בראשית)
  if (!home) return;
  main.append(h("div", { class: "sec-h" }, h("h2", null, "מתוך דוח הכיסוי")), h("div", { class: "prose", html: proseHtml(C.intro) }));
  for (const [k, v] of Object.entries(C.sections)) main.append(h("details", { class: "unit" }, h("summary", null, h("b", null, k)), h("div", { class: "ub" }, h("div", { class: "prose", html: proseHtml(v) }))));
};

StatusViews.closure = async function (main, emb) {
  if (!isHome()) { main.append(...pageHead("סיכום סגירה — פרשת " + S.par, `סיכום הסגירה נכתב לספר הביאורים של פרשת ${S.home}. בפרשת ${S.par} — הכרעות הסבבים של כל שרשרת מופיעות ב״סטטוס הביאורים״ ובסוף כל ביאור.`)); return; }
  main.append(h("div", { class: "prose", html: proseHtml(S.core.closure) }), h("div", { class: "ic-act no-print" }, h("button", { class: "btn", onclick: () => window.chavrutaExport?.printMain("סיכום סגירה — פרשת בראשית") }, icon("i-pdf"), "ייצוא PDF")));
};

StatusViews.render = async function (host, sub) {
  host.replaceChildren();
  const seg = h("div", { class: "seg", role: "group" });
  for (const [k, l] of [["status", "סטטוס הביאורים"], ["coverage", isHome() ? "כיסוי המפה" : "כיסוי המקורות"], ["closure", "סיכום סגירה"]])
    seg.append(h("button", { "aria-pressed": sub === k, onclick: () => { const p = Object.fromEntries([...R.cur.q].filter(([x]) => x !== "mode")); p.tab = "status"; p.sub = k; go(mkHash(parRoot(), p)); } }, l));
  const box = h("div", { class: "page-in" });
  host.append(h("div", { class: "mx-bar" }, seg), box);
  await StatusViews[sub in StatusViews ? sub : "status"](box, true);
};
for (const k of ["status", "coverage", "closure"]) VIEWS[k] = async function () {
  const main = $("#view"); main.className = "main page wide"; main.textContent = "";
  const grid = h("div", { class: "ws" }); const col = h("div", { class: "ws-main-col" }); grid.append(col); main.append(grid); Side.mount(grid);
  document.title = { status: "סטטוס", coverage: "כיסוי", closure: "סיכום סגירה" }[k] + " · חברותא";
  await StatusViews[k](col);
  window.scrollTo(0, 0);
};


/* חברותא · מה חדש בעולם החסידות: פרסומים כתובים מהחודש האחרון באתרים החיצוניים, עם קישור לפריט המקורי */
const NEW_KIND = { makor: ["מקור", "פרסום חדש של מאמר, שיחה, מכתב או הנחה"], biur: ["ביאור", "מאמר כתוב המבאר מאמר או שיחה"], gilyon: ["גיליון", "גיליון שבועי"] };
VIEWS.new = async function (rest, q, ctx) {
  const main = $("#view"); main.className = "main page"; main.textContent = "";
  document.title = "מה חדש · חברותא";
  let W;
  try { W = await loadChunk("new"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את המדור"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  const gen = (W.generated || "").slice(0, 10).split("-").reverse().join(".");
  main.append(h("h1", { class: "page-title" }, "מה חדש בעולם החסידות"),
    h("p", { class: "lede" }, `פרסומים כתובים חדשים מ־${W.sources} אתרים שבמעקב, מ־${W.window} הימים האחרונים: מקורות של הרביים, ביאורים כתובים וגיליונות שבועיים. הקישור בכל פריט מוביל לאתר המפרסם. שיעורים, פודקאסטים והקלטות אינם נכללים. הנתונים נאספו ב־${gen}.`),
    h("p", { class: "card-note" }, "התקצירים נכתבו בעברית על ידי כלי בינה מלאכותית, אך ורק מתוך התיאור, הכותרות ופתיחת הפריט כפי שהמפרסם נתן אותם, ואין בהם תוכן שנוסף מעבר לכך. הם אינם תחליף לפתיחת הפריט."));
  let kind = q.get("k") || "";
  const bar = h("div", { class: "chips", role: "group", "aria-label": "סינון לפי סוג" });
  const list = h("div", { class: "newlist" });
  const draw = () => {
    bar.textContent = "";
    for (const [k, lbl] of [["", "הכול"], ["makor", "מקורות"], ["biur", "ביאורים"], ["gilyon", "גיליונות"]]) {
      const n = k ? W.n[k] : W.items.length;
      bar.append(h("button", { class: "fchip", "aria-pressed": kind === k, onclick: () => { kind = k; quietHash(mkHash(["new"], kind ? { k: kind } : {})); draw(); } }, lbl, h("small", null, n)));
    }
    list.textContent = "";
    const items = W.items.filter(i => !kind || i.k === kind);
    if (!items.length) list.append(h("div", { class: "empty" }, "אין פריטים בסוג הזה."));
    // לפי אתר: קבוצות לפי סדר הופעה
    const groups = new Map();
    for (const i of items) { if (!groups.has(i.src)) groups.set(i.src, []); groups.get(i.src).push(i); }
    for (const [src, its] of groups) {
      list.append(h("div", { class: "sec-h" }, h("h2", null, src), h("span", { class: "chip mute" }, its.length)));
      for (const i of its) {
        list.append(h("article", { class: "newitem" },
          h("div", { class: "ni-meta" }, h("span", { class: "chip " + (i.k === "makor" ? "acc" : "mute"), title: NEW_KIND[i.k][1] }, NEW_KIND[i.k][0]), i.ds ? h("span", { class: "ni-date" }, i.ds) : null),
          h("h3", { class: "ni-t" }, h("a", { href: i.u, target: "_blank", rel: "noopener", dir: i.lang === "he" ? "rtl" : "auto" }, i.t, " ", icon("i-ext"))),
          i.s ? h("p", { class: "ni-s" }, i.s) : null,
          i.pdf ? h("a", { class: "btn sm", href: i.pdf, target: "_blank", rel: "noopener" }, icon("i-pdf"), "קובץ PDF") : null));
      }
    }
  };
  main.append(bar, list); draw();
  if (!ctx.keep) window.scrollTo(0, 0);
};


/* חברותא · לימוד יומי: תניא יומי (חלוקה וטקסט מ־Sefaria, קה״ת) ולוח תורה אור ולקוטי תורה תשפ״ז */
const LUACH_PDF = "https://chabad.info/wp-content/uploads/2026/10/10-10-2026-17-36-06-%D7%9E%D7%95%D7%A8%D7%94-%D7%A9%D7%99%D7%A2%D7%95%D7%A8-%D7%AA%D7%A9%D7%A4%D7%96-%D7%9C%D7%94%D7%A4%D7%A6%D7%94-1.pdf";
const HE_FMT = new Intl.DateTimeFormat("he-u-ca-hebrew-nu-latn", { day: "numeric", month: "long", year: "numeric" });
const HE_MONTH = { "סיוון": "סיון", "אב": "מנחם אב", "חשון": "חשוון" };
const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
function parseIso(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); }
function heParts(d) {
  const p = Object.fromEntries(HE_FMT.formatToParts(d).map(x => [x.type, x.value]));
  return { y: +p.year, m: HE_MONTH[p.month] || p.month, d: +p.day };
}
function heNum(n) {
  if (n === 15) return "ט״ו"; if (n === 16) return "ט״ז";
  const vals = [[400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"], [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"]];
  let s = ""; for (const [v, c] of vals) while (n >= v) { s += c; n -= v; }
  return s.length > 1 ? s.slice(0, -1) + "״" + s.slice(-1) : s + "׳";
}
function heLabel(d) { const p = heParts(d); return `${heNum(p.d)} ${p.m} ${heNum(p.y % 1000)}`.replace("ה׳", ""); }

/* תורה אור ולקוטי תורה: הטקסט נטען בחלקים (data/tolt-<n>.js, ב־K פסקאות לחלק) רק כשקוראים */
function dlyLoadTolt(i) {
  const name = "tolt-" + i;
  if (D.chunks[name]) return Promise.resolve(D.chunks[name]);
  if (D.loading[name]) return D.loading[name];
  D.loading[name] = new Promise((res, rej) => {
    (D.waiting[name] = D.waiting[name] || []).push(res);
    const s = document.createElement("script");
    s.src = `data/${name}.js`; s.async = true;
    s.onerror = () => { delete D.loading[name]; rej(new Error("לא ניתן לטעון " + s.src)); };
    document.head.append(s);
  });
  return D.loading[name];
}
function dlySeg(i) { const T = D.chunks.daily && D.chunks.daily.tolt; if (!T) return null; const c = D.chunks["tolt-" + Math.floor(i / T.K)]; return c ? c[i % T.K] : null; }
const DLY_PARTS = new Set(["שיר השירים", "ראש השנה", "דרושים לשבת שובה", "יום כיפור", "סוכות", "דרושים לשמיני עצרת", "מגלת אסתר", "פרשת זכור"]);
function dlyPart(he) { return he.startsWith("הוספות") || DLY_PARTS.has(he) ? he : "פרשת " + he; }
/* פסקה: הטקסט מ־Sefaria אחרי ניקוי (רק <b> וסימני עמוד ⟦דף,טור⟧) — נבנה כצמתים, בלי innerHTML */
function dlyPara(s) {
  const p = h("p", { class: "daily-p" });
  let bold = null;
  for (const tok of s.split(/(<\/?b>|⟦[^⟧]*⟧)/)) {
    if (!tok) continue;
    if (tok === "<b>") { bold = h("b"); p.append(bold); continue; }
    if (tok === "</b>") { bold = null; continue; }
    if (tok.startsWith("⟦")) { p.append(h("span", { class: "daily-pg", title: "עמוד בספר" }, tok.slice(1, -1))); continue; }
    (bold || p).append(tok);
  }
  return p;
}

VIEWS.daily = async function (rest, q, ctx) {
  const main = $("#view"); main.className = "main page daily"; main.textContent = "";
  document.title = "לימוד יומי · חברותא";
  let W;
  try { W = await loadChunk("daily"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את הלימוד היומי"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  let day = /^\d{4}-\d{2}-\d{2}$/.test(q.get("d") || "") ? q.get("d") : iso(new Date());
  let tab = q.get("t") === "luach" ? "luach" : "tanya";
  const body = h("div", { class: "daily-body" });
  const head = h("div", { class: "daily-head" });
  const go = (d, t) => { day = d ?? day; tab = t ?? tab; const qq = {}; if (day !== iso(new Date())) qq.d = day; if (tab !== "tanya") qq.t = tab; quietHash(mkHash(["daily"], qq)); draw(); };
  const shift = n => { const d = parseIso(day); d.setDate(d.getDate() + n); go(iso(d)); };
  async function draw() {
    const d = parseIso(day), hp = heLabel(d);
    head.textContent = "";
    head.append(
      h("div", { class: "daily-date" }, h("b", null, `יום ${HE_DAYS[d.getDay()]}, ${hp}`), h("span", null, d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }))),
      h("div", { class: "daily-nav" },
        h("button", { class: "btn sm", onclick: () => shift(-1) }, "היום הקודם"),
        h("button", { class: "btn sm", onclick: () => go(iso(new Date())) }, "היום"),
        h("button", { class: "btn sm", onclick: () => shift(1) }, "היום הבא"),
        h("input", { type: "date", class: "daily-pick", value: day, "aria-label": "בחירת תאריך", onchange: e => e.target.value && go(e.target.value) })),
      h("div", { class: "chips", role: "group", "aria-label": "סוג הלימוד" },
        ...[["tanya", "תניא יומי"], ["luach", "תורה אור ולקוטי תורה"]].map(([k, l]) => h("button", { class: "fchip", "aria-pressed": tab === k, onclick: () => go(null, k) }, l))));
    body.textContent = "";
    if (tab === "tanya") await drawTanya(d); else await drawLuach(d);
  }
  async function drawTanya(d) {
    const rec = W.days[day];
    if (!rec) { body.append(h("div", { class: "empty" }, h("b", null, "אין נתוני תניא יומי לתאריך הזה"), `הנתונים בטווח ${W.first} עד ${W.last}.`)); return; }
    const [a, b, label, heDate] = rec;
    body.append(h("h2", { class: "daily-h" }, "תניא יומי"), h("p", { class: "daily-label" }, label));
    const holder = h("div", { class: "tanya-text", dir: "rtl" }, h("p", { class: "card-note" }, "טוען את הטקסט…"));
    body.append(holder);
    let T; try { T = await loadChunk("tanya"); } catch (e) { holder.textContent = "לא ניתן לטעון את הטקסט: " + e.message; return; }
    if (!ctx.alive() || tab !== "tanya" || day !== iso(d)) return;
    holder.textContent = "";
    let last = -1;
    for (let i = a; i < b; i++) {
      const [ci, t] = T.segs[i];
      if (ci !== last) { holder.append(h("h3", { class: "tanya-ch" }, W.chaps[ci])); last = ci; }
      holder.append(h("p", { class: "tanya-p" }, t));
    }
    body.append(h("p", { class: "card-note" }, `החלוקה היומית והטקסט: ${T.source}. הקטע של היום הוא מנקודת ההתחלה של היום עד נקודת ההתחלה של היום הבא. התאריך נקבע לפי חצות הלילה.`));
  }
  async function drawLuach(d) {
    const hp = heParts(d);
    const find = (p) => W.luach.find(r => r[0] === p.y && r[1] === p.m && r[2] === p.d);
    const r = find(hp);
    const TL = W.tolt;
    body.append(h("h2", { class: "daily-h" }, "תורה אור ולקוטי תורה"));
    if (!r) body.append(h("div", { class: "empty" }, h("b", null, "אין שורה בלוח לתאריך הזה"), "הלוח מכסה מכ״ג תשרי תשפ״ז עד כ״ב תשרי תשפ״ח."));
    else if (!r[4]) body.append(h("p", { class: "daily-label" }, "הלוח אינו מציין לימוד ליום זה."));
    else {
      const rec = TL && TL.days[`${r[0]}|${r[1]}|${r[2]}`];
      if (!rec) {
        body.append(h("p", { class: "daily-label" }, `${r[4]} · ${r[5]}`),
          h("p", { class: "daily-sub" }, `${r[6]} עמודים` + (r[7] ? ` · תחילת הקטע: ${r[7]}` : "")),
          h("p", { class: "daily-note" }, "הטקסט של הקטע הזה לא נמצא בנוסח שב־Sefaria" + (TL && TL.missing.length ? " (ראו ברשימת החסרים למטה)" : "") + ". אפשר ללמוד מן הספר או מן הלוח המקורי."));
      } else await drawTolt(TL, r, rec, d);
    }
    // השבוע הקרוב
    const next = [];
    for (let i = 1; i <= 7; i++) { const dd = new Date(d); dd.setDate(dd.getDate() + i); const rr = find(heParts(dd)); if (rr) next.push([dd, rr]); }
    if (next.length) {
      body.append(h("h3", { class: "daily-h3" }, "הימים הבאים"));
      const tb = h("table", { class: "tree-tbl" }, h("thead", null, h("tr", null, ...["תאריך", "מיקום", "עמודים", "תחילת הקטע"].map(t => h("th", null, t)))));
      const tbd = h("tbody");
      for (const [dd, rr] of next) tbd.append(h("tr", null, h("td", null, h("a", { href: mkHash(["daily"], { d: iso(dd), t: "luach" }) }, `${rr[2] ? heNum(rr[2]) : ""} ${rr[1]}`)), h("td", null, rr[4] ? `${rr[4]} · ${rr[5]}` : "אין לימוד בלוח"), h("td", null, rr[6]), h("td", null, rr[7])));
      tb.append(tbd); body.append(h("div", { class: "tbl-wrap" }, tb));
    }
    body.append(h("p", { class: "card-note" }, "הלוח: \"מורה שיעור בתורה אור ולקוטי תורה, ה׳תשפ״ז\" (לוח להפצה). הלימוד היומי מתחיל למחרת שמחת תורה ונמשך שנה, וכל יום מסתיים בנקודת ההתחלה של היום הבא. הפרטים כפי שהם בלוח: שם הפרשה (או \"שה״ש\" לשיר השירים ו\"מג״א\" למגילת אסתר), ספר ודף (פרק,עמוד), מספר העמודים והמילים הראשונות. ",
      h("a", { href: LUACH_PDF, target: "_blank", rel: "noopener" }, "הלוח המקורי (PDF)"), "."));
    if (TL && TL.missing.length) body.append(h("details", { class: "daily-missing" }, h("summary", null, `ימים בלוח שאין להם טקסט באתר (${TL.missing.length})`),
      h("ul", null, TL.missing.map(x => h("li", null, x)))));
  }

  /* הקטע של היום: הכותרת, הטקסט (נטען לפי הצורך מ־data/tolt-<n>.js), הקישורים לעבודה שלנו, המקור והרישיון, והמעבר בין הימים */
  async function drawTolt(TL, r, rec, d) {
    const [a0, a1, b0, b1, mids, pc, pe, note, cut, mid] = rec;
    const m0 = TL.maam[mids[0]], node = TL.nodes[m0[0]];
    const box = h("section", { class: "daily-tolt", "aria-label": "הקטע של היום" });
    const meta = h("div", { class: "daily-tolt-head" },
      h("p", { class: "daily-book" }, `${node[0]} · ${dlyPart(node[1])}`),
      h("ul", { class: "daily-maams" }, mids.map((mi, k) => h("li", null, k === 0 && mid ? h("span", { class: "daily-mh-c" }, "המשך ") : null, TL.maam[mi][1]))),
      h("p", { class: "daily-sub" }, `מדף ${pc} עד ${pe} · ${r[6]} עמודים לפי הלוח · תחילת הקטע: ״${r[7].replace(/\s*\(עד [^)]*\)\s*$/, "")}״`),
      note ? h("p", { class: "daily-note" }, note + ".") : null,
      cut ? h("p", { class: "daily-note" }, `הלוח אינו ממשיך מכאן ביום אחר, ולכן סוף הקטע נקבע לפי מספר העמודים שבלוח: ${cut === "maamar" ? "עד סוף המאמר" : "עד סוף הפסקה"}.`) : null);
    if (node[4]) meta.append(h("p", { class: "daily-nikud" },
      h("a", { href: node[4], target: "_blank", rel: "noopener" }, `לנוסח המנוקד והמפוסק של ${node[0]} ${dlyPart(node[1])} — חסידות בהירה`),
      h("small", null, " (קובץ PDF לכל הפרשה, באתר שלהם; עם פתיחת ראשי התיבות)")));
    box.append(meta);
    const holder = h("div", { class: "daily-text", dir: "rtl", lang: "he" }, h("p", { class: "card-note" }, "טוען את הטקסט…"));
    box.append(holder);
    body.append(box);
    const need = new Set(); for (let i = Math.floor(a0 / TL.K); i <= Math.floor(Math.max(a0, b1 ? b0 : b0 - 1) / TL.K); i++) need.add(i);
    try { await Promise.all([...need].map(dlyLoadTolt)); } catch (e) { holder.textContent = "לא ניתן לטעון את הטקסט: " + e.message; return; }
    if (!ctx.alive() || tab !== "luach" || day !== iso(d)) return;
    holder.textContent = "";
    // הכותרת של המאמר הראשון: ״המשך״ כשהקטע מתחיל באמצע מאמר
    let last = -1;
    const end = b1 ? b0 : b0 - 1;
    for (let i = a0; i <= end; i++) {
      const [mi, html] = dlySeg(i);
      let s = html;
      if (i === b0 && b1) s = s.slice(0, b1);
      if (i === a0 && a1) s = s.slice(a1);
      if (mi !== last) {
        const cont = i === a0 && mid;
        holder.append(h("h3", { class: "daily-mh" }, cont ? h("span", { class: "daily-mh-c" }, "המשך ") : null, TL.maam[mi][1]));
        last = mi;
      }
      if (s.replace(/⟦[^⟧]*⟧|<[^>]+>/g, "").trim()) holder.append(dlyPara(s));
    }
    // הקישורים לעבודה שלנו — רק התאמות לפי ספר + עמוד (או ספר + חלק + ד״ה)
    const groups = [];
    for (const mi of mids) {
      const out = { bi: [], map: [] };
      for (const [kind, label, href, q] of TL.links[mi] || []) {
        const a = h("a", Array.isArray(href) ? { href: mkHash(href, q || {}) } : { href }, label.replace(/^ביארנו: /, ""));
        (kind === "chain" ? out.bi : out.map).push(a);
      }
      const ids = TL.core[mi] || [];
      if (ids.length && S.core) {
        const seen = new Set();
        for (const doc of S.core.docs) if ((doc.members || []).some(x => ids.includes(x)) && !seen.has(doc.id)) {
          seen.add(doc.id);
          out.bi.push(h("a", { href: mkHash(["biur", doc.id], {}) }, doc.title));
        }
        for (const id of ids) if (S.core.nodes.some(n => n.id === id)) out.map.push(h("a", { href: mkHash(["item", id], {}) }, "במפת המקורות של פרשת בראשית"));
      }
      if (out.bi.length || out.map.length) groups.push([mi, out]);
    }
    if (groups.length) {
      const lb = h("aside", { class: "daily-links", "aria-label": "מה כבר עשינו על המאמרים של היום" }, h("h3", null, "באתר על המאמרים של היום"));
      for (const [mi, out] of groups) {
        lb.append(h("div", { class: "daily-lk" }, h("p", { class: "daily-lk-t" }, TL.maam[mi][1]),
          out.bi.length ? h("div", { class: "daily-lk-row" }, h("span", { class: "daily-lk-k" }, "ביארנו"), h("ul", null, out.bi.map(a => h("li", null, a)))) : null,
          out.map.length ? h("div", { class: "daily-lk-row" }, h("span", { class: "daily-lk-k map" }, "מופה בעץ הידע"), h("ul", null, out.map.map(a => h("li", null, a)))) : null));
      }
      box.append(lb);
    }
    const sref = "https://www.sefaria.org/" + encodeURIComponent(node[2].replace(/ /g, "_")).replace(/%2C/g, ",") + "?lang=he";
    box.append(h("p", { class: "card-note daily-src" }, `הטקסט: ${TL.source} · רישיון `, h("bdi", null, TL.license === "CC-BY-NC" ? "CC BY-NC" : TL.license), " · ", h("bdi", null, "© Kehot Publication Society"), " · ",
      h("a", { href: sref, target: "_blank", rel: "noopener" }, "החלק הזה ב־Sefaria"),
      `. ${TL.nikud ? "" : "הטקסט בלי ניקוד: " + TL.nikud_note} הקטע של היום הוא מנקודת ההתחלה שבלוח עד ההתחלה הבאה באותו ספר; הסימנים [דף,טור] הם עמודי הספר כפי שהם בנוסח שב־Sefaria.`));
    // מעבר בין הימים
    const prevD = parseIso(day); prevD.setDate(prevD.getDate() - 1);
    const nextD = parseIso(day); nextD.setDate(nextD.getDate() + 1);
    const lab = dd => { const rr = W.luach.find(x => { const p = heParts(dd); return x[0] === p.y && x[1] === p.m && x[2] === p.d; }); return rr && rr[4] ? `${rr[4]} ${rr[5]}` : "אין לימוד בלוח"; };
    box.append(h("nav", { class: "daily-pager", "aria-label": "היום הקודם והבא" },
      h("button", { class: "btn sm", onclick: () => shift(-1) }, h("small", null, "היום הקודם"), h("span", null, lab(prevD))),
      h("button", { class: "btn sm", onclick: () => shift(1) }, h("small", null, "היום הבא"), h("span", null, lab(nextD)))));
  }
  main.append(h("h1", { class: "page-title" }, "לימוד יומי"), head, body);
  await draw();
  if (!ctx.keep) window.scrollTo(0, 0);
};


/* חברותא · עץ הידע: איפה נמצאים כל המאמרים, השיחות, האגרות והרשימות של רבותינו נשיאינו (מהבעש״ט ועד הרבי).
   רבנים → סדרות (הרשם, עם הכרכים ותוכנם) → ספרים → יחידות. וגם: מיפוי הפרשות הקרובות. */
const TREE_GEN = [0, 0, 1, 2, 3, 4, 5, 6, 7];
const TREE_WHERE = w => !w ? null : w.startsWith("hb:") ? { t: "היברובוקס", u: "https://hebrewbooks.org/" + w.slice(3) } : w === "cl" ? { t: "ספריית חב״ד", u: "" } : null;
const treeUrl = u => u.startsWith("cl:") ? "https://www.chabadlibrary.org/books/" + u.slice(3) : u.startsWith("mm:") ? "https://maamarim.com/maamar.html?id=" + u.slice(3) : u;
const TREE_PAGE = 150;

/* ---- היחידות בחלקים: data/tree-u<k>.js = {s: מזהה ראשון, u: [יחידות]} (build_app.py: write_tree_chunks) ---- */
const treePart = k => loadChunk("tree-u" + k);
const treePartOf = (T, i) => { const P = T.parts; let lo = 0, hi = P.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (P[m][0] <= i) lo = m; else hi = m - 1; } return lo; };
/** יחידה לפי מזהה — רק מחלק שכבר נטען */
function treeRow(T, i) { const c = D.chunks["tree-u" + treePartOf(T, i)]; return c ? c.u[i - c.s] : null; }
/** טוען את החלקים שבהם המזהים האלה */
function treeEnsure(T, ids) { return Promise.all([...new Set(ids.map(i => treePartOf(T, i)))].map(treePart)); }
/** מזהי היחידות של ספר (טוען את החלק שלו) */
async function treeBookIds(T, b) {
  const k = T.bookPart[b]; if (k == null || k < 0) return [];
  const c = await treePart(k), out = [];
  c.u.forEach((u, j) => { if (u[0] === b) out.push(c.s + j); });
  return out;
}

function treeHead(main, title, crumbs, lede) {
  const nav = h("nav", { class: "crumbs", "aria-label": "מיקום" }, h("a", { href: mkHash(["tree"]) }, "עץ הידע"));
  for (const [t, href] of crumbs) nav.append(h("span", null, "›"), href ? h("a", { href }, t) : h("span", null, t));
  main.append(crumbs.length ? nav : null, h("h1", { class: "page-title" }, title), lede ? h("p", { class: "lede" }, lede) : null);
}
function treeDot(r) { return h("i", { class: "dot", style: `--gc:${gcol(TREE_GEN[r] ?? -1)}` }); }

VIEWS.tree = async function (rest, q, ctx) {
  const main = $("#view"); main.className = "main page tree"; main.textContent = "";
  document.title = "עץ הידע · חברותא";
  if (rest[0] === "k") return treeKabbalah(main, rest.slice(1), q, ctx);
  if (rest[0] === "m") return treePlaces(main, rest.slice(1), q, ctx);
  let T;
  try { T = await loadChunk("tree"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את עץ הידע"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  if (!T._ix) {   // אינדקס: ספרים לפי רבי (היחידות עצמן — בחלקים, data/tree-u<k>.js, נטענות לפי הצורך)
    T._booksOf = new Map();
    T.books.forEach((b, i) => { (T._booksOf.get(b[0]) || T._booksOf.set(b[0], []).get(b[0])).push(i); });
    T._ix = true;
  }
  const [kind, id] = rest;
  if (kind === "k") return treeKabbalah(main, rest.slice(1), q, ctx);
  if (kind === "r") return treeRebbe(main, T, +id, q);
  if (kind === "b") return treeBook(main, T, +id, q, ctx);
  if (kind === "p") { go(mkHash(["parsha", decodeURIComponent(id || "")]), true); return; }   // כתובת ישנה → עמוד הפרשה
  return treeHome(main, T, q);
};

function treeHome(main, T, q) {
  treeHead(main, "עץ הידע", [], `קטלוג המיקום של תורת רבותינו נשיאינו, מהבעש״ט והמגיד ועד הרבי: ${T.nunits.toLocaleString("he")} יחידות (מאמרים, שיחות, אגרות, רשימות והתוועדויות) ו־${T.series.length} סדרות ספרים. לכל יחידה — ספר, כרך, עמוד ושנה, וקישור למקום שבו היא נמצאת ברשת. העץ נבנה מספריית חב״ד, ממפתחות הכרכים בהיברובוקס, מ־maamarim.com ומקונטרסי קה״ת; רשימת הסדרות והכרכים הושלמה מחב״דפדיה.`);
  main.append(h("p", { class: "card-note" }, `עדכון אחרון: ${T.built.split("-").reverse().join(".")}. סדרות שנמצאות ברשת רק כסריקה בהיברובוקס עדיין בתהליך מיפוי ברמת היחידה; ברמת הסדרה והכרכים הן מופיעות כאן במלואן.`));
  // חיפוש בכותרות
  const inp = h("input", { type: "search", class: "tree-q", placeholder: "חיפוש ד״ה או כותרת בכל העץ…", value: q.get("q") || "", "aria-label": "חיפוש בעץ הידע" });
  const res = h("div", { class: "tree-res" });
  let seq = 0;
  const doSearch = async () => {
    const s = inp.value.trim(), my = ++seq; res.textContent = "";
    quietHash(mkHash(["tree"], s ? { q: s } : {}));
    if (s.length < 2) return;
    res.append(h("div", { class: "loading", role: "status" }, h("span", { class: "spin", "aria-hidden": "true" }), "מחפש בכל העץ…"));
    let hits;
    try { hits = await treeSearch(T, s, 300); } catch (e) { res.replaceChildren(h("p", { class: "muted" }, "לא ניתן לטעון את אינדקס החיפוש: " + (e.message || e))); return; }
    if (my !== seq) return;
    res.replaceChildren(h("p", { class: "muted" }, hits.length >= 300 ? "300 התוצאות הראשונות" : `${hits.length} תוצאות`), treeTable(T, hits, true));
  };
  let tmo; inp.addEventListener("input", () => { clearTimeout(tmo); tmo = setTimeout(doSearch, 250); });
  main.append(h("div", { class: "tree-search" }, inp), res);
  // הרבנים
  const grid = h("div", { class: "tree-grid" });
  T.rebbeim.forEach((name, r) => {
    const { n, g: cnt } = T.rcount[r] || { n: 0, g: {} };
    const ser = T.series.filter(s => s.r === r);
    const vols = ser.reduce((a, s) => a + (typeof s.nv === "number" ? s.nv : 0), 0);
    grid.append(h("a", { class: "tree-card", href: mkHash(["tree", "r", r]) },
      h("div", { class: "tc-h" }, treeDot(r), h("b", null, name)),
      h("div", { class: "tc-n" }, h("span", null, h("strong", null, n.toLocaleString("he")), " יחידות"), h("span", null, h("strong", null, ser.length), " סדרות"), vols ? h("span", null, h("strong", null, vols), " כרכים") : null),
      h("div", { class: "tc-g" }, Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g, v]) => h("span", { class: "chip mute" }, `${g} ${v.toLocaleString("he")}`)))));
  });
  main.append(h("div", { class: "sec-h" }, h("h2", null, "ספרי רבותינו נשיאינו")), grid);
  main.append(h("div", { class: "sec-h" }, h("h2", null, "ספרי הקבלה — מקורות קודמים")),
    h("p", { class: "muted" }, "הזהר, תיקוני הזהר, כתבי האריז״ל, הפרדס, השל״ה ועוד: רישום היחידות (דף ועמוד, שער ופרק, פרשה), קישור לספריא, ובכל יחידה — כמה פעמים ואצל מי היא מצוטטת בספרי רבותינו."),
    h("a", { class: "tree-card", href: mkHash(["tree", "k"]) }, h("div", { class: "tc-h" }, h("b", null, "עץ הקבלה")),
      h("div", { class: "tc-n" }, h("span", null, "זהר · תקו״ז · ע״ח · פע״ח · פרדס · של״ה · שער הכוונות · שער הפסוקים · ספר יצירה · ועוד")),
      h("div", { class: "tc-g" }, "לכל מקור — איפה הוא מצוטט בספרי רבותינו נשיאינו · לכל פרשה — אילו מקורות קבלה מצוטטים בה")));
  // הפרשות — לפי ספר
  const ps = Object.keys(T.pcount || {});
  if (ps.length) {
    main.append(h("div", { class: "sec-h" }, h("h2", null, "מיפוי הפרשות")),
      h("p", { class: "muted" }, "כל היחידות בעץ שנאמרו בשבת הפרשה או בשבוע שלה, מסודרות תחתיה, או שהד״ה שלהן פותח בפסוק מן הפרשה או מן ההפטרה."));
    const list = S.core.parshiyot || [];
    for (const b of [...new Set(list.map(x => x.b || "בראשית"))]) {
      const these = list.filter(x => (x.b || "בראשית") === b && (T.pcount[x.n] || x.home));
      if (!these.length) continue;
      main.append(h("h3", { class: "sub-h" }, "ספר " + b),
        h("div", { class: "chips" }, these.map(x => h("a", { class: "fchip", href: mkHash(["parsha", x.n]) }, "פרשת " + x.n, T.pcount[x.n] ? h("small", null, T.pcount[x.n]) : null))));
    }
  }
  // מועדים, נ״ך ותחומים
  main.append(h("div", { class: "sec-h" }, h("h2", null, "מפות לפי מקום")),
    h("p", { class: "muted" }, "מה שאינו על פרשה: לכל מועד ויום בלוח חב״ד, לכל ספר בנביאים ובכתובים (לפי הפסוק שהמאמר פותח בו), ולמאמרי חז״ל, לסידור ולספרים לפי ענינים."),
    h("a", { class: "tree-card", href: mkHash(["tree", "m"]) }, h("div", { class: "tc-h" }, h("b", null, "מועדים · נ״ך · תחומים")),
      h("div", { class: "tc-n" }, h("span", null, "ראש השנה · סוכות · חנוכה · פורים · פסח · שבועות · י״ט כסלו · י״ב תמוז · תהלים · ישעיה · שיר השירים · מאמרי חז״ל · ועוד"))));
  if (q.get("q")) doSearch();
}

function treeRebbe(main, T, r, q) {
  const name = T.rebbeim[r];
  if (!name) { main.append(h("div", { class: "empty" }, "לא נמצא")); return; }
  document.title = name + " · עץ הידע · חברותא";
  treeHead(main, name, [[name, null]], null);
  const ser = T.series.filter(s => s.r === r);
  main.append(h("div", { class: "sec-h" }, h("h2", null, "סדרות הספרים"), h("span", { class: "chip mute" }, ser.length)));
  for (const s of ser) {
    const det = h("details", { class: "tree-ser" });
    const avail = [s.cl ? "ספריית חב״ד" : null, s.hb ? `היברובוקס (${s.hb})` : null, s.col && s.col.length ? `חב״ד און ליין (${s.col.length})` : null].filter(Boolean).join(" · ") || "לא אותר ברשת";
    const sc = { "מכוסה": "acc", "חלקי": "warn", "ממתין לאיסוף": "warn", "לא ברשת": "bad" }[s.stt] || "mute";
    det.append(h("summary", null, h("b", null, s.n), h("span", { class: "muted" }, ` · ${s.g || ""}${s.nv ? " · " + s.nv + " כרכים" : ""} · ${avail}${s.hb ? ` · מופתחים ${s.hbi}/${s.hb}` : ""} `), s.stt ? h("span", { class: "chip " + sc }, s.stt) : null));
    if (s.st) det.append(h("p", null, s.st));
    if (s.pub) det.append(h("p", { class: "muted" }, "הוצאה: " + s.pub));
    if (s.notes) det.append(h("p", { class: "muted" }, s.notes));
    if (s.vols.length) {
      const tb = h("tbody");
      for (const [v, c, w] of s.vols) { const W = TREE_WHERE(w); tb.append(h("tr", null, h("td", null, v), h("td", null, c), h("td", null, W ? (W.u ? h("a", { href: W.u, target: "_blank", rel: "noopener" }, W.t) : W.t) : h("span", { class: "muted" }, "—")))); }
      det.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" }, h("thead", null, h("tr", null, h("th", null, "כרך"), h("th", null, "תוכן"), h("th", null, "ברשת"))), tb)));
    }
    if (s.col && s.col.length) {
      const ul = h("ul", { class: "tree-col" });
      for (const [t, u] of s.col) ul.append(h("li", null, h("a", { href: "https://media.col.org.il/files/uploads/original/" + u, target: "_blank", rel: "noopener" }, t, " ", icon("i-ext"))));
      det.append(h("p", { class: "muted" }, "קובצי PDF להורדה — מאגר האינדקסים של חב״ד און ליין:"), ul);
    }
    if (s.url) det.append(h("p", null, h("a", { href: s.url, target: "_blank", rel: "noopener" }, "הערך בחב״דפדיה ", icon("i-ext"))));
    main.append(det);
  }
  const bks = (T._booksOf.get(r) || []).map(b => [b, T.bcount[b] || 0]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  main.append(h("div", { class: "sec-h" }, h("h2", null, "יחידות בעץ לפי ספר"), h("span", { class: "chip mute" }, bks.reduce((a, x) => a + x[1], 0).toLocaleString("he"))));
  const ul = h("ul", { class: "tree-books" });
  for (const [b, n] of bks) ul.append(h("li", null, h("a", { href: mkHash(["tree", "b", b]) }, T.books[b][1]), h("span", { class: "muted" }, ` · ${T.books[b][2]} · ${n.toLocaleString("he")}`)));
  main.append(ul);
  window.scrollTo(0, 0);
}

async function treeBook(main, T, b, q, ctx) {
  const bk = T.books[b];
  if (!bk) { main.append(h("div", { class: "empty" }, "לא נמצא")); return; }
  const [r, name, src] = bk;
  document.title = name + " · עץ הידע · חברותא";
  treeHead(main, name, [[T.rebbeim[r] || "לא שויך", r >= 0 ? mkHash(["tree", "r", r]) : null], [name, null]], `${T.rebbeim[r] || ""} · מקור: ${src}`);
  const wait = h("div", { class: "loading", role: "status" }, h("span", { class: "spin", "aria-hidden": "true" }), "טוען את יחידות הספר…");
  main.append(wait);
  let all;
  try { all = await treeBookIds(T, b); } catch (e) { wait.replaceWith(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את יחידות הספר"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  wait.remove();
  const inp = h("input", { type: "search", class: "tree-q", placeholder: "סינון בספר…", value: q.get("f") || "" });
  const box = h("div");
  let page = 0;
  const draw = () => {
    const f = inp.value.trim();
    const ids = f ? all.filter(i => { const u = treeRow(T, i); return (u[2] + " " + u[3] + " " + u[6] + " " + u[7] + " " + u[5]).includes(f); }) : all;
    box.textContent = "";
    const shown = ids.slice(0, (page + 1) * TREE_PAGE);
    box.append(h("p", { class: "muted" }, `${ids.length.toLocaleString("he")} יחידות`), treeTable(T, shown, false));
    if (shown.length < ids.length) box.append(h("button", { class: "btn", onclick: () => { page++; draw(); } }, "הצג עוד"));
  };
  inp.addEventListener("input", () => { page = 0; quietHash(mkHash(["tree", "b", b], inp.value ? { f: inp.value } : {})); draw(); });
  main.append(h("div", { class: "tree-search" }, inp), box);
  draw();
  window.scrollTo(0, 0);
}

/** חיפוש בכותרות כל העץ (data/tree-t.js נטען בחיפוש הראשון): כל המילים בכותרת, עד max תוצאות; טוען את החלקים של התוצאות */
async function treeSearch(T, s, max = 300) {
  const titles = await loadChunk("tree-t");
  const nz = x => String(x).replace(/["״]/g, "\"").replace(/['׳]/g, "'").replace(/[\u0591-\u05C7]/g, "");   // גרשיים וניקוד — בלי הבדל
  const words = nz(s).trim().split(/\s+/).filter(Boolean), hits = [];
  if (!words.length) return hits;
  for (let i = 0; i < titles.length && hits.length < max; i++) { const t = nz(titles[i]); if (words.every(w => t.includes(w))) hits.push(i); }
  await treeEnsure(T, hits);
  return hits;
}

function treeTable(T, ids, showBook) {
  const tb = h("tbody");
  for (const i of ids) {
    const u = treeRow(T, i); if (!u) continue;
    const bk = T.books[u[0]];
    const tags = [u[6] ? "פרשת " + u[6] : "", u[7]].filter(Boolean).join(" · ");
    tb.append(h("tr", null,
      showBook ? h("td", null, treeDot(bk[0]), " ", h("a", { href: mkHash(["tree", "b", u[0]]) }, bk[1])) : null,
      h("td", null, u[8] ? h("a", { href: treeUrl(u[8]), target: "_blank", rel: "noopener" }, u[2] || "(ללא כותרת)") : (u[2] || "(ללא כותרת)"), u[3] ? h("div", { class: "muted sm" }, u[3]) : null),
      h("td", null, T.genres[u[1]]), h("td", null, u[5]), h("td", null, u[4]), h("td", null, tags)));
  }
  return h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" },
    h("thead", null, h("tr", null, showBook ? h("th", null, "ספר") : null, h("th", null, "כותרת / ד״ה"), h("th", null, "סוג"), h("th", null, "שנה"), h("th", null, "עמוד"), h("th", null, "פרשה / מועד"))), tb));
}

/* ---------- עמוד פרשה: אותה תבנית של ספר הביאורים בבראשית (reader.js: libraryList) — רשימה עם עמודת הפסוק, כותרת, מספר הפריטים,
   הפתיחה וקישור ל״שרשרת הדורות״; ואחריה ״בשלב ב׳״ ומיפוי המקורות מן העץ. במצב ״חקר״ — מבטי החקר של הפרשה (research.js) ---------- */
VIEWS.parsha = async function (rest, q, ctx) {
  const p = rest[0] || "";
  if (!p || p === S.home) { go(mkHash(["biurim"], Object.fromEntries([...q].filter(([k]) => k !== "mode"))), true); return; }
  Aside.detach?.();
  const main = $("#view");
  if (hasDocs(p)) {
    setPar(p);
    if (MODE === "research") { await Workspace.render(main, q, ctx); if (!ctx.keep) window.scrollTo(0, 0); return; }
  }
  main.className = "main lib tree"; main.textContent = "";
  let T;
  main.append(h("div", { class: "loading", role: "status" }, h("span", { class: "spin", "aria-hidden": "true" }), "טוען את פרשת " + p + "…"));
  try {
    T = await loadChunk("parsha");
    const n = (T.order || []).indexOf(p);
    T.rows = T.rows || {};
    if (n >= 0 && T.counts?.[p] && !T.rows[p]) T.rows[p] = await loadChunk("parsha-" + n);   // רק המיפוי של הפרשה הזו
  } catch (e) { main.replaceChildren(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את נתוני הפרשה"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  main.textContent = "";
  parshaPage(main, T, p);
  if (!ctx.keep) window.scrollTo(0, 0);
};
function stageBlock(sb, p) {
  if (!sb || (!sb.stage.length && !sb.reeh.length)) return null;
  const li = x => h("li", null, h("span", { class: "sb-inc" }, "״" + x.incipit + "״"), " ", h("span", { class: "sb-ref" }, "— " + x.label), h("span", { class: "sb-n" }, x.n + (x.n === 1 ? " מאמר" : " מאמרים")));
  const tor = sb.stage.filter(x => !x.haftarah), haf = sb.stage.filter(x => x.haftarah);
  return h("section", { class: "stageb", id: "stage-b", "aria-labelledby": "sb-h" },
    h("h2", { id: "sb-h" }, "בשלב ב׳"),
    h("p", { class: "sb-lede" }, `פסוקים בפרשת ${p} שיש עליהם מאמרים בעץ הידע, ואינם בשרשראות שכבר התבארו. הביאור שלהם יבוא בשלב ב׳.`),
    tor.length ? h("ul", { class: "sb-list" }, tor.map(li)) : null,
    haf.length ? [h("p", { class: "sb-sub" }, "מן ההפטרה"), h("ul", { class: "sb-list" }, haf.map(li))] : null,
    sb.reeh.length ? [h("p", { class: "sb-sub" }, "לאלול / הפטרת ראה"), h("p", { class: "sb-note" }, "פסוקים מן ההפטרה שנקראת גם בשבת ראה; מאמריהם נאמרו בעיקר לאלול ולשבת ראה."), h("ul", { class: "sb-list" }, sb.reeh.map(li))] : null,
    sb.dropped && sb.dropped.length ? h("p", { class: "sb-note" }, "לא נמנו: " + sb.dropped.map(x => `${x.label} (״${x.incipit}״) — ${x.note}`).join("; ") + ".") : null);
}
function parshaPage(main, T, p) {
  const rows = (T.rows || {})[p] || [];
  const D = docsOf(p), chs = D.chain;
  document.title = "פרשת " + p + " · חברותא";
  main.append(...parshaHead(p, {
    lede: chs.length ? `${chs.length === 1 ? "ביאור אחד" : chs.length + " ביאורים"} על דברי רבותינו בפרשת ${p}, לפי סדר הפסוקים. כל ביאור הוא שרשרת מאמרים על פסוק אחד — מה אמר כל רבי, מדור לדור — ולצדו ״שרשרת הדורות״. כל ציטוט מקושר אל מקורו, ואפשר לעבור בין קריאה, קשרים וחקר בלחיצה.`
      : "עוד אין ביאורים לפרשה זו. כאן — מיפוי המקורות מעץ הידע: המאמרים, השיחות והאגרות שנאמרו על הפרשה או פותחים בפסוק ממנה.",
    stats: [chs.length ? [chs.length, chs.length === 1 ? "שרשרת מבוארת" : "שרשראות מבוארות"] : null, D.nodes.length ? [D.nodes.length, "פריטי מקור"] : null, rows.length ? [rows.length, "מקורות במיפוי"] : null, [(T.stageb?.[p]?.stage || []).length, "פסוקים בשלב ב׳"]].filter(x => x && x[0]),
    extra: chs.length ? continueLink(p) : null }));
  if (chs.length) libraryList(main);            // אותה רשימה של ספר הביאורים (reader.js)
  main.append(stageBlock((T.stageb || {})[p], p));
  if (!rows.length) { main.append(parshaPager(p)); return; }
  main.append(h("div", { class: "sec-h", id: "sources" }, h("h2", null, "המקורות בעץ הידע"), h("span", { class: "tag" }, rows.length)),
    h("p", { class: "muted sec-lede" }, "היחידות מן העץ שנאמרו בשבת הפרשה, מסודרות תחתיה בספרים הערוכים לפי פרשות, או שהד״ה פותח בפסוק מן הפרשה או מן ההפטרה. המיפוי עדיין חלקי בסדרות שנמצאות רק בהיברובוקס (לקוטי שיחות א–כט, תורת מנחם תשמ״ב–תשנ״ב, שיחות קודש, אור התורה בראשית ועוד). ", h("a", { href: mkHash(["tree"]) }, "לעץ הידע כולו")));
  parshaSources(main, T, p, rows);
  main.append(h("p", { class: "sec-lede" }, h("a", { href: mkHash(["tree", "k", "p", p]) }, `מקורות הקבלה שמצוטטים במאמרים על פרשת ${p} (זהר, כתבי האריז״ל ועוד) ←`)));
  main.append(parshaPager(p));
}

/* ---------- ״איך שויך״: למה כל יחידה נמצאת במפת הפרשה (tree_parsha.py: how), ומה זיהה אותה כשהזיהוי מורחב (fill) ---------- */
const HOW = [
  ["said", "נאמר בשבת הפרשה", "נאמר בשבת שבה קוראים את הפרשה"],
  ["week", "בשבוע הפרשה", "נאמר בימי החול של שבוע הפרשה"],
  ["arr", "מסודר תחת הפרשה", "בספר הערוך לפי פרשות הוא מסודר תחת הפרשה, או בין מאמריה בכרך"],
  ["verse", "פותח בפסוק", "הד״ה פותח בפסוק מן הפרשה"],
  ["haf", "פותח בפסוק מן ההפטרה", "הד״ה פותח בפסוק מן ההפטרה"],
  ["cont", "המשך למאמר שלפניו", "המשך או ביאור למאמר שלפניו בכרך, שהוא במפת הפרשה"],
  ["chain", "בשרשרת מבוארת", "תחנה בשרשרת מבוארת על פסוק מן הפרשה"],
  ["other", "שיוך אחר", "סימן שיוך אחר"],
];
const HOW_BY = Object.fromEntries(HOW.map(x => [x[0], x]));
function howKinds(how) {
  const out = new Set();
  for (const x of String(how || "").split(/;\s*/).filter(Boolean)) {
    out.add(x.startsWith("נאמר בשבת") ? "said" : x.startsWith("בשבוע") ? "week" : x.startsWith("מסודר") ? "arr" : x.startsWith("פותח בפסוק מן ההפטרה") ? "haf"
      : x.startsWith("פותח ב") ? "verse" : x.startsWith("המשך") ? "cont" : x.startsWith("בשרשרת") ? "chain" : "other");
  }
  return [...out];
}
function howCell(how, vv, fill) {
  const ks = howKinds(how);
  const verses = vv ? String(vv).replace(/(\d+):(\d+)/g, (m, a, b) => heNum(+a) + ", " + heNum(+b)) : "";
  return h("td", { class: "how" },
    h("span", { class: "how-chips" }, ks.map(k => h("span", { class: "how-chip" + (fill ? " est" : ""), title: HOW_BY[k][2] }, HOW_BY[k][1]))),
    verses ? h("span", { class: "how-v" }, " " + verses) : null,
    fill ? h("div", { class: "how-fill" }, "זיהוי מורחב: " + fill) : null);
}
function parshaSources(main, T, p, rows) {
  const q = new URLSearchParams((location.hash.split("?")[1]) || "");
  const sel = new Set((q.get("how") || "").split(",").filter(k => HOW_BY[k]));
  let direct = q.get("direct") === "1";
  const kinds = rows.map(r => howKinds(r[6]));
  const cnt = {}; for (const ks of kinds) for (const k of ks) cnt[k] = (cnt[k] || 0) + 1;
  const nEst = rows.filter(r => r[9]).length;
  const box = h("div", { class: "how-results" });
  const bar = h("div", { class: "how-bar", role: "group", "aria-label": "סינון לפי איך שויך" });
  const save = () => { const o = {}; if (sel.size) o.how = [...sel].join(","); if (direct) o.direct = "1"; quietHash(mkHash(["parsha", p], o)); };
  const drawBar = () => {
    bar.replaceChildren(
      h("span", { class: "how-lbl" }, "איך שויך:"),
      h("button", { class: "fchip", "aria-pressed": !sel.size, onclick: () => { sel.clear(); save(); drawBar(); draw(); } }, "הכול", h("small", null, rows.length)),
      ...HOW.filter(([k]) => cnt[k]).map(([k, l, d]) => h("button", { class: "fchip", title: d, "aria-pressed": sel.has(k), onclick: () => { sel.has(k) ? sel.delete(k) : sel.add(k); save(); drawBar(); draw(); } }, l, h("small", null, cnt[k]))),
      nEst ? h("label", { class: "how-direct" }, h("input", { type: "checkbox", checked: direct, onchange: e => { direct = e.target.checked; save(); draw(); } }), ` רק שיוך ישיר (בלי ${nEst} בזיהוי מורחב)`) : null);
  };
  const draw = () => {
    box.textContent = "";
    const xs0 = rows.filter((r, i) => (!sel.size || kinds[i].some(k => sel.has(k))) && (!direct || !r[9]));
    box.append(h("p", { class: "muted how-count", "aria-live": "polite" }, xs0.length === rows.length ? `${rows.length.toLocaleString("he")} יחידות` : `${xs0.length.toLocaleString("he")} מתוך ${rows.length.toLocaleString("he")} יחידות`));
    if (!xs0.length) { box.append(h("div", { class: "empty" }, "אין יחידות בסינון הזה.")); return; }
    const by = new Map(); for (const x of xs0) (by.get(x[0]) || by.set(x[0], []).get(x[0])).push(x);
    for (const [r, xs] of [...by].sort((a, b) => a[0] - b[0])) {
      box.append(h("div", { class: "sec-h sub" }, h("h3", null, treeDot(r), " ", T.rebbeim[r] || "לא שויך"), h("span", { class: "tag mute" }, xs.length)));
      const tb = h("tbody");
      xs.sort((a, b) => String(a[2]).localeCompare(String(b[2]), "he") || String(a[4] || "").localeCompare(String(b[4] || ""), "he") || pgNum(a[5]) - pgNum(b[5]));
      for (const [, g, book, t0, y, pg, how, vv, url, fill] of xs) {
        const t = treeT(t0);
        tb.append(h("tr", null, h("td", null, url ? h("a", { href: url, target: "_blank", rel: "noopener" }, t) : t), h("td", null, book), h("td", null, g), h("td", null, y), h("td", null, pg ? "ע׳ " + pg : ""), howCell(how, vv, fill)));
      }
      box.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" }, h("thead", null, h("tr", null, h("th", null, "כותרת / ד״ה"), h("th", null, "ספר"), h("th", null, "סוג"), h("th", null, "שנה"), h("th", null, "עמוד"), h("th", null, "איך שויך"))), tb)));
    }
    chvStackTables(box);
  };
  main.append(h("details", { class: "how-legend" }, h("summary", null, "מה פירוש ״איך שויך״?"),
    h("ul", null, HOW.filter(([k]) => cnt[k]).map(([, l, d]) => h("li", null, h("b", null, l), " — ", d)),
      nEst ? h("li", null, h("span", { class: "how-chip est" }, "קו מקווקו"), " — זיהוי מורחב: היחידה שויכה בכלל עקיף (למשל זיהוי הפסוק לפי מילות הפתיחה, או זמן האמירה לפי שורת המפתח), והשורה מתחת לסימן אומרת לפי מה.") : null)),
    bar, box);
  drawBar(); draw();
}

/* ---------- מפות לפי מקום: מועדים, נ״ך לפי ספר, תחומים (build_app.py: build_places ← chavruta.tree_place) ---------- */
async function treePlaces(main, rest, q, ctx) {
  let P;
  try { P = await loadChunk("places"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את המפות"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  const [kind, name] = rest.map(x => decodeURIComponent(x || ""));
  if (kind && name) return placeMap(main, P, kind, name);
  document.title = "מפות לפי מקום · עץ הידע · חברותא";
  treeHead(main, "מפות לפי מקום", [["מפות לפי מקום", null]], "יחידות התורה שאינן על פרשה: לפי מועד ויום בלוח חב״ד, לפי ספר בנביאים ובכתובים (לפי הפסוק שהמאמר פותח בו), ולפי תחום. מאמר שנאמר בשבת שהיא גם מועד מופיע גם במפת הפרשה וגם במפת המועד.");
  if (P.summary) main.append(h("p", { class: "card-note" }, P.summary.replace(/\(UNASSIGNED\.md\)/, "")));
  const groups = [["מועד", "מועדים וימים בלוח חב״ד"], ["נ״ך", "נביאים וכתובים — לפי ספר"], ["תחום", "תחומים"], ["לוח", "לוח השנה — לפי חודש ועונה"]];
  for (const [k, title] of groups) {
    const ms = P.maps.filter(m => m.k === k).sort((a, b) => b.rows.length - a.rows.length);
    if (!ms.length) continue;
    main.append(h("div", { class: "sec-h" }, h("h2", null, title)),
      h("div", { class: "place-grid" }, ms.map(m => h("a", { class: "fchip", href: mkHash(["tree", "m", k, m.n]) }, m.n, h("small", null, m.rows.length.toLocaleString("he"))))));
  }
  window.scrollTo(0, 0);
}
function placeMap(main, P, kind, name) {
  const m = P.maps.find(x => x.k === kind && x.n === name);
  if (!m) { main.append(h("div", { class: "empty" }, "לא נמצא")); return; }
  document.title = name + " · עץ הידע · חברותא";
  treeHead(main, (kind === "מועד" ? "" : kind === "נ״ך" ? "ספר " : "") + name, [["מפות לפי מקום", mkHash(["tree", "m"])], [name, null]],
    kind === "נ״ך" ? `${m.rows.length.toLocaleString("he")} יחידות שהד״ה שלהן פותח בפסוק מספר ${name}, לפי סדר הפרקים. הפסוק זוהה לפי מילות הפתיחה של הד״ה.`
      : kind === "לוח" ? `${m.rows.length.toLocaleString("he")} שיחות ומאמרים בלי פרשה ומועד, שזמן אמירתם ידוע לפי ${/קיץ|חורף/.test(name) ? "העונה" : "החודש"}.`
      : `${m.rows.length.toLocaleString("he")} יחידות בעץ הידע.`);
  const by = new Map(); for (const x of m.rows) (by.get(x[0]) || by.set(x[0], []).get(x[0])).push(x);
  for (const [r, xs] of [...by].sort((a, b) => a[0] - b[0])) {
    main.append(h("div", { class: "sec-h sub" }, h("h3", null, treeDot(r), " ", P.rebbeim[r] || "לא שויך"), h("span", { class: "tag mute" }, xs.length)));
    const tb = h("tbody");
    for (const [, g, book, t0, y, pg, occ, url] of xs) {
      const t = treeT(t0);
      tb.append(h("tr", null, h("td", null, url ? h("a", { href: treeUrl(url), target: "_blank", rel: "noopener" }, t) : t), h("td", null, book), h("td", null, g), h("td", null, y), h("td", null, pg ? "ע׳ " + pg : ""), h("td", null, occ)));
    }
    main.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" }, h("thead", null, h("tr", null, h("th", null, "כותרת / ד״ה"), h("th", null, "ספר"), h("th", null, "סוג"), h("th", null, "שנה"), h("th", null, "עמוד"), h("th", null, kind === "נ״ך" ? "פסוק" : "זמן אמירה / שיוך"))), tb)));
  }
  chvStackTables?.(main);
  window.scrollTo(0, 0);
}

/* כותרות מן העץ (מן הסריקות): בלי סוגריים יתומים, ״<״ ורווחים לפני פיסוק */
function pgNum(p) { const m = String(p ?? "").match(/\d+/); return m ? +m[0] : 1e9; }
function treeT(t) {
  let s = String(t || "").replace(/[<>]/g, " ").replace(/\s+([,.;:])/g, "$1").replace(/([א-ת])\s+'(?=\s|$)/g, "$1'").replace(/\s+/g, " ").trim();
  s = s.replace(/\)\s*([^()]+?)\s*\(/g, "($1)").replace(/\[\s*([^[\]]+?)\s*\]/g, "[$1]");          // סוגריים הפוכים מן הסריקה
  for (const [o, c] of [["(", ")"], ["[", "]"]]) {
    const no = s.split(o).length - 1, nc = s.split(c).length - 1;
    if (no !== nc) s = s.split(o).join("").split(c).join("");
  }
  s = s.replace(/\s*\/\s*$/, "").replace(/^[\s,.;:'״׳-]+|[\s,;:'-]+$/g, "").replace(/\s+/g, " ").trim();
  return s || "(ללא כותרת)";
}


/* ---------- עץ הקבלה: הספרים (שכבות 1–3), היחידות המצוטטות ביותר, ומקורות הקבלה לפי פרשה (build_app.py: build_kabbalah) ---------- */
const KTIER = { 1: "יחידות ומפתח הפוך", 2: "יחידות ומפתח הפוך", 3: "רישום בלבד" };
function kRebbeChips(K, by) {
  return by.map((n, i) => n ? h("span", { class: "chip mute" }, treeDot(i), " ", `${K.rebbeim[i]} ${n.toLocaleString("he")}`) : null).filter(Boolean);
}
function kLink(label, url) { return url ? h("a", { href: url, target: "_blank", rel: "noopener" }, label) : label; }
async function treeKabbalah(main, rest, q, ctx) {
  let K;
  try { K = await loadChunk("kabbalah"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את עץ הקבלה"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  const [sub, arg] = rest;
  if (sub === "w") return kWork(main, K, decodeURIComponent(arg || ""));
  if (sub === "p") return kParsha(main, K, decodeURIComponent(arg || ""));
  document.title = "עץ הקבלה · עץ הידע · חברותא";
  treeHead(main, "עץ הקבלה — מקורות קודמים", [["עץ הקבלה", null]],
    `${K.works.length} ספרים, ${K.nunits.toLocaleString("he")} יחידות רשומות, ו־${K.total.toLocaleString("he")} הפניות שנמצאו בספרי רבותינו. היחידה היא המקום כפי שספרי החסידות מפנים אליו (״זח״א עב, ב״, ״ע״ח שער מט פ״ג״, ״שער הפסוקים פ׳ וירא״); בספרים שבספריא — עם קישור. הטקסט עצמו אינו מועתק כאן.`);
  main.append(h("p", { class: "card-note" }, `עדכון אחרון: ${K.built.split("-").reverse().join(".")}. ההפניות זוהו בשכבת הטקסט של כרכי חב״ד און ליין (סריקה — יש החמצות ורעש) ובטקסט של ספריית חב״ד. כל הפניה נבדקת בטקסט לפני שמביאים אותה.`));
  const ps = Object.keys(K.parsha || {});
  if (ps.length) main.append(h("div", { class: "sec-h" }, h("h2", null, "מקורות הקבלה לפי פרשה")),
    h("p", { class: "muted" }, "לכל פרשה: אילו מקורות קבלה מצוטטים במאמרים ובשיחות שבמיפוי הפרשה, ואצל מי."),
    h("div", { class: "chips" }, ps.map(p => h("a", { class: "fchip", href: mkHash(["tree", "k", "p", p]) }, "פרשת " + p, h("small", null, K.parsha[p].length)))));
  for (const tier of [1, 2, 3]) {
    const ws = K.works.filter(w => w.tier === tier);
    if (!ws.length) continue;
    main.append(h("div", { class: "sec-h" }, h("h2", null, tier === 1 ? "שכבה 1 — הזהר, האריז״ל, הרמ״ק והשל״ה" : tier === 2 ? "שכבה 2 — שאר כתבי האריז״ל וספרי יסוד" : "שכבה 3 — רישום בלבד")));
    const tb = h("tbody");
    for (const w of ws) tb.append(h("tr", null,
      h("td", null, w.nr && tier < 3 ? h("a", { href: mkHash(["tree", "k", "w", w.id]) }, w.he) : w.he),
      h("td", null, w.unit || KTIER[tier]), h("td", null, w.nu ? w.nu.toLocaleString("he") : "—"), h("td", null, w.nr ? w.nr.toLocaleString("he") : "—"),
      h("td", null, w.url ? h("a", { href: w.url, target: "_blank", rel: "noopener" }, "ספריא ", icon("i-ext")) : "—")));
    main.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" },
      h("thead", null, h("tr", null, h("th", null, "ספר"), h("th", null, "יחידת רישום"), h("th", null, "יחידות"), h("th", null, "הפניות"), h("th", null, "ברשת"))), tb)));
  }
  main.append(h("div", { class: "sec-h" }, h("h2", null, "כמה פעמים מצוטט כל ספר אצל כל אחד מרבותינו נשיאינו")));
  const tb = h("tbody");
  for (const w of K.works.filter(w => w.nr)) tb.append(h("tr", null, h("td", null, w.he), ...w.by.map(n => h("td", null, n ? n.toLocaleString("he") : ""))));
  main.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" },
    h("thead", null, h("tr", null, h("th", null, "ספר"), ...K.rebbeim.map((r, i) => h("th", null, treeDot(i), " ", r)))), tb)));
  chvStackTables?.(main);
  window.scrollTo(0, 0);
}
function kWork(main, K, wid) {
  const w = K.works.find(x => x.id === wid);
  if (!w) { main.append(h("div", { class: "empty" }, "לא נמצא")); return; }
  document.title = w.he + " · עץ הקבלה · חברותא";
  treeHead(main, w.he, [["עץ הקבלה", mkHash(["tree", "k"])], [w.he, null]],
    `יחידת רישום: ${w.unit || "—"} · ${w.nu.toLocaleString("he")} יחידות · ${w.nr.toLocaleString("he")} הפניות בספרי רבותינו.`);
  if (w.url) main.append(h("p", null, h("a", { href: w.url, target: "_blank", rel: "noopener" }, "הספר בספריא ", icon("i-ext"))));
  main.append(h("div", { class: "chips" }, kRebbeChips(K, w.by)));
  const rows = (K.top || {})[wid] || [];
  main.append(h("div", { class: "sec-h" }, h("h2", null, "היחידות המצוטטות ביותר"), h("span", { class: "tag" }, rows.length)));
  if (!rows.length) { main.append(h("p", { class: "muted" }, "ההפניות לספר זה נספרו בלי יחידה (הפניה כללית, או מקום שאין לו מיפוי).")); return; }
  const tb = h("tbody");
  for (const [label, url, sec, n, by] of rows) tb.append(h("tr", null, h("td", null, kLink(label, url)), h("td", null, sec), h("td", null, n.toLocaleString("he")),
    h("td", null, by.map((c, i) => c ? `${K.rebbeim[i]} ${c}` : null).filter(Boolean).join(" · "))));
  main.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" },
    h("thead", null, h("tr", null, h("th", null, "מקום"), h("th", null, "פרשה / שער"), h("th", null, "הפניות"), h("th", null, "אצל"))), tb)));
  chvStackTables?.(main);
  window.scrollTo(0, 0);
}
function kParsha(main, K, p) {
  const rows = (K.parsha || {})[p];
  if (!rows) { main.append(h("div", { class: "empty" }, "אין נתונים לפרשה זו")); return; }
  document.title = "מקורות קבלה בפרשת " + p + " · חברותא";
  const wname = Object.fromEntries(K.works.map(w => [w.id, w.he]));
  treeHead(main, "מקורות הקבלה בפרשת " + p, [["עץ הקבלה", mkHash(["tree", "k"])], ["פרשת " + p, null]],
    `${rows.length} מקומות בספרי הקבלה שמצוטטים במאמרים ובשיחות על פרשת ${p} (מתוך המאמרים במיפוי הפרשה שיש להם טקסט כאן — ספריית חב״ד וחב״ד און ליין). רשימה לאיתור: כל הפניה נבדקת בטקסט לפני שמביאים אותה.`);
  main.append(h("p", null, h("a", { href: mkHash(["parsha", p]) }, "לעמוד הפרשה ולמיפוי המקורות ←")));
  const byW = new Map(); for (const r of rows) (byW.get(r[3]) || byW.set(r[3], []).get(r[3])).push(r);
  const order = K.works.map(w => w.id).filter(id => byW.has(id));
  for (const wid of order) {
    const xs = byW.get(wid);
    main.append(h("div", { class: "sec-h sub" }, h("h3", null, wname[wid] || wid), h("span", { class: "tag mute" }, xs.length)));
    const tb = h("tbody");
    for (const [label, url, sec, , cites] of xs) tb.append(h("tr", null, h("td", null, kLink(label, url)), h("td", null, sec),
      h("td", null, ...cites.flatMap(([r, t, y, u], i) => [i ? "; " : "", treeDot(r), " ", K.rebbeim[r] || "", " — ", u ? h("a", { href: u, target: "_blank", rel: "noopener" }, treeT(t) + (y ? " " + y : "")) : treeT(t)]))));
    main.append(h("div", { class: "tbl-wrap" }, h("table", { class: "tree-tbl" },
      h("thead", null, h("tr", null, h("th", null, "מקום"), h("th", null, "פרשה / שער"), h("th", null, "מצוטט אצל"))), tb)));
  }
  chvStackTables?.(main);
  window.scrollTo(0, 0);
}


/* חברותא · שער האתר (#/home): מה זה חברותא, הפרשיות (כל פרשה — כרטיס), פרשת השבוע, הלימוד היומי, מה חדש, עץ הידע, ואיך לומדים כאן.
   וגם רכיבים משותפים לעמודי הפרשה (בראשית — reader.js, שאר הפרשיות — tree.js): כותרת הפרשה והמעבר לפרשה הקודמת/הבאה. */

/* ---------- לוח עברי (Intl, בלי ספריות) ---------- */
const HEB_MONTH = { Tishri: "תשרי", Heshvan: "חשוון", Kislev: "כסלו", Tevet: "טבת", Shevat: "שבט", Adar: "אדר", "Adar I": "אדר א׳", "Adar II": "אדר ב׳", Nisan: "ניסן", Iyar: "אייר", Sivan: "סיוון", Tamuz: "תמוז", Av: "אב", Elul: "אלול" };
function hebParts(d) {
  try {
    const f = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    const ps = f.formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
    const g = t => ps.find(x => x.type === t)?.value;
    return { d: +g("day"), m: g("month"), y: +String(g("year") || "").replace(/\D/g, "") };
  } catch (e) { return null; }
}
/** ״ג׳ בחשוון תשפ״ז״ */
function hebDate(d) {
  const p = hebParts(d); if (!p || !HEB_MONTH[p.m]) return "";
  return `${gem(p.d)} ב${HEB_MONTH[p.m]} ${p.y ? hebYear(p.y) : ""}`.trim();
}
/** פרשת השבוע — מלוח השבתות שנבנה עם האתר (build_app.py: week_calendar, חוץ לארץ): השבת הקרובה (או היום, בשבת).
   מחזיר את שם הפרשה הראשונה (בפרשיות מחוברות — הראשונה; weekParshas — שתיהן). שבת של חג — null. */
function weekParshas(today = new Date()) {
  const W = S.core?.weeks || [];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const t = iso(today);
  const w = W.find(x => x[0] >= t);
  return w ? w[1] : [];
}
function weekParsha(today = new Date()) { return weekParshas(today)[0] || null; }

/* ---------- רכיבים משותפים לעמודי הפרשה ---------- */
const PARSHA_DESC = {
  "בראשית": "ספר ביאורים שלם: כל פסוקי הפרשה שיש עליהם מאמרים — יחידה אחר יחידה, ושרשראות הדורות על הפסוקים המרכזיים.",
  "נח": "שרשראות מבוארות על פסוקי הפרשה וההפטרה, ומיפוי כל המקורות בעץ הידע.",
};
function parshaInfo(p) {
  const list = S.core.parshiyot || [], i = list.findIndex(x => x.n === p), rec = list[i] || { n: p, he: "פרשת " + p };
  const site = S.core.site || {};
  const chains = (site.chains || {})[p] || [], src = (site.sources || {})[p] || 0;
  const stage = rec.home ? "full" : chains.length ? "chains" : "map";
  const book = rec.b || "בראשית", inBook = list.filter(x => (x.b || "בראשית") === book).findIndex(x => x.n === p);
  return { ...rec, i, book, ord: gem(inBook + 1), chains, src, stage, prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
const STAGE_LABEL = { full: "ביאור מלא", chains: "שרשראות מבוארות", map: "מיפוי מקורות" };
function weekBadge(p) { return weekParshas().includes(p) ? h("span", { class: "wk" }, "פרשת השבוע") : null; }
function parshaHead(p, o = {}) {
  const P = parshaInfo(p);
  return [
    h("nav", { class: "crumbs", "aria-label": "מיקום" }, h("a", { href: mkHash(["home"]) }, "חברותא"), h("span", { class: "sep", "aria-hidden": "true" }, "›"), h("span", { "aria-current": "page" }, "פרשת " + p)),
    h("header", { class: "phead2" },
      h("p", { class: "kicker" }, h("span", null, `פרשה ${P.ord} בספר ${P.book}`), h("span", { class: "stage s-" + P.stage }, STAGE_LABEL[P.stage]), weekBadge(p)),
      h("h1", { class: "page-title" }, "פרשת " + p),
      o.lede ? h("p", { class: "lede" }, o.lede) : null,
      o.stats && o.stats.length ? h("ul", { class: "pstats" }, o.stats.map(([n, l]) => h("li", null, h("b", null, typeof n === "number" ? fmt(n) : n), h("span", null, l)))) : null,
      o.extra || null)];
}
function parshaHrefOf(n) { return n === S.core.parsha ? mkHash(["biurim"]) : mkHash(["parsha", n]); }
function parshaPager(p) {
  const P = parshaInfo(p);
  if (!P.prev && !P.next) return null;
  return h("nav", { class: "ppager2", "aria-label": "פרשה קודמת והבאה" },
    P.prev ? h("a", { href: parshaHrefOf(P.prev.n), rel: "prev", class: "prev" }, h("small", null, "→ הפרשה הקודמת"), h("b", null, P.prev.he)) : h("span"),
    P.next ? h("a", { href: parshaHrefOf(P.next.n), rel: "next", class: "next" }, h("small", null, "הפרשה הבאה ←"), h("b", null, P.next.he)) : h("span"));
}

/* ---------- השער ---------- */
VIEWS.home = async function (rest, q, ctx) {
  Aside.detach?.();
  const main = $("#view"); main.className = "main home"; main.textContent = "";
  document.title = "חברותא · ביאורים על מאמרי רבותינו נשיאינו";
  const site = S.core.site || {}, ps = S.core.parshiyot || [];
  const today = new Date(), wk = weekParsha(today), wks = weekParshas(today), hd = hebDate(today);
  const H = docsOf(S.home);          // פרשת הבית — בלי תלות בפרשה שנבחרה לאחרונה
  const nBiurim = H.books.length + ps.reduce((a, p) => a + (p.home ? 0 : ((site.chains || {})[p.n] || []).length), 0);
  const nSrc = H.nodes.length + Object.values(site.sources || {}).reduce((a, b) => a + b, 0);

  // שער
  const sin = h("input", { type: "search", name: "q", placeholder: "חיפוש ד״ה, פסוק או מושג…", "aria-label": "חיפוש באתר", autocomplete: "off" });
  const hero = h("section", { class: "h-hero", "aria-labelledby": "h-title" },
    h("p", { class: "h-bsd", "aria-hidden": "true" }, "בס״ד"),
    h("p", { class: "h-kicker" }, "מערכת לימוד וניתוח של מאמרי חסידות"),
    h("h1", { class: "h-title", id: "h-title" }, "חברותא"),
    h("p", { class: "h-sub" }, "דברי רבותינו נשיאינו על פרשיות התורה — פסוק אחר פסוק, דור אחר דור"),
    h("div", { class: "h-rule", "aria-hidden": "true" }, h("i"), h("span", null, "❖"), h("i")),
    h("p", { class: "h-purpose" }, "חברותא מלווה את הלומד בדברי שבעת רבותינו נשיאינו על כל פרשה: מה אמר כל רבי על כל פסוק, איך כל דור בנה על קודמו, ומה התחדש בו. כל ציטוט מקושר אל מקורו, ואפשר לעבור מן המקור אל הביאור ובחזרה בלחיצה."),
    h("form", { class: "h-search", role: "search", onsubmit: e => { e.preventDefault(); const v = sin.value.trim(); go(mkHash(["search"], v ? { q: v } : {})); } },
      icon("i-search"), sin, h("button", { class: "btn primary", type: "submit" }, "חיפוש")),
    h("ul", { class: "h-stats" },
      [[ps.length, "פרשיות"], [nBiurim, "ביאורים ושרשראות"], [nSrc, "מקורות ממופים"], [site.tree?.units || 0, "יחידות בעץ הידע"]].map(([n, l]) => h("li", null, h("b", null, fmt(n)), h("span", null, l)))),
    continueLink());

  // הפרשיות
  const cards = ps.map(p => {
    const P = parshaInfo(p.n), href = parshaHrefOf(p.n);
    const D = docsOf(p.n);
    const stats = p.home ? [`${H.books.length} ביאורים`, `${H.chain.length} שרשראות דורות`, `${fmt(H.nodes.length)} פריטי מקור`]
      : [P.chains.length ? (P.chains.length === 1 ? "שרשרת מבוארת אחת" : `${P.chains.length} שרשראות מבוארות`) : null, D.nodes.length ? `${fmt(D.nodes.length)} פריטי מקור` : null, P.src ? `${fmt(P.src)} מקורות במיפוי` : null].filter(Boolean);
    const isWk = wks.includes(p.n);
    return h("li", { class: "pc" + (isWk ? " is-week" : "") + " st-" + P.stage },
      h("span", { class: "pc-ord", "aria-hidden": "true" }, P.ord),
      h("div", { class: "pc-b" },
        h("p", { class: "pc-k" }, h("span", { class: "stage s-" + P.stage }, STAGE_LABEL[P.stage]), isWk ? h("span", { class: "wk" }, "פרשת השבוע") : null),
        h("h3", null, h("a", { href }, p.he)),
        h("p", { class: "pc-s" }, stats.join(" · ")),
        h("p", { class: "pc-d" }, PARSHA_DESC[p.n] || (P.chains.length ? "שרשראות מבוארות על פסוקי הפרשה, ומיפוי כל המקורות בעץ הידע." : "מיפוי המקורות מעץ הידע: המאמרים, השיחות והאגרות על הפרשה. הביאורים — בשלב הבא.")),
        P.chains.length ? h("ul", { class: "pc-ch", "aria-label": "השרשראות ב" + p.he }, P.chains.map(c => h("li", null, h("a", { href: c.u }, "״" + c.t + "״"), h("small", null, c.a)))) : null,
        p.home ? h("p", { class: "pc-go" }, h("a", { href }, "לספר הביאורים ←")) : null));
  });
  const books = [...new Set(ps.map(p => p.b || "בראשית"))];
  const parshiyot = h("section", { class: "h-sec", "aria-labelledby": "h-ps" },
    h("header", { class: "h-sec-h" }, h("h2", { id: "h-ps" }, "הפרשיות"), h("p", null, "כל פרשה — ספר משלה. בבראשית: ביאור מלא של כל הפסוקים; " + (ps.filter(x => !x.home && (S.core.site?.chains || {})[x.n]?.length).map(x => "ב" + x.n).join(", ") || "בנח") + ": שרשראות מבוארות; בשאר — מיפוי המקורות מעץ הידע, לקראת הביאור.")),
    books.map(b => {
      const idx = ps.map((p, i) => (p.b || "בראשית") === b ? i : -1).filter(i => i >= 0);
      const open = b === "בראשית" || idx.some(i => wks.includes(ps[i].n));
      return h("details", { class: "h-book", open: open || null },
        h("summary", null, h("h3", { class: "h-book-t" }, "ספר " + b), h("span", { class: "tag mute" }, idx.length + " פרשיות")),
        h("ol", { class: "h-pgrid" }, idx.map(i => cards[i])));
    }));

  // לימוד יומי · מה חדש · עץ הידע
  const N = site.new || {}, T = site.tree || {};
  const trio = h("section", { class: "h-sec h-trio", "aria-label": "עוד בחברותא" },
    h("article", { class: "hx" },
      h("p", { class: "hx-k" }, icon("i-sun"), "היום", hd ? h("span", { class: "hx-d" }, hd) : null),
      h("h2", null, h("a", { href: mkHash(["daily"]) }, "לימוד יומי")),
      h("p", null, "שיעורי היום לפי הלוח: תניא יומי (מנוקד), ותורה אור ולקוטי תורה — עם קישור לנוסח המנוקד של חסידות בהירה, ומעבר ליום הקודם והבא."),
      h("p", { class: "hx-go" }, h("a", { href: mkHash(["daily"]) }, "ללימוד של היום ←"))),
    h("article", { class: "hx" },
      h("p", { class: "hx-k" }, icon("i-flag"), "מה חדש", N.generated ? h("span", { class: "hx-d" }, N.generated.split("-").reverse().join(".")) : null),
      h("h2", null, h("a", { href: mkHash(["new"]) }, "מה חדש בעולם החסידות")),
      (N.top || []).length ? h("ul", { class: "hx-list" }, N.top.slice(0, 3).map(i => h("li", null, h("a", { href: i.u, target: "_blank", rel: "noopener", dir: i.lang === "he" ? "rtl" : "auto" }, i.t), h("small", null, i.src)))) : h("p", null, "פרסומים כתובים חדשים מן האתרים שבמעקב."),
      h("p", { class: "hx-go" }, h("a", { href: mkHash(["new"]) }, N.n ? `כל ${N.n} הפריטים מ־${N.sources} אתרים ←` : "לכל הפריטים ←"))),
    h("article", { class: "hx" },
      h("p", { class: "hx-k" }, icon("i-tree"), "קטלוג"),
      h("h2", null, h("a", { href: mkHash(["tree"]) }, "עץ הידע")),
      h("p", null, `איפה נמצא כל מאמר, שיחה ואגרת של רבותינו נשיאינו, מהבעש״ט ועד הרבי: ${fmt(T.units || 0)} יחידות ב־${T.series || 0} סדרות ספרים — ספר, כרך, עמוד ושנה, וקישור למקום ברשת.`),
      h("p", { class: "hx-go" }, h("a", { href: mkHash(["tree"]) }, "לעץ הידע ←"))),
    h("article", { class: "hx" },
      h("p", { class: "hx-k" }, icon("i-list"), "מפתח"),
      h("h2", null, h("a", { href: mkHash(["topics"], {}, { nomode: true }) }, "מפתח עניינים")),
      h("p", null, "מושגי החסידות, האישים, הזמנים והדימויים — מ״אור אין סוף״ ועד ״תיבת נח״ — ובאילו ביאורים ובאילו קטעי מקור כל אחד מהם נידון."),
      h("p", { class: "hx-go" }, h("a", { href: mkHash(["topics"], {}, { nomode: true }) }, "למפתח העניינים ←"))));

  // איך לומדים
  const how = h("section", { class: "h-sec h-how", "aria-labelledby": "h-how" },
    h("header", { class: "h-sec-h" }, h("h2", { id: "h-how" }, "איך לומדים בחברותא"), h("p", null, "שלושה מצבי עבודה לכל ביאור; המעבר ביניהם שומר על מקום הקריאה.")),
    h("ol", { class: "how" }, MODES.map(m => h("li", null, h("span", { class: "how-i" }, icon(m.icon)), h("b", null, m.label), h("span", null, {
      read: "עמודה אחת, ההערות בשוליים: קריאה רציפה של הביאור, וכל ציטוט נפתח במקומו.",
      links: "לכל קטע, ציטוט או פריט: מאיפה הוא, ומה עוד בפרשה מתקשר אליו.",
      research: "שלשלת הדורות, מטריצת פסוק × דור, ומפת המקורות על ציר הזמן.",
    }[m.id]), h("kbd", { title: "קיצור מקלדת" }, m.n)))));

  main.append(hero, parshiyot, trio, how);
  if (!ctx.keep) window.scrollTo(0, 0);
};


/* חברותא · אודות ושיטת העבודה (#/about): מה יש באתר, איך נבנה כל ביאור, מה לא נעשה, המקורות והרישיונות */

VIEWS.about = async function (rest, q, ctx) {
  Aside.detach?.();
  const main = $("#view"); main.className = "main page about"; main.textContent = "";
  document.title = "אודות ושיטת העבודה · חברותא";
  const site = (S.core.site || {});
  const nCh = Object.values(site.chains || {}).reduce((a, x) => a + (x.length || 0), 0);
  const P = (...c) => h("p", null, ...c);
  const A = (href, t, ext) => h("a", ext ? { href, target: "_blank", rel: "noopener" } : { href }, t);
  const sec = (id, title, ...body) => h("section", { class: "ab-sec", id }, h("h2", null, title), ...body);
  const steps = [
    ["איסוף המקורות", "לכל פסוק או ד״ה אוספים את המאמרים, השיחות והאגרות של רבותינו נשיאינו עליו — מן הספרים שבספריות המקוונות (ספריית חב״ד, היברובוקס, Sefaria ועוד), ככל האפשר מול צילום הדף. כל קטע שמצוטט נשמר כ״קטע מקור״ עם הספר, הכרך והעמוד."],
    ["כתיבת הביאור", "הביאור נכתב בסיוע בינה מלאכותית, מתוך קטעי המקור בלבד. הציטוטים באים בלשון המקור, ואחרי כל ציטוט — הסבר שפותח ב״כלומר״. קשר שאנחנו מציעים בין מאמרים מסומן במסגרת ״סינתזה״, והערה שלנו — ״(הערת המהדורה: …)״, כדי שיהיה ברור מה אמרו רבותינו ומה אומרים אנחנו."],
    ["שרשרת הדורות", "לכל שרשרת יש גם טבלה: מתי נאמר כל מאמר, מתי נכתב ונדפס, מה השאלה שהוא שואל, מה התשובה, ולאילו מאמרים שלפניו הוא מפנה — ובכל תא מסומן אם הדבר חדש, מתבאר, במרכז או חוזר."],
    ["בקרה פנימית", "כל ציטוט במירכאות נבדק במכונה מול קטעי המקור, אות באות. אחר כך בודק נפרד, שלא ראה את תהליך הכתיבה, עובר על הביאור מול המקורות."],
    ["בחינה חיצונית", "הביאור נשלח, יחד עם קטעי המקור והנחיות בדיקה, לבוחנים חיצוניים — מודלים אחרים (ChatGPT, ובחלק מהביאורים גם Grok ו־Gemini). הם מחפשים טעויות בייחוס, בשנים ובעמודים, סייגים שנשמטו, והסברים שאומרים יותר מן המקור. כל ממצא מתקבל או נדחה בנימוק, וההכרעות נשמרות."],
    ["סבב סגירה ונעילה", "סבב שני בודק את התיקונים עצמם. אחריו הנוסח ננעל, ובראש כל ביאור כתוב מה הוא עבר ומתי."],
    ["סגירת השאלות הפתוחות", "כל שאלה שנשארה פתוחה אחרי הבקרה נחקרת מול המקורות: ראיה מילולית לכל הכרעה, בדיקת מכונה שהראיה אכן במקור, בודק נפרד שמאשר או מוריד את ההכרעה, ובחינה חיצונית של כל שינוי בגוף הביאור. בסוף כל ביאור, בפרק ״שאלות שנבדקו״, כתוב ליד כל שאלה אם הוכרעה, או למה אין בידינו להכריע ומה היה מכריע."]];
  main.append(
    h("nav", { class: "crumbs" }, h("a", { href: mkHash(["home"], {}, { nomode: true }) }, "חברותא"), h("span", null, "›"), "אודות"),
    h("h1", { class: "page-title" }, "אודות חברותא"),
    h("p", { class: "lede" }, "חברותא מלווה את הלומד בדברי רבותינו נשיאינו על פרשות התורה: מה אמר כל רבי על כל פסוק, מן הבעל שם טוב והמגיד ועד הרבי, איך כל דור בנה על קודמו, ומה התחדש בו. כל ציטוט מקושר אל מקורו."),
    h("div", { class: "ab-note", role: "note" }, h("b", null, "חשוב לדעת: "), "זו טיוטה בעבודה. הביאורים נכתבו בסיוע בינה מלאכותית ונבדקו מול המקורות, אבל לא עברו בקרה רבנית או תורנית. אין להסתמך עליהם להלכה או למעשה לפני עיון במקורות עצמם."),
    sec("what", "מה יש באתר",
      h("dl", { class: "ab-dl" },
        h("dt", null, A(mkHash(["home"], {}, { nomode: true }), "הפרשיות")), h("dd", null, `בפרשת בראשית — ביאור מלא לכל הפסוקים (27 ביאורי פסוק ו־20 שרשראות). מפרשת נח — שרשראות מבוארות (${nCh || 4} עד עכשיו), ופסוקים נוספים בשלב ב׳. בשאר הפרשיות — מיפוי המקורות, לקראת הביאור.`),
        h("dt", null, "שלושה מצבי קריאה"), h("dd", null, "בפרשת בראשית: קריאה — עמודה אחת והערות בשוליים; קשרים — לכל קטע או ציטוט: מאיפה הוא ומה עוד מתקשר אליו; חקר — שלשלת הדורות, מטריצת פסוק × דורות ומפת המקורות."),
        h("dt", null, A(mkHash(["tree"]), "עץ הידע")), h("dd", null, "קטלוג המיקום של תורת רבותינו נשיאינו — מאמרים, שיחות, אגרות ורשימות — לפי ספר, כרך, עמוד ושנה, עם קישור למקום ברשת."),
        h("dt", null, A(mkHash(["sources"]), "מקורות")), h("dd", null, "כל הפריטים שבמפת פרשת בראשית, עם שנות האמירה, הכתיבה והפרסום, וסינון לפי רבי, סוג וביאור."),
        h("dt", null, A(mkHash(["daily"]), "לימוד יומי")), h("dd", null, "תניא יומי, ותורה אור ולקוטי תורה לפי הלוח — הטקסט עצמו, קישור לנוסח המנוקד, ומה שכבר ביארנו או מיפינו על המאמר של היום."),
        h("dt", null, A(mkHash(["topics"], {}, { nomode: true }), "מפתח עניינים")), h("dd", null, "מושגי החסידות, האישים, הזמנים והדימויים, ובאילו ביאורים וקטעי מקור כל אחד מהם נידון; ולכל ערך — ערכים שבאים איתו בדרך כלל."),
        h("dt", null, A(mkHash(["new"]), "מה חדש")), h("dd", null, "פרסומים כתובים חדשים בעולם החסידות מן החודש האחרון, בסיכום קצר וקישור למקור."))),
    sec("how", "איך נבנה כל ביאור", h("ol", { class: "ab-steps" }, steps.map(([t, d]) => h("li", null, h("b", null, t), h("span", null, d))))),
    sec("sources", "מקורות ורישיונות",
      h("ul", { class: "ab-list" },
        h("li", null, "ציטוטי המאמרים והשיחות — מן הספרים שיצאו לאור בהוצאת קה״ת ובהוצאות אחרות. הזכויות בהם שייכות למו״לים; הציטוטים באים לשם לימוד ועיון, וכל ציטוט מקושר אל מקורו."),
        h("li", null, "פסוקי התורה המנוקדים — מ־", A("https://www.sefaria.org/", "Sefaria", true), " (נחלת הכלל)."),
        h("li", null, "התניא, תורה אור ולקוטי תורה בלימוד היומי — נוסח הוצאת קה״ת (© Kehot Publication Society) באמצעות ", A("https://www.sefaria.org/", "Sefaria", true), ", ברישיון CC BY-NC."),
        h("li", null, "הנוסח המנוקד והמפוסק של תורה אור ולקוטי תורה — באתר ", A("https://chassidutbehirah.com/", "חסידות בהירה", true), ". אנחנו רק מקשרים אליו; הטקסט שלהם אינו מועתק לכאן."),
        h("li", null, "לוח הלימוד בתורה אור ולקוטי תורה — ״מורה שיעור״ לשנת תשפ״ז, כפי שהופץ."),
        h("li", null, "הגופנים — Frank Ruhl Libre, David Libre, Noto Serif Hebrew ו־Assistant, ברישיון SIL Open Font License."))),
    sec("open", "מצב הבקרה", P("מצב הבקרה של כל ביאור בפרשת בראשית מפורט ב", A(mkHash(["biurim"], { tab: "status", mode: "research" }), "תצוגת הסטטוס"), ". בפרשת נח — מצב כל שרשרת כתוב בראש הביאור שלה, ובסופו — ״שאלות שנבדקו״."))
  );
  if (!ctx.keep) window.scrollTo(0, 0);
};


/* חברותא · מפתח עניינים (#/topics, #/topics/<ערך>): מושגים, אישים, זמנים ודימויים — איפה הם בביאורים ובקטעי המקור.
   הנתונים: data/topics.js (tools/app/build_topics.py). לכל ערך: הפרקים בביאורים (לפי משקל), קטעי המקור, ו״ראו גם״. */

VIEWS.topics = async function (rest, q, ctx) {
  Aside.detach?.();
  const main = $("#view"); main.className = "main page topics"; main.textContent = "";
  let T;
  try { T = await loadChunk("topics"); } catch (e) { main.append(h("div", { class: "empty" }, h("b", null, "לא ניתן לטעון את מפתח העניינים"), String(e.message || e))); return; }
  if (!ctx.alive()) return;
  const byName = new Map(T.terms.map(t => [t.t, t]));
  const name = rest.length ? decodeURIComponent(rest.join("/")) : "";
  const crumbs = (...xs) => h("nav", { class: "crumbs" }, h("a", { href: mkHash(["home"], {}, { nomode: true }) }, "חברותא"), ...xs.flatMap(x => [h("span", null, "›"), x]));
  const termLink = (t, extra) => h("a", { class: "tp-chip", href: mkHash(["topics", t.t]) }, t.t, h("small", null, t.n), extra || null);
  if (name && byName.has(name)) return topicPage(main, T, byName.get(name), byName, crumbs, ctx);
  // ---------- דף המפתח ----------
  document.title = "מפתח עניינים · חברותא";
  const cat = q.get("c") || "", qs0 = q.get("q") || "", sort = q.get("s") || "ab";
  main.append(crumbs("מפתח עניינים"), h("h1", { class: "page-title" }, "מפתח עניינים"),
    h("p", { class: "lede" }, `${T.terms.length} ערכים — מושגי החסידות, האישים, הזמנים והדימויים — ואיפה כל אחד מהם נידון בביאורים (${T.nsec.toLocaleString("he")} פרקים) ובקטעי המקור שבידינו. לכל ערך: הפרקים שבהם הוא עיקרי, קטעי המקור בלשון רבותינו, וערכים שבאים איתו בדרך כלל.`));
  const inp = h("input", { type: "search", class: "tp-q", placeholder: "סינון הערכים…", value: qs0, "aria-label": "סינון הערכים" });
  const bar = h("div", { class: "chips", role: "group", "aria-label": "קטגוריה" });
  const sortBar = h("div", { class: "chips tp-sort", role: "group", "aria-label": "סדר" });
  const body = h("div", { class: "tp-body" });
  const state = { cat, q: qs0, sort };
  const sync = () => quietHash(mkHash(["topics"], Object.fromEntries(Object.entries({ c: state.cat, q: state.q, s: state.sort === "ab" ? "" : state.sort }).filter(([, v]) => v))));
  const draw = () => {
    bar.textContent = "";
    for (const c of ["", ...T.cats]) bar.append(h("button", { class: "fchip", "aria-pressed": state.cat === c, onclick: () => { state.cat = c; sync(); draw(); } }, c || "הכול", h("small", null, c ? T.terms.filter(t => t.c === c).length : T.terms.length)));
    sortBar.textContent = "";
    for (const [k, l] of [["ab", "לפי א״ב"], ["n", "לפי היקף"]]) sortBar.append(h("button", { class: "fchip", "aria-pressed": state.sort === k, onclick: () => { state.sort = k; sync(); draw(); } }, l));
    body.textContent = "";
    const nq = norm(state.q);
    let ts = T.terms.filter(t => (!state.cat || t.c === state.cat) && (!nq || norm(t.t + " " + t.f.join(" ")).includes(nq)));
    if (!ts.length) { body.append(h("div", { class: "empty" }, "אין ערך מתאים. נסו מילה אחרת, או ", h("a", { href: mkHash(["search"], { q: state.q }) }, "חפשו את ״" + state.q + "״ בכל האתר"), ".")); return; }
    if (state.sort === "n") { ts = [...ts].sort((a, b) => b.n - a.n); body.append(h("div", { class: "tp-cloud" }, ts.map(t => termLink(t)))); return; }
    // לפי א״ב, בקבוצות לפי האות הראשונה
    ts = [...ts].sort((a, b) => a.t.localeCompare(b.t, "he"));
    const groups = new Map();
    for (const t of ts) { const k = t.t[0]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
    const az = h("nav", { class: "tp-az", "aria-label": "אותיות" }, [...groups.keys()].map(k => h("a", { href: "#", onclick: e => { e.preventDefault(); document.getElementById("tp-" + k)?.scrollIntoView({ block: "start" }); } }, k)));
    body.append(az);
    for (const [k, xs] of groups) body.append(h("section", { class: "tp-letter", id: "tp-" + k }, h("h2", null, k),
      h("ul", { class: "tp-list" }, xs.map(t => h("li", null, h("a", { href: mkHash(["topics", t.t]) }, t.t), h("span", { class: "tp-n" }, `${t.n} פרקים · ${t.docs} ביאורים`), t.see.length ? h("span", { class: "tp-see" }, "ראו גם: ", t.see.slice(0, 3).join(" · ")) : null)))));
  };
  let tmo; inp.addEventListener("input", () => { clearTimeout(tmo); tmo = setTimeout(() => { state.q = inp.value.trim(); sync(); draw(); }, 200); });
  main.append(h("div", { class: "tp-tools" }, inp, sortBar), bar, body);
  draw();
  if (!ctx.keep) window.scrollTo(0, 0);
};

async function topicPage(main, T, t, byName, crumbs, ctx) {
  document.title = t.t + " · מפתח עניינים · חברותא";
  main.append(crumbs(h("a", { href: mkHash(["topics"]) }, "מפתח עניינים"), t.t),
    h("p", { class: "tp-cat" }, h("a", { href: mkHash(["topics"], { c: t.c }) }, t.c)),
    h("h1", { class: "page-title" }, t.t),
    h("p", { class: "lede" }, `נידון ב־${t.n} פרקים ב־${t.docs} ביאורים, ומופיע ב־${t.nx} קטעי מקור.`, t.f.length ? h("span", { class: "tp-forms" }, " צורות שנכללו: ", t.f.join(" · "), ".") : null));
  if (t.see.length) main.append(h("div", { class: "tp-related" }, h("b", null, "ראו גם"), h("div", { class: "tp-cloud" }, t.see.map(s => byName.get(s)).filter(Boolean).map(x => h("a", { class: "tp-chip", href: mkHash(["topics", x.t]) }, x.t, h("small", null, x.n))))));
  // הפרקים — מקובצים לפי ביאור, הביאורים לפי סך המשקל
  const per = new Map();
  for (const [did, pid, w] of t.s) { if (!getDoc(did)) continue; if (!per.has(did)) per.set(did, []); per.get(did).push([pid, w]); }
  const docs = [...per].map(([did, ps]) => [did, ps, ps.reduce((a, x) => a + x[1], 0)]).sort((a, b) => b[2] - a[2]);
  const words = t.f.concat([t.t]);
  const re = wordReForms(words);
  const sec = h("section", { class: "tp-sec" }, h("h2", null, "בביאורים", h("small", null, docs.length)));
  const list = h("div", { class: "tp-docs" }); sec.append(list); main.append(sec);
  const PER = 8; let shown = 0;
  const more = h("button", { class: "btn", onclick: () => drawDocs() });
  const drawDocs = async () => {
    const slice = docs.slice(shown, shown + PER); shown += slice.length;
    for (const [did, ps] of slice) {
      const d = getDoc(did);
      const box = h("article", { class: "tp-doc" }, h("h3", null, h("a", { href: mkHash(["biur", did]) }, docShort(d))), h("p", { class: "tp-where" }, (d.p ? "פרשת " + d.p + " · " : "") + docWhere(d) + ` · ${ps.length} פרקים`));
      const ul = h("ul", { class: "tp-parts" });
      for (const [pid, w] of ps.slice(0, 4)) {
        const part = d.parts.find(p => p.id === pid);
        let seg = "", r = null;
        try { const text = await sectionText(did, pid); [seg, r] = snippet(text, [], 200); if (re) { re.lastIndex = 0; const m = re.exec(text); if (m) { const st = Math.max(0, m.index - 70); seg = (st > 0 ? "…" : "") + text.slice(st, st + 200).replace(/\s+/g, " ") + "…"; } } } catch (e) {}
        ul.append(h("li", null, h("a", { href: mkHash(["biur", did, pid], { hl: t.t }) }, part ? trunc(part.title, 90) : pid), seg ? h("p", { class: "tp-snip" }, ...hlNodes(seg, re)) : null));
      }
      if (ps.length > 4) ul.append(h("li", { class: "muted" }, `ועוד ${ps.length - 4} פרקים בביאור הזה`));
      box.append(ul); list.append(box);
      if (!ctx.alive()) return;
    }
    more.hidden = shown >= docs.length; more.textContent = `עוד ביאורים (${docs.length - shown})`;
  };
  sec.append(more); await drawDocs();
  // קטעי המקור
  if (t.x.length) {
    const xs = t.x.filter(x => getDoc(x[0]));
    const xsec = h("section", { class: "tp-sec" }, h("h2", null, "בקטעי המקור", h("small", null, xs.length)),
      h("p", { class: "muted" }, "הקטעים מלשון רבותינו שנאספו לביאורים, ושהערך מופיע בהם. לחיצה פותחת את הקטע בתוך הביאור."));
    const ul = h("ul", { class: "tp-ex" }); xsec.append(ul); main.append(xsec);
    let xshown = 0;
    const xmore = h("button", { class: "btn", onclick: () => drawEx() });
    const drawEx = async () => {
      const slice = xs.slice(xshown, xshown + 12); xshown += slice.length;
      for (const [did, exid] of slice) {
        let e = null; try { e = (await loadDoc(did)).ex[exid]; } catch (er) {}
        if (!e) continue;
        const text = (e[5] || "").replace(/\s+/g, " ");
        let seg = text.slice(0, 220);
        if (re) { re.lastIndex = 0; const m = re.exec(text); if (m) { const st = Math.max(0, m.index - 80); seg = (st > 0 ? "…" : "") + text.slice(st, st + 220) + "…"; } }
        const nd = e[3] ? getNode(e[3]) : null;
        ul.append(h("li", null, h("a", { href: mkHash(["biur", did], { ex: exid }) }, h("bdi", { dir: "ltr" }, exid), " · ", e[4] || (nd ? nodeTitle(nd, 70) : docShort(getDoc(did)))),
          h("p", { class: "tp-snip" }, ...hlNodes(seg, re)), h("small", { class: "muted" }, [e[8], e[0]].filter(Boolean).join(" · "))));
      }
      xmore.hidden = xshown >= xs.length; xmore.textContent = `עוד קטעים (${xs.length - xshown})`;
    };
    xsec.append(xmore); await drawEx();
  }
  main.append(h("p", { class: "card-note" }, "המפתח נבנה במכונה מתוך מילון מושגים קבוע (ערך וצורות הכתיב שלו); ״ראו גם״ — ערכים שבאים יחד באותם פרקים יותר מן הצפוי. ייתכנו הופעות שאינן במובן המושגי. ", h("a", { href: mkHash(["search"], { q: t.t }) }, "חיפוש חופשי של ״" + t.t + "״")));
  if (!ctx.keep) window.scrollTo(0, 0);
}

/* ביטוי להדגשת כל צורות הערך (בלי ניקוד וגרשיים, עם אותיות שימוש) */
function wordReForms(forms) {
  const parts = forms.filter(Boolean).sort((a, b) => b.length - a.length).map(f => [...f.replace(/[׳״'"]/g, "")].map(c => c === " " ? "\\s+" : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[֑-ׇ\"׳״'־]*"));
  if (!parts.length) return null;
  return new RegExp("(?<![א-ת])[ובהלמשכ]{0,3}(?:" + parts.join("|") + ")(?![א-ת])", "g");
}


/* חברותא · חיפוש בצד הלקוח: אינדקס הפוך על פריטים, פרקי ביאור וקטעי מקור; תחיליות עבריות; ניקוד וגרשיים לא מפריעים */

const PFX = "ושהבכלמ";
const SE = { idx: null, ready: null, docs: null, tlist: null, secText: new Map() };

function loadSearchIndex() {
  if (SE.ready) return SE.ready;
  SE.ready = loadSearch().then(raw => {
    SE.docs = raw.docs; SE.terms = raw.terms; SE.tlist = Object.keys(raw.terms);
    SE.cache = new Map();
    return SE;
  });
  return SE.ready;
}
/** posting-ים של מונח: [[מסמך, משקל]]. במקור: ״delta״ או ״delta.w״ (base36); w = דרגת השכיחות (1–3) + 4 אם המילה בכותרת (build_app.py: build_search) */
function postings(term) {
  let p = SE.cache.get(term); if (p) return p;
  p = []; let acc = 0;
  for (const s of SE.terms[term].split(",")) { const i = s.indexOf("."); acc += parseInt(i < 0 ? s : s.slice(0, i), 36); p.push([acc, i < 0 ? 1 : +s.slice(i + 1)]); }
  SE.cache.set(term, p); return p;
}
/** הגברת הדירוג: מילה בכותרת (הפרק / הביאור / הפריט) — מעל כל פגיעה בגוף בלבד; ובגוף — יותר הופעות, יותר גבוה */
const wBoost = w => (w > 4 ? 2.2 : 1) * (1 + .18 * (((w - 1) % 4)));
/** כל המונחים באינדקס שמתאימים למילת חיפוש: זהות, תחילית, או הוספת אותיות שימוש בתחילה */
function expandWord(w) {
  const out = new Map();     // term -> weight
  const variants = [[w, 1]];
  for (let i = 1; i <= 2; i++) if (w.length - i >= 2 && PFX.includes(w[i - 1]) && [...w.slice(0, i)].every(c => PFX.includes(c))) variants.push([w.slice(i), .8]);
  for (const t of SE.tlist) {
    for (const [v, wt] of variants) {
      if (t === v) { out.set(t, Math.max(out.get(t) || 0, wt * 3)); continue; }
      if (v.length >= 2 && t.startsWith(v) && t.length <= v.length + 4) out.set(t, Math.max(out.get(t) || 0, wt * 1.6));
      else if (v.length >= 3 && t.length > v.length && t.length <= v.length + 2 && t.endsWith(v) && [...t.slice(0, t.length - v.length)].every(c => PFX.includes(c))) out.set(t, Math.max(out.get(t) || 0, wt * 2.2));
      else if (v.length >= 4 && t.startsWith(v)) out.set(t, Math.max(out.get(t) || 0, wt * 1.1));
    }
  }
  return out;
}
const TYPE_W = { i: 3, s: 1, x: .8 };
async function runSearch(qs, limit = 400) {
  await loadSearchIndex();
  const words = norm(qs).split(" ").filter(w => w.length >= 1);
  if (!words.length) return { words, hits: [] };
  let acc = null;
  for (const w of words) {
    const m = new Map();
    for (const [t, wt] of expandWord(w)) for (const [d, pw] of postings(t)) m.set(d, Math.max(m.get(d) || 0, wt * wBoost(pw)));
    if (!acc) acc = m; else { for (const k of acc.keys()) if (!m.has(k)) acc.delete(k); else acc.set(k, acc.get(k) + m.get(k)); }
    if (!acc.size) break;
  }
  const hits = [];
  for (const [d, sc] of acc || []) { const doc = SE.docs[d]; hits.push({ type: doc[0], a: doc[1], b: doc[2], score: sc * TYPE_W[doc[0]] }); }
  hits.sort((x, y) => y.score - x.score);
  return { words, hits: hits.slice(0, limit), total: hits.length };
}

/* ---------- טקסטים וסניפטים ---------- */
function wordRe(words) {
  const parts = words.filter(w => w.length > 0).map(w => [...w].map(c => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[֑-ׇ\"׳״'־]*"));
  if (!parts.length) return null;
  return new RegExp("(?<![א-ת])[" + PFX + "]{0,2}(?:" + parts.join("|") + ")[א-ת]{0,3}", "g");
}
function snippet(text, words, len = 190) {
  const re = wordRe(words); text = text.replace(/\s+/g, " ").trim();
  if (!re) return [text.slice(0, len)];
  const m = re.exec(text); const pos = m ? m.index : 0;
  const start = Math.max(0, pos - Math.floor(len * .35));
  let seg = text.slice(start, start + len);
  if (start > 0) seg = "…" + seg.replace(/^\S*\s/, ""); if (start + len < text.length) seg = seg.replace(/\s\S*$/, "") + "…";
  return [seg, re];
}
function hlNodes(seg, re) {
  if (!re) return [seg];
  re.lastIndex = 0; const out = []; let last = 0, m;
  while ((m = re.exec(seg))) { if (m.index > last) out.push(seg.slice(last, m.index)); out.push(h("mark", null, m[0])); last = m.index + m[0].length; if (m[0].length === 0) re.lastIndex++; }
  if (last < seg.length) out.push(seg.slice(last));
  return out;
}
async function sectionText(docId, secId) {
  let m = SE.secText.get(docId);
  if (!m) {
    const d = await loadDoc(docId); m = new Map();
    const t = document.createElement("template"); t.innerHTML = d.html;
    for (const s of t.content.querySelectorAll("section.part")) m.set(s.id, s.textContent);
    SE.secText.set(docId, m);
  }
  return m.get(secId) || "";
}

/** ״פרשת נח · בראשית ו, ט״ — היכן הביאור (עם שם הפרשה, כשהאתר מכיל יותר מפרשה אחת) */
const docWhereP = d => "פרשת " + (d.p || S.home) + " · " + docWhere(d);

/* ---------- תוצאות מהירות: משותף לפלטה ולשדה שבחקר ---------- */
async function suggestInto(box, qv, opts = {}) {
  const r = await runSearch(qv, 80);
  const items = [];
  box.textContent = "";
  const re = wordRe(r.words);
  const grp = (title, nodes) => { if (!nodes.length) return; box.append(h("h4", { class: "pal-g" }, title)); nodes.forEach(x => { box.append(x); items.push(x); }); };
  const its = r.hits.filter(x => x.type === "i").slice(0, 5).map(x => { const n = getNode(x.a); return h("a", { class: "pal-i", role: "option", href: mkHash(["item", n.id]) }, h("span", { class: "ig", style: { "--gc": gcol(n.g) } }, glyphSvg(n, 18)), h("span", { class: "pt" }, h("b", null, ...hlNodes(nodeTitle(n, 70), re)), h("small", null, n.rb + (nodeYearLabel(n) ? " · " + nodeYearLabel(n) : "") + " · " + n.gn))); });
  const ss = r.hits.filter(x => x.type === "s").slice(0, 6).map(x => { const d = getDoc(x.a); const sec = d.parts.find(p => p.id === x.b); return h("a", { class: "pal-i", role: "option", href: mkHash(["biur", x.a, x.b], { hl: qv }) }, icon("i-book"), h("span", { class: "pt" }, h("b", null, trunc(docShort(d), 60)), h("small", null, ["פרשת " + (d.p || S.home), sec ? trunc(sec.title, 80) : ""].filter(Boolean).join(" · ")))); });
  const xs = r.hits.filter(x => x.type === "x").slice(0, 3).map(x => { const d = getDoc(x.a); return h("a", { class: "pal-i", role: "option", href: mkHash(["biur", x.a], { ex: x.b }) }, icon("i-quote"), h("span", { class: "pt" }, h("b", { dir: "ltr" }, x.b), h("small", null, trunc(d.title, 60)))); });
  grp("פריטי מקור", its); grp("בביאורים", ss); grp("קטעי מקור", xs);
  if (!items.length) box.append(h("p", { class: "pal-empty" }, "לא נמצאו תוצאות. נסו מילה קצרה יותר, בלי תחילית."));
  const all = h("a", { class: "pal-i pal-all", role: "option", href: mkHash(["search"], { q: qv }) }, icon("i-search"), h("span", { class: "pt" }, h("b", null, `כל ${r.total} התוצאות ל־״${qv}״`), h("small", null, "עם סינון וייצוא ל־PDF")));
  box.append(all); items.push(all);
  return { items, total: r.total };
}
function wireList(input, box, onGo) {
  let sel = -1, items = [], tick = 0;
  const mark = () => items.forEach((a, i) => { a.setAttribute("aria-selected", i === sel); if (i === sel) a.scrollIntoView({ block: "nearest" }); });
  const run = debounce(async () => {
    const mine = ++tick, qv = input.value.trim();
    if (qv.length < 1) { box.textContent = ""; items = []; sel = -1; box.dispatchEvent(new Event("empty")); return; }
    let r; try { r = await suggestInto(box, qv); } catch (e) { return; }
    if (mine !== tick) return; items = r.items; sel = items.length > 1 ? 0 : -1; mark();
  }, 110);
  input.addEventListener("input", run);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!items.length) return; e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; mark(); }
    else if (e.key === "Enter") { e.preventDefault(); const a = items[sel >= 0 ? sel : items.length - 1]; if (a) { onGo?.(); const u = a.getAttribute("href"); if (u.startsWith("#")) location.hash = u; else location.href = u; } else if (input.value.trim()) { onGo?.(); go(mkHash(["search"], { q: input.value.trim() })); } }
  });
  box.addEventListener("click", e => { const a = e.target.closest("a"); if (a) { e.preventDefault(); onGo?.(); const u = a.getAttribute("href"); if (u.startsWith("#")) location.hash = u; else location.href = u; } });
  return { run };
}
let palEl = null;
function closePalette() { if (!palEl) return; palEl.remove(); palEl = null; document.body.classList.remove("pal-open"); }
function openPalette(seed) {
  if (palEl) { palEl.querySelector("input")?.focus(); return; }
  loadSearchIndex();
  const input = h("input", { type: "search", id: "pal-q", placeholder: "חיפוש בפריטים, בביאורים ובקטעי מקור", "aria-label": "חיפוש", autocomplete: "off", enterkeyhint: "search", role: "combobox", "aria-expanded": "true", "aria-controls": "pal-res" });
  const res = h("div", { class: "pal-res", id: "pal-res", role: "listbox" });
  const cmds = () => {
    res.textContent = "";
    const a = (ic, t, s, fn) => res.append(h("button", { class: "pal-i", role: "option", onclick: () => { closePalette(); fn(); } }, icon(ic), h("span", { class: "pt" }, h("b", null, t), s ? h("small", null, s) : null)));
    res.append(h("h4", { class: "pal-g" }, "מעבר מהיר"));
    a("i-book", "רשימת הביאורים", "פרשת " + S.par + ": השער ותוכן העניינים", () => go(mkHash(parRoot())));
    a("i-list", "המקורות", `${S.pnodes.length} פריטים בפרשת ${S.par}, עם סינון`, () => go(mkHash(["sources"], { p: S.par })));
    for (const m of MODES) a(m.icon, "מצב " + m.label, m.hint + " · מקש " + m.n, () => setMode(m.id));
    a("i-flag", "מה חדש בעולם החסידות", "פרסומים חדשים באתרים החיצוניים", () => go(mkHash(["new"])));
    a("i-flag", "סטטוס הביאורים", "מצב הבקרה ומה פתוח", () => go(mkHash(["status"])));
  };
  cmds();
  res.addEventListener("empty", cmds);
  palEl = h("div", { class: "pal", role: "dialog", "aria-modal": "true", "aria-label": "חיפוש", onmousedown: e => { if (e.target === palEl) closePalette(); } },
    h("div", { class: "pal-box" }, h("div", { class: "pal-in" }, icon("i-search"), input, h("kbd", null, "Esc")), res,
      h("footer", { class: "pal-f" }, h("span", null, h("kbd", null, "↑↓"), " ניווט"), h("span", null, h("kbd", null, "Enter"), " פתיחה"), h("span", { class: "sp" }, "מוצא גם עם תחיליות, ניקוד וגרשיים"))));
  document.body.append(palEl); document.body.classList.add("pal-open");
  wireList(input, res, closePalette);
  input.focus();
  if (seed) { input.value = seed; input.dispatchEvent(new Event("input")); }
}
/** שדה חיפוש גלוי בבית של מצב החקר */
function searchField() {
  const input = h("input", { type: "search", placeholder: "חיפוש בכל החומר: פריט, ביאור או קטע מקור", "aria-label": "חיפוש בכל החומר", autocomplete: "off", role: "combobox" });
  const res = h("div", { class: "pal-res inline", role: "listbox" });
  const form = h("form", { class: "sfield", role: "search", onsubmit: e => e.preventDefault() }, icon("i-search"), input, h("kbd", { "aria-hidden": "true", title: "קיצור חיפוש מהיר" }, "/"), res);
  input.addEventListener("focus", () => loadSearchIndex());
  wireList(input, res, () => { res.textContent = ""; });
  return form;
}

/* ---------- עמוד תוצאות מלא ---------- */
VIEWS.search = async function (rest, q, ctx) {
  Aside.detach();
  const qs = q.get("q") || "";
  const main = $("#view"); main.className = "main page"; main.textContent = "";
  document.title = (qs ? qs + " · " : "") + "חיפוש · חברותא";
  const inp = h("input", { type: "search", value: qs, placeholder: "מה מחפשים?", "aria-label": "חיפוש", autocomplete: "off" });
  main.append(h("h1", { class: "page-title" }, "חיפוש"), h("form", { class: "sfield big", role: "search", onsubmit: e => { e.preventDefault(); const v = inp.value.trim(); if (v) go(mkHash(["search"], { q: v })); } }, icon("i-search"), inp));
  if (!qs.trim()) { main.append(h("div", { class: "empty" }, h("b", null, "מה מחפשים?"), "כתבו מילה או ביטוי. החיפוש מוצא פריטי מקור, פסקאות בביאורים, קטעי מקור וכותרות בעץ הידע, גם עם ניקוד, גרשיים ואותיות שימוש בתחילת המילה. אפשר גם ללחוץ ״/״ בכל מקום באתר.")); inp.focus(); return; }
  const status = h("div", { class: "count", "aria-live": "polite" }, h("span", null, "מחפש…"));
  const resBox = h("div", { class: "res" });
  main.append(status, resBox);
  let R0;
  try { R0 = await runSearch(qs); } catch (e) { status.textContent = "שגיאה בטעינת אינדקס החיפוש"; return; }
  if (!ctx.alive()) return;
  const types = new Set((q.get("t") || "i,s,x,u").split(","));
  const gSel = q.get("g") === null || q.get("g") === "" ? null : +q.get("g");
  const dSel = q.get("d") || "";
  const tOf = x => x.type;
  const hits = R0.hits.filter(x => { if (!types.has(tOf(x))) return false; if (x.type === "i") return gSel === null || getNode(x.a)?.g === gSel; if (dSel && x.a !== dSel) return false; return true; });
  const cnt = t => R0.hits.filter(x => tOf(x) === t).length;
  const upd = (k, v) => { const o = { q: qs }; const cur = { t: [...types].join(","), g: gSel ?? "", d: dSel }; Object.assign(cur, { [k]: v }); if (cur.t && cur.t !== "i,s,x,u") o.t = cur.t; if (cur.g !== "") o.g = cur.g; if (cur.d) o.d = cur.d; go(mkHash(["search"], o), true); };
  const bar = h("div", { class: "ws-filters", role: "group", "aria-label": "סינון תוצאות" });
  const tb = h("div", { class: "fbar" });
  const uCnt = h("small", null, "…");
  for (const [t, l] of [["i", "פריטי מקור"], ["s", "פרקים בביאורים"], ["x", "קטעי מקור"], ["u", "בעץ הידע"]])
    tb.append(h("button", { class: "fchip", "aria-pressed": types.has(t), onclick: () => { const n = new Set(types); n.has(t) ? n.delete(t) : n.add(t); if (!n.size) n.add(t); upd("t", [...n].join(",")); } }, l, t === "u" ? uCnt : h("small", null, cnt(t))));
  bar.append(tb, h("label", null, h("span", null, "הרבי (לפריטים)"), h("select", { onchange: e => upd("g", e.target.value) }, h("option", { value: "" }, "כולם"), ...GEN_IDS.map(g => h("option", { value: g, selected: gSel === g }, S.core.gens[g])))),
    h("label", null, h("span", null, "ביאור"), h("select", { onchange: e => upd("d", e.target.value) }, h("option", { value: "" }, "כל הביאורים"), ...(S.core.parshiyot || []).map(x => x.n).filter(hasDocs).map(p => h("optgroup", { label: "פרשת " + p }, ...docsOf(p).books.flatMap(b => [b, S.docs.get(b.id + "d")]).filter(Boolean).map(d => h("option", { value: d.id, selected: dSel === d.id }, trunc(docShort(d), 42))))))),
    h("button", { class: "btn", id: "export-results", onclick: () => exportResultsList(qs, shownList) }, icon("i-pdf"), "ייצוא התוצאות ל־PDF"));
  status.replaceChildren(h("span", null, h("b", null, R0.total), ` תוצאות ל־״${qs}״`, R0.total > R0.hits.length ? ` (מוצגות ${R0.hits.length} הראשונות)` : ""));
  main.insertBefore(bar, status);
  const re = wordRe(R0.words);
  const shownList = [];
  const PER = 14;
  for (const [t, label] of [["i", "פריטי מקור"], ["s", "פרקים בביאורים"], ["x", "קטעי מקור"]]) {
    if (!types.has(t)) continue;
    const hs = hits.filter(x => tOf(x) === t); if (!hs.length) continue;
    const box = h("section", { class: "res-grp" }, h("h2", null, label, h("small", null, hs.length)));
    const list = h("div"); box.append(list);
    let shown = 0;
    const more = h("button", { class: "btn", onclick: () => draw() }, "הצג עוד");
    const draw = async () => {
      const slice = hs.slice(shown, shown + PER); shown += slice.length;
      for (const x of slice) { const el = await resultEl(x, re, qs, R0.words); if (!ctx.alive()) return; if (el.node) shownList.push(el.node); list.append(el.el); }
      more.hidden = shown >= hs.length; more.textContent = `הצג עוד (${hs.length - shown})`;
    };
    box.append(more); resBox.append(box);
    await draw();
  }
  const noRes = h("div", { class: "empty" }, h("b", null, "לא נמצאו תוצאות"), "נסו מילה קצרה יותר, בלי תחילית, או בדקו את הסינון שלמעלה.");
  if (!resBox.children.length) resBox.append(noRes);
  window.scrollTo(0, 0);
  // עץ הידע: כותרות כל היחידות (data/tree-t.js) — נטען אחרי שהתוצאות האחרות כבר מוצגות
  try {
    const T = await loadChunk("tree"); if (!ctx.alive()) return;
    const uh = await treeSearch(T, qs, 300); if (!ctx.alive()) return;
    uCnt.textContent = uh.length >= 300 ? "300+" : uh.length;
    if (uh.length) status.append(` · ועוד ${uh.length >= 300 ? "300+" : uh.length} בעץ הידע`);
    if (!types.has("u") || !uh.length) return;
    noRes.remove();
    const TOP = 40;
    resBox.append(h("section", { class: "res-grp", id: "res-tree" },
      h("h2", null, "יחידות בעץ הידע", h("small", null, uh.length >= 300 ? "300+" : uh.length)),
      h("p", { class: "muted" }, "מאמרים, שיחות, אגרות ורשימות שהמילים מופיעות בכותרת שלהם בעץ הידע — עם הספר, השנה, העמוד וקישור למקום ברשת."),
      treeTable(T, uh.slice(0, TOP), true),
      h("p", null, h("a", { href: mkHash(["tree"], { q: qs }) }, uh.length > TOP ? `לכל ${uh.length >= 300 ? "300 התוצאות הראשונות" : uh.length + " התוצאות"} בעץ הידע ←` : "לחיפוש בעץ הידע ←"))));
    chvStackTables?.(resBox);
  } catch (e) { uCnt.textContent = "—"; }
};

async function resultEl(x, re, qs, words) {
  if (x.type === "i") {
    const n = getNode(x.a); if (!n) return { el: h("span") };
    const hay = [cleanT(n.ti) !== cleanT(n.t) ? cleanT(n.ti) : "", n.col].filter(Boolean).join(" · ");
    const [seg, r] = snippet(hay, words, 160);
    const el = h("a", { class: "res-it", href: mkHash(["item", n.id]), "data-n": n.id }, h("div", { class: "t" }, ...hlNodes(nodeTitle(n, 140), re)), h("div", { class: "m" }, rebbeChip(n), n.gn ? h("span", null, n.gn) : null, nodeYearLabel(n) ? h("span", null, nodeYearLabel(n)) : null, catChip(n)), seg ? h("div", { class: "s" }, ...hlNodes(seg, r || re)) : null);
    return { el, node: n };
  }
  if (x.type === "s") {
    const d = getDoc(x.a); const sec = d.parts.find(p => p.id === x.b);
    const text = await sectionText(x.a, x.b);
    const [seg, r] = snippet(text, words);
    const el = h("a", { class: "res-it", href: mkHash(["biur", x.a, x.b], { hl: qs }) }, h("div", { class: "t" }, docShort(d)), h("div", { class: "m" }, h("span", { class: "tag" }, docWhereP(d)), sec ? trunc(sec.title, 90) : x.b), h("div", { class: "s" }, ...hlNodes(seg, r || re)));
    return { el, node: { doc: d, part: sec, text: seg } };
  }
  const d = getDoc(x.a); const doc = await loadDoc(x.a); const e = doc.ex[x.b]; if (!e) return { el: h("span") };
  const [seg, r] = snippet(e[5], words);
  const nd = e[3] ? getNode(e[3]) : null;
  const el = h("a", { class: "res-it", href: mkHash(["biur", x.a], { ex: x.b }) }, h("div", { class: "t" }, h("bdi", { dir: "ltr" }, x.b), " · ", e[4] || (nd ? nodeTitle(nd, 80) : "")), h("div", { class: "m" }, nd ? rebbeChip(nd) : null, e[0], d.title), h("div", { class: "s" }, ...hlNodes(seg, r || re)));
  return { el, node: { ex: x.b, doc: d, text: seg, page: e[0], node: nd } };
}

/* הדגשת מילות החיפוש בתוך פרק בביאור (?hl=…) */
function highlightWordsIn(root, qs) {
  if (!qs) return 0;
  const re = wordRe(norm(qs).split(" ")); if (!re) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest("script,style,mark.sh") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  const targets = []; let n;
  while ((n = walker.nextNode())) { re.lastIndex = 0; if (re.test(n.nodeValue)) targets.push(n); if (targets.length > 60) break; }
  let c = 0;
  for (const tn of targets) {
    const frag = document.createDocumentFragment(); let last = 0; const s = tn.nodeValue; re.lastIndex = 0; let m;
    while ((m = re.exec(s))) { if (m.index > last) frag.append(s.slice(last, m.index)); const mk = h("mark", { class: "sh" }, m[0]); frag.append(mk); last = m.index + m[0].length; c++; if (!m[0].length) re.lastIndex++; }
    if (last < s.length) frag.append(s.slice(last));
    tn.replaceWith(frag);
  }
  return c;
}


/* חברותא · ייצוא PDF בצד הלקוח (הדפסה לדפדפן): פרק, ביאור, הספר כולו, כרטיס פריט, רשימת מקורות או תוצאות חיפוש.
   מסמן את <body> ב־data-print; print.css מציג רק את מה שנבחר. בלי שרת ובלי רשת. */
(function () {
  const B = document.body, PH = () => document.getElementById("pagehead");
  let saved = null, area = null, cancelled = false;
  const escq = s => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
  const short = x => x.length > 64 ? x.slice(0, 62).replace(/\s+\S*$/, "") + "…" : x;
  function today() {
    const d = new Date(); let hb = "", g = "";
    try { const m = {}; new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { day: "numeric", month: "long", year: "numeric" }).formatToParts(d).forEach(x => m[x.type] = x.value); hb = gem(parseInt(m.day, 10)) + " " + m.month + " " + gem(parseInt(m.year, 10) % 1000); } catch (e) {}
    try { g = d.toLocaleDateString("he-IL"); } catch (e) { g = d.toISOString().slice(0, 10); }
    return hb ? hb + " · " + g : g;
  }
  function begin(mode, headerText, title) {
    restore();
    saved = { title: document.title, page: PH()?.textContent || "" };
    B.setAttribute("data-print", mode);
    if (PH()) PH().textContent = `@page { @top-right { content: "${escq(short(headerText))}"; font: 9pt "Assistant", "Liberation Sans", Arial, sans-serif; color: #555; } }`;
    document.title = title || headerText;
  }
  function restore() {
    document.querySelector(".book-progress")?.remove();
    if (!saved) return;
    B.removeAttribute("data-print");
    document.querySelectorAll(".print-target").forEach(s => s.classList.remove("print-target"));
    area?.remove(); area = null;
    document.title = saved.title; if (PH()) PH().textContent = saved.page; saved = null;
    document.querySelectorAll(".phead").forEach(e => e.remove());
  }
  function pheadFor(unit, part, meta, parsha = S.par || S.home) {
    return h("div", { class: "phead", "aria-hidden": "true" }, h("div", { class: "ph-top" }, h("span", null, parsha ? "חברותא · פרשת " + parsha : "חברותא"), h("span", null, "הופק מהאתר " + today())), h("p", { class: "ph-unit" }, unit), part ? h("p", { class: "ph-part" }, part) : null, meta ? h("div", { class: "ph-meta" }, meta) : null);
  }
  function doPrint() { setTimeout(() => window.print(), 80); }
  function toBody(el) { area = h("div", { id: "print-area" }, el); document.body.append(area); }

  function printDoc(d, part) {
    const art = document.querySelector("article.biur"); if (!art) return;
    const sec = part && part !== "all" ? art.querySelector(`section.part[data-part="${CSS.escape(part)}"]`) : null;
    const title = sec ? (sec.querySelector("h2")?.textContent || "") : "";
    begin(sec ? "part:" + part : "all", d.title + (sec ? " — " + title : ""), d.title + (sec ? " — " + title.slice(0, 60) : ""));
    if (sec) sec.classList.add("print-target");
    const meta = [d.state ? "מצב: " + d.state : "", docWhere(d)].filter(Boolean).join(" · ");
    document.querySelector(".col")?.prepend(pheadFor(d.title, sec ? title : "כל הביאור", meta, d.p || S.home));
    doPrint();
  }
  function printCard(nid) {
    const n = getNode(nid); if (!n) return;
    begin("card", nodeTitle(n, 60), nodeTitle(n, 60));
    toBody(h("div", null, pheadFor(nodeTitle(n, 120), "כרטיס פריט", n.rb, n.p || S.home), itemCard(nid, { mode: "print" })));
    loadLinks().then(() => setTimeout(() => window.print(), 250));
  }
  function printItems(nodes, title) {
    begin("results", "מקורות", "מקורות — " + title);
    const list = h("div");
    for (const n of nodes) list.append(h("div", { class: "res-it" }, h("div", { class: "t" }, nodeTitle(n, 150)), h("div", { class: "m" }, n.rb, n.gn, "אמירה: " + (n.ys || "—"), "כתיבה: " + (n.yw || "—"), "פרסום: " + (n.yp || "—"), CAT[n.cat].short), h("div", { class: "s" }, [n.col || n.bk, n.u].filter(Boolean).join(" · "))));
    toBody(h("div", null, pheadFor("מקורות", title, nodes.length + " פריטים"), list)); doPrint();
  }
  function printResults(qs, list) {
    begin("results", "חיפוש: " + qs, "חיפוש — " + qs);
    const box = h("div");
    for (const r of list) {
      if (r.rb !== undefined) box.append(h("div", { class: "res-it" }, h("div", { class: "t" }, nodeTitle(r, 150)), h("div", { class: "m" }, r.rb, nodeYearLabel(r), CAT[r.cat].short)));
      else if (r.ex) box.append(h("div", { class: "res-it" }, h("div", { class: "t" }, "קטע מקור " + r.ex + " · " + r.doc.title), h("div", { class: "m" }, r.page || ""), h("div", { class: "s" }, r.text)));
      else box.append(h("div", { class: "res-it" }, h("div", { class: "t" }, r.doc.title), h("div", { class: "m" }, r.part ? trunc(r.part.title, 100) : ""), h("div", { class: "s" }, r.text)));
    }
    toBody(h("div", null, pheadFor("חיפוש: ״" + qs + "״", "", list.length + " תוצאות מוצגות", null), box)); doPrint();
  }
  function printMain(title) { begin("", title, title); B.removeAttribute("data-print"); doPrint(); }

  /* ----- הספר כולו: נבנה בחלקים (מסמך אחרי מסמך) כדי לא לתקוע את הדפדפן ----- */
  function bookOrder(withDorot) {
    const out = [];
    for (const g of bookGroups(S.home)) for (const d of g.docs) { out.push({ d, g }); if (withDorot && d.kind === "chain") { const dd = S.docs.get(d.id + "d"); if (dd) out.push({ d: dd, g, sub: true }); } }
    return out;
  }
  async function prepareBook(opts = {}) {
    cancelled = false;
    const withDorot = opts.dorot !== false;
    const order = bookOrder(withDorot);
    begin("book", "חברותא · פרשת בראשית", "חברותא · פרשת בראשית: הספר");
    const prog = h("div", { class: "book-progress no-print", role: "status" }, h("b", null, "מכין את הספר להדפסה"), h("span", { class: "bp-t" }, "0 / " + order.length), h("div", { class: "bp-bar" }, h("i")), h("button", { class: "btn", onclick: () => { cancelled = true; } }, "ביטול"));
    document.body.append(prog);
    const root = h("div", { id: "book" });
    root.append(h("section", { class: "book-cover" }, h("div", { class: "bc-in" }, h("p", { class: "bc-k" }, "חברותא"), h("h1", null, "פרשת בראשית"), h("p", { class: "bc-s" }, "ביאורים על דברי שבעת הרביים בשבת בראשית"), h("p", { class: "bc-m" }, `${docsOf(S.home).books.length} ביאורים · ${fmt(docsOf(S.home).nodes.length)} פריטי מקור`), h("p", { class: "bc-d" }, "הופק מהאתר " + today()))));
    const toc = h("section", { class: "book-toc" }, h("h2", null, "תוכן העניינים"));
    let lastG = null, ul = null, num = 0;
    for (const { d, g, sub } of order) {
      if (g.id !== lastG) { lastG = g.id; toc.append(h("h3", null, g.title, h("small", null, g.sub))); ul = h("ol"); toc.append(ul); }
      if (!sub) num++;
      ul.append(h("li", { class: sub ? "sub" : "" }, h("span", { class: "tn" }, sub ? "" : num), h("span", { class: "tt" }, sub ? "שרשרת הדורות" : d.title), h("span", { class: "tw" }, sub ? "" : (d.kind === "chain" ? d.anchor.replace("בראשית ", "") : d.range ? verseLabel(d.range) : "כללי"))));
    }
    root.append(toc);
    area = h("div", { id: "print-area" }, root); document.body.append(area);
    let i = 0, n0 = 0, chars = 0;
    for (const { d, sub } of order) {
      if (cancelled) { restore(); return { cancelled: true }; }
      const doc = await loadDoc(d.id);
      if (!sub) n0++;
      const sec = h("section", { class: "book-doc" + (sub ? " sub" : ""), "data-doc": d.id },
        h("header", { class: "book-h" }, h("p", { class: "bh-w" }, (sub ? "שרשרת הדורות · " : "") + (d.kind === "verse" ? docWhere(d) : d.kind === "chain" ? "שרשרת מאמרים · " + d.anchor : "שרשרת הדורות") + (d.state ? " · " + d.state : "")), h("h1", null, doc.hero.h1 || d.title),
          doc.hero.lead ? h("p", { class: "lead", html: doc.hero.lead }) : null, doc.hero.status ? h("p", { class: "statusline", html: doc.hero.status }) : null),
        h("article", { class: "biur", lang: "he", html: doc.html }));
      root.append(sec); chars += doc.html.length;
      i++; prog.querySelector(".bp-t").textContent = i + " / " + order.length; prog.querySelector("i").style.width = (i / order.length * 100) + "%";
      await new Promise(r => setTimeout(r, 0));
    }
    prog.remove();
    return { docs: order.length, chars, root };
  }
  async function printBook(opts) {
    const r = await prepareBook(opts);
    if (r.cancelled) { toast("הייצוא בוטל"); return; }
    setTimeout(() => window.print(), 300);
  }
  window.chavrutaExport = { printDoc, printCard, printItems, printResults, printMain, printBook, prepareBook, restore };
  window.addEventListener("afterprint", restore);
  try { const mq = matchMedia("print"); (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(e => { if (!e.matches) restore(); }); } catch (e) {}
})();
function printCard(nid) { window.chavrutaExport.printCard(nid); }
function exportResultsList(qs, list) { window.chavrutaExport.printResults(qs, list); }
function exportItems(nodes, title) { window.chavrutaExport.printItems(nodes, title); }


/* חברותא · אתחול האפליקציה */
(async function boot() {
  const view = document.getElementById("view");
  const fail = (msg, err) => { view.replaceChildren(h("div", { class: "empty" }, h("b", null, msg), err ? String(err.message || err) : "", h("br"), "ודאו שכל תיקיית האפליקציה (כולל data/) נמצאת במקום אחד.")); console.error(err); };
  MODE = initialMode();
  document.body.dataset.mode = MODE;
  buildChrome();
  let core;
  try { core = await loadChunk("core"); } catch (e) { fail("לא ניתן לטעון את נתוני הפרשה", e); return; }
  initCore(core);
  buildParshaSel();
  window.addEventListener("hashchange", () => route().catch(e => fail("שגיאה בתצוגה", e)));
  try { await loadLinks(); } catch (e) {}
  try { await route(); } catch (e) { fail("שגיאה בתצוגה", e); }
  setTimeout(() => { try { loadSearchIndex(); } catch (e) {} }, 1800);
  window.__chv = { S, route, selectNode, setMode, RD, D, MODES };
})();
function initialMode() { const m = parseHash().q.get("mode"); if (MODES.some(x => x.id === m)) return m; const s = lsGet(MODE_KEY); return MODES.some(x => x.id === s) ? s : "read"; }


/* חברותא · בורר ערכת הצבעים והתאורה — משותף לאפליקציה ולעמודי השרשראות.
   הערכה: :root[data-theme-name] (chavruta-theme-name); התאורה: :root[data-theme] = light/dark, בלי — לפי המערכת (chavruta-theme).
   הערכים נקבעים כבר ב־<head> (chrome.theme_boot) כדי שלא יהיה הבהוב; כאן — החלונית, השמירה, ו־meta theme-color. */
(function () {
  var R = document.documentElement, KN = "chavruta-theme-name", KS = "chavruta-theme";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  var btn = document.getElementById("theme-btn"), pnl = document.getElementById("thp");
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function scheme() { var t = R.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : "auto"; }
  function meta() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    var c = getComputedStyle(R).getPropertyValue("--paper").trim(); if (c) m.content = c;
  }
  function sync() {
    var n = R.getAttribute("data-theme-name") || "sefer", s = scheme();
    if (pnl) {
      [].forEach.call(pnl.querySelectorAll("[data-tn]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tn") === n ? "true" : "false"); });
      [].forEach.call(pnl.querySelectorAll("[data-ts]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-ts") === s ? "true" : "false"); });
    }
    meta();
  }
  function apply(n, s) {
    if (n) { R.setAttribute("data-theme-name", n); put(KN, n); }
    if (s) { if (s === "light" || s === "dark") { R.setAttribute("data-theme", s); put(KS, s); } else { R.removeAttribute("data-theme"); put(KS, null); } }
    sync();
    try { window.dispatchEvent(new Event("themechange")); } catch (e) {}
  }
  function open(o) {
    if (!pnl || !btn) return;
    pnl.hidden = !o; btn.setAttribute("aria-expanded", o ? "true" : "false");
    if (o) { var c = pnl.querySelector('[aria-pressed="true"]') || pnl.querySelector("button"); if (c) c.focus({ preventScroll: true }); }
  }
  if (btn && pnl) {
    btn.addEventListener("click", function (e) { e.stopPropagation(); open(pnl.hidden); });
    pnl.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-tn")) apply(b.getAttribute("data-tn"), null);
      else if (b.hasAttribute("data-ts")) apply(null, b.getAttribute("data-ts"));
    });
    document.addEventListener("click", function (e) { if (!pnl.hidden && !pnl.contains(e.target) && !btn.contains(e.target)) open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pnl.hidden) { e.stopPropagation(); open(false); btn.focus(); } }, true);
  }
  if (mq) { var f = function () { sync(); try { window.dispatchEvent(new Event("themechange")); } catch (e) {} }; if (mq.addEventListener) mq.addEventListener("change", f); else if (mq.addListener) mq.addListener(f); }
  window.chavrutaTheme = { apply: apply, open: open, sync: sync };
  sync();
})();

