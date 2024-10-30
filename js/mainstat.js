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
    return minValue + ((maxValue - minValue) * (level - 1) / 24);
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

    mainStatContainer.appendChild(mainStatSelect);
    mainStatContainer.appendChild(mainStatValue);

    return mainStatContainer;
}

// Function to update main stat options when an echo is selected
function updateMainStats(panel, cost, mainStatsData) {
    console.log("Updating main stats for cost:", cost);
    
    // Get the main stat select in this panel
    const mainStatSelect = panel.querySelector('.main-stat .stat-select');
    if (!mainStatSelect) {
        console.error("Could not find main stat select in panel");
        return;
    }

    // Clear existing options except placeholder
    while (mainStatSelect.options.length > 1) {
        mainStatSelect.remove(1);
    }

    // Add new options based on cost
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