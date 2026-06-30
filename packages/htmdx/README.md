# @wix/htmdx

Render editable MDX-like source inside a plain HTML file. HTMDX is built for artifacts that should be easy for people to view and easy for agents to edit.

Start with one HTML file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://unpkg.com/@wix/htmdx@1.0.4/dist/browser.js" defer></script>
  </head>
  <body>
    <htmdx-code>
      <template
        type="text/htmdx"
        data-htmdx-edit-instruction="Edit only this template content. HTMDX format."
      >
        # Title

        <ExecutiveSummary> Agents edit source. Users view rendered HTML. </ExecutiveSummary>
      </template>
    </htmdx-code>
  </body>
</html>
```

CDN caveats:

- Generated artifacts can load the browser bundle from [unpkg](https://unpkg.com/) after the package is published to npm.
- Pin an explicit package version in generated artifacts. Do not use floating aliases like `@latest`, because saved HTML artifacts must keep rendering the same runtime over time.

Use `src` when the source should live next to the HTML:

```html
<htmdx-code src="./artifact.mdx"></htmdx-code>
```

Module API:

```ts
import { compile, register } from '@wix/htmdx';

register();
const rendered = compile('# Title');
```

Extension API prototype. Trusted host code can contribute components and theme
CSS from an inline or external script:

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

Extension code is host-owned and explicit. The HTMDX source remains declarative;
unknown components fail unless they are registered.

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
