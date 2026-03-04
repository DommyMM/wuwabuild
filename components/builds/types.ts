import { LBEchoMainFilter, LBEchoSetFilter, LBSortDirection, LBSortKey } from '@/lib/lb';

export type FilterSuggestion = {
  type: 'character' | 'weapon';
  id: string;
  name: string;
  icon: string;
};

export type QuerySnapshot = {
  page: number;
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
};

export type SelectedSetEntry = LBEchoSetFilter & {
  name: string;
};

export type SelectedMainEntry = LBEchoMainFilter & {
  label: string;
};
