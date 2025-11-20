import { Character, SKIN_CHARACTERS } from "./character";
import { Weapon } from "./weapon";
import { Echo } from "./echo";
import { STAT_CDN_NAMES } from "./stats";

export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1' | 'weapons' | 'echoes' | 'skills' | 'stats' | 'sets';

interface PathConfig {
    base: string;
    faces: string;
    icons: string;
    elements: string;
    face1: string;
    weapons: string;
    echoes: string;
    skills: string;
    stats: string;
    sets: string;
}

interface ElementMapping {
    [key: string]: string;
}

const ELEMENT_NAME_MAP: ElementMapping = {
    'Havoc': 'Dark',
    'Fusion': 'Fire',
    'Glacio': 'Ice',
    'Spectro': 'Light',
    'Electro': 'Thunder',
    'Aero': 'Wind'
};

const SET_NAME_MAP: ElementMapping = {
    'Attack': 'Attack',
    'ER' : 'Cloud',
    'Empyrean' : 'Cooperate',
    'Healing' : 'Cure',
    'Havoc' : 'Dark',
    'Midnight' : 'DarkAssist',
    'Tidebreaking' : 'Energy',
    'Fusion' : 'Fire',
    'Glacio' : 'Ice',
    'Frosty' : 'IceUltimateSkill',
    'Spectro' : 'Light',
    'Radiance' : 'LightError',
    'Electro' : 'Thunder',
    'Aero' : 'Wind',
    'Gust' : 'WindError',
    'Windward' : 'WindErrorA',
    'Flaming' : 'FireUltimateSkill',
    'Dream' : 'DarkVision',
    'Crown': 'Shield',
    'Law': 'Support',
    'Flamewing': 'FireA',
    'Thread': 'QianXiao'
};

export interface ImagePaths {
    cdn: string;
    local: string;
}

export const PATHS = {
    cdn: {
        base: 'https://files.wuthery.com/p/GameData/UIResources/Common',
        faces: 'Image/IconRoleHeadCircle256',
        icons: 'Image/IconRolePile',
        elements: 'Image/IconElementShine',
        face1: 'Image/IconRoleHead256',
        weapons: 'Image/IconWeapon',
        echoes: 'Image/IconMonsterHead',
        skills: 'Atlas/SkillIcon',
        stats: 'Image/IconAttribute',
        sets: 'Image/IconElementAttri'
    } as PathConfig,
    local: {
        base: '/images',
        faces: 'Faces',
        icons: 'Icons',
        elements: 'Elements',
        face1: 'Face1',
        weapons: 'Weapons',
        echoes: 'Echoes',
        skills: 'Skills',
        stats: 'Stats',
        sets: 'SetIcons'
    } as PathConfig
};
// Seqeunce images = IconRup
// Sequence Icons = IconDevice

