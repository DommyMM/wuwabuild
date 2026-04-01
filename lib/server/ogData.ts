import 'server-only';
import fs from 'fs';
import path from 'path';
import { type CDNCharacter, adaptCDNCharacter, formatCharacterDisplayName } from '@/lib/character';

type GenericRecord = Record<string, unknown>;

interface WeaponRecord {
  id?: string | number;
  name?: { en?: string };
  type?: { name?: { en?: string } };
  rarity?: { id?: number };
  icon?: string;
}

const DATA_DIR = path.join(process.cwd(), 'public', 'Data');

function readJson(filename: string): unknown {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// --- Characters ---

export function loadCharacterRaw(id: string): CDNCharacter | null {
  const rawData = readJson('Characters.json');
  if (!rawData || typeof rawData !== 'object') return null;

  const entries: unknown[] = Array.isArray(rawData)
    ? rawData
    : Object.values(rawData as GenericRecord);

  const match = entries.find(
    (e) => e && typeof e === 'object' && 'id' in e && (e as { id?: string | number }).id?.toString() === id,
  );
  return (match as CDNCharacter | undefined) ?? null;
}

export function loadCharacterSummary(id: string) {
  const raw = loadCharacterRaw(id);
  if (!raw) return null;
  const char = adaptCDNCharacter(raw);
  return {
    name: formatCharacterDisplayName(char, { baseName: char.name, roverElement: undefined }),
    element: char.roverElementName ?? char.element,
    weaponType: char.weaponType,
    rarity: char.rarity ?? raw.rarity?.id ?? 5,
    bannerUrl: raw.icon?.banner ?? null,
    iconRoundUrl: raw.icon?.iconRound ?? null,
    elementColor: raw.element?.color ?? null,
    rarityColor: raw.rarity?.color ?? null,
  };
}

// --- Weapons ---

function normalizeWeaponsData(data: unknown): WeaponRecord[] {
  if (Array.isArray(data)) return data as WeaponRecord[];
  if (!data || typeof data !== 'object') return [];
  return Object.values(data as GenericRecord).flatMap((group) => {
    if (Array.isArray(group)) return group as WeaponRecord[];
    if (group && typeof group === 'object') return Object.values(group as GenericRecord) as WeaponRecord[];
    return [];
  });
}

function loadAllWeapons(): WeaponRecord[] {
  const rawData = readJson('Weapons.json');
  if (!rawData) return [];
  return normalizeWeaponsData(rawData);
}

function findWeapon(id: string): WeaponRecord | undefined {
  return loadAllWeapons().find((w) => w.id != null && w.id.toString() === id);
}

export function loadWeaponSummary(id: string) {
  const weapon = findWeapon(id);
  if (!weapon?.name?.en) return null;
  return {
    name: weapon.name.en,
    weaponType: weapon.type?.name?.en ?? 'Weapon',
    rarity: weapon.rarity?.id ?? 5,
    iconUrl: weapon.icon ?? null,
  };
}
