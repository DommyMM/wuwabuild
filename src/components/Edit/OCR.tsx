import { createWorker } from 'tesseract.js';
import Fuse from 'fuse.js';
import { Character, Element } from '../../types/character';
import { WeaponType } from '../../types/weapon';
import { weaponList } from '../../hooks/useWeapons';

type OCRResult = {
    type: 'Character' | 'Weapon' | 'Sequences' | 'Forte' | 'Echo' | 'unknown';
    name?: string;
    characterLevel?: number;
    element?: Element;
    weaponType?: WeaponType;
    weaponLevel?: number;
    rank?: number;
    uid?: string;
    confidence?: number;
    raw?: string;
    forte?: {
        normal: [number, number, number];
        skill: [number, number, number];
        circuit: [number, number, number];
        liberation: [number, number, number];
        intro: [number, number, number];
    };
    image?: string;
};

interface OCRProps {
    imageData: string;
    characters?: Character[];
}

const SCAN_REGIONS = {
    info: { top: 0, left: 0, width: 0.13, height: 0.11 },
    uid: { top: 0.975, left: 0.915, width: 0.07, height: 0.025 },
    characterPage: { top: 0.09, left: 0.09, width: 0.22, height: 0.18 },
    weaponPage: { top: 0.11, left: 0.09, width: 0.215, height: 0.25 },
    shoulders_left: { top: 0.4, left: 0.45, width: 0.02, height: 0.04 },
    shoulders_right: { top: 0.4, left: 0.555, width: 0.02, height: 0.04 },
    right_thigh: { top: 0.87, left: 0.54, width: 0.04, height: 0.095 },
    s1: { top: 0.1047, left: 0.647, width: 0.0234, height: 0.0454 },
    s2: { top: 0.259, left: 0.733, width: 0.028, height: 0.047 },
    s3: { top: 0.473, left: 0.765, width: 0.0234, height: 0.0454 },
    s4: { top: 0.682, left: 0.734, width: 0.025, height: 0.0454 },
    s5: { top: 0.8364, left: 0.645, width: 0.029, height: 0.046 },
    s6: { top: 0.895, left: 0.527, width: 0.025, height: 0.047 },
    normalBase: { top: 0.88, left: 0.2, width: 0.074, height: 0.1 },
    normalMid: { top: 0.568, left: 0.22, width: 0.038, height: 0.067 },
    normalTop: { top: 0.36, left: 0.22, width: 0.038, height: 0.067 },
    skillBase: { top: 0.75, left: 0.323, width: 0.074, height: 0.1 },
    skillMid: { top: 0.438, left: 0.343, width: 0.038, height: 0.067 },
    skillTop: { top: 0.23, left: 0.343, width: 0.038, height: 0.067 },
    circuitBase: { top: 0.683, left: 0.463, width: 0.074, height: 0.1 },
    circuitMid: { top: 0.37, left: 0.477, width: 0.05, height: 0.09 },
    circuitTop: { top: 0.16, left: 0.477, width: 0.05, height: 0.09 },
    liberationBase: { top: 0.754, left: 0.6067, width: 0.074, height: 0.1 },
    liberationMid: { top: 0.438, left: 0.6267, width: 0.038, height: 0.067 },
    liberationTop: { top: 0.23, left: 0.6267, width: 0.038, height: 0.067 },
    introBase: { top: 0.88, left: 0.725, width: 0.077, height: 0.073 },
    introMid: { top: 0.568, left: 0.747, width: 0.038, height: 0.067 },
    introTop: { top: 0.36, left: 0.747, width: 0.038, height: 0.067 },
    echo: { top: 0.11, left: 0.7, width: 0.27, height: 0.35 }
} as const;

const TYPE_PATTERNS = {
    Character: ['overview'],
    Weapon: ['weapon'],
    Forte: ['forte'],
    Sequences: ['resonance'],
    Echo: ['cost', '12', 'all']
} as const;

const patternSearch = new Fuse(
    Object.entries(TYPE_PATTERNS).flatMap(([type, patterns]) => patterns.map((pattern) => ({ type, pattern }))),
    {
        keys: ['pattern'],
        includeScore: true,
        threshold: 0.3,
        minMatchCharLength: 2
    }
);

let worker: Tesseract.Worker | null = null;

const initWorker = async () => {
    if (!worker) {
        worker = await createWorker('eng');
    }
    return worker;
};

