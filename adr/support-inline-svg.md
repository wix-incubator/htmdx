# Support inline SVG behind its own allowlist

- Status: accepted
- Date: 2026-07-26
- Extends [allowlist-raw-html](allowlist-raw-html.md), which left SVG out of scope

## Context

`allowlist-raw-html` deliberately excluded inline `<svg>`: it has its own
element and attribute space, and `<foreignObject>` reopens the HTML surface from
inside a graphic. That left artifacts without any way to draw. An agent writing
a report that needs a chart, a diagram, or a status icon has to either link an
external image, which a saved artifact cannot carry, or describe the picture in
prose.

Two properties of SVG shape any implementation. Element and attribute names are
case sensitive — `linearGradient`, `clipPath`, `viewBox` — while HTML's are not.
And the runtime's forgiving HTML parse, which takes over whenever a bare
attribute appears anywhere in a block, uppercases every tag name it sees.

## Decision

Inline SVG renders from a second allowlist in `src/components/svg-elements.ts`,
independent of the HTML one:

- Elements: shapes (`path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`,
  `rect`), structure (`svg`, `g`, `defs`, `symbol`, `title`, `desc`), paint
  (`linearGradient`, `radialGradient`, `stop`, `pattern`, `clipPath`, `mask`,
  `marker`), text (`text`, `tspan`, `textPath`), and a filter subset.
- Attributes: globals, `aria-*`, `data-*`, the shared presentation attributes,
  and a per-element geometry set. `on*` fails the compile.
- Values: a `url()` must be a same-document `url(#id)` reference. `href` is
  accepted only where an element needs one to function — `textPath` — and only
  as a `#fragment`.

The allowlist is keyed by lowercase and resolves to canonical casing, so both
parse paths land on the same element and `<lineargradient>` is corrected rather
than rejected.

Not allowlisted: `<script>`, `<foreignObject>`, `<use>`, `<image>`, `<a>`,
`<style>`, and the animation elements (`animate`, `animateTransform`,
`animateMotion`, `set`). Each is a way out of the graphic. They degrade to the
text they were written as, matching what a non-allowlisted HTML tag does at the
top level.

Inside an `<svg>` subtree, SVG's element space wins over both HTML and the
component catalog: `<text>` and `<path>` are SVG, whatever else is registered
under those names. A component tag written inside a graphic fails the compile
with a message that says so, rather than being reported as unknown. Text nodes
render as written, because Markdown has no meaning inside `<text>`.

Only `<svg>` itself is scanned for by the tokenizer. Everything between it and
its close tag is one block, so the element names inside a graphic never compete
with Markdown, and a bare `<path>` written in prose stays literal text.

## Alternatives

- Extending the HTML allowlist with SVG names would collapse two attribute
  spaces into one map and lose case sensitivity, so `<clipPath>` and a
  hypothetical HTML `clippath` could not be told apart.
- Sanitizing with an existing library (DOMPurify and similar) would import a
  dependency, lose the React element tree, and stop the runtime from reporting
  diagnostics per element.
- Allowing `<use href="#id">` restricted to fragments is defensible and would
  make icon sprites work. It was left out to keep the first cut narrow; the
  fragment check that `textPath` uses is what it would need.

## Consequences

Artifacts can draw. Charts, diagrams, and icons live in the source and survive
being saved as a single file, with no image hosting and no new component.

The cost is a second allowlist to maintain, and a third rule domain inside
`nodeToReact()` alongside the component body and the raw HTML block. Each is
selected by a flag on `NodeContext`.

Purely additive: SVG was literal text before, so no existing document changes
meaning. `HtmdxDiagnosticCode` gains no new member — a component inside a
graphic reports the existing `html-element-not-allowed`.

Deliberately out of scope: `<use>`, `<image>`, animation, `<foreignObject>`,
and SVG inside a `srcdoc` or an external file. Filters are included but
`<feImage>` is not, because it loads an external document.
