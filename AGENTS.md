# Repo instructions for coding agents

## Show visual changes in every PR

If a PR changes anything user-visible (runtime CSS, page chrome, components, themes, examples), show it.

The **PR preview** workflow does this automatically for same-repo branches: every push builds `browser.js` from the branch, publishes it next to `examples/*.html` under `previews/pr-<n>/` on `gh-pages` → `https://wix-incubator.github.io/htmdx/previews/pr-<n>/`, and keeps one comment on the PR with the links. The examples load `./browser.js`, so a preview always exercises the branch build. Previews survive master deploys and are deleted when the PR closes.

Still worth doing by hand:

1. Add **before & after screenshots** (base branch vs this branch) when the change is subtle.
2. If the stock examples do not exercise the change, add or adjust an `examples/*.html` artifact in the PR so the preview covers it.
3. Say in the comment what changed and what to look at.

Fork PRs get no preview (read-only token) — attach screenshots instead. To preview locally, build with `yarn workspace @wix/htmdx build:library` and point an example's script tag at `./browser.js`.

If the change is not visual, show before & after **output** instead — e.g. compiled HTML snippets from `compile()`, generated-file diffs, or CLI/test output on the same input.

## PR titles and releases

Use `<type>(optional-scope)!: summary` for each PR title and each direct commit to `master`. Allowed types are `feat`, `fix`, `docs`, `test`, `chore`, `ci`, `build`, and `refactor`.

Examples:

- `feat(parser): support callouts`
- `fix: keep empty code blocks`
- `docs: explain browser setup`
- `feat(api)!: remove the legacy compile option`

Classify by public behavior: `feat` adds it, `fix` repairs it, and behavior-neutral work uses a non-release type. Mark changes or removals to public APIs, output, or runtime contracts as breaking with `!`. For mixed work, use the highest impact; prefer separate PRs when practical.

Before creating or updating a PR, check its title. Never edit package versions, release tags, or generated changelogs. Release Please owns normal releases; a human merges its release PR.

The `@wix/htmdx@<version>` runtime pins in `README.md` and `packages/htmdx/README.md` are generated the same way. Those snippets sit between `x-release-please-start-version` and `x-release-please-end-version` comments, and the release PR rewrites every version inside them, so the docs ship pinned to the version being published. Leave the markers in place, keep new version-bearing snippets inside a marked block, and do not bump the pins by hand.

One consequence worth knowing: an open release PR is not rebuilt when the only new commits are non-releasing types, so changes to `release-please-config.json` or to the markers will not reach it. Close that PR and let the next run recreate it from master.
