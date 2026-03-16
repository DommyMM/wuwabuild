import { normalizeLBSortKey, toLBApiSortKey } from '@/lib/lb';
import { parsePositiveInt, parseCSV, parseEchoSetCSV, parseEchoMainCSV } from '../queryHelpers';
import { clampItemsPerPage, DEFAULT_DIRECTION, DEFAULT_PAGE, DEFAULT_SORT, ITEMS_PER_PAGE } from '../constants';
import { QuerySnapshot } from '../types';

export function parseInitialQuery(searchParams: URLSearchParams): QuerySnapshot {
  const page = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
  const pageSize = clampItemsPerPage(parsePositiveInt(searchParams.get('pageSize'), ITEMS_PER_PAGE));
  const sortParam = searchParams.get('sort');
  const directionParam = searchParams.get('direction');
  const sort = normalizeLBSortKey(sortParam, DEFAULT_SORT);
  const direction = directionParam === 'asc' || directionParam === 'desc'
    ? directionParam
    : DEFAULT_DIRECTION;

  return {
    page,
    pageSize,
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
  if (snapshot.pageSize !== ITEMS_PER_PAGE) params.set('pageSize', String(clampItemsPerPage(snapshot.pageSize)));
  if (snapshot.sort !== DEFAULT_SORT) params.set('sort', toLBApiSortKey(snapshot.sort));
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
