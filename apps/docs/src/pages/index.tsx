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
import { Box, Heading, Stack, Text } from '@chakra-ui/react';
import type { GetStaticProps } from 'next';
import { SiteMetadata } from '../components/site-metadata';
import { LuArrowRight } from 'react-icons/lu';
import { SiteLink } from '../components/site-link';
import { SiteDocsMobileControls } from '../components/site-docs-mobile-controls';
import { SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';
import { guides } from '../docs/guides';
import {
  getRecommendedSearchResults,
  type RecommendedSearchResult,
} from '../docs/search-recommendations';

interface IndexPageProps {
  recommendedSearchResults: RecommendedSearchResult[];
  collectionOptions: DocsCollectionOption[];
  nav: DocsNavItem[];
}
const description =
  'Composable documentation for Chakra UI sites. Your content, your theme, your routing.';
const page: DocsPage = {
  id: 'welcome',
  route: '/',
  path: '',
  slug: [],
  title: 'Chakra Docs',
  description,
  frontmatter: {},
  headings: [
    {
      id: 'explore-the-documentation',
      title: 'Explore the documentation',
      level: 2,
    },
    { id: 'more-resources', title: 'More resources', level: 2 },
  ],
};

export default function Index(props: IndexPageProps) {
  return (
    <>
      <SiteMetadata
        title="Chakra Docs - Composable documentation for Chakra UI"
        description={description}
        path="/"
      />
      <StructuredData description={description} path="/" title="Chakra Docs" />
      <SiteShell
        collectionOptions={props.collectionOptions}
        recommendedSearchResults={props.recommendedSearchResults}
      >
        <DocsLayout
          nav={props.nav}
          page={page}
          headings={page.headings}
          sidebarCollapsible
          sidebarDefaultExpanded="active"
          mobileNavigation={false}
          mobileToc={false}
        >
          <SiteDocsMobileControls
            nav={props.nav}
            page={page}
            recommendedSearchResults={props.recommendedSearchResults}
          />
          <DocsArticle page={page} headings={page.headings}>
            <Stack gap={10}>
              <Stack align="flex-start" gap={4}>
                <Text color="fg.muted" fontSize="lg" lineHeight="tall">
                  Bring accessible navigation, search, page actions, and
                  Markdown rendering to your existing React or Next.js
                  application. Start with native Chakra UI recipes and make the
                  experience your own.
                </Text>
                <Box w="full">
                  <MarkdownContent
                    source={
                      '```bash\nnpm install @chakra-docs/chakra @chakra-docs/core @chakra-docs/next\n```'
                    }
                  />
                </Box>
                <SiteLink
                  href="/docs/installation"
                  color="fg"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  fontWeight="medium"
                >
                  Read the getting-started guide
                  <LuArrowRight aria-hidden="true" />
                </SiteLink>
              </Stack>
              <Box>
                <Heading
                  as="h2"
                  id="explore-the-documentation"
                  mb={4}
                  size="xl"
                >
                  Explore the documentation
                </Heading>
                <DocsCards.Root>
                  {guides.map((guide) => (
                    <DocsCards.Card key={guide.href} {...guide} />
                  ))}
                </DocsCards.Root>
              </Box>
              <Box>
                <Heading as="h2" id="more-resources" mb={3} size="lg">
                  More resources
                </Heading>
                <Text color="fg.muted">
                  Explore the{' '}
                  <SiteLink href="/showcase">component showcase</SiteLink>,
                  review the{' '}
                  <SiteLink href="https://github.com/chakra-docs/chakra-docs">
                    source on GitHub
                  </SiteLink>
                  , or meet the{' '}
                  <SiteLink href="/withoss">open-source projects</SiteLink>{' '}
                  behind this site.
                </Text>
              </Box>
            </Stack>
          </DocsArticle>
        </DocsLayout>
      </SiteShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
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
