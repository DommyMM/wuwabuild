import type { CaptureResult, PostHog, Properties } from 'posthog-js';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

// Production with a key only, so dev sessions and key-less deploys stay silent
const enabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && Boolean(posthogKey);

/** One SDK call, held until posthog-js loads */
type PendingCall = (client: PostHog) => void;

// Null until posthog-js loads
let client: PostHog | null = null;
let loadStarted = false;
// Replayed in order once posthog-js loads, null when analytics is off or the load failed
let pending: PendingCall[] | null = enabled ? [] : null;
// Merged into every event by before_send, so the pageview captured at load carries them too
const sharedProperties: Properties = {};

/** Runs the call now once posthog-js has loaded, otherwise queues it */
function run(call: PendingCall) {
  if (client) call(client);
  else pending?.push(call);
}

/** Sends one event, queued until posthog-js has loaded */
export function capture(event: string, properties?: Properties) {
  run((ph) => ph.capture(event, properties));
}

/** Reports a caught error, queued until posthog-js has loaded */
export function captureException(error: unknown) {
  run((ph) => ph.captureException(error));
}

/** Adds properties to every later event, including the pageview captured at load */
export function setSharedProperties(properties: Properties) {
  if (!enabled) return;
  Object.assign(sharedProperties, properties);
}

/** before_send hook, with the event's own properties winning over shared ones */
function withSharedProperties(event: CaptureResult | null): CaptureResult | null {
  if (event) event.properties = { ...sharedProperties, ...event.properties };
  return event;
}

/** Loads posthog-js once the browser is idle, then replays queued calls */
export function loadAnalytics() {
  if (!enabled || !posthogKey || loadStarted) return;
  loadStarted = true;

  const start = () => {
    // Dynamic import keeps the SDK out of every route's first-load bundle and off the hydration path
    import('posthog-js')
      .then(({ default: posthog }) => {
        posthog.init(posthogKey, {
          api_host: '/ingest',
          ui_host: 'https://us.posthog.com',
          defaults: '2026-01-30',
          autocapture: false,
          rageclick: false,
          capture_dead_clicks: false,
          capture_exceptions: false,
          capture_heatmaps: false,
          disable_session_recording: true,
          disable_surveys: true,
          disable_product_tours: true,
          before_send: withSharedProperties,
        });
        client = posthog;
        const queued = pending ?? [];
        pending = null;
        for (const call of queued) call(posthog);
      })
      .catch(() => {
        // Failed chunk load drops analytics for this page view instead of queueing forever
        pending = null;
      });
  };

  // 2s cap bounds how long early events wait on a busy main thread, and Safari has no requestIdleCallback
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 0);
  }
}
