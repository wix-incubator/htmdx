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
