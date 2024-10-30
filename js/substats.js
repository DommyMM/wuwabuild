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

function createStatsContainer(panel) {
    const statsTab = document.createElement('div');
    statsTab.className = 'stats-tab';
    panel.appendChild(statsTab); 
    return statsTab;
}

function createStatSlot(statType, labelText, substatsData) {
    const statSlot = document.createElement('div');
    statSlot.className = `stat-slot ${statType}`;
    
    const select = document.createElement('select');
    select.className = 'stat-select';
    
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = labelText;
    placeholderOption.selected = true;
    placeholderOption.disabled = true;
    select.appendChild(placeholderOption);

    Object.keys(substatsData).forEach((statName) => {
        const option = document.createElement('option');
        option.value = statName;
        option.textContent = statName;
        select.appendChild(option);
    });

    const valueDropdown = document.createElement('select');
    valueDropdown.className = 'stat-value';
    valueDropdown.disabled = true; 

    const defaultValueOption = document.createElement('option');
    defaultValueOption.textContent = 'Select';
    valueDropdown.appendChild(defaultValueOption);

    select.addEventListener('change', (event) => {
        const selectedStat = event.target.value;
        updateValueDropdown(valueDropdown, selectedStat, substatsData);
    });

    statSlot.appendChild(select);
    statSlot.appendChild(valueDropdown);

    return statSlot;
}

function updateValueDropdown(valueDropdown, selectedStat, substatsData) {
    valueDropdown.innerHTML = ''; 
    valueDropdown.disabled = !selectedStat; 

    if (!selectedStat) {
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Select';
        valueDropdown.appendChild(defaultOption);
        return;
    }

    const values = substatsData[selectedStat];
    values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        if (selectedStat.includes('%') || 
            ['Crit Rate', 'Crit Damage', 'DEF%', 'ATK%', 'HP%', 'Liberation', 
             'Heavy Attack', 'Skill', 'Basic Attack', 'Energy Regen'].includes(selectedStat)) {
            option.textContent = `${value}%`;
        } else {
            option.textContent = value;
        }
        valueDropdown.appendChild(option);
    });
}

async function initializeStatsTab() {
    const substatsData = await loadSubstatsData();
    if (!substatsData) {
        console.error('Failed to load substats data');
        return;
    }

    for (let i = 1; i <= 5; i++) {
        const panel = document.getElementById(`panel${i}`);
        if (!panel) {
            console.error(`Panel ${i} not found`);
            continue;
        }

        const statsTab = createStatsContainer(panel);

        statsTab.appendChild(createStatSlot('main-stat', 'Main Stat', substatsData));
        
        for (let j = 1; j <= 5; j++) {
            statsTab.appendChild(createStatSlot('sub-stat', `Substat ${j}`, substatsData));
        }
    }
}