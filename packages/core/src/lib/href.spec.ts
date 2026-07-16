import { describe, expect, it } from 'vitest';
import { isSafeDocsRoute, isSafeLinkHref, isSafeRelativeHref } from './href.js';

describe('safe hrefs', () => {
  it.each([
    '/',
    '/docs/install',
    '/docs/install?version=3#usage',
    'docs/install',
    './install',
    '../install',
    '?version=3',
    '#usage',
  ])('accepts same-origin relative href %s', (href) => {
    expect(isSafeRelativeHref(href)).toBe(true);
    expect(isSafeLinkHref(href)).toBe(true);
  });

  it.each([
    'https://example.com/docs',
    'HTTP://example.com/docs',
    'mailto:docs@example.com',
    'TEL:+1-212-555-0100',
  ])('accepts allowlisted external href %s', (href) => {
    expect(isSafeLinkHref(href)).toBe(true);
    expect(isSafeRelativeHref(href)).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'javascript:alert(1) ',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    `java${String.fromCharCode(0)}script:alert(1)`,
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//example.com/docs',
    String.raw`/\example.com/docs`,
    String.raw`\\example.com/docs`,
  ])('rejects unsafe or ambiguous href %s', (href) => {
    expect(isSafeLinkHref(href)).toBe(false);
    expect(isSafeRelativeHref(href)).toBe(false);
  });
});

describe('safe docs routes', () => {
  it.each(['/', '/docs/install', '/docs/install?version=3#usage'])(
    'accepts origin-relative route %s',
    (route) => {
      expect(isSafeDocsRoute(route)).toBe(true);
    },
  );

  it.each([
    '',
    'docs/install',
    './install',
    '../install',
    '?version=3',
    '#usage',
    '//example.com/docs',
    'https://example.com/docs',
    'javascript:alert(1)',
  ])('rejects non-route value %s', (route) => {
    expect(isSafeDocsRoute(route)).toBe(false);
  });
});
