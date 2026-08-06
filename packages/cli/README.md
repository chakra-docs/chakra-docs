# @chakra-docs/cli

CLI for generating, validating, and watching Markdown and MDX documentation manifests.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

The `chakra-docs` CLI loads a Chakra Docs discovery config, syncs configured Git repositories, builds typed generated manifest files, validates collections, inspects manifests, and runs an interval-based dev rebuild loop.

## Install

```bash
npm install --save-dev @chakra-docs/cli
```

No peer dependencies (runs in Node.js >= 22.22). Installs the `chakra-docs`
binary.

## Usage

Create a `chakra-docs.config.json` (or a JS/TS module with a default or `config` export) describing your content:

```json
{
  "rootDir": ".",
  "outDir": ".chakra-docs/generated",
  "collections": [
    {
      "id": "docs",
      "contentDir": "content/docs",
      "basePath": "/docs"
    }
  ]
}
```

Then build the generated manifest:

```bash
chakra-docs build --config chakra-docs.config.json
```

`build` atomically replaces three files in the output directory (default `.chakra-docs/generated`):

- `manifest.json` — the full `DocsManifest`.
- `manifest.d.ts` — types the JSON as `DocsManifest` from `@chakra-docs/core`.
- `index.ts` — re-exports `docsManifest`, `allDocs`, `docsNav`, `docsSearch`, `docsSitemap`, and `docsFeeds` for direct imports from app code.

### Commands

| Command    | Description                                                                        |
| ---------- | ---------------------------------------------------------------------------------- |
| `build`    | Sync Git repositories, build the manifest, and write the generated output.         |
| `dev`      | Sync Git once, then rebuild local/generated data on an interval (default 1000 ms). |
| `validate` | Build the manifest and report page/collection counts without writing output.       |
| `inspect`  | Build the manifest and print its JSON to stdout.                                   |
| `sync`     | Sync configured `type: 'git'` repositories and print the synced checkouts as JSON. |

### Flags

| Flag                  | Description                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `-c, --config <path>` | Config file path. Defaults to `chakra-docs.config.json`.                                    |
| `--out-dir <path>`    | Generated output directory. Overrides the config's `outDir`.                                |
| `--pretty`            | Pretty-print generated/inspected JSON (the default for generated output).                   |
| `--compact`           | Compact JSON output (no indentation).                                                       |
| `--once`              | For `dev`: run a single build and exit instead of looping.                                  |
| `--interval <ms>`     | For `dev`: rebuild interval in milliseconds. Must be a positive number. Defaults to `1000`. |

```bash
chakra-docs dev --config chakra-docs.config.json --interval 2000
chakra-docs inspect -c chakra-docs.config.json --compact
chakra-docs build --out-dir .chakra-docs/generated --pretty
```

### Programmatic API

Everything the binary does is also exported for build scripts:

```ts
import {
  buildDocsManifest,
  loadDocsConfig,
  runCli,
  writeGeneratedManifest,
} from '@chakra-docs/cli';

const config = await loadDocsConfig(process.cwd(), 'chakra-docs.config.json');
const manifest = await buildDocsManifest({ config });
const outDir = await writeGeneratedManifest(config, manifest);

// or drive the CLI directly
await runCli({
  cwd: process.cwd(),
  argv: ['validate', '--config', 'chakra-docs.config.json'],
});
```

## API

- `runCli({ argv?, cwd? })` — parse arguments and run a CLI command; throws on unknown commands or invalid flags.
- `buildDocsManifest({ config })` — sync Git repositories, then build a `DocsManifest` via `@chakra-docs/source-filesystem`.
- `loadDocsConfig(cwd, configPath?)` — load and normalize a `DocsDiscoveryConfig` from JSON or a JS/TS module.
- `writeGeneratedManifest(config, manifest, pretty?)` — write `manifest.json`, `manifest.d.ts`, and `index.ts`; resolves to the output directory.
- `ChakraDocsCommand`, `RunCliOptions`, `BuildDocsManifestOptions` — command and option types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
