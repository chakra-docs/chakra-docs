# Security policy

## Supported versions

Before the first stable release, security fixes are made on the default branch
and included in the next published version. After `1.0.0`, the latest minor
release is supported.

## Reporting a vulnerability

Please use the repository's **Security** tab to open a private vulnerability
report. Do not open a public issue for a suspected vulnerability.

Include the affected package and version, reproduction steps, impact, and any
suggested mitigation. You should receive an acknowledgement within three
business days. Details will remain private until a fix and coordinated
disclosure are ready.

## Temporary development dependency mitigation

`braces@3.0.3` has no published fix for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
It is used by repository development tooling (Next linting, Nx's Webpack
watcher, and Verdaccio), not the published Chakra Docs runtime packages or
production docs server.

The committed pnpm patch bounds parsed nesting and recursive AST walkers to
128 levels. Overly deep patterns and ASTs fail with a deliberate `RangeError`
before stack exhaustion. Ordinary brace alternatives, ranges, nested globs,
and escaped/quoted literals retain their behavior. This is a mitigation for
this advisory, not a claim that arbitrary glob expansion is resource-safe.

`pnpm run audit:dependencies` verifies the patch checksum, lockfile coverage,
and installed malicious-input regressions before accepting **only** this
advisory, **only** for patched version 3.0.3, and **only** when every audit
finding is development-only. Acceptance expires on **2026-11-04 UTC** and
stops immediately if the registry reports an upstream fix. All other
high/critical findings and audit failures still fail CI. The production
audit remains unfiltered and fails at moderate severity.

The raw `pnpm audit` report will continue to list the version-based advisory;
it cannot detect a local patch. Release maintainers must review this
mitigation before expiry. When an upstream fix is available, upgrade the
dependency, remove the patch and acceptance, and rerun both audits and the
complete release checks. Do not renew the exception without a fresh review.
