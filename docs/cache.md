# SSR Prefetch + Cache Plan

## Summary

Replace skeleton-first loading on `/builds`, `/leaderboards`, and `/leaderboards/[characterId]` with server-prefetched initial data. After hydration, do a silent background refresh and only update UI if the response signature changed. No Redis — short TTL app-layer caching is enough at ~12k builds.

---

## Current State

### What happens now

1. Browser loads page → empty shell with skeleton
2. Client mounts → `useEffect` fires `listBuilds()` / `listLeaderboardOverview()` / `listLeaderboard()` via `/api/lb/*` proxy
3. Proxy hits `LB_URL` with `cache: 'no-store'` — every request hits Go backend
4. Response arrives → skeleton replaced with data

### Existing caching

- **`buildCache.ts`**: localStorage LRU cache for `/builds` list responses. 2-minute TTL, max 30 entries. Only helps repeat visits on the same browser.
- **`/api/lb/[...path]/route.ts`**: hard `cache: 'no-store'` on all proxy requests. No server-side caching whatsoever.
- **Go LB backend**: no response caching layer. Every request runs a Postgres query.

### What the game-data pattern does (for reference)

`GameDataProvider` (mounted only in the `(game)` route-group layout) fetches 9 JSON files client-side via `fetchRawGameData()`, processes them through `processRawGameData()`, and caches the result in a module-level singleton (`cachedGameDataState`). A `GameDataLoadingGate` prevents game-data routes from rendering until the data is ready. The root layout (`app/layout.tsx`) has no game-data involvement — only `LanguageProvider` wraps the entire app.

---

## Architecture

### New server-side fetch helper

Create `lib/lbServer.ts` — server-only module that fetches directly from `LB_URL` (bypasses the `/api/lb` proxy). This is the key architectural change.

**Why not use the existing proxy?**
- The proxy is `cache: 'no-store'`, designed for client freshness
- SSR fetches from the same Node process would loop back through its own HTTP stack
- Server-side fetches need `X-Internal-Key` header directly, not via proxy
- We want independent TTL caching on these server fetches

**What it exports:**

```
prefetchBuilds(query?)        → LBListBuildsResponse | null
prefetchLeaderboardOverview() → LBCharacterOverview[] | null
prefetchLeaderboard(charId, query?) → LBLeaderboardResponse | null
```

Each function:
- Fetches from `LB_URL` directly with `X-Internal-Key`
- Returns `null` on any error (graceful degradation to client fetch)
- Uses Next.js `fetch` with `next: { revalidate: N }` for ISR-style caching (or a simple in-memory TTL Map, see Caching Strategy below)

### Caching strategy

**Option A — Next.js fetch cache (preferred if stable):**
```ts
fetch(url, { next: { revalidate: 60 } })
```
Next.js deduplicates and caches automatically. Simple, no custom code. Works because these are `GET` requests with deterministic URLs.

**Option B — In-memory TTL Map (fallback):**
Simple `Map<string, { data, expiry }>` in the server module. Cleared on deploy. No persistence needed — these are hot queries that repopulate instantly.

**TTLs:**

| Route | Query | TTL | Rationale |
|-------|-------|-----|-----------|
| `/builds` | Default (page 1, sort=finalCV, desc, size=12) | 60s | Most common landing query |
| `/leaderboards` | Overview (all characters) | 60s | Single fan-out query in Go, worth caching |
| `/leaderboards/[charId]` | Current query (canonical `weaponId` + `track`) | 30s | Per-character, more variants |

Non-default queries (filtered, paginated, etc.) are **not** SSR-prefetched. Those stay client-only with the existing `buildCache.ts` localStorage layer.

---

## Implementation Plan — Ordered by file

### Phase 1: Server fetch helper

**New file: `lib/lbServer.ts`**

