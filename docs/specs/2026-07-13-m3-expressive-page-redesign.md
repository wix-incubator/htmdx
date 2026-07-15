# M3 Expressive page redesign for htmdx

**Date:** 2026-07-13
**Status:** Approved, pending spec review
**Branch:** `ds-test-2` (fresh from baseline `master`, independent of the M3 branch `initial-ds-test`)
**Scope:** `packages/htmdx` — document shell rendering (`src/index.ts`) + runtime token layer + component styles

## Goal

Redesign the full htmdx page and all built-in components to the look and page
structure of the **m3.material.io** website (Material 3 *Expressive*): a sticky
left navigation, a coast-to-coast vivid-purple hero, and each `##` section
rendered as a distinct large rounded card holding that section's content — with
giant Figtree display type, soft lavender surfaces, large corner radii, and airy
spacing.

Storybook is the ground truth: every built-in component story plus the two
artifact stories (`component-gallery`, `executive-decision-report`) must reflect
the new design.

## Inspiration inputs

- **Visual language:** m3.material.io screenshots (M3 Expressive) — giant
  Google-Sans display headings, big radii, soft tonal cards, vivid purple, very
  airy layout.
- **Page structure:** user Figma
  (`figma.com/design/zL4eQGm4QeHbKQ0SVrFn9I`, node `131:940`). Measured frame is
  1640×2926 with: left nav rectangle `240` wide × full height; a hero rectangle
  starting `~8px` right of the nav, `~543` tall, coast-to-coast with right
  padding; per-section an outer rounded card (`1200×549`) with an inner content
  area inset `24px` (`1152×501`); section titles sit *above* each card.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Scope | Both the site's page structure AND a Material (Expressive) component look |
| Starting point | Fresh on `ds-test-2` from baseline `master` (independent of `initial-ds-test`) |
| Themes | Light only |
| Seed / hero color | Vivid Expressive purple `#6D4DE8` |
| Display/heading font | Figtree (OSS, Google-Sans-like), Google Fonts CDN |
| Body font | Roboto, Google Fonts CDN |
| Font fallback | `system-ui, -apple-system, "Segoe UI", Arial, sans-serif` |
| Left nav | Single 240px sticky rail; page `##` sections as pill nav items (replaces the current right TOC); scroll-spy active state |
| Hero title | From the top-level `#` heading (page title) |
| Hero description | The first lead paragraph appearing before the first `##` section |
| Section container | Each `##` section → title *above* a greyish rounded card (28px radius) with **24px inner padding**, **auto height**, holding all that section's content |
| Licensing | OSS fonts only (OFL/Apache); no proprietary Google Sans |

## Architecture

All component and page styling is injected at runtime from the `RUNTIME_CSS`
template string in `packages/htmdx/src/index.ts`. The document shell (nav, hero,
article) is assembled in the same file by `renderDocument(title, articleHtml,
headings)` and made interactive by `activateSectionRail(root)`. Unlike the M3
design-system work (CSS-only), this redesign changes the **HTML the renderer
emits**, so it spans three layers:

1. **Token layer** — replace `:root` with an M3-Expressive token set (vivid
   purple seed, big radii, display type), with a legacy `--htmdx-*` alias shim.
2. **Document shell** — rewrite `renderDocument` and the section grouping so the
   page becomes: sticky left nav + coast-to-coast hero + per-section cards; move
   the scroll-spy from the right TOC to the left nav.
3. **Component styles** — restyle each `htmdx-*` component rule to the Expressive
   language so components sit cleanly inside the section cards.

Component `.ts` files are unchanged (no body-contract, parsing, export, or
component-output changes). The lead-paragraph and section-grouping logic lives in
`index.ts`'s rendering path.

## 1. Token layer (M3 Expressive)

Replace the `:root` block. Values are Expressive-flavored, seeded from the vivid
purple and the Figma.

### 1.1 Color roles (light)

