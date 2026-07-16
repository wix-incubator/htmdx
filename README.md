# htmdx

`@wix/htmdx` renders editable, MDX-like source inside a plain HTML file. It is built for artifacts that people view as finished pages and agents edit as text — a report, brief, or dashboard that stays a single self-contained file.

**Live examples:** [examples index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/). Every example page is itself an htmdx artifact — view source to see exactly what an agent edits.

## One file is the whole artifact

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@3.0.0/dist/browser.js" defer></script>
  </head>
  <body>
    <!-- prettier-ignore -->
    <script type="text/htmdx" data-htmdx-edit-instruction="Edit only this script content. HTMDX format.">
# Q3 Report

<ExecutiveSummary>
The HTML is viewable as-is. Agents edit only this source block.
</ExecutiveSummary>

<Card>
  <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
  <CardContent>Grew **12%**. <Badge variant="secondary">audited</Badge></CardContent>
</Card>
    </script>
  </body>
</html>
```

The runtime script injects React, the component catalog, the shadcn/ui pack, a theme, and Tailwind's browser compiler, then renders each source block in place. The source itself stays declarative text.

Pin an exact package version in artifacts. Saved files must keep rendering the same runtime over time, so never use floating aliases like `@latest`.

## The language: MDX minus JavaScript

HTMDX looks like MDX but carries data, not code:

- Markdown prose, headings (which build the page's section rail), lists, tables, links.
- Component tags with nested composition: `<Card><CardHeader>...</CardHeader></Card>`.
- Attributes as typed props: `class` becomes `className`, kebab-case becomes camelCase, and values parse as booleans, numbers, or JSON when they look like data.

Three things are rejected on purpose: imports, MDX `{expressions}`, and function-valued props. Nothing in the source can execute. Interactivity — tabs switching, accordions expanding — comes from state inside the registered components, never from the artifact. Unknown capitalized tags fail compilation, so an agent that typos a component name gets an error and the raw source instead of silently degraded output.

## Components

The runtime ships 85 components. `dist/components.json` (served next to the runtime at the same exact version) is the machine-readable contract: every component with its purpose, props, allowed values, and a canonical example.

**Report built-ins.** `ExecutiveSummary`, `Callout`, and `SourceQuote` take markdown bodies and compose — other components work inside them. The structured ones enforce a body format and fail the whole artifact when it does not match: `MetricStrip`, `Stat`, `DecisionTable`, `Timeline` (label–value lists), `ChartBar`, `ChartArea`, `ChartLine`, `ChartPie` (label–number lists), `DataTable` (GFM table), `Compare`, `Finding`, `Evidence`, `RiskTable` (markdown list cards). Every built-in renders as native shadcn/Tailwind JSX.

**shadcn/ui pack.** 18 vendored shadcn families on real Radix state, with a bundled Tailwind v4 theme — `Card` (with `CardHeader`, `CardTitle`, `CardContent`, …), `Badge`, `Button`, `Tabs`, `Accordion`, `Alert`, `Avatar`, `Breadcrumb`, `Dialog`, `HoverCard`, `Popover`, `Progress`, `Separator`, `Table`, `Toggle`, `ToggleGroup`, `Tooltip`, and `AspectRatio`. `Card` is provided exclusively by the shadcn pack.

## Source blocks

- `<script type="text/htmdx">` is the canonical holder. Browsers keep its content as raw text, so tag casing, code fences, and angle brackets survive byte-for-byte and formatters leave it alone (add `<!-- prettier-ignore -->` above it).
- `<template type="text/htmdx">` also works, but browsers HTML-parse its content, which lowercases component tags and can restructure code fences. Prefer `script`.
- A literal `</script>` inside the source ends the block early; keep such examples in an external file: `<script type="text/htmdx" src="./artifact.mdx"></script>`.

The runtime auto-mounts each bare source block by wrapping it in a generated `<htmdx-code>` host. Write `<htmdx-code>` yourself only for explicit placement or `src`; disable scanning with `register({ automount: false })`.

## Frontmatter

An optional YAML-style frontmatter block at the top of the HTMDX source sets
document metadata. All fields are single-line strings; unknown fields are
ignored.

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
| `title` | Document title; overrides the first `# heading` in the hero and sticky header. |
| `project` | Project name shown in the hero eyebrow and sticky header. |
| `owner` | Owner label in the hero. |
| `phase` | Phase label in the hero. |
| `updated` | Updated label in the hero. |
| `theme` | Built-in color theme (see Themes below). |
| `logo` | Logo pinned to the bottom-left of the section nav. Either a built-in logo name (`creator-kit`) or an image URL. Because artifacts are portable single files, use an absolute URL or a `data:` URI, not a relative path. |
| `logo-alt` | Alt text for the logo image. Omit for a decorative logo. |

