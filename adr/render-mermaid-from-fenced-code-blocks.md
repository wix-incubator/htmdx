# Render mermaid diagrams from fenced code blocks

- Status: accepted
- Date: 2026-07-26
- Extends [support-inline-svg](support-inline-svg.md), which gave artifacts a way
  to draw but not a way to describe

## Context

`support-inline-svg` let an artifact carry a graphic, but the graphic has to be
drawn by hand: an agent writing a report about a flow has to compute the
coordinates of every box and arrow. Mermaid is the notation agents already write
for that, and every surface an htmdx artifact competes with — GitHub, Notion,
Obsidian, VS Code — renders a ` ```mermaid ` fence.

Three constraints shape any implementation:

- Mermaid is several times the size of the whole htmdx runtime. Bundling it
  would make every artifact pay for a capability most do not use.
- `compile()` is synchronous and is what produces `dist`-time HTML. Mermaid's
  `render()` is a promise, and it needs a DOM to measure text in.
- Mermaid's SVG is a string produced by a third party. It normally goes into a
  page through `innerHTML`, which is exactly the door the two allowlists exist
  to close.

## Decision

A fence whose info string is `mermaid` renders as a `MermaidDiagram` component
instead of `<pre><code>`. Everything else about the fence scanner is unchanged;
the info string now also survives as a `language-*` class on any other fence.

**Not bundled.** Mermaid is fetched with a dynamic `import()` the first time a
diagram actually mounts, from `DEFAULT_MERMAID_SRC` on jsdelivr. This is the
trade `injectTailwindBrowser` already makes, with one difference: Tailwind is
injected during `register()`, while mermaid is not fetched until a document
turns out to contain a diagram. Hosts opt out with `register({ mermaid: false })`
or mirror it with `register({ mermaid: { src } })`.

**Browser-only, source-preserving.** `compile()` emits the fence markup, and the
component replaces itself once mermaid resolves. A compiled artifact that never
reaches a browser, one whose fetch fails, and one whose diagram is invalid all
show the same thing: the diagram source, which is what the author wrote.

**The output answers to the SVG allowlist.** The rendered string is parsed with
`DOMParser` and rebuilt as React elements through `SVG_ELEMENTS` and
`safeSvgProps`. Nothing is inserted as markup. `<foreignObject>`, `<use>`,
`<image>`, `on*`, and any `href` that leaves the document are dropped by the
rules already written for authored SVG, whatever the library emits.

**Mermaid is configured to stay inside those rules.** `securityLevel: 'strict'`
disables `click` handlers, and `htmlLabels: false` (plus `flowchart.htmlLabels`)
makes labels `<text>`/`<tspan>` rather than HTML in a `<foreignObject>` the
allowlist would drop. Those keys are listed in mermaid's `secure` array, so an
in-source `%%{init: ...}%%` directive cannot raise them.

**The stylesheet is lifted, not inlined.** Mermaid puts a `<style>` inside the
graphic. `<style>` is not in the SVG allowlist and is not going to be, so its
text is hoisted to a sibling element and filtered as a whole: a stylesheet
containing `@import`, `image-set()`, `expression()`, or a non-fragment `url()`
is dropped entirely rather than repaired. Mermaid scopes its CSS to the diagram
id, so the styles stay local without further rewriting.

## Alternatives

- **Bundle mermaid.** Rejected on size: every artifact would carry it, and the
  runtime's small single-file footprint is the reason artifacts are portable.
- **Render at compile time.** Rejected because `compile()` is synchronous and
  mermaid needs a DOM to measure text. An async `compile()` would be a breaking
  change to every caller for a feature only browsers can use.
- **Insert mermaid's SVG with `dangerouslySetInnerHTML`.** This is what every
  other integration does. Rejected: it makes a third-party library's output the
  one place in the runtime that bypasses the allowlists.
- **Sanitize with DOMPurify.** Rejected for the reason `support-inline-svg` gave:
  a dependency, no React element tree, and a second security model to keep in
  sync with the one authored SVG already uses.
- **A `<Mermaid>` component.** Rejected: the fence is the notation agents already
  write, and it degrades to readable source in every other renderer.

## Consequences

An artifact can describe a flow instead of drawing one, and the diagram is still
editable text in the source block.

The runtime gains a network dependency it did not have — but only for documents
that contain a diagram, and only in a browser. Offline or CDN-blocked pages show
the fence.

Rendering is now split across two moments: `compile()` produces the fence and the
browser upgrades it. Tests that assert on `compile()` output see the fence, not
the SVG; the diagram is proven end to end in Playwright instead.

Attribute losses are accepted where mermaid decorates rather than draws — a
`title` on `<g>`, a `name` on a shape. They are cosmetic, and widening the
allowlist for them would weaken the guarantee this ADR depends on.

Out of scope: rendering diagrams at compile time, self-hosting mermaid inside
the package, mermaid's `click` interactions, and any diagram type that requires
`<foreignObject>` to draw.