const cleanupWorker = async () => {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
};


const cropImage = async (base64Image: string, regionKey: keyof typeof SCAN_REGIONS): Promise<HTMLCanvasElement> => {
    const img = new Image();
    img.src = base64Image;
    await new Promise((resolve) => (img.onload = resolve));

    const regionDef = SCAN_REGIONS[regionKey];
    const region = {
        x: Math.floor(img.width * regionDef.left),
        y: Math.floor(img.height * regionDef.top),
        width: Math.floor(img.width * regionDef.width),
        height: Math.floor(img.height * regionDef.height)
    };

    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d')!;
    
    ctx.drawImage(img,
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
    );
    
    return canvas;
};

const isDarkPixel = (data: Uint8ClampedArray, i: number): boolean => {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return (
        (Math.abs(r - 38) <= 25 && Math.abs(g - 34) <= 25 && Math.abs(b - 34) <= 25) ||
        (Math.abs(r - 36) <= 25 && Math.abs(g - 48) <= 25 && Math.abs(b - 46) <= 25)
    );
};

const isWhitePixel = (data: Uint8ClampedArray, i: number): boolean => {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return r >= 160 && g >= 180 && b >= 145;
};

const isYellowPixel = (data: Uint8ClampedArray, i: number): boolean => {
    const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    return h >= 30 && h <= 75 && s >= 50 && s <= 255 && v >= 100 && v <= 255;
};

const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    if (diff === 0) h = 0;
    else if (max === r) h = 60 * ((g - b) / diff % 6);
    else if (max === g) h = 60 * ((b - r) / diff + 2);
    else if (max === b) h = 60 * ((r - g) / diff + 4);
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : (diff / max) * 255;
    const v = max * 255;

    return [h, s, v];
};

const detectGender = async (imageData: string): Promise<string> => {
    const roverRegions = ['shoulders_left', 'shoulders_right', 'right_thigh'] as const;
    const maleMatches = await Promise.all(
        roverRegions.map(async (region) => {
            const canvas = await cropImage(imageData, region);
            const ctx = canvas.getContext('2d')!;
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);

            let darkCount = 0;
            for (let i = 0; i < pixels.data.length; i += 4) {
                if (isDarkPixel(pixels.data, i)) darkCount++;
            }
            return darkCount / (canvas.width * canvas.height) > 0.4;
        })
    );

    return maleMatches.filter(Boolean).length >= 2 ? ' (M)' : ' (F)';
};

const getValidElements = (): string[] => {
    return Object.values(Element).filter((e) => e !== Element.Rover);
};

const extractUID = async (imageData: string, worker: Tesseract.Worker): Promise<string | undefined> => {
    const uidCanvas = await cropImage(imageData, 'uid');

    await worker.setParameters({
        tessedit_char_whitelist: '0123456789'
    });

    const {
        data: { text }
    } = await worker.recognize(uidCanvas);

    await worker.setParameters({
        tessedit_char_whitelist: ''
    });

    const digits = text.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : undefined;
};

const extractCharacterInfo = async (text: string, characters: Character[], imageData: string, worker: Tesseract.Worker): Promise<Pick<OCRResult, 'name' | 'characterLevel' | 'element' | 'uid'>> => {
    const lines = text.split('\n').map((line) => line.trim());
    const elementLine = lines[1] || '';
    const elementPattern = new RegExp(getValidElements().join('|'), 'i');
    console.log('Raw text:', text);

    const elementMatch = elementLine.match(elementPattern) || text.match(elementPattern);
    const element = elementMatch?.[0].toLowerCase() as Element | undefined;

    const numbers = text.match(/\d+/g)?.reverse();
    const characterLevel = numbers ? parseInt(
            numbers.find((n) => {
                const num = parseInt(n);
                return num >= 1 && num <= 90;
            }) || ''): 1;

    let name = characters.find((char) =>
        text.toLowerCase().includes(char.name.toLowerCase())
    )?.name;

    if (!name && element && ['havoc', 'spectro'].includes(element)) {
        const gender = await detectGender(imageData);
        name = `Rover${gender}`;
    }

    const uid = await extractUID(imageData, worker);
    const result = { name, characterLevel, element, uid };
    console.log('Character Extract:', result);
    return result;
};

