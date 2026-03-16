"use client";

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Initialize OUTSIDE the component so it fires instantly on the client
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', 
    // Removed capture_pageview: false so it actually tracks your page visits automatically!
  });
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}