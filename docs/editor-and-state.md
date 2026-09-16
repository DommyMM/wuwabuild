# Editor and State

Provider boundaries and how editor state flows. Contexts live in `contexts/`, editor components in
`components/edit/`.

## Provider topology

Three nested layers, each mounted by a different boundary:

- `RootProviders` (`app/layout.tsx`) holds `LanguageProvider`, so language selection survives on every
  route including the static legal pages
- `ToolProviders` (`app/(game)/layout.tsx`) holds `GameDataProvider`, `ToastProvider` and
  `GameDataLoadingGate`, so the game-data JSON loads once per session for tool routes only
- `EditorProviders` holds `BuildProvider` and `StatsProvider`, mounted by `/edit`, `/characters/[id]`,
  `/weapons/[id]` and profile expanded cards

`GameDataLoadingGate` always renders children so server-rendered HTML reaches crawlers, and shows a
non-blocking error banner on load failure rather than a loading state. Because of that, anything
resolved through the client `GameDataContext` (`getCharacter`, `getWeapon`) can briefly show a fallback
until the client JSON fetch lands. An SSR page that needs correct names in its initial HTML must resolve
them server-side through `lib/server/gameData.ts`, never through the client context.

`BuildProvider` persists draft changes to local storage with a debounce, and takes `persistDraft={false}`
for read-only renderers such as profile leaderboard cards.

## Editor flow

An edit updates canonical build state through the build reducer, `StatsProvider` recalculates derived
stats and CV from build plus game data, and the draft persists locally for recovery.

Flows that open a discovered build in the editor must check the current draft before replacing it. If a
different character's build is already loaded, confirm the replacement first, as `BuildExpanded`'s
replace-draft dialog does. Read-only profile card renderers never persist their temporary state.

Import is the exception and replaces the draft without prompting. `saveDraftBuild` records a content-hash
baseline on every programmatic load (import, saves, leaderboard "open in editor"), while manual editing in
`/edit` writes the draft key directly and leaves the baseline stale. When an import displaces a draft whose
content drifted from that baseline, meaning manual work, it first auto-snapshots the draft into local saves
(`snapshotBuildToSaves`, deduped by content hash), then opens a completion dialog over the scan results
offering leaderboard, profile and editor destinations instead of redirecting into `/edit`.

## Route shapes

`/edit`, `/characters/[id]` and `/weapons/[id]` use `EditorProviders` and persist draft edits locally.
Expanded cards on `/profile/[uid]` wrap leaderboard builds in `BuildProvider` and `StatsProvider` with
draft persistence explicitly disabled.

## Constraints

- `ForteState` has 5 ordered branches: normal attack, skill, circuit, liberation, intro
- Echo panels must stay valid for backend acceptance: max total cost 12, max two 4-cost, max three 3-cost
- Watermark username and UID can be seeded from OCR and carried through the save and import flows
