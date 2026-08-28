import type { DocsNavItem, DocsPage } from '@chakra-docs/core';
import {
  DocsArticle,
  DocsLayout,
  DocsPageActions,
  DocsPagination,
  MarkdownContent,
  type DocsVersionOption,
} from '@chakra-docs/chakra';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { PostkitMarkdown } from '../../components/postkit-markdown';
import { SiteShell } from '../../components/site-shell';
import { StructuredData } from '../../components/structured-data';

interface DocsRoutePageProps {
  collectionOptions: DocsVersionOption[];
  page: DocsPage;
  nav: DocsNavItem[];
}

export default function DocsRoutePage(props: DocsRoutePageProps) {
  return (
    <>
      <Head>
        <title>{`${props.page.title} - Chakra Docs`}</title>
        {props.page.description ? (
          <meta name="description" content={props.page.description} />
        ) : null}
      </Head>
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
      >
        <DocsLayout
          headings={props.page.headings}
          nav={props.nav}
          page={props.page}
          slotProps={{ maxW: 'full', px: 0, py: 0 }}
        >
          <DocsArticle
            actions={
              props.page.route === '/docs/components' ? (
                <DocsPageActions.Root
                  markdown={props.page.body}
                  page={props.page}
                  variant="split"
                >
                  <DocsPageActions.CopyPage description={null} />
                  <DocsPageActions.Menu
                    ariaLabel="More page action examples"
                    icon={<span aria-hidden="true">⌄</span>}
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
              ) : undefined
            }
            headings={props.page.headings}
            page={props.page}
          >
            {props.page.route === '/docs/postkit' ? (
              <PostkitMarkdown page={props.page} />
            ) : (
              <MarkdownContent source={props.page.body ?? ''} />
            )}
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
    }),
  };
};
