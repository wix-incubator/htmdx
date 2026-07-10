# Publish a versioned built-in component manifest

Starting with `@wix/htmdx@1.1.0`, each package release publishes `dist/components.json` so agents and validators can discover the built-in components supported by the exact runtime version pinned in an artifact. The manifest describes built-ins only; host-registered components are outside this contract, and releases before `1.1.0` are not backfilled.

Each built-in is defined in its own file as an internal `HtmdxComponent` containing its canonical name, body format, purpose, required valid example, renderer, and optional component-specific validator. An explicit typed catalog is the single source for the runtime registry and manifest, while shared body-format parsers validate and parse content before renderers receive it. Objective syntax and structural rules are enforced at runtime; semantic intent remains descriptive.

Rollup generates the uncommitted `dist/components.json` asset during the normal build. Its `runtime` field and the runtime's exported `VERSION` both derive from `packages/htmdx/package.json`. Catalog invariants fail the build, including invalid or case-insensitively duplicated names, missing metadata, unsupported body formats, and examples that do not validate.

## Consequences

- The canonical manifest URL is `https://unpkg.com/@wix/htmdx@<exact-version>/dist/components.json`.
- Invalid component bodies fail the entire HTMDX compilation and the browser fallback shows the error with raw source.
- Existing permissive fallbacks are removed without compatibility exceptions in the `1.1.0` release.
- Component-specific implementation details remain separate while common parsing, rendering, and validation mechanics may be shared.
