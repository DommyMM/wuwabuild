import React from 'react';

export const IMPORT_REGIONS = {
    "character": { x1: 65, x2: 618, y1: 8, y2: 92 },
    "watermark": { x1: 14, x2: 194, y1: 80, y2: 148 },
    "forte": { x1: 779, x2: 1425, y1: 24, y2: 639 },
    "sequences": { x1: 135, x2: 637, y1: 517, y2: 631 },
    "weapon": { x1: 1448, x2: 1887, y1: 415, y2: 631 },
    "echo1": { x1: 24, x2: 392, y1: 650, y2: 1063 },
    "echo2": { x1: 395, x2: 763, y1: 650, y2: 1063 },
    "echo3": { x1: 771, x2: 1140, y1: 650, y2: 1063 },
    "echo4": { x1: 1146, x2: 1515, y1: 650, y2: 1063 },
    "echo5": { x1: 1519, x2: 1888, y1: 650, y2: 1063 }
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

    const width = region.x2 - region.x1;
    const height = region.y2 - region.y1;
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(
        image,
        region.x1, region.y1,
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
    
    const genderRegion = { x1: 351, x2: 464, y1: 343, y2: 388 };
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