```
--md-sys-color-primary: #6D4DE8;
--md-sys-color-on-primary: #FFFFFF;
--md-sys-color-primary-container: #E7DEFF;
--md-sys-color-on-primary-container: #1E0060;
--md-sys-color-secondary: #625B71;
--md-sys-color-on-secondary: #FFFFFF;
--md-sys-color-secondary-container: #E8DEF8;
--md-sys-color-on-secondary-container: #1D192B;
--md-sys-color-tertiary: #7D5260;
--md-sys-color-on-tertiary: #FFFFFF;
--md-sys-color-tertiary-container: #FFD8E4;
--md-sys-color-on-tertiary-container: #31111D;
--md-sys-color-error: #B3261E;
--md-sys-color-on-error: #FFFFFF;
--md-sys-color-error-container: #F9DEDC;
--md-sys-color-on-error-container: #410E0B;
--md-sys-color-surface: #FDFBFF;             /* page background (near-white, cool) */
--md-sys-color-on-surface: #1B1B1F;
--md-sys-color-surface-variant: #E4E1EC;
--md-sys-color-on-surface-variant: #47464F;
--md-sys-color-outline: #78767F;
--md-sys-color-outline-variant: #C8C5D0;
--md-sys-color-surface-container-lowest: #FFFFFF;
--md-sys-color-surface-container-low: #F6F3FB;
--md-sys-color-surface-container: #F0EDF5;   /* section card fill (greyish-lavender) */
--md-sys-color-surface-container-high: #EAE7F0;
--md-sys-color-surface-container-highest: #E5E1EA;
--md-sys-color-nav-surface: #EFEDF0;         /* left nav background */
--md-sys-color-shadow: #000000;
```

### 1.2 Typography (Expressive — large)

Typefaces:

```
--md-ref-typeface-brand: "Figtree", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
--md-ref-typeface-plain: "Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
```

Scale (brand for display/headline/title, plain for body/label):

| Token group | Size/LH | Weight | Tracking |
| --- | --- | --- | --- |
| display-large | clamp(2.75rem, 6vw, 3.5rem) / 1.08 | 500 | -0.02em |
| display-medium | 2.8125rem/3.25rem | 500 | 0 |
| headline-large | 2rem/2.5rem | 500 | 0 |
| headline-medium | 1.75rem/2.25rem | 500 | 0 |
| title-large | 1.375rem/1.75rem | 500 | 0 |
| title-medium | 1rem/1.5rem | 500 | 0.15px |
| body-large | 1.0625rem/1.6 | 400 | 0 |
| body-medium | 0.9375rem/1.5 | 400 | 0 |
| label-large | 0.9375rem/1.25rem | 600 | 0 |
| label-medium | 0.75rem/1rem | 600 | 0.5px |

The hero title uses `display-large`; section titles use `headline-large`.

### 1.3 Shape scale (Expressive — larger radii)

```
--md-sys-shape-corner-none: 0;
--md-sys-shape-corner-small: 8px;
--md-sys-shape-corner-medium: 16px;
--md-sys-shape-corner-large: 20px;
--md-sys-shape-corner-extra-large: 28px;   /* hero + section cards */
--md-sys-shape-corner-full: 9999px;        /* nav pills, chips, buttons */
```

### 1.4 Elevation (mostly flat/tonal)

```
--md-sys-elevation-level0: none;
--md-sys-elevation-level1: 0px 1px 2px rgba(0,0,0,0.28), 0px 1px 3px 1px rgba(0,0,0,0.12);
--md-sys-elevation-level2: 0px 1px 2px rgba(0,0,0,0.28), 0px 2px 6px 2px rgba(0,0,0,0.12);
--md-sys-elevation-level3: 0px 4px 8px 3px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.28);
```

Expressive favors flat tonal surfaces; cards use fills + optional level1, not
heavy shadows.

### 1.5 State layers

```
--md-sys-state-hover-opacity: 0.08;
--md-sys-state-focus-opacity: 0.12;
```

### 1.6 Compatibility shim

Keep all legacy `--htmdx-*` names aliased to the new roles (as in the M3 branch:
`--htmdx-accent: var(--md-sys-color-primary)`, `--htmdx-ink`, `--htmdx-body`,
`--htmdx-line`, `--htmdx-panel`, `--htmdx-bg`, `--htmdx-font`, `--htmdx-mono`,
etc.) so any rule not yet migrated keeps resolving.