- `'use server'` or just server-only import guard
- Read `LB_URL` and `INTERNAL_API_KEY` from `process.env`
- Reuse parsing functions from `lib/lb.ts` — `parseBuildRowEntry`, `parseLeaderboardEntry`, and `parseStatsRecord` are the source of truth for compact list rows, leaderboard rows, and detail rows.
- Three async functions, each wrapping a `fetch` → parse → return-or-null pipeline
- `prefetchBuilds()`: hits `GET ${LB_URL}/build?page=1&pageSize=12&sort=finalCV&direction=desc`
- `prefetchLeaderboardOverview()`: hits `GET ${LB_URL}/leaderboard`
- `prefetchLeaderboard(characterId, query?)`: hits `GET ${LB_URL}/leaderboard/${characterId}` with canonical `weaponId`, `track`, paging, sorting, and filter params
- All three catch errors → `console.error` → return `null`

### Phase 2: `/builds` SSR prefetch

**File: `app/(game)/builds/page.tsx`**

- Make the default export `async`
- Call `prefetchBuilds()` to get initial data
- Pass `initialData` prop to `BuildPageClient`

**File: `components/build/BuildPageClient.tsx`**

- Add optional `initialData?: LBListBuildsResponse | null` prop
- Change `builds` and `total` `useState` initializers to use `initialData` when present:
  ```
  const [builds, setBuilds] = useState<LBBuildRowEntry[]>(() => initialData?.builds ?? []);
  const [total, setTotal] = useState(() => initialData?.total ?? 0);
  ```
- Change `settledQueryKey`: when `initialData` is present and the current query matches the default query, initialize `settledQueryKey` to `currentQueryKey` so `isPendingQuery` is `false` from frame 1
- The existing `useEffect` fetch still runs — it becomes the silent revalidation. When it resolves, if the data hasn't changed (diff check), skip `setBuilds`/`setTotal`

### Phase 3: `/leaderboards` SSR prefetch

**File: `app/(game)/leaderboards/page.tsx`**

- Make default export `async`
- Call `prefetchLeaderboardOverview()`
- Pass `initialData` prop to `LeaderboardOverviewClient`

**File: `components/leaderboard/LeaderboardOverviewClient.tsx`**

- Add optional `initialData?: LBCharacterOverview[] | null` prop
- Initialize `overview` state from `initialData` when present
- Initialize `fetchState` to `{ isLoading: false, error: null }` when `initialData` is present
- `useEffect` still runs as silent revalidation — only updates if data changed

### Phase 4: `/leaderboards/[characterId]` SSR prefetch

**File: `app/(game)/leaderboards/[characterId]/page.tsx`**

- Already `async` (reads `params`)
- Read `searchParams`, parse the current leaderboard query, and call `prefetchLeaderboard(characterId, query)`
- Pass `initialData` prop to `LeaderboardCharacterClient`

**File: `components/leaderboard/LeaderboardCharacterClient.tsx`**

- Add optional `initialData?: LBLeaderboardResponse | null` prop
- Initialize `entries`, `total`, `configWeaponIds`, `configSequences` from `initialData` when present
- Initialize `settledQueryKey` to match initial query key when `initialData` present
- `useEffect` becomes silent revalidation

Current behavior:
- canonical leaderboard URL state uses `weaponId` and `track`
- SSR prefetch seeds the exact selected board from the current URL
- leaderboard list rows are compact; full `buildState` is fetched on expand through `GET /build/{id}`

### Phase 5: Diff-based silent revalidation

Add a lightweight signature comparison so the revalidation fetch doesn't cause unnecessary rerenders when data hasn't changed.

**`/builds` diff signature:**
```ts
function buildListSignature(builds: LBBuildRowEntry[], total: number): string {
  return `${total}:${builds.map(b => `${b.id}:${b.cv}:${b.timestamp}`).join(',')}`;
}
```

**`/leaderboards` overview diff signature:**
```ts
function overviewSignature(entries: LBCharacterOverview[]): string {
  return entries.map(e => `${e.id}:${e.totalEntries}`).join(',');
}
```

