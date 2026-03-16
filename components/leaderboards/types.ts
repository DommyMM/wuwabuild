import { LBEchoMainFilter, LBEchoSetFilter, LBSortDirection, LBSortKey } from '@/lib/lb';
import { STAT_OPTION_KEYS } from './constants';

// All sort keys that are sortable stats (excludes finalCV, timestamp, characterId, CR, CD)
export type StatSortKey = (typeof STAT_OPTION_KEYS)[number];

export type QuerySnapshot = {
  page: number;
  pageSize: number;
  sort: LBSortKey;
  direction: LBSortDirection;
  characterIds: string[];
  weaponIds: string[];
  regionPrefixes: string[];
  username: string;
  uid: string;
  echoSets: LBEchoSetFilter[];
  echoMains: LBEchoMainFilter[];
};

export type SetOption = {
  id: number;
  name: string;
  pieceCount: number;
  icon: string;
};

export type SelectedSetEntry = LBEchoSetFilter & {
  name: string;
  icon: string;
};

export type SelectedMainEntry = LBEchoMainFilter & {
  label: string;
};
