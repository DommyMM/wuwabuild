import posthog from 'posthog-js';

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production' && posthogKey) {
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
  });
}
