# htmdx

`@wix/htmdx` creates rich HTML artifacts that humans review and agents edit.

- **One portable file:** Source and browser-facing artifact stay together.
- **No build step:** The browser renders HTMDX in place, with no generated output to keep in sync.
- **Human- and agent-readable:** Edit Markdown, component tags, and Tailwind classes instead of generated markup.
- **Token-efficient:** Benchmarks show 2–3× fewer tokens than hand-written HTML with Tailwind.
- **Rich by default:** Use interactive components, themes, charts, and structured report elements.
- **Safe by design:** Source cannot contain imports, JavaScript expressions, or function-valued props.

**Examples:** [index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [blank canvas](https://wix-incubator.github.io/htmdx/blank-layout.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/). View any example's source to see what an agent edits.

## One file, two audiences

<!-- x-release-please-start-version -->

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.10.0/dist/browser.js" defer></script>
  </head>
  <body>
    <!-- prettier-ignore -->
    <script type="text/htmdx" data-htmdx-edit-instruction="Edit only this script content. HTMDX format.">
# Q3 Report

<ExecutiveSummary>
The HTML is viewable as-is. Agents edit only this source block.
</ExecutiveSummary>

<Card class="max-w-xl border-l-4 border-l-teal-500 shadow-lg">
  <CardHeader class="flex-row items-center justify-between">
    <CardTitle>Revenue</CardTitle>
    <Badge variant="secondary">audited</Badge>
  </CardHeader>
  <CardContent class="text-2xl font-semibold text-teal-700">Grew **12%**</CardContent>
</Card>
    </script>
  </body>
</html>
```

<!-- x-release-please-end-version -->

The pinned runtime renders the source block with React, the component catalog, a theme, and Tailwind. Humans and agents edit that block instead of generated HTML, CSS, or application code.

Always pin the package version so saved artifacts keep rendering consistently; never use `@latest`.

## Token efficiency

The reproducible benchmark measures complete artifact files with `gpt-tokenizer` (`o200k_base`):

| Format | Decision brief | Executive report | Size vs htmdx |
| --- | ---: | ---: | --- |
| htmdx | 950 | 853 | — |
| compiled HTML (`compile()` output) | 4045 | 3686 | 4.3x larger |
| hand-written HTML + Tailwind | 1881 | 2568 | 2.0-3.0x larger |
| React/JSX (assumes a platform hosts the runtime) | 1263 | 1790 | 1.3-2.1x larger |
| plain markdown (no components) | 474 | 788 | 0.5-0.9x of htmdx |

Adding an accordion item takes 91 tokens in HTMDX versus 434 in compiled HTML. Plain Markdown remains valid HTMDX, so components add cost only where used. See the [methodology and limitations](./packages/htmdx/bench/RESULTS.md), or run `yarn bench`.

## Familiar syntax, no build step

HTMDX uses familiar MDX-style syntax, but the browser runtime renders it in place without requiring build-time compilation or a generated output file:

- Markdown prose, headings, lists, tables, links, and images.
- HTML-like nested component tags such as `<Card><CardHeader>...</CardHeader></Card>`.
- Standard Tailwind classes and declared props. Every component accepts `class`, `id`, `aria-*`, and `data-*`; other values parse by their declared string, number, boolean, or JSON type.

The source remains declarative: imports, MDX `{expressions}`, and function-valued props are rejected. Registered React components provide interactivity. Unknown capitalized tags show an error with the raw source.

Images work as Markdown or allowlisted HTML. Relative paths resolve from the
artifact, and `http:`, `https:`, or supported `data:image/*` sources are
accepted. HTML images allow `alt`, `title`, `width`, `height`, `loading`,
`decoding`, and `class`; event handlers and unsafe URL schemes are dropped.

```md
![Build result](screenshots/result.png "Completed build")

<img src="screenshots/result.png" alt="Build result" width="960" loading="lazy">
```

A fenced code block tagged `mermaid` renders as a diagram in the browser.
Mermaid itself is fetched from a CDN the first time a page turns out to contain
one, so `compile()` stays synchronous and a document without a diagram pays
nothing. The rendered SVG is vetted against the same allowlist authored SVG
passes, and a diagram that cannot load keeps its fence text. Disable it with
`register({ mermaid: false })` or mirror it with
`register({ mermaid: { src: './mermaid.esm.min.mjs' } })`.

## Components

The runtime ships 87 components. Its `htmdx@2` exact-version `dist/components.json` manifest documents every component's purpose, canonical example, body mode, props, and source.

**Report Built-ins** cover summaries, callouts, metrics, charts, tables, timelines, findings, evidence, and risks. Their `markdown` bodies reject nested tags, and each definition's purpose and example state any stricter list or table grammar. Components with `htmdx` bodies accept Markdown, HTML, and nested registered tags; components with `none` bodies accept only empty or self-closing tags.

The grammar itself is not restated here — `npx @wix/htmdx skill components` prints it per component family, with a worked example that the test suite validates against this runtime.

**shadcn/ui pack** provides 16 vendored families on real Radix state with a bundled Tailwind v4 theme — `Card` (with `CardHeader`, `CardTitle`, `CardContent`, …), `Badge`, `Button`, `Tabs`, `Accordion`, `Alert`, `Avatar`, `Breadcrumb`, `Dialog`, `HoverCard`, `Popover`, `Progress`, `Separator`, `Table`, `Tooltip`, and `AspectRatio`. `Card` is provided exclusively by the shadcn pack.

## Source blocks

- Prefer `<script type="text/htmdx">`: browsers preserve its raw text, including tag casing, code fences, and angle brackets. Add `<!-- prettier-ignore -->` above it.
- `<template type="text/htmdx">` works but HTML-parses and may rewrite its content.
- For source containing literal `</script>`, use `<script type="text/htmdx" src="./artifact.mdx"></script>`.

The runtime auto-mounts bare source blocks. Use `<htmdx-code>` for explicit placement or `src`, or disable scanning with `register({ automount: false })`.

## Frontmatter

Optional frontmatter sets document metadata. Values are single-line strings; unknown fields are ignored.

```mdx
---
title: Product Strategy
project: SEO Settings
owner: Jane Doe
phase: Discovery
updated: 2026-07-16
theme: blue
logo: creator-kit
logo-alt: Creator Kit
---
```

| Field | Effect |
| --- | --- |
| `layout` | `default`, `creator-kit`, `blank`, or a trusted host-registered layout name. |
| `title` | Hero and sticky-header title; overrides the first `# heading`. |
| `project` | Project name in the hero and sticky header. |
| `owner` | Owner label. |
| `phase` | Phase label. |
| `updated` | Updated label. |
| `theme` | Built-in color theme. |
| `logo` | Built-in logo name or absolute/data URI shown in the section nav. |
| `logo-alt` | Logo alt text; omit for decorative images. |

`logo: creator-kit` is built in for now; see [`adr/frontmatter-driven-nav-logo.md`](./adr/frontmatter-driven-nav-logo.md).

## Layouts

Omitting `layout` uses `default`, which preserves the existing hero, sticky header, section navigation, and automatic `##` section grouping. `creator-kit` is a built-in alias for `default`, for artifacts that want to name the chrome they were authored against instead of inheriting whatever the default becomes. Use `blank` for source-order composition without that document chrome:

```mdx
---
layout: blank
---

# Checkout migration
```

The blank layout keeps the stable HTMDX root, component catalog, theme, and Tailwind support. A host can override source frontmatter in every full-document renderer:

```ts
compile(source, { layout: 'blank' });
register({ layout: 'blank' });
compileDocument(source, { layout: 'blank' });
```

Trusted host code can register a custom React layout. Each named slot explicitly maps a presentation role to a flat frontmatter field:

```js
const { createElement } = window.Htmdx.React;

window.Htmdx.registerLayout({
  name: 'decision',
  slots: {
    eyebrow: { from: 'project' },
    byline: { from: 'owner' },
    status: { from: 'phase' },
  },
  Component: ({ children, slots }) =>
    createElement(
      'main',
      null,
      createElement('header', null, slots.eyebrow, slots.byline, slots.status),
      createElement('article', null, children),
    ),
});
```

The layout receives only its declared slot keys. Missing fields are present with `undefined`; raw frontmatter is not passed. Layout names are case-insensitive, cannot replace `default`, `creator-kit`, or `blank`, and unknown names fail compilation rather than falling back. Host `layout` options take precedence over frontmatter.

## Themes

Set `theme` to `blue` (default), `purple`, `green`, `teal`, `amber`, `magenta`, `fuchsia`, `rose`, `lime`, or `coral`. Unknown values fall back to `blue`. All palettes preserve the same OKLCh lightness and chroma and pass WCAG AA contrast; use `registerTheme` for custom CSS.

## Extending the catalog with React

Host code registers standard React components and themes through `window.Htmdx`; artifact source only supplies data. The bundle exposes React, so extension scripts need no build step:

<!-- x-release-please-start-version -->

```html
<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.10.0/dist/browser.js" defer></script>
<script>
  window.addEventListener('htmdx:ready', () => {
    const { createElement } = window.Htmdx.React;

    window.Htmdx.registerComponent({
      name: 'ProductCard',
      purpose: 'Group product details in a card.',
      example: '<ProductCard>Product details.</ProductCard>',
      body: 'htmdx',
      Component: (props) =>
        createElement('aside', { className: 'product-card' }, props.children),
    });

    window.Htmdx.registerTheme({
      id: 'product',
      css: `.product-card { border: 1px solid var(--border); padding: 16px; }`,
    });
  });
</script>
```

<!-- x-release-please-end-version -->

Artifacts then use `<ProductCard>` declaratively. Tailwind classes compile on the fly; disable that with `register({ tailwind: false })` or use a mirror with `register({ tailwind: { src: './tailwind-browser.js' } })`.

## Using htmdx from a React app

React hosts use the module entries; `react` and `react-dom` are optional peer dependencies:

```tsx
import { Htmdx } from '@wix/htmdx/react';
import type { HtmdxComponent } from '@wix/htmdx/components';
import * as builtins from '@wix/htmdx/components/builtins';
import * as shadcn from '@wix/htmdx/components/shadcn';

const MyChart = {
  name: 'MyChart',
  purpose: 'Show a custom chart.',
  example: '<MyChart>Quarterly results.</MyChart>',
  body: 'htmdx',
  Component: MyChartView,
} satisfies HtmdxComponent;

<Htmdx
  source={artifactSource}
  definitions={[...Object.values(builtins), ...Object.values(shadcn), MyChart]}
/>;
```

`compile(source)` from `@wix/htmdx` returns a static HTML snapshot of the same tree — useful for previews and validation. It needs a DOM (browser or jsdom). React hosts that need the full selected document layout can use `compileDocument(source).element`; `Htmdx` and `compileToReact()` remain the content-only React entrypoints.

## Validation and linting

`compile()` stops at the first failure. `validate(source)` reports every independent problem at once, each anchored to a 1-based `line`/`column` plus a 0-based `offset`/`length` so editors can underline the exact span. An empty array means the source is clean; like `compile()`, it needs a DOM.

```ts
import { validate } from '@wix/htmdx';

for (const { line, column, severity, code, message } of validate(source)) {
  console.log(`${line}:${column} ${severity} ${code} — ${message}`);
}
// 3:1  error    unknown-component — unknown component <Nope>
// 9:1  warning  image-missing-alt — image has no alt text
```

## Command line

The package ships an `htmdx` bin, so `npx` runs the toolchain without an install. Pin the invocation to the version an artifact declares and every command answers for exactly what ships:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.10.0 lint docs/*.htmdx --strict
npx @wix/htmdx@4.10.0 compile report.htmdx --out report-body.html
npx @wix/htmdx@4.10.0 components Callout
npx @wix/htmdx@4.10.0 skill
```

<!-- x-release-please-end-version -->

| Command | Description |
| --- | --- |
| `lint <files...>` | Report every problem in artifacts and source files. `validate` is an alias. |
| `compile <file>` | Print the `htmdx-app` markup, the same output `compile()` returns to a caller. |
| `components [name]` | List the component catalog, or describe one component's props and example. |
| `skill [topic]` | Print the authoring guidance that ships with this runtime. |

Exit codes are `0` clean, `1` problems found, `2` could not run. `--format json` makes `lint` and `components` machine-readable; `--strict` turns lint warnings into failures; `-o, --out` writes compile output to a file and `--layout` picks a document layout.

`lint` accepts an HTML artifact — the source comes from its `<script type="text/htmdx">` block and positions are reported against the artifact — or a bare source file. On top of everything `validate()` reports, it adds two findings that only exist at the artifact level: `unpinned-runtime` (the runtime `<script>` has no pinned version, so a future release can change the artifact) and `runtime-version-mismatch` (the artifact pins a version other than the one linting it). This repo lints its own examples this way in CI.

`components` reads the manifest built next to the bin, so the catalog it prints is the one that version renders — the thing to ask before writing a document rather than guessing at prop names. See the [package README](./packages/htmdx/README.md#command-line) for the full behavior, including how `invalid-html-nesting` dedupes across files in one run.

## Agent skill

The authoring guidance ships with the runtime and is printed by `htmdx skill`, so an agent always reads the contract, component grammar, and verification steps for the exact version an artifact pins. `skill --list` names the topics, `skill --full` streams all of them, and `--json` wraps them with the runtime version.

[`skills/htmdx/`](./skills/htmdx/SKILL.md) is the installable skill that routes an agent to those commands — copy it into a skills directory (`~/.claude/skills/htmdx` for Claude Code, `~/.agents/skills/htmdx` for Codex). The topic files themselves live in [`packages/htmdx/skill/`](./packages/htmdx/skill/); their examples are validated against this runtime on every test run.

## Package

- npm: `@wix/htmdx` · CDN entry: `dist/browser.js` (~145KB gzip) · module entries: `.`, `./react`, `./testing`, `./components`, `./components/builtins`, `./components/shadcn`
- custom element: `<htmdx-code>` · browser API: `window.Htmdx`
- linting: [`validate()`](#validation-and-linting) · CLI: [`lint`, `compile`, `components`](#command-line) — `npx @wix/htmdx lint <files...>`
- component contract: `dist/components.json`
- agent guidance: `npx @wix/htmdx skill` (topics in [`packages/htmdx/skill/`](./packages/htmdx/skill/)), installable skill in [`skills/htmdx/`](./skills/htmdx/SKILL.md)
- architecture decisions: [`adr/`](./adr/)

## Development

```bash
yarn
yarn build
yarn test
yarn lint
yarn fmt:check
```
