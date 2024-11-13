const SCAN_REGIONS = {
    characterPage:{
        top: 0.04,
        left: 0,
        width: 0.3,
        height: 0.25
    },
    weaponPage:{
        top: 0,
        left: 0,
        width: 0.35,
        height: 0.37
    },
    echoPage:{
        top: 0.12,
        left: 0.7,
        width: 0.27,
        height: 0.37
    },
};

async function performMultiRegionOCR(file) {
    try {
        const imageURL = URL.createObjectURL(file);
        const dimensions = await getImageDimensions(imageURL);
        const worker = await Tesseract.createWorker();
        
        const results = {};
        const regionOrder = ['characterPage', 'weaponPage', 'echoPage'];

        for (const regionName of regionOrder) {
            const percentages = SCAN_REGIONS[regionName];
            const region = {
                top: Math.floor(dimensions.height * percentages.top),
                left: Math.floor(dimensions.width * percentages.left),
                width: Math.floor(dimensions.width * percentages.width),
                height: Math.floor(dimensions.height * percentages.height)
            };

            const { data: { text } } = await worker.recognize(imageURL, { rectangle: region });
            results[regionName] = text.trim();
            
            console.log(`OCR Result for ${regionName}:`, text.trim());
            console.log(`Region used for ${regionName}:`, region);

            const analysis = await analyzeOCRResults(results, imageURL);
            console.log("Current Analysis:", analysis);

            if (analysis.type === 'character') {
                await worker.terminate();
                URL.revokeObjectURL(imageURL);
                return { results, analysis };
            }
        }

        const finalAnalysis = await analyzeOCRResults(results, imageURL);
        await worker.terminate();
        URL.revokeObjectURL(imageURL);

        return {
            results,
            analysis: finalAnalysis
        };
        
    } catch (error) {
        console.error("OCR failed:", error);
        return null;
    }
}

function getImageDimensions(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.width,
                height: img.height
            });
        };
        img.onerror = reject;
        img.src = url;
    });
}

async function analyzeOCRResults(results, imageURL) {
    try {
        const characterResponse = await fetch('Data/Characters.json');
        const characters = await characterResponse.json();

        const characterText = (results.characterPage || '').toLowerCase();
        const weaponText = (results.weaponPage || '').toLowerCase();
        const echoText = results.echoPage || '';

        const levelRegex = /Lv\.\s*(\d+)\/(\d+)/i;
        const levelMatch = characterText.match(levelRegex) || weaponText.match(levelRegex);
        const levelData = levelMatch ? {
            level: levelMatch[1]
        } : null;

        const matchedCharacter = characters.find(char => 
            characterText.includes(char.name.toLowerCase())
        );

        if (matchedCharacter) {
            return {
                type: 'character',
                name: matchedCharacter.name,
                level: levelData?.level
            };
        }

        const weaponInfo = await identifyWeaponType(weaponText);
        if (weaponInfo) {
            const rankRegex = /rank\s*(\d+)/i;
            const rankMatch = weaponText.match(rankRegex);
        
            return {
                type: 'weapon',
                name: weaponInfo.name,
                weaponType: weaponInfo.type,
                level: levelMatch?.[1],
                rank: rankMatch?.[1]
            };
        }


        if (echoText) {
            console.log("Full Echo Region Text:", echoText);
            const echoData = parseEchoText(echoText);
            if (echoData) {
                return echoData;
            }
        }
        return { type: 'unknown' };
        
    } catch (error) {
        console.error("Error analyzing OCR results:", error);
        return { type: 'unknown' };
    }
}

async function identifyWeaponType(weaponText) {
    try {
        const weaponResponse = await fetch('Data/Weapons.json');
        const weaponData = await weaponResponse.json();
        
        for (const [weaponType, weapons] of Object.entries(weaponData)) {
            const matchedWeapon = weapons.find(weapon => 
                weaponText.includes(weapon.toLowerCase())
            );
            
            if (matchedWeapon) {
                return {
                    type: weaponType,
                    name: matchedWeapon
                };
            }
        }
        return null;

    } catch (error) {
        console.error("Error identifying weapon:", error);
        return null;
    }
}

function parseEchoText(echoText) {
    try {
        // Extract name (first line before COST)
        const nameMatch = echoText.match(/^([^©\n]+)/);
        const name = nameMatch ? nameMatch[1].trim() : null;

        // Extract cost
        const costMatch = echoText.match(/COST\s+(\d+)/);
        const cost = costMatch ? parseInt(costMatch[1]) : null;

        // Extract level
        const levelMatch = echoText.match(/\+(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : null;

        // Extract main stat
        const mainStatMatch = echoText.match(/[©\d\s:]+([^:\d]+)\s*[\d.]+%?/);
        const mainStat = mainStatMatch ? mainStatMatch[1].trim() : null;

        // Extract sub stats
        const statRegex = /-\s*([^:]+?)\s*:?\s*([\d.]+)%?/g;
        const stats = [];
        let statMatch;
        while ((statMatch = statRegex.exec(echoText)) !== null) {
            stats.push({
                type: statMatch[1].trim(),
                value: parseFloat(statMatch[2]),
                isPercentage: echoText.slice(statMatch.index, statMatch.index + statMatch[0].length).includes('%')
            });
        }

        return {
            type: 'echo',
            name: name,
            cost: cost,
            level: level,
            mainStat: mainStat,
            stats: stats
        };
    } catch (error) {
        console.error("Error parsing echo text:", error);
        return null;
    }
}