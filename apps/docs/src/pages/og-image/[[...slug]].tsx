import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { OgImageCard } from '../../components/og-image-card';
import { getOgImageContent, OG_IMAGE_DEFAULTS } from '../../lib/og-image';

interface OgImagePageProps {
  defaults: { title: string; description: string };
}

export default function OgImagePage({ defaults }: OgImagePageProps) {
  const router = useRouter();
  const [state, setState] = useState<{
    path: string;
    copy: ReturnType<typeof getOgImageContent>;
  } | null>(null);
  useEffect(() => {
    if (router.isReady) {
      setState({
        path: router.asPath,
        copy: getOgImageContent(
          new URL(router.asPath, 'https://capture.invalid').searchParams,
          defaults,
        ),
      });
    }
  }, [router.isReady, router.asPath, defaults]);
  const ready = router.isReady && state?.path === router.asPath;
  return (
    <>
      <Head>
        <title>Open Graph image - Chakra Docs</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <OgImageCard {...(ready ? state.copy : defaults)} captureReady={ready} />
    </>
  );
}

const specialPages = {
  '/': OG_IMAGE_DEFAULTS,
  '/showcase': {
    title: 'Showcase',
    description: 'Reference compositions built with Chakra Docs.',
  },
  '/withoss': {
    title: 'Made with OSS',
    description: 'The open-source software behind Chakra Docs.',
  },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const { getDocsManifest } = await import('../../docs/manifest');
  const manifest = await getDocsManifest();
  const routes = new Set([
    ...Object.keys(specialPages),
    ...manifest.pages.map((page) => page.route),
  ]);
  return {
    paths: [...routes].map((route) => ({
      params: { slug: route.split('/').filter(Boolean) },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<OgImagePageProps> = async (
  context,
) => {
  const { getDocsManifest } = await import('../../docs/manifest');
  const manifest = await getDocsManifest();
  const slug = Array.isArray(context.params?.slug) ? context.params.slug : [];
  const route = `/${slug.join('/')}`;
  const special = specialPages[route as keyof typeof specialPages];
  const page = manifest.byRoute[route];
  const defaults =
    special ??
    (page
      ? {
          title: page.title,
          description: page.description ?? OG_IMAGE_DEFAULTS.description,
        }
      : undefined);
  return defaults ? { props: { defaults } } : { notFound: true };
};
