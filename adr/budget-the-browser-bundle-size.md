# Budget the browser bundle size in CI

- Status: proposed
- Date: 2026-07-27

## Context

Every htmdx artifact is a plain HTML file whose only runtime is one CDN script,
`dist/browser.js`. That bundle carries React, the built-in catalog, the shadcn/ui
pack, and the theme, so it is the entire loading cost of an artifact and the one
number that decides how a document feels when it opens.

Nothing measures it. The build has an assertion plugin
(`build/production-bundle-validation.js`) that rejects development artifacts in the
bundle, but nothing observes how large the bundle is. `bench/` measures token cost
of htmdx source against other formats; CI does not run it, and it says nothing about
bytes.

The absence is already visible. `README.md` documents the CDN entry as `~145KB
gzip` and `packages/htmdx/README.md` says `~147KB gzip`; the published 4.10.0
bundle is 519,890 bytes raw and 155,117 bytes gzipped. Two hand-maintained numbers
disagree with each other and both understate reality, because nothing recomputes
them and nothing fails when they drift.

The growth vectors are ordinary work, not mistakes: a new built-in component, a
Radix or `lucide-react` bump, a theme addition. Each is individually reasonable and
none of them surface a size delta today.

## Decision

The build measures `dist/browser.js` and fails when it exceeds a committed budget.

A pure helper, `build/bundle-budget.js`, takes measured byte counts and a budget and
throws a message naming the file, the metric, the overage in bytes and percent, and
the budget it exceeded. It follows `build/production-bundle-validation.js`: plain JS
next to the build, no bundler coupling, unit-tested from `test/` over fixture inputs
rather than over a real build.

The vite browser config invokes it after the bundle is written, so the check sees the
bytes that actually ship, sourcemap comment included. A breach fails
`build:browser`, which fails `build:library`, which fails both CI jobs — the
`test` job runs `yarn build` and the `e2e` job runs `yarn workspace @wix/htmdx
build:library`.

Two metrics are gated: raw bytes, which track parse and evaluation cost, and gzip at
a pinned zlib level, which tracks transfer and is the unit the documentation and the
ecosystem quote. Brotli is not measured at all. It is closer to what a CDN actually
sends, but it moves with gzip, so gating it adds no signal, and compressing this
bundle at brotli's default quality costs 772ms against gzip's 11ms — too much to
spend on every build for a number nothing acts on.

The budget lives in `build/bundle-budget.json` as a limit per metric plus a `note`
recording what the limits were set from and why they last moved. Raising a limit is a
normal, allowed act — the point is that it happens in the diff, under review, with a
stated reason, instead of silently between releases.

The gzip limit is 160 KiB exactly rather than a percentage above the measured size,
because the README quotes it. A ceiling is a claim that stays true until the budget
itself changes; a measured point value is a claim that goes stale on the next commit.

Both README size figures are restated as that enforced ceiling and point at the
budget file.

## Alternatives

- **`size-limit` with `@size-limit/file`** (v13.0.1, actively released). The
  ecosystem default, and it adds estimated download time on a slow connection for
  free. Rejected on fit: it brings two devDependencies and a separate CI step to
  produce a number that `node:zlib` produces in roughly forty lines, its presets
  earn their keep on multi-entry and code-split bundles rather than on a single
  IIFE, and it would sit beside the existing build-assertion seam instead of
  reusing it. This repo runs `knip` and `syncpack` over its dependency surface;
  paying two dependencies to avoid one small file is the wrong trade here.
- **Report the size without failing.** Zero friction, and precisely the regime that
  produced two wrong numbers in the README. A number nobody is required to look at
  does not prevent drift.
- **Comment the size delta against the base branch on each PR.** Better ergonomics
  than a hard failure, but it needs write-token plumbing, and fork PRs get nothing
  — the same constraint that already excludes forks from the preview workflow. It
  is an addition to a working gate, not a replacement for one.
- **Measure in-browser time to `htmdx:ready` in the existing Playwright suite.**
  Closer to what a reader experiences, and deferred rather than rejected. Wall-clock
  timing on shared GitHub runners is noisy enough that the threshold has to be loose
  enough to miss real regressions, and for a single blocking CDN script bytes are
  the dominant term. Bytes first; timing when there is a question bytes cannot
  answer.
- **Budget every `dist/*.js` entry.** The other entries are consumed through a
  bundler that tree-shakes them, so their raw size is a weak proxy for what a
  consumer pays. Scoped out deliberately.

## Consequences

Growing the artifact runtime becomes a visible act. Dependency bumps and new
built-ins that push past the ceiling fail CI and require the author to either reduce
the growth or raise the budget with a reason in the same PR. The repo has no
Renovate or Dependabot configuration, so bumps are deliberate and infrequent; the
expected rate of budget conversations is low.

The gated numbers are computed with `node:zlib` at a pinned level. They will not
match byte-for-byte what unpkg or jsdelivr serve, which use their own compression
settings. This is acceptable because the budget is a regression guardrail: it needs
to be deterministic and to move with real size, not to equal a CDN's output. The
budget file records the compression settings so the figure is never mistaken for a
transfer guarantee.

The budget can be rubber-stamped. Nothing prevents raising it reflexively, and the
mitigation is social — the delta and the reason are in the diff. This is a speed
bump on unnoticed growth, not a lock on the bundle size.

Turbo caches the `build` task with `dist/**` as its output. A cache hit skips the
check, but a hit means the inputs were identical, so the size is identical. No
enforcement is lost.
