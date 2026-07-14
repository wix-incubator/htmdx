# Design: Color themes for htmdx

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan

## Summary

Add selectable color themes to the htmdx runtime. Every theme keeps the library
identical in structure, typography, spacing, and component behavior — only the
color palette changes hue. Themes share the same "DNA": the same Material 3
tonal positions (contrast, lightness, chroma/saturation), so a theme is the
current purple design rotated to a new hue rather than an independently designed
palette.

Initial set: **Purple** (default, unchanged), **Blue**, **Green**, **Teal**,
**Amber**.

Themes are selected per-artifact (via frontmatter, driven by artifact type
upstream) and previewable in Storybook via a toolbar dropdown.

## Goals

- A theme is a drop-in replacement set of `--md-sys-color-*` token values.
- New themes are generated from a single seed color with guaranteed DNA parity.
- Artifacts declare their theme; different artifact types map to different
  themes (e.g. Product Strategy → purple, Competitors Research → blue).
- Storybook can preview any theme live without editing the artifact.
- Purely additive: the current purple output does not change.

## Non-goals

- Dark mode / multi-mode theming (light only, as today).
- Per-component or user-runtime theme switching inside a rendered artifact.
- A public runtime color-math API. Generation is offline; shipped output is
  static CSS.

## Background: current color system

All colors live as one contract of Material 3 tokens in the `:root` block of
`RUNTIME_CSS` in `packages/htmdx/src/index.ts` (~35 tokens):

- Brand families: `primary`, `on-primary`, `primary-container`,
  `on-primary-container`; same for `secondary`, `tertiary`, `error`.
- Neutrals/surfaces: `surface`, `on-surface`, `surface-variant`,
  `on-surface-variant`, `outline`, `outline-variant`,
  `surface-container-{lowest,low,,high,highest}`, `nav-surface`, `shadow`.
- Semantic aliases derived from the above: chart series (`--md-chart-series-0..4`),
  `--htmdx-green/amber/red/gray` families.

Because every component references these tokens (no hard-coded component colors
except two nav literals — see Risks), swapping token values re-colors the whole
library with no component CSS changes.

An existing `registerTheme({ id, css })` API injects a scoped `<style>`; it is
adjacent prior art but not the delivery mechanism for built-in themes (those
ship inside the runtime).

## Design

### 1. Theming mechanism

- **Default (purple)** stays in the `:root` block of `RUNTIME_CSS`, untouched.
- **Each non-default theme** is an override block scoped by a namespaced
  attribute:

  ```css
  [data-htmdx-theme="blue"] {
    --md-sys-color-primary: #...;
    /* …the complete token set… */
  }
  ```

- Custom properties inherit, so setting `data-htmdx-theme` on the rendered
  `.htmdx-app` wrapper re-colors everything inside it. Derived aliases (chart
  series, `--htmdx-*`, hover tints) follow automatically.
- Per-host: two artifacts on one page may use different themes.

### 2. Theme selection & precedence

Highest priority first:

1. **Storybook toolbar** (preview only): a decorator sets `data-htmdx-theme` on
   the rendered `.htmdx-app` root after render, overriding the artifact value.
2. **Artifact frontmatter** `theme: <id>`: parsed by the existing
   `parseFrontmatter`; `renderDocument` validates it against the known theme set
   and stamps `data-htmdx-theme` onto `.htmdx-app`.
3. **Default**: absent or unknown value → no attribute → purple. Unknown values
   fall back to purple (optionally a `console.warn`).

The artifact-type → theme mapping is a Creator Kit template convention (each
type's template writes the appropriate `theme:` field); the runtime only
consumes the resolved value.

### 3. Palette generation (the DNA guarantee)

- An **offline generator script** (`scripts/generate-themes.*`) uses Material's
  HCT color system (via `@material/material-color-utilities` or equivalent).
- It derives the **tone + chroma positions** occupied by the purple palette
  (reverse-engineered from the current committed values, including hand-tweaks)
  and re-applies those same positions to each seed hue. Identical tone ⇒
  identical contrast/lightness; only hue moves.
- **Chroma is held to a consistent target** across themes so Blue/Green/Teal/
  Amber read as saturated as Purple, rather than inheriting each seed's own
  chroma.
- **Neutrals and surfaces re-hue** with the same faint tint toward the theme hue
  that purple's surfaces carry today — that tint is part of the DNA.
- Output is **committed static CSS** injected alongside `RUNTIME_CSS`. No runtime
  color-math dependency; still hand-tweakable after generation.
- **Purple ships as its current hand-tweaked values** (the reference). The four
  new themes are generated to match its structure. Adding a future theme = add a
  seed and re-run the generator.

### 4. Components / files

- `scripts/generate-themes.*` — dev-time generator; not shipped in the bundle.
- `packages/htmdx/src/themes.*` — generated token blocks (committed); exported as
  a CSS string and injected together with `RUNTIME_CSS`.
- `packages/htmdx/src/index.ts` — inject theme CSS; `renderDocument` reads
  `meta.theme`, validates against the known theme ids, stamps
  `data-htmdx-theme` on `.htmdx-app`.
- `packages/htmdx/.storybook/preview.ts` — `globalTypes` toolbar entry + a
  decorator that applies the selected theme to rendered stories.

### 5. Data flow

```
frontmatter theme: blue
  → parseFrontmatter(meta.theme = "blue")
  → renderDocument validates against THEME_IDS
  → <div class="htmdx-app" data-htmdx-theme="blue">
  → [data-htmdx-theme="blue"] token overrides cascade to all descendants

Storybook: toolbar global "theme" → decorator sets data-htmdx-theme on
.htmdx-app post-render (overrides frontmatter for preview).
```

### 6. Error handling / fallback

- Unknown or missing `theme:` → default purple (no attribute). Never an error.
- Invalid frontmatter → ignored (existing behavior); theme just defaults.

## Testing

- **Compile**: `theme: blue` → rendered root carries `data-htmdx-theme="blue"`;
  unknown/absent → no attribute (purple).
- **Parity snapshot**: every theme defines the complete token set (no token
  missing versus the purple contract). Guardrail against silent drift.
- **Contrast assertion**: for each theme, key `on-X` vs `X` pairs meet **WCAG AA**
  — 4.5:1 for normal text (e.g. `on-surface`/`surface`, `on-primary-container`/
  `primary-container`) and 3:1 for large text and non-text UI (e.g. `outline`
  against surfaces). Automated proof the DNA and accessibility held across hues.
  Seed colors for Blue/Green/Teal/Amber are tuned during implementation to
  satisfy this bar while matching purple's chroma.

## Risks / open considerations

- **Warm-hue contrast (Amber):** warm hues at the same tone can read slightly
  lower-contrast. The generator may nudge Amber's tones to preserve parity —
  still "same DNA," acknowledging perceptual reality. The contrast test enforces
  the floor.
- **Two non-tokenized literals:** `#DCDAF7` (active nav background) and `#24172C`
  (active nav text) are hard-coded and would NOT re-hue. To keep the nav
  consistent across themes, promote these to tokens (e.g. a nav-active pair) as
  part of this work.
- **Generator dependency** is dev-only; the shipped bundle stays dependency-free
  because output is baked.
```
