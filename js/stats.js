let statsData = null;
let statValues = {};
let statUpdates = {};

async function loadStatsDefinition() {
    try {
        const response = await fetch('Data/Stats.json');
        statsData = await response.json();
        
        statsData.stats.forEach(stat => {
            statValues[stat] = 0;
        });
    } catch (error) {
        console.error('Error loading stats definition:', error);
    }
}

function initializeAllStats() {
    if (!statsData) return;    
    statsData.stats.forEach(stat => {
        statValues[stat] = 0;
    });
}

async function initializeBaseStats(character) {
    const levelElement = document.querySelector('.build-character-level');
    let characterLevel = 1;

    if (levelElement) {
        const levelText = levelElement.textContent;
        const levelMatch = levelText.match(/Lv\.(\d+)/);
        if (levelMatch) {
            characterLevel = parseInt(levelMatch[1], 10);
        }
    }
    statValues['HP'] = await statScaling(character, characterLevel, 'HP');
    statValues['ATK'] = await statScaling(character, characterLevel, 'ATK') + calculateWeaponAttack();
    statValues['DEF'] = await statScaling(character, characterLevel, 'DEF');
    statUpdates['baseHP'] = statValues['HP'];
    statUpdates['baseATK'] = statValues['ATK'];
    statUpdates['baseDEF'] = statValues['DEF'];

    const echoStats = sumEchoDefaultStats();
    hp_flat = sumMainstatValue('HP') + sumSubstatsValue('HP') + echoStats.hp;
    hp_percent = sumMainstatValue('HP%') + sumSubstatsValue('HP%');
    atk_flat = sumMainstatValue('ATK') + sumSubstatsValue('ATK') + echoStats.atk;
    atk_percent = sumMainstatValue('ATK%') + sumSubstatsValue('ATK%');
    def_flat = sumMainstatValue('DEF') + sumSubstatsValue('DEF');
    def_percent = sumMainstatValue('DEF%') + sumSubstatsValue('DEF%');

    ['Crit Rate', 'Crit DMG', 'Energy Regen'].forEach(stat => {
        statUpdates[stat] = sumMainstatValue(stat) + sumSubstatsValue(stat);
        statValues[stat] = (stat === 'Crit Rate' ? 5.0 : 
                          stat === 'Crit DMG' ? 150.0 :  
                          character.ER) + statUpdates[stat];
    });

    ['Aero', 'Glacio', 'Fusion', 'Electro', 'Havoc', 'Spectro'].forEach(element => {
        statValues[`${element} DMG`] = sumMainstatValue(`${element} DMG`);
        statUpdates[`${element} DMG`] = statValues[`${element} DMG`];
    });
    
    ['Basic Attack', 'Heavy Attack', 'Skill', 'Liberation'].forEach(attack => {
        statValues[attack] = sumSubstatsValue(attack);
        statUpdates[attack] = statValues[attack];
    });

    getWeaponStats();
    setBonus(); 
    forteBonus(); 

    ['HP', 'ATK', 'DEF'].forEach(stat => {
        const flat = eval(`${stat.toLowerCase()}_flat`);
        const percent = eval(`${stat.toLowerCase()}_percent`);
        statValues[stat] = statValues[stat] * (1 + percent/100) + flat;
        statUpdates[stat] = statValues[stat] - statUpdates[`base${stat}`];
    });
}

function statScaling(character, characterLevel, statName) {
    return fetch('Data/CharacterCurve.json')
        .then(response => response.json())
        .then(curveData => {
            const curve = curveData.CHARACTER_CURVE[characterLevel.toString()];
            if (!curve) {
                console.error(`No scaling data found for level ${characterLevel}`);
                return NaN;
            }

            let scaledValue;
            if (statName === 'HP') {
                scaledValue = character.HP * (curve.HP / 10000);
            } else if (statName === 'ATK') {
                scaledValue = character.ATK * (curve.ATK / 10000);
            } else if (statName === 'DEF') {
                scaledValue = character.DEF * (curve.DEF / 10000);
            }
            return scaledValue;
        })
        .catch(error => {
            console.error('Error fetching character curve data:', error);
            return NaN;
        });
}

function formatStatValue(stat, value) {
    const flatStats = ['HP', 'ATK', 'DEF'];
    return flatStats.includes(stat) ? Math.round(value).toString() : `${value.toFixed(1)}%`;
}

