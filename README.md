# htmdx

`@wix/htmdx` renders editable MDX-like source inside a plain HTML file. It is built for artifacts that should be easy for people to view and easy for agents to edit.

Start with one HTML file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://unpkg.com/@wix/htmdx@1.0.4/dist/browser.js" defer></script>
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

The first public npm release is planned as `@wix/htmdx@1.0.4`.

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
<script src="https://unpkg.com/@wix/htmdx@1.0.4/dist/browser.js" defer></script>
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
<script src="https://unpkg.com/@wix/htmdx@1.0.4/dist/browser.js" defer></script>
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
