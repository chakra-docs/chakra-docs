import {
  DocsArticle,
  DocsCards,
  DocsLayout,
  MarkdownContent,
} from '@chakra-docs/chakra';
import {
  createCollectionOptions,
  type DocsCollectionOption,
  type DocsNavItem,
  type DocsPage,
} from '@chakra-docs/core';
import { serializeNextProps } from '@chakra-docs/next/pages';
import { Stack, Text } from '@chakra-ui/react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { SiteSearch, SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';
import { guides } from '../docs/guides';
import {
  getRecommendedSearchResults,
  type RecommendedSearchResult,
} from '../docs/search-recommendations';

interface ShowcasePageProps {
  recommendedSearchResults: RecommendedSearchResult[];
  collectionOptions: DocsCollectionOption[];
  nav: DocsNavItem[];
}
const page: DocsPage = {
  id: 'showcase',
  route: '/showcase',
  path: '',
  slug: ['showcase'],
  title: 'Component showcase',
  description:
    'Explore working examples of the primitives powering this documentation site.',
  frontmatter: {},
};

export default function ShowcasePage(props: ShowcasePageProps) {
  return (
    <>
      <Head>
        <title>Component showcase - Chakra Docs</title>
        <meta name="description" content={page.description} />
      </Head>
      <StructuredData
        path={page.route}
        title={page.title}
        description={page.description}
      />
      <SiteShell
        collectionOptions={props.collectionOptions}
        recommendedSearchResults={props.recommendedSearchResults}
      >
        <DocsLayout
          nav={props.nav}
          page={page}
          sidebarCollapsible
          sidebarDefaultExpanded="active"
          mobileNavigationProps={{
            title: 'Browse documentation',
            search: (
              <SiteSearch
                recommendedSearchResults={props.recommendedSearchResults}
              />
            ),
          }}
        >
          <DocsArticle page={page}>
            <Stack gap={8}>
              <Text color="fg.muted">
                This site uses the same native layout, search, code blocks, and
                page actions available to your application. Follow the examples
                below to see each feature in context.
              </Text>
              <MarkdownContent
                source={
                  '> Everything starts with your Chakra theme. Override recipes globally, or use slot props for a single instance.\n\n```tsx\n<DocsLayout nav={nav} page={page} sidebarCollapsible>\n  <DocsArticle page={page}>\n    <MarkdownContent source={page.body} />\n  </DocsArticle>\n</DocsLayout>\n```'
                }
              />
              <DocsCards.Root>
                {guides.map((guide) => (
                  <DocsCards.Card key={guide.href} {...guide} />
                ))}
              </DocsCards.Root>
            </Stack>
          </DocsArticle>
        </DocsLayout>
      </SiteShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<ShowcasePageProps> = async () => {
  const { getDocsManifest } = await import('../docs/manifest');
  const manifest = await getDocsManifest();
  return {
    props: serializeNextProps({
      collectionOptions: createCollectionOptions(manifest.collections),
      nav: manifest.nav,
      recommendedSearchResults: getRecommendedSearchResults(manifest.search),
    }),
  };
};