function sumMainstatValue(statName) {
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    let total = 0;
    
    panels.forEach(panel => {
        const mainStatSelect = panel.querySelector('.main-stat .stat-select');
        const mainStatValue = panel.querySelector('.main-stat-value');
        if (mainStatSelect && mainStatValue && mainStatSelect.value === statName) {
            total += parseFloat(mainStatValue.textContent) || 0;
        }
    });
    
    return total;
}

function sumSubstatsValue(statName) {
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    let total = 0;
    
    panels.forEach(panel => {
        const substatSelects = Array.from(panel.querySelectorAll('.sub-stat .stat-select'));
        const substatValues = Array.from(panel.querySelectorAll('.sub-stat .stat-value'));

        substatSelects.forEach((select, index) => {
            if (select.value === statName) {
                const value = parseFloat(substatValues[index].value) || 0;
                total += value;
            }
        });
    });

    return total; 
}

function sumEchoDefaultStats() {
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    let totalATK = 0;
    let totalHP = 0;
    
    panels.forEach(panel => {
        const echoLabel = panel.querySelector('#selectedEchoLabel');
        const echoLevel = panel.querySelector('.echo-level-value');
        const echoName = echoLabel?.textContent;
        
        if (echoName && !echoName.startsWith('Echo ') && echoLevel) {
            const cost = getEchoCost(echoName);
            const level = parseInt(echoLevel.textContent);
            
            if (cost && !isNaN(level)) {
                const defaultStat = calculateEchoDefaultStat(cost, level);
                if (cost === 4 || cost === 3) {
                    totalATK += defaultStat;
                } else if (cost === 1) {
                    totalHP += defaultStat;
                }
            }
        }
    });

    return { atk: totalATK, hp: totalHP };
}

function calculateEchoDefaultStat(cost, level) {
    const normalLevels = Math.floor(level - Math.floor(level/5));
    const bonusLevels = Math.floor(level/5);
    
    switch(cost) {
        case 4:
            return 30 + (normalLevels * 4.5) + (bonusLevels * 6);
        case 3:
            return 20 + (normalLevels * 3) + (bonusLevels * 4);
        case 1:
            if (level === 0) return 456;
            return 456 + 72 + ((level - 1) * 73);
    }
}

function getWeaponStats() {
    const mainStatElement = document.querySelector('.weapon-stat.weapon-main-stat');
    if (mainStatElement) {
        const mainStatValue = parseFloat(mainStatElement.textContent.trim());
        const mainStatType = mainStatElement.getAttribute('data-main');
        
        if (mainStatType) {
            if (mainStatType === 'ER') {
                statValues['Energy Regen'] = (statValues['Energy Regen']) + mainStatValue;
                statUpdates['Energy Regen'] = statValues['Energy Regen'] - 100;
            } else if (mainStatType === 'Crit Rate') {
                statValues[mainStatType] = (statValues[mainStatType] || 5) + mainStatValue;
                statUpdates[mainStatType] = statValues[mainStatType] - 5;
            } else if (mainStatType === 'Crit DMG') {
                statValues[mainStatType] = (statValues[mainStatType]) + mainStatValue;
                statUpdates[mainStatType] = statValues[mainStatType] - 150;
            } else {
                statValues[mainStatType] = (statValues[mainStatType]) + mainStatValue;
                statUpdates[mainStatType] = statValues[mainStatType];
            }
        }

        const rankElement = document.querySelector('.weapon-stat.weapon-rank');
        const rank = parseInt(rankElement.textContent.replace('R', '')) || 1;
        const rankMultiplier = 1 + ((rank - 1) * 0.25);
 
        const passiveType = mainStatElement.getAttribute('data-passive');
        const passiveValue = parseFloat(mainStatElement.getAttribute('data-passive-value')) * rankMultiplier;
        
        if (passiveType && passiveValue) {
            if (passiveType === 'Attribute') {
                const characterElement = document.querySelector('.char-sig').getAttribute('data-element');
                statValues[`${characterElement} DMG`] = (statValues[`${characterElement} DMG`] || 0) + passiveValue;
            } else if (passiveType === 'ATK%') {
                atk_percent += passiveValue;
            } else if (passiveType === 'HP%') {
                hp_percent += passiveValue;
            } else if (passiveType === 'DEF%') {
                def_percent += passiveValue;
            } else {
                statValues[passiveType] = (statValues[passiveType] || 0) + passiveValue;
            }
        }

        const passive2Type = mainStatElement.getAttribute('data-passive2');
        const passive2Value = parseFloat(mainStatElement.getAttribute('data-passive2-value')) * rankMultiplier;
        if (passive2Type && passive2Value) {
            statValues[passive2Type] = (statValues[passive2Type] || 0) + passive2Value;
        }
    }
}

 function calculateWeaponAttack() {
    const attackElement = document.querySelector('.weapon-stat.weapon-attack');
    if (attackElement) {
        const Attack = parseFloat(attackElement.getAttribute('data-precise'));
        return Attack;
    }
    return 0;
}

