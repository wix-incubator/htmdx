# Product stories and public API

HTMDX helps an agent create a rich, portable document that a person can view,
send, archive, and edit without adopting an application toolchain. This document
shows the complete product model under review: the user stories, authoring
examples, current API, and proposed layout API.

The status labels matter:

- **Current** is implemented in `@wix/htmdx@4.0.0`.
- **Proposed** is the recommended next contract but still needs an ADR and
  implementation.
- **Open** needs a product decision before it becomes public API.

## The default experience

### Start with a document, not configuration — Current

As an author, I want ordinary Markdown to produce a useful document so I can
start writing without learning metadata or components.

```mdx
# Checkout migration

We need to decide whether to migrate the remaining payment flows this quarter.
```

The first heading supplies the title. Frontmatter and components are optional.
The default document chrome is applied automatically.

### Express common document intent directly — Current

As an agent, I want components that represent conclusions, metrics, findings,
evidence, and risks so I do not rebuild their visual structure from primitives
every time.

```mdx
# Checkout migration

<ExecutiveSummary>
Migrate the remaining flows in two stages and keep conversion at or above the
current baseline.
</ExecutiveSummary>

<MetricStrip>
- ↑ Migrated volume: **72%** — current coverage
- ⊘ Checkout conversion: **guardrail** — hold at or above baseline
</MetricStrip>
```

The component names keep the source readable, while each component owns its
presentation and body contract.

### Fall back to familiar composition — Current

As an agent, I want canonical shadcn component names when no semantic component
fits so I can compose a custom structure without loading another runtime.

```mdx
<Alert>
  <AlertTitle>Migration window</AlertTitle>
  <AlertDescription>Changes freeze Friday at 18:00 UTC.</AlertDescription>
</Alert>
```

HTMDX ships a curated shadcn subset, not arbitrary React or every upstream
component. The exact runtime manifest decides which names and props are valid.

### Keep one portable artifact — Current

As a recipient, I want one HTML file that opens without a build step so I can
view, send, and archive the document without recreating its development setup.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js" defer></script>
  </head>
  <body>
    <!-- prettier-ignore -->
    <script type="text/htmdx">
# Checkout migration

<ExecutiveSummary>
Migrate in two stages.
</ExecutiveSummary>
    </script>
  </body>
</html>
```

The pinned runtime renders Markdown, semantic components, shadcn components,
document chrome, and the theme.

### Edit the source instead of generated markup — Current

As an agent or technical reader, I want to edit the HTMDX source block so a
small content change does not require understanding generated React markup or
compiled HTML.

The source block remains inside the artifact. `compile()` is for snapshots and
validation; its output is not a second source file that authors must keep in
sync.

## Component discovery and extension

### Discover what this artifact can use — Current

As an agent, I want a machine-readable catalog for the exact runtime version so
I can learn HTMDX-specific components and verify familiar shadcn APIs before I
write source.

The runtime URL:

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js
```

has a matching catalog:

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/components.json
```

The manifest identifies each component as `built-in` or `shadcn` and defines
its purpose, body mode, canonical example, and supported props.

### Constrain authoring without changing the runtime — Current

As a product owner, I want agent guidance to prefer or require semantic
components so generated documents stay consistent with my product, without
needing a separate HTMDX distribution.

Consumer guidance may filter the manifest by `source: "built-in"` or recommend
a smaller approved list. The runtime still ships both component layers, so the
artifact remains portable.

### Add a product-specific component — Current

As a host developer, I want to register a trusted React component when neither
the semantic catalog nor shadcn expresses my product concept.

```js
const { createElement } = window.Htmdx.React;

