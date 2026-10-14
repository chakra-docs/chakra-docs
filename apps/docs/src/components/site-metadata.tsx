import { PageMeta } from 'next-meta/pages';
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
  return (
    <PageMeta
      title={title}
      description={description ?? OG_IMAGE_DEFAULTS.description}
      baseUrl={origin}
      canonical={url}
      url={url}
      type={article ? 'article' : 'website'}
      images={
        image
          ? [
              {
                url: image,
                type: 'image/png',
                width: OG_IMAGE_WIDTH,
                height: OG_IMAGE_HEIGHT,
                alt: OG_IMAGE_DEFAULTS.title,
              },
            ]
          : []
      }
      twitter={{ card: 'summary_large_image', creator: '@ryanhefner' }}
      // Existing titles already include branding; do not add a Pages title suffix.
      additionalMetaTags={[
        { property: 'og:site_name', content: 'Chakra Docs' },
      ]}
    />
  );
}
