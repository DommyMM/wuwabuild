import { Character, SKIN_CHARACTERS } from "./character";
export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1';

interface PathConfig {
    base: string;
    faces: string;
    icons: string;
    elements: string;
    face1: string;
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
        face1: 'GameData/UIResources/Common/Image/IconRoleHead256'
    } as PathConfig,
    local: {
        base: '/images',
        faces: 'Faces',
        icons: 'Icons',
        elements: 'Elements',
        face1: 'Face1'
    } as PathConfig
};

export const getAssetPath = (category: ImageCategory, input: string | Character, useAltSkin?: boolean): ImagePaths => {
    const name = typeof input === 'string' ? input : input.name;
    const id = typeof input === 'string' ? input : input.id;
    const title = typeof input === 'string' ? input : input.title;

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
    }
};