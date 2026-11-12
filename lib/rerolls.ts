import { LBRerollShape, LBRerolls, LBSubstatLadder } from '@/lib/lb';

/** Most transducers a stat may average before it lands and still be listed, past which a reroll is not recommended */
export const TRANSDUCER_LIMIT = 100;
/** Least share of Score an echo must average per transducer to be listed, 1% per 100 transducers */
const MIN_GAIN_PER_TRANSDUCER = 0.0001;
/** Share of Score a stat's best roll must gain to be listed, so a result worth a hundredth of a percent is not one */
const STAT_FLOOR = 0.002;

/** One roll of a target's stat */
interface RerollStep {
  value: number;
  /** Gain at this roll as a share of the current Score, 0 when the roll does not beat it */
  gain: number;
  /** Projected rank at this roll, 0 when it does not climb */
  rank: number;
  /** Chance one roll lands the stat at exactly this roll */
  chance: number;
  /** Transducers spent on average until a roll lands the stat at this roll or higher, 0 when tuning or the roll does not gain */
  transducers: number;
}

/** A stat worth keeping, from its lowest gaining roll up */
export interface RerollTarget {
  key: string;
  ladder: LBSubstatLadder;
  /** Lowest roll that gains */
  minValue: number;
  /** Gain at the lowest gaining roll and at the top roll, as shares of the current Score */
  minGain: number;
  maxGain: number;
  /** Projected rank at the lowest gaining roll and at the top roll, 0 where it does not climb */
  minRank: number;
  maxRank: number;
  /** Transducers spent on average until a roll lands the stat at a roll that gains, 0 when tuning */
  transducers: number;
  /** Every roll of the stat from the lowest up, gaining or not */
  steps: RerollStep[];
}

/** A line a way redraws, with a null ladder for a slot that holds no stat yet */
interface RerollLineRef {
  line: number; // 0-based substat position in the build state
  ladder: LBSubstatLadder | null;
  value: number;
}

/** One choice of lines to redraw on an echo */
export interface RerollWay {
  key: string;
  /** 0-based echo slot in the build state */
  echo: number;
  lines: RerollLineRef[];
  /** Transducers one roll spends, 0 when tuning fills an empty line */
  cost: number;
  /** Mean share of Score gained per transducer, every worse result declined, or per tune when tuning */
  expected: number;
}

/** An echo worth rerolling: the way to roll it, what that way can land, and the echo's other ways */
export interface RerollBand {
  way: RerollWay;
  /** Largest share of the way's mean gain first */
  targets: RerollTarget[];
  /** The echo's other ways, most gain per transducer first */
  alternatives: RerollWay[];
}

export interface RerollModel {
  score: number;
  currentRank: number;
  /** Echoes with an empty line to tune first, then most gain per transducer first */
  bands: RerollBand[];
}

type Candidate = RerollTarget & { expected: number };

const shapeKey = (shape: LBRerollShape): string => `${shape.echo}-${shape.lines.map((line) => line.line).join('+')}`;

function buildTarget(
  shape: LBRerollShape,
  cost: number,
  ladder: LBSubstatLadder,
  scores: number[],
  ranks: number[],
  score: number,
  currentRank: number,
): Candidate | null {
  // Each redrawn slot draws a different stat, so a stat lands on one of them `lines` in `pool`
  const draws = shape.lines.length;
  const odds = ladder.values.map((_, index) => (shape.pool > 0 ? (draws * (ladder.odds[index] ?? 0)) / shape.pool : 0));
  const gains = ladder.values.map((_, index) => Math.max(0, (scores[index] ?? score) / score - 1));
  const from = gains.findIndex((gain) => gain > 0);
  if (from < 0) return null;

  // More of a stat never scores lower, so every roll from the first gaining one up gains and the top holds the best rank
  const top = gains.length - 1;
  const steps = ladder.values.map((value, index): RerollStep => {
    const rank = ranks[index] ?? 0;
    const orHigher = odds.slice(index).reduce((sum, entry) => sum + entry, 0);
    return {
      value,
      gain: gains[index],
      rank: gains[index] > 0 && rank > 0 && (currentRank <= 0 || rank < currentRank) ? rank : 0,
      chance: odds[index],
      transducers: gains[index] > 0 && cost > 0 && orHigher > 0 ? cost / orHigher : 0,
    };
  });
  return {
    key: `${shapeKey(shape)}-${ladder.stat}`,
    ladder,
    minValue: ladder.values[from],
    minGain: gains[from],
    maxGain: gains[top],
    minRank: steps[from].rank,
    maxRank: steps[top].rank,
    transducers: steps[from].transducers,
    steps,
    expected: steps.reduce((sum, step) => sum + step.chance * step.gain, 0),
  };
}

