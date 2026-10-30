import { LBRerollShape, LBRerolls, LBSubstatLadder } from '@/lib/lb';

/**
 * Most transducers a way may average per 1% of Score and still be listed
 *
 * On a top Hiyuki build the real lock-4 candidates run 11 to 60 and the next line down about 190
 */
const PRICE_LIMIT = 150;
/** Ways kept when none is under the limit, so a near-finished build still sees its best options */
const WAY_FALLBACK_COUNT = 3;
/** Share of Score a stat's best roll must gain to be listed, so a result worth a hundredth of a percent is not one */
const STAT_FLOOR = 0.002;

/** One roll of a target's stat */
export interface RerollStep {
  value: number;
  /** Gain at this roll as a share of the current Score, 0 when the roll does not beat it */
  gain: number;
  /** Projected rank at this roll, 0 when it does not gain a place */
  rank: number;
  /** Chance one roll lands the stat at exactly this roll */
  chance: number;
  /** Chance one roll lands the stat at this roll or higher */
  orHigher: number;
}

/** One stat a way can land, across every roll of it that gains */
export interface RerollTarget {
  key: string;
  ladder: LBSubstatLadder;
  /** Lowest roll that gains */
  minValue: number;
  /** Gain at the lowest gaining roll and at the top roll, as shares of the current Score */
  minGain: number;
  maxGain: number;
  /** Best rank the stat reaches, 0 when no roll beats the current rank */
  rank: number;
  /** Lowest roll that reaches `rank` */
  rankValue: number;
  /** Chance one roll lands the stat at a roll that gains */
  chance: number;
  /** Every roll of the stat from the lowest up, gaining or not */
  steps: RerollStep[];
}

/** A line a way redraws, with a null ladder for a slot that holds no stat yet */
export interface RerollLineRef {
  line: number; // 0-based substat position in the build state
  ladder: LBSubstatLadder | null;
  value: number;
}

/** One choice of lines to redraw on an echo, with what it can land */
export interface RerollWay {
  key: string;
  /** 0-based echo slot in the build state */
  echo: number;
  lines: RerollLineRef[];
  /** Transducers one roll spends */
  cost: number;
  /** Mean share of Score gained per transducer, every worse result declined */
  expected: number;
  /** Largest share of the way's mean gain first */
  targets: RerollTarget[];
}

export interface RerollModel {
  score: number;
  currentRank: number;
  /** Most gain per transducer first */
  ways: RerollWay[];
}

type Candidate = RerollTarget & { expected: number };

const shapeKey = (shape: LBRerollShape): string => `${shape.echo}-${shape.lines.map((line) => line.line).join('+')}`;

function buildTarget(
  shape: LBRerollShape,
  ladder: LBSubstatLadder,
  scores: number[],
  ranks: number[],
  score: number,
  currentRank: number,
): Candidate | null {
  // Each redrawn slot draws a different stat, so a stat lands on one of them `lines` in `pool`
  const draws = shape.lines.length;
  const odds = ladder.values.map((_, index) => (shape.pool > 0 ? (draws * (ladder.odds[index] ?? 0)) / shape.pool : 0));
  const gaining: Array<{ value: number; gain: number; rank: number; chance: number }> = [];
  ladder.values.forEach((value, index) => {
    const rollScore = scores[index] ?? score;
    if (rollScore <= score) return;
    gaining.push({ value, gain: rollScore / score - 1, rank: ranks[index] ?? 0, chance: odds[index] });
  });
  if (gaining.length === 0) return null;

  // More of a stat never scores lower, so the top roll holds the best gain and the best rank
  const top = gaining[gaining.length - 1];
  const improves = top.rank > 0 && (currentRank <= 0 || top.rank < currentRank);
  const steps = ladder.values.map((value, index): RerollStep => {
    const gain = Math.max(0, (scores[index] ?? score) / score - 1);
    const rank = ranks[index] ?? 0;
    return {
      value,
      gain,
      rank: gain > 0 && rank > 0 && (currentRank <= 0 || rank < currentRank) ? rank : 0,
      chance: odds[index],
      orHigher: odds.slice(index).reduce((sum, entry) => sum + entry, 0),
    };
  });
  return {
    key: `${shapeKey(shape)}-${ladder.stat}`,
    ladder,
    minValue: gaining[0].value,
    minGain: gaining[0].gain,
    maxGain: top.gain,
    rank: improves ? top.rank : 0,
    rankValue: improves ? (gaining.find((roll) => roll.rank === top.rank) ?? top).value : 0,
    chance: gaining.reduce((sum, roll) => sum + roll.chance, 0),
    steps,
    expected: gaining.reduce((sum, roll) => sum + roll.chance * roll.gain, 0),
  };
}

