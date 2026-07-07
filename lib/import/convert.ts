import { findRoverVariant, getRoverGender, type Character } from '@/lib/character';
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

const IMPORT_WEAPON_FALLBACKS: Record<string, { id: string; name: string }> = {
  '1109': { id: '21050086', name: 'Freeze Frame' },       // Lucilla
  '1308': { id: '21030066', name: 'Skull Thrasher' },     // Rebecca
  '1511': { id: '21030056', name: 'Spectral Trigger' },   // Lucy
};

function findByName<T extends { name: string }>(name: string, list: T[]): T | null {
  return (
    list.find(x => x.name === name) ??
    list.find(x => x.name.toLowerCase() === name.toLowerCase()) ??
    null
  );
}

function shouldApplyWeaponFallback(data: AnalysisData, characterId: string): boolean {
  if (!IMPORT_WEAPON_FALLBACKS[characterId]) return false;

  // The OCR backend reports an unreadable weapon as empty (blank name and id).
  const rawName = data.weapon?.name?.trim() ?? '';
  const rawId = data.weapon?.id?.trim() ?? '';
  return !rawName && !rawId;
}

// The weapon the import will actually submit for this character, when OCR
// couldn't read it (empty name/id). Returns null when the OCR weapon should stand
export function resolveImportWeaponFallback(
  data: AnalysisData,
  characterId: string | null,
): { id: string; name: string } | null {
  if (!characterId || !shouldApplyWeaponFallback(data, characterId)) return null;
  return IMPORT_WEAPON_FALLBACKS[characterId];
}

function parseRoverInfo(rawName: string, rawElement?: string): {
  isRover: boolean;
  gender: 'M' | 'F' | undefined;
  roverElement: string | undefined;
  baseName: string;
} {
  const gender = rawName.includes('(M)') ? 'M' : rawName.includes('(F)') ? 'F' : undefined;
  const isRover  = gender !== undefined || /\bRover\b/i.test(rawName);
  const roverElement = ELEMENTS.find(el => rawElement === el) ?? ELEMENTS.find(el => rawName.includes(el));
  const baseName = rawName
    .replace(/\s*\([MF]\)\s*/g, '')
    .replace(new RegExp(`\\s*(${ELEMENTS.join('|')})\\s*`, 'g'), '')
    .replace(/\s*:\s*/g, ' ')
    .trim();
  return { isRover, gender, roverElement, baseName };
}

export function convertAnalysisToSavedState(
  data: AnalysisData,
  args: ConvertArgs
): SavedState {
  const { characters, weapons } = args;

  // Character
  const rawName = data.character?.name ?? '';
  const ocrCharacterId = data.character?.id ?? null;
  const { isRover, gender, roverElement, baseName } = parseRoverInfo(rawName, data.character?.element);

  let characterId: string | null = null;
  let roverElementState: string | undefined;

  if (ocrCharacterId && characters.some(c => c.id === ocrCharacterId)) {
    const character = characters.find(c => c.id === ocrCharacterId);
    if (character?.name.startsWith('Rover')) {
      // Re-pair the OCR id with the reported element within the same gender, so
      // a mismatched id + element never reaches the saved state.
      roverElementState = roverElement ?? character.roverElementName;
      characterId = findRoverVariant(characters, {
        element: roverElementState,
        gender: getRoverGender(character.id),
      })?.id ?? ocrCharacterId;
    } else {
      characterId = ocrCharacterId;
    }
  } else if (isRover) {
    const roverVariant = findRoverVariant(characters, { element: roverElement, gender });
    characterId = roverVariant?.id ?? null;
    roverElementState = roverElement ?? roverVariant?.roverElementName;
  } else if (baseName) {
    characterId = findByName(baseName, characters)?.id ?? null;
  }

  const characterLevel = data.character?.level ?? 90;

  // Weapon
  let weaponId: string | null = null;
  const weaponLevel = data.weapon?.level ?? 90;
  const ocrWeaponId = data.weapon?.id ?? null;

  if (data.weapon?.name && characterId !== null) {
    const character = characters.find(c => c.id === characterId);
    if (character) {
      const weaponList = weapons.get(character.weaponType as WeaponType) ?? [];
      if (ocrWeaponId && weaponList.some(w => w.id === ocrWeaponId)) {
        weaponId = ocrWeaponId;
      } else {
        weaponId = findByName(data.weapon.name, weaponList)?.id ?? null;
      }
    }
  }
  if (!weaponId && characterId && shouldApplyWeaponFallback(data, characterId)) {
    weaponId = IMPORT_WEAPON_FALLBACKS[characterId].id;
  }

  // Forte
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

  // Sequence
  const sequence = data.sequences?.sequence ?? 0;

  // Echoes
  const echoKeys = ['echo1', 'echo2', 'echo3', 'echo4', 'echo5'] as const;
  const echoPanels: EchoPanelState[] = echoKeys.map(k => {
    const echoData = data[k];
    if (!echoData) return createDefaultEchoPanelState();
    return matchEchoData(echoData, args) ?? createDefaultEchoPanelState();
  });

  // Watermark
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
