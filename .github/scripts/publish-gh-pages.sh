#!/usr/bin/env bash
# Publish a directory into the gh-pages branch.
#
#   publish-gh-pages.sh <target> <source-dir> <commit-message>
#
# target       path inside gh-pages; "." replaces the site root but keeps previews/
# source-dir   contents to publish; empty string deletes the target instead
#
# Plain git rather than the official Pages actions: org policy requires
# SHA-pinned actions, and those actions reference upload-artifact by tag.
set -euo pipefail

target="${1:?target path required}"
source_dir="${2-}"
message="${3:?commit message required}"

# GH_PAGES_REMOTE lets the script be exercised against a local repository.
remote="${GH_PAGES_REMOTE:-https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"
workdir="$(mktemp -d)"

stage() {
  if [ "$target" = "." ]; then
    find . -mindepth 1 -maxdepth 1 ! -name .git ! -name previews -exec rm -rf {} +
  else
    rm -rf "${workdir:?}/${target}"
  fi

  if [ -n "$source_dir" ]; then
    mkdir -p "$target"
    cp -R "${GITHUB_WORKSPACE}/${source_dir}/." "$target/"
  fi
}

if git clone --depth 1 --branch gh-pages "$remote" "$workdir" 2>/dev/null; then
  cd "$workdir"
else
  if [ -z "$source_dir" ]; then
    echo "gh-pages does not exist; nothing to delete"
    exit 0
  fi
  rm -rf "${workdir:?}"
  mkdir -p "$workdir"
  git init -b gh-pages "$workdir" >/dev/null
  cd "$workdir"
  git remote add origin "$remote"
fi

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

# The caller waits on this SHA to appear in the Pages build list.
emit_sha() {
  if [ -n "${GITHUB_OUTPUT-}" ] && sha="$(git rev-parse HEAD 2>/dev/null)"; then
    echo "deployed_sha=${sha}" >> "$GITHUB_OUTPUT"
  fi
}

for attempt in 1 2 3; do
  stage
  git add -A
  if git diff --cached --quiet; then
    echo "gh-pages already up to date"
    emit_sha
    exit 0
  fi
  git commit -m "$message" >/dev/null
  if git push origin gh-pages; then
    emit_sha
    exit 0
  fi
  echo "push rejected, refetching gh-pages (attempt ${attempt})"
  git fetch --depth 1 origin gh-pages
  git reset --hard FETCH_HEAD
done

echo "failed to push gh-pages after 3 attempts"
exit 1
