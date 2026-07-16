# htmdx

`@wix/htmdx` renders editable MDX-like source inside a plain HTML file. It is built for artifacts that should be easy for people to view and easy for agents to edit.

Start with one HTML file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://unpkg.com/@wix/htmdx@<exact-version>/dist/browser.js" defer></script>
  </head>
  <body>
    <htmdx-code>
      <template type="text/htmdx" data-htmdx-edit-instruction="Edit only this template content. HTMDX format.">
# Artifact title

<ExecutiveSummary>
The HTML is viewable as-is. Agents edit only this source block.
</ExecutiveSummary>
      </template>
    </htmdx-code>
  </body>
</html>
```

CDN caveats:

- Generated artifacts can load the browser bundle from [unpkg](https://unpkg.com/) after the package is published to npm.
- Pin an explicit package version in generated artifacts. Do not use floating aliases like `@latest`, because saved HTML artifacts must keep rendering the same runtime over time.

External source files are supported too:

```html
<htmdx-code src="./artifact.mdx"></htmdx-code>
```

## Package

- npm package: `@wix/htmdx`
- CDN entry: `dist/browser.js`
- module entry: `dist/index.js`
- custom element: `<htmdx-code>`
- global browser API: `window.Htmdx`
- Tailwind browser support: enabled by default through `@tailwindcss/browser@4`

## Exact-version component manifest

Every release includes a machine-readable built-in component contract at:

```text
https://unpkg.com/@wix/htmdx@<exact-version>/dist/components.json
```

Use the same exact version as the artifact's runtime URL. The manifest is a built-ins-only allowlist; it does not describe components registered by host code.

Each entry declares one enforced body format: `markdown`, `label-value-list`, `label-number-list`, `gfm-table`, or `markdown-list-cards`. Bodies must be non-empty, Markdown-shaped one-level JSX. Imports, exports, MDX expressions, and nested JSX are forbidden. A body that violates the global or declared format contract fails compilation of the whole HTMDX artifact; browser hosts show the error fallback and raw artifact source instead of partially rendered output.

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
| `owner` | Owner label pill in the hero. |
| `phase` | Phase label pill in the hero. |
| `updated` | Updated label pill in the hero. |
| `theme` | Built-in color theme (see Color themes below). |
| `logo` | Logo pinned to the bottom-left of the section nav. Either a built-in logo name (`creator-kit`) or an image URL. Because artifacts are portable single files, use an absolute URL or a `data:` URI, not a relative path. |
| `logo-alt` | Alt text for the logo image. Omit for a decorative logo. |

The Creator Kit logo ships built into the runtime for now (`logo: creator-kit`);
this placement will be revisited (see `docs/adr/0003-frontmatter-driven-nav-logo.md`).

## Color themes

Artifacts render in the default **purple** theme. To render in another built-in
theme, add a `theme:` field to the HTMDX frontmatter:

```mdx
---
theme: blue
---

# Title
```

Built-in themes: `purple` (default), `blue`, `green`, `teal`, `amber`,
`magenta`, `fuchsia`, `rose`, `lime`, `coral`. Every
theme shares the same design DNA — identical tone, contrast, and saturation,
rotated to a different hue. Unknown or omitted values fall back to purple.

Palettes are generated offline from the purple palette and committed to
`src/themes.ts`. The generator (`scripts/generate-themes.mjs`) is not part of
the build; regenerating after editing the seeds needs a one-off dev install (see
the script header). No runtime or build dependency is added.

These built-in themes are separate from the host-side `registerTheme` API
(see the Extension API below): built-ins are baked into the runtime and picked
per-artifact via `theme:`, whereas `registerTheme` lets trusted host code inject
its own custom CSS at load time.

## HTMDX Components

The first version supports the Creator Kit artifact components:

- `ExecutiveSummary`, `Card`, `Callout`, `SourceQuote`
- `MetricStrip`, `Stat`
- `ChartBar`, `ChartArea`, `ChartLine`, `ChartPie`
- `DataTable`, `Compare`, `Finding`, `Evidence`
- `RiskTable`, `DecisionTable`, `Timeline`

Nested JSX is intentionally rejected in v1.

## Extension API Prototype

Consumer components and design themes are registered by trusted host code, not
inside the HTMDX source block. Load the runtime, then load an inline or external
script that contributes named components/themes through `window.Htmdx`:

```html
<script src="https://unpkg.com/@wix/htmdx@<exact-version>/dist/browser.js" defer></script>
<script>
  window.addEventListener('htmdx:ready', () => {
    window.Htmdx.registerComponent(
      'ProductCard',
      ({ body, markdown }) => `<aside class="product-card">${markdown(body)}</aside>`,
    );

    window.Htmdx.registerTheme({
      id: 'product',
      css: `
        htmdx-code { --htmdx-accent: #0057ff; }
        .product-card { border: 1px solid var(--htmdx-line); padding: 16px; }
      `,
    });
  });
</script>
```

External scripts work too:

```html
<script src="https://unpkg.com/@wix/htmdx@<exact-version>/dist/browser.js" defer></script>
<script src="./product-components.js" defer></script>
```

```js
window.Htmdx.registerComponents({
  ProductCard: ({ body, markdown }) => `<aside class="product-card">${markdown(body)}</aside>`,
});
```

Then the artifact source can use the registered component declaratively:

```mdx
<ProductCard>
**Launch plan**: Invite beta users first.
</ProductCard>
```

Unknown components still fail validation unless they are explicitly registered.
The default Creator Kit flow uses the built-in C Memo components/theme.

Tailwind utilities work in registered component HTML by default:

```js
window.Htmdx.registerComponent(
  'ProductCard',
  ({ body, markdown }) =>
    `<aside class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">${markdown(body)}</aside>`,
);
```

The runtime injects Tailwind's browser compiler before rendering hosts:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" defer></script>
```

Hosts can disable it or point at a local mirror:

```js
window.Htmdx.register({ tailwind: false });
window.Htmdx.register({ tailwind: { src: './tailwind-browser.js' } });
```

Use the browser compiler for portable artifacts and prototypes. Production hosts that need a compiled CSS pipeline can disable it and provide their own CSS with `registerTheme`.

## Development

```bash
yarn
yarn build
yarn test
yarn lint
yarn fmt:check
```
