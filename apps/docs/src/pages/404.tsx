import { Container, Heading, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import { SiteShell } from '../components/site-shell';
import { SiteLink } from '../components/site-link';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found - Chakra Docs</title>
        <meta name="robots" content="noindex" />
      </Head>
      <SiteShell>
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
