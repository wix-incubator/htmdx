# Color Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable color themes (purple default, plus blue/green/teal/amber) that keep the library identical except for hue, driven per-artifact by frontmatter and previewable via a Storybook toolbar.

**Architecture:** A theme is an alternate set of `--md-sys-color-*` token values scoped by a `[data-htmdx-theme="<id>"]` attribute stamped on the `.htmdx-app` wrapper. Non-default themes are generated offline from the purple palette by rotating each token's HCT hue by a fixed per-theme delta (keeping tone + chroma → identical DNA) and committed as static CSS in `src/themes.ts`. The runtime injects that CSS and reads the theme from frontmatter.

**Tech Stack:** TypeScript, Rollup, Vitest, Storybook (web-components-vite), `@material/material-color-utilities` (dev-only, for generation).

## Global Constraints

- Runtime bundle stays dependency-free — the color library is a **devDependency**, used only by the offline generator; its output is baked static CSS.
- Purple ships unchanged: default output (no `theme:` / unknown theme) must be byte-identical to today (no `data-htmdx-theme` attribute).
- All color values are Material 3 `--md-sys-color-*` tokens; a theme overrides only the hex tokens, never the `var()`-based aliases (chart series, `--htmdx-*`).
- `error` family tokens (`error`, `on-error`, `error-container`, `on-error-container`) stay red across all themes (not hue-rotated).
- Theme ids: `purple` (default), `blue`, `green`, `teal`, `amber`.
- Contrast bar: WCAG AA — 4.5:1 normal text, 3:1 large text / non-text UI.
- After any change to `src/index.ts` or `src/themes.ts`, rebuild with `yarn build:library` before manual browser checks.

---

### Task 1: Tokenize the two hard-coded nav-active literals

The active nav item uses hard-coded `#DCDAF7` (background) and `#24172C` (text). These won't re-hue. Promote them to tokens so themes can rotate them.

**Files:**
- Modify: `packages/htmdx/src/index.ts` (the `:root` token block, and the `.htmdx-nav-item.is-active .htmdx-nav-link` rule)
- Test: `packages/htmdx/test/test.spec.ts`

**Interfaces:**
- Produces: two new tokens `--md-sys-color-nav-active-container` (`#DCDAF7`) and `--md-sys-color-on-nav-active-container` (`#24172C`) in the `:root` block. Task 2's generator will pick these up automatically.

- [ ] **Step 1: Write the failing test**

Add to `packages/htmdx/test/test.spec.ts` inside the top-level `describe('htmdx', ...)`:

```ts
test('nav-active colors are tokenized, not hard-coded literals', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  expect(src).toContain('--md-sys-color-nav-active-container: #DCDAF7;');
  expect(src).toContain('--md-sys-color-on-nav-active-container: #24172C;');
  // The nav rule must reference the tokens, not the raw hex.
  const navRule = src.slice(
    src.indexOf('.htmdx-nav-item.is-active .htmdx-nav-link'),
    src.indexOf('.htmdx-nav-item.is-active .htmdx-nav-link') + 200,
  );
  expect(navRule).toContain('var(--md-sys-color-nav-active-container)');
  expect(navRule).toContain('var(--md-sys-color-on-nav-active-container)');
  expect(navRule).not.toMatch(/#DCDAF7|#24172C/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/htmdx && yarn test --run test/test.spec.ts -t "nav-active colors are tokenized"`
Expected: FAIL (tokens not present yet).

- [ ] **Step 3: Add the tokens**

In `packages/htmdx/src/index.ts`, in the `:root` block, immediately after the `--md-sys-color-nav-surface: #F3ECEE;` line add:

```
    --md-sys-color-nav-active-container: #DCDAF7;
    --md-sys-color-on-nav-active-container: #24172C;
```

- [ ] **Step 4: Reference the tokens in the nav rule**

Replace the existing rule:

```css
  .htmdx-nav-item.is-active .htmdx-nav-link {
    background: #DCDAF7;
    color: #24172C;
  }
```

with:

```css
  .htmdx-nav-item.is-active .htmdx-nav-link {
    background: var(--md-sys-color-nav-active-container);
    color: var(--md-sys-color-on-nav-active-container);
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/htmdx && yarn test --run test/test.spec.ts -t "nav-active colors are tokenized"`
Expected: PASS

