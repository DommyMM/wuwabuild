import { LBEchoMainFilter, LBEchoSetFilter, LBSortKey } from '@/lib/lb';
import {
  DEFAULT_DIRECTION,
  DEFAULT_PAGE,
  DEFAULT_SORT,
  MAIN_STAT_OPTIONS,
  SORT_OPTIONS,
} from './buildsConstants';
import { QuerySnapshot } from './types';

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCSV(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseEchoSetCSV(value: string | null): LBEchoSetFilter[] {
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

function parseEchoMainCSV(value: string | null): LBEchoMainFilter[] {
  if (!value) return [];
  const labelByCode: Map<string, string> = new Map(
    MAIN_STAT_OPTIONS.map((entry) => [entry.code, entry.label]),
  );
  return value
    .split('.')
    .map((entry) => {
      const [costRaw, statType] = entry.split('~');
      const cost = Number.parseInt(costRaw ?? '', 10);
      if (!Number.isFinite(cost) || !statType) return null;
      return { cost, statType: labelByCode.get(statType) ?? statType };
    })
    .filter((entry): entry is LBEchoMainFilter => entry !== null);
}

export function parseInitialQuery(searchParams: URLSearchParams): QuerySnapshot {
  const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const sortParam = searchParams.get('sort');
  const directionParam = searchParams.get('direction');
  const sort = SORT_OPTIONS.some((option) => option.key === sortParam)
    ? (sortParam as LBSortKey)
    : DEFAULT_SORT;
  const direction = directionParam === 'asc' || directionParam === 'desc'
    ? directionParam
    : DEFAULT_DIRECTION;

  return {
    page,
    sort,
    direction: direction === 'asc' ? 'asc' : 'desc',
    characterIds: parseCSV(searchParams.get('characters')),
    weaponIds: parseCSV(searchParams.get('weapons')),
    regionPrefixes: parseCSV(searchParams.get('regions')),
    username: searchParams.get('username') ?? '',
    uid: searchParams.get('uid') ?? '',
    echoSets: parseEchoSetCSV(searchParams.get('sets')),
    echoMains: parseEchoMainCSV(searchParams.get('mains')),
  };
}

export function serializeQuery(snapshot: QuerySnapshot): string {
  const params = new URLSearchParams();
  if (snapshot.page > DEFAULT_PAGE) params.set('page', String(snapshot.page));
  if (snapshot.sort !== DEFAULT_SORT) params.set('sort', snapshot.sort);
  if (snapshot.direction !== DEFAULT_DIRECTION) params.set('direction', snapshot.direction);
  if (snapshot.characterIds.length) params.set('characters', snapshot.characterIds.join(','));
  if (snapshot.weaponIds.length) params.set('weapons', snapshot.weaponIds.join(','));
  if (snapshot.regionPrefixes.length) params.set('regions', snapshot.regionPrefixes.join(','));
  if (snapshot.username) params.set('username', snapshot.username);
  if (snapshot.uid) params.set('uid', snapshot.uid);
  if (snapshot.echoSets.length) {
    params.set('sets', snapshot.echoSets.map((entry) => `${entry.count}~${entry.setId}`).join('.'));
  }
  if (snapshot.echoMains.length) {
    params.set('mains', snapshot.echoMains.map((entry) => `${entry.cost}~${entry.statType}`).join('.'));
  }
  return params.toString();
}
