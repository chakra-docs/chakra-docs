import type { DocsNavItem, DocsPage } from '@chakra-docs/core';
import {
  DocsMobileNavigation,
  DocsMobileTableOfContents,
} from '@chakra-docs/chakra';
import { Box, useSlotRecipe } from '@chakra-ui/react';
import type { RecommendedSearchResult } from '../docs/search-recommendations';
import { SiteSearch } from './site-shell';

export interface SiteDocsMobileControlsProps {
  nav: DocsNavItem[];
  page: DocsPage;
  recommendedSearchResults: readonly RecommendedSearchResult[];
}

export function SiteDocsMobileControls({
  nav,
  page,
  recommendedSearchResults,
}: SiteDocsMobileControlsProps) {
  const styles = useSlotRecipe({ key: 'siteDocsMobileControls' })({
    hasToc: Boolean(page.headings?.length),
  });

  return (
    <Box role="group" aria-label="Documentation controls" css={styles.root}>
      <DocsMobileNavigation.Root
        nav={nav}
        page={page}
        title="Browse documentation"
        sidebarProps={{ collapsible: true, defaultExpanded: 'active' }}
        slotProps={{ css: styles.navigation }}
        search={
          <SiteSearch
            collectionId={page.collectionId}
            recommendedSearchResults={recommendedSearchResults}
          />
        }
      />
      <DocsMobileTableOfContents
        headings={page.headings}
        slotProps={{ css: styles.toc }}
        triggerLabelSlotProps={{ css: styles.tocLabel }}
      />
    </Box>
  );
}