- [ ] **Step 6: Rebuild and commit**

```bash
cd packages/htmdx && yarn build:library
cd ../.. && git add packages/htmdx/src/index.ts packages/htmdx/test/test.spec.ts
git commit -m "feat(htmdx): tokenize nav-active colors for theming"
```

---

### Task 2: Theme generator + generated `themes.ts`

Add the offline generator and commit its output. The generator parses the purple `:root` tokens, and for each theme rotates every token's HCT hue by a fixed delta (keeping tone + chroma), leaving the error family untouched.

**Files:**
- Modify: `packages/htmdx/package.json` (devDependency)
- Create: `packages/htmdx/scripts/generate-themes.mjs`
- Create: `packages/htmdx/src/themes.ts` (generated, committed)
- Test: `packages/htmdx/test/themes.spec.ts`

**Interfaces:**
- Produces: `src/themes.ts` exporting `THEME_IDS` (`readonly ['purple','blue','green','teal','amber']`), `HtmdxThemeId` (union type), and `THEME_CSS` (string of `[data-htmdx-theme="<id>"] { … }` blocks for blue/green/teal/amber). Consumed by Task 3.

- [ ] **Step 1: Add the dev dependency**

```bash
yarn workspace @wix/htmdx add -D @material/material-color-utilities
```
Expected: package added under `devDependencies` in `packages/htmdx/package.json`.

- [ ] **Step 2: Write the generator**

Create `packages/htmdx/scripts/generate-themes.mjs`:

```js
// Offline generator: rotates the purple palette to each theme's hue in HCT,
// keeping tone + chroma so every theme shares the same DNA. Output is committed
// to src/themes.ts. Re-run with: node scripts/generate-themes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Hct, argbFromHex, hexFromArgb } from '@material/material-color-utilities';

const indexPath = fileURLToPath(new URL('../src/index.ts', import.meta.url));
const outPath = fileURLToPath(new URL('../src/themes.ts', import.meta.url));

// Themes are defined by a hue only; the seed hex's HCT hue is all that is used
// (tone + chroma always come from the purple token being rotated). Tune these
// hexes during review to hit the target look and the contrast bar.
const SEEDS = {
  blue: '#2F55D4',
  green: '#1F8A4C',
  teal: '#0E8C82',
  amber: '#C77A00',
};

// Tokens kept identical across themes (semantic red must stay red).
const KEEP = new Set([
  'md-sys-color-error',
  'md-sys-color-on-error',
  'md-sys-color-error-container',
  'md-sys-color-on-error-container',
  'md-sys-color-shadow',
]);

function parsePurpleTokens(src) {
  const rootStart = src.indexOf(':root {');
  const rootEnd = src.indexOf('}', rootStart);
  const block = src.slice(rootStart, rootEnd);
  const tokens = [];
  const re = /--(md-sys-color-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g;
  let m;
  while ((m = re.exec(block))) {
    tokens.push({ name: m[1], hex: m[2] });
  }
  return tokens;
}

function rotate(hex, delta) {
  const hct = Hct.fromInt(argbFromHex(hex));
  const rotated = Hct.from((hct.hue + delta + 360) % 360, hct.chroma, hct.tone);
  return hexFromArgb(rotated.toInt()).toUpperCase();
}

const src = readFileSync(indexPath, 'utf8');
const purple = parsePurpleTokens(src);
const purplePrimary = purple.find((t) => t.name === 'md-sys-color-primary');
const purpleHue = Hct.fromInt(argbFromHex(purplePrimary.hex)).hue;

const blocks = Object.entries(SEEDS).map(([id, seed]) => {
  const delta = Hct.fromInt(argbFromHex(seed)).hue - purpleHue;
  const lines = purple.map((t) => {
    const value = KEEP.has(t.name) ? t.hex : rotate(t.hex, delta);
    return `    --${t.name}: ${value};`;
  });
  return `  [data-htmdx-theme="${id}"] {\n${lines.join('\n')}\n  }`;
});

const out = `// GENERATED by scripts/generate-themes.mjs — do not edit by hand.
// Regenerate: node scripts/generate-themes.mjs
export const THEME_IDS = ['purple', 'blue', 'green', 'teal', 'amber'] as const;
export type HtmdxThemeId = (typeof THEME_IDS)[number];

