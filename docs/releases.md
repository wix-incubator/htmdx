# Releases

Release Please is the normal release path for `@wix/htmdx`.

1. Merge work to `master` with a valid Conventional Commit PR title.
2. Release Please opens or updates its release PR.
3. A human reviews and merges that PR. Do not turn on auto-merge.
4. The same workflow creates `vX.Y.Z`, checks out that exact release, builds and tests it, checks the package, and publishes it to npm with OIDC and provenance.

Release Please owns the version in `packages/htmdx/package.json`, `.release-please-manifest.json`, release tags, GitHub releases, and `packages/htmdx/CHANGELOG.md`. Do not edit those release values by hand.

## Version rules

- `feat` makes a minor release.
- `fix` makes a patch release.
- `!` or a `BREAKING CHANGE` footer makes a major release.
- `docs`, `test`, `chore`, `ci`, `build`, and a behavior-neutral `refactor` do not make a release.

Since this repo uses squash merges, Release Please reads the merged PR title. Direct commits to `master` must use the same form.

## One-time GitHub setup after this change reaches `master`

These settings cannot be put in place safely before GitHub sees the new workflow.

1. In **Settings → Actions → General → Workflow permissions**, allow GitHub Actions to create pull requests and grant read/write access if the org default blocks the job's declared write access.
2. Add an Actions secret named `RELEASE_PLEASE_TOKEN` if release PRs must run CI without a person reopening them. Use a fine-grained personal access token with repository **Contents**, **Issues**, and **Pull requests** write access. Without it, the workflow falls back to `GITHUB_TOKEN`; GitHub then does not start new workflow runs for the release PR that token creates.
3. Open or update a normal PR once so GitHub records the new check name.
4. In the branch ruleset for `master`, add **`PR title / Validate title`** as a required status check. Do this only after step 2 if release PRs must meet the same required check.

The workflow does not use a tag event to publish. It gates the publish job on Release Please's `packages/htmdx--release_created` output, so the default token's event limits cannot skip npm publishing.
