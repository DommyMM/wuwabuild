'use client';

import { createWorker } from 'tesseract.js';
import Fuse from 'fuse.js';

type OCRResult = {
    type: 'Character' | 'Weapon' | 'Sequences' | 'Forte' | 'Echo' | 'unknown';
    image?: string;
};

interface OCRProps {
    imageData: string;
}

const SCAN_REGIONS = {
    info: { top: 0, left: 0, width: 0.13, height: 0.11 },
    characterPage: { top: 0.0834, left: 0.09, width: 0.5504, height: 0.9152},
    weaponPage: { top: 0.11, left: 0.09, width: 0.215, height: 0.25 },
    sequencesPage: { top: 0.1047, left: 0.527, width: 0.271, height: 0.835 },
    fortePage: { top: 0.16, left: 0.2, width: 0.605, height: 0.82 },
    echo: { top: 0.11, left: 0.72, width: 0.25, height: 0.35 }
} as const;

const TYPE_PATTERNS = {
    Character: ['overview'],
    Weapon: ['weapon'],
    Forte: ['forte'],
    Sequences: ['resonance'],
    Echo: ['cost', '12', 'all', '1212']
} as const;

const patternSearch = new Fuse(
    Object.entries(TYPE_PATTERNS).flatMap(([type, patterns]) => 
        patterns.map((pattern) => ({ type, pattern }))),
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

export const cleanupWorker = async () => {
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

const processImageForType = async (imageData: string, type: OCRResult['type']): Promise<string> => {
    const typeToRegion: Record<OCRResult['type'], keyof typeof SCAN_REGIONS> = {
        'Character': 'characterPage',
        'Weapon': 'weaponPage',
        'Sequences': 'sequencesPage',
        'Forte': 'fortePage',
        'Echo': 'echo',
        'unknown': 'info'
    };

    const regionKey = typeToRegion[type];
    if (!regionKey) {
        throw new Error(`Invalid type: ${type}`);
    }
    
    const canvas = await cropImage(imageData, regionKey);
    return canvas.toDataURL('image/png');
};

export const performOCR = async ({ imageData }: OCRProps): Promise<OCRResult> => {
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

        if (bestMatch.type === 'unknown') {
            return { type: 'unknown' };
        }
        const processedImage = await processImageForType(imageData, bestMatch.type);
        return {
            type: bestMatch.type,
            image: processedImage
        };
    } catch (error) {
        console.error('OCR processing error:', error);
        return { type: 'unknown' };
    }
};