import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  type DocsManifest,
} from '@chakra-docs/core';

export function createSiteLlmsText(
  manifest: DocsManifest,
  siteUrl: string,
  full = false,
) {
  const options = {
    title: 'Chakra Docs',
    description:
      'Composable documentation for React, Chakra UI, Next.js, Astro, and React Router.',
    siteUrl,
    // The site serves HTML documentation, not per-page Markdown endpoints.
    markdownUrl: (page: DocsManifest['pages'][number]) => page.route,
    details: `Full documentation: [llms-full.txt](${siteUrl}/llms-full.txt).`,
  };
  return full
    ? createDocsLlmsFullText(manifest, options)
    : createDocsLlmsText(manifest, options);
}
