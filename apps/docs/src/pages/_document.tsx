import { Head, Html, Main, NextScript } from 'next/document';
import { getFontstackKitUrl } from '../lib/public-env';

export default function Document() {
  const kitUrl = getFontstackKitUrl();
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        {kitUrl ? (
          <>
            <link
              rel="preconnect"
              href="https://kits.fontstack.com"
              crossOrigin="anonymous"
            />
            <link rel="stylesheet" href={kitUrl} />
          </>
        ) : null}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
