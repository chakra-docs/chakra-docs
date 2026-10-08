import { DocsProvider } from '@chakra-docs/chakra';
import { NextLink } from '@chakra-docs/next/link';
import { PostkitProvider } from '@postkit/react';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';
import type { AppProps } from 'next/app';
import { Analytics, useDocsAnalytics } from '../components/analytics';
import { ThemeProvider } from 'next-themes';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { CommuneFooter, SiteFooter } from '../components/site-footer';
import { docsSystem } from '../theme/system';
import { getPublicSiteUrl } from '../lib/public-env';
import { Box, ChakraProvider } from '@chakra-ui/react';
import type { ReactNode } from 'react';

const shikiAdapter = createChakraDocsShikiAdapter({
  themes: { light: 'github-dark', dark: 'github-dark' },
});

function DocumentationProvider({ children }: { children: ReactNode }) {
  const analytics = useDocsAnalytics();
  return (
    <DocsProvider
      config={{
        analytics,
        codeBlock: {
          adapter: shikiAdapter,
          copyIcon: <LuCopy aria-hidden="true" />,
          copiedIcon: <LuCheck aria-hidden="true" />,
        },
        layout: {
          stickyTop: docsSystem.token.var('spacing.docsStickyTop'),
          scrollMarginTop: docsSystem.token.var('spacing.docsScrollMargin'),
        },
        linkComponent: NextLink,
        title: 'Chakra Docs',
        siteUrl: getPublicSiteUrl(),
        pageActions: { size: 'sm' },
        labels: { onThisPage: 'On this page' },
      }}
    >
      {children}
    </DocsProvider>
  );
}

function CustomApp({ Component, pageProps, router }: AppProps) {
  if (router.pathname === '/og-image/[[...slug]]') {
    return (
      <ChakraProvider value={docsSystem}>
        <Component {...pageProps} />
      </ChakraProvider>
    );
  }
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      storageKey="chakra-docs-system-color-mode"
    >
      <PostkitProvider
        system={docsSystem}
        codeBlockAdapter={shikiAdapter}
        codeBlock={{
          copyIcon: <LuCopy aria-hidden="true" />,
          copiedIcon: <LuCheck aria-hidden="true" />,
          copyLabel: null,
          copyAriaLabel: 'Copy code',
          copyFeedback: 'tooltip',
          copiedLabel: 'Copied!',
        }}
      >
        <Analytics>
          <DocumentationProvider>
            <Box
              className="site-wrapper"
              display="flex"
              flexDirection="column"
              minH="100dvh"
            >
              <Box className="site-content" flexGrow="1">
                <Component {...pageProps} />
              </Box>
              <SiteFooter year={new Date().getFullYear()} />
            </Box>
            <CommuneFooter />
          </DocumentationProvider>
        </Analytics>
      </PostkitProvider>
    </ThemeProvider>
  );
}

export default CustomApp;