export const THEME_CSS = \`
${blocks.join('\n')}
\`;
`;

writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${purple.length} tokens x ${blocks.length} themes)`);
```

- [ ] **Step 3: Run the generator**

Run: `cd packages/htmdx && node scripts/generate-themes.mjs && yarn fmt`
Expected: prints `Wrote …/src/themes.ts (N tokens x 4 themes)` and formats the file. `src/themes.ts` now exists with four theme blocks.

- [ ] **Step 4: Write the parity + drift test**

Create `packages/htmdx/test/themes.spec.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { THEME_CSS, THEME_IDS } from '../src/themes';

function tokenNames(css: string): string[] {
  return [...css.matchAll(/--(md-sys-color-[a-z0-9-]+):/g)].map((m) => m[1]).sort();
}

function readIndexSource(): string {
  // Vite (Vitest) rewrites `new URL('…', import.meta.url)` into an asset URL,
  // so read via a path derived from import.meta.url instead.
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/index.ts'), 'utf8');
}

function purpleTokenNames(): string[] {
  const src = readIndexSource();
  const root = src.slice(src.indexOf(':root {'), src.indexOf('}', src.indexOf(':root {')));
  return [...root.matchAll(/--(md-sys-color-[a-z0-9-]+):\s*#[0-9A-Fa-f]{6}\s*;/g)]
    .map((m) => m[1])
    .sort();
}

describe('themes', () => {
  const generated = THEME_IDS.filter((id) => id !== 'purple');

  test('each generated theme defines the full purple token set', () => {
    const expected = purpleTokenNames();
    for (const id of generated) {
      const block = THEME_CSS.slice(
        THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`),
        THEME_CSS.indexOf('}', THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`)),
      );
      expect(tokenNames(block)).toEqual(expected);
    }
  });

  test('error family stays red (unchanged from purple)', () => {
    const purpleError = readIndexSource().match(/--md-sys-color-error:\s*(#[0-9A-Fa-f]{6})/)?.[1];
    for (const id of generated) {
      const block = THEME_CSS.slice(THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`));
      expect(block).toContain(`--md-sys-color-error: ${purpleError};`);
    }
  });
});
```

- [ ] **Step 5: Run the test**

Run: `cd packages/htmdx && yarn test --run test/themes.spec.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
cd ../.. && git add packages/htmdx/package.json packages/htmdx/scripts/generate-themes.mjs packages/htmdx/src/themes.ts packages/htmdx/test/themes.spec.ts yarn.lock
git commit -m "feat(htmdx): generate blue/green/teal/amber theme palettes"
```

---

### Task 3: Inject theme CSS and stamp the theme attribute

Wire the generated CSS into the injected `<style>`, and have `renderDocument` stamp `data-htmdx-theme` from frontmatter.

**Files:**
- Modify: `packages/htmdx/src/index.ts` (import from `./themes`, inject in `register`, stamp in `renderDocument`)
- Test: `packages/htmdx/test/test.spec.ts`

**Interfaces:**
- Consumes: `THEME_CSS`, `THEME_IDS` from `./themes` (Task 2).
- Produces: rendered `.htmdx-app` carries `data-htmdx-theme="<id>"` for known non-purple themes; nothing for purple/absent/unknown.

- [ ] **Step 1: Write the failing tests**

Add to `packages/htmdx/test/test.spec.ts` inside `describe('htmdx', ...)`:

```ts
test('frontmatter theme stamps data-htmdx-theme on the app root', () => {
  const rendered = compile(`---
theme: blue
---

# Title

## One

Body.`);
  expect(rendered.ok && rendered.html).toContain('data-htmdx-theme="blue"');
});

