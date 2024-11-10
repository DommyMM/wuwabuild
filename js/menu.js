async function loadEchoData() {
    try {
        const response = await fetch('Data/Echoes.json');
        echoData = await response.json();
    } catch (error) {
        console.error('Error loading echo data:', error);
    }
}

function getBaseStats(character) {
    return [
        { icon: 'HP', name: 'HP', value: character.HP },
        { icon: 'ATK', name: 'ATK', value: character.ATK },
        { icon: 'DEF', name: 'DEF', value: character.DEF },
        { icon: 'Crit Rate', name: 'Crit Rate', value: `${calculateCritRate(5.0, character.Bonus1, character.Bonus2).toFixed(1)}%` },
        { icon: 'Crit DMG', name: 'Crit DMG', value: `${calculateCritDMG(150.0, character.Bonus1, character.Bonus2).toFixed(1)}%` },        
        { icon: 'ER', name: 'Energy Recharge', value: `${calculateER(character.ER).toFixed(1)}%` }
    ];
}

function getBonusStat(character) {
    if (character.Bonus1 === 'Healing') {
        return { icon: 'Healing', name: 'Healing Bonus', value: '0.0%' };
    }
    return { 
        icon: character.element, 
        name: `${character.element} DMG Bonus`, 
        value: `${calculateElementalDMG(character.element, character.Bonus1, character.Bonus2).toFixed(1)}%` 
    };
}

function checkAdditionalStats(panel, statsData) {
    const additionalStats = new Set();
    const specialStats = {
        'Basic Attack': 'Basic Attack DMG Bonus',
        'Heavy Attack': 'Heavy Attack DMG Bonus',
        'Skill': 'Resonance Skill DMG Bonus',
        'Liberation': 'Resonance Liberation Bonus'
    };

    const mainStatSelect = panel.querySelector('.main-stat .stat-select');
    if (mainStatSelect) {
        const mainStatValue = mainStatSelect.value;
        if (specialStats[mainStatValue]) {
            const specialStatName = specialStats[mainStatValue];
            if (!statsData.some(stat => stat.name === specialStatName)) {
                additionalStats.add(specialStatName);
            }
        } else if (mainStatValue.endsWith('DMG')) {
            const dmgBonusName = mainStatValue + ' Bonus';
            if (!statsData.some(stat => stat.name === dmgBonusName)) {
                additionalStats.add(dmgBonusName);
            }
        }
    }

    const subStatSelects = Array.from(panel.querySelectorAll('.sub-stat .stat-select'));
    subStatSelects.forEach(select => {
        if (select.value && specialStats[select.value]) {
            const specialStatName = specialStats[select.value];
            if (!statsData.some(stat => stat.name === specialStatName)) {
                additionalStats.add(specialStatName);
            }
        }
    });

    return [...additionalStats];
}

async function generateStatsData() {
    const characterLabel = document.querySelector('#selectedCharacterLabel span');
    const characterName = characterLabel.textContent;
    
    const response = await fetch('Data/Characters.json');
    const characters = await response.json();
    const character = characters.find(c => c.name === characterName);

    if (!character) return [];

    const statsData = getBaseStats(character);
    statsData.push(getBonusStat(character));

    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    panels.forEach(panel => {
        const panelStats = checkAdditionalStats(panel, statsData);
        panelStats.forEach(stat => statsData.push(createAdditionalStatData(stat)));
    });

    return statsData;
}

function createStatIcon(iconName) {
    const statIcon = document.createElement('img');
    statIcon.src = `images/Stats/${iconName}.png`;
    statIcon.className = 'stat-icon';
    return statIcon;
}

function createStatLeft(stat) {
    const statLeft = document.createElement('div');
    statLeft.className = 'stat-left';

    statLeft.appendChild(createStatIcon(stat.icon));

    const statName = document.createElement('span');
    statName.className = 'stat-name';
    statName.textContent = stat.name;

    if (statName.textContent.length <= 18) {
    } else if (statName.textContent.length <= 21) {
        statName.classList.add('short');
    } else if (statName.textContent.length <= 24) {
        statName.classList.add('medium');
    } else {
        statName.classList.add('long');
    }

    statLeft.appendChild(statName);
    return statLeft;
}

