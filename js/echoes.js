let echoData = null;

async function createEchoPanels() {
    if (!echoData) {
        await loadEchoData();
    }
    const container = document.querySelector('.echo-panels-container');
    if (!container) {
        console.error('Echo panels container not found');
        return;
    }
    container.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const panel = createEchoPanel(i);
        container.appendChild(panel);
    }

    setupSingleModal();
}

function createEchoPanel(index) {
    const panel = document.createElement('div');
    panel.className = 'echo-panel';
    panel.id = `panel${index}`;
    
    const manualSection = createManualSection(index);
    const levelContainer = createLevelContainer(index);
    
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-button';
    clearButton.textContent = 'Reset';
    clearButton.addEventListener('click', () => clearPanel(index));
    
    panel.appendChild(manualSection);
    panel.appendChild(levelContainer);
    panel.appendChild(clearButton);
    
    return panel;
}

function createManualSection(index) {
    const manualSection = document.createElement('div');
    manualSection.className = 'manual-section';

    const label = document.createElement('p');
    label.id = 'selectedEchoLabel';
    label.textContent = `Echo ${index}`;
    label.style.fontSize = '30px';
    label.style.textAlign = 'center';

    const selectBox = createSelectBox(index);
    
    manualSection.appendChild(label);
    manualSection.appendChild(selectBox);
    return manualSection;
}

function clearPanel(index) {
    const panel = document.getElementById(`panel${index}`);
    if (!panel) return;
    
    const label = panel.querySelector('#selectedEchoLabel');
    if (label) label.textContent = `Echo ${index}`;
    
    const img = panel.querySelector('#echoImg');
    if (img) img.src = 'images/Resources/Echo.png';
    
    const slider = panel.querySelector(`#echoLevel${index}`);
    if (slider) {
        slider.value = 0;
        slider.style.background = '#d3d3d3';
        const levelValue = panel.querySelector('.echo-level-value');
        if (levelValue) levelValue.textContent = '0';
    }
    
    const selectBox = panel.querySelector('#selectEcho');
    if (selectBox) selectBox.style.right = '';
    
    const elementContainer = panel.querySelector('.element-container');
    if (elementContainer) elementContainer.remove();
    
    const statsTab = panel.querySelector('.stats-tab');
    if (statsTab) {
        const mainStatSelect = statsTab.querySelector('.main-stat .stat-select');
        const mainStatValue = statsTab.querySelector('.main-stat-value');
        if (mainStatSelect) mainStatSelect.value = '';
        if (mainStatValue) mainStatValue.textContent = '0';

        const statSelects = statsTab.querySelectorAll('.sub-stat .stat-select');
        const statValues = statsTab.querySelectorAll('.stat-value');
        
        statSelects.forEach(select => {
            select.value = '';
            select.dataset.selected = '';
        });
        
        statValues.forEach(value => {
            value.innerHTML = '<option>Select</option>';
            value.disabled = true;
        });
        
        panelSelections.set(panel.id, new Set());
    }
    
    updateMainStatValue(panel);
}

function createSelectBox(index) {
    const selectBox = document.createElement('div');
    selectBox.className = 'select-box';
    selectBox.id = 'selectEcho';

    const img = document.createElement('img');
    img.src = 'images/Resources/Echo.png';
    img.alt = 'Select Echo';
    img.className = 'select-img';
    img.id = 'echoImg';

    selectBox.appendChild(img);
    selectBox.addEventListener('click', () => openEchoModal(index));
    return selectBox;
}

function createLevelContainer(index) {
    const levelContainer = document.createElement('div');
    levelContainer.className = 'echo-level-container';

    levelContainer.innerHTML = `
        <div class="echo-slider-group">
            <input type="range" min="0" max="25" value="0" class="echo-slider" id="echoLevel${index}">
            <div class="echo-level-value">0</div>
        </div>
    `;

    const slider = levelContainer.querySelector(`#echoLevel${index}`);
    setupSliderEvents(slider);
    
    return levelContainer;
}

