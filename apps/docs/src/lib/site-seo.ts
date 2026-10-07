/** Resolve only local page paths; never derive public URLs from request hosts. */
export function canonicalUrl(path: string, origin: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('Canonical paths must be local absolute paths.');
  }
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error('Canonical origin mismatch.');
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}

export function createSiteSitemap(
  origin: string,
  docsRoutes: readonly string[],
) {
  const urls = new Set(
    ['/', '/showcase', '/withoss', ...docsRoutes].map((path) =>
      canonicalUrl(path, origin),
    ),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...[...urls].map((url) => `<url><loc>${escapeXml(url)}</loc></url>`),
    '</urlset>',
  ].join('\n');
}

export function createSiteRobots(origin: string | undefined) {
  if (!origin) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /api/social-image',
    'Disallow: /api/',
    'Disallow: /og-image',
    'Disallow: /*/social-image$',
    'Disallow: /social-image$',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return entities[character];
  });
}
