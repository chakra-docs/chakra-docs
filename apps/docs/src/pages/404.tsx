import { Button, Heading, Stack, Text } from '@chakra-ui/react';
import Head from 'next/head';
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found - Chakra Docs</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Stack
        as="main"
        align="center"
        justify="center"
        minH="100vh"
        px={6}
        textAlign="center"
      >
        <Text color="teal.700" fontWeight="bold">
          404
        </Text>
        <Heading as="h1">Page not found</Heading>
        <Text color="gray.600">
          The page may have moved, or the address may be incorrect.
        </Text>
        <Button asChild colorPalette="teal">
          <Link href="/">Return home</Link>
        </Button>
      </Stack>
    </>
  );
}