## 2. Document shell

### 2.1 Target structure

```html
<div class="htmdx-app">
  <nav class="htmdx-nav" aria-label="Sections">
    <div class="htmdx-nav-brand">…optional brand/pill…</div>
    <ol class="htmdx-nav-list">
      <li class="htmdx-nav-item"><a class="htmdx-nav-link" href="#id" data-htmdx-target="id">Section</a></li>
      …
    </ol>
  </nav>
  <div class="htmdx-content">
    <header class="htmdx-hero">
      <h1 class="htmdx-hero-title">Page title</h1>
      <p class="htmdx-hero-desc">Lead paragraph…</p>   <!-- omitted if no lead -->
    </header>
    <main class="htmdx-doc">
      <section class="htmdx-doc-section">
        <h2 id="id" class="htmdx-doc-section-title">Section Title</h2>
        <div class="htmdx-doc-section-card">…all this section's content…</div>
      </section>
      …
    </main>
  </div>
</div>
```

### 2.2 `renderDocument` rewrite

- **Title** → `htmdx-hero-title` (from the top-level `#`).
- **Lead** → the first rendered paragraph that appears before the first `##`
  heading becomes `htmdx-hero-desc`; if none exists, the `<p class="htmdx-hero-desc">`
  is omitted. It must not also appear inside the first section.
- **Section grouping:** partition the article's rendered blocks into sections at
  each `##` boundary. Each section = the `<h2>` (as `htmdx-doc-section-title`,
  keeping its `id` for anchors/scroll-spy) followed by a
  `<div class="htmdx-doc-section-card">` wrapping **all** blocks up to the next
  `##`. Content before the first `##` (other than the extracted lead) renders in
  an intro section card with no title, or is folded into the hero — see §2.4.
- **Nav:** build `htmdx-nav` from the same `headings` list used today by
  `renderToc`, but as left-rail pill links.
- The grouping is implemented in the rendering path in `index.ts` (where
  `renderDocument` currently concatenates `articleHtml`). Prefer grouping the
  already-rendered block/token list rather than re-parsing HTML with regex.

### 2.3 `activateSectionRail` (scroll-spy)

Keep the existing IntersectionObserver/scroll logic, but retarget it from
`.htmdx-toc-link[data-htmdx-target]` to `.htmdx-nav-link[data-htmdx-target]` and
toggle the active class on `.htmdx-nav-item`.

### 2.4 Edge cases

- **No `##` sections:** render the hero (if a title exists) and a single section
  card containing all body content, no nav items.
- **No `#` title:** omit the hero title; if a lead paragraph exists it still
  renders as `htmdx-hero-desc` inside the hero, otherwise omit the hero entirely.
- **Content before the first `##` beyond the lead:** wrap in a leading
  `htmdx-doc-section-card` with no title so nothing is dropped.

## 3. Layout & key component styling

- **`.htmdx-app`** — grid: `240px minmax(0, 1fr)`; min-height 100vh; background
  `--md-sys-color-surface`.
- **`.htmdx-nav`** — `position: sticky; top: 0; align-self: start;` height
  `100vh`; background `--md-sys-color-nav-surface`; vertical padding; scrollable
  if long.
- **`.htmdx-nav-link`** — label-large; `--md-sys-color-on-surface-variant`;
  `border-radius: var(--md-sys-shape-corner-full)`; padding `10px 16px`; hover =
  primary 8% state layer.
- **`.htmdx-nav-item.is-active .htmdx-nav-link`** — filled
  `--md-sys-color-secondary-container` pill, `--md-sys-color-on-secondary-container`.
- **`.htmdx-content`** — `max-width` cap (e.g. 72rem); horizontal padding
  (~24–32px); the content column, not the nav, holds the hero + sections.
- **`.htmdx-hero`** — background `--md-sys-color-primary`; color
  `--md-sys-color-on-primary`; `border-radius: var(--md-sys-shape-corner-extra-large)`;
  padding `40px 48px`; margin below ~40px; coast-to-coast within the content
  column.
- **`.htmdx-hero-title`** — brand typeface, `display-large`, white.
- **`.htmdx-hero-desc`** — plain typeface, `body-large`, white ~90% opacity,
  max-width ~46rem.
