import { LBEchoMainFilter, LBEchoSetFilter } from '@/lib/lb';
import { toMainStatUrlKey } from '@/lib/mainStatFilters';

export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseCSV(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function splitPair(entry: string): [string, string] | null {
  const idx = entry.search(/[-~]/);
  if (idx < 0) return null;
  return [entry.slice(0, idx), entry.slice(idx + 1)];
}

export function parseEchoSetCSV(value: string | null): LBEchoSetFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const pair = splitPair(entry);
      if (!pair) return null;
      const count = Number.parseInt(pair[0], 10);
      const setId = Number.parseInt(pair[1], 10);
      if (!Number.isFinite(count) || !Number.isFinite(setId)) return null;
      return { count, setId };
    })
    .filter((entry): entry is LBEchoSetFilter => entry !== null);
}

export function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const pair = splitPair(entry);
      if (!pair) return null;
      const cost = Number.parseInt(pair[0], 10);
      const statType = pair[1];
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType: toMainStatUrlKey(statType) };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}
