# PostHog Tracking Plan

Event names and property lists live at the call sites, so this doc holds what no call site shows: how the SDK loads, the naming convention, which surface instruments what, the events whose timing cannot be read off the code around them, and the dashboards worth building.

## Implementation Rules

- Components call `capture` and `captureException` from `lib/analytics.ts`, in the component that owns the action
- Never import `posthog-js` outside `lib/analytics.ts`. A static import pulls the SDK back into every route's first-load bundle, and an ESLint `no-restricted-imports` rule enforces it
- snake_case for event names and property names
- Track intent, completion, failure, discovery depth and retention only
- No event per slider tick or keystroke

## Loading

`instrumentation-client.ts` calls `loadAnalytics()`, which waits for browser idle (2s cap), dynamically imports `posthog-js` and initializes it. `capture` calls made before that are queued and replayed in order, so call sites never check whether the SDK is ready. The module only loads and queues, it does not reshape events.

The call stays in `instrumentation-client.ts`, the entry PostHog's Next.js guide uses, because Next runs it once per page load before hydration on every route, with no component to mount. The loader lives in `lib/analytics.ts` because components import `capture` from it.

It runs only when `NODE_ENV` is production and `NEXT_PUBLIC_POSTHOG_KEY` is set, so dev sessions and key-less deploys are silent rather than partly instrumented.

Every automatic capture is off except pageviews, page leaves and `$web_vitals`: autocapture, rageclick, dead clicks, heatmaps, exceptions, session recording, surveys and product tours. `defaults: '2026-01-30'` turns pageviews on, and web vitals come from the project's remote config rather than `init`. Errors reach PostHog only through explicit `captureException` calls in catch blocks.

Traffic goes to `api_host: '/ingest'`, which `next.config.ts` rewrites to `us.i.posthog.com` (and `/ingest/static/*` to `us-assets.i.posthog.com`) so ad blockers do not see a third-party host. That rewrite needs `skipTrailingSlashRedirect: true`, which is why it sits in the same config.

`setSharedProperties` merges properties into every event through `before_send`, including the pageview captured at load. `LanguageProvider` uses it for `ui_language`, which answers the locale question in `seo.md`.

## Pageview Behavior

`capture_pageview: 'history_change'` compares `window.location.pathname` only, so `/builds` -> `/leaderboards` is a pageview and `/builds?page=1` -> `/builds?page=2` is not. Filter and tab churn on the boards rewrites the query string, so measure it with `board_filter_apply`, never with pageview counts.

A navigation before the SDK loads records the landing pageview against the page the reader is on at load. The original referrer survives, since `document.referrer` does not change on client navigation.

## Naming

Events are `<object>_<verb>`, present tense: `card_download`, `build_expand`, `profile_open`. Where the action happens goes in a `surface` property, never in the name, so one action on several pages is one event and a dashboard series needs no union. The exceptions are funnels owned by a single page, `import_*` and `editor_start`.

`surface` values: `home`, `nav`, `profiles`, `builds`, `leaderboard_character`, `profile`, `editor`, `saves`.

`character_id` is on anything that knows one and is null rather than absent when it does not. Names are not sent, since IDs are what every repo keys on. Every event in the import chain carries `scan_id` so one upload's events stitch together.

## Instrumented Surfaces

- Profile entry: `profile_open` from `OwnerProfileLink` (row names on both boards), `BuildExpanded` (View in Profile), `ProfileSearch`, `ProfileSwitcher` and `ProfilesLanding`, with `source` naming which of them
- Boards: `board_filter_apply` and `build_expand` from `GlobalBoardPageClient` (`/builds`), `LeaderboardCharacterClient` and `ProfilePageClient`
- Bench: `build_panel_open` from `BuildSimulationSection`, one call for all five panels, with the host passing `surface`
- Editor loads: `editor_load` from `BuildExpanded`, `ProfileBuildCardStage` and `SavesPageClient`
- Cards: `card_download` from `BuildEditor` and `ProfileCard`
- Import: `ImportPageClient` holds the whole chain, from pre-OCR validation through the completion dialog and the issue report
- Editor: `BuildEditor` for the session start and card generate, `SaveBuildModal` for the save
- Home: `HomeLink` wraps every internal homepage link so the sections around it stay server-rendered

## Events That Do Not Read Off the Call Site

- `board_filter_apply` skips the first settled query, since that is the landing state (deep-linked filters included), and fires on each later settle whose filters differ. `changed` lists the filter keys that moved, so a weapon or track tab switch is `changed: ['weaponId']` or `['track']`
- `build_expand` fires on open only. On profiles `source` separates a table row, a rankings tile (`standing`) and the echo inventory (`echo`). A deep-linked `?buildId=` opens its card without an event
- `profile_open` fires on the click, before navigation, so it counts intent even when the profile fails to load
- `editor_start` fires once per editor mount, on the first dirty transition. It is a first-interaction signal, not a page visit
- `ocr_complete.echo_violation_count` judges the unedited scan, before the reader corrects anything, so it measures OCR quality rather than what gets uploaded
- `import_complete` fires when the completion dialog opens, before the reader picks a destination. `lb_reason` says why the upload landed where it did, including `client_echo_preflight` when the echo check blocked it. The pick is `import_destination_click`

## Anti-Noise Guardrails

- `build_panel_open` records opens, not closes
- Query-string churn on `/builds`, `/leaderboards/[characterId]` and `/profile/[uid]` is expected and untracked, see Pageview Behavior
- Backend bookkeeping stays out of PostHog. Railway logs already hold image linking and per-endpoint bench traffic, and the OCR service's `ocr_import_completed` log carries per-scan timings and the R2 result

## Dashboard Blueprint

1. Profile entry: `profile_open` by `source` and `surface`, the board-to-profile flow most readers take
2. Board engagement: `board_filter_apply` by `changed`, `build_expand` by `surface`, `build_panel_open` by `panel`
3. Import and OCR health: `import_start` -> `ocr_complete` -> `import_complete` -> `import_destination_click`, with `import_validation_fail.reason`, `ocr_complete.echo_violation_count` and `import_complete.lb_reason`
4. Editor and cards: `editor_start` -> `build_card_generate` -> `card_download`, plus `build_save` and `editor_load` by `surface`
5. Languages: pageviews by `ui_language`
6. Retention: 7d and 30d return for readers who did `import_complete` or `card_download`

## Audit

Every capture in the app is one grep, from `wuwabuilds/`:

```bash
rg -n "capture\('" app components hooks lib contexts
```

That is also how to get an event's current property list. Event volumes come from `posthog-cli api call execute-sql` against the `events` table.
