# @wix/htmdx

Render editable MDX-like source inside a plain HTML file. `@wix/htmdx@4.0.0` uses one component definition model for Built-ins, shadcn, and host extensions. HTMDX is built for artifacts that should be easy for people to view and easy for agents to edit.

**Live examples:** [examples index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/) — every page is itself an htmdx artifact; view source to see what an agent edits.

Start with one HTML file:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js" defer></script>
  </head>
  <body>
    <!-- prettier-ignore -->
    <script
      type="text/htmdx"
      data-htmdx-edit-instruction="Edit only this script content. HTMDX format."
    >
# Title

<ExecutiveSummary>
Agents edit source. Users view rendered HTML.
</ExecutiveSummary>
    </script>
  </body>
</html>
```

The runtime auto-mounts each bare source block: it wraps the script in a generated `<htmdx-code>` host in place and renders there. Write `<htmdx-code>` yourself only when you need explicit output placement or `src`; disable scanning with `register({ automount: false })`.

Source block notes:

- `<script type="text/htmdx">` is the canonical source holder. Browsers store its content as raw text, so component tag casing, code fences containing HTML, and angle brackets in prose survive byte-for-byte, and HTML formatters leave the content alone.
- `<template type="text/htmdx">` is also supported, but its content is HTML-parsed and re-serialized, which can rewrite the source (lowercased component tags, restructured code fences).
- A literal `</script>` inside the source ends the block early; keep such examples in an external `src` file instead.

CDN caveats:

- Generated artifacts can load the browser bundle from [jsDelivr](https://www.jsdelivr.com/) after the package is published to npm.
- Pin an explicit package version in generated artifacts. Do not use floating aliases like `@latest`, because saved HTML artifacts must keep rendering the same runtime over time.

## Exact-version component manifest

Every release includes its machine-readable component contract at:

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/components.json
```

Use the same exact version as the artifact's runtime URL. The `htmdx@2`
manifest lists the full runtime catalog — Built-ins plus the shadcn/ui pack,
each entry tagged with its `source`, body mode, prop schema, and canonical
example. It projects this data from the same definitions used by the runtime;
the executable `Component` field does not appear in JSON.

Each manifest entry declares `body: "markdown" | "htmdx" | "none"`.
`markdown` passes raw Markdown to the component and rejects nested tags;
Built-ins use this mode. `htmdx` accepts Markdown, HTML, and nested registered
component tags; shadcn and external definitions use it when they support
composition. `none` accepts only an empty or self-closing tag. A Built-in's
`purpose` and `example`
describe any stricter list or table grammar it checks. Invalid bodies fail the
whole compile, and browser hosts show the error with the raw source. Imports,
exports, brace expressions, event handlers, and function-valued props cannot
be expressed — the source is data, not code.

Use `src` when the source should live next to the HTML, in either form:

```html
<script type="text/htmdx" src="./artifact.mdx"></script>
<htmdx-code src="./artifact.mdx"></htmdx-code>
```

Module API:

```ts
import { compile, register } from '@wix/htmdx';

register();
const rendered = compile('# Title');
```

Extension API. Trusted host code can contribute React components and theme
CSS from an inline or external script:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@wix/htmdx@<exact-version>/dist/browser.js"
  defer
></script>
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

    window.Htmdx.registerTheme({
      id: 'product',
      css: `.product-card { border: 1px solid var(--border); padding: 16px; }`,
    });
  });
</script>
```

Extension code is host-owned and explicit. The HTMDX source remains
declarative; unknown capitalized tags fail compilation until registered.

Tailwind utilities work in registered components by default — the runtime
injects Tailwind's browser compiler, so `className` values compile on the fly.

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

## React runtime (MDX minus JavaScript)

htmdx renders through React everywhere: Built-ins and the shadcn/ui pack are
bundled as complete component definitions. Global registration and per-render
extensions accept the same definitions, and names cannot replace bundled or
registered definitions. The source stays declarative data: component tags,
nested composition, and declared attribute props work; imports, exports,
brace expressions, event handlers, and function props are rejected by design.

The standard runtime script gives an artifact the full catalog:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@wix/htmdx@<exact-version>/dist/browser.js"
  defer
></script>
<!-- prettier-ignore -->
<script type="text/htmdx">
# Q3 Report

<Card class="max-w-xl">
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
    <CardDescription>Audited quarterly numbers</CardDescription>
  </CardHeader>
  <CardContent>
    Revenue grew **12%** quarter over quarter.
    <Badge variant="secondary">audited</Badge>
  </CardContent>
</Card>

<Tabs defaultValue="summary">
  <TabsList>
    <TabsTrigger value="summary">Summary</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="summary">Topline numbers.</TabsContent>
  <TabsContent value="details">Full cost breakdown.</TabsContent>
</Tabs>
</script>
```

`dist/browser.js` bundles React, the built-in catalog (ExecutiveSummary,
MetricStrip, charts, ...), the shadcn/ui pack (Card, Badge, Button, Tabs,
Accordion), and the shadcn theme (~147KB gzip, including the static-render
path that powers `compile()`).

Authoring htmdx source instead of rendered markup is measurably cheaper for
agents: the full single-file artifact is about 4.3x smaller in tokens than the
same artifact as compiled HTML, and 2-3x smaller than hand-written
HTML+Tailwind, with edits cheaper in the same range. Reproducible benchmark in
[`bench/RESULTS.md`](https://github.com/wix-incubator/htmdx/blob/master/packages/htmdx/bench/RESULTS.md)
(`yarn bench`).

React host apps use the module entries instead (react/react-dom are optional
peer dependencies):

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

Definitions are available from `@wix/htmdx/components`,
`@wix/htmdx/components/builtins`, and `@wix/htmdx/components/shadcn`.
Component-specific attributes form an allowlist and parse by their declared
`string`, `number`, `boolean`, or `json` type. Every component also accepts
`class`, `id`, `aria-*`, and `data-*`. Well-formed HTMDX bodies are parsed as
XML, so camelCase names such as `defaultValue` stay intact; malformed bodies
fall back to HTML parsing.

Security note: the React runtime runs the registered component code with
agent-authored props (`compile()` can still emit a static HTML snapshot of the
same tree). Components are host-owned and whitelisted; the source still cannot
express code, only data.
