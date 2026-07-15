# M3 Expressive Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the htmdx page shell and all built-in components to the m3.material.io (M3 Expressive) look: sticky left nav, coast-to-coast vivid-purple hero, and each `##` section as a distinct rounded card holding its content.

**Architecture:** The document shell is assembled in `packages/htmdx/src/index.ts` by `renderDocument()` and made interactive by `activateSectionRail()`; all styling is one `RUNTIME_CSS` template string in the same file. This redesign (1) replaces the `:root` token layer with an Expressive set, (2) rewrites `renderDocument` so the emitted DOM becomes left-nav + hero + per-section cards (grouping the rendered article HTML at `<h2>` boundaries and extracting the lead paragraph into the hero), and (3) restyles every component to the Expressive language. One markup change in `rendering.ts` (chart `data-series`).

**Tech Stack:** TypeScript, Lit-free `htmdx-code` custom element, Storybook (`@storybook/web-components-vite`), Vitest + jsdom, Rollup. Node ≥22.18.0, Yarn 4.

## Global Constraints

- Node `>=22.18.0`; Yarn `4.16.0`. Run package commands via `yarn workspace @wix/htmdx <script>`.
- Light scheme only (`color-scheme: light`). No dark scheme.
- Vivid Expressive purple seed `#6D4DE8`; use the token values in Task 1 verbatim.
- Fonts: Figtree (display/heading) + Roboto (body) from the public Google Fonts CDN, `display=swap`, fallback `system-ui, -apple-system, "Segoe UI", Arial, sans-serif`. No proprietary fonts.
- Section card: greyish `--md-sys-color-surface-container` fill, `--md-sys-shape-corner-extra-large` (28px) radius, **24px inner padding**, **auto height**. Section title sits **above** the card.
- Hero: `--md-sys-color-primary` background, coast-to-coast within the content column, 28px radius, white title + lead description.
- Left nav: single 240px sticky rail; page `##` sections as pill items; scroll-spy active state.
- No changes to component body contracts, parsing, public API, exports, or `component-manifest`. Component `.ts` files change only for the chart `data-series` hook (Task 7).
- The emitted document DOM intentionally changes; existing shell-structure tests are updated to the new markup (not treated as regressions).
- Commit after every task. No `git rebase -i` / `git add -i`.

## File Structure

- `packages/htmdx/src/index.ts` — token layer (`:root`), `renderDocument` + new `groupSections`/`renderHero`/`renderNav` helpers, `activateSectionRail` selector retarget, font injector, and all `RUNTIME_CSS` component/shell styles.
- `packages/htmdx/src/components/rendering.ts` — one change: add `data-series` to chart bars (Task 7).
- `packages/htmdx/test/test.spec.ts` — update shell-structure assertions; add tests for font injection, hero/lead extraction, section grouping, nav generation, chart `data-series`.

Verification is Storybook-visual + typecheck + unit tests + lint/format + build. Stories call `register({ tailwind: false })`, which injects `RUNTIME_CSS` and (after Task 2) the fonts, and renders through `compile()`, so all changes show live.

---

### Task 1: Expressive token layer + compatibility shim

**Files:** Modify `packages/htmdx/src/index.ts` — the `:root { … }` block in `RUNTIME_CSS`.

**Interfaces:**
- Produces `--md-sys-color-*` (incl. `--md-sys-color-nav-surface`), `--md-ref-typeface-brand|plain`, `--md-sys-shape-corner-*`, `--md-sys-elevation-level0..3`, `--md-sys-state-*`, `--md-chart-series-0..4`, and legacy `--htmdx-*` aliases.

- [ ] **Step 1: Replace the `:root` block**

Replace the entire existing `:root { … }` block with:

