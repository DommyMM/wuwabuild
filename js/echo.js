function getStatIconName(statName) {
    switch(statName) {
        case 'HP':
        case 'HP%':
            return 'HP';
        
        case 'ATK':
        case 'ATK%':
            return 'ATK';
        
        case 'DEF':
        case 'DEF%':
            return 'DEF';
        
        case 'Crit Rate':
            return 'Crit Rate';
        case 'Crit Damage':
        case 'Crit DMG':
            return 'Crit DMG';
        
        case 'Basic Attack':
            return 'Basic';
        case 'Heavy Attack':
            return 'Heavy';
        case 'Skill':
            return 'Skill';
        
        case 'Liberation':
            return 'Liberation';
        case 'Energy Regen':
            return 'ER';
        
        case 'Aero DMG':
            return 'Aero';
        case 'Glacio DMG':
            return 'Glacio';
        case 'Fusion DMG':
            return 'Fusion';
        case 'Electro DMG':
            return 'Electro';
        case 'Havoc DMG':
            return 'Havoc';
        case 'Spectro DMG':
            return 'Spectro';
        case 'Healing Bonus':
            return 'Healing';
            
        default:
            return 'ATK';
    }
}

function createEchoIcon(echoName) {
    const selectedEchoImg = document.createElement('img');
    selectedEchoImg.src = `images/Echoes/${echoName}.png`;
    selectedEchoImg.className = 'echo-display-icon';
    return selectedEchoImg;
}

function createLevelIndicator(levelValue) {
    const levelIndicator = document.createElement('div');
    levelIndicator.className = 'echo-level-indicator';
    levelIndicator.textContent = `+${levelValue}`;
    return levelIndicator;
}

function createMainStatDisplay(mainStatSelect) {
    const mainStatName = mainStatSelect.value;
    const mainStatValue = mainStatSelect.closest('.echo-panel').querySelector('.main-stat-value').textContent;
    
    const container = document.createElement('div');
    
    const mainStatIcon = document.createElement('img');
    mainStatIcon.src = `images/Stats/${getStatIconName(mainStatName)}.png`;
    mainStatIcon.className = 'main-stat-icon';
    container.appendChild(mainStatIcon);
    
    const mainStatDisplay = document.createElement('span');
    mainStatDisplay.className = 'main-stat-display';
    mainStatDisplay.textContent = mainStatValue;
    container.appendChild(mainStatDisplay);
    
    return container;
}

function createEchoLeft(panel, index) {
    const echoLeft = document.createElement('div');
    echoLeft.className = 'echo-left';
    
    if (!panel) return echoLeft;

    const echoName = panel.querySelector('#selectedEchoLabel').textContent;
    if (echoName === `Echo ${index}`) return echoLeft;

    echoLeft.appendChild(createEchoIcon(echoName));
    
    const levelValue = panel.querySelector('.echo-level-value').textContent;
    echoLeft.appendChild(createLevelIndicator(levelValue));

    const mainStatSelect = panel.querySelector('.main-stat .stat-select');
    if (mainStatSelect.selectedIndex > 0) {
        const mainStatElements = createMainStatDisplay(mainStatSelect);
        echoLeft.appendChild(mainStatElements);
    }

    return echoLeft;
}

function createEchoDivider() {
    const echoDivider = document.createElement('div');
    echoDivider.className = 'echo-divider';
    return echoDivider;
}

function createSubstatDisplay(substatSelect, substatValue, alignment) {
    if (substatSelect.selectedIndex === 0) return null;
    
    const substatContainer = document.createElement('div');
    substatContainer.className = `substat-container ${alignment}-align`;
    
    const statIcon = document.createElement('img');
    statIcon.src = `images/Stats/${getStatIconName(substatSelect.value)}.png`;
    statIcon.className = 'substat-icon';
    substatContainer.appendChild(statIcon);
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'substat-value';
    
    const noPercentageStats = ["HP", "ATK", "DEF"];
    const isPercentage = !noPercentageStats.includes(substatSelect.value);
    
    valueDisplay.textContent = isPercentage ? `${substatValue.value}%` : substatValue.value;
    substatContainer.appendChild(valueDisplay);
    
    return substatContainer;
}


function createSubstatRow(substats, startIndex, alignment = 'space-between') {
    const substatRow = document.createElement('div');
    substatRow.className = 'substat-row';
    substatRow.style.justifyContent = alignment;
    
    if (startIndex < 4) {
        const leftStat = createSubstatDisplay(
            substats.selects[startIndex], 
            substats.values[startIndex], 
            'left'
        );
        const rightStat = createSubstatDisplay(
            substats.selects[startIndex + 1], 
            substats.values[startIndex + 1], 
            'right'
        );
        
        if (leftStat) substatRow.appendChild(leftStat);
        if (rightStat) substatRow.appendChild(rightStat);
    } 
    else {
        const centerStat = createSubstatDisplay(
            substats.selects[4], 
            substats.values[4], 
            'center'
        );
        if (centerStat) substatRow.appendChild(centerStat);
    }
    
    return substatRow;
}

function createEchoRight(panel) {
    const echoRight = document.createElement('div');
    echoRight.className = 'echo-right';
    
    if (!panel) return echoRight;

    const substats = {
        selects: Array.from(panel.querySelectorAll('.sub-stat .stat-select')),
        values: Array.from(panel.querySelectorAll('.sub-stat .stat-value'))
    };

    echoRight.appendChild(createSubstatRow(substats, 0));
    echoRight.appendChild(createSubstatRow(substats, 2));
    echoRight.appendChild(createSubstatRow(substats, 4, 'center'));
    
    return echoRight;
}

function createEchoRow(index) {
    const echoRow = document.createElement('div');
    echoRow.className = 'echo-row';

    const panel = document.getElementById(`panel${index + 1}`);

    const setNameDisplay = panel.querySelector('.set-name-display');
    const element = setNameDisplay?.dataset.element || 'Default';  

    echoRow.classList.add(`set-${element.toLowerCase()}`);

    echoRow.appendChild(createEchoLeft(panel, index + 1));
    echoRow.appendChild(createEchoDivider());
    echoRow.appendChild(createEchoRight(panel));
    
    return echoRow;
}


function createEchoDisplay() {
    const echoDisplay = document.createElement('div');
    echoDisplay.className = 'echo-display';
    
    for (let i = 0; i < 5; i++) {
        echoDisplay.appendChild(createEchoRow(i));
    }
    
    return echoDisplay;
}