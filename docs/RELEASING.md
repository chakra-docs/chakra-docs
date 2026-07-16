# Releasing Chakra Docs

Releases run only from the repository's default branch through
`.github/workflows/release.yml`. The workflow validates inputs, audits
dependencies, runs formatting, lint, typecheck, coverage, build, browser, and
consumer-package checks, then versions and repacks the exact release artifacts
before publishing with npm trusted publishing and provenance.

## One-time repository setup

1. Create and push the public GitHub repository declared by each package's
   `repository.url`, and configure it as this checkout's `origin`. If the final
   repository location differs, update every package manifest before publishing.
   The repository must be public for npm provenance.
2. Create a GitHub Actions environment named `npm-publish`.
3. Create a GitHub App dedicated to releases. Give it repository **Contents:
   read and write** permission only, install it only on this repository, and add
   it as the sole bypass actor for the default-branch ruleset. Store its client
   ID as `RELEASE_APP_CLIENT_ID` and private key as
   `RELEASE_APP_PRIVATE_KEY` on the `npm-publish` environment. The workflow
   exchanges these for a repository-scoped installation token that expires and
   is revoked automatically; it does not store a reusable GitHub access token.
4. Restrict that environment to the default branch. Add required reviewers and
   prevent self-review when the repository has more than one maintainer.
5. Protect the default branch and require the CI workflow before merge. Do not
   grant a human or the general GitHub Actions bot bypass permission.
6. Enable GitHub private vulnerability reporting so the reporting channel in
   `SECURITY.md` exists before launch.

### Bootstrap packages that do not exist on npm

npm requires a package to exist before a trusted publisher can be configured.
For the first registry release only:

1. Confirm that the publishing account can create public packages in the
   `@chakra-docs` organization and has account-level two-factor authentication
   enabled.
2. Create a short-lived granular access token limited to the `@chakra-docs`
   organization, with read/write access and bypass 2FA enabled. Store it as the
   `NPM_BOOTSTRAP_TOKEN` secret on the protected `npm-publish` environment.
3. Run the Release workflow with an explicit initial version, `first-release`
   enabled, and `dry-run` disabled. The workflow exposes the bootstrap token
   only to this first-release publish step.
4. Verify that every package listed in `nx.json` exists and is public on npm.
5. For every package, configure the trusted publisher for this GitHub
   organization/repository, workflow file `release.yml`, environment
   `npm-publish`, and the `npm publish` permission.
6. Delete the `NPM_BOOTSTRAP_TOKEN` environment secret and revoke the token on
   npm immediately. Then set each package's publishing access to require 2FA
   and disallow tokens.

Do not keep an `NPM_TOKEN` or `NPM_BOOTSTRAP_TOKEN` secret after bootstrap.
Normal releases use GitHub's short-lived OIDC token and generate provenance
automatically. npm documents the bootstrap authentication requirements in its
[scoped-package publishing guide](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
and the post-bootstrap setup in its
[trusted publishing guide](https://docs.npmjs.com/trusted-publishers/).

These controls live in GitHub and npm settings; the workflow's default-branch
condition and environment declaration provide the matching code-side guard.

## Running a release

Open **Actions → Release → Run workflow** on the default branch. Leave the
version empty to derive it from conventional commits, or enter `patch`, `minor`,
`major`, or an exact stable `X.Y.Z` version. Prerelease versions are rejected so
they cannot accidentally receive npm's `latest` tag. Run with `dry-run` first
when changing release configuration.

When the version is derived, Nx evaluates conventional commits that affected the
fixed release group. Commit scopes are optional and do not need to repeat scoped
package names such as `@chakra-docs/core`.

The workflow serializes releases so two publish jobs cannot overlap. A normal
release versions the fixed package group, packs and tests those versioned
artifacts in a clean consumer, creates the changelog commit and tag, and pushes
the commit and tag in one atomic Git operation. It then publishes with
provenance and creates the GitHub release using the short-lived release GitHub
App token. The complete CI suite also runs before the release version is minted.

If registry publishing fails after the atomic Git push, do not move or recreate
the tag and do not attempt recovery from a maintainer laptop. Treat the tagged
commit as the source of truth and determine which package versions reached npm.
Rerun the protected Release workflow from the default branch with
`resume-version` set to that exact tag version. The workflow requires it to be
the latest fixed release, checks out the tag, rebuilds and repacks those exact
sources, and uses the same protected OIDC/bootstrap authentication. Nx checks
the registry package by package: versions already carrying `latest` are skipped
and missing versions are published. The workflow then verifies all eleven public
versions and `latest` tags before creating the GitHub release.

When recovering the bootstrap release, also keep `first-release` enabled so the
protected `NPM_BOOTSTRAP_TOKEN` is available. Do not revoke that token until all
eleven initial versions pass registry verification; revoke it immediately after
the recovery succeeds.

The same recovery input safely finalizes a release when every package published
but registry verification or GitHub release creation failed. A partial
fixed-group publish is an incident; record the affected packages in the release
notes and retain the failed workflow logs.
