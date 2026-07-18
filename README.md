# htmdx

`@wix/htmdx` creates rich HTML artifacts that humans review and agents edit.

- **One portable file:** Source and browser-facing artifact stay together.
- **No build step:** The browser renders HTMDX in place, with no generated output to keep in sync.
- **Human- and agent-readable:** Edit Markdown, component tags, and Tailwind classes instead of generated markup.
- **Token-efficient:** Benchmarks show 2–3× fewer tokens than hand-written HTML with Tailwind.
- **Rich by default:** Use interactive components, themes, charts, and structured report elements.
- **Safe by design:** Source cannot contain imports, JavaScript expressions, or function-valued props.

**Examples:** [index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/). View any example's source to see what an agent edits.

## One file, two audiences

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js" defer></script>
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

- Markdown prose, headings, lists, tables, and links.
- HTML-like nested component tags such as `<Card><CardHeader>...</CardHeader></Card>`.
- Standard Tailwind classes and declared props. Every component accepts `class`, `id`, `aria-*`, and `data-*`; other values parse by their declared string, number, boolean, or JSON type.

The source remains declarative: imports, MDX `{expressions}`, and function-valued props are rejected. Registered React components provide interactivity. Unknown capitalized tags show an error with the raw source.

## Components

The runtime ships 87 components. Its `htmdx@2` exact-version `dist/components.json` manifest documents every component's purpose, canonical example, body mode, props, and source.

**Report Built-ins** cover summaries, callouts, metrics, charts, tables, timelines, findings, evidence, and risks. Their `markdown` bodies reject nested tags, and each definition's purpose and example state any stricter list or table grammar. Components with `htmdx` bodies accept Markdown, HTML, and nested registered tags; components with `none` bodies accept only empty or self-closing tags.

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
| `title` | Hero and sticky-header title; overrides the first `# heading`. |
| `project` | Project name in the hero and sticky header. |
| `owner` | Owner label. |
| `phase` | Phase label. |
| `updated` | Updated label. |
| `theme` | Built-in color theme. |
| `logo` | Built-in logo name or absolute/data URI shown in the section nav. |
| `logo-alt` | Logo alt text; omit for decorative images. |

`logo: creator-kit` is built in for now; see [`adr/frontmatter-driven-nav-logo.md`](./adr/frontmatter-driven-nav-logo.md).

## Themes

Set `theme` to `blue` (default), `purple`, `green`, `teal`, `amber`, `magenta`, `fuchsia`, `rose`, `lime`, or `coral`. Unknown values fall back to `blue`. All palettes preserve the same OKLCh lightness and chroma and pass WCAG AA contrast; use `registerTheme` for custom CSS.

## Extending the catalog with React

Host code registers standard React components and themes through `window.Htmdx`; artifact source only supplies data. The bundle exposes React, so extension scripts need no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js" defer></script>
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

`compile(source)` from `@wix/htmdx` returns a static HTML snapshot of the same tree — useful for previews and validation. It needs a DOM (browser or jsdom).

## Package

- npm: `@wix/htmdx` · CDN entry: `dist/browser.js` (~138KB gzip) · module entries: `.`, `./react`, `./components`, `./components/builtins`, `./components/shadcn`
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
