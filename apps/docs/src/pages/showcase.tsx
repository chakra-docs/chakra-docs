import {
  createCollectionOptions,
  type DocsCollectionOption,
} from '@chakra-docs/core';
import { serializeNextProps } from '@chakra-docs/next/pages';
import {
  Badge,
  Box,
  Flex,
  Grid,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';

interface ShowcasePageProps {
  collectionOptions: DocsCollectionOption[];
}

const showcaseItems = [
  {
    title: 'Product docs',
    description:
      'A marketing site can mount a complete docs section under /docs while keeping product pages custom.',
    status: 'Ready',
  },
  {
    title: 'Design system docs',
    description:
      'Teams can compose Chakra-based article layouts with their own navigation, auth, and release notes.',
    status: 'Placeholder',
  },
  {
    title: 'Package workspace docs',
    description:
      'This repo can document every package while still keeping examples, showcases, and smoke pages nearby.',
    status: 'Placeholder',
  },
];

const summaryItems = [
  { label: 'Landing page', value: 'Custom' },
  { label: 'Docs route', value: 'Chakra Docs' },
  { label: 'Showcase', value: 'Next page' },
];

const pageTitle = 'Showcase - Chakra Docs';
const pageDescription =
  'Placeholder showcase page for sites using Chakra Docs inside a larger Next app.';

export default function ShowcasePage(props: ShowcasePageProps) {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <StructuredData
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Showcase', path: '/showcase' },
        ]}
        description={pageDescription}
        path="/showcase"
        title="Showcase"
      />
      <SiteShell collectionOptions={props.collectionOptions}>
        <Grid
          alignItems="end"
          gap={{ base: 8, lg: 10 }}
          pb={{ base: 12, md: 16 }}
          templateColumns={{ base: '1fr', lg: '0.75fr 0.45fr' }}
        >
          <Stack gap={5}>
            <Badge alignSelf="flex-start" colorPalette="teal" variant="subtle">
              Showcase
            </Badge>
            <Heading as="h1" size="4xl">
              Examples can live beside the docs.
            </Heading>
            <Text color="gray.600" fontSize="lg" maxW="3xl">
              This placeholder route is intentionally just another Pages Router
              page. It demonstrates that the documentation section does not own
              the whole application surface.
            </Text>
          </Stack>

          <Stack
            aria-label="Showcase status summary"
            bg="white"
            borderColor="gray.200"
            borderRadius="md"
            borderWidth="1px"
            gap={0}
            p={5}
          >
            {summaryItems.map((item) => (
              <Flex
                align="center"
                borderBottomColor="gray.200"
                borderBottomWidth={item === summaryItems.at(-1) ? '0' : '1px'}
                justify="space-between"
                key={item.label}
                py={3}
              >
                <Text fontWeight="semibold">{item.label}</Text>
                <Badge colorPalette="teal" variant="subtle">
                  {item.value}
                </Badge>
              </Flex>
            ))}
          </Stack>
        </Grid>

        <Box
          borderTopColor="gray.200"
          borderTopWidth="1px"
          py={{ base: 12, md: 16 }}
        >
          <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4}>
            {showcaseItems.map((item) => (
              <Box
                as="article"
                bg="white"
                borderColor="gray.200"
                borderRadius="md"
                borderWidth="1px"
                key={item.title}
                minH="210px"
                p={6}
              >
                <Badge colorPalette="teal" variant="subtle">
                  {item.status}
                </Badge>
                <Heading as="h3" mt={4} size="md">
                  {item.title}
                </Heading>
                <Text color="gray.600" mt={4}>
                  {item.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
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
    }),
  };
};
