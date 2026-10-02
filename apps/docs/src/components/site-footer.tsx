import {
  Box,
  Container,
  Flex,
  Image,
  Stack,
  Text,
  useSlotRecipe,
} from '@chakra-ui/react';
import { SiteLink } from './site-link';

export function OssMark({ size = 'footer' }: { size?: 'footer' | 'hero' }) {
  const styles = useSlotRecipe({ key: 'siteOssMark' })({ size });
  return (
    <Image src="/assets/oss.svg" alt="" css={styles.mark} decoding="async" />
  );
}

export function SiteFooter({ year }: { year: number }) {
  const styles = useSlotRecipe({ key: 'siteFooter' })();
  return (
    <Box as="footer" aria-label="Site credits and license" css={styles.root}>
      <Container css={styles.container}>
        <Flex css={styles.content}>
          <Text>
            © {year > 2026 ? `2026–${year}` : 2026}{' '}
            <SiteLink href="https://www.ryanhefner.com" css={styles.creditLink}>
              Ryan Hefner
            </SiteLink>
            .
          </Text>
          <Flex css={styles.links}>
            <SiteLink
              href="https://github.com/chakra-docs/chakra-docs/blob/main/LICENSE"
              css={styles.licenseLink}
            >
              MIT license
            </SiteLink>
            <SiteLink
              href="/withoss"
              aria-label="Made with open-source software"
              css={styles.ossLink}
            >
              <OssMark />
            </SiteLink>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}

export function CommuneFooter() {
  const styles = useSlotRecipe({ key: 'communeFooter' })();
  return (
    <Container as="section" aria-label="By Commune Software" css={styles.root}>
      <Stack css={styles.content}>
        <Text css={styles.label}>By</Text>
        <SiteLink href="https://commune.software" css={styles.link}>
          <Image
            src="/assets/commune-software-wordmark.svg"
            alt="Commune Software"
            css={styles.wordmark}
            loading="lazy"
            decoding="async"
          />
        </SiteLink>
      </Stack>
    </Container>
  );
}
