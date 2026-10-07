import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  useSlotRecipe,
} from '@chakra-ui/react';
import { SiteMetadata } from '../components/site-metadata';
import type { GetStaticProps } from 'next';
import { serializeNextProps } from '@chakra-docs/next/pages';
import {
  getRecommendedSearchResults,
  type RecommendedSearchResult,
} from '../docs/search-recommendations';
import { ossProjectGroups } from '../lib/oss-projects';
import { OssMark } from '../components/site-footer';
import { SiteLink } from '../components/site-link';
import { SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';

interface WithOssPageProps {
  recommendedSearchResults: RecommendedSearchResult[];
}

export default function WithOssPage(props: WithOssPageProps) {
  const styles = useSlotRecipe({ key: 'siteWithOss' })();
  return (
    <>
      <SiteMetadata
        title="Made with OSS - Chakra Docs"
        description="The open-source projects behind Chakra Docs and its documentation site."
        path="/withoss"
      />
      <StructuredData path="/withoss" title="Made with OSS" />
      <SiteShell recommendedSearchResults={props.recommendedSearchResults}>
        <Container css={styles.root}>
          <Flex css={styles.hero}>
            <Heading
              as="h1"
              aria-label="Made with open-source software"
              css={styles.title}
            >
              <Text as="span" aria-hidden="true">
                w/
              </Text>
              <OssMark size="hero" />
            </Heading>
            <Text css={styles.intro}>
              Built on the open web, with open-source software. Thank you to the
              maintainers and contributors behind our library and documentation
              site.
            </Text>
          </Flex>
          <Box css={styles.projects}>
            {ossProjectGroups.map((group) => (
              <Box
                as="section"
                key={group.id}
                aria-labelledby={`oss-${group.id}`}
              >
                <Heading
                  as="h2"
                  id={`oss-${group.id}`}
                  css={styles.sectionTitle}
                >
                  {group.title}
                </Heading>
                <Text css={styles.sectionDescription}>{group.description}</Text>
                <Box as="ul" css={styles.list}>
                  {group.projects.map((project) => (
                    <Grid as="li" key={project.name} css={styles.row}>
                      <Text css={styles.name}>{project.name}</Text>
                      <Text css={styles.description}>
                        {project.description}
                      </Text>
                      <Box css={styles.urls}>
                        <SiteLink href={project.href} css={styles.projectLink}>
                          {project.href
                            .replace(/^https:\/\/(?:www\.)?/, '')
                            .replace(/\/$/, '')}
                        </SiteLink>
                      </Box>
                    </Grid>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </SiteShell>
    </>
  );
}

export const getStaticProps: GetStaticProps<WithOssPageProps> = async () => {
  const { getDocsManifest } = await import('../docs/manifest');
  const manifest = await getDocsManifest();
  return {
    props: serializeNextProps({
      recommendedSearchResults: getRecommendedSearchResults(manifest.search),
    }),
  };
};
