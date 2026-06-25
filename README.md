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

The first public npm release is planned as `@wix/htmdx@1.0.4`.

## HTMDX Components

The first version supports the Creator Kit artifact components:

- `ExecutiveSummary`, `Card`, `Callout`, `SourceQuote`
- `MetricStrip`, `Stat`
- `ChartBar`, `ChartArea`, `ChartLine`, `ChartPie`
- `DataTable`, `Compare`, `Finding`, `Evidence`
- `RiskTable`, `DecisionTable`, `Timeline`

Nested JSX is intentionally rejected in v1.

## Development

```bash
yarn
yarn build
yarn test
yarn lint
yarn fmt:check
```
