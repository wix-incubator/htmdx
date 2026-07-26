# Publish body grammar and the full prop set in the component manifest

- Status: accepted
- Date: 2026-07-26
- Supersedes the manifest-field decisions in [Use component definitions as the agent authoring contract](./component-definitions-as-agent-contracts.md), which remain otherwise in force.

## Context

The earlier decision made two choices about what `dist/components.json` publishes:

- "Existing structured Built-in grammars remain implementation-level Markdown validation and must be clear from each component's purpose and example."
- "Missing `props` means that the component declares no component-specific authoring props."

Both put load-bearing information somewhere an authoring agent does not reliably read. Twenty Built-ins declare `body: 'markdown'` while their implementations parse the body with a stricter grammar — `label-value-list`, `label-number-list`, `gfm-table`, or `markdown-list-cards`. The manifest reported `markdown` for all of them, so an agent that satisfied the manifest still failed at runtime: writing a GFM table into `<MetricStrip>` is valid Markdown and a hard compile error. Fifty-three of eighty-nine components accept no props, and the manifest signalled that by omitting the key, which reads as "not documented" rather than "none". Both defects produce the same authoring failure — inferring a component's shape from its name because the contract did not state it.

Prose in `purpose` cannot carry this. It is not machine-readable, it is not enforced, and it is not what a validator can check.

## Decision

An `HtmdxComponent` may declare `bodyFormat`, one of `markdown`, `label-value-list`, `label-number-list`, `gfm-table`, or `markdown-list-cards`. It is valid only alongside `body: 'markdown'`; declaring it on an `htmdx` or `none` body fails definition validation, as does an unknown value. An absent `bodyFormat` on a Markdown body means plain Markdown.

The format is owned by the implementation file that enforces it and exported from there, so the definition imports the same value the parser is called with. A declaration cannot disagree with the runtime without failing to compile, and a behavioral test compiles every Markdown-body component with a body that is valid Markdown but invalid for every stricter grammar, asserting that each component's declared expectation is the one the error reports.

The `htmdx@2` manifest keeps its envelope and adds, for Markdown bodies only, `bodyFormat` and `bodyExpectation` — the same prose the runtime puts in its `expected` clause. `props` becomes always present, empty when the component declares none. The manifest note defines both additions. Existing fields, key order for existing keys, and the format identifier are unchanged; the additions are backward compatible for consumers that read known keys.

## Consequences

- The manifest states the grammar the runtime enforces, so an agent can write a valid body without a failed compile teaching it the rule.
- `props: []` distinguishes "accepts no props" from "undocumented" without reading an ADR.
- Adding a structured Built-in now requires declaring its format; the drift test fails otherwise.
- `bodyExpectation` duplicates the runtime's error prose by construction rather than by hand, so the two cannot describe the grammar differently.
- Consumers that treated a missing `props` key as meaningful see an empty array instead. This is the intended correction, not an incidental one.
