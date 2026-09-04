# Releasing Chakra Docs

Chakra Docs uses a publish-only release workflow. Package versions, internal
dependency versions, and `CHANGELOG.md` are reviewed and committed through a
pull request. `.github/workflows/release.yml` then builds and publishes that
exact default-branch commit; it never versions, commits, tags, pushes, or
creates a GitHub release.

All eleven public packages use one fixed version.

## Prepare a release pull request

1. Start from the latest default branch with a clean working tree.
2. Choose an exact stable semantic version. Prereleases and relative keywords
   such as `patch`, `minor`, or `major` are not valid workflow inputs.
3. Update the fixed package group and changelog:

   ```bash
   npm exec nx -- release version 0.2.0
   npm exec nx -- release changelog 0.2.0
   ```

   Nx is configured not to commit, tag, push, or create a GitHub release.

4. Review every changed package manifest, `package-lock.json`, and
   `CHANGELOG.md`. Keep all internal `@chakra-docs/*` dependencies on the same
   exact fixed version.
5. Run the release checks:

   ```bash
   npm audit --omit=dev --audit-level=moderate
   npm audit --audit-level=high
   npm exec nx -- format:check --all
   npm run test:release
   npm run lint
   npm run typecheck
   npm run test:coverage
   npm run build
   npm run types:performance:check
   npm run search:performance:check
   npm exec nx -- run docs:e2e --skipNxCache
   npm run release:smoke
   ```

   These commands intentionally mirror the main CI job that authorizes a
   release. Run the complete list after versioning so the verified commit is
   the same commit that will be published.

6. Open and merge the pull request only after CI succeeds. The successful CI
   push run for the resulting merge commit is the release authorization.

## One-time repository setup

1. Keep `https://github.com/chakra-docs/chakra-docs` public so npm can verify
   provenance.
2. Create a protected GitHub Actions environment named `npm-publish`. Restrict
   it to the default branch and add required reviewers.
3. Protect the default branch and require the CI workflow before merge.
4. Restrict `v*` tags to maintainers. Create a tag only after every package has
   published successfully.
5. Enable GitHub private vulnerability reporting so the reporting channel in
   `SECURITY.md` is available.

No GitHub App, personal access token, or branch-protection bypass is required.
The workflow has read-only repository access and npm authentication only.

## Bootstrap packages that do not exist on npm

npm trusted publishing can be configured only after a package exists. For the
first registry release:

1. Confirm the publishing account can create public packages in the
   `@chakra-docs` organization and has account-level two-factor authentication
   enabled.
2. Create a short-lived granular npm token limited to the `@chakra-docs`
   organization. Give it package read/write access and enable **Bypass 2FA**.
3. Store it as the `NPM_BOOTSTRAP_TOKEN` secret on the protected `npm-publish`
   environment.
4. Dispatch **Actions → Release → Run workflow** from the default branch with:

   - `version`: `0.1.0`
   - `dry_run`: enabled for the first run
   - `first_release`: enabled

5. After the preview succeeds, dispatch the same commit and inputs with
   `dry_run` disabled, then approve the protected environment.
6. Verify all packages listed in `nx.json` are public on npm.
7. Configure npm trusted publishing for every package with GitHub organization
   `chakra-docs`, repository `chakra-docs`, workflow `release.yml`, and
   environment `npm-publish`.
8. Delete the `NPM_BOOTSTRAP_TOKEN` secret and revoke the npm token immediately.

Normal releases use npm trusted publishing through GitHub's short-lived OIDC
credential and generate provenance automatically. Do not retain an `NPM_TOKEN`
or `NPM_BOOTSTRAP_TOKEN` after bootstrap.

## Publish a normal release

1. Open **Actions → Release → Run workflow** on the default branch.
2. Enter the exact version already committed by the release pull request.
3. Run with `dry_run` enabled first. Leave `first_release` disabled.
4. If the preview succeeds, rerun the same commit and version with `dry_run`
   disabled and approve the `npm-publish` environment.

The workflow requires a successful CI push run for the exact dispatch commit.
Immediately before publishing, it also confirms the default branch has not
advanced. It then validates the committed fixed version, builds the packages,
checks npm for versions that already exist, publishes the missing versions, and
verifies that all eleven versions and `latest` tags are public. The registry
check remains enabled during bootstrap so the exact run can safely resume after
a partial publish.

After publication succeeds, create the `vX.Y.Z` tag and GitHub release at the
exact published commit. Do not create either before registry verification.

## Recover a partial publish

If publishing stops after one or more packages reach npm:

1. Record the packages that published and retain the failed workflow logs.
2. Do not change the package version, move the default branch, or create the
   Git tag or GitHub release.
3. Rerun the workflow from the same commit with the same exact version. Keep
   `first_release` enabled while recovering the initial bootstrap publish so
   the protected token remains available. Nx will skip versions that already
   carry the requested npm tag and publish only the missing packages.
4. Verify every package and its `latest` tag before creating the tag and GitHub
   release.

Never reuse a published version for different source or recover a protected
release from a maintainer laptop. Revoke the bootstrap token as soon as the
initial fixed group is complete.
