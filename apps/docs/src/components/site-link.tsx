import { Link as ChakraLink, type LinkProps } from '@chakra-ui/react';
import NextLink from 'next/link';

export function SiteLink({
  children,
  href,
  ...props
}: Omit<LinkProps, 'href'> & { href: string }) {
  const internal =
    !href.trim().startsWith('//') && !/^[a-z][a-z\d+.-]*:/i.test(href.trim());
  return internal ? (
    <ChakraLink asChild {...props}>
      <NextLink href={href}>{children}</NextLink>
    </ChakraLink>
  ) : (
    <ChakraLink href={href} {...props}>
      {children}
    </ChakraLink>
  );
}
