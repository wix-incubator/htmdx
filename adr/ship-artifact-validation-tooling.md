# Ship artifact validation from the runtime package

- Status: proposed
- Date: 2026-07-26

## Context

HTMDX artifacts are written by agents and reviewed by humans, but nothing checks one
short of rendering it in a browser. The checks themselves already exist: the renderer
throws on unknown components, unknown or mistyped props, body-mode violations, brace
expressions, imports, event handlers, unclosed tags, and unknown layouts.

They are not reachable as a tool. `compile()` reports only the first failure, as a bare
string, with no source position. The package declares no `bin`, so checking an artifact
means writing a test file. Some failure modes are silent by design: an unknown `theme`
falls back to `blue` and unknown frontmatter fields are ignored, with no signal either way.

Exposing this raises a packaging question. Artifacts pin an exact runtime version and
render against that version's component contract, so validation is only meaningful against
the same contract. Validation also needs a DOM — tree construction uses `DOMParser` and the
static snapshot requires a `document`.

## Decision

Validation ships in three layers, all from `@wix/htmdx`.

`validate()` returns `HtmdxDiagnostic[]`, where each diagnostic carries a kebab-slug code,
severity, message, and source position. Errors are collected per top-level block rather
than aborting on the first, and existing silent fallbacks are reported as warnings.
`compile()` keeps its current signature and result shape.

`@wix/htmdx/testing` exports source extraction and snapshot helpers for consumers testing
their own artifacts. Snapshots default to the component tree rather than rendered markup,
because compiled HTML changes with routine Tailwind and shadcn updates and would fail
consumer tests without indicating anything about the artifact.

An `htmdx` bin in the same package provides `htmdx lint`, adding file handling, reporters,
and the two artifact-level findings — `unpinned-runtime` and `runtime-version-mismatch`.
It defines no rules of its own. jsdom becomes a runtime dependency; it is Node-only and
never enters a browser bundle.

Version matching is delegated to the package manager. `npx @wix/htmdx@4.0.0 lint` runs the
linter at exactly the catalog an artifact pinned, so the CLI needs no runtime resolution,
no cache, and no `--runtime` override.

## Alternatives

- **A separate `@wix/htmdx-cli` package.** Keeps a Node-only dependency out of a
  browser-facing runtime, and was the initial decision here. It was reversed: the package
  already depends on `lucide-react` at 39M, so jsdom's 4.5M is not a meaningful addition,
  and jsdom is unreachable from the browser entry. The split also required the CLI to
  resolve, fetch, and cache the runtime version an artifact pins — machinery that
  `npx @wix/htmdx@<version>` provides for free once the two share a version. Publishing a
  second package additionally required release-please to include the component in release
  tags, changing the existing tag format for `@wix/htmdx` and rewriting a publish workflow
  that assumes a single package throughout. Finally, the `@wix` scope is mandatory, so the
  split bought `npx @wix/htmdx-cli lint` — strictly worse than `npx @wix/htmdx lint`.
- **A repo-internal script.** Cheapest, and sufficient for checking `examples/` in CI, but
  it leaves agents editing artifacts outside this repo with no feedback at all, which is
  the actual gap.
- **An unscoped `htmdx` alias package** for shorter `npx` invocation. npm has no native
  aliasing; only a shim package would work, and a shim is still a publish outside the `@wix`
  scope, so it does not avoid the constraint that motivates it. The unscoped `htmdx` name is
  in any case held by an unrelated dormant project.

## Consequences

Agents gain a checkable artifact contract, and the diagnostic codes become public API —
renaming one is a breaking change, so the initial set is frozen here and additions are
treated as features.

The existing release pipeline is unchanged: one package, one tag format, one publish job.

`@wix/htmdx` now carries jsdom for consumers who install it from npm. Browser consumers
loading `dist/browser.js` from a CDN are unaffected.

`invalid-html-nesting` is reported by React through `console.error`, and React deduplicates
those warnings in module state that no API resets. Linting several files in one process
reports each distinct violation once, on the first file that has it. Fixing this would mean
a process per file; the limitation is documented instead.
