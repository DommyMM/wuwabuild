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

function calculateMainStatValue(minValue, maxValue, level) {
    return minValue + ((maxValue - minValue) * level / 25);
}

function updateMainStatValue(panel) {
    const mainStatSelect = panel.querySelector('.main-stat .stat-select');
    const mainStatValue = panel.querySelector('.main-stat-value');
    const levelSlider = panel.querySelector('.echo-slider');
    
    if (mainStatSelect && mainStatValue && mainStatSelect.selectedIndex > 0) {
        const selectedOption = mainStatSelect.options[mainStatSelect.selectedIndex];
        const minValue = parseFloat(selectedOption.dataset.min);
        const maxValue = parseFloat(selectedOption.dataset.max);
        const calculatedValue = calculateMainStatValue(minValue, maxValue, parseInt(levelSlider.value));
        mainStatValue.textContent = `${calculatedValue.toFixed(1)}%`;
    }
}

function createMainStatSection(cost, mainStatsData) {
    const mainStatContainer = document.createElement('div');
    mainStatContainer.className = 'stat-slot main-stat';

    const mainStatSelect = document.createElement('select');
    mainStatSelect.className = 'stat-select';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Main Stat';
    placeholderOption.selected = true;
    placeholderOption.disabled = true;
    mainStatSelect.appendChild(placeholderOption);

    if (cost && mainStatsData) {
        const availableStats = mainStatsData[`${cost}cost`].mainStats;
        Object.entries(availableStats).forEach(([statName, [min, max]]) => {
            const option = document.createElement('option');
            option.value = statName;
            option.textContent = statName;
            option.dataset.min = min;
            option.dataset.max = max;
            mainStatSelect.appendChild(option);
        });
    }

    const mainStatValue = document.createElement('div');
    mainStatValue.className = 'main-stat-value';
    mainStatValue.textContent = '0';

    mainStatSelect.addEventListener('change', () => {
        const panel = mainStatContainer.closest('.echo-panel');
        updateMainStatValue(panel);
    });

    mainStatContainer.appendChild(mainStatSelect);
    mainStatContainer.appendChild(mainStatValue);

    return mainStatContainer;
}

function updateMainStats(panel, cost, mainStatsData) {    
    const mainStatSelect = panel.querySelector('.main-stat .stat-select');
    if (!mainStatSelect) {
        console.error("Could not find main stat select in panel");
        return;
    }

    while (mainStatSelect.options.length > 1) {
        mainStatSelect.remove(1);
    }

    const availableStats = mainStatsData[`${cost}cost`].mainStats;
    Object.entries(availableStats).forEach(([statName, [min, max]]) => {
        const option = document.createElement('option');
        option.value = statName;
        option.textContent = statName;
        option.dataset.min = min;
        option.dataset.max = max;
        mainStatSelect.appendChild(option);
    });

    mainStatSelect.disabled = false;
}