import React from 'react';

export const IMPORT_REGIONS = {
    "character": { x1: 0.0328, x2: 0.3021, y1: 0.0074, y2: 0.0833 },
    "watermark": { x1: 0.0073, x2: 0.1304, y1: 0.0741, y2: 0.1370 },
    "forte": { x1: 0.4057, x2: 0.7422, y1: 0.0222, y2: 0.5917 },
    "sequences": { x1: 0.0703, x2: 0.3318, y1: 0.4787, y2: 0.5843 },
    "weapon": { x1: 0.7542, x2: 0.9828, y1: 0.3843, y2: 0.5843 },
    "echo1": { x1: 0.0125, x2: 0.2042, y1: 0.6019, y2: 0.9843 },
    "echo2": { x1: 0.2057, x2: 0.3974, y1: 0.6019, y2: 0.9843 },
    "echo3": { x1: 0.4016, x2: 0.5938, y1: 0.6019, y2: 0.9843 },
    "echo4": { x1: 0.5969, x2: 0.7891, y1: 0.6019, y2: 0.9843 },
    "echo5": { x1: 0.7911, x2: 0.9833, y1: 0.6019, y2: 0.9843 }
} as const;

export type ImportRegion = keyof typeof IMPORT_REGIONS;

export interface RegionResult {
    region: ImportRegion;
    data: {
        success: boolean;
        error?: string;
        analysis?: any;
    };
}

interface ProcessProps {
    image: File;
    onProcessStart: () => void;
    onError: (error: string) => void;
    onProcessComplete: (results: Record<ImportRegion, any>) => void;
    onRegionComplete?: (region: ImportRegion, data: any) => void;
    triggerRef?: React.MutableRefObject<(() => void) | null>;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const cropImageToRegion = async (
    image: HTMLImageElement,
    region: { x1: number; x2: number; y1: number; y2: number }
): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get canvas context');

    const x1 = Math.round(region.x1 * image.width);
    const x2 = Math.round(region.x2 * image.width);
    const y1 = Math.round(region.y1 * image.height);
    const y2 = Math.round(region.y2 * image.height);
    const width = x2 - x1;
    const height = y2 - y1;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(
        image,
        x1, y1,
        width, height,
        0, 0,
        width, height
    );
    
    return canvas.toDataURL('image/png').split(',')[1];
};

export const isDarkPixel = (data: Uint8ClampedArray, i: number): boolean => {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    return (
        (Math.abs(r - 38) <= 25 && Math.abs(g - 34) <= 25 && Math.abs(b - 34) <= 25) ||
        (Math.abs(r - 36) <= 25 && Math.abs(g - 48) <= 25 && Math.abs(b - 46) <= 25)
    );
};

const checkGender = async (image: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(image);
    await new Promise((resolve) => { img.onload = resolve; });
    
    const genderRegion = { x1: 0.1828, x2: 0.2417, y1: 0.3176, y2: 0.3593 };
    const base64Data = await cropImageToRegion(img, genderRegion);
    
    const tempImg = new Image();
    tempImg.src = `data:image/png;base64,${base64Data}`;
    await new Promise((resolve) => { tempImg.onload = resolve; });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = tempImg.width;
    canvas.height = tempImg.height;
    ctx.drawImage(tempImg, 0, 0);
    
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let darkCount = 0;
    for (let i = 0; i < pixels.data.length; i += 4) {
        if (isDarkPixel(pixels.data, i)) darkCount++;
    }
    
    const ratio = darkCount / (canvas.width * canvas.height);
    console.log(`Dark pixel ratio: ${ratio.toFixed(4)} (${darkCount} / ${canvas.width * canvas.height})`);
    
    const GENDER_THRESHOLD = 0.15;
    return ratio > GENDER_THRESHOLD ? 'M' : 'F';
};

export const Process: React.FC<ProcessProps> = ({ 
    image, 
    onProcessStart, 
    onProcessComplete,
    onRegionComplete,
    onError,
    triggerRef
}) => {
    const processImage = React.useCallback(async () => {
        const processRegion = async (region: ImportRegion) => {
            try {
                const img = new Image();
                img.src = URL.createObjectURL(image);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                const base64Data = await cropImageToRegion(img, IMPORT_REGIONS[region]);
                
                const response = await fetch(`${API_URL}/api/ocr`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        image: base64Data,
                        type: `import-${region}`
                    })
                });
                if (!response.ok) {
                    throw new Error(`Failed to process ${region}`);
                }
                const data = await response.json();
                onRegionComplete?.(region, data.analysis);
                return { region, data };
                
            } catch (error) {
                console.error(`Raw ${region} error:`, error);
                throw new Error(`Error processing ${region}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        try {
            onProcessStart();
            
            const regions: ImportRegion[] = ['character', 'watermark', 'forte', 'sequences', 'weapon', 'echo1', 'echo2', 'echo3', 'echo4', 'echo5'];
            const results = await Promise.all(regions.map(processRegion));
            
            const characterResult = results.find(r => r.region === 'character');
            if (characterResult?.data.analysis?.name?.includes('Rover')) {
                const gender = await checkGender(image);
                const isHavoc = characterResult.data.analysis.name.includes('Havoc');
                characterResult.data.analysis.name = isHavoc ? 
                    `Rover (${gender}) Havoc` : 
                    `Rover (${gender}) Spectro`;
            }
            const forteResult = results.find(r => r.region === 'forte');
            if (forteResult?.data.analysis?.levels) {
                forteResult.data.analysis.levels = forteResult.data.analysis.levels.map(
                    (level: number) => level === 0 ? 10 : level
                );
            }
            
            const finalResults = results.reduce<Record<ImportRegion, any>>((acc, { region, data }) => ({
                ...acc,
                [region]: data.analysis
            }), {
                character: null,
                watermark: null,
                forte: null,
                sequences: null,
                weapon: null,
                echo1: null,
                echo2: null,
                echo3: null,
                echo4: null,
                echo5: null
            });
            onProcessComplete(finalResults);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Unknown error');
        }
    }, [image, onProcessStart, onProcessComplete, onRegionComplete, onError]);
    React.useEffect(() => {
        if (triggerRef) {
            triggerRef.current = processImage;
        }
    }, [triggerRef, processImage]);
    return null;
};