function buildWay(shape: LBRerollShape, data: LBRerolls, ladderByStat: Map<string, LBSubstatLadder>): RerollWay {
  const lines = shape.lines.map((line) => ({ line: line.line, ladder: ladderByStat.get(line.stat) ?? null, value: line.value }));
  // An echo short of five lines fills its next one by tuning, which spends no transducer
  const cost = lines.some((line) => !line.ladder) ? 0 : Math.max(1, shape.cost);
  return {
    key: shapeKey(shape),
    echo: shape.echo,
    lines,
    cost,
    expected: shape.expectedGain / data.score / Math.max(1, cost),
  };
}

function buildTargets(shape: LBRerollShape, way: RerollWay, data: LBRerolls, ladderByStat: Map<string, LBSubstatLadder>): RerollTarget[] {
  return shape.stats
    .map((stat) => {
      const ladder = ladderByStat.get(stat.stat);
      return ladder ? buildTarget(shape, way.cost, ladder, stat.scores, stat.ranks, data.score, data.currentRank) : null;
    })
    .filter((candidate): candidate is Candidate => candidate !== null)
    .filter((candidate) => candidate.maxGain >= STAT_FLOOR && (way.cost === 0 || candidate.transducers <= TRANSDUCER_LIMIT))
    .sort((a, b) => b.expected - a.expected);
}

/** Picks the way to roll each echo worth rerolling, with the stats it can land */
export function buildRerollModel(data: LBRerolls): RerollModel {
  const ladderByStat = new Map(data.ladders.map((ladder) => [ladder.stat, ladder]));
  const byEcho = new Map<number, LBRerollShape[]>();
  data.shapes
    .filter((shape) => shape.expectedGain > 0)
    .forEach((shape) => byEcho.set(shape.echo, [...(byEcho.get(shape.echo) ?? []), shape]));

  const bands: RerollBand[] = [];
  byEcho.forEach((shapes) => {
    const ways = shapes
      .map((shape) => ({ shape, way: buildWay(shape, data, ladderByStat) }))
      .sort((a, b) => b.way.expected - a.way.expected);
    // The best way whose stats land within the limit, since a way can average well on results too rare to list
    for (const { shape, way } of ways) {
      if (way.cost > 0 && way.expected < MIN_GAIN_PER_TRANSDUCER) break;
      const targets = buildTargets(shape, way, data, ladderByStat);
      if (targets.length === 0) continue;
      bands.push({ way, targets, alternatives: ways.map((entry) => entry.way).filter((other) => other !== way) });
      break;
    }
  });
  bands.sort((a, b) => (
    Number(a.way.cost > 0) - Number(b.way.cost > 0) || b.way.expected - a.way.expected || a.way.echo - b.way.echo
  ));

  return { score: data.score, currentRank: data.currentRank, bands };
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

/** "3.9" for an average count of transducers, whole from 10 up since a decimal there is noise */
export function formatTransducers(count: number): string {
  return count < 9.95 ? count.toFixed(1) : Math.round(count).toLocaleString();
}
