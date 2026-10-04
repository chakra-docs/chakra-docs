import { useMemo, type ReactNode } from 'react';
import { FathomProvider, useFathom } from 'react-fathom';
import { NextFathomTrackViewPages } from 'react-fathom/next';
import {
  createDocsAnalytics,
  getAnalyticsUrl,
  getFathomConfig,
} from '../lib/analytics';

export interface AnalyticsProps {
  children: ReactNode;
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
      <NextFathomTrackViewPages transformUrl={getAnalyticsUrl} />
      {props.children}
    </FathomProvider>
  );
}

export function useDocsAnalytics() {
  const { client, trackEvent } = useFathom();
  return useMemo(
    () =>
      createDocsAnalytics((event) => {
        if (client) trackEvent(event);
      }),
    [client, trackEvent],
  );
}
