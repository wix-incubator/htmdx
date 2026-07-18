# User stories

HTMDX helps an agent create a rich, portable document that a person can read
and edit without adopting an application toolchain. These stories describe the
authoring experience behind the component catalog. They do not introduce new
APIs.

## Start with a document, not configuration

As an author, I want ordinary Markdown to produce a useful document so I can
start writing without learning HTMDX metadata or components.

```mdx
# Checkout migration

We need to decide whether to migrate the remaining payment flows this quarter.
```

The first heading supplies the document title. Frontmatter and components are
optional.

## Express common document intent directly

As an agent, I want components that represent conclusions, metrics, findings,
evidence, and risks so I do not have to rebuild their visual structure from
primitives every time.

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

## Fall back to familiar composition

As an agent, I want canonical shadcn component names when no semantic component
fits so I can compose a custom structure without adding another runtime.

```mdx
<Alert>
  <AlertTitle>Migration window</AlertTitle>
  <AlertDescription>Changes freeze Friday at 18:00 UTC.</AlertDescription>
</Alert>
```

HTMDX ships a curated shadcn subset, not arbitrary React or every upstream
component. The exact runtime manifest decides which names and props are valid.

## Discover what this artifact can use

As an agent, I want a machine-readable catalog for the exact runtime version so
I can learn HTMDX-specific components and verify familiar shadcn APIs before I
write source.

An artifact that imports:

```html
<script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/browser.js" defer></script>
```

uses the matching catalog:

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.0.0/dist/components.json
```

The manifest identifies each component as `built-in` or `shadcn` and defines
its purpose, body mode, canonical example, and supported props.

## Keep one portable artifact

As a recipient, I want one HTML file that opens without a build step so I can
view, send, and archive the document without recreating its development setup.

The artifact pins one `browser.js` version. The same runtime renders semantic
components, shadcn components, the document chrome, and the theme.

## Constrain authoring without changing the file format

As a product owner, I want agent guidance to prefer or require semantic
components so generated documents stay consistent with my product, without
needing a separate HTMDX distribution.

Consumer guidance may filter the manifest by `source: "built-in"` or recommend
a smaller approved list. The shipped runtime remains unchanged, so the artifact
stays portable and another consumer can still render it.

## Add a product-specific component

As a host developer, I want to register a trusted React component when neither
the semantic catalog nor shadcn expresses my product concept.

```js
window.Htmdx.registerComponent({
  name: 'CheckoutFunnel',
  purpose: 'Show completion at each checkout step.',
  example: '<CheckoutFunnel source="weekly" />',
  body: 'none',
  props: [{ name: 'source', type: 'string', required: true }],
  Component: CheckoutFunnel,
});
```

The host owns and trusts the implementation. Artifact source supplies only
declared data and cannot replace a shipped or previously registered name.

## Stories not decided yet

The component-catalog decision does not settle these layout stories:

- As an author, I want `layout: blank` when I need raw source order without the
  default document chrome.
- As a host developer, I want to register a layout that can render named slots
  from frontmatter.
- As a recipient, I want custom layouts to preserve the same one-file
  portability as the default layout.

These need a separate decision covering layout ownership, frontmatter, fallback
behavior, and portability. Until then, `layout`, layout registration, and
layout-owned frontmatter fields are not public APIs.
