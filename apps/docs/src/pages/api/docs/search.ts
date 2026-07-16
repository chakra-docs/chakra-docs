import {
  createDocsSearchEngine,
  type DocsSearchEngine,
  type DocsSearchProvider,
} from '@chakra-docs/search';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDocsManifest } from '../../../docs/manifest';

type SearchApiHandler = (
  request: NextApiRequest,
  response: NextApiResponse<unknown>,
) => Promise<void>;

let searchEnginePromise: Promise<DocsSearchEngine> | undefined;
let searchHandlerPromise: Promise<SearchApiHandler> | undefined;

const searchProvider: DocsSearchProvider = async (query, options) => {
  options?.signal?.throwIfAborted();
  searchEnginePromise ??= getDocsManifest().then((manifest) =>
    createDocsSearchEngine(manifest.search),
  );
  const engine = await searchEnginePromise;
  options?.signal?.throwIfAborted();
  return engine.search(query);
};

const searchHandler: SearchApiHandler = async (request, response) => {
  searchHandlerPromise ??= import('@chakra-docs/next/search').then(
    ({ createPagesRouterSearchHandler }) =>
      createPagesRouterSearchHandler(searchProvider, {
        cacheControl:
          'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      }),
  );

  await (
    await searchHandlerPromise
  )(request, response);
};

export default searchHandler;
