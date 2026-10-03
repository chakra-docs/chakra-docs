import { DocsProvider } from '@chakra-docs/chakra';
import { NextLink } from '@chakra-docs/next/link';
import { PostkitProvider } from '@postkit/react';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';
import type { AppProps } from 'next/app';
import { Analytics } from '../components/analytics';
import { ThemeProvider } from 'next-themes';
import { LuCheck, LuCopy } from 'react-icons/lu';
import { CommuneFooter, SiteFooter } from '../components/site-footer';
import { docsSystem } from '../theme/system';
import { getPublicSiteUrl } from '../lib/public-env';
import { ChakraProvider } from '@chakra-ui/react';
import OgImagePage from './og-image';

const shikiAdapter = createChakraDocsShikiAdapter({
  themes: { light: 'github-dark', dark: 'github-dark' },
});

function CustomApp({ Component, pageProps }: AppProps) {
  if (Component === OgImagePage) {
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
      <PostkitProvider system={docsSystem} codeBlockAdapter={shikiAdapter}>
        <Analytics>
          <DocsProvider
            config={{
              codeBlock: {
                adapter: shikiAdapter,
                copyIcon: <LuCopy aria-hidden="true" />,
                copiedIcon: <LuCheck aria-hidden="true" />,
              },
              layout: {
                stickyTop: docsSystem.token.var('spacing.docsStickyTop'),
                scrollMarginTop: docsSystem.token.var(
                  'spacing.docsScrollMargin',
                ),
              },
              linkComponent: NextLink,
              title: 'Chakra Docs',
              siteUrl: getPublicSiteUrl(),
              pageActions: { size: 'sm' },
              labels: {
                onThisPage: 'On this page',
              },
            }}
          >
            <Component {...pageProps} />
            <SiteFooter year={new Date().getFullYear()} />
            <CommuneFooter />
          </DocsProvider>
        </Analytics>
      </PostkitProvider>
    </ThemeProvider>
  );
}

export default CustomApp;
