// menu.js
const statsData = [
    { icon: 'HP', name: 'HP', value: '19,218' },
    { icon: 'ATK', name: 'ATK', value: '2,244' },
    { icon: 'DEF', name: 'DEF', value: '908' },
    { icon: 'Crit Rate', name: 'Crit Rate', value: '73.8%' },
    { icon: 'Crit DMG', name: 'CRIT DMG', value: '188.4%' },
    { icon: 'ER', name: 'ER', value: '277.1%' }
];

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

function createStatsGridContainer() {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'stats-container';
    
    statsData.forEach(stat => {
        statsContainer.appendChild(createStatRow(stat));
    });
    
    return statsContainer;
}

function createSetDisplay() {
    const setContainer = document.createElement('div');
    setContainer.className = 'set-container';
    setContainer.style.display = 'none'; 

    const setIconContainer = document.createElement('div');
    setIconContainer.className = 'set-icon-container';

    const panels = Array.from(document.querySelectorAll('.echo-panel'));
    const elements = panels.map(panel => panel.querySelector('.set-name-display')?.dataset.element);

    const allMatch = elements.every(element => element && element === elements[0]);

    if (allMatch) {
        const selectedElement = elements[0];  

        setIconContainer.classList.add(`set-${selectedElement.toLowerCase()}`);
        setContainer.style.display = 'flex'; 

        const setIcon = document.createElement('img');
        setIcon.src = `images/Sets/${selectedElement}.png`;
        setIcon.className = 'set-icon';
        
        const setText = document.createElement('span');
        setText.className = 'set-name';
        setText.textContent = ELEMENT_SETS[selectedElement] || 'Lingering Tunes';

        setIconContainer.appendChild(setIcon);
        setContainer.appendChild(setIconContainer);
        setContainer.appendChild(setText);
    }

    return setContainer;
}


function createStatsMenuSection() {
    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';
    
    statsSection.appendChild(createStatsGridContainer());
    statsSection.appendChild(createSetDisplay());
    
    return statsSection;
}