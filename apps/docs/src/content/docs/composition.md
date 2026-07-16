---
title: Composition
description: Treat the docs section as a composed feature, not a full-site framework.
order: 6
tags: [composition]
---

Chakra Docs avoids owning the full application. That keeps the host site free to choose layouts, providers, routes, auth, analytics, and product pages.

## Boundaries

- The Next app owns the route tree, header, metadata, non-docs pages, and Chakra theme system.
- `@chakra-docs/source-filesystem` builds the manifest from local Markdown.
- `@chakra-docs/next/pages` turns the manifest into Pages Router static generation data.
- `@chakra-docs/search` keeps the searchable corpus on the server and returns compact results.
- `@chakra-docs/chakra` renders nav, article, table of contents, callouts, code blocks, and pagination.
- The host app chooses the Markdown or MDX renderer and search experience.

## Why it matters

Product sites often need docs beside pricing pages, customer stories, dashboards, or private app routes. A composed docs section lets the documentation grow without forcing every page into one documentation framework.

## Common customizations

- Replace the demo Markdown renderer with MDX.
- Point `contentPath` at a package-specific docs directory.
- Add multiple collections under different `basePath` values.
- Swap server search for local records, Pagefind, or a hosted search service.
- Add analytics callbacks through `DocsProvider`.
- Extend Chakra theme tokens and recipes in the host app.

## Next steps

Replace the sample Markdown with package documentation, add MDX rendering if the site needs rich examples, and extend the showcase page with real integrations as they land.
