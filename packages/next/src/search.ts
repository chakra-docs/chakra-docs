import type { NextApiRequest, NextApiResponse } from 'next';
import type { DocsSearchEngine, DocsSearchProvider } from '@chakra-docs/search';
import {
  createFetchSearchHandler,
  type FetchSearchHandlerOptions,
} from '@chakra-docs/search/http';

export type NextSearch = DocsSearchEngine | DocsSearchProvider;
export type NextSearchHandlerOptions = FetchSearchHandlerOptions;

export function createAppRouterSearchHandler(
  search: NextSearch,
  options?: NextSearchHandlerOptions,
): (request: Request) => Promise<Response> {
  return createFetchSearchHandler(search, options);
}

export function createPagesRouterSearchHandler(
  search: NextSearch,
  options?: NextSearchHandlerOptions,
): (
  request: NextApiRequest,
  response: NextApiResponse<unknown>,
) => Promise<void> {
  const handleFetchRequest = createFetchSearchHandler(search, options);

  return async function pagesRouterSearchHandler(request, response) {
    const fetchRequest = createRequest(request);
    const fetchResponse = await handleFetchRequest(fetchRequest);

    await sendResponse(fetchResponse, response);
  };
}

function createRequest(request: NextApiRequest): Request {
  const url = new URL('/api/chakra-docs/search', 'http://localhost');

  for (const [name, value] of Object.entries(request.query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(name, item);
      }
    } else if (value !== undefined) {
      url.searchParams.append(name, value);
    }
  }

  return new Request(url, {
    method: request.method ?? 'GET',
  });
}

async function sendResponse(
  source: Response,
  target: NextApiResponse<unknown>,
): Promise<void> {
  target.statusCode = source.status;

  source.headers.forEach((value, name) => {
    target.setHeader(name, value);
  });

  target.end(new Uint8Array(await source.arrayBuffer()));
}
