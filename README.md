# htmdx

`@wix/htmdx` renders editable, MDX-like source inside a plain HTML file. It is built for artifacts that people view as finished pages and agents edit as text — a report, brief, or dashboard that stays a single self-contained file.

**Live examples:** [examples index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/). Every example page is itself an htmdx artifact — view source to see exactly what an agent edits.

## One file is the whole artifact

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@2.0.0/dist/browser.js" defer></script>
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

The runtime ships 33 components. `dist/components.json` (served next to the runtime at the same exact version) is the machine-readable contract: every component with its purpose, props, allowed values, and a canonical example.

**Report built-ins.** `ExecutiveSummary`, `Callout`, `SourceQuote`, and `Evidence` take markdown bodies and compose — other components work inside them. The structured ones enforce a body format and fail the whole artifact when it does not match: `MetricStrip`, `Stat`, `DecisionTable`, `Timeline` (label–value lists), `ChartBar`, `ChartArea`, `ChartLine`, `ChartPie` (label–number lists), `DataTable` (GFM table), `Compare`, `Finding`, `RiskTable` (markdown list cards).

**shadcn/ui pack.** `Card` (with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`), `Badge`, `Button`, `Tabs`, and `Accordion` — vendored shadcn components on real Radix state, with a bundled Tailwind v4 theme. Where both catalogs name a `Card`, the shadcn component wins.

## Source blocks

- `<script type="text/htmdx">` is the canonical holder. Browsers keep its content as raw text, so tag casing, code fences, and angle brackets survive byte-for-byte and formatters leave it alone (add `<!-- prettier-ignore -->` above it).
- `<template type="text/htmdx">` also works, but browsers HTML-parse its content, which lowercases component tags and can restructure code fences. Prefer `script`.
- A literal `</script>` inside the source ends the block early; keep such examples in an external file: `<script type="text/htmdx" src="./artifact.mdx"></script>`.

The runtime auto-mounts each bare source block by wrapping it in a generated `<htmdx-code>` host. Write `<htmdx-code>` yourself only for explicit placement or `src`; disable scanning with `register({ automount: false })`.

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
<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@2.0.0/dist/browser.js" defer></script>
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