```css
  :root {
    color-scheme: light;

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
    --md-sys-color-surface: #FDFBFF;
    --md-sys-color-on-surface: #1B1B1F;
    --md-sys-color-surface-variant: #E4E1EC;
    --md-sys-color-on-surface-variant: #47464F;
    --md-sys-color-outline: #78767F;
    --md-sys-color-outline-variant: #C8C5D0;
    --md-sys-color-surface-container-lowest: #FFFFFF;
    --md-sys-color-surface-container-low: #F6F3FB;
    --md-sys-color-surface-container: #F0EDF5;
    --md-sys-color-surface-container-high: #EAE7F0;
    --md-sys-color-surface-container-highest: #E5E1EA;
    --md-sys-color-nav-surface: #EFEDF0;
    --md-sys-color-shadow: #000000;

    --md-ref-typeface-brand: "Figtree", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    --md-ref-typeface-plain: "Roboto", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;

    --md-sys-shape-corner-none: 0;
    --md-sys-shape-corner-small: 8px;
    --md-sys-shape-corner-medium: 16px;
    --md-sys-shape-corner-large: 20px;
    --md-sys-shape-corner-extra-large: 28px;
    --md-sys-shape-corner-full: 9999px;

    --md-sys-elevation-level0: none;
    --md-sys-elevation-level1: 0px 1px 2px rgba(0,0,0,0.28), 0px 1px 3px 1px rgba(0,0,0,0.12);
    --md-sys-elevation-level2: 0px 1px 2px rgba(0,0,0,0.28), 0px 2px 6px 2px rgba(0,0,0,0.12);
    --md-sys-elevation-level3: 0px 4px 8px 3px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.28);

    --md-sys-state-hover-opacity: 0.08;
    --md-sys-state-focus-opacity: 0.12;

    --md-chart-series-0: var(--md-sys-color-primary);
    --md-chart-series-1: var(--md-sys-color-tertiary);
    --md-chart-series-2: var(--md-sys-color-secondary);
    --md-chart-series-3: var(--md-sys-color-error);
    --md-chart-series-4: var(--md-sys-color-on-surface-variant);

    --htmdx-bg: var(--md-sys-color-surface);
    --htmdx-ink: var(--md-sys-color-on-surface);
    --htmdx-body: var(--md-sys-color-on-surface-variant);
    --htmdx-soft: var(--md-sys-color-on-surface-variant);
    --htmdx-line: var(--md-sys-color-outline-variant);
    --htmdx-line-strong: var(--md-sys-color-outline);
    --htmdx-panel: var(--md-sys-color-surface-container);
    --htmdx-accent: var(--md-sys-color-primary);
    --htmdx-accent-soft: var(--md-sys-color-primary-container);
    --htmdx-accent-edge: var(--md-sys-color-primary-container);
    --htmdx-green: var(--md-sys-color-secondary);
    --htmdx-green-bg: var(--md-sys-color-secondary-container);
    --htmdx-amber: var(--md-sys-color-tertiary);
    --htmdx-amber-bg: var(--md-sys-color-tertiary-container);
    --htmdx-gray: var(--md-sys-color-on-surface-variant);
    --htmdx-gray-light: var(--md-sys-color-outline);
    --htmdx-gray-bg: var(--md-sys-color-surface-variant);
    --htmdx-red: var(--md-sys-color-error);
    --htmdx-red-bg: var(--md-sys-color-error-container);
    --htmdx-font: var(--md-ref-typeface-plain);
    --htmdx-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
  }
```

