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
import type { RecommendedSearchResult } from '../docs/search-recommendations';
import { SiteLink } from './site-link';

export interface SiteShellProps {
  children: ReactNode;
  collectionOptions?: DocsVersionOption[];
  initialCollectionId?: string;
  recommendedSearchResults?: readonly RecommendedSearchResult[];
}

const searchProvider = createHttpSearchProvider('/api/docs/search');

export function SiteSearch({
  collectionId,
  recommendedSearchResults,
}: {
  collectionId?: string;
  recommendedSearchResults?: readonly RecommendedSearchResult[];
}) {
  const router = useRouter();
  return (
    <DocsSearch
      defaultResults={recommendedSearchResults}
      defaultResultsLabel="Recommended"
      popularLimit={6}
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
            <Flex css={styles.brandGroup}>
              <SiteLink href="/" css={styles.brand}>
                chakra-docs
              </SiteLink>
              <Box as="span" css={styles.version}>
                v0.3.0
              </Box>
            </Flex>
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
              <SiteSearch
                collectionId={selectedCollectionId}
                recommendedSearchResults={props.recommendedSearchResults}
              />
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