function createStatValue(value) {
    const statValue = document.createElement('span');
    statValue.className = 'stat-number';
    statValue.textContent = value;
    return statValue;
}

function createStatRow(stat) {
    const statRow = document.createElement('div');
    statRow.className = 'stat-row';
    
    statRow.appendChild(createStatLeft(stat));
    statRow.appendChild(createStatValue(stat.value));
    
    return statRow;
}

async function createStatsGridContainer() {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    const statsData = await generateStatsData();
    
    statsData.forEach(stat => {
        statsContainer.appendChild(createStatRow(stat));
    });
    
    return statsContainer;
}

function countUniqueSets(panels) {
    const elementCounts = {};
    const usedEchoes = new Set();
 
    panels.forEach(panel => {
        const element = panel.querySelector('.set-name-display')?.dataset.element;
        const echoLabel = panel.querySelector('#selectedEchoLabel');
        const echoName = echoLabel?.textContent;
        
        if (element && echoName && !echoName.startsWith('Echo ') && !usedEchoes.has(echoName)) {
            elementCounts[element] = (elementCounts[element] || 0) + 1;
            usedEchoes.add(echoName);
        }
    });
 
    return Object.entries(elementCounts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1]);
 }
 
 function createSetRow(element, count) {
    const setRow = document.createElement('div');
    setRow.className = 'set-row';
 
    const setIconContainer = document.createElement('div');
    setIconContainer.className = 'set-icon-container';
    setIconContainer.classList.add(`set-${element.toLowerCase()}`);
 
    const setIcon = document.createElement('img');
    setIcon.src = `images/Sets/${element}.png`;
    setIcon.className = 'set-icon';
    
    const setText = document.createElement('span');
    setText.className = 'set-name';
    setText.textContent = ELEMENT_SETS[element];
 
    if (setText.textContent.length > 15) {
        setText.style.fontSize = '32px';
    }
 
    const setCount = document.createElement('span');
    setCount.className = 'set-count';
    setCount.textContent = count >= 5 ? '5' : '2';
 
    setIconContainer.appendChild(setIcon);
    setRow.appendChild(setIconContainer);
    setRow.appendChild(setText);
    setRow.appendChild(setCount);
 
    return setRow;
 }
 
 function createSetDisplay() {
    const setContainer = document.createElement('div');
    setContainer.className = 'set-container';
    setContainer.style.display = 'none';
 
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    const qualifyingSets = countUniqueSets(panels);
 
    if (qualifyingSets.length > 0) {
        setContainer.style.display = 'flex';
        qualifyingSets.forEach(([element, count]) => {
            setContainer.appendChild(createSetRow(element, count));
        });
    }
 
    return setContainer;
 }

 async function createStatsMenuSection() {
    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';
    
    const statsGrid = await createStatsGridContainer();
    statsSection.appendChild(statsGrid);
    statsSection.appendChild(createSetDisplay());
    
    return statsSection;
}

async function checkEchoCosts() {
    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    if (!echoData) await loadEchoData();
    
    let totalCost = 0;
    panels.forEach(panel => {
        const echoLabel = panel.querySelector('#selectedEchoLabel');
        const echoName = echoLabel?.textContent;
        
        if (echoName && !echoName.startsWith('Echo ')) {
            const cost = getEchoCost(echoName);
            if (cost) totalCost += cost;
        }
    });

    if (totalCost > 12) {
        showCostWarning(totalCost);
        return false;
    }
    return true;
}

function getEchoCost(echoName) {
    if (!echoData) return null;
    const echo = echoData.find(e => e.name === echoName);
    return echo ? echo.cost : null;
}

function showCostWarning(totalCost) {
    const generateBtn = document.getElementById('generateDownload');
    const popupText = document.createElement('span');
    popupText.className = 'popuptext';
    popupText.textContent = `Echo Cost (${totalCost}) exceeds maximum of 12!`;
    
    generateBtn.appendChild(popupText);
    
    void popupText.offsetWidth;
    popupText.classList.add('show');
    
    setTimeout(() => {
        popupText.classList.remove('show');
        setTimeout(() => popupText.remove(), 1000);
    }, 3000);
}