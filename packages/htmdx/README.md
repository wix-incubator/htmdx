# @wix/htmdx

Render editable MDX-like source inside a plain HTML file. `@wix/htmdx` v4 uses one component definition model for Built-ins, shadcn, and host extensions. HTMDX is built for artifacts that should be easy for people to view and easy for agents to edit.

**Live examples:** [examples index](https://wix-incubator.github.io/htmdx/) · [decision brief](https://wix-incubator.github.io/htmdx/decision-brief.html) · [blank canvas](https://wix-incubator.github.io/htmdx/blank-layout.html) · [component tour](https://wix-incubator.github.io/htmdx/component-tour.html) · [Storybook](https://wix-incubator.github.io/htmdx/storybook/) — every page is itself an htmdx artifact; view source to see what an agent edits.

Start with one HTML file:

<!-- x-release-please-start-version -->

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.6.0/dist/browser.js" defer></script>
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

<!-- x-release-please-end-version -->

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

<!-- x-release-please-start-version -->

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.6.0/dist/components.json
```

<!-- x-release-please-end-version -->

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

## Raw HTML

Ordinary HTML renders alongside Markdown, from an allowlist:

```mdx
Watch <a href="https://wix.com">the announcement</a> or play it here.

<video controls width="640" poster="poster.png">
  <source src="clip.webm" type="video/webm">
</video>

<iframe src="https://example.com/embed" width="560" height="315" allowfullscreen></iframe>

<div class="grid gap-4">

## Still Markdown in here

<Badge>Shipped</Badge>

</div>
```

Structural, text-level, table, and media elements are allowed — `p`, `div`,
`section`, `figure`, `details`, `table`, `a`, `span`, `br`, `video`, `audio`,
`iframe`, and friends. Anything outside the list (`form`, `input`, `object`,
`svg`, unknown tags) is not markup at the top level, so it stays literal text
the way it always has.

Inside a component body, a tag outside the list still renders the way it did
before the allowlist existed — it is passed through with its attributes — so
documents written against the old behavior keep compiling. The exception is the
handful of elements that turn source into code (`script`, `style`, `link`,
`meta`, `base`, `embed`, `object`, `template`), which fail the compile.

A registered component still wins on name collision, as before: with the shadcn
pack registered, `<table>` and `<button>` resolve to `Table` and `Button`.

A block element that opens a line owns everything up to its close tag, so blank
lines, Markdown, and nested component tags inside it keep working. HTML written
mid-sentence renders inline. HTML inside code fences and code spans stays
literal, as before.

Only allowlisted attributes survive: global ones (`class`, `id`, `title`,
`lang`, `dir`, `role`, `style`, `tabindex`, `hidden`), `aria-*`, `data-*`, and a
per-element set. `href`, `src`, `cite`, `poster`, and `srcset` are scheme
checked the same way Markdown links are; `style` is parsed into a React style
object with `url()` values checked and `expression()` dropped; `on*` attributes
fail the compile; `iframe` cannot set `srcdoc`. The source still cannot express
code, only data.

Images can use Markdown or HTML syntax:

```md
![Build result](screenshots/result.png 'Completed build')

<img src="screenshots/result.png" alt="Build result" width="960" loading="lazy">
```

Relative, `http:`, `https:`, and supported `data:image/*` sources are accepted.
HTML images allow `alt`, `title`, `width`, `height`, `loading`, `decoding`, and
`class`; event handlers and unsafe URL schemes are dropped.

Use `src` when the source should live next to the HTML, in either form:

```html
<script type="text/htmdx" src="./artifact.mdx"></script>
<htmdx-code src="./artifact.mdx"></htmdx-code>
```

Module API:

```ts
import { compile, compileDocument, register } from '@wix/htmdx';

register();
const rendered = compile('# Title');
```

Full-document layouts are selected by frontmatter or host options. Host options win:

```mdx
---
layout: blank
---

# Source-order canvas
```

```ts
compile(source, { layout: 'blank' });
register({ layout: 'blank' });
compileDocument(source, { layout: 'blank' });
```

Omitting `layout` uses `default`, preserving the existing document chrome and automatic `##` section grouping. `creator-kit` is a built-in alias for `default`, so an artifact can pin the chrome it was authored against by name. `blank` omits the hero, sticky header, navigation, and grouping while retaining the stable root, catalog, theme, and Tailwind. `Htmdx` and `compileToReact()` remain content-only React entrypoints; use `compileDocument(source).element` for the selected full-document layout.

Trusted hosts register custom React layouts with explicit frontmatter-backed slots:

```js
window.Htmdx.registerLayout({
  name: 'decision',
  slots: {
    eyebrow: { from: 'project' },
    byline: { from: 'owner' },
    status: { from: 'phase' },
  },
  Component: ({ children, slots }) =>
    window.Htmdx.React.createElement('main', null, slots.eyebrow, children),
});
```

The `slots` record contains only declared keys; missing fields resolve to `undefined`, and raw frontmatter is not passed. Names collide case-insensitively, built-in names cannot be replaced, and unknown selected names fail clearly.

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

## Validating source

`compile()` stops at the first failure. `validate()` reports every independent
problem at once, each anchored to a position in the source:

```ts
import { validate } from '@wix/htmdx';

for (const { line, column, severity, code, message } of validate(source)) {
  console.log(`${line}:${column} ${severity} ${code} — ${message}`);
}
// 3:1  error    unknown-component — unknown component <Nope>
// 5:10 error    unknown-prop — unknown prop "tone" for <Callout>
// 9:1  warning  image-missing-alt — image has no alt text
```

Positions are 1-based `line`/`column` plus a 0-based `offset` and `length`, so
editors and language servers can underline the exact span. An empty array means
the source is clean. Like `compile()`, this needs a DOM (a browser or jsdom).

To run these checks over files from a terminal or CI, see
[`htmdx lint`](#htmdx-lint), which adds the findings that only apply to a whole
artifact.

## Command line

This package ships an `htmdx` bin, so `npx` runs it without an install. Every
command answers from the runtime doing the answering, so pinning the invocation
to the version an artifact declares gets you the behavior that artifact ships:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.6.0 lint docs/*.htmdx --strict
npx @wix/htmdx@4.6.0 compile report.htmdx --out report-body.html
npx @wix/htmdx@4.6.0 components Callout
```

<!-- x-release-please-end-version -->

| Command             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `lint <files...>`   | Report problems. `validate` is an alias for the same run. |
| `compile <file>`    | Print the `htmdx-app` markup.                             |
| `components [name]` | List the catalog, or describe one component.              |

Exit codes are `0` clean, `1` problems found, and `2` could not run.

### htmdx lint

Runs everything `validate()` reports, plus two findings that only exist once
source is embedded in a page: `unpinned-runtime` (the runtime `<script>` has no
pinned version, so a future release can change the artifact) and
`runtime-version-mismatch` (the artifact pins a version other than the one
linting it). That is why the command is `lint` rather than `validate` — it is a
superset of the API call, checked against a whole file rather than a string.
`validate` is accepted as an alias for anyone who reaches for that name first.

| Option                    | Description                      |
| ------------------------- | -------------------------------- |
| `--format <pretty\|json>` | Output format. Default `pretty`. |
| `--strict`                | Treat warnings as failures.      |

It accepts an HTML artifact — the source comes from its
`<script type="text/htmdx">` block and positions are reported against the
artifact — or a bare source file.

`invalid-html-nesting` comes from React, which remembers which nesting warnings
it has already logged in module state no API resets. Linting many files in one
run reports each distinct violation once, on the first file that has it; lint a
file on its own to see all of them.

### htmdx compile

Prints what `compile()` returns to a JS caller, for pipelines that want the
markup without running the runtime in a browser: a build step, a readable diff
in review, or a server that renders once and serves the result.

| Option             | Description                                 |
| ------------------ | ------------------------------------------- |
| `-o, --out <file>` | Write to a file instead of stdout.          |
| `--layout <name>`  | Document layout, same names as frontmatter. |

It reads a source file or an artifact, the same way `lint` does. A source the
runtime rejects exits `1` with the compile error on stderr.

The output is the `htmdx-app` markup, not a standalone page — it carries the
class names but not the theme, so serving it still means loading the styles the
browser bundle injects.

### htmdx components

Prints the [component manifest](#exact-version-component-manifest) built next to
the bin, so the catalog is the one that version renders. With no argument it
lists every component grouped by source; with a name it prints that component's
purpose, body mode, props, and canonical example.

```bash
$ npx @wix/htmdx components Foldout
Foldout

A collapsible panel: a titled header that expands on click to reveal flexible content (text, tables, charts, or any nested component). Collapsed by default; stack multiple for a group.

body: htmdx  source: built-in

props:
  title: string
    The header text shown in the summary row. Supports inline markdown.
  open: boolean (default false)
    Render the panel expanded on load. Defaults to collapsed.

example:
  <Foldout title="Additional details">
  Any content — text, a table, a chart, or any nested component.
  </Foldout>
```

A name that does not match exits `1` and suggests the closest entries, by
substring and by edit distance, so a typo or a half-remembered name still lands:
`unknown component "Calout"; did you mean Callout?`. `--format json` prints the
manifest entry, or the whole manifest when no name is given — the shape to read
before writing a document rather than guessing at prop names.

## Testing documents

`@wix/htmdx/testing` covers the two things a consumer's test suite needs: get
the source out of a shipped artifact, and snapshot it.

```ts
import { extractSource, snapshot } from '@wix/htmdx/testing';

const source = extractSource(readFileSync('report.html', 'utf8'));

expect(snapshot(source)).toMatchInlineSnapshot(`
  markdown "# Report"
  <Callout>
    text "Ship it."
`);
```

`snapshot()` defaults to `mode: 'structure'` — the component tree as written,
so upgrading the runtime does not churn every snapshot. Pass `mode: 'html'` to
snapshot the rendered markup instead. Either mode throws if the source has
errors, rather than recording the breakage as expected output.
