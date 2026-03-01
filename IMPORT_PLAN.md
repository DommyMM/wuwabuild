# Import Page — Integration Plan for wuwabuilds Rewrite

## Overview

The import feature takes a 1920×1080 Discord bot screenshot, crops it into 10 named regions, sends each region to an external OCR API, and converts the structured response into a `SavedState` that is loaded directly into `BuildContext`. A preview step lets the user confirm before the build overwrites the editor state.

---

## 1. Dependency

Add one package:

```
npm install fuse.js
```

`fuse.js` is used for fuzzy echo-name and weapon-name resolution when OCR produces imperfect text.
No server-side OCR or image libs are needed — the browser handles cropping via `<canvas>` and the external API handles OCR.

---

## 2. Environment Variable

Already documented in the rewrite's `CLAUDE.md`:
```
NEXT_PUBLIC_API_URL=https://ocr.wuwabuilds.moe
NEXT_PUBLIC_LB_URL=https://lb.wuwabuilds.moe
```

Both should be in `.env.local`. `NEXT_PUBLIC_API_URL` is the FastAPI OCR backend used by the `/frontend` too.

---

## 3. New Files

```
lib/import/
  types.ts              OCR response types + internal import state shape
  regions.ts            IMPORT_REGIONS coords (copy from frontend/Process.tsx)
  cropImage.ts          Canvas crop utilities (client-only)
  echoMatching.ts       Pure echo/substat fuzzy-matching (takes game data as args)
  convert.ts            AnalysisData → SavedState conversion (takes game data as args)

app/api/ocr/
  route.ts              Next.js proxy → external OCR API (server-side, hides URL, avoids CORS)

app/api/upload-training/
  route.ts              Next.js proxy → R2 upload (fire-and-forget training data)

hooks/
  useOcrImport.ts       Custom hook: orchestrates cropping + parallel OCR calls + state

components/import/
  ImportPageClient.tsx  Top-level orchestrator: manages file, results, modal state
  ImportUploader.tsx    Drag/drop + paste + click file input
  ImportResults.tsx     Displays parsed results; editable username/UID; Import button
  ImportPreview.tsx     Confirmation modal showing build preview before commit

app/import/
  page.tsx              Replace stub with <ImportPageClient />
```

> `ImportProcess.tsx` is **replaced by `hooks/useOcrImport.ts`** — the processing logic belongs in a hook, not a component. `ImportPageClient` calls the hook and passes a trigger ref or button handler down.

---

## 4. `lib/import/types.ts`

```typescript
export interface ImportRegion {
  x1: number; x2: number;
  y1: number; y2: number;
}

export interface EchoOCRData {
  name: { name: string; confidence: number };
  main: { name: string; value: string };
  substats: Array<{ name: string; value: string }>;
  element: string;
}

export interface AnalysisData {
  character?: { name: string; level: number };
  watermark?: { username: string; uid: number };
  weapon?:    { name: string; level: number };
  forte?:     { levels: number[] };       // length 5: [normal, skill, liberation, intro, circuit]
  sequences?: { sequence: number };       // 0–6
  echo1?: EchoOCRData;
  echo2?: EchoOCRData;
  echo3?: EchoOCRData;
  echo4?: EchoOCRData;
  echo5?: EchoOCRData;
}
```

---

## 5. `lib/import/regions.ts`

Verbatim copy of `IMPORT_REGIONS` from the frontend — no logic, just the coordinate constants:

```typescript
export const IMPORT_REGIONS = {
  character: { x1: 0.0328, x2: 0.3021, y1: 0.0074, y2: 0.0833 },
  watermark: { x1: 0.0073, x2: 0.1304, y1: 0.0741, y2: 0.1370 },
  forte:     { x1: 0.4057, x2: 0.7422, y1: 0.0222, y2: 0.5917 },
  sequences: { x1: 0.0703, x2: 0.3318, y1: 0.4787, y2: 0.5843 },
  weapon:    { x1: 0.7542, x2: 0.9828, y1: 0.3843, y2: 0.5843 },
  echo1:     { x1: 0.0125, x2: 0.2042, y1: 0.6019, y2: 0.9843 },
  echo2:     { x1: 0.2057, x2: 0.3974, y1: 0.6019, y2: 0.9843 },
  echo3:     { x1: 0.4016, x2: 0.5938, y1: 0.6019, y2: 0.9843 },
  echo4:     { x1: 0.5969, x2: 0.7891, y1: 0.6019, y2: 0.9843 },
  echo5:     { x1: 0.7911, x2: 0.9833, y1: 0.6019, y2: 0.9843 },
} as const;

export type RegionKey = keyof typeof IMPORT_REGIONS;
```

