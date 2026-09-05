import type { IncomingHttpHeaders } from 'node:http';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import { describe, expect, it } from 'vitest';
import {
  createAppRouterLlmsHandler,
  createAppRouterMarkdownHandler,
  createDocsDiscoveryLinkHeader,
  createDocsPageLinkDescriptors,
  createDocsPageMetadata,
  createPagesRouterLlmsHandler,
  createPagesRouterMarkdownHandler,
} from './documents.js';

const page: DocsPage = {
  id: 'docs:start',
  collectionId: 'docs',
  slug: ['start'],
  path: 'docs/start.mdx',
  route: '/docs/start',
  title: 'Start',
  description: 'Start here.',
  frontmatter: {},
  body: '# Start\n\nHello.',
};

const draft: DocsPage = {
  ...page,
  id: 'docs:draft',
  slug: ['draft'],
  route: '/docs/draft',
  title: 'Draft',
  frontmatter: { draft: true },
};

const collection: DocsCollection = {
  id: 'docs',
  name: 'Guides',
  basePath: '/docs',
  pages: [page, draft],
  nav: [],
};

const manifest = createDocsManifest({ collections: [collection] });

function createPagesRequest(options: {
  headers?: IncomingHttpHeaders;
  method?: string;
  query?: NextApiRequest['query'];
  url?: string;
}): NextApiRequest {
  return {
    headers: options.headers ?? {},
    method: options.method ?? 'GET',
    query: options.query ?? {},
    url: options.url,
  } as NextApiRequest;
}

function createPagesResponse() {
  const headers = new Map<string, string | number | readonly string[]>();
  let body = Buffer.alloc(0);
  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), value);
      return response;
    },
    end(chunk?: Uint8Array | string) {
      if (chunk !== undefined) body = Buffer.from(chunk);
      return response;
    },
  } as unknown as NextApiResponse<unknown>;

  return {
    response,
    get body() {
      return body.toString('utf8');
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
  };
}

describe('docs document metadata', () => {
  it('creates canonical, Markdown alternate, and llms descriptors', () => {
    expect(
      createDocsPageLinkDescriptors(page, {
        llmsUrl: '/llms.txt',
        siteUrl: 'https://example.com',
      }),
    ).toEqual([
      { href: 'https://example.com/docs/start', rel: 'canonical' },
      {
        href: 'https://example.com/docs/start.md',
        rel: 'alternate',
        type: 'text/markdown',
      },
      {
        href: 'https://example.com/llms.txt',
        rel: 'describedby',
        type: 'text/markdown',
      },
    ]);
  });

  it('creates Next metadata and an HTTP Link header', () => {
    expect(createDocsPageMetadata(page)).toEqual({
      title: 'Start',
      description: 'Start here.',
      alternates: {
        canonical: '/docs/start',
        types: { 'text/markdown': '/docs/start.md' },
      },
    });
    expect(createDocsDiscoveryLinkHeader(page, { llmsUrl: '/llms.txt' })).toBe(
      '</docs/start.md>; rel="alternate"; type="text/markdown", </llms.txt>; rel="describedby"; type="text/markdown"',
    );
  });

  it('rejects URLs that could inject an HTTP Link header', () => {
    expect(() =>
      createDocsDiscoveryLinkHeader(page, {
        markdownUrl: '/docs/start.md\r\nX-Injected: true',
      }),
    ).toThrow('Invalid public docs URL');
  });

  it('rejects invalid site URLs and unsupported public URL protocols', () => {
    expect(() =>
      createDocsPageLinkDescriptors(page, { siteUrl: 'not a url' }),
    ).toThrow('Invalid public docs site URL');
    expect(() =>
      createDocsPageLinkDescriptors(page, {
        canonicalUrl: 'mailto:docs@example.com',
        siteUrl: 'https://example.com',
      }),
    ).toThrow('Invalid public docs site URL');
  });
});

