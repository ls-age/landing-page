'use client';

import { useEffect } from 'react';

/**
 * PostHog web analytics (as in QRcard): `posthog-js` is imported once the page is idle, so its
 * ~250 KB don't compete with hydration. Cookieless (`cookieless_mode: 'always'`, needs "Cookieless
 * server hash mode" in the project's web analytics settings), so the site needs no consent banner.
 * Only runs where the token is set (production).
 */
export function Analytics() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    let cancelled = false;
    const load = () =>
      import('posthog-js').then(({ default: posthog }) => {
        if (cancelled || posthog.__loaded) return;
        posthog.init(token, {
          // Proxied through `next.config.ts`, so ad blockers don't drop the events
          api_host: '/ingest',
          ui_host: 'https://eu.posthog.com',
          defaults: '2026-05-30',
          cookieless_mode: 'always',
          disable_session_recording: true,
        });
      });

    if (globalThis.requestIdleCallback) {
      const handle = globalThis.requestIdleCallback(() => void load(), { timeout: 2000 });
      return () => {
        cancelled = true;
        globalThis.cancelIdleCallback(handle);
      };
    }

    const handle = globalThis.setTimeout(() => void load(), 1);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(handle);
    };
  }, []);

  return null; // eslint-disable-line unicorn/no-null
}
