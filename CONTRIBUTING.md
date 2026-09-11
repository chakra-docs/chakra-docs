# Contributing

Thanks for helping improve Chakra Docs.

## Development

```bash
nvm use
npm install
npm run build
npm run test
npm run lint
npm run release:smoke
```

Chakra Docs is an Nx workspace. Prefer the root npm scripts or `npm exec nx --` commands so local work follows the same project graph and task configuration as CI. Use the Node.js 24 version pinned in `.nvmrc` for development and releases. The packages still support Node.js 22.22 or newer, with Node 22 declarations and separate compatibility jobs. The npm version is pinned through the root `packageManager` field.

Before opening a pull request, run the checks relevant to your change. Public API or package-boundary changes should also pass `npm run release:smoke`, which packs the published workspaces and verifies them from a clean consumer.

The default smoke profile uses the installed framework and declaration versions. Run `CHAKRA_DOCS_PEER_PROFILE=minimum npm run release:smoke` as well to check the minimum peers (including Next.js 15). Both profiles keep `skipLibCheck: false`. Next.js 16.3 references global `URLPattern` types absent from TypeScript 5.9's bundled DOM library. The workspace and packed consumers use a pinned `@typescript/lib-dom` alias to `@types/web`, following [TypeScript's supported library override mechanism](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#supporting-lib-from-node_modules). Changing the Node executable alone does not change TypeScript's declarations.

## Pull requests

- Add or update tests for behavior changes.
- Update the affected package README for public API or installation changes.
- Update the root README when package selection or the primary onboarding path changes.
- Keep framework-specific behavior in its adapter package and framework-neutral contracts in `@chakra-docs/core`.
- Include a clear summary of user-visible behavior in the pull request description so release notes remain useful.

## Package boundaries

- `@chakra-docs/core` owns framework-independent document and manifest contracts.
- `@chakra-docs/source-*` packages load content without owning rendering.
- `@chakra-docs/chakra` owns the optional Chakra UI presentation layer.
- Router integrations stay in `@chakra-docs/next`, `@chakra-docs/astro`, and `@chakra-docs/react-router`.
- Search and feed packages remain optional so consumers only install the capabilities they need.

## Documentation

Favor examples that can be copied into a real host application without hidden setup. When changing a public package, update its README, any affected content under `apps/docs/src/content/docs`, and the root package table or quick-start guidance when appropriate.

## Releases

Package versions and changelog entries are prepared in a pull request. The protected Release workflow only publishes the exact version already committed on the default branch; it never versions, commits, tags, or pushes code. See [Releasing Chakra Docs](docs/RELEASING.md) for preparation, bootstrap, publication, and recovery instructions.

## Security

Do not open public issues for suspected vulnerabilities. Follow the [security policy](SECURITY.md) to report them privately.
