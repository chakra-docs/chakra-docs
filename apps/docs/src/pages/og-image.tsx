import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { OgImageCard } from '../components/og-image-card';
import { getOgImageContent, OG_IMAGE_DEFAULTS } from '../lib/og-image';

export default function OgImagePage() {
  const router = useRouter();
  const [copy, setCopy] = useState<ReturnType<typeof getOgImageContent> | null>(
    null,
  );
  useEffect(() => {
    if (router.isReady) {
      setCopy(
        getOgImageContent(
          new URL(router.asPath, 'https://capture.invalid').searchParams,
        ),
      );
    }
  }, [router.isReady, router.asPath]);
  return (
    <>
      <Head>
        <title>Open Graph image - Chakra Docs</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <OgImageCard
        {...(copy ?? OG_IMAGE_DEFAULTS)}
        captureReady={copy !== null}
      />
    </>
  );
}
