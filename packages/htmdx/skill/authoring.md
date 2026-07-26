# HTMDX authoring

Guidance for creating, editing, and verifying HTMDX artifacts, shipped with the
runtime it describes. Companion topics:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.9.0 skill components    # body grammar for every component
npx @wix/htmdx@4.9.0 skill integration   # React host, registration, testing
npx @wix/htmdx@4.9.0 skill starter       # a starter artifact to copy
```

<!-- x-release-please-end-version -->

## What an artifact is

`@wix/htmdx` renders an editable source block inside a plain HTML file. The
file opens in a browser with no build step; agents edit the source block
instead of generated markup.

An HTMDX artifact is:

- one portable `.html` file;
- exactly one editable `<script type="text/htmdx">` block;
- a runtime pinned to an exact version;
- no generated HTML body and no Markdown twin of the same content.

The source is declarative. Imports, exports, `{expressions}`, event handlers,
and function-valued props are rejected at compile time. Interactivity comes
from registered components, not from source-level JavaScript.

Embedding HTMDX in an app instead of shipping an artifact? Read the
`integration` topic above.

## Start

Write the artifact's review question in one sentence — what should become
easier to understand or decide — then pick a mode:

- **Create:** turn supplied files, notes, or results into a new artifact.
- **Edit:** change the source block of a file that already contains
  `type="text/htmdx"`.

Read every source the user names before choosing a layout. Preserve their
facts, links, units, dates, and stated uncertainty; do not invent numbers to
fill a component.

## Create

Start from the starter artifact — `htmdx skill starter > brief.html` writes it
to disk — and replace the title, frontmatter, and body. The shell is:

<!-- x-release-please-start-version -->

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Artifact title</title>
    <script src="https://cdn.jsdelivr.net/npm/@wix/htmdx@4.9.0/dist/browser.js" defer></script>
  </head>
  <body>
    <!-- prettier-ignore -->
    <script type="text/htmdx" data-htmdx-edit-instruction="Edit only this script content. HTMDX format.">
# Artifact title

<ExecutiveSummary>
State the conclusion first.
</ExecutiveSummary>
    </script>
  </body>
</html>
```

<!-- x-release-please-end-version -->

Rules that only apply to the file, not the source:

- Pin an exact runtime version. `@latest` lets a future release change a saved
  artifact; the linter reports an unpinned runtime as a warning.
- The runtime auto-mounts the source block, so the artifact needs no
  `<htmdx-code>` element and no mounting script.
- Keep `<!-- prettier-ignore -->` above the block so formatters leave the
  source alone.
- The source must never contain a literal `</script>`, including inside a code
  fence — the browser ends the block there. Write `<\/script>` in examples, or
  move the source to a file and use
  `<script type="text/htmdx" src="./artifact.mdx"></script>`.

Then order the document for the reader: conclusion first, the decisive
metric/comparison/timeline second, evidence and caveats next, reference detail
last. Remove every placeholder before presenting the file.

## Edit

Treat the source block as the canonical document.

1. Confirm the file has exactly one `script[type="text/htmdx"]`. A legacy
   `template[type="text/htmdx"]` artifact still renders — edit it in place
   rather than migrating it.
2. Change only the source block. The text inside `<title>` may change to keep
   the browser title accurate.
3. Preserve the doctype, the pinned runtime, and the rest of the shell. Do not
   upgrade an artifact's runtime version unless asked; components and grammar
   are versioned with it.

If an `.html` file has no HTMDX source block, it is ordinary HTML. Say that
converting it means authoring a new artifact, not an in-place edit.

## Choose components

Markdown is valid HTMDX. Write prose, headings, lists, and links as Markdown,
and reach for a component when it makes the review question easier to answer.

