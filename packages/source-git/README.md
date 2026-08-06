# @chakra-docs/source-git

Remote Git content source for Chakra Docs.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

An optional build-time source that syncs pinned Git refs into deterministic cache directories and exposes the resolved checkout location to the filesystem source or CLI. Requires a `git` binary on the `PATH`.

## Install

```bash
npm install @chakra-docs/source-git
```

No peer dependencies (runs in Node.js >= 22.22).

## Usage

Sync a single repository:

```ts
import { syncGitRepository } from '@chakra-docs/source-git';

const synced = await syncGitRepository({
  repository: {
    id: 'chakra-ui',
    type: 'git',
    url: 'https://github.com/chakra-ui/chakra-ui.git',
    ref: 'v3.0.0',
    subdir: 'apps/www/content',
  },
  rootDir: process.cwd(),
});

// synced => { repositoryId: 'chakra-ui', rootDir: '<cache>/apps/www/content', ref: 'v3.0.0' }
```

Or sync every `type: 'git'` repository declared in a `DocsDiscoveryConfig` (the CLI does this before one-shot builds and once when `dev` starts):

```ts
import { syncGitRepositories } from '@chakra-docs/source-git';

const results = await syncGitRepositories({
  rootDir: process.cwd(),
  repositories: [
    {
      id: 'chakra-ui',
      type: 'git',
      url: 'https://github.com/chakra-ui/chakra-ui.git',
      ref: 'v3.0.0',
    },
  ],
  collections: [
    {
      id: 'docs',
      repository: 'chakra-ui',
      contentPath: 'apps/www/content',
      basePath: '/docs',
    },
  ],
});
```

Repositories are cloned into `<rootDir>/.chakra-docs/git/<repository-id>` by default; override with `cacheDir` (per repository or per call). A cache path must resolve to a dedicated directory below `rootDir`; `cacheDir: "."` and paths outside `rootDir` are rejected.

### Pinned refs

Every sync updates `origin`, fetches the configured `ref`, and force-checks out the fetched commit in detached mode. Clones are shallow, single-branch, and do not download tags automatically; subsequent fetches are also shallow and skip unrequested tags. An explicitly configured tag is still fetched as the requested ref. Tags or commit SHAs are recommended for reproducible builds. A branch name intentionally follows its current remote tip on each sync.

### Safety

`url` and `ref` values that could be mistaken for Git CLI flags are rejected before any command runs. Cache directories and repository subdirectories must remain within their managed parent directories, including across symbolic links. Commands have a 60-second default timeout, and reported Git errors redact repository URLs and common credential forms.

Chakra Docs only runs destructive checkout and clean commands in a cache it created and marked for the matching repository id. A pre-existing directory—including an existing Git checkout—is refused unless it contains that ownership marker. Consequently, caches created by versions without ownership markers must be removed manually after verifying they contain no work you need; the next sync recreates them safely.

Initialization uses a unique staging directory followed by an atomic rename, and a per-cache filesystem lock serializes concurrent syncs. Failed runs clean up their staging directory and lock. If a process is forcibly terminated, it may leave a hidden staging directory or lock beside the cache; after confirming no sync is running, remove those stale paths and retry.

## API

- `syncGitRepository({ repository, rootDir?, cacheDir?, timeoutMs? })` — clone/fetch a single `DocsGitRepositoryConfig` and check out its configured ref; resolves to a `SyncedGitRepository` (`repositoryId`, resolved `rootDir` including `subdir`, `ref`).
- `syncGitRepositories(config, { timeoutMs? })` — sync every `type: 'git'` repository in a `DocsDiscoveryConfig`; resolves to `SyncedGitRepository[]` (empty array when none are configured).
- `SyncGitRepositoryOptions`, `SyncedGitRepository` — option and result types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
