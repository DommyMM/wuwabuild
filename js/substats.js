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

const panelSelections = new Map();

function createStatSlot(statType, labelText, substatsData, panel) {
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

    const panelId = panel.id;
    if (!panelSelections.has(panelId)) {
        panelSelections.set(panelId, new Set());
    }

    select.addEventListener('change', (event) => {
        const selectedStat = event.target.value;
        const panelSelectedOptions = panelSelections.get(panelId);

        const previousSelection = event.target.dataset.selected;
        if (previousSelection) {
            panelSelectedOptions.delete(previousSelection);
        }

        panelSelectedOptions.add(selectedStat);
        event.target.dataset.selected = selectedStat;

        updateValueDropdown(valueDropdown, selectedStat, substatsData);
        refreshPanelDropdowns(panel);
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

function refreshPanelDropdowns(panel) {
    const panelId = panel.id;
    const panelSelectedOptions = panelSelections.get(panelId);
    const allDropdowns = panel.querySelectorAll('.stat-select');
    
    allDropdowns.forEach(dropdown => {
        const currentSelection = dropdown.value;
        dropdown.querySelectorAll('option').forEach(option => {
            if (panelSelectedOptions.has(option.value) && option.value !== currentSelection) {
                option.disabled = true;
            } else {
                option.disabled = false;
            }
        });
    });
}

async function initializeStatsTab() {
    const substatsData = await loadSubstatsData();
    const mainStatsData = await loadMainStatsData();
    
    if (!substatsData || !mainStatsData) {
        console.error('Failed to load data');
        return;
    }

    for (let i = 1; i <= 5; i++) {
        const panel = document.getElementById(`panel${i}`);
        if (!panel) {
            console.error(`Panel ${i} not found`);
            continue;
        }

        const statsTab = createStatsContainer(panel);

        statsTab.appendChild(createMainStatSection(null, mainStatsData));
        
        for (let j = 1; j <= 5; j++) {
            statsTab.appendChild(createStatSlot('sub-stat', `Substat ${j}`, substatsData, panel));
        }
    }
}