- [ ] **Step 2: Typecheck + tests**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run`
Expected: PASS (structure/classes unchanged; tokens are new but old rules still resolve through the shim).

- [ ] **Step 3: Commit**

```bash
git add packages/htmdx/src/index.ts
git commit -m "feat(htmdx): add M3 Expressive token layer with legacy shim"
```

---

### Task 2: Google Fonts injection

**Files:** Modify `packages/htmdx/src/index.ts` (add `FONTS_LINK_ID`, `injectFonts()`, call in `register()`). Test: `packages/htmdx/test/test.spec.ts`.

**Interfaces:** Produces a `<link id="htmdx-fonts">` appended once to `document.head` on `register()`, with preconnects to `fonts.googleapis.com` and `fonts.gstatic.com`.

- [ ] **Step 1: Write the failing test**

Add inside the `describe('htmdx', …)` block in `test/test.spec.ts`:

```ts
test('injects the Figtree + Roboto fonts stylesheet once on register', () => {
  register({ tailwind: false });
  register({ tailwind: false });
  const links = document.querySelectorAll('link#htmdx-fonts');
  expect(links.length).toBe(1);
  const href = links[0].getAttribute('href') ?? '';
  expect(href).toContain('Figtree');
  expect(href).toContain('Roboto');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @wix/htmdx test run -t "Figtree + Roboto fonts"`
Expected: FAIL — `links.length` is `0`.

- [ ] **Step 3: Add the constant**

Near `const STYLE_ID = 'htmdx-runtime-v1-styles';` add:

```ts
const FONTS_LINK_ID = 'htmdx-fonts';
```

- [ ] **Step 4: Add the injector**

Add next to `injectTailwindBrowser`:

```ts
function injectFonts() {
  if (!globalThis.document || document.getElementById(FONTS_LINK_ID)) {
    return;
  }

  const preconnectGstatic = document.createElement('link');
  preconnectGstatic.rel = 'preconnect';
  preconnectGstatic.href = 'https://fonts.gstatic.com';
  preconnectGstatic.crossOrigin = 'anonymous';
  document.head.append(preconnectGstatic);

  const preconnectApis = document.createElement('link');
  preconnectApis.rel = 'preconnect';
  preconnectApis.href = 'https://fonts.googleapis.com';
  document.head.append(preconnectApis);

  const fonts = document.createElement('link');
  fonts.id = FONTS_LINK_ID;
  fonts.rel = 'stylesheet';
  fonts.href =
    'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap';
  document.head.append(fonts);
}
```

- [ ] **Step 5: Call it in `register()`**

Immediately after the `if (!document.getElementById(STYLE_ID)) { … }` block, add:

```ts
  injectFonts();
```

- [ ] **Step 6: Run test + full suite + typecheck**

Run: `yarn workspace @wix/htmdx test run -t "Figtree + Roboto fonts"` (PASS), then `yarn workspace @wix/htmdx test run && yarn workspace @wix/htmdx typecheck` (PASS).

- [ ] **Step 7: Commit**

```bash
git add packages/htmdx/src/index.ts packages/htmdx/test/test.spec.ts
git commit -m "feat(htmdx): inject Figtree + Roboto web fonts on register"
```

---

### Task 3: Document shell rewrite (nav + hero + section cards)

Rewrite `renderDocument` so the emitted DOM is `.htmdx-app` = left `.htmdx-nav` + `.htmdx-content` (`.htmdx-hero` + `.htmdx-doc` of `.htmdx-doc-section`s). Group the rendered article HTML into per-`##` section cards and extract the lead paragraph into the hero. Retarget the scroll-spy to the nav.

**Files:** Modify `packages/htmdx/src/index.ts` (`renderDocument`, replace `renderToc` with `renderNav`, add `groupSections` + `renderHero`, update `activateSectionRail`). Test: `packages/htmdx/test/test.spec.ts`.

**Interfaces:**
- Consumes: `inline()` (already imported), `HtmdxHeading[]`, the `articleHtml` string built in `compile()`.
- Produces DOM contract used by later CSS tasks and the scroll-spy:
  - `<div class="htmdx-app">` (add class `htmdx-app--no-nav` when there is no nav)
  - `<nav class="htmdx-nav"><ol class="htmdx-nav-list"><li class="htmdx-nav-item"><a class="htmdx-nav-link" data-htmdx-target="ID">…</a></li></ol></nav>`
  - `<div class="htmdx-content"><header class="htmdx-hero"><h1 class="htmdx-hero-title">…</h1><p class="htmdx-hero-desc">…</p></header><main class="htmdx-doc">…</main></div>`
  - each section: `<section class="htmdx-doc-section"><h2 class="htmdx-doc-section-title" id="ID">…</h2><div class="htmdx-doc-section-card">…</div></section>`

- [ ] **Step 1: Update the failing shell tests + add new tests**

Replace the assertions in the existing "renders markdown and artifact components" test (currently `toContain('<article class="htmdx-article">')`) and the "keeps the section rail" test (currently checks `htmdx-masthead`/`htmdx-shell`/`htmdx-toc-link`) and add new grouping tests. In `test/test.spec.ts`:

Change the line:
```ts
    expect(rendered.ok && rendered.html).toContain('<article class="htmdx-article">');
```
to:
```ts
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-app">');
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-doc-section-card">');
```

Change the block:
```ts
    expect(rendered.ok && rendered.html).toContain('<header class="htmdx-masthead">');
    expect(rendered.ok && rendered.html).toContain('<div class="htmdx-shell">');
    expect(rendered.ok && rendered.html).toContain('class="htmdx-toc-link"');
    expect(rendered.ok && rendered.html).toContain('href="#executive-summary"');
    expect(rendered.ok && rendered.html).toContain('<h2 id="situation">Situation</h2>');
```
to:
```ts
    expect(rendered.ok && rendered.html).toContain('<nav class="htmdx-nav"');
    expect(rendered.ok && rendered.html).toContain('class="htmdx-nav-link"');
    expect(rendered.ok && rendered.html).toContain('href="#executive-summary"');
    expect(rendered.ok && rendered.html).toContain('<h2 class="htmdx-doc-section-title" id="situation">Situation</h2>');
```

Add two new tests inside the `describe`:
```ts
test('puts the title and lead paragraph in the hero, sections in cards', () => {
  const rendered = compile('# My Page\n\nLead paragraph here.\n\n## First\n\nBody one.\n\n## Second\n\nBody two.');
  expect(rendered.ok).toBe(true);
  const html = rendered.ok ? rendered.html : '';
  expect(html).toContain('<h1 class="htmdx-hero-title">My Page</h1>');
  expect(html).toContain('<p class="htmdx-hero-desc">Lead paragraph here.</p>');
  // two sections, each wrapped in a card, lead not duplicated inside a card
  expect(html.match(/htmdx-doc-section-card/g)?.length).toBe(2);
  expect(html.indexOf('Lead paragraph here.')).toBe(html.lastIndexOf('Lead paragraph here.'));
});

test('builds left-nav pill links from the sections', () => {
  const rendered = compile('# T\n\n## Alpha\n\nA.\n\n## Beta\n\nB.');
  const html = rendered.ok ? rendered.html : '';
  expect(html).toContain('<a class="htmdx-nav-link" href="#alpha" data-htmdx-target="alpha">Alpha</a>');
  expect(html).toContain('data-htmdx-target="beta"');
});
```

- [ ] **Step 2: Run to verify failures**

Run: `yarn workspace @wix/htmdx test run`
Expected: the edited + new tests FAIL (old markup still emitted).

- [ ] **Step 3: Replace `renderDocument` and `renderToc`**

Replace the existing `renderDocument(...)` and `renderToc(...)` functions with:

```ts
function renderDocument(title: string, articleHtml: string, headings: HtmdxHeading[]) {
  const { lead, sectionsHtml } = groupSections(articleHtml);
  const hero = renderHero(title, lead);
  const nav = renderNav(headings);
  const content = `<div class="htmdx-content">${hero}<main class="htmdx-doc">${sectionsHtml}</main></div>`;
  const appClass = nav ? 'htmdx-app' : 'htmdx-app htmdx-app--no-nav';
  return `<div class="${appClass}">${nav}${content}</div>`;
}

function renderHero(title: string, leadHtml: string) {
  if (!title && !leadHtml) {
    return '';
  }
  const titleHtml = title ? `<h1 class="htmdx-hero-title">${inline(title)}</h1>` : '';
  const descHtml = leadHtml ? leadHtml.replace('<p', '<p class="htmdx-hero-desc"') : '';
  return `<header class="htmdx-hero">${titleHtml}${descHtml}</header>`;
}

function renderNav(headings: HtmdxHeading[]) {
  if (headings.length < 2) {
    return '';
  }
  const items = headings
    .map(
      (heading) =>
        `<li class="htmdx-nav-item"><a class="htmdx-nav-link" href="#${heading.id}" data-htmdx-target="${heading.id}">${inline(heading.label)}</a></li>`,
    )
    .join('');
  return `<nav class="htmdx-nav" aria-label="Sections"><ol class="htmdx-nav-list">${items}</ol></nav>`;
}

// Split the renderer's own deterministic article HTML into per-<h2> section
// cards. h2 blocks are always emitted as `<h2 id="...">` at a block boundary,
// so splitting on the `<h2` marker is safe (this is our own output, not
// arbitrary HTML). The head chunk (before the first h2) yields the hero lead
// (first <p>, minus any leading <h1>); any head remainder becomes a
// title-less leading card.
function groupSections(articleHtml: string): { lead: string; sectionsHtml: string } {
  const parts = articleHtml.split(/(?=<h2\b)/);
  const head = parts[0] ?? '';
  const sectionChunks = parts.slice(1);

  const headNoH1 = head.replace(/^<h1\b[^>]*>[\s\S]*?<\/h1>/, '');
  const leadMatch = headNoH1.match(/<p\b[^>]*>[\s\S]*?<\/p>/);
  const lead = leadMatch ? leadMatch[0] : '';
  const headRemainder = leadMatch ? headNoH1.replace(leadMatch[0], '') : headNoH1;

  const sections: string[] = [];
  if (headRemainder.trim()) {
    sections.push(
      `<section class="htmdx-doc-section"><div class="htmdx-doc-section-card">${headRemainder}</div></section>`,
    );
  }
  for (const chunk of sectionChunks) {
    const match = chunk.match(/^(<h2\b[^>]*>[\s\S]*?<\/h2>)([\s\S]*)$/);
    if (!match) {
      sections.push(
        `<section class="htmdx-doc-section"><div class="htmdx-doc-section-card">${chunk}</div></section>`,
      );
      continue;
    }
    const heading = match[1].replace('<h2', '<h2 class="htmdx-doc-section-title"');
    sections.push(
      `<section class="htmdx-doc-section">${heading}<div class="htmdx-doc-section-card">${match[2]}</div></section>`,
    );
  }

  return { lead, sectionsHtml: sections.join('') };
}
```

- [ ] **Step 4: Retarget the scroll-spy**

In `activateSectionRail`, change the selector on line ~267 from:
```ts
    root.querySelectorAll<HTMLAnchorElement>('.htmdx-toc-link[data-htmdx-target]'),
```
to:
```ts
    root.querySelectorAll<HTMLAnchorElement>('.htmdx-nav-link[data-htmdx-target]'),
```
(The `link.parentElement?.classList.toggle('is-active', …)` logic is unchanged — the parent is now `.htmdx-nav-item`.)

- [ ] **Step 5: Update the scroll-spy click test selector**

In `test/test.spec.ts`, in the "scrolls TOC targets explicitly" test, change:
```ts
      '.htmdx-toc-link[data-htmdx-target="situation"]',
```
to:
```ts
      '.htmdx-nav-link[data-htmdx-target="situation"]',
```

- [ ] **Step 6: Run tests + typecheck**

Run: `yarn workspace @wix/htmdx test run && yarn workspace @wix/htmdx typecheck`
Expected: PASS (all edited + new tests green).

- [ ] **Step 7: Commit**

```bash
git add packages/htmdx/src/index.ts packages/htmdx/test/test.spec.ts
git commit -m "feat(htmdx): rewrite page shell to left-nav + hero + section cards"
```

---

### Task 4: Shell CSS (app grid, nav, hero, section cards) + base typography

Replace the old chrome rules (`.htmdx-masthead`, `.htmdx-shell`, `.htmdx-page`, `.htmdx-toc*`, `.htmdx-article*`) with the new shell CSS, and set base + inside-card typography.

**Files:** Modify `packages/htmdx/src/index.ts` — `RUNTIME_CSS`.

**Interfaces:** Consumes Task 1 tokens and the Task 3 DOM contract.

- [ ] **Step 1: Replace the `htmdx-code` base rule**

Replace the existing `htmdx-code { … }` rule with:

```css
  htmdx-code {
    display: block;
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-ref-typeface-plain);
    font-size: 16px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
  }

  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

- [ ] **Step 2: Replace the chrome block**

Replace everything from the `.htmdx-masthead { … }` rule through the end of the `.htmdx-article strong { … }` rule (the masthead, shell, page, toc, error, raw-source, component-header, and article-typography rules) with the following. Keep the `.htmdx-error` and `.htmdx-raw-source` rules (re-added below, restyled) — do not drop them.

```css
  .htmdx-app {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 100vh;
    background: var(--md-sys-color-surface);
  }
  .htmdx-app--no-nav { grid-template-columns: minmax(0, 1fr); }

  .htmdx-nav {
    position: sticky;
    top: 0;
    align-self: start;
    height: 100vh;
    overflow-y: auto;
    background: var(--md-sys-color-nav-surface);
    padding: 24px 12px;
    box-sizing: border-box;
  }
  .htmdx-nav-list { list-style: none; margin: 0; padding: 0; }
  .htmdx-nav-link {
    display: block;
    padding: 10px 16px;
    margin-bottom: 4px;
    border-radius: var(--md-sys-shape-corner-full);
    color: var(--md-sys-color-on-surface-variant);
    font-family: var(--md-ref-typeface-plain);
    font-size: 0.9375rem;
    font-weight: 600;
    text-decoration: none;
    line-height: 1.25;
  }
  .htmdx-nav-link:hover {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-nav-item.is-active .htmdx-nav-link {
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
  }

  .htmdx-content {
    max-width: 72rem;
    box-sizing: border-box;
    padding: 24px 32px 96px;
  }

  .htmdx-hero {
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 44px 48px;
    margin-bottom: 40px;
  }
  .htmdx-hero-title {
    margin: 0;
    font-family: var(--md-ref-typeface-brand);
    font-size: clamp(2.75rem, 6vw, 3.5rem);
    line-height: 1.08;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--md-sys-color-on-primary);
  }
  .htmdx-hero-desc {
    margin: 16px 0 0;
    max-width: 46rem;
    font-family: var(--md-ref-typeface-plain);
    font-size: 1.0625rem;
    line-height: 1.6;
    color: color-mix(in srgb, var(--md-sys-color-on-primary) 92%, transparent);
  }

  .htmdx-doc-section { margin-bottom: 48px; }
  .htmdx-doc-section:last-child { margin-bottom: 0; }
  .htmdx-doc-section-title {
    margin: 0 0 16px;
    font-family: var(--md-ref-typeface-brand);
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    scroll-margin-top: 24px;
  }
  .htmdx-doc-section-card {
    background: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 24px;
  }

  .htmdx-error {
    border: 1px solid var(--md-sys-color-error);
    background: var(--md-sys-color-error-container);
    color: var(--md-sys-color-on-error-container);
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: var(--md-sys-shape-corner-medium);
    font-weight: 700;
  }
  .htmdx-raw-source {
    white-space: pre-wrap;
    overflow-x: auto;
    background: var(--md-sys-color-surface-container-low);
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    padding: 14px;
    font-family: var(--md-ref-typeface-plain);
  }

  .htmdx-component-header { display: none; }
  section.htmdx-component { margin: 14px 0; }
  section.htmdx-component:first-child { margin-top: 0; }
  section.htmdx-component:last-child { margin-bottom: 0; }

  .htmdx-doc-section-card > h3,
  .htmdx-doc-section-card h3 {
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.375rem;
    line-height: 1.75rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
    margin: 20px 0 8px;
  }
  .htmdx-doc-section-card > p,
  .htmdx-doc-section-card > ul {
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 0 13px;
  }
  .htmdx-doc-section-card a { color: var(--md-sys-color-primary); text-underline-offset: 2px; }
  .htmdx-doc-section-card strong { font-weight: 700; color: var(--md-sys-color-on-surface); }
```

- [ ] **Step 3: Typecheck + tests**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run`
Expected: PASS.

- [ ] **Step 4: Visual check**

Open Storybook (`http://localhost:6006`) → `executive-decision-report` and `component-gallery` artifact stories. Confirm the sticky left nav, purple coast-to-coast hero, and per-section greyish cards (28px radius, 24px padding, auto height) render.

- [ ] **Step 5: Commit**

```bash
git add packages/htmdx/src/index.ts
git commit -m "feat(htmdx): Expressive shell CSS (nav, hero, section cards)"
```

---

### Task 5: Surface + metric components

**Files:** Modify `packages/htmdx/src/index.ts` — replace the `.htmdx-executive-summary` rules; add Card/Callout; replace the metric rules.

**Interfaces:** Consumes Task 1 tokens. Components sit inside the tinted section card, so use `surface-container-lowest` for contrast.

- [ ] **Step 1: Replace ExecutiveSummary + add Card/Callout**

Replace the existing `.htmdx-executive-summary …` block with, and add:

```css
  .htmdx-card .htmdx-component-body {
    background: var(--md-sys-color-surface-container-lowest);
    border-radius: var(--md-sys-shape-corner-large);
    box-shadow: var(--md-sys-elevation-level1);
    padding: 18px 22px;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-executive-summary .htmdx-component-body {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: 22px 26px;
  }
  .htmdx-executive-summary .htmdx-component-body p {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--md-sys-color-on-primary-container);
  }
  .htmdx-callout .htmdx-component-body {
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 18px 22px;
  }
  .htmdx-callout .htmdx-component-body p { margin: 0 0 8px; color: var(--md-sys-color-on-secondary-container); }
  .htmdx-callout .htmdx-component-body p:last-child { margin-bottom: 0; }
```

- [ ] **Step 2: Replace the metric rules**

Replace the block from `.htmdx-metric-strip .htmdx-component-body` through `.htmdx-metric-item:last-child .htmdx-metric-value` with:

```css
  .htmdx-metric-strip .htmdx-component-body,
  .htmdx-stat .htmdx-component-body {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-surface-container-lowest);
    overflow: hidden;
  }
  .htmdx-metric-grid { display: flex; flex-wrap: wrap; }
  .htmdx-metric-item {
    flex: 1 1 16%;
    padding: 18px 20px;
    border-right: 1px solid var(--md-sys-color-outline-variant);
  }
  .htmdx-metric-item:last-child { border-right: none; }
  .htmdx-metric-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--md-sys-color-on-surface-variant);
    margin-bottom: 8px;
  }
  .htmdx-metric-value {
    display: block;
    font-family: var(--md-ref-typeface-brand);
    font-size: 1.75rem;
    line-height: 2.25rem;
    font-weight: 500;
    letter-spacing: normal;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-metric-item:last-child .htmdx-metric-value { color: var(--md-sys-color-primary); }
```

- [ ] **Step 3: Typecheck + tests + visual**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run` (PASS). In Storybook check `Card`, `ExecutiveSummary`, `Callout`, `MetricStrip`, `Stat`.

- [ ] **Step 4: Commit**

```bash
git add packages/htmdx/src/index.ts
git commit -m "feat(htmdx): Expressive surfaces for Card/ExecutiveSummary/Callout/metrics"
```

---

### Task 6: List/compare components, RiskTable chips, tables

**Files:** Modify `packages/htmdx/src/index.ts`.

**Interfaces:** `.htmdx-feature-*` classes are shared by Finding, Compare, RiskTable, Timeline. **Only** touch the rules named below; keep the structural `.htmdx-risk-table .htmdx-feature-item { display: grid; … }` and any `:last-child` reset intact.

- [ ] **Step 1: Finding + shared feature title/text**

Replace the `.htmdx-finding …`, `.htmdx-feature-title`, `.htmdx-feature-text` rules (preserve the shared grid + last-child rules that also list `.htmdx-risk-table`):

```css
  .htmdx-finding .htmdx-feature-grid,
  .htmdx-risk-table .htmdx-feature-grid { display: block; }
  .htmdx-finding .htmdx-feature-item { position: relative; padding: 10px 0 10px 22px; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
  .htmdx-finding .htmdx-feature-item:last-child,
  .htmdx-risk-table .htmdx-feature-item:last-child { border-bottom: none; }
  .htmdx-finding .htmdx-feature-item::before {
    content: "";
    position: absolute;
    left: 2px;
    top: 18px;
    width: 7px;
    height: 7px;
    background: var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
  }
  .htmdx-feature-title { display: block; font-weight: 700; color: var(--md-sys-color-on-surface); }
  .htmdx-feature-text { display: block; color: var(--md-sys-color-on-surface-variant); }
```

- [ ] **Step 2: Compare + Evidence + SourceQuote**

```css
  .htmdx-compare .htmdx-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .htmdx-compare .htmdx-feature-item {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px 18px;
    background: var(--md-sys-color-surface-container-lowest);
  }
  .htmdx-compare .htmdx-feature-title { margin-bottom: 4px; }
  .htmdx-compare .htmdx-feature-text { font-size: 0.9375rem; }

  .htmdx-evidence .htmdx-component-body {
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-surface-container-lowest);
    padding: 16px 18px;
    color: var(--md-sys-color-on-surface-variant);
  }

  .htmdx-source-quote .htmdx-component-body p {
    font-size: 0.9375rem;
    color: var(--md-sys-color-on-surface-variant);
    border-left: 3px solid var(--md-sys-color-primary);
    padding-left: 16px;
    margin: 6px 0;
    line-height: 1.55;
  }
```

- [ ] **Step 3: RiskTable chips**

Replace the `.htmdx-risk-table .htmdx-feature-title` rule and the four `[data-tier]` rules:

```css
  .htmdx-risk-table .htmdx-feature-title {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: var(--md-sys-shape-corner-full);
    text-align: center;
    align-self: start;
  }
  .htmdx-risk-table .htmdx-feature-item[data-tier="must-have"] .htmdx-feature-title { background: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="differentiator"] .htmdx-feature-title { background: var(--md-sys-color-tertiary-container); color: var(--md-sys-color-on-tertiary-container); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="not-now"] .htmdx-feature-title { background: var(--md-sys-color-surface-variant); color: var(--md-sys-color-on-surface-variant); }
  .htmdx-risk-table .htmdx-feature-item[data-tier="wont-do"] .htmdx-feature-title { background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); }
```

- [ ] **Step 4: Tables**

Replace the `.htmdx-article thead th` / `tbody th` / `tbody td` / hover rules. Note the selectors change from `.htmdx-article` to `.htmdx-doc-section-card` (tables now live inside cards):

```css
  .htmdx-doc-section-card table { width: 100%; border-collapse: collapse; font-size: 0.9375rem; margin: 6px 0; }
  .htmdx-doc-section-card thead th {
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--md-sys-color-on-surface-variant);
    background: var(--md-sys-color-surface-container-high);
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline);
    white-space: nowrap;
  }
  .htmdx-doc-section-card tbody th {
    width: 30%;
    text-align: left;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--md-sys-color-on-surface-variant);
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    border-right: 1px solid var(--md-sys-color-outline-variant);
    vertical-align: top;
  }
  .htmdx-doc-section-card tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--md-sys-color-outline-variant);
    text-align: left;
    vertical-align: top;
    color: var(--md-sys-color-on-surface);
  }
  .htmdx-doc-section-card tbody tr:last-child td,
  .htmdx-doc-section-card tbody tr:last-child th { border-bottom: none; }
  .htmdx-doc-section-card tbody tr:hover td,
  .htmdx-doc-section-card tbody tr:hover th {
    background: color-mix(in srgb, var(--md-sys-color-primary) calc(var(--md-sys-state-hover-opacity) * 100%), transparent);
  }