| Information shape                       | Component                                        |
| --------------------------------------- | ------------------------------------------------ |
| Bottom line or recommendation           | `ExecutiveSummary`                               |
| Warning, note, or takeaway              | `Callout`                                        |
| 2-6 headline values                     | `MetricStrip`, `Stat`                            |
| Comparable records                      | `DataTable`                                      |
| Options scored against criteria         | `DecisionMatrix`                                 |
| Alternatives, before/after              | `Compare`                                        |
| Ordered events or milestones            | `Timeline`                                       |
| Quantitative distribution               | `ChartBar`, `ChartLine`, `ChartPie`, `ChartArea` |
| Supporting proof, key findings          | `Evidence`, `Finding`                            |
| Scope split across the four fixed tiers | `RiskTable`                                      |
| Secondary detail behind a click         | `Foldout`, `Accordion`                           |
| Views the reader picks between          | `Tabs`                                           |
| Grouping, chrome, layout                | `Card` family, `Badge`, `Separator`              |

Default to ordinary `##` sections. `Card`, `Tabs`, `Accordion`, and `Foldout`
are for genuine grouping or alternate views — sequential content that is read
in order is not an alternate view, and tabbing it hides content for no gain.

`RiskTable` is a four-tier scope classifier, not a generic risk list: every row
starts with `Must-have`, `Differentiator`, `Not now`, or `Won't do`.

Body grammar is per component and is enforced at compile time. The `components`
topic has the grammar for every built-in family with a working example. The
exact-version manifest is the source of truth when the network is reachable:

<!-- x-release-please-start-version -->

```text
https://cdn.jsdelivr.net/npm/@wix/htmdx@4.9.0/dist/components.json
```

<!-- x-release-please-end-version -->

## Author the source

- **Attributes are data.** Every component accepts `class`, `id`, `aria-*`, and
  `data-*`. Any other attribute must be declared for that component, and its
  value parses as the declared string, number, boolean, or JSON. An attribute
  borrowed by analogy from another design system is a compile error — most
  report built-ins declare no props at all, so `<Callout type="warning">`
  fails.
- **Compound components need their full child set.** `Tabs` requires
  `defaultValue` plus one `TabsContent` per `TabsTrigger` with each `value`
  appearing exactly twice; `Accordion` requires `type` and
  `AccordionItem` > `AccordionTrigger` + `AccordionContent`. A parent without
  its children fails compilation instead of degrading.
- **`markdown` bodies reject nested tags.** Built-in report components take
  Markdown only. Components with `htmdx` bodies accept Markdown, allowlisted
  HTML, and nested component tags; `none` bodies must be empty or
  self-closing.
- **Capitalized angle brackets are component tags.** A closed tag the catalog
  does not know fails as `unknown-component`, at the top level and inside
  `htmdx` bodies alike. Code fences are literal in both places, so
  placeholder-heavy templates belong in a fence; outside one, write the
  placeholder without angle brackets.
- **Tailwind classes are available** for one meaningful emphasis or layout
  adjustment. Prefer the theme's own hierarchy over restyling every component.
- **Images** work as Markdown or as allowlisted `<img>`. Relative paths resolve
  from the artifact; `http:`, `https:`, and `data:image/*` sources are
  accepted. Give every image `alt` text.

Optional frontmatter sets document metadata; unknown fields are ignored:

<!-- prettier-ignore -->
```mdx
---
title: Checkout migration
project: Payments
owner: Payments team
phase: Decision
updated: 2026-07-26
theme: teal
layout: default
---
```

`theme` is one of `blue` (default), `purple`, `green`, `teal`, `amber`,
`magenta`, `fuchsia`, `rose`, `lime`, `coral`. `layout` is `default` for
reports and briefs, or `blank` when source-order composition matters more than
the hero, sticky header, and section navigation.

## Verify

Lint every artifact before presenting it, with the runtime it pins:

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.9.0 lint path/to/artifact.html --strict
```

<!-- x-release-please-end-version -->

The linter reports unknown components and props, missing required props,
invalid bodies, disallowed HTML, unknown themes, layouts, and frontmatter
fields, plus artifact-level findings — an unpinned runtime, or a pin that does
not match the linting runtime. Details and flags are in the CLI section below.

Then confirm by reading the saved file:

- one doctype, one pinned runtime URL, one source block;
- no placeholders left, and no literal `</script>` inside the source;
- the artifact answers the review question without inventing facts.

Lint checks the source, not the rendering. When the change is visual, open the
`file://` path in a browser — no server is needed — and look at it.

