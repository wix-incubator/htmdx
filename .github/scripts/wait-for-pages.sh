#!/usr/bin/env bash
# Block until a commit pushed to gh-pages is actually live on GitHub Pages.
#
#   wait-for-pages.sh <sha>
#
# Without this the preview comment posts before Pages has published, so the
# link 404s for the first minute. Branch-based Pages exposes build state via
# /pages/builds; Pages coalesces pushes, so the build that publishes our commit
# may be recorded against a later commit on the branch — match either.
set -euo pipefail

target_sha="${1:?commit sha required}"
api="${GITHUB_API_URL:-https://api.github.com}/repos/${GITHUB_REPOSITORY}"
start_timeout=180
build_timeout=600

gh_get() {
  curl -sS \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$1"
}

build_id=""
elapsed=0
while [ -z "$build_id" ]; do
  head_sha="$(gh_get "${api}/git/refs/heads/gh-pages" | jq -r '.object.sha // empty')"
  build_id="$(gh_get "${api}/pages/builds?per_page=100" |
    jq -r --arg target "$target_sha" --arg head "$head_sha" \
      'map(select(.commit == $target or (.commit == $head and $head != ""))) | .[0].url // empty' |
    awk -F/ '{print $NF}')"
  if [ -n "$build_id" ]; then
    break
  fi
  if [ "$elapsed" -ge "$start_timeout" ]; then
    echo "no Pages build for ${target_sha} after ${start_timeout}s"
    exit 1
  fi
  echo "waiting for a Pages build covering ${target_sha}..."
  sleep 10
  elapsed=$((elapsed + 10))
done

elapsed=0
while true; do
  status="$(gh_get "${api}/pages/builds/${build_id}" | jq -r '.status // empty')"
  case "$status" in
    built)
      echo "Pages build ${build_id} published"
      exit 0
      ;;
    errored)
      echo "Pages build ${build_id} errored"
      exit 1
      ;;
  esac
  if [ "$elapsed" -ge "$build_timeout" ]; then
    echo "Pages build ${build_id} still ${status} after ${build_timeout}s"
    exit 1
  fi
  echo "Pages build ${build_id}: ${status}"
  sleep 10
  elapsed=$((elapsed + 10))
done