```

- [ ] **Step 5: Typecheck + tests + visual**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run` (PASS). Check `Finding`, `Compare`, `Evidence`, `SourceQuote`, `RiskTable`, `DataTable`, `DecisionTable` in Storybook.

- [ ] **Step 6: Commit**

```bash
git add packages/htmdx/src/index.ts
git commit -m "feat(htmdx): Expressive list/compare, RiskTable chips, tables"
```

---

### Task 7: Charts — series colors

Add `data-series` to chart bars (this branch has no such attribute yet) and color bars from the series tokens.

**Files:** Modify `packages/htmdx/src/components/rendering.ts` and `packages/htmdx/src/index.ts`. Test: `packages/htmdx/test/test.spec.ts`.

**Interfaces:** each `<rect class="htmdx-chart-bar">` gains `data-series="<index mod 5>"`; `renderBarChartContent` signature unchanged.

- [ ] **Step 1: Write the failing test**

```ts
test('bar chart tags each bar with a cycling data-series index', () => {
  const rendered = compile('<ChartBar>\n- A: 1\n- B: 2\n- C: 3\n</ChartBar>');
  const html = rendered.ok ? rendered.html : '';
  expect(html).toContain('data-series="0"');
  expect(html).toContain('data-series="1"');
  expect(html).toContain('data-series="2"');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `yarn workspace @wix/htmdx test run -t "cycling data-series"`
Expected: FAIL.

- [ ] **Step 3: Add the attribute in `renderBarChartContent`**

In `rendering.ts`, change the `<rect …>` opening tag (right after `class="htmdx-chart-bar"`) to include `data-series="${index % 5}"`:

```ts
        <rect class="htmdx-chart-bar" data-series="${index % 5}" x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7">
