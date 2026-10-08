import type { DocsNavItem, DocsPage } from '@chakra-docs/core';
import {
  DocsArticle,
  DocsBreadcrumbs,
  DocsApiTable,
  DocsLayout,
  DocsPageActions,
  DocsPagination,
  MarkdownContent,
  type DocsVersionOption,
} from '@chakra-docs/chakra';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { SiteMetadata } from '../../components/site-metadata';
import { Box, Flex } from '@chakra-ui/react';
import { LuChevronDown } from 'react-icons/lu';
import { PostkitMarkdown } from '../../components/postkit-markdown';
import { SiteDocsMobileControls } from '../../components/site-docs-mobile-controls';
import { SiteShell } from '../../components/site-shell';
import { StructuredData } from '../../components/structured-data';
import {
  getRecommendedSearchResults,
  type RecommendedSearchResult,
} from '../../docs/search-recommendations';

interface DocsRoutePageProps {
  recommendedSearchResults: RecommendedSearchResult[];
  collectionOptions: DocsVersionOption[];
  page: DocsPage;
  nav: DocsNavItem[];
}

export default function DocsRoutePage(props: DocsRoutePageProps) {
  return (
    <>
      <SiteMetadata
        title={`${props.page.title} - Chakra Docs`}
        description={props.page.description}
        path={props.page.route}
        article
      />
      <StructuredData
        breadcrumbs={createDocsBreadcrumbs(props.page)}
        description={props.page.description}
        path={props.page.route}
        title={props.page.title}
        type="TechArticle"
      />
      <SiteShell
        collectionOptions={props.collectionOptions}
        initialCollectionId={props.page.collectionId}
        recommendedSearchResults={props.recommendedSearchResults}
      >
        <DocsLayout
          headings={props.page.headings}
          nav={props.nav}
          page={props.page}
          sidebarCollapsible
          sidebarDefaultExpanded="active"
          mobileNavigation={false}
          mobileToc={false}
        >
          <SiteDocsMobileControls
            nav={props.nav}
            page={props.page}
            recommendedSearchResults={props.recommendedSearchResults}
          />
          <DocsArticle
            breadcrumbs={
              <Flex
                align="center"
                justify="space-between"
                columnGap={4}
                rowGap={3}
                wrap="wrap"
                w="full"
              >
                <DocsBreadcrumbs
                  homeHref="/"
                  homeLabel="Home"
                  nav={props.nav}
                  page={props.page}
                />
                <Box flexShrink={0} ms="auto">
                  {props.page.route === '/docs/components' ? (
                    <DocsPageActions.Root
                      markdown={props.page.body}
                      page={props.page}
                      variant="split"
                      size="md"
                      editUrl={`https://github.com/chakra-docs/chakra-docs/edit/main/apps/docs/src/content/docs/${props.page.path}`}
                    >
                      <DocsPageActions.CopyPage description={null} />
                      <DocsPageActions.Menu
                        ariaLabel="More page action examples"
                        icon={<LuChevronDown aria-hidden="true" />}
                      >
                        <DocsPageActions.Group label="Page tools">
                          <DocsPageActions.CopyPage />
                          <DocsPageActions.CopyLink />
                        </DocsPageActions.Group>
                        <DocsPageActions.Separator />
                        <DocsPageActions.Submenu label="Open in another chat">
                          <DocsPageActions.Item
                            action="open-chatgpt"
                            label="ChatGPT"
                          />
                          <DocsPageActions.Item
                            action="open-claude"
                            label="Claude"
                          />
                        </DocsPageActions.Submenu>
                      </DocsPageActions.Menu>
                    </DocsPageActions.Root>
                  ) : (
                    <DocsPageActions.Root
                      page={props.page}
                      size="sm"
                      variant="split"
                      editUrl={`https://github.com/chakra-docs/chakra-docs/edit/main/apps/docs/src/content/docs/${props.page.path}`}
                    />
                  )}
                </Box>
              </Flex>
            }
            headings={props.page.headings}
            page={props.page}
          >
            {props.page.route === '/docs/postkit' ? (
              <PostkitMarkdown page={props.page} />
            ) : (
              <MarkdownContent source={props.page.body ?? ''} />
            )}
            {props.page.route === '/docs/components' ? (
              <DocsApiTable
                caption="Responsive API table example"
                items={[
                  {
                    name: 'sidebarCollapsible',
                    type: 'boolean',
                    defaultValue: 'false',
                    description: 'Enables collapsible sidebar navigation.',
                  },
                  {
                    name: 'onSidebarExpandedChange',
                    type: '(expandedIds: readonly string[]) => void',
                    description:
                      'Receives the expanded section IDs when navigation changes.',
                  },
                ]}
              />
            ) : null}
            <DocsPagination nav={props.nav} page={props.page} />
          </DocsArticle>
        </DocsLayout>
      </SiteShell>
    </>
  );
}

function createDocsBreadcrumbs(page: DocsPage) {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Docs', path: '/docs' },
  ];

  if (page.route !== '/docs') {
    breadcrumbs.push({ name: page.title, path: page.route });
  }

  return breadcrumbs;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const [{ getDocsManifest }, { createGetStaticPaths }] = await Promise.all([
    import('../../docs/manifest'),
    import('@chakra-docs/next/pages'),
  ]);
  const manifest = await getDocsManifest();

  return createGetStaticPaths({ manifest })();
};

export const getStaticProps: GetStaticProps<DocsRoutePageProps> = async (
  context,
) => {
  const [
    { getDocsManifest },
    { createPagesRouterDocProps, serializeNextProps },
  ] = await Promise.all([
    import('../../docs/manifest'),
    import('@chakra-docs/next/pages'),
  ]);
  const manifest = await getDocsManifest();
  const slug = Array.isArray(context.params?.slug) ? context.params.slug : [];
  const route = `/docs/${slug.join('/')}`;
  const props = createPagesRouterDocProps({ manifest }, route);

  if (!props) {
    return { notFound: true };
  }

  return {
    props: serializeNextProps({
      collectionOptions: props.collectionOptions,
      nav: props.nav,
      page: props.page,
      recommendedSearchResults: getRecommendedSearchResults(manifest.search),
    }),
  };
};
