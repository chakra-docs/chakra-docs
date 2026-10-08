import type { GetServerSideProps } from 'next';
import { getDocsManifest } from '../docs/manifest';
import { createSiteLlmsText } from '../lib/llms';
import { getPublicSiteUrl } from '../lib/public-env';

export default function LlmsFull() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const origin = getPublicSiteUrl();
  if (!origin) return { notFound: true };
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(createSiteLlmsText(await getDocsManifest(), origin, true));
  return { props: {} };
};
