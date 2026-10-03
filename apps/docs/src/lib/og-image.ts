export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_BRAND = 'chakra-docs';
export const OG_IMAGE_EYEBROW = 'Your content. Your theme.';
export const OG_IMAGE_ADDRESS = 'github.com/chakra-docs/chakra-docs';
export const OG_IMAGE_DEFAULTS = {
  title: 'Documentation that fits your site.',
  description:
    'Composable documentation for Chakra UI. Your content, your theme, your routing.',
} as const;

/** Bound user-supplied copy; React renders it as text, never HTML. */
export function getOgImageContent(params: Pick<URLSearchParams, 'get'>) {
  const copy = (key: keyof typeof OG_IMAGE_DEFAULTS, limit: number) => {
    const value = params.get(key)?.replace(/\s+/g, ' ').trim();
    return value
      ? Array.from(value).slice(0, limit).join('')
      : OG_IMAGE_DEFAULTS[key];
  };
  return { title: copy('title', 100), description: copy('description', 200) };
}
