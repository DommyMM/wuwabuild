const WORKER_COUNT = 3;
const MAX_JOBS = 20;

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
        left: 0.65,
        width: 0.3,
        height: 0.37
    }
};

const REGION_PRIORITIES = {
    characterPage: 1,
    weaponPage: 2,
    echoPage: 3
};

class Semaphore {
    constructor(max) {
        this.max = max;
        this.count = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.count < this.max) {
            this.count++;
            return Promise.resolve();
        }
        return new Promise(resolve => this.queue.push(resolve));
    }

    release() {
        this.count--;
        if (this.queue.length > 0) {
            this.count++;
            const next = this.queue.shift();
            next();
        }
    }
}

const ocrSemaphore = new Semaphore(WORKER_COUNT);

let workerPool = null;
let jobCount = 0;
let workerInitialized = false;
let initializationPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    initializationPromise = initializeWorkerPool().then(() => {
        workerInitialized = true;
    }).catch(error => {
        console.error('Failed to initialize worker pool:', error);
    });
});

async function initializeWorkerPool() {
    if (workerPool) return;
    if (initializationPromise) await initializationPromise;
    
    workerPool = {
        scheduler: Tesseract.createScheduler(),
        workers: []
    };

    const workerPromises = Array(WORKER_COUNT).fill(0).map(async () => {
        const worker = await Tesseract.createWorker();
        workerPool.workers.push(worker);
        await workerPool.scheduler.addWorker(worker);
    });

    await Promise.all(workerPromises);
}

async function resetWorkerPool() {
    if (workerPool) {
        await Promise.all(workerPool.workers.map(w => w.terminate()));
        await workerPool.scheduler.terminate();
    }
    workerPool = null;
    jobCount = 0;
}

