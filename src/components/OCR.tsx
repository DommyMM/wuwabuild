import { createWorker } from 'tesseract.js';
import Fuse from 'fuse.js';
import { Character, Element } from '../types/character';
import { WeaponType } from '../types/weapon';

type OCRResult = {
    type: 'Character' | 'Weapon' | 'Echo' | 'Sequences' | 'Forte' | 'unknown';
    name?: string;
    characterLevel?: number;
    element?: Element;
    weaponType?: WeaponType;
    weaponLevel?: number;
    rank?: number;
    uid?: string;
    confidence?: number;
    raw?: string;
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
    right_thigh: { top: 0.87, left: 0.54, width: 0.04, height: 0.095 }
} as const;

const TYPE_PATTERNS = {
    Character: ['overview'],
    Weapon: ['weapon'],
    Forte: ['forte'],
    Sequences: ['resonance'],
    Echo: ['cost', '12', 'all']
} as const;

const patternSearch = new Fuse(
    Object.entries(TYPE_PATTERNS).flatMap(([type, patterns]) => 
        patterns.map(pattern => ({ type, pattern }))
    ),
    {
        keys: ['pattern'],
        includeScore: true,
        threshold: 0.3,
        minMatchCharLength: 2
    }
);

const MAX_WORKERS = 3;
let workerPool: Tesseract.Worker[] = [];
let currentWorkerIndex = 0;

const getNextWorker = () => {
    const worker = workerPool[currentWorkerIndex];
    currentWorkerIndex = (currentWorkerIndex + 1) % MAX_WORKERS;
    return worker;
};

const initWorkerPool = async () => {
    if (workerPool.length === MAX_WORKERS) return workerPool;
    
    workerPool = await Promise.all(
        Array(MAX_WORKERS).fill(0).map(() => createWorker('eng'))
    );
    return workerPool;
};

const cleanupWorkerPool = async () => {
    await Promise.all(workerPool.map(w => w.terminate()));
    workerPool = [];
    currentWorkerIndex = 0;
};

let weaponListCache: Record<string, string[]> | null = null;

const loadWeapons = async () => {
    if (weaponListCache) return weaponListCache;
    const response = await fetch('/Data/Weapons.json');
    if (!response.ok) throw new Error('Failed to load weapons');
    weaponListCache = await response.json();
    return weaponListCache;
};

const preprocessImage = async (base64Image: string, regionKey: keyof typeof SCAN_REGIONS): Promise<HTMLCanvasElement> => {
    const img = new Image();
    img.src = base64Image;
    await new Promise(resolve => img.onload = resolve);
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const regionDef = SCAN_REGIONS[regionKey];
    const region = {
        x: Math.floor(img.width * regionDef.left),
        y: Math.floor(img.height * regionDef.top),
        width: Math.floor(img.width * regionDef.width),
        height: Math.floor(img.height * regionDef.height)
    };

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = region.width;
    croppedCanvas.height = region.height;
    const croppedCtx = croppedCanvas.getContext('2d')!;
    croppedCtx.drawImage(
        canvas, 
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
    );
    return croppedCanvas;
};

const isDarkPixel = (data: Uint8ClampedArray, i: number): boolean => {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return (
        (Math.abs(r - 38) <= 25 && Math.abs(g - 34) <= 25 && Math.abs(b - 34) <= 25) ||
        (Math.abs(r - 36) <= 25 && Math.abs(g - 48) <= 25 && Math.abs(b - 46) <= 25)
    );
};

const detectGender = async (imageData: string): Promise<string> => {
    const roverRegions = ['shoulders_left', 'shoulders_right', 'right_thigh'] as const;
    const maleMatches = await Promise.all(
        roverRegions.map(async region => {
            const canvas = await preprocessImage(imageData, region);
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
    return Object.values(Element)
        .filter(e => e !== Element.Rover);
};

const extractCharacterInfo = async (
    text: string, 
    characters: Character[], 
    imageData: string,
    worker: Tesseract.Worker
): Promise<Pick<OCRResult, 'name' | 'characterLevel' | 'element' | 'uid'>> => {
    const elementPattern = new RegExp(getValidElements().join('|'), 'i');
    const elementMatch = text.match(elementPattern);
    const element = elementMatch?.[0].toLowerCase() as Element | undefined;

    const numbers = text.match(/\d+/g)?.reverse();
    const characterLevel = numbers ? parseInt(numbers.find(n => {
        const num = parseInt(n);
        return num >= 1 && num <= 90;
    }) || '') : undefined;

    let name = characters.find(char => 
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

const extractWeaponInfo = (
    text: string, 
    weapons: Record<string, string[]>
): Pick<OCRResult, 'name' | 'weaponType' | 'weaponLevel' | 'rank' | 'confidence'> => {
    const firstLine = text.split('\n')[0]
        .replace(/[©\\%:]/g, '')
        .replace(/\s+/g, ' ')
        .replace('q', 'g')
        .trim();

    const weaponList = Object.entries(weapons).flatMap(([type, names]) =>
        names.map(name => ({ type, name }))
    );

    const weaponSearch = new Fuse(weaponList, {
        keys: ['name'],
        threshold: 0.6,
        includeScore: true
    });

    const results = weaponSearch.search(firstLine);
    const bestMatch = results[0]?.item;
    const confidence = results[0] ? 1 - results[0].score! : undefined;
    const name = bestMatch?.name;
    const weaponType = bestMatch?.type as WeaponType;

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
    const rank = rankMatch ? parseInt(rankMatch[1]) : undefined;

    const result = { name, weaponType, weaponLevel, rank, confidence };
    console.log('Weapon Extract:', result);
    return result;
};

const extractUID = async (imageData: string, worker: Tesseract.Worker): Promise<string | undefined> => {
    const uidCanvas = await preprocessImage(imageData, 'uid');
    
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
    });
    
    const { data: { text } } = await worker.recognize(uidCanvas);
    await worker.setParameters({
        tessedit_char_whitelist: '',
    });
    
    const digits = text.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : undefined;
};

export const performOCR = async ({ imageData, characters = [] }: OCRProps): Promise<OCRResult> => {
    await initWorkerPool();
    const weapons = await loadWeapons();
    if (!weapons) throw new Error('Failed to load weapons data');

    try {
        const worker = getNextWorker();
        const processedCanvas = await preprocessImage(imageData, 'info');
        const { data: { text } } = await worker.recognize(processedCanvas);
        const words = text.toLowerCase()
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
            const characterCanvas = await preprocessImage(imageData, 'characterPage');
            const { data: { text: characterText } } = await worker.recognize(characterCanvas);
            return {
                type: 'Character',
                ...await extractCharacterInfo(characterText, characters, imageData, worker),
                raw: characterText
            };
        }

        if (bestMatch.type === 'Weapon') {
            const weaponCanvas = await preprocessImage(imageData, 'weaponPage');
            const { data: { text: weaponText } } = await worker.recognize(weaponCanvas);
            return {
                type: 'Weapon',
                ...extractWeaponInfo(weaponText, weapons),
                raw: weaponText
            };
        }

        return { type: bestMatch.type };
    } catch (error) {
        console.error('OCR processing error:', error);
        return { 
            type: 'unknown'
        };
    }
};

export { cleanupWorkerPool as cleanupOCR };