**`/leaderboards/[characterId]` diff signature:**
```ts
function leaderboardSignature(entries: LBLeaderboardEntry[], total: number): string {
  return `${total}:${entries.map(e => `${e.id}:${e.damage}:${e.globalRank}:${e.timestamp}`).join(',')}`;
}
```

In each revalidation `useEffect`, compare `signature(newData) === signature(currentData)`. If equal, skip `setState`. If different, swap in the new data. The existing refresh overlay (`isRefreshing`) already handles the visual transition.

---

## What does NOT change

- **`/api/lb/[...path]/route.ts`** — untouched. Client-side fetches (filtered queries, pagination, detail expansion) still go through the proxy with `no-store`. This is correct for user-initiated queries.
- **`buildCache.ts`** — untouched. localStorage cache still helps repeat client-side queries.
- **Detail expansion** (`getBuildById`) — stays client-only. Not worth SSR-prefetching individual build details.
- **Filtered/paginated queries** — client-only. Only the default landing query is SSR-prefetched.
- **`GameDataContext`** client-cached route-group pattern — untouched in this phase.
- **Go LB backend** — no changes in this phase.

---

## File change summary

| File | Change |
|------|--------|
| `lib/lbServer.ts` | **NEW** — server-only LB fetch helpers with TTL caching |
| `app/(game)/builds/page.tsx` | `async`, call `prefetchBuilds()`, pass `initialData` |
| `components/build/BuildPageClient.tsx` | Accept `initialData` prop, initialize state from it, diff-skip on revalidation |
| `app/(game)/leaderboards/page.tsx` | `async`, call `prefetchLeaderboardOverview()`, pass `initialData` |
| `components/leaderboard/LeaderboardOverviewClient.tsx` | Accept `initialData` prop, initialize state, diff-skip on revalidation |
| `app/(game)/leaderboards/[characterId]/page.tsx` | Parse `searchParams`, call `prefetchLeaderboard(characterId, query)`, pass `initialData` |
| `components/leaderboard/LeaderboardCharacterClient.tsx` | Accept `initialData` prop, initialize state + config, diff-skip on revalidation |

7 files total. 1 new, 6 modified.

---

## Risk assessment

| Risk | Mitigation |
|------|------------|
| SSR fetch to LB_URL fails or times out | Every `prefetch*` returns `null` on error → client components fall back to existing skeleton + client fetch. Zero UX regression. |
| SSR adds latency to TTFB | TTL cache means most SSR requests are served from cache, not hitting Go backend. Worst case first-request-after-deploy adds ~50-100ms. |
| Stale data shown on initial render | 30-60s TTL is acceptable. Silent revalidation swaps in fresh data within seconds of mount. |
| `LB_URL` or `INTERNAL_API_KEY` missing in dev | `prefetch*` catches the config error and returns `null`; `/api/lb/*` returns a 500 config error instead of guessing a backend. |
| Hydration mismatch | Not a risk — server passes data as props, client initializes from props. No conditional rendering differences. |

---

## Future improvements (not in this phase)

- **Cache invalidation on `POST /build`**: After a build submit, bust the cached `/build` default query and the relevant `/leaderboard/{characterId}` cache. Simple version-bump or `revalidatePath()`.
- **Go-side response caching**: Add `Cache-Control` headers from Go for the hot queries. Let Next.js `fetch` respect them.
- **Fix LB API metadata**: `weaponIds`/`sequences` are empty in leaderboard responses (handlers.go). Fix this so the character page doesn't need a round-trip to discover available weapons.
- **Fix damage sort index**: `idx_builds_char_damage` in schema.sql doesn't match the `damage_map` JSON expression sort in query.go. Add a proper index if damage sort becomes a bottleneck.
- **Redis**: Not justified at ~12k builds. Revisit if build count 10x's or if multi-instance deploys need shared cache.
