import type { DocsNavItem } from '@chakra-docs/core';

export type DocsSidebarDefaultExpanded =
  'active' | 'all' | 'none' | readonly string[];

export function getSidebarBranchIds(items: readonly DocsNavItem[]): string[] {
  return items.flatMap((item) => {
    if (item.hidden) {
      return [];
    }

    const children = (item.children ?? []).filter((child) => !child.hidden);
    return children.length > 0
      ? [item.id, ...getSidebarBranchIds(children)]
      : [];
  });
}

export function getActiveSidebarBranchIds(
  items: readonly DocsNavItem[],
  activeRoute: string | undefined,
): string[] {
  if (!activeRoute) {
    return [];
  }

  return findActiveSidebarBranchPath(items, activeRoute) ?? [];
}

function findActiveSidebarBranchPath(
  items: readonly DocsNavItem[],
  activeRoute: string,
): string[] | undefined {
  for (const item of items) {
    if (item.hidden) {
      continue;
    }

    const children = (item.children ?? []).filter((child) => !child.hidden);
    const childPath = findActiveSidebarBranchPath(children, activeRoute);

    if (item.href === activeRoute) {
      return children.length > 0 ? [item.id] : [];
    }

    if (childPath !== undefined) {
      return children.length > 0 ? [item.id, ...childPath] : childPath;
    }
  }

  return undefined;
}

export function normalizeSidebarExpandedIds(
  items: readonly DocsNavItem[],
  expandedIds: readonly string[],
): string[] {
  const expanded = new Set(expandedIds);
  return getSidebarBranchIds(items).filter((id) => expanded.has(id));
}

export function resolveSidebarDefaultExpandedIds(
  items: readonly DocsNavItem[],
  activeRoute: string | undefined,
  defaultExpanded: DocsSidebarDefaultExpanded = 'active',
): string[] {
  if (defaultExpanded === 'all') {
    return getSidebarBranchIds(items);
  }

  if (defaultExpanded === 'active') {
    return getActiveSidebarBranchIds(items, activeRoute);
  }

  if (defaultExpanded === 'none') {
    return [];
  }

  return normalizeSidebarExpandedIds(items, defaultExpanded);
}

export function mergeActiveSidebarBranchIds(
  items: readonly DocsNavItem[],
  activeRoute: string | undefined,
  expandedIds: readonly string[],
): string[] {
  return normalizeSidebarExpandedIds(items, [
    ...expandedIds,
    ...getActiveSidebarBranchIds(items, activeRoute),
  ]);
}

export function toggleSidebarExpandedId(
  items: readonly DocsNavItem[],
  expandedIds: readonly string[],
  id: string,
): string[] {
  const expanded = new Set(normalizeSidebarExpandedIds(items, expandedIds));

  if (expanded.has(id)) {
    expanded.delete(id);
  } else {
    expanded.add(id);
  }

  return getSidebarBranchIds(items).filter((branchId) =>
    expanded.has(branchId),
  );
}

export function sidebarExpandedIdsEqual(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}
