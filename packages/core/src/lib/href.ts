const relativeHrefBase = new URL('https://chakra-docs.invalid/');
const explicitSchemePattern = /^[a-z][a-z\d+.-]*:/i;
const networkPathPattern = /^[\\/]{2}/;
const safeExternalProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Returns whether an href resolves relative to the current origin. */
export function isSafeRelativeHref(href: string): boolean {
  const url = parseHref(href);

  return (
    url !== undefined &&
    !explicitSchemePattern.test(href) &&
    !networkPathPattern.test(href) &&
    url.origin === relativeHrefBase.origin
  );
}

/**
 * Returns whether an href is safe for a rendered documentation link.
 * Relative links and explicitly allowlisted non-executable schemes are valid;
 * network-path references such as `//example.com` are deliberately rejected.
 */
export function isSafeLinkHref(href: string): boolean {
  if (isSafeRelativeHref(href)) {
    return true;
  }

  const url = parseHref(href);
  return (
    url !== undefined &&
    explicitSchemePattern.test(href) &&
    safeExternalProtocols.has(url.protocol)
  );
}

/** Returns whether a search result route is an origin-relative path. */
export function isSafeDocsRoute(route: string): boolean {
  return route.startsWith('/') && isSafeRelativeHref(route);
}

function parseHref(href: string): URL | undefined {
  if (!href || href !== href.trim() || containsControlCharacter(href)) {
    return undefined;
  }

  try {
    return new URL(href, relativeHrefBase);
  } catch {
    return undefined;
  }
}

function containsControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }

  return false;
}
