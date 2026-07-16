export function slugToKey(slug: string[]): string {
  return slug.join('/');
}

export function normalizeRoute(route: string): string {
  const prefixed = route.startsWith('/') ? route : `/${route}`;
  const collapsed = prefixed.replace(/\/{2,}/g, '/');
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

export function encodeRouteSegment(segment: string): string {
  const encoded = encodeURIComponent(segment).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  if (encoded === '.' || encoded === '..') {
    return encoded.replace(/\./g, '%2E');
  }

  return encoded;
}

export function createHeadingId(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createHeadingIdGenerator(): (title: string) => string {
  const counts = new Map<string, number>();

  return (title) => {
    const baseId = createHeadingId(title) || 'section';
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);

    return count === 0 ? baseId : `${baseId}-${count + 1}`;
  };
}
