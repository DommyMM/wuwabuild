# PostHog Tracking Plan

Canonical PostHog reference for the frontend repo.

This doc answers:
- What events exist now.
- Which properties each event carries.
- Why each event matters.
- Guardrails to avoid noisy analytics.
- Which dashboards to build first.

## Implementation Rules

- Initialize PostHog only in `instrumentation-client.ts`.
- Keep feature tracking as direct `posthog.capture(...)` calls in component files.
- Use snake_case event names and property names.
- Track meaningful actions only (intent, completion, failure, discovery depth, retention).
- Do not emit events for every slider/input keystroke.

## Initialization

Current init path:
- `instrumentation-client.ts`

Current init settings:
- `api_host: '/ingest'`
- `ui_host: 'https://us.posthog.com'`
- `defaults: '2026-01-30'`
- `capture_exceptions: true`

## Event Catalog (Current)

### Acquisition

#### `home_cta_click`
- Purpose: track which homepage CTA users choose.
- Properties:
  - `cta`: `import` | `edit` | `builds` | `leaderboards`
  - `section`: `hero` | `how_it_works`

### Import and OCR Flow

#### `import_start`
- Purpose: user begins the import flow.
- Properties:
  - `method`: `drop` | `browse` | `paste`
  - `has_existing_draft`: boolean

#### `import_validation_fail`
- Purpose: user input fails before OCR.
- Properties:
  - `reason`: `bad_dimensions` | `bad_file_type`
  - `file_type`: string | null
  - `width`: number (only for bad dimensions)
  - `height`: number (only for bad dimensions)

#### `ocr_complete`
- Purpose: OCR pipeline completed with quality diagnostics.
- Properties:
  - `duration_ms`: number
  - `failed_regions_count`: number
  - `failed_regions`: `RegionKey[]`
  - `has_character`: boolean
  - `has_weapon`: boolean
  - `has_uid`: boolean
  - `character_id`: string | null

#### `leaderboard_submit_result`
- Purpose: final outcome of leaderboard submission attempt.
- Properties:
  - `result`: `created` | `updated` | `warning` | `skipped` | `error`
  - `reason`: string
  - `damage_computed`: boolean
  - `character_id`: string | null

#### `import_complete`
- Purpose: import flow ended in a concrete output.
- Properties:
  - `action`: `load_to_editor` | `save_to_saves`
  - `character_id`: string | null
  - `uploaded_to_lb`: boolean

#### `ocr_issue_report_submit`
- Purpose: OCR issue report submitted.
- Properties:
  - `reason`: issue reason enum
  - `has_note`: boolean
  - `has_training_image_key`: boolean
  - `character_id`: string | null

### Editor Outcomes

#### `editor_start`
- Purpose: first meaningful editor interaction (first dirty transition).
- Properties:
  - `character_id`: string | null
  - `weapon_id`: string | null

#### `build_card_generate`
- Purpose: user generates card output.
- Properties:
  - `character_id`: string | null
  - `character_name`: string | null
  - `weapon_id`: string | null
  - `sequence`: number

#### `build_card_download`
- Purpose: user downloads card output.
- Properties:
  - `character_id`: string | null
  - `character_name`: string | null
  - `weapon_id`: string | null
  - `sequence`: number

#### `leaderboard_open_from_editor`
- Purpose: user opens ranking page from editor.
- Properties:
  - `character_id`: string | null
  - `weapon_id`: string | null
  - `sequence`: number

#### `build_save`
- Purpose: local save/update completed.
- Properties:
  - `is_update`: boolean
  - `character_id`: string | null
  - `weapon_id`: string | null
  - `sequence`: number
  - `cv`: number
  - `echo_count`: number

### Discovery (`/builds` and `/leaderboards/[characterId]`)

#### `discovery_filter_apply`
- Purpose: meaningful filter/sort/search state applied.
- Properties:
  - `surface`: `builds` | `leaderboard_character`
  - `character_id`: string (leaderboard surface only)
  - `weapon_id`: string | null (leaderboard surface only)
  - `track_key`: string | null (leaderboard surface only)
  - `character_count`: number (builds surface only)
  - `weapon_count`: number (builds surface only)
  - `region_count`: number
  - `has_uid_search`: boolean
  - `has_username_search`: boolean
  - `echo_set_count`: number
  - `echo_main_count`: number
  - `sort`: sort key
  - `direction`: `asc` | `desc`
  - `page_size`: number

#### `discovery_result_expand`
- Purpose: user expands a row for deeper inspection.
- Properties:
  - `surface`: `builds` | `leaderboard_character`
  - `character_id`: string | null
  - `track_key`: string | null

#### `leaderboard_tab_change`
- Purpose: user changes weapon or track tab.
- Properties:
  - `character_id`: string
  - `weapon_id`: string | null
  - `track_key`: string | null
  - `tab_kind`: `weapon` | `track`

#### `discovery_open_in_editor_click`
- Purpose: user opens discovered build in editor.
- Properties:
  - `surface`: `builds` | `leaderboard_character`
  - `character_id`: string | null
  - `track_key`: string | null
  - `weapon_id`: string | null

### Saves Lifecycle

#### `saves_load`
- Purpose: load saved build into editor.
- Properties:
  - `build_id`: string
  - `character_id`: string | null
  - `weapon_id`: string | null

#### `saves_delete`
- Purpose: delete saved build.
- Properties:
  - `build_id`: string
  - `character_id`: string | null
  - `weapon_id`: string | null

#### `saves_import`
- Purpose: import build JSON into local saves.
- Properties:
  - `count`: number
  - `format`: `json`
  - `skipped`: number (legacy conversion path only)

#### `saves_export_all`
- Purpose: export all local saves.
- Properties:
  - `build_count`: number

#### `legacy_migration_complete`
- Purpose: old-save migration completed.
- Properties:
  - `migrated_count`: number
  - `skipped_count`: number

## Anti-Noise Guardrails

- `editor_start` emits once per editor session (first dirty transition only).
- `discovery_filter_apply` emits after settled query state and dedupes by filter signature.
- `discovery_result_expand` emits only when row goes closed -> open.
- `leaderboard_tab_change` emits only on actual tab change.
- Do not add events on slider drag ticks, every keystroke, or every minor state mutation.

## Dashboard Blueprint

### 1) Activation
- `home_cta_click` -> (`import_start` or `editor_start`)
- Secondary conversion: `build_save` or `leaderboard_submit_result` success

### 2) Import and OCR Health
- `import_start` -> `ocr_complete` -> `leaderboard_submit_result` -> `import_complete`
- Monitor top `import_validation_fail.reason`
- Monitor `ocr_complete.failed_regions_count`

### 3) Discovery Depth
- `discovery_filter_apply`
- `discovery_result_expand`
- `discovery_open_in_editor_click`
- `leaderboard_tab_change`

### 4) Contribution and Retention
- Contribution actions:
  - `build_save`
  - `build_card_download`
  - `leaderboard_submit_result` (`created`/`updated`)
- Retention cohorts:
  - users with contribution actions, measured 7d/30d return

## Fast Audit Commands

Run from `wuwabuilds/`:

```bash
rg "posthog\\.capture\\('" components
rg "posthog\\.captureException\\(" components hooks
```

Use this doc as the single source for PostHog changes.
