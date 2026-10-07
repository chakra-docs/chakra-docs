import { Head, Html, Main, NextScript } from 'next/document';
import { getFontstackKitUrl } from '../lib/public-env';

export default function Document() {
  const kitUrl = getFontstackKitUrl();
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"
        />
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
