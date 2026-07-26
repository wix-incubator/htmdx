# Allowlist raw HTML in HTMDX source

- Status: accepted
- Date: 2026-07-26
- Supersedes the scope decision in [support-safe-images](support-safe-images.md)

## Context

`support-safe-images` deliberately stopped at `<img>`: everything else authored
as raw HTML was escaped to literal text at the top level. That kept the
sanitization surface small, but it also meant a report could not link with an
`<a>`, embed a `<video>` or `<iframe>`, or wrap a group of components in a
`<div>` to lay them out. Agents writing artifacts hit this constantly, and their
fallback — describing the media instead of embedding it — is worse output.

The other side of the same gap: inside component bodies, any lowercase tag was
passed through to `createElement` with its attributes mostly intact, so
`<script>` in a body was rendered rather than rejected. The permissive path and
the restrictive path were on the wrong elements.

Component bodies are pre-existing surface, though. Documents already written
against that permissive path have to keep compiling, so tightening it wholesale
would be a breaking change for a feature that is otherwise purely additive.

## Decision

Raw HTML renders from a single allowlist shared by the top level and component
bodies:

- Elements: structural, text-level, table, and media elements
  (`p`, `div`, `section`, `figure`, `details`, `table`, `a`, `span`, `br`,
  `video`, `audio`, `iframe`, and similar). Not on the list: `script`, `style`,
  `form` and controls, `object`/`embed`, `svg`, and unknown tags.
- Attributes: globals (`class`, `id`, `title`, `lang`, `dir`, `role`, `style`,
  `tabindex`, `hidden`), `aria-*`, `data-*`, and a per-element set. Everything
  else is dropped.
- URLs: `href`, `src`, `cite`, `poster`, and `srcset` go through the same
  scheme check as Markdown links. `iframe` cannot set `srcdoc`.
- `style` is parsed into a React style object; declarations with an unsafe
  `url()` or a legacy `expression()` are dropped.
- `on*` attributes fail the compile rather than being silently dropped, because
  an event handler is an attempt to express code.

An allowlisted block element that opens a line owns everything up to its close
tag, following CommonMark's HTML-block rule, so blank lines, Markdown, and
nested component tags inside it keep working. HTML written mid-sentence renders
inline from within its Markdown block. Markup inside code fences and code spans
stays literal.

A tag that is not allowlisted and not a registered component stays literal text
at the top level — the same thing Markdown already did with it.

Inside a component body it keeps the passthrough it has always had, so
documents written against the old behavior still render. The exception is the
set of elements that turn source into code (`script`, `style`, `link`, `meta`,
`base`, `embed`, `object`, `template`), which fail the compile. Text nodes in a
body also keep their wrapper `<span>`; only raw HTML blocks, which are new
surface, emit a Fragment instead.

## Alternatives

- Adding one element at a time (`<video>`, then `<iframe>`, then `<a>`) keeps
  the surface smallest but leaves authors guessing which tags work, and the
  sanitizer has to exist either way.
- Passing raw HTML to `dangerouslySetInnerHTML` after sanitizing with a library
  would import a dependency, lose the React element tree, and stop registered
  components from resolving inside the markup.
- Applying the allowlist to component bodies wholesale is more consistent, but
  it rejects elements that render today, which makes an additive feature a
  breaking release. Closing only the code-execution hole gets the security win
  without the break.

## Consequences

Artifacts can embed media and control layout without a registered component for
every case. The source still cannot express code: no handlers, no expressions,
no non-allowlisted elements.

Existing artifacts keep rendering. Prose containing angle brackets is
unaffected — only allowlisted tag names are treated as markup. The changes an
existing document can observe are all in its favor: `data-*` and `aria-*` in a
component body are no longer mangled into `datay`/`arialabel`, a `style`
attribute in a body no longer fails the render, and a body whose parse falls
back to forgiving HTML no longer reports its own tags as unknown components.
The one tightening is that a non-standard attribute on an allowlisted element
in a body is now dropped instead of passed through.

The cost is two rule domains rather than one: a component body answers to the
passthrough, a raw HTML block answers to the allowlist. That split is written
down where the two diverge in `nodeToReact()`.

Deliberately out of scope: inline `<svg>` (its own attribute space, plus
`<foreignObject>`), `srcdoc` on iframes, and forcing a `sandbox` attribute on
embeds.
