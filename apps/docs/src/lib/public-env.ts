export function getPublicSiteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const required = process.env.CHAKRA_DOCS_REQUIRE_SITE_URL === 'true';

  if (!value) {
    if (required) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is required when CHAKRA_DOCS_REQUIRE_SITE_URL=true.',
      );
    }

    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute URL.');
  }

  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.',
    );
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must contain only an origin, without credentials, a path, a query, or a fragment.',
    );
  }

  return url.origin;
}
export const SHARED_FONTSTACK_KIT_URL =
  'https://kits.fontstack.com/kit/o0v0t0oi.css';

export function getFontstackKitUrl(): string | undefined {
  const value = (
    process.env.NEXT_PUBLIC_FONTSTACK_KIT_URL ?? SHARED_FONTSTACK_KIT_URL
  ).trim();
  if (!value) return undefined;
  const url = new URL(value);
  if (
    url.origin !== 'https://kits.fontstack.com' ||
    !/^\/kit\/[a-zA-Z0-9_-]+\.css$/.test(url.pathname) ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'NEXT_PUBLIC_FONTSTACK_KIT_URL must be an HTTPS Fontstack kit stylesheet URL.',
    );
  }
  return url.href;
}
