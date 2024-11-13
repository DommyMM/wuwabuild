async function loadEchoData() {
    try {
        const response = await fetch('Data/Echoes.json');
        echoData = await response.json();
    } catch (error) {
        console.error('Error loading echo data:', error);
    }
}

function getDisplayName(stat) {
    switch(stat) {
        case 'Basic Attack':
            return 'Basic Attack DMG Bonus';
        case 'Heavy Attack':
            return 'Heavy Attack DMG Bonus';
        case 'Skill':
            return 'Resonance Skill DMG Bonus';
        case 'Liberation':
            return 'Resonance Liberation Bonus';
        default:
            return stat;
    }
}

async function generateStatsData() {
    const characterLabel = document.querySelector('#selectedCharacterLabel span');
    const characterName = characterLabel.textContent;
    
    const response = await fetch('Data/Characters.json');
    const characters = await response.json();
    const character = characters.find(c => c.name === characterName);

    if (!character) return [];

    if (!statsData) {
        await loadStatsDefinition(); 
    }

    initializeAllStats();
    await initializeBaseStats(character);

    return statsData.stats
        .filter(stat => statValues[stat] !== 0)
        .map(stat => ({
            icon: getStatIconName(stat),
            name: getDisplayName(stat),
            value: formatStatValue(stat, statValues[stat])
        }));
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

function isElementStat(statName) {
    const elements = ['Aero', 'Glacio', 'Fusion', 'Electro', 'Havoc', 'Spectro'];
    return elements.some(element => statName.includes(element));
}

function createStatRow(stat) {
    const statRow = document.createElement('div');
    statRow.className = 'stat-row';
    const statClass = stat.name.toLowerCase().replace(/\s+/g, '-').replace(/%/g, '').replace('-dmg', '').replace('-bonus', '').replace('resonance-', '');
    if (isElementStat(stat.name)) {
        statRow.classList.add(statClass);
    } else {
        statRow.classList.add(statClass);
    }
    
    statRow.appendChild(createStatLeft(stat));
    
    const valueContainer = document.createElement('div');
    valueContainer.className = 'stat-value-container';
    valueContainer.appendChild(createStatValue(stat.value));
    
    if (['HP', 'ATK', 'DEF'].includes(stat.name) && statUpdates[`base${stat.name}`]) {
        const breakdown = document.createElement('div');
        breakdown.className = 'stat-breakdown';
 
        const baseText = document.createElement('span');
        baseText.className = 'base-value';
        baseText.textContent = Math.round(statUpdates[`base${stat.name}`]);
 
        const updateText = document.createElement('span');
        updateText.className = 'update-value';
        updateText.textContent = ` + ${Math.round(statUpdates[stat.name])}`;
 
        breakdown.appendChild(baseText);
        breakdown.appendChild(updateText);
        valueContainer.appendChild(breakdown);
    }
    else if (statUpdates[stat.name]) {
        const breakdown = document.createElement('div');
        breakdown.className = 'stat-breakdown';
        
        const updateText = document.createElement('span');
        updateText.className = 'update-value';
        updateText.textContent = `+${statUpdates[stat.name].toFixed(1)}%`;
        
        breakdown.appendChild(updateText);
        valueContainer.appendChild(breakdown);
    }
    
    statRow.appendChild(valueContainer);
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
        .sort((a, b) => {
            const aIsFiveSet = a[1] >= 5;
            const bIsFiveSet = b[1] >= 5;
            if (aIsFiveSet !== bIsFiveSet) return bIsFiveSet ? 1 : -1;
            return b[1] - a[1];
        });
}
 
function createSetRow(element, count) {
    const setRow = document.createElement('div');
    const elementClass = element.toLowerCase().replace(/\s+/g, '-');
    setRow.className = `set-row ${elementClass}`;
 
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
            if (cost) {
                totalCost += Number(cost);
            }
        }
    });

    if (totalCost > 12) {
        showCostWarning(totalCost);
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
    popupText.textContent = `Warning: Echo Cost exceeds limit`;
    
    generateBtn.appendChild(popupText);
    
    void popupText.offsetWidth;
    popupText.classList.add('show');
    
    setTimeout(() => {
        popupText.classList.remove('show');
        setTimeout(() => popupText.remove(), 1000);
    }, 3000);
}
function setupHoverLinks() {
    document.addEventListener('mouseover', (event) => {
        const element = event.target.closest('.weapon-stat.weapon-attack, .weapon-stat.weapon-main-stat, .stat-row, .substat-container, .weapon-passive, .main-stat-display');
        if (!element) return;

        const statClass = Array.from(element.classList)
            .find(cls => !['stat-row', 'substat-container', 'weapon-stat', 'weapon-attack', 'weapon-main-stat', 'weapon-passive', 'main-stat-display', 'left-align', 'right-align', 'center-align'].includes(cls));

        if (statClass) {
            const selector = `.stat-row.${statClass}, ` + 
                            `.substat-container.${statClass}, ` + 
                            `.weapon-stat.weapon-attack.${statClass}, ` + 
                            `.weapon-stat.weapon-main-stat.${statClass}, ` +
                            `.weapon-passive.${statClass}, ` +
                            `.main-stat-display.${statClass}, ` +
                            `.set-row.${statClass}, ` +
                            `.simplified-node.active.${statClass}`;
            
            const relatedElements = document.querySelectorAll(selector);
            relatedElements.forEach(related => {
                related.classList.add('hover-highlight');
            });
        }
    });

    document.addEventListener('mouseout', (event) => {
        const element = event.target.closest('.weapon-stat.weapon-attack, .weapon-stat.weapon-main-stat, .stat-row, .substat-container, .weapon-passive, .main-stat-display');
        if (!element) return;

        const statClass = Array.from(element.classList)
            .find(cls => !['stat-row', 'substat-container', 'weapon-stat', 'weapon-attack', 'weapon-main-stat', 'weapon-passive', 'main-stat-display', 'left-align', 'right-align', 'center-align'].includes(cls));

        if (statClass) {
            const selector = `.stat-row.${statClass}, ` + 
                           `.substat-container.${statClass}, ` + 
                           `.weapon-stat.weapon-attack.${statClass}, ` + 
                           `.weapon-stat.weapon-main-stat.${statClass}, ` +
                           `.weapon-passive.${statClass}, ` +
                           `.main-stat-display.${statClass}, ` +
                           `.set-row.${statClass}, ` +
                            `.simplified-node.active.${statClass}`;
            
            const relatedElements = document.querySelectorAll(selector);
            relatedElements.forEach(related => {
                related.classList.remove('hover-highlight');
            });
        }
    });
}

setupHoverLinks();