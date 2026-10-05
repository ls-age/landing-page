'use client';

import { RefreshRouteOnSave as PayloadLivePreview } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

/**
 * Refreshes the page when a document is saved in the admin panel's live preview (from boraan).
 *
 * Only inside the live preview's iframe: Payload's component also refreshes the route once when it
 * mounts. On a 404 page, that refresh fails too and Next.js reloads the page, which mounts the
 * component again, in an endless loop. That first refresh is skipped as well (the page was just
 * rendered with the latest data anyway).
 */
export function RefreshRouteOnSave() {
  const router = useRouter();
  const mounted = useRef(false);

  const refresh = useCallback(() => {
    if (mounted.current) router.refresh();
    mounted.current = true;
  }, [router]);

  if (globalThis.self === globalThis.top) return;

  return <PayloadLivePreview refresh={refresh} serverURL={globalThis.location.origin} />;
}