const SET_TO_STAT_MAPPING = {
    'Sierra Gale': 'Aero DMG',
    'Moonlit Clouds': 'Energy Regen',
    'Void Thunder': 'Electro DMG',
    'Celestial Light': 'Spectro DMG',
    'Freezing Frost': 'Glacio DMG',
    'Lingering Tunes': 'ATK%',
    'Molten Rift': 'Fusion DMG',
    'Sun-sinking Eclipse': 'Havoc DMG',
    'Rejuvenating Glow': 'Healing Bonus'
};

function setBonus() {
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    const elementCounts = {};
    const usedEchoes = new Set();

    panels.forEach(panel => {
        const setElement = panel.querySelector('.set-name-display')?.dataset.element;
        const echoLabel = panel.querySelector('#selectedEchoLabel');
        const echoName = echoLabel?.textContent;

        if (setElement && echoName && !echoName.startsWith('Echo ') && !usedEchoes.has(echoName)) {
            elementCounts[setElement] = (elementCounts[setElement] || 0) + 1;
            usedEchoes.add(echoName);
        }
    });

        for (const element in elementCounts) {
        if (elementCounts[element] >= 2) {
            const setName = ELEMENT_SETS[element];
            const statToUpdate = SET_TO_STAT_MAPPING[setName];
            if (setName === 'Lingering Tunes') {
                atk_percent += 10;
            } else if (statValues.hasOwnProperty(statToUpdate)) {
                statValues[statToUpdate] = (statValues[statToUpdate] || 0) + 10;
                if (statToUpdate.endsWith('DMG')) {
                    statUpdates[statToUpdate] = statValues[statToUpdate];
                }
            }
        }
    }
}

function getActiveForteNodes(treeNumber) {
    const topNode = document.querySelector(`.glowing-node[data-tree="tree${treeNumber}"][data-skill="tree${treeNumber}-top"]`);
    const middleNode = document.querySelector(`.glowing-node[data-tree="tree${treeNumber}"][data-skill="tree${treeNumber}-middle"]`);
    
    return {
        topActive: topNode?.classList.contains('active') || false,
        middleActive: middleNode?.classList.contains('active') || false
    };
}

function forteBonus() {
    const character = characters.find(c => c.name === document.querySelector('#selectedCharacterLabel span').textContent);
    if (!character) return;

    let bonus1Total = 0;
    let bonus2Total = 0;
    
    let baseValue1;
    switch(character.Bonus1) {
        case 'Crit Rate': baseValue1 = 4.0; break;
        case 'Crit DMG': baseValue1 = 8.0; break;
        default: baseValue1 = 6.0; 
    }

    let baseValue2 = character.Bonus2 === 'DEF' ? 7.6 : 6.0;

    [1, 2, 4, 5].forEach(treeNum => {
        const { topActive, middleActive } = getActiveForteNodes(treeNum);
        if ([1, 5].includes(treeNum)) {
            if (topActive) bonus1Total += baseValue1 * 0.7;
            if (middleActive) bonus1Total += baseValue1 * 0.3;
        } else { 
            if (topActive) bonus2Total += baseValue2 * 0.7;
            if (middleActive) bonus2Total += baseValue2 * 0.3;
        }
    });

    const bonus1Type = character.Bonus1;
    if (bonus1Type === 'Crit Rate') {
        statValues['Crit Rate'] += bonus1Total;
    } else if (bonus1Type === 'Crit DMG') {
        statValues['Crit DMG'] += bonus1Total;
    } else if (bonus1Type === 'Healing') {
        statValues['Healing Bonus'] += bonus1Total;
    } else if (['Aero', 'Glacio', 'Fusion', 'Electro', 'Havoc', 'Spectro'].includes(bonus1Type)) {
        statValues[`${bonus1Type} DMG`] += bonus1Total;
    }

    switch(character.Bonus2) {
        case 'ATK': atk_percent += bonus2Total; break;
        case 'HP': hp_percent += bonus2Total; break;
        case 'DEF': def_percent += bonus2Total; break;
    }
}