## CLI

The package ships one binary, `htmdx`. `lint` checks artifacts and source files
(`validate` is an alias), `compile` prints the static HTML snapshot,
`components` describes the catalog, and `skill` prints this guidance. Run any
of them with the version the artifact pins, so the results match what the file
loads.

Already a dependency? Use the local bin instead — `yarn htmdx …`,
`npx htmdx …`, or `node_modules/.bin/htmdx …`.

### lint

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.9.0 lint artifact.html          # one artifact
npx @wix/htmdx@4.9.0 lint a.html b.html doc.mdx  # several files
npx @wix/htmdx@4.9.0 lint artifacts/*.html       # let the shell expand it
npx @wix/htmdx@4.9.0 lint artifact.html --strict --format json
```

<!-- x-release-please-end-version -->

| Flag            | Effect                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--strict`      | Treat warnings as failures. Use it in CI and before handing an artifact over.                                               |
| `--format json` | Emit `{ files, errorCount, warningCount }` with a code, severity, message, line, column, offset, and length per diagnostic. |
| `-h`, `--help`  | Print usage.                                                                                                                |

Arguments are file paths, not glob patterns — the CLI passes each one to
`readFile`, so an unexpanded `"artifacts/**/*.html"` exits `2`. Both `.html`
artifacts and bare HTMDX source files (`.mdx`, `.md`, anything else) are
accepted; for an artifact the source is pulled out of the `text/htmdx` block
and positions are reported against the HTML file, so they line up with what an
editor shows.

<!-- x-release-please-start-version -->

```text
artifact.html
  2:26     warning  unpinned-runtime
    runtime is not pinned to a version; a future release can change this artifact (pin @wix/htmdx@4.9.0)
  5:10     error  unknown-prop
    unknown prop "type" for <Callout>
  9:1      error  body-contract
    Invalid body for <MetricStrip> at body line 1: non-empty lines must be list items; expected one or more '- label: value' rows with non-empty labels and values.

2 error(s), 1 warning(s)
```

<!-- x-release-please-end-version -->

Exit codes: `0` clean, `1` problems found (with `--strict`, warnings count),
`2` the command could not run — an unreadable file, no files given, or an
unknown command. A `2` means the artifact was never checked; do not read it as
a pass.

### compile and components

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.9.0 compile artifact.html --out snapshot.html
npx @wix/htmdx@4.9.0 components            # the whole catalog, grouped by source
npx @wix/htmdx@4.9.0 components Foldout    # purpose, body mode, props, example
```

<!-- x-release-please-end-version -->

`compile` prints the `htmdx-app` markup this runtime renders, for a build step
or a readable diff; `--layout <name>` picks a document layout and `-o, --out`
writes to a file. `components` reads the manifest built next to the bin, so it
answers for exactly the version running it — ask it before guessing at a prop
name. Both accept `--format json`; a name with no match exits `1` and suggests
the closest entries.

### skill

`skill` prints this guidance from the installed package, so it always matches
the runtime that renders the artifact.

<!-- x-release-please-start-version -->

```bash
npx @wix/htmdx@4.9.0 skill                 # this topic (authoring)
npx @wix/htmdx@4.9.0 skill --list          # available topics
npx @wix/htmdx@4.9.0 skill components      # one topic
npx @wix/htmdx@4.9.0 skill --full          # every topic in one stream
npx @wix/htmdx@4.9.0 skill starter > brief.html
```

<!-- x-release-please-end-version -->

`--json` returns `{ runtime, topics: [{ name, description, content }] }`.
An unknown topic exits `2` and lists the valid ones.

Fix the first error, re-run, and repeat. One malformed body can mask the
diagnostics after it, so a clean run is the only evidence that the file is
clean.

Programmatic equivalent, for hosts and tests: `validate(source)` from
`@wix/htmdx` returns the same diagnostics minus the two artifact-level ones.
See the `integration` topic.

## Hand off

Report the saved absolute path, what the artifact answers, and what was
verified. Do not echo the file body into chat, and do not commit unless asked.