async function performMultiRegionOCR(file) {
    let imageURL = null;
    try {
        await ocrSemaphore.acquire();
        
        if (!workerInitialized && initializationPromise) {
            await initializationPromise;
        }

        imageURL = URL.createObjectURL(file);
        const dimensions = await getImageDimensions(imageURL);

        const recognitionJobs = Object.entries(SCAN_REGIONS).map(async ([regionName, percentages]) => {
            const region = {
                top: Math.floor(dimensions.height * percentages.top),
                left: Math.floor(dimensions.width * percentages.left),
                width: Math.floor(dimensions.width * percentages.width),
                height: Math.floor(dimensions.height * percentages.height)
            };

            const results = {};
            const { data: { text } } = await workerPool.scheduler.addJob('recognize', imageURL, { rectangle: region });
            results[regionName] = text.trim();
            
            const analysis = await analyzeOCRResults(results, imageURL);
            return { results, analysis, regionName };
        });

        const responses = await Promise.all(recognitionJobs);
        
        const result = responses.find(r => 
            r.analysis.type === 'character' || r.analysis.type === 'weapon'
        ) || responses.find(r => 
            r.analysis.type === 'echo'
        ) || responses[0];

        jobCount += Object.keys(SCAN_REGIONS).length;

        console.log(`OCR Result for ${result.regionName}:`, result.results[result.regionName]);
        console.log("Analysis:", result.analysis);

        return {
            results: result.results,
            analysis: result.analysis
        };

    } catch (error) {
        console.error("OCR failed:", error);
        return null;
    } finally {
        ocrSemaphore.release();
        if (imageURL) {
            URL.revokeObjectURL(imageURL);
        }
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

function findClosestMatch(input, validOptions) {
    let bestMatch = '';
    let bestScore = 0;
    
    const normalizedInput = input.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace('crit.', 'crit')
        .replace('bonus', '')
        .trim();

    for (const option of validOptions) {
        const normalizedOption = option.toLowerCase();
        
        if (normalizedInput === normalizedOption) {
            return option;
        }

        let score = 0;
        if (normalizedInput.includes(normalizedOption) || 
            normalizedOption.includes(normalizedInput)) {
            score = 0.8;
        } else {
            const inputChars = normalizedInput.split('');
            const optionChars = normalizedOption.split('');
            const matches = inputChars.filter(char => optionChars.includes(char));
            score = matches.length / Math.max(inputChars.length, optionChars.length);
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = option;
        }
    }

    return bestScore > 0.5 ? bestMatch : null;
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
            const echoData = await parseEchoText(echoText);
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

let mainStatsData = null;
let substatsData = null;
let echoesData = null;

async function initializeData() {
    try {
        const [echoes, mainStats, subStats] = await Promise.all([
            loadEchoesData(),
            loadMainStatsData(),
            loadSubstatsData()
        ]);
        echoesData = echoes;
        mainStatsData = mainStats;
        substatsData = subStats;
    } catch (error) {
        console.error("Failed to initialize data:", error);
    }
}

initializeData();

async function loadEchoesData() {
    try {
        const response = await fetch('Data/Echoes.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading echoes data:', error);
        return null;
    }
}

async function loadMainStatsData() {
    try {
        const response = await fetch('Data/Mainstat.json');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading main stats data:', error);
        return null;
    }
}

async function loadSubstatsData() {
    try {
        const response = await fetch('Data/Substats.json');
        const data = await response.json();
        return data.subStats;
    } catch (error) {
        console.error('Error loading substats data:', error);
        return null;
    }
}

async function parseEchoText(echoText) {
    try {
        if (!mainStatsData || !substatsData) {
            console.error("Data not initialized");
            return null;
        }
        const rawNameMatch = echoText.substring(0, echoText.indexOf('COST')).trim();
        let name = rawNameMatch
            .replace(/^[^a-zA-Z]+/, '')
            .replace(/©/g, '')
            .replace(/[()]/g, '')
            .replace(/^Phantom:\s*/, '')
            .replace(/\s+/g, ' ')
            .replace(/[^a-zA-Z0-9\s-]+$/, '')
            .trim();
        
        if (name && echoesData) {
            const firstWord = name.includes('-') ? 
                name.split(/\s+/).slice(0, 2).join(' ') :
                name.split(' ')[0];
                
            const possibleMatches = echoesData.filter(echo => 
                echo.name.startsWith(firstWord)
            );
            
            if (possibleMatches.length === 1) {
                name = possibleMatches[0].name;
            } else if (possibleMatches.length > 1) {
                const bestMatch = findClosestMatch(name, possibleMatches.map(e => e.name));
                if (bestMatch) {
                    name = bestMatch;
                }
            }
        }

        const costMatch = echoText.match(/COST\s*(\d+)/);
        const cost = costMatch ? parseInt(costMatch[1]) : null;
        
        const levelMatch = echoText.match(/\+(\d+)/);
        const level = levelMatch ? parseInt(levelMatch[1]) : null;
        
        const relevantText = levelMatch ? 
            echoText.substring(levelMatch.index + levelMatch[0].length) : 
            echoText;
        
        const mainStatType = parseMainStat(relevantText, cost);
        const stats = parseSubstats(echoText);

        return {
            type: 'echo',
            name: name,
            cost: cost,
            level: level,
            mainStat: mainStatType,
            stats: stats
        };
    } catch (error) {
        console.error("Error parsing echo text:", error);
        return null;
    }
}

function parseMainStat(relevantText, cost) {
    const validMainStatsForCost = cost ? Object.keys(mainStatsData[`${cost}cost`].mainStats) : [];
    
    const mainStatSection = relevantText
        .substring(0, relevantText.indexOf('-') === -1 ? 
            relevantText.length : 
            relevantText.indexOf('-'))
        .replace(/[&|:~.¥]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const mainStatText = mainStatSection.match(/(\S+\s*DMG(?:\s*Bonus)?|\S+)\s+\d+\.?\d*%/i)?.[1];
    if (mainStatText) {
        const closestMatch = findClosestMatch(mainStatText, validMainStatsForCost);
        if (closestMatch) {
            return closestMatch;
        }
    }

    const mainStatPatterns = [
        {
            pattern: /(?:Fusion|Aero|Glacio|Electro|Havoc|Spectro)\s*DMG(?:\s*Bonus)?/i,
            normalize: (match) => `${match[0].match(/(Fusion|Aero|Glacio|Electro|Havoc|Spectro)/i)[0]} DMG`
        },
        {
            pattern: /(?:Crit\.|Crit)\s*(?:DMG|Rate)/i,
            normalize: (match) => match[0].toLowerCase().includes('dmg') ? 'Crit DMG' : 'Crit Rate'
        },
        {
            pattern: /(?:ATK|DEF|HP)/i,
            normalize: (match) => `${match[0].trim()}%`
        },
        {
            pattern: /Energy\s*Regen/i,
            normalize: () => 'Energy Regen'
        },
        {
            pattern: /Healing\s*(?:Bonus)?/i,
            normalize: () => 'Healing Bonus'
        }
    ];

    for (const {pattern, normalize} of mainStatPatterns) {
        const match = mainStatSection.match(pattern);
        if (match) {
            const statType = normalize(match);
            if (validMainStatsForCost.includes(statType)) {
                return statType;
            }
        }
    }
    
    return null;
}

function parseSubstats(echoText) {
    const stats = [];
    const validSubStats = Object.keys(substatsData);
    const substatMatches = echoText.matchAll(/[-~]\s*([^-~\n]+?)(?=[-~]|Echo|$)/g);

    for (const match of substatMatches) {
        const substatText = match[1].trim();
        const valueMatch = substatText.match(/([\d.]+)%?/);
        
        if (valueMatch) {
            const statValue = parseFloat(valueMatch[0]);
            const statText = substatText
                .replace(/([\d.]+)%?/, '')
                .replace('Resonance', '')
                .replace(/[:;.]/g, '')
                .trim();
            
            const statType = findClosestMatch(statText, validSubStats);
            
            if (statType) {
                const validValues = substatsData[statType];
                const closestValue = validValues.reduce((prev, curr) => 
                    Math.abs(curr - statValue) < Math.abs(prev - statValue) ? curr : prev
                );

                stats.push({
                    type: statType,
                    value: closestValue,
                    isPercentage: substatText.includes('%')
                });
            }
        }
    }

    return stats;
}

const processRegionsInOrder = async (regions, imageURL, dimensions) => {
    const sortedRegions = Object.entries(regions)
        .sort((a, b) => REGION_PRIORITIES[a[0]] - REGION_PRIORITIES[b[0]]);
    
    for (const [regionName, percentages] of sortedRegions) {
        // Process each region
        // Stop if we find a valid result
    }
};