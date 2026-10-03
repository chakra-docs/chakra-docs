import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Image,
  Text,
  useSlotRecipe,
} from '@chakra-ui/react';
import {
  OG_IMAGE_DEFAULTS,
  OG_IMAGE_BRAND,
  OG_IMAGE_EYEBROW,
  OG_IMAGE_ADDRESS,
} from '../lib/og-image';

export function OgImageCard({
  title = OG_IMAGE_DEFAULTS.title,
  description = OG_IMAGE_DEFAULTS.description,
  captureReady = true,
}: {
  title?: string;
  description?: string;
  captureReady?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copyKey = JSON.stringify([title, description]);
  const [readyCopy, setReadyCopy] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const images = [...(rootRef.current?.querySelectorAll('img') ?? [])];
    Promise.all([
      document.fonts?.ready,
      ...images.map((image) => image.decode?.().catch(() => undefined)),
    ]).then(() => {
      // Give the browser a paint after fonts, image decoding, and hydration.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) setReadyCopy(copyKey);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [copyKey]);
  const styles = useSlotRecipe({ key: 'siteOgImage' })({
    density: title.length > 55 ? 'compact' : 'normal',
  });
  return (
    <Box css={styles.stage}>
      <Flex
        as="main"
        aria-label="Open Graph image"
        ref={rootRef}
        data-og-ready={captureReady && readyCopy === copyKey}
        css={styles.root}
      >
        <Flex css={styles.top}>
          <Text css={styles.brand}>{OG_IMAGE_BRAND}</Text>
          <Text css={styles.eyebrow}>{OG_IMAGE_EYEBROW}</Text>
        </Flex>
        <Box css={styles.content}>
          <Heading as="h1" css={styles.title}>
            {title}
          </Heading>
          <Text css={styles.description}>{description}</Text>
        </Box>
        <Flex css={styles.bottom}>
          <Text css={styles.address}>{OG_IMAGE_ADDRESS}</Text>
          <Flex css={styles.credit}>
            <Text>By</Text>
            <Image
              src="/assets/commune-software-wordmark.svg"
              alt="Commune Software"
              css={styles.wordmark}
            />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}
