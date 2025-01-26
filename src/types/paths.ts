import { Character, SKIN_CHARACTERS } from "./character";
import { Weapon } from "./weapon";
import { Echo } from "./echo";

export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1' | 'weapons' | 'echoes';

interface PathConfig {
    base: string;
    faces: string;
    icons: string;
    elements: string;
    face1: string;
    weapons: string;
    echoes: string;
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

export interface ImagePaths {
    cdn: string;
    local: string;
}

export const PATHS = {
    cdn: {
        base: 'https://files.wuthery.com/p',
        faces: 'GameData/UIResources/Common/Image/IconRoleHeadCircle256',
        icons: 'GameData/UIResources/Common/Image/IconRolePile',
        elements: 'GameData/UIResources/Common/Image/IconElementShine',
        face1: 'GameData/UIResources/Common/Image/IconRoleHead256',
        weapons: 'GameData/UIResources/Common/Image/IconWeapon',
        echoes: 'GameData/UIResources/Common/Image/IconMonsterHead'
    } as PathConfig,
    local: {
        base: '/images',
        faces: 'Faces',
        icons: 'Icons',
        elements: 'Elements',
        face1: 'Face1',
        weapons: 'Weapons',
        echoes: 'Echoes'
    } as PathConfig
};

export const getAssetPath = (category: ImageCategory, input: string | Character | Weapon | Echo, useAltSkin?: boolean, isPhantom?: boolean): ImagePaths => {
    const name = typeof input === 'string' ? input : input.name;
    const id = typeof input === 'string' ? input : input.id;
    const title = typeof input === 'string' ? input : (input as Character).title ?? id;

    switch (category) {
        case 'elements': {
            const cdnName = ELEMENT_NAME_MAP[name];
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.elements}/T_IconElement${cdnName}2_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.elements}/${name}.png`
            };
        }
        case 'faces':
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.faces}/T_IconRoleHeadCircle256_${id}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.faces}/${name}.png`
            };
        case 'icons': {
            const skinSuffix = useAltSkin && SKIN_CHARACTERS.includes(name) ? '2' : '';
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.icons}/T_IconRole_Pile_${title}${skinSuffix}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.icons}/${name}${skinSuffix}.png`
            };
        }
        case 'face1':
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.face1}/T_IconRoleHead256_${id}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.face1}/${name}.png`
            };
        case 'weapons': {
            const weapon = input as Weapon;
            const weaponId = useAltSkin && weapon.id === '21010026' ? '21010017' : weapon.id;
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.weapons}/T_IconWeapon${weaponId}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.weapons}/${weapon.type}/${encodeURIComponent(weapon.name)}.png`
            };
        }   
        case 'echoes': {
            const echo = input as Echo;
            const localName = isPhantom ? `Phantom ${echo.name}` : echo.name;
            const echocdn = isPhantom && echo.name in PHANTOM_CDN_IDS ? PHANTOM_CDN_IDS[echo.name] : echo.id;
            return {
                cdn: `${PATHS.cdn.base}/${PATHS.cdn.echoes}/T_IconMonsterHead_${echocdn}_UI.png`,
                local: `${PATHS.local.base}/${PATHS.local.echoes}/${localName}.png`
            };
        }
    }
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
    'Lorelei': 'SG_33011'
};