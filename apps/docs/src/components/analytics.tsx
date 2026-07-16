import Script from 'next/script';
import type { ReactNode } from 'react';

export interface AnalyticsProps {
  children: ReactNode;
}

const fathomSiteId = process.env.NEXT_PUBLIC_FATHOM_SITE_ID;
const fathomDomain =
  process.env.NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN ?? 'cdn.usefathom.com';

export function Analytics(props: AnalyticsProps) {
  if (!fathomSiteId) {
    return props.children;
  }

  return (
    <>
      <Script
        data-site={fathomSiteId}
        data-spa="auto"
        id="fathom-analytics"
        src={createFathomScriptUrl(fathomDomain)}
        strategy="afterInteractive"
      />
      {props.children}
    </>
  );
}

function createFathomScriptUrl(domain: string): string {
  const hostname = domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(hostname)) {
    throw new Error(
      'NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN must be a hostname without a path.',
    );
  }

  return `https://${hostname}/script.js`;
}
