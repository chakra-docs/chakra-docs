import { Graph } from 'react-structured';
import { getPublicSiteUrl } from '../lib/public-env';
import {
  createPageGraph,
  type StructuredPageOptions,
} from '../lib/structured-data';
import { ossProjectGroups } from '../lib/oss-projects';

export interface StructuredDataProps {
  title: string;
  description?: string;
  path: string;
  type?: 'WebPage' | 'TechArticle';
  breadcrumbs?: Array<{ name: string; path: string }>;
  items?: StructuredPageOptions['items'];
}

export function StructuredData(props: StructuredDataProps) {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return null;
  const items =
    props.path === '/withoss'
      ? ossProjectGroups.flatMap((group) =>
          group.projects.map((project) => ({
            name: project.name,
            url: project.href,
            description: project.description,
          })),
        )
      : props.items;
  return (
    <Graph
      id="page-structured-data"
      data={createPageGraph(
        {
          route: props.path,
          title: props.title,
          description: props.description,
        },
        {
          documentation: props.type === 'TechArticle',
          breadcrumbs: props.breadcrumbs,
          items,
        },
        siteUrl,
      )}
    />
  );
}
