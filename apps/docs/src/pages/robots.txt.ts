import type { GetServerSideProps } from 'next';
import { getPublicSiteUrl } from '../lib/public-env';
import { createSiteRobots } from '../lib/site-seo';

export default function Robots() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.end(createSiteRobots(getPublicSiteUrl()));
  return { props: {} };
};
