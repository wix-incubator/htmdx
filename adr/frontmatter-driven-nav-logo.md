# Drive the section-nav logo from frontmatter

Artifacts brand the section nav through frontmatter instead of a logo hardcoded into the runtime CSS. A `logo:` field names the image and an optional `logo-alt:` field supplies its alt text; the runtime renders them as an `<img class="htmdx-nav-logo">` pinned to the bottom-left of the section nav. No frontmatter, no logo — branding is opt-in per artifact.

Frontmatter was chosen over a `register()` option or a DOM slot because artifacts are portable single HTML files: the source block is the only part an author (or agent) edits, and it already carries the document's other presentation metadata (`title`, `project`, `theme`, `owner`, `phase`, `updated`). For the same portability reason, `logo` values should be absolute URLs or `data:` URIs — a relative path breaks as soon as the artifact is opened outside the tree it was authored in.

The Creator Kit logo stays bundled in the runtime for now as the built-in name `creator-kit` (a data URI in `src/logos.ts`, generated from `src/assets/creator-kit-logo.svg`), so artifacts can reference it without carrying ~5KB of base64 in their frontmatter. This is a temporary placement: the runtime is product-agnostic and shipping one product's branding inside it will be revisited once there is a better home for shared brand assets.

## Consequences

- The runtime CSS no longer embeds any logo; `.htmdx-nav-logo` only positions and sizes whatever image the artifact declares.
- `logo` resolves case-insensitively against the built-in names first, then falls through as a literal image URL. Values are HTML-escaped before landing in the `src`/`alt` attributes.
- The logo renders only when the section nav renders (two or more `##` sections).
- Adding future built-in names means editing `src/logos.ts`; removing the Creator Kit bundle later is a breaking change for artifacts that reference `logo: creator-kit` and needs a superseding ADR.
