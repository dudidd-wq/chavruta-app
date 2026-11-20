#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const A = require("../daily-anchors.js");

function eq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg);
}
function ok(cond, msg) { assert.ok(cond, msg); }

function loadChunk(file) {
  const src = fs.readFileSync(path.join(__dirname, "..", "data", file), "utf8");
  const box = { window: { __D(name, data) { box.data = data; box.name = name; } } };
  vm.runInNewContext(src, box);
  return box.data;
}

// --- parse helpers ---
eq(A.parseHeNum("41"), 41);
eq(A.parseHeNum("מא"), 41);
eq(A.parseHeNum("מ״א"), 41);
eq(A.parseHeNum("ג"), 3);
eq(A.parseHeNum("ט״ו"), 15);
eq(A.parseHeNum("טו"), 15);
eq(A.parseHeNum("טז"), 16);
eq(A.heNumPlain(41), "מא");
eq(A.heNumPlain(15), "טו");
eq(A.heNumPlain(16), "טז");
eq(A.heNumPlain(12), "יב");

eq(A.parsePage("יז,ד").idKey, "17d");
eq(A.parsePage("יז,ד").label, "יז,ד");
eq(A.parsePage("17d").idKey, "17d");
eq(A.parsePage("17d").daf, 17);
eq(A.parsePage("17d").amud, 4);
eq(A.parsePage("17,4").idKey, "17d");
eq(A.parsePage("י״ז, א").idKey, "17a");
eq(A.parsePage(""), null);
eq(A.parsePage("nope"), null);
eq(A.luachPageId(A.parsePage("יז,ד")), "dly-l-pg-17d");
eq(A.luachParaId(3), "dly-l-p-3");
eq(A.luachMaamarId(25), "dly-l-m-25");

// --- query parsing: existing URLs stay valid ---
const today = "2026-11-20";
let q = A.parseDailyQuery(new URLSearchParams(""), today);
eq(q.d, null);
eq(q.t, "tanya");
eq(q.ch, null);
eq(q.p, null);
ok(!q.explicitDate && !q.explicitTab);

q = A.parseDailyQuery(new URLSearchParams("d=2027-04-23"), today);
eq(q.d, "2027-04-23");
eq(q.t, "tanya");
ok(q.explicitDate && !q.ch && !q.p);

q = A.parseDailyQuery(new URLSearchParams("t=luach&d=2026-11-11"), today);
eq(q.t, "luach");
eq(q.d, "2026-11-11");
ok(q.explicitTab);

q = A.parseDailyQuery(new URLSearchParams("d=2027-04-23&t=tanya&ch=41&p=3"), today);
eq(q.t, "tanya");
eq(q.d, "2027-04-23");
eq(q.ch.n, 41);
eq(q.p, 3);
eq(q.sec, "la");

q = A.parseDailyQuery({ d: "2027-04-23", t: "tanya", ch: "מא", p: "ג" }, today);
eq(q.ch.n, 41);
eq(q.p, 3);

q = A.parseDailyQuery(new URLSearchParams("t=tanya&sec=at&ch=1&p=2"), today);
eq(q.sec, "at");
eq(q.ch.n, 1);
eq(q.p, 2);

q = A.parseDailyQuery(new URLSearchParams("ch=at-1&p=2"), today);
eq(q.sec, "at");
eq(q.ch.n, 1);

q = A.parseDailyQuery(new URLSearchParams("t=luach&d=2026-11-11&pg=יז,ד"), today);
eq(q.t, "luach");
eq(q.pg.idKey, "17d");

q = A.parseDailyQuery(new URLSearchParams("t=rambam&ch=1&p=2"), today);
eq(q.t, "rambam");

q = A.parseDailyQuery(new URLSearchParams("t=unknown&d=not-a-date"), today);
eq(q.t, "tanya");
eq(q.d, null);

// unknown t (other than the three tabs) still defaults to tanya — old links work
q = A.parseDailyQuery(new URLSearchParams("t=foo"), today);
eq(q.t, "tanya");

// --- hash query omits defaults ---
eq(A.hashQuery({ d: today, t: "tanya" }, today), {});
eq(A.hashQuery({ d: "2027-04-23", t: "tanya", ch: { n: 41 }, p: 3 }, today), { d: "2027-04-23", ch: "41", p: "3" });
eq(A.hashQuery({ d: "2026-11-11", t: "luach", pg: A.parsePage("17d") }, today), { d: "2026-11-11", t: "luach", pg: "יז,ד" });
eq(A.hashQuery({ t: "tanya", sec: "at", n: 1, p: 2 }, today), { sec: "at", ch: "1", p: "2" });

