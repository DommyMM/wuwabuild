import React from 'react';

export const IMPORT_REGIONS = {
    "character": { x1: 65, x2: 618, y1: 8, y2: 92 },
    "watermark": { x1: 14, x2: 194, y1: 80, y2: 148 },
    "forte": { x1: 779, x2: 1425, y1: 24, y2: 639 },
    "weapon": { x1: 1448, x2: 1887, y1: 415, y2: 631 },
    "echoes": { x1: 24, x2: 1886, y1: 650, y2: 1063 }
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
                throw new Error(`Error processing ${region}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        try {
            onProcessStart();
            
            const regions: ImportRegion[] = ['character', 'watermark', 'forte', 'weapon', 'echoes'];
            const results = await Promise.all(regions.map(processRegion));
            
            const finalResults = results.reduce<Record<ImportRegion, any>>((acc, { region, data }) => ({
                ...acc,
                [region]: data.analysis
            }), {
                character: null,
                watermark: null,
                forte: null,
                weapon: null,
                echoes: null
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