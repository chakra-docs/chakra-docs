import {
  ChakraProvider,
  createShikiAdapter,
  defaultSystem,
} from '@chakra-ui/react';
import { DocsProvider } from '@chakra-docs/chakra';
import { NextLink } from '@chakra-docs/next';
import type { AppProps } from 'next/app';
import { Analytics } from '../components/analytics';

const shikiAdapter = createShikiAdapter({
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  async load() {
    const { createHighlighter } = await import('shiki');

    return createHighlighter({
      langs: ['bash', 'tsx', 'ts', 'json', 'markdown', 'text'],
      themes: ['github-light', 'github-dark'],
    });
  },
});

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={defaultSystem}>
      <Analytics>
        <DocsProvider
          config={{
            codeBlock: {
              adapter: shikiAdapter,
            },
            layout: {
              stickyTop: { lg: 24 },
            },
            linkComponent: NextLink,
            title: 'Chakra Docs',
            labels: {
              onThisPage: 'On this page',
            },
          }}
        >
          <Component {...pageProps} />
        </DocsProvider>
      </Analytics>
    </ChakraProvider>
  );
}

export default CustomApp;
