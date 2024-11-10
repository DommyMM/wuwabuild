const specialStats = {
    'Energy Regen': 'Energy Recharge',
    'Basic Attack': 'Basic Attack DMG Bonus',
    'Heavy Attack': 'Heavy Attack DMG Bonus',
    'Skill': 'Resonance Skill DMG Bonus',
    'Liberation': 'Resonance Liberation Bonus'
};

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
        const mainStatSelect = panel.querySelector('.main-stat .stat-select');
        const mainStatValue = panel.querySelector('.main-stat-value');
        if (mainStatSelect && mainStatValue && mainStatSelect.value === statName) {
            total += parseFloat(mainStatValue.textContent) || 0;
        }
        const substatSelects = Array.from(panel.querySelectorAll('.sub-stat .stat-select'));
        const substatValues = Array.from(panel.querySelectorAll('.sub-stat .stat-value'));
        
        substatSelects.forEach((select, index) => {
            if (select.value === statName) {
                total += parseFloat(substatValues[index].value) || 0;
            }
        });
    });
    
    return total;
}

function createAdditionalStatData(statName) {
    let iconName;
    if (statName.startsWith('Basic Attack')) {
        iconName = 'Basic';
    } else if (statName.startsWith('Heavy Attack')) {
        iconName = 'Heavy';
    } else if (statName.startsWith('Resonance Skill')) {
        iconName = 'Skill';
    } else if (statName.startsWith('Resonance Liberation')) {
        iconName = 'Liberation';
    } else if (statName.includes('DMG Bonus')) {
        iconName = statName.split(' ')[0];
    }

    const baseStatName = Object.entries(specialStats)
        .find(([_, full]) => full === statName)?.[0];

    const totalValue = baseStatName ? sumSubstatsValue(baseStatName) : 0;

    return {
        icon: iconName,
        name: statName,
        value: `${totalValue.toFixed(1)}%`
    };
}

function countSetBonus(element) {
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

    if (element === 'Attack') return 0;  //Skip Attack set for now
    return (elementCounts[element] >= 2) ? 10 : 0;
}

function getActiveForteNodes(treeNumber) {
    const topNode = document.querySelector(`.glowing-node[data-tree="tree${treeNumber}"][data-skill="tree${treeNumber}-top"]`);
    const middleNode = document.querySelector(`.glowing-node[data-tree="tree${treeNumber}"][data-skill="tree${treeNumber}-middle"]`);
    
    return {
        topActive: topNode?.classList.contains('active') || false,
        middleActive: middleNode?.classList.contains('active') || false
    };
 }

 function calculateForteBonus(statType, characterForte1, characterForte2) {
    if (statType !== characterForte1 && statType !== characterForte2) return 0;

    let baseValue;
    switch(statType) {
        case 'Crit Rate': baseValue = 4.0; break;
        case 'Crit DMG': baseValue = 8.0; break;
        case 'DEF%': baseValue = 7.6; break;
        default: baseValue = 6.0;
    }

    let total = 0;
    
    [1, 5].forEach(treeNum => {
        const { topActive, middleActive } = getActiveForteNodes(treeNum);
        if (topActive) total += baseValue * 0.7; 
        if (middleActive) total += baseValue * 0.3;
    });

    return total;
}


function calculateER(baseER) {
    const additionalER = sumSubstatsValue('Energy Regen');
    const setBonus = countSetBonus('ER');
    return baseER + additionalER + setBonus;
}

function calculateElementalDMG(element, characterForte1, characterForte2) {
    const statName = `${element} DMG`;
    const mainstatTotal = sumMainstatValue(statName);
    const setBonus = countSetBonus(element);
    const forteBonus = calculateForteBonus(statName, characterForte1, characterForte2);
    return mainstatTotal + setBonus + forteBonus;
}

 function calculateCritRate(baseCR, characterForte1, characterForte2) {
    const mainstatTotal = sumMainstatValue('Crit Rate');
    const forteBonus = calculateForteBonus('Crit Rate', characterForte1, characterForte2);
    return baseCR + mainstatTotal + forteBonus;
}

function calculateCritDMG(baseCD, characterForte1, characterForte2) {
    const mainstatTotal = sumMainstatValue('Crit DMG');
    const forteBonus = calculateForteBonus('Crit DMG', characterForte1, characterForte2);
    return baseCD + mainstatTotal + forteBonus;
}

function calculateATK(baseATK) {
    const forteBonus = calculateForteBonus('ATK%');
    return baseATK + forteBonus;
 }