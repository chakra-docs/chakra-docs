---
title: CLI
description: Generate, validate, inspect, and watch documentation manifests.
order: 4
tags: [cli, setup]
---

`@chakra-docs/cli` is a build-time tool. Use it when your app should import a
generated manifest instead of discovering files during a request.

## Install

```bash
npm install --save-dev @chakra-docs/cli
```

Use Node.js 24 for new development environments. The published package supports
Node.js 22.22 and newer. A global CLI installation is not required.

## Configure a collection

Create `content/docs/index.md` with some Markdown, then add
`chakra-docs.config.json` to the project root:

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

Add commands to your existing `package.json`:

```json
{
  "scripts": {
    "docs:generate": "chakra-docs build --config chakra-docs.config.json",
    "docs:validate": "chakra-docs validate --config chakra-docs.config.json",
    "docs:watch": "chakra-docs dev --config chakra-docs.config.json"
  }
}
```

Run `npm run docs:generate` before the app build. The output includes
`manifest.json`, `manifest.d.ts`, and `index.ts`, which exports `docsManifest`,
`allDocs`, navigation, search, sitemap, and feed records. Install
`@chakra-docs/core` in the application that consumes the generated declarations.

## Choose a command

- `build` syncs configured Git sources and writes generated files.
- `validate` checks the discovered manifest without writing it.
- `inspect` prints the manifest as JSON.
- `dev` rebuilds local content on an interval; Git is synced at startup.
- `sync` updates configured Git sources without generating output.

Keep the generated directory out of hand-edited source. Manifest bodies are
content, not an executable MDX compiler. See [Git sources](/docs/source-git)
for reproducible remote inputs and the
[CLI API](https://github.com/chakra-docs/chakra-docs/tree/main/packages/cli)
for flags and programmatic use.