test('absent or unknown theme adds no attribute (purple default)', () => {
  const none = compile(`# Title\n\n## One\n\nBody.`);
  expect(none.ok && none.html).not.toContain('data-htmdx-theme');

  const unknown = compile(`---\ntheme: chartreuse\n---\n\n# Title\n\n## One\n\nBody.`);
  expect(unknown.ok && unknown.html).not.toContain('data-htmdx-theme');

  const purple = compile(`---\ntheme: purple\n---\n\n# Title\n\n## One\n\nBody.`);
  expect(purple.ok && purple.html).not.toContain('data-htmdx-theme');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/htmdx && yarn test --run test/test.spec.ts -t "data-htmdx-theme"`
Expected: FAIL (attribute never stamped).

- [ ] **Step 3: Import the theme module**

At the top of `packages/htmdx/src/index.ts`, with the other imports, add:

```ts
import { THEME_CSS, THEME_IDS } from './themes';
```

- [ ] **Step 4: Inject the theme CSS**

In `register`, change the style injection from:

```ts
    style.textContent = RUNTIME_CSS;
```

to:

```ts
    style.textContent = RUNTIME_CSS + THEME_CSS;
```

- [ ] **Step 5: Stamp the attribute in `renderDocument`**

In `renderDocument`, replace:

```ts
  const appClass = nav ? 'htmdx-app' : 'htmdx-app htmdx-app--no-nav';
  return `<div class="${appClass}">${nav}${content}</div>`;
```

with:

```ts
  const appClass = nav ? 'htmdx-app' : 'htmdx-app htmdx-app--no-nav';
  const theme = meta.theme;
  const themeAttr =
    theme && theme !== 'purple' && (THEME_IDS as readonly string[]).includes(theme)
      ? ` data-htmdx-theme="${theme}"`
      : '';
  return `<div class="${appClass}"${themeAttr}>${nav}${content}</div>`;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/htmdx && yarn test --run test/test.spec.ts -t "data-htmdx-theme"`
Expected: PASS. Also run the full file to confirm no regression: `yarn test --run test/test.spec.ts` → all PASS (the existing `htmdx-app` regex test still matches because default output is unchanged).

- [ ] **Step 7: Rebuild and commit**

```bash
cd packages/htmdx && yarn build:library
cd ../.. && git add packages/htmdx/src/index.ts packages/htmdx/test/test.spec.ts
git commit -m "feat(htmdx): apply theme from frontmatter and inject theme CSS"
```

---

### Task 4: Contrast (accessibility) test

Prove every generated theme meets the WCAG AA bar on the key foreground/background pairs.

**Files:**
- Modify: `packages/htmdx/test/themes.spec.ts`

**Interfaces:**
- Consumes: `THEME_CSS`, `THEME_IDS` from `./themes`.

- [ ] **Step 1: Write the failing test**

Add to `packages/htmdx/test/themes.spec.ts` inside `describe('themes', ...)`:

```ts
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

function themeTokens(id: string): Record<string, string> {
  const start = THEME_CSS.indexOf(`[data-htmdx-theme="${id}"]`);
  const block = THEME_CSS.slice(start, THEME_CSS.indexOf('}', start));
  const map: Record<string, string> = {};
  for (const m of block.matchAll(/--(md-sys-color-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

test('generated themes meet WCAG AA on key pairs', () => {
  const textPairs: [string, string][] = [
    ['md-sys-color-on-surface', 'md-sys-color-surface'],
    ['md-sys-color-on-primary', 'md-sys-color-primary'],
    ['md-sys-color-on-primary-container', 'md-sys-color-primary-container'],
    ['md-sys-color-on-secondary-container', 'md-sys-color-secondary-container'],
    ['md-sys-color-on-nav-active-container', 'md-sys-color-nav-active-container'],
  ];
  for (const id of generated) {
    const t = themeTokens(id);
    for (const [fg, bg] of textPairs) {
      expect(contrast(t[fg], t[bg]), `${id}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    // Non-text UI: outline against the page surface.
    expect(
      contrast(t['md-sys-color-outline'], t['md-sys-color-surface']),
      `${id}: outline on surface`,
    ).toBeGreaterThanOrEqual(3);
  }
});
```

- [ ] **Step 2: Run the test**

Run: `cd packages/htmdx && yarn test --run test/themes.spec.ts -t "WCAG AA"`
Expected: PASS. If a hue (likely `amber`) fails, adjust its seed hue in `scripts/generate-themes.mjs` `SEEDS`, re-run `node scripts/generate-themes.mjs && yarn fmt`, and re-run the test until green. Record the final seeds.

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add packages/htmdx/test/themes.spec.ts packages/htmdx/src/themes.ts packages/htmdx/scripts/generate-themes.mjs
git commit -m "test(htmdx): assert WCAG AA contrast across generated themes"
```

---

### Task 5: Storybook theme toolbar

Add a toolbar dropdown that previews any theme live, overriding the artifact's frontmatter theme.

**Files:**
- Modify: `packages/htmdx/.storybook/preview.ts`

**Interfaces:**
- Consumes: the `htmdx:rendered` event the runtime dispatches on the host, and the `.htmdx-app` element inside it.

- [ ] **Step 1: Add the global toolbar + decorator**

Replace the contents of `packages/htmdx/.storybook/preview.ts` with:

```ts
import type { Preview } from '@storybook/web-components-vite';

const THEME_IDS = ['purple', 'blue', 'green', 'teal', 'amber'];

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'htmdx color theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: THEME_IDS,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'purple' },
  decorators: [
    (story, context) => {
      const theme = (context.globals.theme as string) || 'purple';
      const el = story() as HTMLElement;
      const apply = () => {
        const app = el.querySelector?.('.htmdx-app');
        if (app) app.setAttribute('data-htmdx-theme', theme);
      };
      // The runtime stamps the frontmatter theme during render; re-apply the
      // toolbar choice afterwards so the dropdown always wins in preview.
      el.addEventListener?.('htmdx:rendered', apply);
      queueMicrotask(apply);
      return el;
    },
  ],
  parameters: {
    viewport: {
      options: {
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        mobile: { name: 'Mobile', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
};

export default preview;
```

- [ ] **Step 2: Verify in Storybook (manual)**

Run: `cd packages/htmdx && yarn storybook`
Open any artifact story (e.g. Component Gallery). Use the **Theme** dropdown in the toolbar → switch to `blue`, `green`, `teal`, `amber`, `purple`. Expected: the whole artifact re-hues; purple matches current look; contrast stays readable in every theme.

- [ ] **Step 3: Commit**

```bash
cd ../.. && git add packages/htmdx/.storybook/preview.ts
git commit -m "feat(htmdx): Storybook toolbar to preview color themes"
```

---

### Task 6: Document theming and set the example artifact

Document the `theme:` frontmatter and demonstrate it.

**Files:**
- Modify: `README.md`
- Modify: `packages/htmdx/src/artifacts/product-strategy.html`

**Interfaces:** none (docs + example).

- [ ] **Step 1: Document the feature in the README**

In `README.md`, after the "Exact-version component manifest" section, add:

```markdown
## Color themes

Artifacts render in the default **purple** theme. To render in another built-in
theme, add a `theme:` field to the HTMDX frontmatter:

```mdx
---
theme: blue
---

# Title
```

Built-in themes: `purple` (default), `blue`, `green`, `teal`, `amber`. Every
theme shares the same design DNA — identical tone, contrast, and saturation,
rotated to a different hue. Unknown or omitted values fall back to purple.

Palettes are generated offline from the purple palette; regenerate with
`node scripts/generate-themes.mjs` after editing the seeds.
```

- [ ] **Step 2: Set the example artifact's theme explicitly**

In `packages/htmdx/src/artifacts/product-strategy.html`, change the frontmatter from:

```
---
project: SEO Settings
---
```

to:

```
---
project: SEO Settings
theme: purple
---
```

(Purple is the default, so output is unchanged — this documents the field in a real artifact.)

- [ ] **Step 3: Verify the artifact still renders**

Run: `cd packages/htmdx && yarn build:library`
Then reload the standalone page (served from the repo) at `src/artifacts/product-strategy.html`. Expected: unchanged purple render.

- [ ] **Step 4: Commit**

```bash
cd ../.. && git add README.md packages/htmdx/src/artifacts/product-strategy.html
git commit -m "docs(htmdx): document color themes and set example artifact theme"
```

---

## Notes for the implementer

- Run the full suite once at the end: `cd packages/htmdx && yarn test` → expect all green.
- The generator's `SEEDS` are hue pickers only (tone + chroma always come from purple). If a theme looks off or fails contrast, adjust the seed hue, regenerate, re-run tests.
- Do not hand-edit `src/themes.ts` — it is generated. Change `scripts/generate-themes.mjs` and regenerate.
