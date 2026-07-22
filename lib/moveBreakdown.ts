import { LBMoveEntry } from '@/lib/lb';

// Fixed move-type identity: every board colors a type the same way, so the
// mapping is learnable across builds. Steps validated (CVD + contrast) against
// the dark surface; the most co-occurring types hold the hues that pass
// all-pairs colorblind checks. Red is reserved for penalties and never a type
// color; echo is a deliberate neutral (external summon, not kit).
//
// The reactive/status-damage family (forte_circuit, frazzle, erosion,
// tune_rupture, glacio_bite, fusion_burst) is a deliberate second tier: 14
// categorical hues is past where all-pairs CVD stays airtight, so these fill
// the open arcs of the wheel and are tuned to differ from echo-slate and from
// the types they most plausibly co-occur with. They rarely appear together, so
// near-neighbours within the tier are acceptable; the textual label always
// disambiguates. Retune hexes freely.
//
// This lives outside the panel because the home hero renders the same profile
// bar for a board record. One palette and one aggregation, so the two surfaces
// can never disagree on a color or a percentage.
const MOVE_TYPE_META: Record<string, { label: string; color: string }> = {
  basic_attack: { label: 'Basic Attack', color: '#c98500' },
  heavy_attack: { label: 'Heavy Attack', color: '#008300' },
  resonance_skill: { label: 'Resonance Skill', color: '#3987e5' },
  resonance_liberation: { label: 'Liberation', color: '#d55181' },
  intro: { label: 'Intro', color: '#199e70' },
  outro: { label: 'Outro', color: '#d95926' },
  echo: { label: 'Echo', color: '#7f93a8' },
  coordinated_attack: { label: 'Coordinated', color: '#9085e9' },
  forte_circuit: { label: 'Forte Circuit', color: '#a7bf46' },
  glacio_bite: { label: 'Glacio Bite', color: '#59b9d4' },
  frazzle: { label: 'Frazzle', color: '#c364c4' },
  erosion: { label: 'Erosion', color: '#a06ee0' },
  tune_rupture: { label: 'Tune Rupture', color: '#d3c23c' },
  fusion_burst: { label: 'Fusion Burst', color: '#e08b4a' },
};
const FALLBACK_TYPE_COLOR = '#7f93a8';

export function typeMeta(moveType: string): { label: string; color: string } {
  const known = MOVE_TYPE_META[moveType];
  if (known) return known;
  const label = moveType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return { label, color: FALLBACK_TYPE_COLOR };
}

type ProcessedHit = {
  key: string;
  name: string;
  damage: number;
  percentage: number;
  displayType: string;
  baseMV: number;
  flatHeal: number;
  count: number;
  rotationIndex: number;
};

type TypeSegment = {
  type: string;
  damage: number;
};

type ProcessedMove = {
  key: string;
  name: string;
  damage: number;
  percentage: number;
  elemType: string;
  moveTypes: string[];
  baseMV: number;
  flatHeal: number;
  scaleStat: string;
  rotationIndex: number;
  hits: ProcessedHit[];
  // Damage split by move type. Derived from typed hits when the backend sends
  // them (per-type sub-hit fold); otherwise a single primary-type segment.
  typeSegments: TypeSegment[];
};

// Global score adjustments (ER scaling, set/echo/sub-DPS bonuses). They scale
// or extend the whole rotation rather than being a part of it — rendered as
// the score equation and the waterfall, never as rotation rows.
type ProcessedModifier = {
  key: string;
  name: string;
  damage: number;
  percentage: number;
};

export type TypeTotal = {
  type: string;
  damage: number;
  percentage: number;
};

export type ProcessedBreakdown = {
  moves: ProcessedMove[];
  modifiers: ProcessedModifier[];
  typeTotals: TypeTotal[];
  dominantElement: string | null;
  rawDamage: number;
  totalScore: number;
};

// The type a hit renders as. A dual-typed hit (Cantarella's Phantom Sting
// coordinated stage is [basic_attack, coordinated_attack]) shows its more
// specific type — the one that differs from the move's primary.
function hitDisplayType(hitTypes: string[], primary: string): string {
  if (hitTypes.length === 0) return primary;
  return hitTypes.find((t) => t !== primary) ?? hitTypes[0];
}

