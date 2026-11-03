---
title: Astro
description: Generate static Astro routes from a Chakra Docs manifest.
order: 4
tags: [astro, routing]
---

`@chakra-docs/astro` maps published manifest pages to Astro static paths. It does
not choose your renderer or take over your site's layout.

## Install

In an existing Astro application:

```bash
npm install @chakra-docs/astro astro react react-dom
```

For filesystem discovery, also install `@chakra-docs/source-filesystem` and
follow the [manifest configuration guide](/docs/configuration). That guide
provides the `getDocsManifest()` function used below. To render Chakra UI
components in Astro, configure `@astrojs/react` and install the Chakra Docs UI
and its Chakra UI/Emotion peers separately.

## Generate routes

```astro
---
// src/pages/docs/[...slug].astro
import { createAstroStaticPaths } from '@chakra-docs/astro';
import { getDocsManifest } from '../../docs/manifest';

export async function getStaticPaths() {
  return createAstroStaticPaths(await getDocsManifest());
}

const manifest = await getDocsManifest();
const route = Astro.url.pathname.replace(/\/+$/, '') || '/';
const page = manifest.byRoute[route];
---

<html lang="en">
  <head><title>{page.title}</title></head>
  <body><h1>{page.title}</h1></body>
</html>
```

The helper supplies route parameters, not page props. This example looks up the
page by its canonical route and renders its title;
add your chosen Markdown renderer for `page.body`. Do not inject untrusted
Markdown as HTML without a sanitizing rendering pipeline.

## Route boundaries

Paths are relative to the common collection base path. Collections at `/docs/v1`
and `/docs/v2` generate slugs beginning with `v1` and `v2`. Set the helper's
`basePath` option when your catch-all route is mounted elsewhere. Draft and
hidden pages are excluded unless explicitly enabled for a private preview.

See the [package API](https://github.com/chakra-docs/chakra-docs/tree/main/packages/astro)
for options and encoded-slug handling.