```

- [ ] **Step 4: Run to verify it passes**

Run: `yarn workspace @wix/htmdx test run -t "cycling data-series"`
Expected: PASS.

- [ ] **Step 5: Replace the chart CSS**

In `index.ts`, replace the `.htmdx-chart …` rules with:

```css
  .htmdx-chart svg { width: 100%; height: auto; max-height: 240px; }
  .htmdx-chart-bar { fill: var(--md-chart-series-0); }
  .htmdx-chart-bar[data-series="1"] { fill: var(--md-chart-series-1); }
  .htmdx-chart-bar[data-series="2"] { fill: var(--md-chart-series-2); }
  .htmdx-chart-bar[data-series="3"] { fill: var(--md-chart-series-3); }
  .htmdx-chart-bar[data-series="4"] { fill: var(--md-chart-series-4); }
  .htmdx-chart-axis { stroke: var(--md-sys-color-outline-variant); }
  .htmdx-chart-label { fill: var(--md-sys-color-on-surface-variant); font-size: 11px; font-family: var(--md-ref-typeface-plain); }
```

- [ ] **Step 6: Typecheck + full tests + visual**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run` (PASS). Check `ChartBar/ChartLine/ChartArea/ChartPie` in Storybook.

- [ ] **Step 7: Commit**