function buildWay(shape: LBRerollShape, data: LBRerolls, ladderByStat: Map<string, LBSubstatLadder>): RerollWay {
  const candidates = shape.stats
    .map((stat) => {
      const ladder = ladderByStat.get(stat.stat);
      return ladder ? buildTarget(shape, ladder, stat.scores, stat.ranks, data.score, data.currentRank) : null;
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
    .sort((a, b) => b.expected - a.expected);
  const listed = candidates.filter((candidate) => candidate.maxGain >= STAT_FLOOR);
  return {
    key: shapeKey(shape),
    echo: shape.echo,
    lines: shape.lines.map((line) => ({ line: line.line, ladder: ladderByStat.get(line.stat) ?? null, value: line.value })),
    cost: Math.max(1, shape.cost),
    expected: shape.expectedGain / data.score / Math.max(1, shape.cost),
    // A way whose every gain sits under the floor still lists its best stat, or it would be empty
    targets: listed.length > 0 ? listed : candidates.slice(0, 1),
  };
}

/** Picks the ways worth rolling on each echo, with the stats each can land */
export function buildRerollModel(data: LBRerolls): RerollModel {
  const ladderByStat = new Map(data.ladders.map((ladder) => [ladder.stat, ladder]));
  const ways = data.shapes
    .filter((shape) => shape.expectedGain > 0)
    .map((shape) => buildWay(shape, data, ladderByStat))
    .sort((a, b) => b.expected - a.expected || a.echo - b.echo || a.key.localeCompare(b.key));

  // Ways on one echo that share a line are rival ways to roll it, so each line stays only in its best way
  const taken = new Set<string>();
  const distinct = ways.filter((way) => {
    const keys = way.lines.map((line) => `${way.echo}-${line.line}`);
    if (keys.some((key) => taken.has(key))) return false;
    keys.forEach((key) => taken.add(key));
    return true;
  });
  const worthRolling = distinct.filter((way) => way.expected * 100 * PRICE_LIMIT >= 1);
  const kept = (worthRolling.length > 0 ? worthRolling : distinct.slice(0, WAY_FALLBACK_COUNT))
    .filter((way) => way.targets.length > 0);

  return { score: data.score, currentRank: data.currentRank, ways: kept };
}

/** "+0.69–1.38%" for the span of a target's gain, one figure when both ends print alike */
export function formatGainRange(min: number, max: number): string {
  const low = formatGain(min);
  const high = formatGain(max);
  return low === high ? high : `${low.slice(0, -1)}–${high.slice(1)}`;
}

/** "+1.25%" for a share of Score, with a third decimal under 0.1% so a small gain never prints as zero */
export function formatGain(gain: number): string {
  const percent = gain * 100;
  const magnitude = Math.abs(percent);
  const digits = magnitude > 0 && magnitude < 0.095 ? 3 : 2;
  return `${percent < 0 ? '−' : '+'}${magnitude.toFixed(digits)}%`;
}

/** "11.1%" for a chance, with a second decimal under 1% so a long shot never prints as zero */
export function formatChance(chance: number): string {
  if (!(chance > 0)) return '';
  const percent = chance * 100;
  return `${percent.toFixed(percent < 0.95 ? 2 : 1)}%`;
}
