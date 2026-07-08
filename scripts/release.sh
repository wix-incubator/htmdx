#!/usr/bin/env bash
# Cut a release of @wix/htmdx.
#
# Bumps the package version, commits, creates a `v<version>` tag and pushes it.
# Pushing the tag triggers .github/workflows/publish.yml, which builds, tests
# and publishes to npm via OIDC trusted publishing (with provenance).
#
# Usage:
#   ./scripts/release.sh            # patch bump (default)
#   ./scripts/release.sh minor
#   ./scripts/release.sh major
#   ./scripts/release.sh 1.2.3      # explicit version
set -euo pipefail

BUMP="${1:-patch}"
PKG_DIR="packages/htmdx"
RELEASE_BRANCH="master"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

# Guardrails: release only from a clean, up-to-date master.
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "$RELEASE_BRANCH" ]; then
  echo "Refusing to release from '$branch'; switch to '$RELEASE_BRANCH' first." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty; commit or stash changes before releasing." >&2
  exit 1
fi
git pull --ff-only

# Bump version, commit, and create the tag (npm names it v<version>).
cd "$PKG_DIR"
new_version="$(npm version "$BUMP" -m "chore(release): @wix/htmdx@%s")"
cd "$repo_root"

echo "Prepared release $new_version"
git push --follow-tags

echo "Pushed $new_version. Publish workflow will run:"
echo "  gh run watch -R wix-incubator/htmdx"
