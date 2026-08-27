import type { NextApiRequest, NextApiResponse } from 'next';
import type { Metadata } from 'next';
import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  createDocsMarkdown,
  getPublishedPages,
} from '@chakra-docs/core';
import type {
  DocsLlmsTextOptions,
  DocsManifest,
  DocsMarkdownOptions,
  DocsPage,
} from '@chakra-docs/core';
import { getPageByNextRoute } from './route-params.js';

const defaultCacheControl = 'public, max-age=0, must-revalidate';

export interface NextDocsMarkdownOptions {
  appRoute?: (request: Request) => string | undefined;
  cacheControl?: string;
  includeDrafts?: boolean;
  includeHidden?: boolean;
  manifest: DocsManifest;
  markdown?:
    DocsMarkdownOptions | ((page: DocsPage) => DocsMarkdownOptions | string);
  pagesRoute?: (request: NextApiRequest) => string | undefined;
}

export interface NextDocsLlmsOptions extends DocsLlmsTextOptions {
  cacheControl?: string;
  full?: boolean;
  manifest: DocsManifest;
}

export interface DocsPageLinkDescriptor {
  href: string;
  rel: 'alternate' | 'canonical' | 'describedby';
  type?: 'text/markdown';
}

export interface DocsPageMetadataOptions {
  canonicalUrl?: string;
  llmsUrl?: string;
  markdownUrl?: string;
  siteUrl?: string;
}

export function createDocsPageLinkDescriptors(
  page: DocsPage,
  options: DocsPageMetadataOptions = {},
): DocsPageLinkDescriptor[] {
  const canonicalUrl = resolvePublicUrl(
    options.canonicalUrl ?? page.route,
    options.siteUrl,
  );
  const markdownUrl = resolvePublicUrl(
    options.markdownUrl ?? `${page.route}.md`,
    options.siteUrl,
  );
  const descriptors: DocsPageLinkDescriptor[] = [
    { href: canonicalUrl, rel: 'canonical' },
    { href: markdownUrl, rel: 'alternate', type: 'text/markdown' },
  ];

  if (options.llmsUrl) {
    descriptors.push({
      href: resolvePublicUrl(options.llmsUrl, options.siteUrl),
      rel: 'describedby',
      type: 'text/markdown',
    });
  }

  return descriptors;
}

export function createDocsPageMetadata(
  page: DocsPage,
  options: DocsPageMetadataOptions = {},
): Metadata {
  const links = createDocsPageLinkDescriptors(page, options);
  const canonical = links.find((link) => link.rel === 'canonical')?.href;
  const markdown = links.find((link) => link.rel === 'alternate')?.href;

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical,
      types: markdown ? { 'text/markdown': markdown } : undefined,
    },
  };
}

export function createDocsDiscoveryLinkHeader(
  page: DocsPage,
  options: DocsPageMetadataOptions = {},
): string {
  return createDocsPageLinkDescriptors(page, options)
    .filter((link) => link.rel !== 'canonical')
    .map(
      (link) =>
        `<${link.href}>; rel="${link.rel}"${link.type ? `; type="${link.type}"` : ''}`,
    )
    .join(', ');
}

export function createAppRouterMarkdownHandler(
  options: NextDocsMarkdownOptions,
): (request: Request) => Promise<Response> {
  return async function appRouterMarkdownHandler(request) {
    const route = options.appRoute?.(request);
    const requestUrl = route
      ? new URL(route, request.url).toString()
      : request.url;

    return createMarkdownResponse(request.method, requestUrl, options);
  };
}

export function createPagesRouterMarkdownHandler(
  options: NextDocsMarkdownOptions,
): (
  request: NextApiRequest,
  response: NextApiResponse<unknown>,
) => Promise<void> {
  return async function pagesRouterMarkdownHandler(request, response) {
    const route =
      options.pagesRoute?.(request) ??
      resolvePagesMarkdownRoute(request) ??
      '/missing.md';
    const fetchResponse = createMarkdownResponse(
      request.method ?? 'GET',
      new URL(route, 'http://localhost').toString(),
      options,
    );

    await sendResponse(fetchResponse, response);
  };
}

