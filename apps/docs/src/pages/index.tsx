import {
  createCollectionOptions,
  type DocsCollectionOption,
} from '@chakra-docs/core';
import { serializeNextProps } from '@chakra-docs/next/pages';
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Grid,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';

interface IndexPageProps {
  collectionOptions: DocsCollectionOption[];
}

const features = [
  {
    kicker: 'Marketing pages',
    title: 'Normal Pages Router routes',
    description:
      'The home and showcase pages are ordinary Next pages with custom layout, metadata, and presentation.',
  },
  {
    kicker: 'Docs routes',
    title: 'Chakra Docs handles the section',
    description:
      'The /docs catch-all route uses Chakra Docs manifests, nav, headings, pagination, and Chakra UI rendering primitives.',
  },
  {
    kicker: 'Content source',
    title: 'Filesystem Markdown today',
    description:
      'The sample app builds its docs manifest from local Markdown, but the same shape can come from Git, custom sources, or generated data.',
  },
];

const pageTitle = 'Chakra Docs - Composable documentation for Chakra sites';
const pageDescription =
  'A Next Pages Router example that composes Chakra Docs into a flexible product site.';

export function Index(props: IndexPageProps) {
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <StructuredData
        description={pageDescription}
        path="/"
        title="Chakra Docs"
      />
      <SiteShell collectionOptions={props.collectionOptions}>
        <Grid
          alignItems="center"
          gap={{ base: 10, lg: 12 }}
          minH={{ base: 'auto', lg: 'calc(100vh - 220px)' }}
          pb={{ base: 12, md: 16 }}
          templateColumns={{ base: '1fr', lg: '1fr 0.86fr' }}
        >
          <Stack gap={6}>
            <Badge alignSelf="flex-start" colorPalette="teal" variant="subtle">
              Next Pages Router example
            </Badge>
            <Heading
              as="h1"
              fontSize={{ base: '4xl', md: '6xl' }}
              letterSpacing="normal"
              lineHeight="1.02"
            >
              Chakra Docs
            </Heading>
            <Text
              color="gray.600"
              fontSize={{ base: 'lg', md: 'xl' }}
              maxW="2xl"
            >
              A documentation section that plugs into a normal Next site without
              taking over the rest of the product experience.
            </Text>
            <Flex gap={3} wrap="wrap">
              <Button asChild colorPalette="teal" size="lg">
                <Link href="/docs">Read the docs</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/showcase">View showcase</Link>
              </Button>
            </Flex>
          </Stack>

          <DocsPreview />
        </Grid>

        <Box
          borderTopColor="gray.200"
          borderTopWidth="1px"
          py={{ base: 12, md: 16 }}
        >
          <Stack gap={2} mb={8}>
            <Badge alignSelf="flex-start" colorPalette="teal" variant="subtle">
              Composition model
            </Badge>
            <Heading as="h2" size="3xl">
              Keep the site. Add the docs.
            </Heading>
          </Stack>
          <SimpleGrid columns={{ base: 1, lg: 3 }} gap={4}>
            {features.map((feature) => (
              <Box
                as="article"
                bg="white"
                borderColor="gray.200"
                borderRadius="md"
                borderWidth="1px"
                key={feature.title}
                minH="210px"
                p={6}
              >
                <Text
                  color="teal.700"
                  fontSize="xs"
                  fontWeight="bold"
                  mb={3}
                  textTransform="uppercase"
                >
                  {feature.kicker}
                </Text>
                <Heading as="h3" size="md">
                  {feature.title}
                </Heading>
                <Text color="gray.600" mt={4}>
                  {feature.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Grid
          borderTopColor="gray.200"
          borderTopWidth="1px"
          gap={8}
          py={{ base: 12, md: 16 }}
          templateColumns={{ base: '1fr', lg: '0.82fr 1fr' }}
        >
          <Stack gap={4}>
            <Badge alignSelf="flex-start" colorPalette="teal" variant="subtle">
              What this demonstrates
            </Badge>
            <Heading as="h2" size="3xl">
              Docs as one part of the application
            </Heading>
            <Text color="gray.600" fontSize="lg">
              This app keeps shared navigation and product pages at the site
              level. The documentation route composes Chakra Docs underneath
              that shell, so a team can own brand, landing pages, auth, or
              commerce separately from the docs system.
            </Text>
          </Stack>
          <Box
            as="pre"
            bg="gray.950"
            borderRadius="md"
            color="teal.100"
            fontSize="sm"
            m={0}
            minH="170px"
            overflow="auto"
            p={6}
          >
            <Code as="code" bg="transparent" color="inherit" whiteSpace="pre">
              {`export const getStaticPaths = async () => {
  const manifest = await getDocsManifest()
  return createGetStaticPaths({ manifest })()
}`}
            </Code>
          </Box>
        </Grid>
      </SiteShell>
    </>
  );
}

function DocsPreview() {
  return (
    <Box
      aria-label="Documentation layout preview"
      bg="white"
      borderColor="gray.200"
      borderRadius="md"
      borderWidth="1px"
      boxShadow="xl"
      display={{ base: 'none', md: 'block' }}
      overflow="hidden"
    >
      <Flex borderBottomColor="gray.200" borderBottomWidth="1px" gap={2} p={4}>
        <Box bg="orange.500" borderRadius="full" boxSize={2.5} />
        <Box bg="teal.600" borderRadius="full" boxSize={2.5} />
        <Box bg="red.600" borderRadius="full" boxSize={2.5} />
      </Flex>
      <Grid minH="360px" templateColumns="150px 1fr">
        <Stack
          align="stretch"
          bg="gray.100"
          borderRightColor="gray.200"
          borderRightWidth="1px"
          gap={4}
          p={5}
        >
          <Box bg="teal.700" borderRadius="md" h={3} />
          <Box bg="gray.300" borderRadius="md" h={3} />
          <Box bg="gray.300" borderRadius="md" h={3} />
          <Box bg="gray.300" borderRadius="md" h={3} />
        </Stack>
        <Stack gap={4} p={8}>
          <Box bg="gray.900" borderRadius="md" h={8} w="72%" />
          <Box bg="gray.300" borderRadius="md" h={3.5} w="94%" />
          <Box bg="gray.300" borderRadius="md" h={3.5} w="66%" />
          <Stack bg="gray.950" borderRadius="md" gap={2.5} mt={2} p={5}>
            <Box bg="teal.300" borderRadius="md" h={3} w="80%" />
            <Box bg="yellow.300" borderRadius="md" h={3} w="62%" />
            <Box bg="blue.300" borderRadius="md" h={3} w="72%" />
          </Stack>
        </Stack>
      </Grid>
    </Box>
  );
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const { getDocsManifest } = await import('../docs/manifest');
  const manifest = await getDocsManifest();

  return {
    props: serializeNextProps({
      collectionOptions: createCollectionOptions(manifest.collections),
    }),
  };
};

export default Index;