const extractWeaponInfo = (text: string): Pick<OCRResult, 'name' | 'weaponType' | 'weaponLevel' | 'rank' | 'confidence'> => {
    const firstLine = text.split('\n')[0]
        .replace(/[©\\%:]/g, '')
        .replace(/\s+/g, ' ')
        .replace('q', 'g')
        .trim();

    const weaponSearch = new Fuse(weaponList, {
        keys: ['name'],
        threshold: 0.6,
        includeScore: true
    });

    const results = weaponSearch.search(firstLine);
    const bestMatch = results[0]?.item;
    const confidence = results[0] ? 1 - results[0].score! : undefined;
    const name = bestMatch?.name;
    const weaponType = bestMatch?.type;

    const levelPatterns = [
        /Lv[.\s]*(\d+)[\s/]+\d+/i,
        /v[.]?(\d+)[\s/]+\d+/i,
        /Level[\s]*(\d+)[\s/]+\d+/i,
        /[X\s]*[Ll]yv\.?(\d+)[\s/]+\d+/i,
        /[X\s]*[Ll]y?v\.?(\d+)[\s/]+\d+/i,
        /.*v.*?(\d+)\/90/i,
        /(\d+)\/90/
    ];

    let weaponLevel: number | undefined;
    for (const pattern of levelPatterns) {
        const match = text.match(pattern);
        if (match) {
            weaponLevel = parseInt(match[1]);
            if (weaponLevel >= 1 && weaponLevel <= 90) break;
        }
    }
    if (!weaponLevel) weaponLevel = 90;

    const rankMatch = text.toLowerCase().match(/rank\s*(\d+)/);
    const rank = rankMatch ? parseInt(rankMatch[1]) : 1;

    const result = { name, weaponType, weaponLevel, rank, confidence };
    console.log('Weapon Extract:', result);
    return result;
};

type SequenceSlot = 0 | 1;

const extractSequenceInfo = async (imageData: string): Promise<{ sequence: number }> => {
    const slots = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
    const debugInfo: Record<string, { active: boolean; yellowRatio: number }> = {};

    const states: SequenceSlot[] = await Promise.all(
        slots.map(async (slot) => {
            const canvas = await cropImage(imageData, slot);
            const ctx = canvas.getContext('2d')!;
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const total = canvas.width * canvas.height;

            let yellowCount = 0;
            for (let i = 0; i < pixels.data.length; i += 4) {
                if (isYellowPixel(pixels.data, i)) yellowCount++;
            }

            const yellowRatio = yellowCount / total;
            const isActive = yellowRatio > 0.5;

            debugInfo[slot] = { active: isActive, yellowRatio };
            return isActive ? 1 : 0;
        })
    );

    const sum = states.reduce((acc, state) => acc + state, 0 as number);
    console.group(`Sequence Detection: ${sum}/6 active`);
    console.log(slots.map(slot => 
        `${slot}: ${debugInfo[slot].active ? '✓' : '✗'} (${debugInfo[slot].yellowRatio.toFixed(3)})`)
        .join('\n'));
    console.groupEnd();

    return { sequence: sum };
};

const processNode = async (imageData: string, regionKey: string, isCircuit: boolean): Promise<number> => {
    const canvas = await cropImage(imageData, regionKey as keyof typeof SCAN_REGIONS);
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const total = canvas.width * canvas.height;

    let activeCount = 0;
    for (let i = 0; i < pixels.data.length; i += 4) {
        if (isCircuit) {
            if (isDarkPixel(pixels.data, i)) activeCount++;
        } else {
            if (isWhitePixel(pixels.data, i)) activeCount++;
        }
    }

    const ratio = activeCount / total;
    const threshold = isCircuit ? 0.5 : 0.4;
    const isActive = isCircuit ? ratio < threshold : ratio > threshold;

    console.log(`Node ${regionKey}:`, {
        type: isCircuit ? 'Circuit' : 'White',
        ratio: `${(ratio * 100).toFixed(1)}%`,
        threshold: `${(threshold * 100).toFixed(1)}%`,
        active: isActive ? '✓' : '✗'
    });

    return isActive ? 1 : 0;
};

