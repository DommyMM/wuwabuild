import { MAIN_STAT_OPTIONS } from '@/components/build/buildConstants';
import { LBEchoMainFilter, LBEchoSetFilter } from '@/lib/lb';

export function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseEchoSetCSV(value: string | null): LBEchoSetFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [countRaw, idRaw] = entry.split('~');
      const count = Number.parseInt(countRaw ?? '', 10);
      const setId = Number.parseInt(idRaw ?? '', 10);
      if (!Number.isFinite(count) || !Number.isFinite(setId)) return null;
      return { count, setId };
    })
    .filter((entry): entry is LBEchoSetFilter => entry !== null);
}

const MAIN_STAT_LABEL_BY_CODE = new Map<string, string>(
  MAIN_STAT_OPTIONS.map((entry) => [entry.code, entry.label]),
);

export function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  return value
    .split('.')
    .map((entry) => {
      const [costRaw, statType] = entry.split('~');
      const cost = Number.parseInt(costRaw ?? '', 10);
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType: MAIN_STAT_LABEL_BY_CODE.get(statType) ?? statType };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}