function setupSliderEvents(slider) {
    slider.addEventListener('input', (event) => {
        const value = event.target.value;
        const levelContainer = event.target.closest('.echo-level-container');
        
        levelContainer.querySelector('.echo-level-value').textContent = value;
        
        const valuePercentage = (value / event.target.max) * 100;
        event.target.style.background = `linear-gradient(to right, #ffd700 0%, #ff8c00 ${valuePercentage}%, #d3d3d3 ${valuePercentage}%)`;
        
        const panel = event.target.closest('.echo-panel');
        updateMainStatValue(panel);
    });
}

function setupSingleModal() {
    const echoModal = document.getElementById('echoModal');
    const closeEchoModal = document.getElementById('closeEchoModal');

    closeEchoModal.addEventListener('click', () => {
        echoModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === echoModal) {
            echoModal.style.display = 'none';
        }
    });
}

function createCostSection(cost) {
    const section = document.createElement('div');
    section.classList.add('echo-cost-section');
    
    const label = document.createElement('div');
    label.classList.add('cost-label');
    label.textContent = `${cost} Cost`;
    
    const grid = document.createElement('div');
    grid.classList.add('echo-grid');
    
    section.appendChild(label);
    section.appendChild(grid);
    
    return { section, grid };
}

function openEchoModal(index) {
    const echoModal = document.getElementById('echoModal');
    const echoList = echoModal.querySelector('.echo-list');
    echoList.innerHTML = '';

    const costs = [4, 3, 1];
    const costSections = {};
    
    costs.forEach(cost => {
        const { section, grid } = createCostSection(cost);
        costSections[cost] = { section, grid };
    });

    populateEchoModal(echoData, index, costSections, costs, echoList, echoModal);
    echoModal.style.display = 'flex';
}

function populateEchoModal(echoes, index, costSections, costs, echoList, echoModal) {
    echoes.forEach(echo => {
        const echoElement = createEchoElement(echo);
        setupEchoClickHandler(echoElement, echo, index, echoModal);
        addToEchoCostSection(echoElement, echo, costSections);
    });

    appendCostSections(costs, costSections, echoList);
}

function createEchoElement(echo) {
    const echoElement = document.createElement('div');
    echoElement.classList.add('echo-option');

    const img = document.createElement('img');
    img.src = `images/Echoes/${echo.name}.png`;
    img.alt = echo.name;
    img.classList.add('echo-img');
    
    const nameLabel = document.createElement('span');
    nameLabel.className = 'echo-name';
    nameLabel.textContent = echo.name;

    echoElement.appendChild(img);
    echoElement.appendChild(nameLabel);
    
    return echoElement;
}

function setupEchoClickHandler(echoElement, echo, index, echoModal) {
    echoElement.addEventListener('click', async () => {
        const panel = document.getElementById(`panel${index}`);
        await updatePanelContent(panel, echo);
        echoModal.style.display = 'none';
    });
}

async function updatePanelContent(panel, echo) {
    panel.querySelector('#echoImg').src = `images/Echoes/${echo.name}.png`;
    panel.querySelector('#selectedEchoLabel').textContent = echo.name;
    panel.querySelector('#selectEcho').style.right = '10%';
    
    createElementTabs(panel, echo.elements);
    
    const mainStatsData = await loadMainStatsData();
    if (mainStatsData) {
        updateMainStats(panel, echo.cost, mainStatsData);
    }
}

function addToEchoCostSection(echoElement, echo, costSections) {
    if (costSections[echo.cost]) {
        costSections[echo.cost].grid.appendChild(echoElement);
    }
}

function appendCostSections(costs, costSections, echoList) {
    costs.forEach(cost => {
        if (costSections[cost]) {
            echoList.appendChild(costSections[cost].section);
        }
    });
}