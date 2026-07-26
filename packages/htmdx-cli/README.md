# @wix/htmdx-cli

Lint HTMDX artifacts and source files from the command line.

```bash
npx @wix/htmdx-cli lint report.html
npx @wix/htmdx-cli lint docs/*.htmdx --strict
```

Accepts either an HTML artifact (the source is read from its
`<script type="text/htmdx">` block, and positions are reported against the
artifact) or a bare HTMDX source file.

## Options

| Option                    | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `--format <pretty\|json>` | Output format. Default `pretty`.                |
| `--strict`                | Treat warnings as failures.                     |
| `--runtime <specifier>`   | Validate against a specific `@wix/htmdx` build. |

## Exit codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| `0`  | No errors (and no warnings, when `--strict` is set).         |
| `1`  | Problems found.                                              |
| `2`  | The command could not run — bad usage or an unreadable file. |

## Rules

Everything `validate()` reports from `@wix/htmdx`, plus two findings that only
exist at the artifact level:

- `unpinned-runtime` — the runtime `<script>` has no pinned version, so a
  future release can change the artifact without the artifact changing.
- `runtime-version-mismatch` — the artifact pins a version other than the one
  doing the linting. Pass `--runtime` to lint against what actually ships.

### Known limitation

`invalid-html-nesting` is reported by React, which remembers which nesting
warnings it has already logged in module state that no API resets. Linting many
files in one run therefore reports each distinct violation once, on the first
file that has it. Lint a file on its own to see all of its nesting warnings.

## JSON output

```json
{
  "files": [{ "file": "report.html", "diagnostics": [] }],
  "errorCount": 0,
  "warningCount": 0
}
```

Each diagnostic carries `code`, `severity`, `message`, `line`, `column`,
`offset`, and `length`.
