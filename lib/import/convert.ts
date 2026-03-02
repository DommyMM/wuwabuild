import type { Character } from '@/lib/character';
import type { Weapon, WeaponType } from '@/lib/weapon';
import type { EchoPanelState } from '@/lib/echo';
import type { SavedState, ForteState } from '@/lib/build';
import type { AnalysisData } from './types';
import { matchEchoData, GameDataArgs } from './echoMatching';
import { createDefaultEchoPanelState } from '@/lib/calculations/echoes';

interface ConvertArgs extends GameDataArgs {
  characters: Character[];
  weapons: Map<WeaponType, Weapon[]>;
}

const ELEMENTS = ['Aero', 'Spectro', 'Havoc', 'Glacio', 'Fusion', 'Electro'] as const;

function findByName<T extends { name: string }>(name: string, list: T[]): T | null {
  return (
    list.find(x => x.name === name) ??
    list.find(x => x.name.toLowerCase() === name.toLowerCase()) ??
    null
  );
}

function parseRoverInfo(rawName: string): {
  isRover: boolean;
  isMale: boolean;
  roverElement: string | undefined;
  baseName: string;
} {
  const isMale   = rawName.includes('(M)');
  const isFemale = rawName.includes('(F)');
  const isRover  = isMale || isFemale;
  const roverElement = ELEMENTS.find(el => rawName.includes(el));
  const baseName = rawName
    .replace(/\s*\([MF]\)\s*/g, '')
    .replace(new RegExp(`\\s*(${ELEMENTS.join('|')})\\s*`, 'g'), '')
    .trim();
  return { isRover, isMale, roverElement, baseName };
}

export function convertAnalysisToSavedState(
  data: AnalysisData,
  args: ConvertArgs
): SavedState {
  const { characters, weapons } = args;

  // ── Character ──────────────────────────────────────────────────────────────
  const rawName = data.character?.name ?? '';
  const { isRover, isMale, roverElement, baseName } = parseRoverInfo(rawName);

  let characterId: string | null = null;
  let roverElementState: string | undefined;

  if (isRover) {
    characterId = isMale ? '4' : '5';
    roverElementState = roverElement;
  } else if (baseName) {
    characterId = findByName(baseName, characters)?.id ?? null;
  }

  const characterLevel = data.character?.level ?? 90;

  // ── Weapon ─────────────────────────────────────────────────────────────────
  let weaponId: string | null = null;
  const weaponLevel = data.weapon?.level ?? 90;

  if (data.weapon?.name && characterId !== null) {
    const character = characters.find(c => c.id === characterId);
    if (character) {
      const weaponList = weapons.get(character.weaponType as WeaponType) ?? [];
      weaponId = findByName(data.weapon.name, weaponList)?.id ?? null;
    }
  }

  // ── Forte ──────────────────────────────────────────────────────────────────
  // card.py order: levels[0]=normal, levels[1]=skill, levels[2]=circuit, levels[3]=intro, levels[4]=lib
  // Rewrite column order: col0=normal, col1=skill, col2=circuit, col3=liberation, col4=intro
  const levels = data.forte?.levels ?? [];
  const forte: ForteState = [
    [levels[0] || 10, true, true],  // col0 normal-attack = levels[0]
    [levels[1] || 10, true, true],  // col1 skill         = levels[1]
    [levels[2] || 10, true, true],  // col2 circuit       = levels[2]
    [levels[4] || 10, true, true],  // col3 liberation    = levels[4] ← swap
    [levels[3] || 10, true, true],  // col4 intro         = levels[3] ← swap
  ];

  // ── Sequence ───────────────────────────────────────────────────────────────
  const sequence = data.sequences?.sequence ?? 0;

  // ── Echoes ─────────────────────────────────────────────────────────────────
  const echoKeys = ['echo1', 'echo2', 'echo3', 'echo4', 'echo5'] as const;
  const echoPanels: EchoPanelState[] = echoKeys.map(k => {
    const echoData = data[k];
    if (!echoData) return createDefaultEchoPanelState();
    return matchEchoData(echoData, args) ?? createDefaultEchoPanelState();
  });

  // ── Watermark ──────────────────────────────────────────────────────────────
  const watermark = {
    username: data.watermark?.username ?? '',
    uid: String(data.watermark?.uid ?? ''),
    artSource: '',
  };

  return {
    characterId,
    characterLevel,
    roverElement: roverElementState,
    sequence,
    weaponId,
    weaponLevel,
    weaponRank: 1,
    forte,
    echoPanels,
    watermark,
  };
}