```bash
git add packages/htmdx/src/index.ts packages/htmdx/src/components/rendering.ts packages/htmdx/test/test.spec.ts
git commit -m "feat(htmdx): Expressive chart series colors"
```

---

### Task 8: Timeline, responsive, final verification

**Files:** Modify `packages/htmdx/src/index.ts` (Timeline rules + responsive media queries). Verification only otherwise.

- [ ] **Step 1: Add Timeline rules**

```css
  .htmdx-timeline .htmdx-feature-grid { display: block; border-left: 2px solid var(--md-sys-color-primary); margin-left: 6px; }
  .htmdx-timeline .htmdx-feature-item { position: relative; padding: 8px 0 16px 22px; }
  .htmdx-timeline .htmdx-feature-item::before {
    content: "";
    position: absolute;
    left: -7px;
    top: 12px;
    width: 12px;
    height: 12px;
    background: var(--md-sys-color-surface-container-lowest);
    border: 2px solid var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-full);
  }
  .htmdx-timeline .htmdx-feature-title { color: var(--md-sys-color-on-surface); }
  .htmdx-timeline .htmdx-feature-text { color: var(--md-sys-color-on-surface-variant); }
```

- [ ] **Step 2: Add responsive media queries**

Add near the end of `RUNTIME_CSS`:

