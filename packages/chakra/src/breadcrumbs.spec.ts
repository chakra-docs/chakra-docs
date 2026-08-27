import { describe, expect, it } from 'vitest';
import type { DocsNavItem } from '@chakra-docs/core';
import { createDocsBreadcrumbItems } from './breadcrumbs.js';

const nav: DocsNavItem[] = [
  {
    id: 'guides',
    title: 'Guides',
    href: '/docs/guides',
    children: [
      {
        id: 'start',
        title: 'Get started',
        children: [{ id: 'install', title: 'Install', href: '/docs/install' }],
      },
    ],
  },
];

describe('createDocsBreadcrumbItems', () => {
  it('returns every ancestor and the active page', () => {
    expect(createDocsBreadcrumbItems(nav, '/docs/install')).toEqual([
      { id: 'guides', title: 'Guides', href: '/docs/guides' },
      { id: 'start', title: 'Get started', href: undefined },
      { id: 'install', title: 'Install', href: '/docs/install' },
    ]);
  });

  it('returns the active parent without descendants', () => {
    expect(createDocsBreadcrumbItems(nav, '/docs/guides')).toEqual([
      { id: 'guides', title: 'Guides', href: '/docs/guides' },
    ]);
  });

  it('returns an empty list for missing routes', () => {
    expect(createDocsBreadcrumbItems(nav, '/docs/missing')).toEqual([]);
    expect(createDocsBreadcrumbItems(nav, undefined)).toEqual([]);
  });
});
