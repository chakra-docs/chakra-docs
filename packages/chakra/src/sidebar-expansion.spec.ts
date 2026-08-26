import type { DocsNavItem } from '@chakra-docs/core';
import {
  getActiveSidebarBranchIds,
  getSidebarBranchIds,
  mergeActiveSidebarBranchIds,
  normalizeSidebarExpandedIds,
  resolveSidebarDefaultExpandedIds,
  sidebarExpandedIdsEqual,
  toggleSidebarExpandedId,
} from './sidebar-expansion.js';

const nav: DocsNavItem[] = [
  {
    id: 'guides',
    title: 'Guides',
    children: [
      {
        id: 'start',
        title: 'Start',
        children: [{ id: 'install', title: 'Install', href: '/docs/install' }],
      },
      { id: 'advanced', title: 'Advanced', href: '/docs/advanced' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    children: [{ id: 'api', title: 'API', href: '/docs/api' }],
  },
  {
    id: 'hidden',
    title: 'Hidden',
    hidden: true,
    children: [{ id: 'secret', title: 'Secret', href: '/docs/secret' }],
  },
];

describe('sidebar expansion helpers', () => {
  it('collects visible branch IDs in navigation order', () => {
    expect(getSidebarBranchIds(nav)).toEqual(['guides', 'start', 'reference']);
  });

  it('finds every branch on the active route path', () => {
    expect(getActiveSidebarBranchIds(nav, '/docs/install')).toEqual([
      'guides',
      'start',
    ]);
    expect(getActiveSidebarBranchIds(nav, '/docs/api')).toEqual(['reference']);
    expect(getActiveSidebarBranchIds(nav, '/docs/missing')).toEqual([]);
  });

  it('resolves active, all, none, and explicit defaults', () => {
    expect(
      resolveSidebarDefaultExpandedIds(nav, '/docs/install', 'active'),
    ).toEqual(['guides', 'start']);
    expect(resolveSidebarDefaultExpandedIds(nav, undefined, 'all')).toEqual([
      'guides',
      'start',
      'reference',
    ]);
    expect(resolveSidebarDefaultExpandedIds(nav, undefined, 'none')).toEqual(
      [],
    );
    expect(
      resolveSidebarDefaultExpandedIds(nav, undefined, [
        'missing',
        'reference',
      ]),
    ).toEqual(['reference']);
  });

  it('preserves manual expansion while adding the active branch', () => {
    expect(
      mergeActiveSidebarBranchIds(nav, '/docs/install', ['reference']),
    ).toEqual(['guides', 'start', 'reference']);
  });

  it('toggles nested branches independently and normalizes their order', () => {
    expect(toggleSidebarExpandedId(nav, ['reference'], 'start')).toEqual([
      'start',
      'reference',
    ]);
    expect(toggleSidebarExpandedId(nav, ['guides', 'start'], 'start')).toEqual([
      'guides',
    ]);
    expect(normalizeSidebarExpandedIds(nav, ['unknown', 'start'])).toEqual([
      'start',
    ]);
  });

  it('compares ordered expansion snapshots', () => {
    expect(sidebarExpandedIdsEqual(['guides'], ['guides'])).toBe(true);
    expect(sidebarExpandedIdsEqual(['guides'], ['reference'])).toBe(false);
  });
});