// --- real Tanya / daily data ---
const daily = loadChunk("daily.js");
const tanya = loadChunk("tanya.js");
ok(daily.chaps[45] === "ליקוטי אמרים פרק מא", daily.chaps[45]);

const chap41 = A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ ch: "41" }));
eq(chap41.ci, 45);
eq(chap41.n, 41);
eq(chap41.sec, "la");
eq(A.tanyaChapterId(chap41.ci), "dly-t-c-45");

const chapMa = A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ ch: "מא" }));
eq(chapMa.ci, 45);

const at1 = A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ sec: "at", ch: "1" }));
eq(at1.title, "אגרת התשובה פרק א");
const ak23 = A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ ch: "ak-23" }));
eq(ak23.title, "אגרת הקודש פרק כג");
const shaar5 = A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ sec: "shaar", ch: "ה" }));
eq(shaar5.title, "שער היחוד והאמונה פרק ה");

// ch=41 is Likutei Amarim 41, NOT chapter-index 41 (which is פרק לז)
ok(daily.chaps[41] === "ליקוטי אמרים פרק לז");
ok(chap41.ci !== 41);

eq(A.resolveTanyaChapter(daily.chaps, A.parseDailyQuery({ ch: "999" })), null);

// Chapter 41 paragraph 3 is NOT on 2027-04-23 (that day starts at p=16).
// A preferred date that misses the paragraph yields the closest occurrence.
const p3 = A.findTanyaDay(daily.days, tanya.segs, chap41.ci, 3, "2027-04-23", "2026-11-20");
ok(p3, "expected a day for Tanya ch 41 p 3");
eq(p3.dates, ["2027-04-18", "2028-04-13"]);
eq(p3.date, "2027-04-18");
eq(A.tanyaParaIndex(tanya.segs, 45, 3), 577);
eq(A.tanyaParaNumber(tanya.segs, 577), 3);
eq(A.tanyaParaId(45, 3), "dly-t-c-45-p-3");

// When no explicit date, from today 2026-11-20 the next occurrence is 2027-04-18
const p3soon = A.findTanyaDay(daily.days, tanya.segs, chap41.ci, 3, null, "2026-11-20");
eq(p3soon.date, "2027-04-18");

// The sample day 2027-04-23 holds chapter 41 paragraphs 16–24
const dayRec = daily.days["2027-04-23"];
eq(dayRec[2], "ליקוטי אמרים פרק מא");
eq(A.tanyaParaNumber(tanya.segs, dayRec[0]), 16);
eq(A.tanyaParaNumber(tanya.segs, dayRec[1] - 1), 24);
ok(A.dayContainsSeg(daily.days, "2027-04-23", dayRec[0]));
ok(!A.dayContainsSeg(daily.days, "2027-04-23", 577));

const p16 = A.findTanyaDay(daily.days, tanya.segs, chap41.ci, 16, "2027-04-23", today);
eq(p16.date, "2027-04-23");

const target = A.dailyTargetId(
  A.parseDailyQuery({ d: "2027-04-23", t: "tanya", ch: "41", p: "16" }),
  chap41
);
eq(target, "dly-t-c-45-p-16");

const targetCh = A.dailyTargetId(
  A.parseDailyQuery({ t: "tanya", ch: "41" }),
  chap41
);
eq(targetCh, "dly-t-c-45");

const targetPg = A.dailyTargetId(
  A.parseDailyQuery({ t: "luach", d: "2026-11-11", pg: "יז,ד" })
);
eq(targetPg, "dly-l-pg-17d");

const targetLp = A.dailyTargetId(
  A.parseDailyQuery({ t: "luach", p: "3" })
);
eq(targetLp, "dly-l-p-3");

// luach day 2026-11-11 (א כסלו תשפ״ז) covers pages יז,א–יח,ב, including יז,ד
const hpKey = "5787|כסלו|1";
ok(daily.tolt.days[hpKey], "expected tolt day for 1 Kislev 5787");
eq(daily.tolt.days[hpKey][5], "יז,א");
eq(daily.tolt.days[hpKey][6], "יח,ב");

console.log("daily-anchors.test.js: all assertions passed");
