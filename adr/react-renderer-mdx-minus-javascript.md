# React renderer: MDX minus JavaScript

- Status: accepted
- Date: 2026-07-16

## Context

HTMDX renders agent-editable source strings into inert HTML. Consumers asked
for real component libraries (shadcn/ui specifically), which are React-based:
interactive components (Tabs, Accordion, Dialog) need Radix state and cannot
be expressed as string renderers. Full MDX support would solve this but
requires evaluating agent-generated JavaScript (`@mdx-js/mdx` `evaluate()`
uses `new Function`), which defeats HTMDX's reason to exist.

## Decision

Ship a React renderer as opt-in entries that keep the core string pipeline
untouched:

- `@wix/htmdx/react` — renders HTMDX source to a React element tree with an
  MDX-style `components` map. react/react-dom are optional peer dependencies.
  The string built-in catalog is bridged (raw-body components rendering
  through the existing string renderers), so body contracts, validation, and
  markup stay identical to the string runtime with no catalog fork; a JSX
  rewrite of individual built-ins remains possible later per component.
- `@wix/htmdx/react/shadcn` — vendored shadcn/ui components (new-york) plus a
  Tailwind v4 theme, exposed as a ready components map.
- `dist/browser-react.js` — self-contained IIFE (React + bridged built-ins +
  shadcn pack + theme) that auto-registers, mirroring `dist/browser.js` for
  plain HTML artifacts. On the `Card` name collision the shadcn component
  wins.
- `dist/react-components.json` — exact-version manifest of the React
  runtime's merged component set (built-ins and shadcn, with props and
  examples), mirroring `dist/components.json` for the string runtime.

The language contract is "MDX minus JavaScript": component tags, nested
composition, and attribute props are supported; imports, `{expressions}`, and
function-valued props are unsupported by design. Interactivity comes only from
state inside whitelisted components, never from the source.

Core integration is a single seam: `register()` accepts optional
`render`/`cleanup` overrides so the React path reuses source resolution,
automount, error fallback, and lifecycle events.

Parsing rules: tag scanning runs on `markdownSyntaxSource`-masked text so code
fences are skipped; matching is depth-aware for nested same-name tags; bodies
parse as XML first (case-preserving) with HTML fallback; attributes normalize
`class` -> `className` and kebab-case -> camelCase with typed values
(booleans, numbers, JSON).

## Consequences

- The security claim for the React path is weaker than the string path:
  "whitelisted host components receiving agent-authored data" instead of
  "inert HTML". Documented in the README.
- shadcn's runtime deps (radix, cva, clsx, tailwind-merge, lucide-react)
  become package `dependencies`; the core entry never imports them, but they
  install for all consumers. A separate package split is the escape hatch if
  this becomes a problem.
- Components that are user-code patterns rather than components (shadcn Form,
  Combobox, DataTable) are out of scope permanently; anything needing function
  props cannot be expressed.
- The pack starts with Card, Badge, Button, Tabs, Accordion; growing it is
  additive work per component.
