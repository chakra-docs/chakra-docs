import {
  DocsSearch,
  DocsVersionSelect,
  type DocsVersionOption,
} from '@chakra-docs/chakra';
import { createHttpSearchProvider } from '@chakra-docs/search/client';
import {
  Box,
  Container,
  Flex,
  HStack,
  Link as ChakraLink,
  Text,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, type ReactNode } from 'react';

export interface SiteShellProps {
  children: ReactNode;
  collectionOptions?: DocsVersionOption[];
  initialCollectionId?: string;
}

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/docs', label: 'Docs' },
  { href: '/showcase', label: 'Showcase' },
];
const siteMaxW = '7xl';
const searchProvider = createHttpSearchProvider('/api/docs/search');

export function SiteShell(props: SiteShellProps) {
  const router = useRouter();
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    props.initialCollectionId ?? '',
  );
  const collectionOptions = props.collectionOptions ?? [];

  useEffect(() => {
    setSelectedCollectionId(props.initialCollectionId ?? '');
  }, [props.initialCollectionId]);

  return (
    <Box bg="gray.50" color="gray.950" minH="100vh">
      <Box
        as="header"
        bg="white/90"
        borderBottomColor="gray.200"
        borderBottomWidth="1px"
        position="sticky"
        top={0}
        zIndex={20}
      >
        <Container maxW={siteMaxW} px={{ base: 4, md: 8 }}>
          <Flex
            align={{ base: 'flex-start', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            gap={{ base: 3, md: 6 }}
            justify="space-between"
            minH={{ base: 'auto', md: 16 }}
            py={{ base: 3, md: 0 }}
          >
            <HStack gap={3} minW={0} wrap="wrap">
              <ChakraLink asChild flexShrink={0} fontWeight="bold">
                <Link href="/">
                  <HStack gap={3}>
                    <Flex
                      align="center"
                      bg="teal.700"
                      borderRadius="md"
                      boxSize={9}
                      color="white"
                      fontWeight="extrabold"
                      justify="center"
                    >
                      C
                    </Flex>
                    <Text>Chakra Docs</Text>
                  </HStack>
                </Link>
              </ChakraLink>

              {collectionOptions.length > 0 ? (
                <DocsVersionSelect
                  allLabel="All versions"
                  includeAll
                  label="Version"
                  labelHidden
                  onValueChange={setSelectedCollectionId}
                  options={collectionOptions}
                  selectSlotProps={{ minW: '7rem' }}
                  slotProps={{ flexShrink: 0 }}
                  value={selectedCollectionId}
                />
              ) : null}
            </HStack>

            <HStack gap={3} wrap="wrap">
              <DocsSearch
                collectionId={selectedCollectionId || undefined}
                onNavigate={(href) => {
                  void router.push(href);
                }}
                searchProvider={searchProvider}
              />
              <HStack as="nav" aria-label="Main navigation" gap={1} wrap="wrap">
                {navItems.map((item) => (
                  <ChakraLink
                    asChild
                    borderRadius="md"
                    color="gray.600"
                    fontSize="sm"
                    fontWeight="semibold"
                    key={item.href}
                    px={3}
                    py={2}
                    _hover={{ bg: 'gray.100', color: 'gray.950' }}
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </ChakraLink>
                ))}
              </HStack>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container
        as="main"
        maxW={siteMaxW}
        px={{ base: 4, md: 8 }}
        py={{ base: 8, md: 12 }}
      >
        {props.children}
      </Container>

      <Box as="footer" borderTopColor="gray.200" borderTopWidth="1px">
        <Container maxW={siteMaxW} px={{ base: 4, md: 8 }} py={6}>
          <Text color="gray.600" fontSize="sm">
            Created by{' '}
            <ChakraLink href="https://www.ryanhefner.com">
              Ryan Hefner
            </ChakraLink>{' '}
            and{' '}
            <ChakraLink href="https://commune.software">
              Commune Software
            </ChakraLink>
            .
          </Text>
        </Container>
      </Box>
    </Box>
  );
}