export function processMoves(moves: LBMoveEntry[]): ProcessedBreakdown {
  const grouped = new Map<string, {
    name: string;
    damage: number;
    hits: Map<string, { key: string; name: string; damage: number; types: string[]; baseMV: number; flatHeal: number; count: number; rotationIndex: number }>;
    elemType: string;
    moveTypes: string[];
    baseMV: number;
    flatHeal: number;
    scaleStat: string;
    modifier: boolean;
    rotationIndex: number;
  }>();

  moves.forEach((move, index) => {
    const key = move.key;
    const existing = grouped.get(key) ?? {
      name: move.name,
      damage: 0,
      hits: new Map<string, { key: string; name: string; damage: number; types: string[]; baseMV: number; flatHeal: number; count: number; rotationIndex: number }>(),
      elemType: move.elemType,
      moveTypes: move.moveTypes,
      baseMV: move.baseMV,
      flatHeal: move.flatHeal,
      scaleStat: move.scaleStat,
      modifier: false,
      // API row order is rotation order; a repeated cast keeps its first slot.
      rotationIndex: index,
    };
    existing.damage += move.damage;
    if (move.modifier) existing.modifier = true;

    move.hits.forEach((hit, hitIndex) => {
      // Zero-damage hits are trigger bookkeeping (e.g. a 0-MV echo cast folded
      // for rotation accounting), not damage — never rows or type segments.
      if (!(hit.damage > 0)) return;
      const existingHit = existing.hits.get(hit.key) ?? {
        key: hit.key,
        name: hit.name,
        damage: 0,
        types: hit.moveTypes,
        baseMV: hit.baseMV,
        flatHeal: hit.flatHeal,
        count: 0,
        rotationIndex: hitIndex,
      };
      existingHit.damage += hit.damage;
      existingHit.count += hit.count;
      existing.hits.set(hit.key, existingHit);
    });

    grouped.set(key, existing);
  });

  // The backend Modifier flag is the single source of truth for what is a
  // global score adjustment versus a real rotation move.
  const entries = Array.from(grouped.entries());
  const rawDamage = entries.reduce((sum, [, move]) => (move.modifier ? sum : sum + move.damage), 0);
  if (rawDamage <= 0) {
    return { moves: [], modifiers: [], typeTotals: [], dominantElement: null, rawDamage: 0, totalScore: 0 };
  }

  const processedMoves = entries
    .filter(([, move]) => !move.modifier)
    .map(([key, move]) => {
      const primary = move.moveTypes[0] ?? 'unknown';
      // A hit that repeats the row's own name at the row's own type carries no
      // information (a DisplayGroup fold of extra casts of the same move, e.g.
      // Phrolova's Fate/Finality ×3 or Hiyuki's repeated Glacio Bite lanes).
      // Suppress it — its damage flows into the remainder, which is that type
      // anyway — so those rows render as they did before the typed-hit fold.
      const hits: ProcessedHit[] = Array.from(move.hits.values())
        .map((hit) => ({
          key: hit.key,
          name: hit.name,
          damage: hit.damage,
          percentage: (hit.damage / rawDamage) * 100,
          displayType: hitDisplayType(hit.types, primary),
          baseMV: hit.baseMV,
          flatHeal: hit.flatHeal,
          count: hit.count,
          rotationIndex: hit.rotationIndex,
        }))
        .filter((hit) => !(hit.name === move.name && hit.displayType === primary))
        .sort((a, b) => b.damage - a.damage);

      const hasTypedHits = hits.length > 0
        && Array.from(move.hits.values()).some((hit) => hit.types.length > 0);
      let typeSegments: TypeSegment[];
      if (hasTypedHits) {
        const byType = new Map<string, number>();
        let hitsSum = 0;
        for (const hit of hits) {
          byType.set(hit.displayType, (byType.get(hit.displayType) ?? 0) + hit.damage);
          hitsSum += hit.damage;
        }
        // Hits may not cover the whole move; the remainder stays primary-typed
        // so segment sums keep matching move damage (and the profile keeps
        // matching raw damage).
        const remainder = move.damage - hitsSum;
        if (remainder > 0.5) byType.set(primary, (byType.get(primary) ?? 0) + remainder);
        typeSegments = Array.from(byType.entries())
          .map(([type, damage]) => ({ type, damage }))
          .sort((a, b) => b.damage - a.damage);
      } else {
        typeSegments = [{ type: primary, damage: move.damage }];
      }

      return {
        key,
        name: move.name,
        damage: move.damage,
        percentage: (move.damage / rawDamage) * 100,
        elemType: move.elemType,
        moveTypes: move.moveTypes,
        baseMV: move.baseMV,
        flatHeal: move.flatHeal,
        scaleStat: move.scaleStat,
        rotationIndex: move.rotationIndex,
        hits,
        typeSegments,
      };
    })
    .sort((a, b) => b.damage - a.damage);

  const modifiers = entries
    .filter(([, move]) => move.modifier)
    .map(([key, move]) => ({
      key,
      name: move.name,
      damage: move.damage,
      percentage: (move.damage / rawDamage) * 100,
    }))
    .sort((a, b) => b.damage - a.damage);

  const typeAggregate = new Map<string, number>();
  for (const move of processedMoves) {
    for (const segment of move.typeSegments) {
      typeAggregate.set(segment.type, (typeAggregate.get(segment.type) ?? 0) + segment.damage);
    }
  }
  const typeTotals = Array.from(typeAggregate.entries())
    .map(([type, damage]) => ({ type, damage, percentage: (damage / rawDamage) * 100 }))
    .sort((a, b) => b.damage - a.damage);

  const elementDamage = new Map<string, number>();
  for (const move of processedMoves) {
    if (!move.elemType) continue;
    elementDamage.set(move.elemType, (elementDamage.get(move.elemType) ?? 0) + move.damage);
  }
  const dominantElement = Array.from(elementDamage.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const totalScore = entries.reduce((sum, [, move]) => sum + move.damage, 0);

  return { moves: processedMoves, modifiers, typeTotals, dominantElement, rawDamage, totalScore };
}