window.Htmdx.registerComponent({
  name: 'CheckoutFunnel',
  purpose: 'Show completion at each checkout step.',
  example: '<CheckoutFunnel source="weekly" />',
  body: 'none',
  props: [{ name: 'source', type: 'string', required: true }],
  Component: ({ source }) => createElement('div', null, `Checkout funnel: ${source}`),
});
```

The host owns and trusts the implementation. Artifact source supplies only
declared data and cannot replace a shipped or registered name.

## Layouts

### Use the standard document layout without configuration — Proposed

As an author, I want the standard document presentation by default so the
common case stays as short as plain Markdown.

No frontmatter is required:

```mdx
# Checkout migration

Decision content starts here.
```

This is equivalent to:

```mdx
---
layout: default
---

# Checkout migration
```

`default` owns the document chrome, heading-derived title, section navigation,
and normal content width. The name is explicit in the API but omitted in the
normal authoring path.

Current v4 frontmatter also recognizes `title`, `project`, `owner`, `phase`,
`updated`, `theme`, `logo`, and `logo-alt`. None is required. The proposed
layout model treats presentation metadata as layout-owned rather than expanding
that list into a permanent global schema.

### Remove the document chrome — Proposed

As an author, I want a blank layout when I need full control over source order
and composition.

```mdx
---
layout: blank
---

# Checkout migration

<Card>
  <CardHeader>
    <CardTitle>Migration status</CardTitle>
  </CardHeader>
  <CardContent>Ready for the first cohort.</CardContent>
</Card>
```

`blank` preserves source order and headings. It omits the hero, sticky header,
section navigation, and automatic section grouping. It keeps a stable root,
the component catalog, Tailwind support, and the selected color palette.

Unknown layout names fail compilation instead of silently changing the
document structure.

### Register a product layout — Proposed

As a host developer, I want to register a layout that maps document metadata to
named presentation slots while keeping the source declarative.

Recommended registration shape:

```js
window.Htmdx.registerLayout({
  name: 'decision',
  slots: {
    eyebrow: { from: 'project' },
    byline: { from: 'owner' },
    status: { from: 'phase' },
  },
  Component: DecisionLayout,
});
```

The artifact selects it and supplies only the fields that this layout uses:

```mdx
---
layout: decision
project: Payments
owner: Dana
phase: Decision
---

# Checkout migration
```

The active layout owns the meaning and presentation of `project`, `owner`, and
`phase`; they are not required global HTMDX fields. The runtime resolves each
declared slot from frontmatter and passes the remaining document content to the
layout component.

The recommended first contract keeps frontmatter flat. A layout declares the
fields it consumes through `slots`, so unused fields do not become part of the
core API. Prefixing or nesting layout data is unnecessary unless real layouts
later demonstrate a collision that the slot declaration cannot resolve.

This keeps the default path small while allowing a product to define its own
document shell. A registered layout must travel with the artifact or its host;
otherwise the file is not independently portable. How custom layout code is
embedded or referenced is still open.

### Select a layout outside frontmatter — Proposed

As a host developer, I want an explicit option to choose or enforce a layout so
the host can control presentation without rewriting source.

```js
window.Htmdx.register({ layout: 'blank' });
```

```ts
compile(source, { layout: 'blank' });
```

A host option overrides frontmatter. Without either value, the runtime uses
`default`.

## Color and presentation

### Choose a built-in color theme — Current

As an author, I want to select a supported color treatment without changing the
document structure.

```mdx
---
theme: blue
---

