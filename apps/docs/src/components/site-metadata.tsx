import Head from 'next/head';
import { getPublicSiteUrl } from '../lib/public-env';
import { canonicalUrl } from '../lib/site-seo';
import {
  OG_IMAGE_DEFAULTS,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
} from '../lib/og-image';

interface SiteMetadataProps {
  title: string;
  description?: string;
  path: string;
  article?: boolean;
}

export function SiteMetadata({
  title,
  description,
  path,
  article,
}: SiteMetadataProps) {
  const origin = getPublicSiteUrl();
  const url = origin ? canonicalUrl(path, origin) : undefined;
  const image = origin ? `${origin}/api/social-image` : undefined;
  const summary = description ?? OG_IMAGE_DEFAULTS.description;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={summary} key="description" />
      {url ? <link rel="canonical" href={url} key="canonical" /> : null}
      <meta property="og:site_name" content="Chakra Docs" key="og:site_name" />
      <meta
        property="og:type"
        content={article ? 'article' : 'website'}
        key="og:type"
      />
      <meta property="og:title" content={title} key="og:title" />
      <meta property="og:description" content={summary} key="og:description" />
      {url ? <meta property="og:url" content={url} key="og:url" /> : null}
      <meta
        name="twitter:card"
        content="summary_large_image"
        key="twitter:card"
      />
      <meta
        name="twitter:creator"
        content="@ryanhefner"
        key="twitter:creator"
      />
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta
        name="twitter:description"
        content={summary}
        key="twitter:description"
      />
      {image ? (
        <meta property="og:image" content={image} key="og:image" />
      ) : null}
      {image ? (
        <meta
          property="og:image:type"
          content="image/png"
          key="og:image:type"
        />
      ) : null}
      {image ? (
        <meta
          property="og:image:width"
          content={String(OG_IMAGE_WIDTH)}
          key="og:image:width"
        />
      ) : null}
      {image ? (
        <meta
          property="og:image:height"
          content={String(OG_IMAGE_HEIGHT)}
          key="og:image:height"
        />
      ) : null}
      {image ? (
        <meta
          property="og:image:alt"
          content={OG_IMAGE_DEFAULTS.title}
          key="og:image:alt"
        />
      ) : null}
      {image ? (
        <meta name="twitter:image" content={image} key="twitter:image" />
      ) : null}
      {image ? (
        <meta
          name="twitter:image:alt"
          content={OG_IMAGE_DEFAULTS.title}
          key="twitter:image:alt"
        />
      ) : null}
    </Head>
  );
}
