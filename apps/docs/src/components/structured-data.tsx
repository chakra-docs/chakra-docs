import { Graph, type GraphData, type Thing } from 'react-structured';
import { getPublicSiteUrl } from '../lib/public-env';

export interface StructuredDataProps {
  title: string;
  description?: string;
  path: string;
  type?: 'WebPage' | 'TechArticle';
  breadcrumbs?: Array<{
    name: string;
    path: string;
  }>;
}

const siteName = 'Chakra Docs';
const siteUrl = getPublicSiteUrl();

export function StructuredData(props: StructuredDataProps) {
  const pageUrl = createAbsoluteUrl(props.path);
  const graphItems = [
    compactThing({
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
    }),
    compactThing({
      '@type': props.type ?? 'WebPage',
      name: props.title,
      headline: props.title,
      description: props.description,
      url: pageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
      },
    }),
    createBreadcrumbSchema(props.breadcrumbs),
  ].filter(isDefined);

  return <Graph data={{ '@graph': graphItems } satisfies GraphData} />;
}

function createBreadcrumbSchema(
  breadcrumbs: StructuredDataProps['breadcrumbs'],
) {
  if (!siteUrl || !breadcrumbs?.length) {
    return undefined;
  }

  return compactThing({
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) =>
      compactObject({
        '@type': 'ListItem',
        position: index + 1,
        name: breadcrumb.name,
        item: createAbsoluteUrl(breadcrumb.path),
      }),
    ),
  });
}

function createAbsoluteUrl(path: string) {
  if (!siteUrl) {
    return undefined;
  }

  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function compactObject<TValue extends Record<string, unknown>>(value: TValue) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function compactThing(value: Record<string, unknown>) {
  return compactObject(value) as unknown as Thing;
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}
