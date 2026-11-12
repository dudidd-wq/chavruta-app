(function () {
  const data = window.CHAVRUTA_PROJECT_STATUS;
  const root = document.getElementById("sys-root");
  if (!data || !root) {
    if (root) root.innerHTML = "<p class=\"err\">לא ניתן לטעון את נתוני המצב.</p>";
    return;
  }

  const PALETTE = ["#76283a", "#1d4e80", "#475a1f", "#8a5a17", "#5c3d6e", "#2f6a45", "#8d3a2e", "#3a5c6e", "#6e6457"];
  const fmt = (n) => Number(n).toLocaleString("he-IL");
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  };

  function heatColor(count, max) {
    if (!count) return "transparent";
    const t = Math.log(count + 1) / Math.log(max + 1);
    const alpha = 0.12 + t * 0.82;
    return `color-mix(in srgb, var(--accent) ${Math.round(alpha * 100)}%, var(--card))`;
  }

  const cov = data.coverage;
  const corr = data.correlation;
  const sef = data.sefaria;
  const qa = data.qa;

  document.getElementById("sys-updated").textContent = "עודכן: " + data.generated_label;

  const covBody = cov.rows.map((row) => {
    const isFinal = row.status === "final";
    return h("tr", null,
      h("th", { scope: "row" }, row.name),
      h("td", { class: "num" }, fmt(row.linked)),
      h("td", { class: "num" }, fmt(row.total)),
      h("td", { class: "num" },
        h("div", { class: "bar" + (isFinal ? " final" : ""), style: { "--val": row.pct + "%" }, role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(row.pct), "aria-label": row.name + ": " + row.pct + "%" }, h("i"))
      ),
      h("td", { class: "num" }, row.pct.toLocaleString("he-IL") + "%"),
      h("td", null, h("span", { class: "badge " + (isFinal ? "final" : "progress") }, row.status_label))
    );
  });

  const covTable = h("table", { class: "cov-table" },
    h("thead", null, h("tr", null,
      h("th", null, "אדמו״ר"),
      h("th", { class: "num" }, "קושרו"),
      h("th", { class: "num" }, "סה״כ הפניות"),
      h("th", { class: "num" }, "כיסוי"),
      h("th", { class: "num" }, "%"),
      h("th", null, "מצב")
    )),
    h("tbody", null, covBody),
    h("tfoot", null, h("tr", null,
      h("th", { scope: "row" }, "הכול"),
      h("td", { class: "num" }, fmt(cov.totals.linked)),
      h("td", { class: "num" }, fmt(cov.totals.total)),
      h("td", { class: "num" },
        h("div", { class: "bar", style: { "--val": cov.totals.pct + "%" }, role: "progressbar", "aria-valuenow": String(cov.totals.pct), "aria-valuemin": "0", "aria-valuemax": "100" }, h("i"))
      ),
      h("td", { class: "num" }, cov.totals.pct.toLocaleString("he-IL") + "%"),
      h("td", null, "")
    ))
  );

  const topWorks = corr.works.slice(0, 8);
  const topIds = new Set(topWorks.map((w) => w.id));
  const stack = corr.admorim.map((a) => {
    const parts = topWorks.map((w) => ({ id: w.id, label: w.label, n: a.by_work[w.id] || 0 }));
    const other = a.total - parts.reduce((s, p) => s + p.n, 0);
    if (other > 0) parts.push({ id: "other", label: "אחר", n: other });
    const track = h("div", { class: "stack-track", title: a.name });
    parts.forEach((p, i) => {
      const seg = h("span", {
        style: { width: (100 * p.n / a.total) + "%", background: p.id === "other" ? "var(--gx)" : PALETTE[i] },
        title: p.label + ": " + fmt(p.n)
      });
      if (!p.n) seg.setAttribute("data-zero", "");
      track.append(seg);
    });
    return h("div", { class: "stack-row" },
      h("div", { class: "stack-name" }, a.name),
      track,
      h("div", { class: "stack-n" }, fmt(a.total))
    );
  });
  const legend = h("ul", { class: "legend" },
    topWorks.map((w, i) => h("li", null, h("i", { style: { background: PALETTE[i] } }), w.label)),
    h("li", null, h("i", { style: { background: "var(--gx)" } }), "אחר")
  );

  const maxCell = Math.max(1, ...corr.admorim.flatMap((a) => Object.values(a.by_work)));
  const heatHead = h("tr", null, h("th", { scope: "col" }, ""), corr.works.map((w) => h("th", { scope: "col", title: w.label }, w.label)));
  const heatBody = corr.admorim.map((a) => h("tr", null,
    h("th", { scope: "row" }, a.name),
    corr.works.map((w) => {
      const n = a.by_work[w.id] || 0;
      return h("td", { style: { background: heatColor(n, maxCell) }, title: a.name + " ← " + w.label + ": " + fmt(n) }, n ? fmt(n) : "·");
    })
  ));

  const qaCards = qa.strata.map((s) => h("article", { class: "card qa-card" },
    h("h3", null, s.label),
    h("div", { class: "pct" }, s.agree_pct.toLocaleString("he-IL") + "%"),
    h("p", null, "הסכמה במדגם: ", fmt(s.agree), " מתוך ", fmt(s.n)),
    h("p", null, h("span", { class: "badge review" }, qa.status_label))
  ));

  const groupCards = sef.groups.map((g) => h("article", { class: "card" },
    h("h3", null, g.name),
    h("div", { class: "n" }, fmt(g.done), h("small", null, " מתוך ", fmt(g.titles), " כותרים")),
    h("p", { class: "tot-note" }, fmt(g.segments), " קטעים", g.failed || g.partial ? " · " + (g.failed ? g.failed + " נכשל" : "") + (g.partial ? (g.failed ? ", " : "") + g.partial + " חלקי" : "") : "")
  ));

  const titleRows = sef.titles.map((t) => h("tr", null,
    h("td", null, t.work),
    h("td", null, t.sefaria_title),
    h("td", null, t.group),
    h("td", { class: "num" }, fmt(t.segments)),
    h("td", null, t.status_label + (t.note ? " — " + t.note : "")),
    h("td", null, (t.licenses || []).join(", ") || "—")
  ));

  root.append(
    h("p", { class: "sys-lead" }, "עמוד זה מציג את התקדמות בניית מפת הקישורים בין המקורות, את קליטת הטקסט הפתוח מספריא, ואת שיעורי ההסכמה בבקרת האיכות. מוצגים מספרים מצטברים ושמות יצירות בלבד, בלי טקסט המקורות."),
    h("section", { "aria-labelledby": "h-cov" },
      h("h2", { id: "h-cov" }, "קישור הפניות"),
      h("p", { class: "sec-lead" }, "כל הפניה בכתבי האדמו״רים מחוברת, כשאפשר, אל היחידה שהיא מצביעה עליה בעץ. אצל אדמו״ר הזקן הריצה הסתיימה. אצל שאר האדמו״רים הריצה הזולה עדיין בתהליך."),
      h("div", { class: "sys-grid cov-grid" },
        h("div", { class: "card" }, covTable),
        h("div", { class: "card tot-card" },
          h("h3", null, "סך הכול עד עכשיו"),
          h("div", { class: "tot-num" }, cov.totals.pct.toLocaleString("he-IL") + "%", h("small", null, fmt(cov.totals.linked) + " מתוך " + fmt(cov.totals.total))),
          h("p", { class: "tot-note" }, cov.rest.note)
        )
      )
    ),
    h("section", { "aria-labelledby": "h-map" },
      h("h2", { id: "h-map" }, "מפת הקשרים בין המקורות"),
      h("p", { class: "sec-lead" }, corr.description),
      h("div", { class: "card" }, stack, legend),
      h("div", { class: "heat-wrap" },
        h("table", { class: "heat", "aria-label": "טבלת הפניות לפי אדמו״ר ויצירה" },
          h("thead", null, heatHead),
          h("tbody", null, heatBody)
        )
      )
    ),
    h("section", { "aria-labelledby": "h-sef" },
      h("h2", { id: "h-sef" }, "קליטת טקסט פתוח מספריא"),
      h("p", { class: "sec-lead" }, "נקלטו " + fmt(sef.titles_done) + " מתוך " + fmt(sef.titles_total) + " כותרים, " + fmt(sef.segments) + " קטעים. מוצגים שמות ומספרים בלבד."),
      h("div", { class: "group-cards" }, groupCards),
      h("details", { class: "titles" },
        h("summary", null, "רשימת הכותרים"),
        h("table", { class: "title-table" },
          h("thead", null, h("tr", null,
            h("th", null, "יצירה"),
            h("th", null, "כותר בספריא"),
            h("th", null, "קבוצה"),
            h("th", { class: "num" }, "קטעים"),
            h("th", null, "מצב"),
            h("th", null, "רישיון")
          )),
          h("tbody", null, titleRows)
        )
      )
    ),
    h("section", { "aria-labelledby": "h-qa" },
      h("h2", { id: "h-qa" }, "בקרת איכות"),
      h("p", { class: "sec-lead" }, qa.scope + ". שיעורי ההסכמה האלה ממתינים לבדיקה נוספת של מודל שלישי, ועדיין אינם סופיים."),
      h("div", { class: "qa-grid" }, qaCards)
    )
  );
})();
