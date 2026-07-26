# Ship agent guidance from the runtime package

- Status: proposed
- Date: 2026-07-26
- Extends [ship-artifact-validation-tooling](ship-artifact-validation-tooling.md)

## Context

Agents author HTMDX from an installed skill file. That file has to teach the artifact
contract, which components exist, what body grammar each one enforces, and how to verify
the result — and every one of those is versioned with the runtime. An artifact pins an
exact `@wix/htmdx` version and renders against that version's component contract, so
guidance that is a separate copy is guidance about a different runtime.

The usual distribution shape makes that drift permanent. `npx skills add` and the
marketplace pattern vendor a copy of the skill into the user's skills directory; it is
correct on the day it is installed and silently stale afterwards. The alternative in the
ecosystem is a docs MCP server, which shadcn ships alongside its CLI — but that means a
server, five client configurations, an SDK dependency, and, in shadcn's own case, a
version pinned to `latest`, which reintroduces the drift it was meant to solve.

`dist/components.json` already ships per version and is the machine-readable half of this.
It is a manifest, not instructions: it does not say when to reach for `RiskTable` over a
list, that a `2` from the linter is not a pass, or that the source block must never contain
a literal `</script>`.

## Decision

The guidance ships inside the npm tarball and is printed by the bin.

- `packages/htmdx/skill/` holds the topic files — `authoring.md`, `components.md`,
  `integration.md`, and a starter `artifact.html`. `files` publishes `skill/**`.
- `htmdx skill [topic]` prints them, with `--list`, `--full`, and `--json`. Topics resolve
  from `../skill` relative to `dist/cli.js`, which is the layout in the repo and in the
  tarball alike.
- The installable skill in `skills/htmdx/` carries no component catalog. It routes the
  agent to `npx @wix/htmdx@<pinned-version> skill` and falls back to `@latest` when the
  pin predates the command.
- Release Please owns the version pins in the topic files, through the same
  `x-release-please-start-version` markers the READMEs use.
- The mdx examples in the topics are compiled by `validate()` on every test run, and the
  starter artifact is linted with `--strict`.

## Consequences

Guidance cannot drift from the runtime it describes: reading it means running the version
the artifact loads, and an example that stops compiling fails the build rather than
misleading an agent.

The topic files become part of the published surface. `npm pack` is exercised in the test
suite — packed, extracted, and run — because a dropped `files` entry or a moved bundle
would otherwise surface only when a user ran the command off npm.

Reading the guidance now costs a tool call and, on first use of a version, a package
download. The token cost is the same as loading a vendored skill; the latency is not.
npx caches per exact version, so the cost is paid once per version per machine.

Every release up to and including 4.8.0 predates the command and answers `htmdx skill`
with `unknown command "skill"` and exit 2. Artifacts pinned to those versions get the
`@latest` fallback until they are repinned.

Two markers are stripped before printing: the release-please version anchors, and the
`<!-- prettier-ignore -->` that keeps oxfmt from reflowing an mdx fence as JSX. Both are
build bookkeeping, and a reader should not be told to preserve them.
