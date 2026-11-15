# Chavruta site design research brief

Work independently. Do not read or wait for another model's output file.
Write your complete report to the markdown file named in the task section below, in the working directory of this project (C:\Users\dddud\chavruta-design-research\). Write the report in Hebrew, with specific font names, hex colors, and layout measures in Latin script as needed.

## Project

- Live site (current production; may still show the older IA): https://dudidd-wq.github.io/chavruta-app/
- Repo: https://github.com/dudidd-wq/chavruta-app
- Phase-1 information architecture is in pull request 38 (not merged). The screenshots in `screenshots\` are of that unmerged phase-1 preview, not necessarily the live GitHub Pages site.
- Screenshots (study these carefully):
  - screenshots/home-desktop.png
  - screenshots/home-mobile.png
  - screenshots/home-mobile-viewport.png
  - screenshots/library-desktop.png
  - screenshots/library-mobile.png
  - screenshots/library-mobile-viewport.png
  - screenshots/learn-desktop.png
  - screenshots/learn-mobile.png
  - screenshots/learn-mobile-viewport.png

## Product and audience

Chavruta ("חברותא") is a Hebrew RTL site for an autonomous Kabbalah and Chassidut knowledge tree, plus a full-text library, biurim (commentaries), and a chronology/timeline (from the Baal Shem Tov to the Rebbe).

Audience: modern readers, including people who are not from Chabad. The site must feel serious and text-first, but also visually appealing and contemporary — not like a dated institutional page, and not like a generic AI/SaaS landing page.

The site already has user-selectable themes (editorial, light & depth, discovery) and a user-selectable accent color. Keep theme and accent choice; design directions should work across those themes, not replace them with a single locked palette.

Phase-1 IA already approved (do not reopen IA): six nav items (ראשי, ספרייה, ביאורים, עץ וזמן, מפתח, מה חדש), persistent search in the header, unified library with "לקריאה" / "מהדורות" tabs, shorter homepage (short intro, search, parashat hashavua, clear entry points; "מצב המערכת" moved to the footer). Old URLs should keep working.

## User feedback on phase 1

Exact feedback: "היישור לא מאוזן ומשהו לא מרגיש מושך"
(English: "the alignment is unbalanced, and something doesn't feel appealing.")

## Your task

1. Research references: well-designed Hebrew/RTL text and library sites (for example Sefaria, Al HaTorah, Dicta) and strong modern editorial / typographic sites. Note what they do well for alignment, type, density, and appeal. You may fetch public pages with local tools if useful; do not need accounts or logins.

2. Diagnose the phase-1 screenshots: where alignment is unbalanced, why the pages may not feel appealing, and what is working. Be concrete (which page, which region, what is off: grid, type scale, spacing, contrast, card rhythm, hero, mobile nav, etc.).

3. Propose 2–3 concrete design directions. For each direction specify:
   - layout grid (columns, margins, max width, spacing scale)
   - typography with specific Hebrew font names (and Latin fallbacks if needed), sizes, weights, line-height
   - color palettes that work with the existing selectable themes and accent color
   - hero treatment
   - card styles
   - mobile behavior
   - how the direction serves both Chassidut/Kabbalah text and non-Chabad modern readers

4. Recommend one direction, with a clear rationale tied to the diagnosis and the references.

Do not implement code. Do not modify the site. This is research and a design proposal only. Stay inside this folder when writing files.

## Output

A single well-structured markdown report (the filename given in your task prompt). Include: references, diagnosis, 2–3 directions, and a final recommendation.
