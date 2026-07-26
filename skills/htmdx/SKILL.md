---
name: htmdx
description: "Use when creating, editing, or reviewing an HTMDX artifact — a single HTML file with an editable `<script type=\"text/htmdx\">` source block — or when a report, decision brief, comparison, timeline, or dashboard should be delivered as one portable HTML file. Also covers rendering HTMDX from a React host."
license: MIT
---

# HTMDX

`@wix/htmdx` renders an editable source block inside a plain HTML file. The
file opens in a browser with no build step; agents edit that source block
instead of generated markup.

The guidance ships with the runtime, so read it from the CLI rather than from
memory — components, body grammar, and diagnostics are versioned with the
package.

## Load the guidance

Run this before authoring, editing, or reviewing any HTMDX:

```sh
npx -y @wix/htmdx@latest skill
```

Use the version the artifact pins instead of `@latest` when it has one, so the
guidance matches what the file actually loads:

```sh
npx -y @wix/htmdx@<pinned-version> skill
```

Follow that output as the source of truth. If it cannot be loaded, report the
exact command failure and stop rather than reconstructing the component
catalog from memory.

## Other topics

Load these when the task calls for them, or pass `--full` for everything:

```sh
npx -y @wix/htmdx@latest skill --list          # what is available
npx -y @wix/htmdx@latest skill components      # body grammar per component
npx -y @wix/htmdx@latest skill integration     # React host, registration, testing
npx -y @wix/htmdx@latest skill starter > brief.html
```

## Verify before handing over

Every artifact gets linted with the runtime it pins:

```sh
npx -y @wix/htmdx@<pinned-version> lint <file> --strict
```

Exit `0` is clean, `1` means problems were found, `2` means the check never
ran — do not read a `2` as a pass. The `skill` output explains the flags,
diagnostics, and what to check by reading the file.

Do not trigger this skill for ordinary HTML, Markdown documents, or MDX build
pipelines — HTMDX means a `text/htmdx` source block rendered by
`@wix/htmdx`.
