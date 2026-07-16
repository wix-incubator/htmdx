# React-only runtime: MDX minus JavaScript

- Status: accepted
- Date: 2026-07-16

## Context

HTMDX originally rendered agent-editable source strings into inert HTML.
Consumers asked for real component libraries (shadcn/ui specifically), which
are React-based: interactive components (Tabs, Accordion) need Radix state
and cannot be expressed as string renderers. Full MDX support would solve
this but requires evaluating agent-generated JavaScript (`@mdx-js/mdx`
`evaluate()` uses `new Function`), which defeats HTMDX's reason to exist.

A React renderer was first added alongside the string pipeline (separate
`browser-react.js` bundle, string built-ins bridged). Maintaining two
renderers meant two visual systems, two manifests, and duplicated document
chrome. The package has no external consumers yet, so the breaking change was
cheap.

## Decision

HTMDX is React-only. There is one renderer, one component catalog, one
manifest, one browser bundle.

- `@wix/htmdx` — core runtime: `register()` mounts React roots into
  `htmdx-code` hosts; `compile()` returns a static HTML snapshot of the same
  tree via `renderToStaticMarkup`. react/react-dom are optional peer
  dependencies for module consumers.
- Built-ins are React components. Markdown-bodied ones (ExecutiveSummary,
  Callout, ...) are fully composable — nested components work inside them.
  Structured-bodied ones (MetricStrip, charts, tables) receive the raw HTMDX
  body and keep their body contracts: parsing, validation, and content markup
  reuse the existing helpers.
- `@wix/htmdx/react/shadcn` — vendored shadcn/ui components (new-york) plus a
  Tailwind v4 theme. Included in the default runtime; on the `Card` name
  collision the shadcn component wins.
- `dist/browser.js` — self-contained IIFE (React + built-ins + shadcn pack +
  theme + Tailwind injection) that auto-registers. It also exposes the
  bundled React on `window.Htmdx.React` for extension scripts.
- `dist/components.json` — exact-version manifest of the merged catalog with
  props, allowed values, and examples.
- The extension API (`registerComponent(s)`) takes React components. The
  previous string-renderer extension contract was removed.

The language contract is "MDX minus JavaScript": component tags, nested
composition, and attribute props are supported; imports, `{expressions}`, and
function-valued props are unsupported by design. Interactivity comes only
from state inside whitelisted components, never from the source. Unknown
capitalized tags fail compilation so agents get feedback instead of silently
degraded output.

Parsing rules: tag scanning runs on `markdownSyntaxSource`-masked text so
code fences are skipped; matching is depth-aware for nested same-name tags;
bodies parse as XML first (case-preserving) with HTML fallback; attributes
normalize `class` -> `className` and kebab-case -> camelCase with typed
values (booleans, numbers, JSON).

## Consequences

- The security claim is "whitelisted host components receiving agent-authored
  data", not "inert HTML". The source still cannot express code. Documented
  in the README.
- `compile()` needs a DOM (`DOMParser`) for component bodies; bare Node
  callers need jsdom. Static output loses interactivity by definition.
- `dist/browser.js` grows from 32KB to ~147KB gzip (React, the pack, and the
  static-render path that powers `compile()`).
- shadcn's runtime deps (radix, cva, clsx, tailwind-merge, lucide-react) are
  package `dependencies`.
- Components that are user-code patterns rather than components (shadcn Form,
  Combobox, DataTable) are out of scope permanently; anything needing
  function props cannot be expressed.
- Saved artifacts pinning already-published string-runtime versions keep
  working — exact-version pinning is the compatibility mechanism.