---

## 6. `lib/import/cropImage.ts`

Client-only canvas utility (no server-side image libs needed):

```typescript
// Load a File into an HTMLImageElement
export async function loadImage(file: File): Promise<HTMLImageElement>

// Crop a region (normalized 0–1 coords) → base64 PNG string
export async function cropImageToRegion(
  img: HTMLImageElement,
  region: { x1: number; x2: number; y1: number; y2: number }
): Promise<string>
```

> Rover gender is now parsed from the OCR character name string (`"Rover (M) Aero"`) — no client-side pixel detection needed for the import flow.

---

## 7. `app/api/ocr/route.ts`

Server-side Next.js proxy. The browser calls `/api/ocr`, never the upstream directly — keeps the backend URL server-only and avoids CORS:

```typescript
// Uses server-only env var (no NEXT_PUBLIC_ prefix needed for server routes)
const UPSTREAM = process.env.API_URL ?? 'http://localhost:5000';

export async function POST(req: Request) {
  const body = await req.json();   // { image: base64, type: "import-character" | … }
  const res = await fetch(`${UPSTREAM}/api/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
```

> Uses `API_URL` (server-only, not `NEXT_PUBLIC_`) since this is a server route. Add `API_URL=https://ocr.wuwabuilds.moe` to `.env.local`.

---

## 7b. `app/api/upload-training/route.ts`

Fire-and-forget training data upload. Validates image dimensions then uploads to R2:

```typescript
// Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET env vars
export async function POST(req: Request) {
  const { image } = await req.json();   // base64 PNG
  // Validate 1920×1080 from PNG header bytes
  // SHA-256 hash-based deduplication key
  // PUT to Cloudflare R2
  return Response.json({ success: true });
}
```

This is optional — omit if R2 credentials are not configured. The client calls it silently with `.catch(() => {})`.

---

## 8. `hooks/useOcrImport.ts`

All processing logic lives here — the components just render state and call handlers:

```typescript
interface UseOcrImportReturn {
  isProcessing: boolean;
  progress: Record<RegionKey, 'pending' | 'done' | 'error'>;
  analysisData: AnalysisData;
  error: string | null;
  processImage: (file: File) => Promise<void>;   // triggers the full pipeline
  reset: () => void;
}

export function useOcrImport(): UseOcrImportReturn {
  // 1. loadImage(file) → HTMLImageElement
  // 2. Crop all 10 regions with cropImageToRegion()
  // 3. Promise.all — POST each to /api/ocr with type "import-{region}"
  // 4. As each resolves, update progress + merge into analysisData via setState
  // 5. Fire-and-forget POST to /api/upload-training if 1920×1080
  // 6. Set isProcessing=false when all done
}
```

`ImportPageClient` calls `processImage(file)` from a button click. No component owns the fetch logic.

---

## 8. `lib/import/echoMatching.ts`

Pure function — receives game data arrays as parameters so it can be called outside React:

```typescript
import Fuse from 'fuse.js';
import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { EchoOCRData } from './types';
import { isPercentStat } from '@/lib/constants/statMappings';

interface GameDataArgs {
  echoes: Echo[];
  mainStats: Record<string, Record<string, [number, number]>>;   // cost → stat → [min,max]
  substats: Record<string, number[]>;                             // stat → possible values
}

export function matchEchoData(
  ocrData: EchoOCRData,
  gameData: GameDataArgs
): EchoPanelState | null

// Internal helpers:
// - normalizeStatName(raw): string   — strip *, ~, spaces; fix common OCR errors (ATKON→ATK, BMG→DMG)
// - fuzzyMatchEcho(name, echoes): Echo | null   — Fuse.js threshold 0.3
// - fuzzyMatchStatName(raw, validStats): string | null   — Fuse.js threshold 0.75
// - closestSubstatValue(target, values): number   — Math.abs nearest
// - calculateMainStatValue(min, max, level=25): number   — linear interpolation
```

