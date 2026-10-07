import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { FathomProvider, useFathom } from 'react-fathom';
import {
  createDocsAnalytics,
  getAnalyticsUrl,
  getFathomConfig,
} from '../lib/analytics';

export interface AnalyticsProps {
  children: ReactNode;
}

/** Temporary compatibility tracker for the public react-fathom@0.2.0 context. */
export function DocsPageviewTracker() {
  const { client, trackPageview } = useFathom();
  const { asPath, isReady } = useRouter();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!client || !isReady) return;
    const url = getAnalyticsUrl(new URL(asPath, window.location.origin).href);
    if (url === null) {
      lastUrl.current = null;
      return;
    }
    if (lastUrl.current === url) return;
    trackPageview({ url });
    lastUrl.current = url;
  }, [asPath, client, isReady, trackPageview]);

  return null;
}

export function Analytics(props: AnalyticsProps) {
  const config = useMemo(
    () =>
      getFathomConfig(
        process.env.NEXT_PUBLIC_FATHOM_SITE_ID,
        process.env.NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN,
      ),
    [],
  );
  if (!config) return props.children;
  return (
    <FathomProvider {...config}>
      <DocsPageviewTracker />
      {props.children}
    </FathomProvider>
  );
}

export function useDocsAnalytics() {
  const { client, trackEvent } = useFathom();
  const analytics = useMemo(
    () =>
      createDocsAnalytics((event) => {
        if (client) trackEvent(event);
      }),
    [client, trackEvent],
  );
  useEffect(() => analytics.cancelPendingSearchTracking, [analytics]);
  return analytics;
}
