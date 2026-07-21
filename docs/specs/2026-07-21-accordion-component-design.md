# Foldout component — design

Date: 2026-07-21
Status: approved (pending spec review)

## Summary

Add a new built-in component, `Foldout`: a single collapsible panel with a
bold title row and a purple chevron button. Closed by default; clicking the
header expands it to reveal flexible content. Stack multiple `<Foldout>` tags
to form a group.

## Motivation

Authors need a way to tuck secondary or lengthy content (details, supporting
data, a chart, a table) behind a toggle so the page stays scannable. No existing
built-in offers progressive disclosure.

## Public contract

```html
<Foldout title="Title of accordion">
Any content — text, a <ChartBar>, a table, or any registered component.
</Foldout>
```

- `body: 'htmdx'` — the nested content is handed to the React component as
  `children`, so Markdown, HTML, and nested registered components all render.
- Props:
  - `title` (string, supports inline markdown) — the header text.
  - `open` (boolean, default `false`) — optional; when set, renders
    `<details open>` so the panel starts expanded. Default keeps it collapsed.

## Mechanism

Native `<details>`/`<summary>`. Consequences:

- Toggles with **zero JavaScript** — behaves identically in the live browser
  runtime and in `compile()`'s static HTML snapshot.
- Keyboard- and screen-reader-accessible for free.
- Closed by default; `open` maps directly to the element's `open` attribute.

## Structure

```
<section data-htmdx-component="Foldout" class="htmdx-component">   ← via StructuredBlock
  <details class="group rounded-lg border bg-card">
    <summary> title (bold, left)  •  purple chevron button (right) </summary>
    <div class="border-t px-4 py-3">{children}</div>                 ← visible only when open
  </details>
</section>
```

The component wraps its markup in the shared `StructuredBlock` (same
`<section data-htmdx-component=...>` shell every built-in uses).

## Styling

All Tailwind utilities, consistent with `BulletList` and `Stat`; no new runtime
CSS.

- Card: `rounded-lg border bg-card`.
- Summary: flex row, `cursor-pointer`, native disclosure marker hidden
  (`list-none [&::-webkit-details-marker]:hidden`), title `font-bold
  text-card-foreground`.
- Chevron button: `size-7 rounded-md`, `bg-[var(--md-sys-color-primary)]` (the
  purple) with a white down-chevron SVG (`text-[var(--md-sys-color-on-primary)]`).
  Rotates 180° when open via `group-open:rotate-180 transition-transform`,
  giving the down→up flip shown in the reference screenshots.
- Content: `border-t`, `px-4 py-3`, `text-sm text-card-foreground`.

The dashed "CONTENT AREA HERE" box in the reference screenshot is demo
placeholder content, not part of the component — the component renders whatever
children it is given.

## Files

- `src/components/builtins/Foldout/Foldout.tsx` — the React component.
- `src/components/builtins/Foldout/index.ts` — the `HtmdxComponent` definition
  (name, purpose, example, `body: 'htmdx'`, props, Component).
- `src/components/builtins/Foldout/Foldout.stories.ts` — `Default` (plain
  text) and `WithRichContent` (a nested chart) stories.
- `src/components/builtins/index.ts` — one export line (alphabetical, after
  `Finding`). This auto-registers the component into the runtime registry and
  the manifest; no manual manifest edits.

## Testing

Add cases to `test/react-builtins.spec.ts`, using its existing
`compileToReact` + `renderToStaticMarkup` pattern, asserting:

- Renders a `<details>` **without** the `open` attribute by default (collapsed).
- Renders `<details open>` when the `open` prop is set.
- Renders the `title` text in the `<summary>`.
- Renders nested children, including a nested registered component, inside the
  content area.

## Non-goals (YAGNI)

- No smooth height animation on expand/collapse — the chevron rotates; the panel
  opens instantly (native `<details>` behavior).
- No multi-item accordion group in a single tag (compose by stacking).
- No "only one open at a time" coordination between panels.
