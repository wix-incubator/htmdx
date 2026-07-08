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

# Bump the version in package.json only. `npm version` inside a workspace also
# tries to sync lockfiles / run an install (and then silently skips its own git
# commit+tag when that dirties the tree), so we disable all of that and drive git
# ourselves below.
(cd "$PKG_DIR" && npm version "$BUMP" \
  --no-git-tag-version --no-workspaces-update --no-package-lock >/dev/null)

# Discard anything npm may have touched beyond the version bump.
rm -f package-lock.json "$PKG_DIR/package-lock.json"
git checkout -- yarn.lock 2>/dev/null || true

version="$(node -p "require('./$PKG_DIR/package.json').version")"
tag="v$version"

# Commit only the version bump, tag it, and push both.
git add "$PKG_DIR/package.json"
git commit -m "chore(release): @wix/htmdx@$version"
git tag -a "$tag" -m "@wix/htmdx@$version"

echo "Prepared release $tag"
git push --follow-tags

echo "Pushed $tag. Publish workflow will run:"
echo "  gh run watch -R wix-incubator/htmdx"