export function createAppRouterLlmsHandler(
  options: NextDocsLlmsOptions,
): (request: Request) => Promise<Response> {
  return async function appRouterLlmsHandler(request) {
    return createLlmsResponse(request.method, options);
  };
}

export function createPagesRouterLlmsHandler(
  options: NextDocsLlmsOptions,
): (
  request: NextApiRequest,
  response: NextApiResponse<unknown>,
) => Promise<void> {
  return async function pagesRouterLlmsHandler(request, response) {
    await sendResponse(
      createLlmsResponse(request.method ?? 'GET', options),
      response,
    );
  };
}

function createMarkdownResponse(
  method: string,
  requestUrl: string,
  options: NextDocsMarkdownOptions,
): Response {
  if (method !== 'GET' && method !== 'HEAD') {
    return methodNotAllowedResponse();
  }

  const route = resolveMarkdownRoute(new URL(requestUrl).pathname);
  const page = getPageByNextRoute(options.manifest, route);

  if (!page || getPublishedPages([page], options).length === 0) {
    return new Response(method === 'HEAD' ? null : 'Not found\n', {
      status: 404,
      headers: textHeaders('private, no-store'),
    });
  }

  const markdownOptions =
    typeof options.markdown === 'function'
      ? options.markdown(page)
      : options.markdown;
  const body =
    typeof markdownOptions === 'string'
      ? ensureTrailingNewline(markdownOptions)
      : createDocsMarkdown(page, markdownOptions);

  return new Response(method === 'HEAD' ? null : body, {
    headers: textHeaders(options.cacheControl ?? defaultCacheControl),
  });
}

function createLlmsResponse(
  method: string,
  options: NextDocsLlmsOptions,
): Response {
  if (method !== 'GET' && method !== 'HEAD') {
    return methodNotAllowedResponse();
  }

  const body = options.full
    ? createDocsLlmsFullText(options.manifest, options)
    : createDocsLlmsText(options.manifest, options);

  return new Response(method === 'HEAD' ? null : body, {
    headers: textHeaders(options.cacheControl ?? defaultCacheControl),
  });
}

function resolvePagesMarkdownRoute(
  request: NextApiRequest,
): string | undefined {
  const queryRoute = request.query.route ?? request.query.slug;

  if (Array.isArray(queryRoute)) {
    return `/${queryRoute.join('/')}.md`;
  }

  if (queryRoute) {
    return queryRoute.startsWith('/') ? queryRoute : `/${queryRoute}`;
  }

  return request.url;
}

function resolveMarkdownRoute(pathname: string): string {
  return pathname.endsWith('.md') ? pathname.slice(0, -3) || '/' : pathname;
}

function textHeaders(cacheControl: string): Record<string, string> {
  return {
    'cache-control': cacheControl,
    'content-type': 'text/markdown; charset=utf-8',
    'x-content-type-options': 'nosniff',
  };
}

function methodNotAllowedResponse(): Response {
  return new Response('Method not allowed\n', {
    status: 405,
    headers: {
      ...textHeaders('private, no-store'),
      allow: 'GET, HEAD',
    },
  });
}

function resolvePublicUrl(path: string, siteUrl: string | undefined): string {
  if (/[\r\n<>"]/.test(path)) {
    throw new Error(`Invalid public docs URL "${path}".`);
  }

  if (!siteUrl) {
    return path;
  }

  try {
    const url = new URL(path, siteUrl);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(
        `Unsupported public docs URL protocol "${url.protocol}".`,
      );
    }

    return url.toString();
  } catch {
    throw new Error(`Invalid public docs site URL "${siteUrl}".`);
  }
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith('\n') ? value : `${value}\n`;
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