describe('Markdown handlers', () => {
  it.each(['route', 'slug'])(
    'normalizes suffixed and extensionless catch-all %s parameters',
    async (key) => {
      const handler = createPagesRouterMarkdownHandler({ manifest });

      for (const method of ['GET', 'HEAD']) {
        for (const value of [
          ['docs', 'start.md'],
          ['docs', 'start'],
          'docs/start.md',
          '/docs/start',
        ]) {
          const result = createPagesResponse();
          await handler(
            createPagesRequest({ method, query: { [key]: value } }),
            result.response,
          );

          expect(result.response.statusCode).toBe(200);
          if (method === 'HEAD') {
            expect(result.body).toBe('');
          } else {
            expect(result.body).toContain(page.body);
          }
        }
      }
    },
  );

  it('serves App Router Markdown responses and supports HEAD', async () => {
    const handler = createAppRouterMarkdownHandler({ manifest });
    const response = await handler(
      new Request('https://example.com/docs/start.md'),
    );
    const head = await handler(
      new Request('https://example.com/docs/start.md', { method: 'HEAD' }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(await response.text()).toContain('# Start');
    expect(await head.text()).toBe('');
  });

  it('rejects unsupported methods and unpublished pages', async () => {
    const handler = createAppRouterMarkdownHandler({ manifest });
    const method = await handler(
      new Request('https://example.com/docs/start.md', { method: 'POST' }),
    );
    const draftResponse = await handler(
      new Request('https://example.com/docs/draft.md'),
    );

    expect(method.status).toBe(405);
    expect(method.headers.get('allow')).toBe('GET, HEAD');
    expect(draftResponse.status).toBe(404);
  });

  it('supports transformed Markdown and Pages Router route params', async () => {
    const handler = createPagesRouterMarkdownHandler({
      manifest,
      markdown: (currentPage) => `# Plain ${currentPage.title}`,
    });
    const result = createPagesResponse();

    await handler(
      createPagesRequest({ query: { route: '/docs/start.md' } }),
      result.response,
    );

    expect(result.response.statusCode).toBe(200);
    expect(result.getHeader('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(result.body).toBe('# Plain Start\n');
  });

  it('resolves array, slug, and request URL values in Pages Router handlers', async () => {
    const handler = createPagesRouterMarkdownHandler({ manifest });
    const arrayResult = createPagesResponse();
    const slugResult = createPagesResponse();
    const requestUrlResult = createPagesResponse();

    await handler(
      createPagesRequest({ query: { route: ['docs', 'start'] } }),
      arrayResult.response,
    );
    await handler(
      createPagesRequest({ query: { slug: 'docs/start.md' } }),
      slugResult.response,
    );
    await handler(
      createPagesRequest({ url: '/docs/start.md' }),
      requestUrlResult.response,
    );

    expect(arrayResult.response.statusCode).toBe(200);
    expect(slugResult.response.statusCode).toBe(200);
    expect(requestUrlResult.response.statusCode).toBe(200);
  });

  it('uses the fallback route and rejects unsupported Pages Router methods', async () => {
    const handler = createPagesRouterMarkdownHandler({ manifest });
    const missingResult = createPagesResponse();
    const methodResult = createPagesResponse();

    await handler(createPagesRequest({}), missingResult.response);
    await handler(
      createPagesRequest({
        method: 'POST',
        query: { route: '/docs/start.md' },
      }),
      methodResult.response,
    );

    expect(missingResult.response.statusCode).toBe(404);
    expect(missingResult.body).toBe('Not found\n');
    expect(methodResult.response.statusCode).toBe(405);
    expect(methodResult.getHeader('allow')).toBe('GET, HEAD');
  });

  it('supports mapping a rewritten App Router path', async () => {
    const handler = createAppRouterMarkdownHandler({
      manifest,
      appRoute: (request) =>
        new URL(request.url).pathname.replace('/docs-markdown/', '/docs/'),
    });
    const response = await handler(
      new Request('https://example.com/docs-markdown/start.md'),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('# Start');
  });
});

describe('llms handlers', () => {
  it('serves an App Router llms index', async () => {
    const handler = createAppRouterLlmsHandler({
      manifest,
      title: 'Example',
      siteUrl: 'https://example.com',
    });
    const response = await handler(new Request('https://example.com/llms.txt'));
    const body = await response.text();

    expect(body).toContain('# Example');
    expect(body).toContain(
      '[Start](https://example.com/docs/start.md): Start here.',
    );
    expect(body).not.toContain('Draft');
  });

  it('serves full text through a Pages Router handler', async () => {
    const handler = createPagesRouterLlmsHandler({
      full: true,
      manifest,
      title: 'Example',
    });
    const result = createPagesResponse();

    await handler(createPagesRequest({}), result.response);

    expect(result.body).toContain('## Start');
    expect(result.body).toContain('Hello.');
    expect(result.body).not.toContain('## Draft');
  });

  it('supports HEAD and rejects unsupported llms methods', async () => {
    const handler = createPagesRouterLlmsHandler({ manifest });
    const headResult = createPagesResponse();
    const methodResult = createPagesResponse();

    await handler(createPagesRequest({ method: 'HEAD' }), headResult.response);
    await handler(
      createPagesRequest({ method: 'POST' }),
      methodResult.response,
    );

    expect(headResult.response.statusCode).toBe(200);
    expect(headResult.body).toBe('');
    expect(methodResult.response.statusCode).toBe(405);
    expect(methodResult.getHeader('allow')).toBe('GET, HEAD');
  });
});
