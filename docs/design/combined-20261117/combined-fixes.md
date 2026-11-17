# Combined design: review fixes

**Repo:** `C:\Users\dddud\chavruta-app-combined`, branch `feat/ia-phase-1`. Nothing is committed, pushed or merged. All changes are in the working tree.
**Date:** 2026-11-15. **Review:** `combined-review.md`.

## P1: the first-visit style toast covered content
- `personalize.js`: the floating `.chs-toast` is gone. `maybeToast()` now adds an in-flow `aside.chs-invite` ("סגנון האתר") to the home page's `.h-after` row, right after the lead and Parashat HaShavua. It creates that row if it doesn't exist. It is kept separate from the reading-setup invite ("סביבת לימוד שנוחה לך"), which sits beside it.
- The invite also runs from the `#view` MutationObserver, because home renders asynchronously.
- Unchanged: "לבחירת סגנון" opens the panel, and both opening the panel and "לא עכשיו" set `seen` in `chavruta-style-v1`. The header button and the "עוד" sheet entry still open the panel.
- `combined.css`: `.chs-invite` uses the same compact card as the reading-setup invite. Its body text moved from `--ink-3` to `--ink-2`.
- The old `.chs-toast` rules are still in `personalize.css` but nothing uses them now. They can be removed in the source repo.

## P1: mobile order and header
- `app.js` `VIEWS.home`: `.h-quick` is no longer inside `.h-intro`. It is now the third child of `.h-lead`, so the DOM and focus order is intro + search, then the week card, then the quick links.
  - On desktop, the CSS grid puts the quick links back in the 8-column intro track (row 2), and the week card spans both rows.
  - On mobile (≤900px) everything stacks in DOM order.
- `combined.css`: below 720px, the intro, kicker and search margins are slightly tighter. Body text size is unchanged.
- `combined.css`: the mobile header (≤720px) is now **one row** (measured at 50px; it was 3 rows, about 125px).
  - The row holds brand, parasha picker (can shrink with an ellipsis), back arrow, Style, and Reading preferences. PDF appears only on reading views (`body.has-modes`).
  - Hidden on mobile only:
    - the forward arrow
    - the separate history row
    - the header search button: search is still in the bottom nav (same palette) and in the home search form
    - the theme button: light/dark and palettes are in both the Style panel and Reading preferences
  - Desktop is unchanged.
- **Measured at 390×844, first visit:**
  - Search form ends at y=465.
  - The week card starts at y=485 and comes directly after the search form.
  - The card title ends at y=589 and the "ללימוד הפרשה" link at y=737, above the bottom nav.
  - Tabbing from the search button goes into the week card.
  - No fixed overlays, no horizontal scroll.
  - On a biur page with PDF, the header is still one 50px row with no overflow.

## P2: stable generation names (`ftHome`)
- The name and the "lead" rebbe of each generation now come from all of `ix.series` before filtering. Generation 0 is "הבעש״ט והמגיד" when both are present.
- The `ft-by` attribution compares against that fixed lead rebbe.
- No book assignment, generation number or URL changed.
- **Checked:** with no filter, with "כתר שם טוב", with "אור תורה" and after clearing, the first heading is always "הבעש״ט והמגיד".

## P2: shared axis on index pages
- `app.js` adds `.ix-page` only on `#/new`, on `#/learn` with no gate, and on `#/topics` with no term. Gate pages, topic pages, the tree and the reader are untouched.
- `combined.css`: `.main.page.ix-page` uses `max-width: var(--wrap)` with content-box sizing, the same as home and library. Lede and intro paragraphs are capped at 48rem.
- On the ביאורים index, the five gates are now full-width records (name 3 · description 6 · count 3, stacked on mobile), so a row can never hold a single gate.
- **Measured right edges at 1440:** the H1 on home, library, learn, topics and new is at 1293, matching the brand. The learn gate page (1185) and the tree (1169) keep their own widths, as intended.
- **Not done:** the editions cover shelf still uses its auto-fill grid with partial rows. That needs its own change.

## P2: contrast
I measured small text against the surface it actually sits on (home page, 4 styles × light/dark × default / gold `#e0b040` / navy `#1f3a8a` accent; depth is light only). Failures:
- discovery with a custom accent: `.h-card-n` and `.h-card-go` on the pastels, and the week kicker and link on lemon (3.5–4.0)
- editorial, week kicker and link on paper-2: gold accent 4.02, navy accent in dark mode 4.47

Fix: those elements now use `--on-fill` (discovery) or `--ink` (editorial). The accent stays on the borders and rules. After the fix, every combination is ≥4.5:1. Palettes are unchanged.

## P3
- In the week card, the stage is no longer repeated in `.h-week-m`. The meta line now shows counts only ("2 שרשראות · 270 מקורות"), and the stage stays in `.h-week-d`.
- The card's desktop height (stretch) is unchanged.

## Cache versions
- `index.html`: `combined.css` and `app.js` are now `?v=combined2`, and `personalize.*` is now `?v=5fd77f90ada1-c2`.
- `sw.js`: `CACHE_VERSION` is now `v6-combined2`.
- `status.html` still points at the old personalize version. It no longer gets a toast, which is fine.

## Verification
- `node --check app.js`, `node --check personalize.js`: OK.
- `python tools/ci/pr_check.py`: `pr-check ok`.
- I ran a focused headless Edge check (`combined-tools/fixcheck.mjs`, not a full matrix). Results are in `combined-fix-shots/fixcheck.json`, with screenshots for first-visit home (mobile and desktop) and the learn index (desktop and mobile).
- I did not run the full screenshot matrix or the old-URL navigation pass.

## Follow-ups
- Port all of this to the source repo (`tools/site/design.css`, `tools/app/src`, `personalize_hooks.py`), as noted in combined-impl.md.
- Editions shelf: replace the partial rows with generation rows.
