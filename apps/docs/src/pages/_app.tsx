import { createSystem, defaultConfig } from '@chakra-ui/react';
import { DocsProvider } from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import { NextLink } from '@chakra-docs/next/link';
import { PostkitProvider } from '@postkit/react';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';
import type { AppProps } from 'next/app';
import { Analytics } from '../components/analytics';

const docsSystem = createSystem(defaultConfig, chakraDocsThemeConfig);
const shikiAdapter = createChakraDocsShikiAdapter();

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <PostkitProvider system={docsSystem} codeBlockAdapter={shikiAdapter}>
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
    </PostkitProvider>
  );
}

export default CustomApp;
