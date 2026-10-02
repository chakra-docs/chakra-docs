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
  IconButton,
  Portal,
  Tooltip,
  useSlotRecipe,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useEffect, useState, type ReactNode } from 'react';
import { SiGithub } from 'react-icons/si';
import { SiteLink } from './site-link';

export interface SiteShellProps {
  children: ReactNode;
  collectionOptions?: DocsVersionOption[];
  initialCollectionId?: string;
}

const searchProvider = createHttpSearchProvider('/api/docs/search');

export function SiteSearch({ collectionId }: { collectionId?: string }) {
  const router = useRouter();
  return (
    <DocsSearch
      prefetch="intent"
      collectionId={collectionId || undefined}
      searchProvider={searchProvider}
      onNavigate={(href) => {
        void router.push(href);
      }}
    />
  );
}

export function SiteShell(props: SiteShellProps) {
  const styles = useSlotRecipe({ key: 'siteShell' })();
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    props.initialCollectionId ?? '',
  );
  const collectionOptions = props.collectionOptions ?? [];
  useEffect(() => {
    setSelectedCollectionId(props.initialCollectionId ?? '');
  }, [props.initialCollectionId]);
  return (
    <Box css={styles.root}>
      <Box as="header" css={styles.header}>
        <Container css={styles.container}>
          <Flex align="center" justify="space-between" h="full" gap={2}>
            <SiteLink href="/" css={styles.brand}>
              chakra-docs
            </SiteLink>
            <HStack gap={2}>
              {collectionOptions.length > 1 ? (
                <DocsVersionSelect
                  allLabel="All versions"
                  includeAll
                  label="Version"
                  labelHidden
                  onValueChange={setSelectedCollectionId}
                  options={collectionOptions}
                  value={selectedCollectionId}
                />
              ) : null}
              <SiteSearch collectionId={selectedCollectionId} />
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    asChild
                    aria-label="View chakra-docs on GitHub"
                    variant="ghost"
                    css={styles.githubTrigger}
                  >
                    <SiteLink href="https://github.com/chakra-docs/chakra-docs">
                      <SiGithub aria-hidden="true" />
                    </SiteLink>
                  </IconButton>
                </Tooltip.Trigger>
                <Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Content>GitHub</Tooltip.Content>
                  </Tooltip.Positioner>
                </Portal>
              </Tooltip.Root>
            </HStack>
          </Flex>
        </Container>
      </Box>
      <Box as="main" css={styles.main}>
        {props.children}
      </Box>
    </Box>
  );
}
