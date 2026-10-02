import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Stack,
  Text,
  useSlotRecipe,
} from '@chakra-ui/react';
import Head from 'next/head';
import { OssMark } from '../components/site-footer';
import { SiteLink } from '../components/site-link';
import { SiteShell } from '../components/site-shell';
import { StructuredData } from '../components/structured-data';

const projects = [
  {
    name: 'Chakra UI',
    description:
      'Accessible React components and the token-driven system behind our recipes.',
    url: 'https://chakra-ui.com',
  },
  {
    name: 'Next.js',
    description:
      'Routing, static generation, and the application framework for this site.',
    url: 'https://nextjs.org',
  },
  {
    name: 'React',
    description:
      'Composable interfaces and the foundation of our component APIs.',
    url: 'https://react.dev',
  },
  {
    name: 'Postkit',
    description:
      'Rich Markdown rendering and a shared Chakra theme for the integration example.',
    url: 'https://github.com/postkit-org/postkit-js',
  },
  {
    name: 'Shiki',
    description: 'Accurate, theme-aware syntax highlighting for code examples.',
    url: 'https://shiki.style',
  },
  {
    name: 'unified',
    description:
      'Markdown parsing, GFM, and document processing through remark and react-markdown.',
    url: 'https://unifiedjs.com',
  },
  {
    name: 'next-themes',
    description:
      'System color-mode synchronization without a separate site-level toggle.',
    url: 'https://github.com/pacocoursey/next-themes',
  },
  {
    name: 'React Icons',
    description: 'Consistent SVG icons for controls and navigation.',
    url: 'https://react-icons.github.io/react-icons',
  },
  {
    name: 'Nx',
    description: 'Workspace orchestration, project builds, and verification.',
    url: 'https://nx.dev',
  },
];

export default function WithOssPage() {
  const styles = useSlotRecipe({ key: 'siteWithOss' })();
  return (
    <>
      <Head>
        <title>Made with OSS - Chakra Docs</title>
        <meta
          name="description"
          content="The open-source projects behind Chakra Docs and its documentation site."
        />
      </Head>
      <StructuredData path="/withoss" title="Made with OSS" />
      <SiteShell>
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
              This library and documentation site are built with open-source
              software. In appreciation of the community behind them, here are
              the key projects that make the site possible.
            </Text>
          </Flex>
          <Box
            as="section"
            aria-labelledby="oss-projects"
            css={styles.projects}
          >
            <Heading as="h2" id="oss-projects" css={styles.sectionTitle}>
              Open-source software
            </Heading>
            <Stack as="ul" css={styles.list}>
              {projects.map((project) => (
                <Grid as="li" key={project.name} css={styles.row}>
                  <Text css={styles.name}>{project.name}</Text>
                  <Text css={styles.description}>{project.description}</Text>
                  <Box css={styles.urls}>
                    <SiteLink href={project.url} css={styles.projectLink}>
                      {project.url.replace(/^https:\/\//, '')}
                    </SiteLink>
                  </Box>
                </Grid>
              ))}
            </Stack>
          </Box>
        </Container>
      </SiteShell>
    </>
  );
}
