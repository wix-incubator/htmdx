# Ship artifact validation as a separate CLI package

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
render against that version's component contract. Validation is only meaningful against
the same contract. Separately, validation needs a DOM — tree construction uses `DOMParser`
and the static snapshot requires a `document` — which a browser-facing runtime package
should not carry.

## Decision

Validation ships in three layers.

`@wix/htmdx` gains a `validate()` function returning `HtmdxDiagnostic[]`, where each
diagnostic carries a kebab-slug code, severity, message, and source position. Errors are
collected per top-level block rather than aborting on the first, and existing silent
fallbacks are reported as warnings. `compile()` keeps its current signature and result
shape. The package gains no new dependency.

`@wix/htmdx/testing` exports source extraction and snapshot helpers for consumers testing
their own artifacts. Snapshots default to the component tree rather than rendered markup,
because compiled HTML changes with routine Tailwind and shadcn updates and would fail
consumer tests without indicating anything about the artifact.

`@wix/htmdx-cli` is a new published package providing `htmdx lint`. It owns jsdom, file
handling, reporters, and runtime resolution — resolving the runtime from an explicit
override, then the artifact's own pinned version, then the nearest installed copy. It
defines no rules of its own.

The CLI publishes under the `@wix` scope with a `htmdx` bin. No unscoped alias is
registered.

## Alternatives

- **A `bin` inside `@wix/htmdx`.** Simpler to release, but a CLI bundled at version X can
  only validate against catalog X, producing false diagnostics for artifacts pinned to any
  other version — which contradicts the pinning guarantee the runtime exists to provide.
  It would also force jsdom into the runtime package's dependency graph as an optional or
  peer dependency, a posture every consumer would inherit.
- **A repo-internal script.** Cheapest, and sufficient for checking `examples/` in CI, but
  it leaves agents editing artifacts outside this repo with no feedback at all, which is
  the actual gap.
- **An unscoped `htmdx-cli` alias package** for shorter `npx` invocation. npm has no native
  aliasing; only a shim package would work, and a shim is still a publish outside the `@wix`
  scope, so it does not avoid the constraint that motivates it. The unscoped `htmdx` name is
  in any case held by an unrelated dormant project. A single `htmdx` bin under the scoped
  name already provides the short command after installation.

## Consequences

Agents gain a checkable artifact contract, and the diagnostic codes become public API —
renaming one is a breaking change, so the initial set is frozen here and additions are
treated as features.

Publishing a second package requires release-please to include the component in release
tags, which changes the existing tag format for `@wix/htmdx`. The publish workflow assumes
a single package throughout — including an assertion on the current tag format — so it
needs a matrix or a second job rather than a configuration change. This lands separately
from the feature work, which ships the CLI unpublished.

The CLI takes on runtime resolution — fetching and caching pinned versions — which is more
machinery than a bundled bin would have needed, and requires an offline path and a clear
error when a pin cannot be resolved.

The unscoped `htmdx-cli` name remains unregistered and available to others.