const extractForteInfo = async (imageData: string, worker: Tesseract.Worker): Promise<OCRResult['forte']> => {
    const branches = ['normal', 'skill', 'circuit', 'liberation', 'intro'] as const;
    const results: Record<typeof branches[number], [number, number, number]> = {
        normal: [1, 0, 0],
        skill: [1, 0, 0],
        circuit: [1, 0, 0],
        liberation: [1, 0, 0],
        intro: [1, 0, 0]
    };

    const levelPatterns = [
        /Lv\.?\s+(\d+)(?:\s|$)/i,
        /Lv:?\s*(\d+)/i,
        /Lv\.?\s*(\d+)\s*\/\s*10/i,
        /(\d+)\s*\/\s*10/i,
        /(\d+)\/(?:\s|$)/i,
        /Lv\.?\s*(\d)710/i,
        /(\d)710/i,
        /(\d+)/
    ];
    
    const extractLevel = (text: string): number => {
        const cleanText = text.replace(/[\\'"]/g, '').trim();
        for (const pattern of levelPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                let value = match[1];
                if (value.length > 2 && value.includes('7')) {
                    value = value.replace('7', '');
                }
                
                const parsed = parseInt(value);
                if (parsed.toString().length > 2) continue;
                
                if (parsed >= 1 && parsed <= 10) {
                    if (match[0].toLowerCase().startsWith('lv')) {
                        console.log(`Found valid Lv-prefixed level: ${parsed} from match "${match[0]}"`);
                        return parsed;
                    }
                    console.log(`Found valid level: ${parsed} from match "${match[0]}"`);
                    return parsed;
                }
            }
        }
        return 10;
    };

    console.group('Forte Detection');
    for (const branch of branches) {
        const baseCanvas = await cropImage(imageData, `${branch}Base` as keyof typeof SCAN_REGIONS);

        const { data: { text } } = await worker.recognize(baseCanvas);
        const level = extractLevel(text);
        const isCircuitBranch = branch === 'circuit';

        const topActive = await processNode(imageData, `${branch}Top`, isCircuitBranch);
        const midActive = await processNode(imageData, `${branch}Mid`, isCircuitBranch);

        console.log(`${branch}:`, { level, top: topActive, mid: midActive });
        results[branch] = [level, topActive, midActive];
    }
    console.groupEnd();

    return results;
};

const extractEchoInfo = async (imageData: string): Promise<Pick<OCRResult, 'type' | 'image'>> => {
    const echoCanvas = await cropImage(imageData, 'echo');
    return {
        type: 'Echo',
        image: echoCanvas.toDataURL('image/png')
    };
};

export const performOCR = async ({ imageData, characters = [] }: OCRProps): Promise<OCRResult> => {
    const worker = await initWorker();

    try {
        const processedCanvas = await cropImage(imageData, 'info');
        const { data: { text } } = await worker.recognize(processedCanvas);

        const words = text
            .toLowerCase()
            .replace(/[©€\-_()|\\/]/g, '')
            .split(/\s+/)
            .filter(Boolean);

        let bestMatch = { type: 'unknown' as OCRResult['type'], score: 1 };
        for (const word of words) {
            const results = patternSearch.search(word);
            if (results.length > 0 && results[0].score! < bestMatch.score) {
                bestMatch = {
                    type: results[0].item.type as OCRResult['type'],
                    score: results[0].score!
                };
            }
        }

        if (bestMatch.type === 'Character') {
            const characterCanvas = await cropImage(imageData, 'characterPage');
            const { data: { text: characterText } } = await worker.recognize(characterCanvas);
            const charInfo = await extractCharacterInfo(characterText, characters, imageData, worker);
            return { type: 'Character', ...charInfo, raw: characterText };
        }
        
        if (bestMatch.type === 'Weapon') {
            const weaponCanvas = await cropImage(imageData, 'weaponPage');
            const { data: { text: weaponText } } = await worker.recognize(weaponCanvas);
            const weaponInfo = extractWeaponInfo(weaponText);
            return { type: 'Weapon', ...weaponInfo, raw: weaponText };
        }
        
        if (bestMatch.type === 'Sequences') {
            const sequenceInfo = await extractSequenceInfo(imageData);
            return { type: 'Sequences', ...sequenceInfo };
        }
        
        if (bestMatch.type === 'Forte') {
            const forteInfo = await extractForteInfo(imageData, worker);
            return { type: 'Forte', ...forteInfo };
        }

        if (bestMatch.type === 'Echo') {
            const echoInfo = await extractEchoInfo(imageData);
            return echoInfo;
        }
        
        return { type: bestMatch.type };
    } catch (error) {
        console.error('OCR processing error:', error);
        return { type: 'unknown' };
    }
};

export { cleanupWorker as cleanupOCR };