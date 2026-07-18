# Ship semantic and shadcn components together

- Status: accepted
- Date: 2026-07-18
- Supersedes: the component-name collision rule in
  [`react-renderer-mdx-minus-javascript.md`](./react-renderer-mdx-minus-javascript.md)
- Builds on:
  [`component-definitions-as-agent-contracts.md`](./component-definitions-as-agent-contracts.md)

## Context

HTMDX serves two authoring needs. Semantic components such as
`ExecutiveSummary`, `MetricStrip`, and `Finding` encode recurring document
intent with less markup. shadcn/ui primitives such as `Card`, `Tabs`, and
`Accordion` let an agent compose structures that the semantic catalog does not
cover.

Models are likely to recognize the canonical shadcn vocabulary, while
HTMDX-specific components must be discovered from the runtime manifest or
consumer guidance. The exact curated shadcn subset and its supported props
still require discovery. Making shadcn an opt-in bundle would force consumers
to choose a different runtime before using that familiar vocabulary. Removing
semantic components would have the opposite problem: recurring report
structures would require verbose primitive composition.

The v4 runtime already merges both catalogs into `browser.js`. Its exact-version
manifest marks every definition as `built-in` or `shadcn`, and the unified
definition registry rejects name collisions. The v4 refactor also resolved the
previous `Card` collision by retaining canonical shadcn `Card` and removing the
generic built-in `Card`. This ADR decides that these are intended product
boundaries rather than incidental implementation choices.

The committed benchmark supports a narrower claim than “HTMDX is always more
token efficient.” In its two rich-document fixtures and named tokenizer, HTMDX
source measured smaller than the selected HTML and JSX formulations. Plain
Markdown was smaller still, but was treated as a lower bound rather than a
feature-equivalent result. Component selection therefore optimizes rich
artifact authoring, not replacement of ordinary Markdown.

## Decision

`dist/browser.js` will continue to ship one effective component catalog
containing both semantic HTMDX components and the supported shadcn/ui subset.
There will be no separate default-versus-shadcn browser bundle.

The two layers have different authoring roles:

- Discover and select a semantic component when it directly expresses the
  information being presented.
- Fall back to canonical shadcn components when custom composition is needed.
- Register a host component only when neither shipped layer covers the need.

`dist/components.json` remains the exact-version discovery contract for the
effective runtime. Every entry declares its source, purpose, body contract,
canonical example, and supported component-specific props. Documentation and
agent guidance present semantic components first without hiding shadcn.
Consumers may narrow their own authoring policy, but narrowing does not change
the runtime catalog.

Canonical shadcn names are retained so model familiarity can transfer. Semantic
components use distinct, intent-specific names such as `Finding`; generic names
that collide with canonical shadcn names are not added. The global,
case-insensitive uniqueness and additive host-registration rules remain defined
by the component-definition ADR.

shadcn remains a curated declarative subset, not arbitrary React. Components
that require artifact-authored callbacks, imports, or JavaScript expressions
remain outside the HTMDX source contract. The manifest, not general knowledge
of shadcn, is authoritative for the exact pinned runtime version.

This decision only defines shipped component-catalog composition and discovery.
It neither ships nor standardizes layout components, layout frontmatter,
palettes, or a layout extension API. Host component registration remains an
orthogonal extension mechanism. The supported and unresolved authoring flows
are illustrated in [`../docs/user-stories.md`](../docs/user-stories.md).

## Consequences

- An agent can discover concise semantic components and fall back to familiar
  shadcn composition without additional setup.
- A portable artifact keeps one pinned runtime import regardless of which
  shipped component layer it uses.
- Consumers can require semantic authoring without needing a smaller runtime
  distribution.
- The default bundle retains shadcn's Radix and styling dependencies and is
  larger than a semantic-only runtime.
- The manifest remains larger than a semantic-only manifest, so its ordering
  and source labels must make the preferred semantic layer easy to discover.
- Exact-version pinning remains necessary because model familiarity with
  shadcn does not guarantee that a component or prop exists in the curated
  runtime subset.
- The expected agent-reliability benefit of canonical shadcn names is a product
  assumption until a model-authoring evaluation measures it.
- Existing artifacts using `Card` keep its current shadcn meaning. The shadowed
  generic semantic `Card` is removed without a replacement; authors use a
  document-specific semantic component or canonical shadcn `Card` composition.

## Alternatives considered

### Semantic components by default; shadcn opt-in

Rejected because the author must know to select another bundle before using a
familiar vocabulary. It also introduces two browser distributions and two
effective manifests while weakening the one-import portability story.

### shadcn only

Rejected because primitives do not encode recurring document intent. Agents
would spend more source tokens composing titles, containers, metrics, evidence,
and findings that semantic components can express directly.

### Namespace shadcn component names

Rejected because names such as `UiCard` or `ShadcnTabs` discard the main benefit
of exposing shadcn: transfer from the agent's existing component knowledge.
Collision-free semantic names are cheaper than renaming an entire familiar
catalog.

## Verification

- Keep the component-definition tests that fail the build on case-insensitive
  bundled or host-registration collisions.
- Compile representative semantic-only, shadcn-only, and mixed artifacts
  against `browser.js`.
- Verify that manifest examples compile against the exact runtime version.
- Compare agent authoring success with canonical shadcn names against renamed
  or undiscovered components before claiming a reliability advantage.
- Benchmark semantic and primitive formulations separately; do not use the
  result to claim an advantage over plain Markdown where Markdown is sufficient.

## Prior art and references

- [`react-renderer-mdx-minus-javascript.md`](./react-renderer-mdx-minus-javascript.md)
  established the React-only, data-only source boundary and the default merged
  runtime.
- [`component-definitions-as-agent-contracts.md`](./component-definitions-as-agent-contracts.md)
  established the v4 unified registry, manifest, collision, and extension
  mechanics on which this product-boundary decision relies.
- [`../packages/htmdx/bench/RESULTS.md`](../packages/htmdx/bench/RESULTS.md)
  records the current token measurements and their limitations.
- [`../docs/adr/0001-publish-versioned-built-in-component-manifest.md`](../docs/adr/0001-publish-versioned-built-in-component-manifest.md)
  established exact-version component discovery.
- [shadcn registry schema](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/registry/schema.ts#L80-L105)
  distinguishes component, UI, block, theme, style, and font assets while
  preserving canonical registry types; HTMDX similarly keeps semantic and
  primitive roles explicit in one discovery contract.
- [MDX React provider tests](https://github.com/mdx-js/mdx/blob/main/packages/react/test/index.jsx#L71-L103)
  demonstrate host-provided component mappings and nested overrides. HTMDX
  adopts the host-vocabulary precedent but rejects silent same-name collisions
  between its shipped catalogs; host override semantics are outside this ADR.
