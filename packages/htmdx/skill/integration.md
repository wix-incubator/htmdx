# Host integration

For hosts that render HTMDX inside an app rather than shipping a standalone
artifact. Artifact authoring needs none of this.

## Entry points

`@wix/htmdx` exposes `.`, `./react`, `./testing`, `./components`,
`./components/builtins`, and `./components/shadcn`; `dist/browser.js` is the
CDN bundle and `dist/components.json` the component contract. `react` and
`react-dom` are optional peer dependencies.

| Need                                   | Use                                                |
| -------------------------------------- | -------------------------------------------------- |
| Render source in a React tree          | `<Htmdx source={…} />` from `@wix/htmdx/react`     |
| Static HTML snapshot of that tree      | `compile(source)` — needs a DOM (browser or jsdom) |
| Full document with the selected layout | `compileDocument(source).element`                  |
| Diagnostics without rendering          | `validate(source)`                                 |
| Standalone HTML files                  | `dist/browser.js`, which auto-mounts source blocks |

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

## Browser extension points

Trusted host code registers components, themes, and layouts on
`window.Htmdx` after the `htmdx:ready` event. The bundle exposes React, so
extension scripts need no build step. Artifact source still only supplies
data — a registered component is the only way to add behavior.

```html
<script>
  window.addEventListener('htmdx:ready', () => {
    const { createElement } = window.Htmdx.React;

    window.Htmdx.registerComponent({
      name: 'ProductCard',
      purpose: 'Group product details in a card.',
      example: '<ProductCard>Product details.</ProductCard>',
      body: 'htmdx',
      Component: (props) => createElement('aside', { className: 'product-card' }, props.children),
    });

    window.Htmdx.registerTheme({ id: 'product', css: '.product-card { padding: 16px; }' });
  });
</script>
```

`register()` options: `tagName`, `sourceSelector`, `theme`, `layout`,
`definitions`, `automount: false` to stop scanning for bare source blocks, and
`tailwind: false` or `tailwind: { src }` to disable or mirror the Tailwind
browser build.

A custom layout maps presentation slots to flat frontmatter fields and receives
only its declared slots. Layout names are case-insensitive, cannot replace
`default` or `blank`, and an unknown name fails compilation instead of falling
back. A host `layout` option overrides source frontmatter.

## Testing HTMDX kept in a repo

`@wix/htmdx/testing` pulls the source out of a shipped artifact and snapshots
it. `snapshot()` throws on any error diagnostic, so a broken document cannot be
recorded as expected output.

```ts
import { extractSource, snapshot } from '@wix/htmdx/testing';

const source = extractSource(readFileSync('artifacts/brief.html', 'utf8'));
expect(snapshot(source)).toMatchSnapshot(); // mode: 'structure' (default) or 'html'
```

For CI, lint the files instead:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.12.0 lint artifacts/*.html --strict
```

<!-- x-release-please-end-version -->

`lint` accepts `.html` artifacts and bare source files, reports positions
rebased onto the artifact, and adds two artifact-only findings:
`unpinned-runtime` and `runtime-version-mismatch`. Run it with the version the
artifacts pin so results match what ships.