Key behaviour:
- Echo level is always 25 (max) — the bot always shows maxed echoes
- `element` from OCR is normalised to `ElementType` (capitalise first letter, map "Attack" etc.)
- Phantom echoes: name starts with "Phantom " → strip prefix, set `phantom: true`

---

## 9. `lib/import/convert.ts`

Pure conversion function — AnalysisData → SavedState for the **rewrite's** state shape:

```typescript
import type { Character } from '@/lib/character';
import type { Weapon } from '@/lib/weapon';
import type { Echo, EchoPanelState, ElementType } from '@/lib/echo';
import type { SavedState, ForteState, ForteEntry } from '@/lib/build';
import type { AnalysisData } from './types';
import { matchEchoData, GameDataArgs } from './echoMatching';
import { createDefaultEchoPanelState } from '@/lib/calculations/echoes';

interface ConvertArgs extends GameDataArgs {
  characters: Character[];
  weapons: Map<string, Weapon[]>;   // weaponType → weapons (from getWeaponsByType)
}

export function convertAnalysisToSavedState(
  data: AnalysisData,
  args: ConvertArgs,
): SavedState
```

> No `roverGender` parameter — gender and element are parsed directly from the character name string returned by the backend.

### Conversion details

**Character:**
```typescript
// card.py returns {"name": "Rover (M) Aero", "level": 90} for Rover
// The name embeds gender "(M)"/"(F)" and the element name — no separate fields.
//
// Parsing logic:
const rawName = data.character?.name ?? '';
const isMale   = rawName.includes('(M)');
const isFemale = rawName.includes('(F)');
const isRover  = isMale || isFemale;
const ELEMENTS = ['Aero','Spectro','Havoc','Glacio','Fusion','Electro'];
const roverElement = ELEMENTS.find(el => rawName.includes(el));

// Rover IDs (from CLAUDE.md): Male="4", Female="5"
const characterId = isRover
  ? (isMale ? '4' : '5')
  : getCharacterByName(baseName)?.id ?? null;
// baseName = strip "(M)"/"(F)" + element suffix before lookup for non-Rover chars
```

**Weapon:**
```typescript
// 1. Get weapons for character's weaponType
// 2. Fuse.js fuzzy match on weapon.name (threshold 0.4)
// 3. If no match: weaponId = null, weaponLevel = data.weapon.level
// 4. Rank always defaults to 1 (OCR doesn't detect rank)
```

**ForteState — CRITICAL index reordering:**

`card.py`'s `FORTE_REGIONS` iterates as `normal→skill→circuit→intro→lib`, so `levels[i]` maps to:

```
card.py output:         levels[0]=normal  levels[1]=skill  levels[2]=circuit  levels[3]=intro  levels[4]=lib
Rewrite column order:   col0=normal-attack  col1=skill  col2=circuit  col3=liberation  col4=intro
```

Only intro and liberation need swapping:

```typescript
const forte: ForteState = [
  [levels[0] || 10, true, true],   // col0 normal-attack = levels[0]
  [levels[1] || 10, true, true],   // col1 skill         = levels[1]
  [levels[2] || 10, true, true],   // col2 circuit       = levels[2]
  [levels[4] || 10, true, true],   // col3 liberation    = levels[4]  ← swap
  [levels[3] || 10, true, true],   // col4 intro         = levels[3]  ← swap
];
// || 10 handles undetected (0) values — bot images always show max builds
```

**Echoes:**
```typescript
const echoKeys = ['echo1','echo2','echo3','echo4','echo5'] as const;
const echoPanels: EchoPanelState[] = echoKeys.map(k =>
  data[k] ? matchEchoData(data[k]!, gameDataArgs) ?? createDefaultEchoPanelState()
           : createDefaultEchoPanelState()
);
```

**Watermark:**
```typescript
watermark: {
  username: data.watermark?.username ?? '',
  uid: String(data.watermark?.uid ?? ''),
  artSource: '',   // not in OCR; user sets manually
}
```

---

## 10. Components

### `components/import/ImportUploader.tsx`
- Accepts `.jpg .jpeg .png`
- Three input methods: click-to-browse, drag-and-drop, `document` paste listener (Ctrl+V)
- Shows tutorial hint images from `/public/images/import-*.webp` (already present)
- Calls `onFile(file: File)` prop when image is received