# Checkout migration
```

The default theme is used when the field is omitted. `registerTheme()` lets a
trusted host inject additional theme CSS, but v4 frontmatter recognizes only
the built-in `THEME_IDS`.

### Choose colors independently from structure — Open

As an author, I want to change colors without changing the document layout.

The proposed authoring model separates the two axes:

```mdx
---
layout: default
palette: blue
---
```

`layout` controls structure. `palette` controls color tokens. The current v4
API uses `theme: blue` and `registerTheme()`. Before introducing `palette`, we
must decide whether it replaces `theme`, aliases it, or remains a documentation
term only.

## Public API map

| Surface | Status | Contract |
| --- | --- | --- |
| `<script type="text/htmdx">` and `<htmdx-code>` | Current | Hold inline or external HTMDX source. |
| `dist/browser.js` | Current | One pinned browser runtime with React, Built-ins, shadcn, theme, and Tailwind support. |
| `dist/components.json` | Current | Exact-version component discovery and validation contract. |
| Frontmatter | Current | Optional `title`, `project`, `owner`, `phase`, `updated`, `theme`, `logo`, and `logo-alt`. Proposed `layout`; palette naming remains open. |
| `layout: default \| blank \| <registered-name>` | Proposed | Select document structure; omitted means `default`. |
| `registerLayout(definition)` | Proposed | Register a trusted layout, its frontmatter-to-slot mapping, and its React implementation. |

### Current JavaScript and React exports

The package and `window.Htmdx` expose the same runtime functions. The browser
global additionally exposes its bundled `React` instance for trusted extension
scripts.

| Export | Purpose |
| --- | --- |
| `compile(source, options)` | Render source to `{ ok, html, components }` using the bundled and optional component definitions. Proposed `options.layout`. |
| `register(options)` | Register browser hosts and configure `tagName`, `sourceSelector`, `theme`, `tailwind`, `automount`, and optional definitions. Proposed `options.layout`. |
| `registerComponent(definition, options)` | Add one trusted component definition. Rerenders by default. |
| `registerComponents(definitions, options)` | Add several trusted component definitions atomically. Rerenders by default. |
| `registerTheme(theme, options)` | Inject trusted theme CSS and optionally rerender. |
| `rerender(options)` | Rerender registered hosts after an extension or external change. |
| `compileDocument(source, options)` | Produce the full document element plus title, headings, components, and parsed metadata. |
| `compileToReact(source, options)` | Produce the source-order React element tree without document chrome. |
| `Htmdx` | React component wrapper around `compileToReact`. Proposed `layout` prop remains open. |
| `listComponents(source, definitions)` | Return component names used by source, using definitions for canonical casing. |
| `tokenizeBlocks(source, options)` | Return Markdown and component blocks for tooling. |
| `canonicalComponentName(name, options)` | Resolve a component name using the active catalog's canonical casing. |
| `tokenizeSource(source, definitions)` | React-entry tokenizer for Markdown and component blocks without the bundled catalog. |

The package also exports `VERSION`, `THEME_IDS`, `DEFAULT_TAG_NAME`,
`DEFAULT_TAILWIND_BROWSER_SRC`, `injectShadcnTheme`, and the corresponding
TypeScript option, result, token, theme, and component-definition types.

### Current package entries

| Entry | Purpose |
| --- | --- |
| `@wix/htmdx` | Browser registration, static compile, extension APIs, and shared runtime types. |
| `@wix/htmdx/react` | `Htmdx`, `compileToReact`, and document-rendering APIs for React hosts. |
| `@wix/htmdx/components` | Component-definition types plus `createDefinitionRegistry`, `validateDefinition`, and `validateConstraints`. |
| `@wix/htmdx/components/builtins` | Semantic component definitions. |
| `@wix/htmdx/components/shadcn` | Curated canonical shadcn component definitions. |

The [README](../README.md) remains the reference for implemented v4 syntax and
APIs. Proposed layout examples in this document are review material until a
layout ADR is accepted and the runtime implements them.

## Product boundary

HTMDX is for rich documents and artifacts, not full applications. It provides:

- Markdown as the shortest useful starting point.
- Semantic components for recurring document intent.
- Canonical shadcn names as the composition fallback.
- Trusted React extensions implemented by the host, not authored in HTMDX.
- One pinned runtime and one exact-version discovery contract.
- A default document layout, with blank and registered layouts proposed as the
  structural escape hatches.

It does not promise arbitrary React source, every shadcn component, callbacks
or imports inside HTMDX, or a replacement for ordinary Markdown when rich
presentation is unnecessary.
