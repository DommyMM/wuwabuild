'use client';

import { useSyncExternalStore } from 'react';

const subscribeToClientRender = () => () => {};

/**
 * Inline script that runs from the server HTML at parse time, before the elements it sizes are first painted
 *
 * - Rendered in the server and hydration passes, then dropped, since it has already run by then
 * - Client navigation never renders it, because React would create an inert script there and warn
 */
export function FirstPaintScript({ code }: { code: string }) {
  const fromServerHtml = useSyncExternalStore(subscribeToClientRender, () => false, () => true);
  return fromServerHtml ? <script dangerouslySetInnerHTML={{ __html: code }} /> : null;
}
