import { describe, expect, it } from 'vitest';
import {
  createHeadingIdGenerator,
  encodeRouteSegment,
  normalizeRoute,
} from './slug.js';

describe('routes', () => {
  it('normalizes root, duplicate separators, and trailing separators', () => {
    expect(normalizeRoute('')).toBe('/');
    expect(normalizeRoute('////')).toBe('/');
    expect(normalizeRoute('docs///guides//')).toBe('/docs/guides');
    expect(normalizeRoute('//docs///guides')).toBe('/docs/guides');
  });

  it('encodes route segments without permitting traversal semantics', () => {
    expect(encodeRouteSegment('space #?%')).toBe('space%20%23%3F%25');
    expect(encodeRouteSegment('%2e%2e')).toBe('%252e%252e');
    expect(encodeRouteSegment('.')).toBe('%2E');
    expect(encodeRouteSegment('..')).toBe('%2E%2E');
  });
});

describe('heading ids', () => {
  it('creates stable duplicate-safe heading ids', () => {
    const nextHeadingId = createHeadingIdGenerator();

    expect(nextHeadingId('Install')).toBe('install');
    expect(nextHeadingId('Install')).toBe('install-2');
    expect(nextHeadingId('Install!')).toBe('install-3');
    expect(nextHeadingId('###')).toBe('section');
    expect(nextHeadingId('###')).toBe('section-2');
  });
});
