/* Daily-study deep-link helpers: parse #/daily query params and build element ids.
   Loaded as a classic script (window.DailyAnchors) and as a CommonJS module in tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DailyAnchors = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TABS = ["tanya", "luach", "rambam"];
  const AMUD_FROM = { a: 1, b: 2, c: 3, d: 4, "1": 1, "2": 2, "3": 3, "4": 4, "א": 1, "ב": 2, "ג": 3, "ד": 4 };
  const AMUD_LATIN = "abcd";
  const HE_LETTERS = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 20, "ך": 20, "ל": 30, "מ": 40, "ם": 40, "נ": 50, "ן": 50, "ס": 60, "ע": 70, "פ": 80, "ף": 80, "צ": 90, "ץ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400 };
  const SEC_PREFIX = {
    la: "ליקוטי אמרים פרק ",
    shaar: "שער היחוד והאמונה פרק ",
    at: "אגרת התשובה פרק ",
    ak: "אגרת הקודש פרק ",
    ka: "קונטרס אחרון פרק "
  };
  const SEC_ALIASES = {
    la: "la", likutei: "la", amarim: "la", tanya: "la", "אמרים": "la", "ליקוטי": "la", "ליקוטיאמרים": "la",
    shaar: "shaar", shih: "shaar", syha: "shaar", sh: "shaar", "שיה": "shaar", "שער": "shaar", "שערהיחוד": "shaar", "שערהיחודוהאמונה": "shaar",
    at: "at", teshuva: "at", igt: "at", "את": "at", "אגרתהתשובה": "at",
    ak: "ak", igeret: "ak", "אק": "ak", "אגרתהקודש": "ak", "אגרתקודש": "ak",
    ka: "ka", kuntres: "ka", "קא": "ka", "קונטרס": "ka", "קונטרסאחרון": "ka"
  };

  function stripMarks(s) {
    return String(s || "").replace(/[׳״'"’“”`\s_\-]/g, "");
  }

  function parseHeNum(s) {
    const raw = String(s == null ? "" : s).trim();
    if (!raw) return null;
    const plain = stripMarks(raw);
    if (/^\d+$/.test(plain)) {
      const n = +plain;
      return n > 0 ? n : null;
    }
    if (!plain) return null;
    let n = 0;
    for (const ch of plain) {
      const v = HE_LETTERS[ch];
      if (!v) return null;
      n += v;
    }
    return n > 0 ? n : null;
  }

  function heNumPlain(n) {
    n = +n;
    if (!n || n < 1) return "";
    if (n === 15) return "טו";
    if (n === 16) return "טז";
    const vals = [[400, "ת"], [300, "ש"], [200, "ר"], [100, "ק"], [90, "צ"], [80, "פ"], [70, "ע"], [60, "ס"], [50, "נ"], [40, "מ"], [30, "ל"], [20, "כ"], [10, "י"], [9, "ט"], [8, "ח"], [7, "ז"], [6, "ו"], [5, "ה"], [4, "ד"], [3, "ג"], [2, "ב"], [1, "א"]];
    let s = "";
    for (const [v, c] of vals) while (n >= v) { s += c; n -= v; }
    return s;
  }

  function parseSec(s) {
    const plain = stripMarks(String(s || "")).toLowerCase();
    if (!plain) return "la";
    return SEC_ALIASES[plain] || null;
  }

  function parseChapterToken(raw) {
    const s = String(raw == null ? "" : raw).trim();
    if (!s) return null;
    const m = /^(la|shaar|shih|syha|at|ak|ka|tanya|amarim|teshuva|igeret|kuntres|שיה|את|אק|קא|אמרים)[-_:/]?(.+)$/i.exec(s);
    if (m) {
      const sec = parseSec(m[1]);
      const n = parseHeNum(m[2]);
      if (sec && n) return { raw: s, n, sec };
    }
    const n = parseHeNum(s);
    if (n) return { raw: s, n, sec: null, title: null };
    return { raw: s, n: null, sec: null, title: s };
  }

  function qp(q, key) {
    if (!q) return "";
    if (typeof q.get === "function") return q.get(key) || "";
    const v = q[key];
    return v == null ? "" : String(v);
  }

  function parsePage(s) {
    const raw = String(s == null ? "" : s).trim();
    if (!raw) return null;
    const m = /^([0-9]+|[א-תךםןףץ׳״'"]+)\s*[,.\-–]\s*([a-dA-Dא-ד1-4])$/.exec(raw) ||
      /^([0-9]+)\s*([a-dA-D])$/.exec(raw);
    if (!m) return null;
    const daf = parseHeNum(m[1]);
    const amudKey = stripMarks(m[2]).toLowerCase();
    const amud = AMUD_FROM[amudKey] || AMUD_FROM[m[2]];
    if (!daf || !amud) return null;
    return {
      daf,
      amud,
      idKey: daf + AMUD_LATIN[amud - 1],
      label: heNumPlain(daf) + "," + heNumPlain(amud)
    };
  }

  function parseDailyQuery(q, todayIso) {
    const dRaw = qp(q, "d");
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dRaw) ? dRaw : null;
    const tRaw = qp(q, "t").toLowerCase();
    const t = TABS.includes(tRaw) ? tRaw : "tanya";
    const ch = parseChapterToken(qp(q, "ch"));
    const p = parseHeNum(qp(q, "p"));
    const pg = parsePage(qp(q, "pg"));
    const m = parseHeNum(qp(q, "m"));
    const secIn = qp(q, "sec");
    let sec = parseSec(secIn);
    if (ch && ch.sec) sec = ch.sec;
    if (!sec) sec = "la";
    return {
      d,
      t,
      sec,
      ch,
      p,
      pg,
      m,
      today: todayIso || null,
      explicitDate: !!d,
      explicitTab: TABS.includes(tRaw)
    };
  }

  function resolveTanyaChapter(chaps, query) {
    if (!chaps || !query || !query.ch) return null;
    const ch = query.ch;
    const loose = stripMarks(ch.title || ch.raw || "");
    if (loose && !ch.n) {
      for (let i = 0; i < chaps.length; i++) {
        if (stripMarks(chaps[i]) === loose) {
          const inferred = inferSecAndN(chaps[i]);
          return { ci: i, title: chaps[i], sec: inferred.sec, n: inferred.n };
        }
      }
    }
    const sec = ch.sec || query.sec || "la";
    const n = ch.n;
    if (n && SEC_PREFIX[sec]) {
      const wanted = stripMarks(SEC_PREFIX[sec] + heNumPlain(n));
      for (let i = 0; i < chaps.length; i++) {
        if (stripMarks(chaps[i]) === wanted) return { ci: i, title: chaps[i], sec, n };
      }
    }
    if (loose) {
      for (let i = 0; i < chaps.length; i++) {
        if (stripMarks(chaps[i]) === loose) {
          const inferred = inferSecAndN(chaps[i]);
          return { ci: i, title: chaps[i], sec: inferred.sec || sec, n: inferred.n || n };
        }
      }
    }
    return null;
  }

  function inferSecAndN(title) {
    for (const [sec, prefix] of Object.entries(SEC_PREFIX)) {
      if (title.startsWith(prefix)) {
        return { sec, n: parseHeNum(title.slice(prefix.length)) };
      }
    }
    return { sec: null, n: null };
  }

  function tanyaChapterId(ci) { return "dly-t-c-" + ci; }
  function tanyaParaId(ci, p) { return "dly-t-c-" + ci + "-p-" + p; }
  function luachParaId(p) { return "dly-l-p-" + p; }
  function luachPageId(page) {
    if (!page) return null;
    const key = page.idKey || (page.daf + AMUD_LATIN[(page.amud || 1) - 1]);
    return "dly-l-pg-" + key;
  }
  function luachMaamarId(mi) { return "dly-l-m-" + mi; }

  function tanyaParaNumber(segs, segIndex) {
    if (!segs || segIndex < 0 || segIndex >= segs.length) return null;
    const ci = segs[segIndex][0];
    let n = 0;
    for (let i = 0; i <= segIndex; i++) if (segs[i][0] === ci) n++;
    return n;
  }

  function tanyaParaIndex(segs, ci, p) {
    if (!segs || !p || p < 1) return null;
    let n = 0;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i][0] === ci) {
        n++;
        if (n === p) return i;
      }
    }
    return null;
  }

  function findDaysForSeg(days, segIndex) {
    const out = [];
    if (!days) return out;
    for (const date of Object.keys(days)) {
      const rec = days[date];
      if (rec && rec[0] <= segIndex && segIndex < rec[1]) out.push(date);
    }
    out.sort();
    return out;
  }

  function pickDate(dates, prefer, today) {
    if (!dates || !dates.length) return null;
    if (prefer && dates.includes(prefer)) return prefer;
    if (today && dates.includes(today)) return today;
    if (prefer) {
      const want = Date.parse(prefer);
      return dates.slice().sort((a, b) => {
        const da = Math.abs(Date.parse(a) - want) - Math.abs(Date.parse(b) - want);
        return da || (a < b ? -1 : a > b ? 1 : 0);
      })[0];
    }
    if (today) {
      const after = dates.filter(d => d >= today);
      if (after.length) return after[0];
      return dates[dates.length - 1];
    }
    return dates[0];
  }

  function findTanyaDay(days, segs, ci, p, preferDate, todayIso) {
    if (ci == null) return null;
    let segIndex;
    if (p) {
      segIndex = tanyaParaIndex(segs, ci, p);
      if (segIndex == null) return null;
    } else {
      segIndex = segs.findIndex(s => s[0] === ci);
      if (segIndex < 0) return null;
    }
    const dates = findDaysForSeg(days, segIndex);
    const date = pickDate(dates, preferDate || null, todayIso || null);
    return {
      date,
      segIndex,
      ci,
      p: p || tanyaParaNumber(segs, segIndex),
      dates
    };
  }

  function dayContainsSeg(days, date, segIndex) {
    const rec = days && date && days[date];
    return !!(rec && rec[0] <= segIndex && segIndex < rec[1]);
  }

  function dailyTargetId(query, resolved) {
    if (!query) return null;
    if (query.t === "luach") {
      if (query.pg) return luachPageId(query.pg);
      if (query.p) return luachParaId(query.p);
      if (query.m != null) return luachMaamarId(query.m);
      return null;
    }
    if (query.t === "tanya" && resolved && resolved.ci != null) {
      if (query.p) return tanyaParaId(resolved.ci, query.p);
      return tanyaChapterId(resolved.ci);
    }
    return null;
  }

  function hashQuery(query, todayIso) {
    const qq = {};
    if (!query) return qq;
    if (query.d && query.d !== todayIso) qq.d = query.d;
    if (query.t && query.t !== "tanya") qq.t = query.t;
    if (query.sec && query.sec !== "la") qq.sec = query.sec;
    const chN = query.ch && typeof query.ch === "object" ? query.ch.n : query.ch;
    if (query.n) qq.ch = String(query.n);
    else if (chN) qq.ch = String(chN);
    if (query.p) qq.p = String(query.p);
    if (query.pg) qq.pg = query.pg.label || query.pg.idKey;
    if (query.m) qq.m = String(query.m);
    return qq;
  }

  return {
    TABS,
    SEC_PREFIX,
    stripMarks,
    parseHeNum,
    heNumPlain,
    parseSec,
    parseChapterToken,
    parsePage,
    parseDailyQuery,
    resolveTanyaChapter,
    tanyaChapterId,
    tanyaParaId,
    luachParaId,
    luachPageId,
    luachMaamarId,
    tanyaParaNumber,
    tanyaParaIndex,
    findDaysForSeg,
    pickDate,
    findTanyaDay,
    dayContainsSeg,
    dailyTargetId,
    hashQuery
  };
});
