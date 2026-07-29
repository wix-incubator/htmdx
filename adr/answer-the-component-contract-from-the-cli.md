# Answer the component contract from the CLI, not the manifest

- Status: accepted
- Date: 2026-07-28
- Extends [component-definitions-as-agent-contracts](component-definitions-as-agent-contracts.md),
  which made `dist/components.json` the contract, and
  [ship-agent-guidance-from-the-runtime](ship-agent-guidance-from-the-runtime.md),
  which put the guidance behind the bin

## Context

`dist/components.json` is the component contract, and the agent-facing docs said
so literally. `skill/authoring.md` and `skill/components.md` both named the
jsDelivr URL as "the source of truth when the network is reachable", which is an
instruction to read the whole document.

Measured with `gpt-tokenizer` (`o200k_base`), that document is 13,634 tokens.
The breakdown is what makes it a problem rather than a cost:

| Part | Tokens | Share |
| --- | ---: | --- |
| JSON punctuation and indentation | 4,873 | 36% |
| `example` | 4,174 | 31% |
| `props` | 2,326 | 17% |
| `purpose` | 1,645 | 12% |
| `name`, `body`, `source` | 616 | 4% |

Better than a third of it is structural syntax — quotes, braces, indentation,
key names repeated 89 times. A machine parses that for free. A model pays for
every token of it.

The same facts already came out of the bin far cheaper. `htmdx components`
lists the catalog in 1,600 tokens; `htmdx components Callout` answers in 50.
Nothing needed building for the common case to cost 3% of what the docs
recommended — the commands existed and the docs pointed past them.

Two gaps kept the CLI from being a complete substitute. It took one name per
invocation, so asking about five components meant five calls. And it had no way
to answer "what does *this artifact* use", which is the question an edit starts
from: an agent editing a file needs the grammar for the components in it, not
for all 89.

## Decision

The CLI is the documented way to read the component contract. `components.json`
keeps its `htmdx@2` envelope, its exact-version guarantee, and its place in the
published package — it is bulk machine-readable data for tools that consume the
whole catalog, and it is no longer what agent-facing documentation points at.

`htmdx components` grows the two modes that make it sufficient:

- `components <name...>` takes several names in one call. One unknown name
  fails the call rather than printing a partial answer that reads like a
  complete one.
- `components --used <file>` prints the contract for exactly the components a
  file contains, taking the source from an artifact's
  `<script type="text/htmdx">` block or reading a bare source file directly.

`--used` scans for capitalized tags instead of compiling. Compiling would be
more precise, but the artifact whose contract someone needs is disproportionately
the one that does not compile yet, and an answer that requires a working document
is unavailable exactly when it is wanted. The same tolerance means a tag inside a
code fence counts: over-reporting costs a few lines, and missing a component
costs the answer.

Measured across the shipped examples, `--used` costs 112 tokens (2 components)
to 1,600 (16). `component-tour.html` is the outlier at 7,146, because it is a
catalog demo that names 73 components — the case where reading everything is the
correct answer, and where it still beats the manifest by half.

The manifest is the wrong baseline for that comparison, though, because this
decision retires it. Against `htmdx components` — the alternative it makes
canonical — the advantage is real but artifact-dependent. `bench/RESULTS.md`
measures the full read: the initial read plus the follow-up for any contract it
did not supply, over each scenario's edit tasks plus one that introduces a
component the source does not carry.

| Scenario | Components in source | `--used` | `htmdx components` | Saving |
| --- | ---: | ---: | ---: | ---: |
| Executive Decision Report | 7 | 617 | 1,678 | 63.2% |
| Checkout Migration Brief | 16 | 1,670 | 1,694 | 1.4% |

`--used` wins decisively on a small artifact and converges on a large one, where
it ends up reading every component in the file whether the edit touches it or
not. It is the cheaper read for the artifacts agents actually edit, not a
uniformly cheaper read.

`--format json` keeps emitting the bare entry for a single name. Several names
and `--used` emit an array. Preserving the single-name shape keeps existing
callers working, at the cost of a response shape that varies with the request.

## Consequences

- The realistic contract read for an edit drops from 13,634 tokens to 112-1,600.
- Two documented sources of truth for one catalog is how they drift, so
  agent-facing docs name the CLI only. `components.json` stays documented where
  it is consumed as data: the package README and the integration topic.
- `--used` reports what a file mentions, not what it renders. A component named
  only inside a code fence appears in the output.
- `--used` optimizes for conforming to a file rather than picking the right
  component, so its output ends by naming the absent members of any compound
  family it reported, then how many components it left out and the command that
  lists them. Names only — printing those contracts would re-inflate the read.
  Costs 12 tokens on `decision-brief.html`, 27 on a partial `Dialog`.
- The manifest's own size is unaddressed. Family examples are the next lever:
  60 of 89 components sit in compound families whose canonical examples largely
  repeat each other (Avatar's three members ship one identical example,
  Breadcrumb's seven ship three), and 3,178 of the 4,174 example tokens belong
  to them. Deduplicating in a projection rather than in the manifest would keep
  the per-definition example validation this repo's build depends on.

## Does the cheaper read produce worse artifacts?

No, on the evidence there is. `bench/live/` runs the same edits through a real
model — one contract read, one artifact, one change, one optional follow-up for
contracts by name — and scores the result with this repo's own validator: it
passes when the document compiles, lints clean, contains what the change asked
for, and still contains what it started with. No model judges another model.

Two models, 72 calls each, 3 samples per cell:

| Read | Haiku 4.5 | Codex | Input tokens vs manifest |
| --- | ---: | ---: | ---: |
| `components.json` | 21/24 | 24/24 | — |
| `htmdx components` | 21/24 | 22/24 | 47% / 68% |
| `htmdx components --used` | 21/24 | 24/24 | 56% / 80% |

`--used` matches the manifest on both models. The read this decision retires
buys nothing the cheap one does not already deliver.

The interesting loser is `htmdx components` — names and purposes with no
grammar. It failed only on the change that introduces a component the file does
not carry, and it failed for a specific reason: on 5 of 6 such calls it never
asked for the missing contract, and wrote an invented body instead. `--used`
asked all 6 times. A read that admits what it is missing gets followed up on; a
read that lists every name looks complete and does not. That is an argument for
the pointer lines `--used` prints, and a caution against writing from the list
alone — which is why `skill/components.md` now says to fetch the contract by
name before using a component the list only named.

## What this decision does not establish

- 13,634 is the manifest's size, not a proven context cost. An agent reaching it
  through a URL may get a summary rather than the bytes, in which case the
  saving is smaller than the table suggests.
- The live eval ties at 24 samples per read. That rules out a large regression,
  not a small one; a few points of difference would not show up at this size.
  Both models also fail `RiskTable` in the same way regardless of read, so that
  cell measures a model ceiling rather than anything about the contract.
- A manifest fetched from a stable URL is a good prompt-cache prefix; `--used`
  output varies per file and caches nothing. Cheaper in tokens is not
  automatically cheaper in billed compute.
- `npx @wix/htmdx@<version> components <name>` costs about 2.8s of cold start
  against roughly 0.2s for a local `dist/cli.js` run. Naming several components
  in one call is what keeps that from multiplying.
- The live eval is one edit against one artifact, with no repository around it.
  A real agent can run `htmdx lint` and try again, so those are first-attempt
  rates, not the rate an agent loop reaches.
