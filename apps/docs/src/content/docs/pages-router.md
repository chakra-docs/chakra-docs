---
title: Pages Router
description: Build static docs pages with Next Pages Router helpers.
order: 3
tags: [next]
---

The docs section uses an optional catch-all route at `src/pages/docs/[[...slug]].tsx`. That gives the site `/docs` for the overview and nested routes such as `/docs/pages-router`.

## Static paths

`createGetStaticPaths` converts published manifest pages into the shape expected by Next. Draft and hidden pages are excluded by default.

```tsx
export const getStaticPaths = async () => {
  const manifest = await getDocsManifest();
  return createGetStaticPaths({ manifest })();
};
```

The helper returns paths using each page slug:

```ts
{
  paths: [
    { params: { slug: [] } },
    { params: { slug: ['configuration'] } },
    { params: { slug: ['pages-router'] } },
  ],
  fallback: false,
}
```

## Static props

`createPagesRouterDocProps` looks up the page for the current route and returns the page, nav, and collection options needed by the docs shell. Search defaults to an empty array so the complete corpus is not repeated in every static page payload.

```tsx
export const getStaticProps = async (context) => {
  const manifest = await getDocsManifest();
  const slug = Array.isArray(context.params?.slug) ? context.params.slug : [];
  const route = `/docs/${slug.join('/')}`;
  const props = createPagesRouterDocProps({ manifest }, route);

  if (!props) {
    return { notFound: true };
  }

  return {
    props: serializeNextProps({
      collectionOptions: props.collectionOptions,
      nav: props.nav,
      page: props.page,
    }),
  };
};
```

## Why stringify props

The manifest uses optional fields. Next Pages Router props cannot contain `undefined`, so `serializeNextProps` normalizes the docs props before returning them.

## Rendering

The page composes the site shell, a remote search control, `DocsLayout`, `DocsArticle`, page content, and `DocsPagination`. The search control queries `pages/api/docs/search.ts`; the surrounding shell still comes from the app, so docs share navigation with landing and showcase pages.
