# Use component definitions as the agent authoring contract

- Status: accepted
- Date: 2026-07-17

## Context

The component implementation, runtime registry, Storybook stories, and published manifest are currently split across `components`, `react/builtins`, `react/shadcn`, an explicit built-in catalog, and a handwritten shadcn manifest. This permits runtime behavior and agent-facing documentation to drift. That is especially costly for HTMDX because `dist/components.json` is consumed by artifact-generating agents, often on behalf of non-technical users who have no TypeScript feedback; runtime errors are the last line of defense rather than the primary authoring experience.

## Decision

Starting with `@wix/htmdx@4.0.0`, every bundled or externally registered component is represented by one `HtmdxComponent` definition containing:

- `name`
- `purpose`
- a required, valid canonical `example`
- `body: 'markdown' | 'htmdx' | 'none'`
- optional agent-facing `props`
- executable React `Component`

`body` is both documentation and runtime behavior. `markdown` passes the raw body to the implementation and rejects nested tags; `htmdx` parses Markdown, ordinary HTML, and nested registered component tags into React children; `none` rejects non-empty bodies. Existing structured Built-in grammars remain implementation-level Markdown validation and must be clear from each component's purpose and example.

When present, `props` is the authoritative component-specific authoring allowlist. Each declaration records its name, value type (`string`, `number`, `boolean`, or `json`), and applicable requiredness, allowed values or other constraints, default, and description. Missing `props` means that the component declares no component-specific authoring props. `class`, `id`, `aria-*`, and `data-*` are universally allowed. The runtime parses attributes from the declared prop types and rejects unknown names or invalid values; imports, expressions, and function-valued props remain unsupported.

Components live under `components/builtins` or `components/shadcn`. Every public HTMDX tag has its own PascalCase folder containing one implementation file, one `index.ts` that exports the PascalCase definition, and one colocated Storybook story. Category-level `shared` folders may contain private non-component helpers. The one-component-per-file rule also applies to shadcn, deliberately trading drop-in compatibility with shadcn's generated family files for a uniform local ownership boundary.

Explicit category barrels are the only bundled inclusion points. Runtime registries and the manifest derive from their exported definitions; names must be globally unique case-insensitively, and external registration is additive rather than overriding. The public package paths mirror the model through `@wix/htmdx/components`, `@wix/htmdx/components/builtins`, and `@wix/htmdx/components/shadcn`.

Rollup projects the serializable fields from those definitions into `dist/components.json`; there is no separately maintained manifest catalog. The `htmdx@2` manifest keeps its versioned runtime envelope and publishes `name`, `purpose`, `example`, `body`, optional `props`, and generated `source: 'built-in' | 'shadcn'`, while omitting `Component`. Its note defines the body vocabulary, universal attributes, prop parsing, and declarative-language limits. Invalid metadata, collisions, or canonical examples that do not contain their target or compile against the merged catalog fail the build.

Storybook keeps its existing organization, except `Components/default/<Name>` becomes `Components/Built-ins/<Name>`; shadcn remains the flat `Components/shadcn` group. Component-specific presentation moves with the component implementation, while document chrome remains runtime-owned.

## Consequences

- The manifest is an executable authoring contract rather than a best-effort inventory.
- Built-ins no longer accept nested HTMDX components in their Markdown bodies; such tags fail compilation explicitly.
- The previous React-component maps, React-specific shadcn package path, hidden body-mode markers, and handwritten shadcn manifest are removed in a clean major-version break.
- Host extension APIs accept complete component definitions and reject collisions with bundled or registered names.
- Updating vendored shadcn families requires splitting upstream changes into the per-component layout.