export const getAssetPath = (category: ImageCategory, input: string | Character | Weapon | Echo, useAltSkin?: boolean, isPhantom?: boolean, skillType?: string): ImagePaths => {
    const name = typeof input === 'string' ? input : input.name;
    const id = typeof input === 'string' ? input : input.id;
    const title = typeof input === 'string' ? input : (input as Character).title ?? id;

    switch (category) {
        case 'elements': {
            const cdnName = ELEMENT_NAME_MAP[name];
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.elements}/T_IconElement${cdnName}2_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.elements}/${name}.png`
            };
        }
        case 'faces':
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.faces}/T_IconRoleHeadCircle256_${id}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.faces}/${name}.png`
            };
        case 'icons': {
            const skinSuffix = useAltSkin && SKIN_CHARACTERS.includes(name) ? '2' : '';
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.icons}/T_IconRole_Pile_${title}${skinSuffix}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.icons}/${name}${skinSuffix}.png`
            };
        }
        case 'face1':
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.face1}/T_IconRoleHead256_${id}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.face1}/${name}.png`
            };
        case 'weapons': {
            const weapon = input as Weapon;
            const weaponId = useAltSkin && weapon.id === '21010026' ? '21010017' : weapon.id;
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.weapons}/T_IconWeapon${weaponId}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.weapons}/${weapon.type}/${encodeURIComponent(weapon.name)}.png`
            };
        }   
        case 'echoes': {
            const echo = input as Echo;
            const localName = isPhantom ? `Phantom ${echo.name}` : echo.name;
            const echocdn = isPhantom && echo.name in PHANTOM_CDN_IDS ? PHANTOM_CDN_IDS[echo.name] : echo.id;
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.echoes}/T_IconMonsterHead_${echocdn}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.echoes}/${localName}.png`
            };
        }
        case 'skills': {
            const character = input as Character;
            const roverVariant = getRoverVariant(character.name);
            if (roverVariant) {
                return {
                    cdn: `${PATHS.local.base}/${PATHS.local.skills}/SkillIcon${roverVariant}/SP_Icon${roverVariant}${skillType}.png`,
                    local: `${PATHS.local.base}/${PATHS.local.skills}/${character.name}/SP_Icon${character.name}${skillType}.png`
                };
            }
            const defaultName = character.title.charAt(0).toUpperCase() + character.title.slice(1).toLowerCase();
            const folderName = SKILL_CDN_NAMES[character.id] || defaultName;
            const iconName = SKILL_ICON_NAMES[character.id] || defaultName;
            // Special handling for Galbrena's non-standard skill naming (D1 -> 1D1, D2 -> 2D2)
            let adjustedSkillType = skillType;
            if (character.id === '55') {
                if (skillType === 'D1') adjustedSkillType = '1D1';
                else if (skillType === 'D2') adjustedSkillType = '2D2';
            }
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.skills}/SkillIcon${folderName}/SP_Icon${iconName}${adjustedSkillType}.png`,
                local: `${PATHS.local.base}/${PATHS.local.skills}/${character.name}/SP_Icon${character.name}${adjustedSkillType}.png`
            };
        }
        case 'stats': {
            const cdnName = STAT_CDN_NAMES[input as string];
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.stats}/T_Iconproperty${cdnName}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.stats}/${input}.png`
            };
        }
        case 'sets': {
            const setName = SET_NAME_MAP[input as string];
            return {
                cdn: `${PATHS.local.base}/${PATHS.local.sets}/T_IconElementAttri${setName}.png`,
                local: `${PATHS.local.base}/${PATHS.local.sets}/${input}.png`
            };
        }
    }
};

const getRoverVariant = (name: string) => {
    if (name === 'RoverSpectro') return 'Zhujue';
    if (name === 'RoverHavoc') return 'ZhujueDark';
    if (name === 'RoverAero') return 'Fengzhu';
    return null;
};

const SKILL_CDN_NAMES: Record<string, string> = {
    '13': 'Motefei',
    '23': 'Jianxin',
    '7': 'Sanhua',
    '55': 'JiaBeiLiNa'
};

const SKILL_ICON_NAMES: Record<string, string> = {
    '9': 'TaoHua',
    '13': 'Motefei',
    '23': 'Jianxin',
    '7': 'Sanhua',
    '55': 'JiaBeiLiNa'
};

const PHANTOM_CDN_IDS: Record<string, string> = {
    'Clang Bang': '1015',
    'Diggy Duggy': 'SG_31047',
    'Dreamless': '998_1',
    'Feilian Beringal': '1009',
    'Gulpuff': '115_1',
    'Hoartoise': '1010',
    'Impermanence Heron': '1014',
    'Inferno Rider': '325_1',
    'Lightcrusher': '1016',
    'Lumiscale Construct': '329_1',
    'Mourning Aix': '1006',
    'Questless Knight': 'SG_32022',
    'Rocksteady Guardian': '1007',
    'Sentry Construct': 'SG_33009',
    'Thundering Mephis': '1008',
    'Vitreum Dancer': 'SG_32029',
    'Lorelei': 'SG_33011',
    'Crownless': 'SG_33018',
    'Capitaneus': '32033_1',
    'Nimbus Wraith': 'SG_31044',
    'Nightmare Crownless': 'SG_33018',
    'Chest Mimic': 'SG_31048',
    'Fae Ignis' : 'SG_31043',
    'Cuddle Wuddle': 'SG_32030',
    'Nightmare Inferno Rider': 'SG_33019',
    'Nightmare Mourning Aix': 'SG_33020',
    'Fallacy of No Return': 'SG_350',
    'Kerasaur': 'SG_31062',
    'The False Sovereign': 'SG_34017'
};