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

## Dependency audits

`pnpm run audit:dependencies` runs the unfiltered development and production
dependency audit and fails on high or critical findings. CI also runs
`pnpm audit --prod --audit-level=moderate`; GitHub dependency review blocks
new moderate-or-higher findings. No advisory allowlists, ignored packages,
or expiring exceptions are configured.

The temporary development-only patch for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
was retired after GitHub withdrew the advisory on October 23, 2026, because
it was not practically exploitable. The patch, advisory acceptance, and
November 4 expiry gate have been removed; this is not an extension of the
exception or a claim that an upstream braces fix was published.
