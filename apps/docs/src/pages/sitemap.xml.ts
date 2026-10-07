import type { GetServerSideProps } from 'next';
import { getDocsManifest } from '../docs/manifest';
import { getPublicSiteUrl } from '../lib/public-env';
import { createSiteSitemap } from '../lib/site-seo';

export default function Sitemap() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const origin = getPublicSiteUrl();
  if (!origin) return { notFound: true };
  const manifest = await getDocsManifest();
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  // Manifest sitemap entries already exclude draft and hidden content.
  res.end(
    createSiteSitemap(
      origin,
      manifest.sitemap.map(({ url }) => url),
    ),
  );
  return { props: {} };
};