- **`.htmdx-doc-section`** — margin-bottom ~48px.
- **`.htmdx-doc-section-title`** — brand typeface, `headline-large`,
  `--md-sys-color-on-surface`; margin `0 0 16px 0`; sits above the card.
- **`.htmdx-doc-section-card`** — background `--md-sys-color-surface-container`;
  `border-radius: var(--md-sys-shape-corner-extra-large)`; **padding: 24px**;
  **height auto**; no fixed height. Optional `--md-sys-elevation-level0/1`.

### Component mapping (inside the section cards)

Since components now sit inside a tinted card, they use lighter/lowest surfaces
for contrast against the card fill:

| Component | Expressive treatment |
| --- | --- |
| `Card` | `surface-container-lowest`, corner-large (20px), elevation-1 |
| `ExecutiveSummary` | `primary-container` / `on-primary-container`, corner-extra-large |
| `Callout` | `secondary-container` tonal block, corner-large |
| `MetricStrip` / `Stat` | `surface-container-lowest` outlined surface, title-large values, label-medium captions |
| `Compare` / `Finding` / `Evidence` | `surface-container-lowest` cards, `outline-variant` dividers, corner-large |
| `RiskTable` tiers | full-radius assist chips (secondary / tertiary / surface-variant / error containers) |
| `SourceQuote` | `on-surface-variant` text, `primary` left accent |
| Tables (`DataTable`, `DecisionTable`) | header on `surface-container-high`, `outline-variant` rules, hover = primary 8% state layer |
| Charts (bar/line/area/pie) | series primary → tertiary → secondary → error → on-surface-variant; axes `outline-variant` |
| `Timeline` | `primary` track, `surface-container-lowest` ringed nodes |
| Headings/body inside cards | brand display for `###`, Roboto body; links `primary` |

Charts reuse the `data-series` attribute approach; a `--md-chart-series-0..4`
token list maps to the series role sequence above (all legible on the card fill).

## 4. Font injection

Inject Figtree + Roboto via a guarded Google Fonts `<link>` in `register()`
(preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`), added once,
`display=swap`, system fallback so offline artifacts still lay out.

## 5. Responsive

- **≤ 960px:** collapse the grid — the left nav hides (or becomes a top strip);
  content goes full-width with reduced padding; hero radius/padding scale down.
- **≤ 720px:** hero title uses the lower clamp bound; section cards keep 24px (or
  reduce to ~16px) padding; multi-column component grids collapse to one column.

## 6. Non-goals

- No dark scheme (light only).
- No new components; no changes to component body contracts, parsing, public API,
  exports, or `component-manifest`.
- No proprietary fonts.
- No behavior change beyond the new page structure + styling.

## 7. Testing & verification

- **Typecheck:** `yarn workspace @wix/htmdx typecheck` clean.
- **Unit tests:** `yarn workspace @wix/htmdx test run` green. The shell-structure
  tests that assert the old markup (`<article class="htmdx-article">`, masthead,
  `.htmdx-toc`) **will be updated** to the new structure
  (`.htmdx-app`/`.htmdx-nav`/`.htmdx-hero`/`.htmdx-doc-section-card`), and new
  tests added for: lead-paragraph extraction into the hero, per-`##` section-card
  grouping, and left-nav generation. This is expected, not a regression.
- **Storybook (ground truth):** run `yarn storybook`; verify each built-in
  component story and especially the two artifact stories (`component-gallery`,
  `executive-decision-report`) render the full new shell — sticky left nav,
  purple coast-to-coast hero, per-section greyish cards with 24px padding and
  auto height, Expressive type/radii/colors — with no broken layout.
- **Lint/format:** `lint` and `fmt:check` clean.

## 8. Rollout

Single branch `ds-test-2`. Reversible by reverting the `index.ts` diff. No
consumer migration required (compatibility shim preserves legacy token names);
however, the emitted document DOM changes, so any external CSS/JS that targeted
the old `.htmdx-masthead` / `.htmdx-toc` / `.htmdx-article` hooks would need
updating — acceptable for this redesign.