The Creator Kit logo ships built into the runtime for now (`logo: creator-kit`);
this placement will be revisited (see `adr/frontmatter-driven-nav-logo.md`).

## Themes

An artifact picks its accent palette with a frontmatter key:

```yaml
---
theme: teal
---
```

Ten built-in ids: `blue` (default), `purple`, `green`, `teal`, `amber`, `magenta`, `fuchsia`, `rose`, `lime`, `coral`. An omitted or unknown value falls back to `blue`. Every palette shares the same DNA — the default blue tokens hue-rotated in OKLCh with lightness and chroma kept, then contrast-checked to WCAG AA — so switching themes never changes the artifact's weight or readability. For anything beyond accent color, hosts register custom CSS with `registerTheme` (below).

## Extending the catalog

Host code — not the artifact — registers extra React components and theme CSS through `window.Htmdx`. The bundle exposes its React copy so extension scripts need no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@3.0.0/dist/browser.js" defer></script>
<script>
  window.addEventListener('htmdx:ready', () => {
    const { createElement } = window.Htmdx.React;

    window.Htmdx.registerComponent('ProductCard', (props) =>
      createElement('aside', { className: 'product-card' }, props.children),
    );

    window.Htmdx.registerTheme({
      id: 'product',
      css: `.product-card { border: 1px solid var(--border); padding: 16px; }`,
    });
  });
</script>
```

Artifacts then use `<ProductCard>` declaratively. Tailwind utility classes in registered components compile on the fly; hosts that want their own CSS pipeline can pass `register({ tailwind: false })` or point at a mirror with `register({ tailwind: { src: './tailwind-browser.js' } })`.

This division is the security model: components are host-owned and trusted; the artifact supplies only data to them.

## Using htmdx from a React app

React hosts skip the browser bundle and use the module entries (react and react-dom are optional peer dependencies):

```tsx
import { Htmdx, builtInReactComponents } from '@wix/htmdx/react';
import { shadcnComponents, injectShadcnTheme } from '@wix/htmdx/react/shadcn';

injectShadcnTheme();
<Htmdx
  source={artifactSource}
  components={{ ...builtInReactComponents, ...shadcnComponents, MyChart }}
/>;
```

`compile(source)` from `@wix/htmdx` returns a static HTML snapshot of the same tree — useful for previews and validation. It needs a DOM (browser or jsdom).

## Token efficiency

Writing an artifact as htmdx costs a fraction of the tokens that the same
artifact costs in any HTML form: 2.9-4.5x fewer than its own compiled HTML,
2-3x fewer than hand-written HTML with Tailwind. A reproducible benchmark
measures two report artifacts, each as the complete single file an agent
would emit, tokenized with `gpt-tokenizer` (`o200k_base`):

| Format | Decision brief | Executive report | Size vs htmdx |
| --- | ---: | ---: | --- |
| htmdx | 950 | 853 | — |
| compiled HTML (`compile()` output) | 4589 | 3612 | 4.2-4.8x larger |
| hand-written HTML + Tailwind | 1881 | 2568 | 2.0-3.0x larger |
| React/JSX (assumes a platform hosts the runtime) | 1263 | 1790 | 1.3-2.1x larger |
| plain markdown (no components) | 474 | 788 | 0.5-0.9x of htmdx |

Edits are cheaper in the same range: adding an accordion item takes 91
tokens in htmdx vs 428 in compiled HTML.

Markdown is htmdx's floor, not a competitor. Plain markdown is valid htmdx
source, so a document pays only for the component blocks it uses. Those
blocks sometimes beat markdown itself: the executive report is smaller as
htmdx source (734 tokens) than as plain markdown (788), because a
`MetricStrip` list is denser than a markdown table. JSX has no such
gradient: every paragraph pays JSX syntax, and the artifact renders nothing
without its build pipeline.

Run `yarn bench` to regenerate. Methodology, per-task edit costs, tokenizer
cross-checks, and limitations:
[`packages/htmdx/bench/RESULTS.md`](./packages/htmdx/bench/RESULTS.md).

## Package

- npm: `@wix/htmdx` · CDN entry: `dist/browser.js` (~90KB gzip) · module entries: `.`, `./react`, `./react/shadcn`
- custom element: `<htmdx-code>` · browser API: `window.Htmdx`
- component contract: `dist/components.json`
- architecture decisions: [`adr/`](./adr/)

## Development

```bash
yarn
yarn build
yarn test
yarn lint
yarn fmt:check
```
