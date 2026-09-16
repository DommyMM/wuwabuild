# PostHog Tracking Plan

Event names and property lists live at the call sites, so this doc holds what no call site shows: the naming convention, which surface instruments what, the events whose timing cannot be read off the code around them, and the dashboards worth building first.

## Implementation Rules

- Initialize PostHog only in `instrumentation-client.ts`
- Feature tracking is a direct `posthog.capture(...)` call in the component that owns the action, no wrapper layer
- snake_case for event names and property names
- Track intent, completion, failure, discovery depth and retention only
- No event per slider tick or keystroke

## Initialization

`instrumentation-client.ts` is the only init path. It runs in the browser, only when `NODE_ENV` is production and `NEXT_PUBLIC_POSTHOG_KEY` is set, so dev sessions and key-less deploys are silent rather than partly instrumented.

Every automatic capture is off: autocapture, rageclick, dead clicks, heatmaps, exceptions, session recording, surveys, product tours. Pageviews are the one exception, since `defaults: '2026-01-30'` enables them. Errors reach PostHog only through the explicit `posthog.captureException` calls in catch blocks.

Traffic goes to `api_host: '/ingest'`, which `next.config.ts` rewrites to `us.i.posthog.com` (and `/ingest/static/*` to `us-assets.i.posthog.com`) so ad blockers do not see a third-party host. That rewrite needs `skipTrailingSlashRedirect: true`, which is why it sits in the same config. `ui_host` stays `https://us.posthog.com` so toolbar links resolve.

## Pageview Behavior

`defaults: '2026-01-30'` inherits `capture_pageview: 'history_change'`, and the installed SDK's history hook compares `window.location.pathname` only. So `/builds` -> `/leaderboards` is a pageview and `/builds?page=1` -> `/builds?page=2` is not. Filter and page churn on the discovery surfaces rewrites the query string constantly, so measure it with `discovery_filter_apply`, never with pageview counts.

## Event Catalog

Names are `snake_case`, read `<surface>_<object>_<verb>`, present tense: `import_start`, `discovery_result_expand`, `saves_export_all`. The surface prefix is the analytics grouping, not the route, so a build card downloaded from the editor is `build_card_download` while the same action on a profile is `profile_card_download`.

Nothing is registered as a super property, so the only properties every event shares are PostHog's own. Two conventions carry across the hand-written ones: `character_id` is on anything that knows one and is null rather than absent when it does not, and every event in the import chain carries `scan_id` so one upload's events stitch together.

Instrumented surfaces, one file each unless noted:

- Acquisition: `components/home/HomeLink.tsx` wraps every internal homepage link so the sections around it stay server-rendered. `components/home/ProfileSearch.tsx` fires the same event on a search navigation.
- Import and OCR: `components/import/ImportPageClient.tsx` holds the whole chain, from pre-OCR validation through the completion dialog and the issue report.
- Editor: `components/edit/BuildEditor.tsx` for the session start, card generate, card download and ranking hand-off. `components/save/SaveBuildModal.tsx` for the save itself.
- Discovery: `components/leaderboards/board/GlobalBoardPageClient.tsx` for `/builds`, `components/leaderboards/character/LeaderboardCharacterClient.tsx` for `/leaderboards/[characterId]`, `components/leaderboards/BuildExpanded.tsx` for the two actions inside an expanded row.
- Profile: `components/profile/ProfileCard.tsx` for the card download, `components/profile/ProfileBuildCardStage.tsx` for open-in-editor.
- Saves: `components/save/SavesPageClient.tsx` for load, delete, import, export-all and the one-time legacy migration.

### Events that do not read off the call site

- `editor_start` fires once per editor mount, on the first dirty transition. It is a first-interaction signal, not a page visit.
- `home_cta_click` with `section: 'search'` comes from the profile search wherever it lives, so it also fires on `/profiles` and from the navbar popover. Its `surface` property says which, and the event is not homepage-only despite the name.
- `build_image_link` reports the fire-and-forget `POST /build/link-image` after a scan, and captures only real writes and ambiguous matches. A fresh scan normally has no existing row to attach to, so the silent misses are the expected case and counting them would bury the signal.
- `ocr_complete` carries two image-key flags because the keys mean different things: `has_source_image_key` is the deterministic SHA-256 key, available before R2 confirms anything, while `has_confirmed_training_image_key` means R2 acknowledged the object. `r2_result: 'pending'` is a normal outcome, the write was still running when OCR returned.
- `import_non_english` fires next to an `ocr_complete` that already carries `unsupported_language`, so the two double-count by design. Use whichever fits the query, not both.
- `leaderboard_submit_result` has two emitters in the same import: the client-side echo preflight rejects illegal panels as `skipped` before any request, and the upload path reports the server outcome. One import can emit it twice, and the two carry different property sets.
- `import_complete` fires when the completion dialog opens, before the user picks anything. The pick is `import_destination_click`.
- `saves_import` only carries `skipped` on the legacy conversion path, because the v2 payload importer has nothing to skip.

## Anti-Noise Guardrails

- `discovery_filter_apply` waits for the settled query key and dedupes on a signature of the whole filter set, so it counts applied views rather than intermediate states
- `discovery_result_expand` fires from `useExpandedRows`, which runs its callback on closed -> open only
- `leaderboard_tab_change` guards the weapon and track tabs against re-selecting the active one, but the scoring segment does not, so a no-op scoring click still emits
- Query-string churn on `/builds` and `/leaderboards/[characterId]` is expected and untracked, see Pageview Behavior
- Never add an event on a slider drag tick, a keystroke or a minor state mutation

## Dashboard Blueprint

1. Activation: `home_cta_click` -> `import_start` or `editor_start`, with `build_save` or a successful `leaderboard_submit_result` as the secondary conversion.
2. Import and OCR health: `import_start` -> `ocr_complete` -> `leaderboard_submit_result` -> `import_complete`, watching the top `import_validation_fail.reason` and `ocr_complete.failed_regions_count`.
3. Discovery depth: `discovery_filter_apply`, `discovery_result_expand`, `discovery_open_in_editor_click`, `leaderboard_tab_change`.
4. Contribution and retention: `build_save`, `build_card_download` and created/updated `leaderboard_submit_result` as contribution actions, then 7d/30d return for the cohort that performed one.

## Audit

Every capture in the app is one grep, from `wuwabuilds/`:

```bash
rg -n "posthog\.capture" app components hooks lib
```

That is also how to get an event's current property list. This doc is the single source for PostHog conventions, never for property names.