```css
  @media (max-width: 960px) {
    .htmdx-app { grid-template-columns: minmax(0, 1fr); }
    .htmdx-nav { display: none; }
    .htmdx-content { padding: 16px 20px 64px; }
    .htmdx-hero { padding: 32px 28px; border-radius: var(--md-sys-shape-corner-large); }
  }
  @media (max-width: 720px) {
    .htmdx-hero-title { font-size: 2.5rem; }
    .htmdx-doc-section-card { padding: 16px; }
    .htmdx-compare .htmdx-feature-grid { grid-template-columns: 1fr; }
    .htmdx-metric-item { flex-basis: 50%; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
  }
```

- [ ] **Step 3: Timeline visual + tests**

Run: `yarn workspace @wix/htmdx typecheck && yarn workspace @wix/htmdx test run` (PASS). Check `Timeline` in Storybook, and resize the window to confirm the nav collapses ≤960px.

- [ ] **Step 4: Commit**

```bash
git add packages/htmdx/src/index.ts
git commit -m "feat(htmdx): Expressive Timeline + responsive layout"
```

- [ ] **Step 5: Final verification sweep**

Run each and confirm clean:
- `yarn workspace @wix/htmdx lint`
- `yarn workspace @wix/htmdx fmt:check` (if it fails, run `yarn workspace @wix/htmdx fmt` and re-check)
- `yarn workspace @wix/htmdx typecheck`
- `yarn workspace @wix/htmdx test run`
- `yarn workspace @wix/htmdx build`

