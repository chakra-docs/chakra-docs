import type { DocsNavItem } from '@chakra-docs/core';

export interface DocsBreadcrumbItem {
  id: string;
  title: string;
  href?: string;
}

export function createDocsBreadcrumbItems(
  nav: readonly DocsNavItem[],
  activeRoute: string | undefined,
): DocsBreadcrumbItem[] {
  if (!activeRoute) {
    return [];
  }

  return findBreadcrumbPath(nav, activeRoute) ?? [];
}

function findBreadcrumbPath(
  items: readonly DocsNavItem[],
  activeRoute: string,
): DocsBreadcrumbItem[] | undefined {
  for (const item of items) {
    const current = {
      id: item.id,
      title: item.title,
      href: item.href,
    };

    if (item.href === activeRoute) {
      return [current];
    }

    const childPath = item.children
      ? findBreadcrumbPath(item.children, activeRoute)
      : undefined;

    if (childPath) {
      return [current, ...childPath];
    }
  }

  return undefined;
}