### `components/import/ImportResults.tsx`
- Props: `data: AnalysisData`, `isProcessing: boolean`, `progress: Record<RegionKey, 'pending'|'done'|'error'>`, `onImport: () => void`
- Uses `GameDataContext` to resolve and display names + icons
- Sections: Character/Level, Weapon/Level, Player info (editable inline), Sequence (6 dots), Forte (5 levels), Echoes (5 cards with main + substats)
- Shows per-region progress dots while `isProcessing` is true
- Validation gate: all required regions present → enables "Import Build" button

### `components/import/ImportPreview.tsx`
- Modal that shows a full build preview before committing
- Calls `convertAnalysisToSavedState(data, gameData)` internally to get `SavedState`
- Wraps a `BuildCard` in a temporary `BuildProvider(persistDraft=false)` so the preview is rendered exactly as the editor would show it
- Buttons: "Cancel" (close), "Confirm Import" (commit + redirect)
- On confirm:
  ```typescript
  const savedState = convertAnalysisToSavedState(data, gameData);
  loadState(savedState);   // useBuild() — from parent context
  router.push('/edit');
  ```

### `components/import/ImportPageClient.tsx`
Uses `useOcrImport()` hook for all fetch/processing logic. Component only manages UI state:

```typescript
type ImportStep = 'upload' | 'process' | 'results';

const [file, setFile]             = useState<File | null>(null);
const [step, setStep]             = useState<ImportStep>('upload');
const [showPreview, setShowPreview] = useState(false);

const { isProcessing, progress, analysisData, error, processImage, reset }
  = useOcrImport();

// Flow:
// 'upload'  → <ImportUploader onFile={f => { setFile(f); setStep('process'); }} />
// 'process' → image thumbnail preview + "Process" button
//             onClick → processImage(file).then(() => setStep('results'))
// 'results' → <ImportResults data={analysisData} progress={progress} … />
// showPreview → <ImportPreview data={analysisData} onConfirm={commitAndRedirect} />
```

---

## 11. `app/import/page.tsx`

Replace the current 7-line stub:

```typescript
import type { Metadata } from 'next';
import { ImportPageClient } from '@/components/import/ImportPageClient';

export const metadata: Metadata = {
  title: 'Import Build — WuWa Builds',
  description: 'Import a build from a wuwa-bot screenshot.',
};

export default function ImportPage() {
  return <ImportPageClient />;
}
```

---

## 12. No BuildContext Changes Needed

`BuildContext` already has `loadState(savedState: SavedState)` which dispatches `LOAD_STATE` — this is exactly what the import confirm action calls. No additions required.

---

## 13. Leaderboard

The rewrite has no leaderboard yet. The "Save to LB" checkbox in `ImportResults` will be **present but disabled/hidden** until the leaderboard feature is built. No LB code is added in this implementation.

---

## 14. What is NOT carried over from frontend

| Frontend feature | Rewrite decision |
|---|---|
| PostHog analytics | Not added |
| OCR training upload to R2 | Include `/api/upload-training` proxy route (fire-and-forget, needs R2 env vars) |
| `wakeupServer()` health check on page load | Include — small GET to `/api/ocr/health` on `ImportPageClient` mount |
| Leaderboard submission | Stub checkbox, defer |
| CSS module files | Use Tailwind throughout (consistent with rewrite) |
| `OCRProvider` / shared scan context | Not needed — import is self-contained, not shared with /edit |
| Import modal (CSS-based) | Reuse `BuildCard` inside a temp `BuildProvider(persistDraft=false)` |

---

## 15. Implementation Order

1. `npm install fuse.js`
2. `lib/import/types.ts` + `lib/import/regions.ts` (no deps)
3. `lib/import/cropImage.ts` (canvas only)
4. `app/api/ocr/route.ts` + `app/api/upload-training/route.ts` (server routes)
5. `lib/import/echoMatching.ts` (pure, needs Fuse.js)
6. `lib/import/convert.ts` (pure, needs echoMatching)
7. `hooks/useOcrImport.ts` (needs cropImage + api routes)
8. `components/import/ImportUploader.tsx`
9. `components/import/ImportResults.tsx`
10. `components/import/ImportPreview.tsx`
11. `components/import/ImportPageClient.tsx` (assembles hook + components)
12. `app/import/page.tsx`
