import { Container, Heading, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import { serializeNextProps } from '@chakra-docs/next/pages';
import {
  getRecommendedSearchResults,
  type RecommendedSearchResult,
} from '../docs/search-recommendations';
import { SiteShell } from '../components/site-shell';
import { SiteLink } from '../components/site-link';

interface NotFoundPageProps {
  recommendedSearchResults: RecommendedSearchResult[];
}

export default function NotFoundPage(props: NotFoundPageProps) {
  return (
    <>
      <Head>
        <title>Page not found - Chakra Docs</title>
        <meta name="robots" content="noindex" />
      </Head>
      <SiteShell recommendedSearchResults={props.recommendedSearchResults}>
        <Container maxW="7xl" py={{ base: 12, md: 20 }}>
          <Stack gap={4} align="flex-start">
            <Text color="fg.muted" fontWeight="medium">
              404
            </Text>
            <Heading as="h1">Page not found</Heading>
            <Text color="fg.muted">
              The page may have moved, or the address may be incorrect.
            </Text>
            <SiteLink href="/">Return home</SiteLink>
          </Stack>
        </Container>
      </SiteShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<NotFoundPageProps> = async () => {
  const { getDocsManifest } = await import('../docs/manifest');
  const manifest = await getDocsManifest();
  return {
    props: serializeNextProps({
      recommendedSearchResults: getRecommendedSearchResults(manifest.search),
    }),
  };
};
