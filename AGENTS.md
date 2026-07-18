# Repo instructions for coding agents

## Show visual changes in every PR

If a PR changes anything user-visible (runtime CSS, page chrome, components, themes, examples), show it — best as **before & after screenshots** (base branch vs this branch) in the PR, or as a **live preview**:

1. Build the branch runtime: `yarn workspace @wix/htmdx build:library`.
2. Copy an `examples/*.html` artifact, point its script tag at `./browser.js` (this branch's build, not the CDN), adjust the source to exercise the change.
3. Deploy the artifact + `browser.js` under `previews/pr-<n>/` on the `gh-pages` branch → served at `https://wix-incubator.github.io/htmdx/previews/pr-<n>/`. Master pushes wipe `previews/`; redeploy if still needed.
4. Comment on the PR: links/screenshots, what changed, what to look at.

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