- [ ] **Step 6: Storybook visual sweep**

Open `http://localhost:6006` and step through every built-in component story plus the `component-gallery` and `executive-decision-report` artifact stories. Confirm: sticky left nav with active pill, purple coast-to-coast hero (title + lead), per-section greyish cards (28px radius, 24px padding, auto height), Expressive type/radii/colors, and no broken layout. Fix any regression in the owning task's rules and re-commit.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "chore(htmdx): final Expressive verification fixes"
```
(Skip if Steps 5–6 were clean.)

---

## Self-Review

**Spec coverage:**
- §1 tokens → Task 1. ✅ (colors, type families, shape, elevation, state, series, shim)
- §1.2 type scale applied → Tasks 4 (hero/section/base), 5 (metric values). ✅
- §2 document shell (nav + hero + section cards, lead extraction, grouping, scroll-spy) → Task 3. ✅
- §3 layout & shell CSS → Task 4; component mapping → Tasks 5–8. ✅
- §4 font injection → Task 2. ✅
- §5 responsive → Task 8. ✅
- §7 verification → per-task + Task 8 sweep; shell tests updated in Task 3. ✅

**Placeholder scan:** every code step contains the actual CSS/TS to write; no TBD/TODO.

**Type consistency:** DOM contract from Task 3 (`htmdx-app`, `htmdx-nav`/`htmdx-nav-link`/`htmdx-nav-item`, `htmdx-hero`/`htmdx-hero-title`/`htmdx-hero-desc`, `htmdx-doc`/`htmdx-doc-section`/`htmdx-doc-section-title`/`htmdx-doc-section-card`) matches the CSS selectors in Task 4 and the scroll-spy selector `.htmdx-nav-link` (Task 3 Step 4). `data-series="${index % 5}"` (Task 7) matches its test and the `--md-chart-series-0..4` tokens (Task 1). Table selectors moved to `.htmdx-doc-section-card` (Task 6 Step 4) consistent with the section-card wrapper.

**Note on grouping approach:** Task 3 splits the renderer's own deterministic article HTML at `<h2` markers rather than refactoring `rendering.ts` to emit block arrays. This is the pragmatic realization of spec §2.2's per-section grouping requirement — the markup being split is fully controlled by this codebase (`<h2 id="…">` is always emitted at a block boundary), not arbitrary HTML.
