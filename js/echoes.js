let echoData = null;

function createEchoPanels() {
    const container = document.querySelector('.echo-panels-container');
    if (!container) {
        console.error('Echo panels container not found');
        return;
    }
    
    container.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const panel = document.createElement('div');
        panel.className = 'echo-panel';
        panel.id = `panel${i}`;
        
        const manualSection = document.createElement('div');
        manualSection.className = 'manual-section';

        const label = document.createElement('p');
        label.id = `selectedEchoLabel`;
        label.textContent = `Echo ${i}`;
        label.style.fontSize = '30px';
        label.style.textAlign = 'center';

        const selectBox = document.createElement('div');
        selectBox.className = 'select-box';
        selectBox.id = `selectEcho`;

        const img = document.createElement('img');
        img.src = 'images/Resources/Echo.png';
        img.alt = `Select Echo`;
        img.className = 'select-img';
        img.id = `echoImg`;

        selectBox.appendChild(img);
        manualSection.appendChild(label);
        manualSection.appendChild(selectBox);
        panel.appendChild(manualSection);

        const levelContainer = document.createElement('div');
        levelContainer.className = 'echo-level-container';

        levelContainer.innerHTML = `
            <div class="echo-slider-group">
                <input type="range" min="0" max="25" value="0" class="echo-slider" id="echoLevel${i}">
                <div class="echo-level-value">0</div>
            </div>
        `;
        
        panel.appendChild(levelContainer);
        container.appendChild(panel);

        selectBox.addEventListener('click', () => {
            openEchoModal(i);
        });

        levelContainer.querySelector(`#echoLevel${i}`).addEventListener('input', (event) => {
            const slider = event.target;
            const value = slider.value;
            
            levelContainer.querySelector('.echo-level-value').textContent = value;
            
            const valuePercentage = (value / slider.max) * 100;
            slider.style.background = `linear-gradient(to right, #ffd700 0%, #ff8c00 ${valuePercentage}%, #d3d3d3 ${valuePercentage}%)`;
            const panel = slider.closest('.echo-panel');
            updateMainStatValue(panel);
        });
    }

    setupSingleModal();
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
        const echoElement = document.createElement('div');
        echoElement.classList.add('echo-option');

        const img = document.createElement('img');
        img.src = `images/Echoes/${echo.name}.png`;
        img.alt = echo.name;
        img.classList.add('echo-img');

        echoElement.addEventListener('click', async () => {
            const panel = document.getElementById(`panel${index}`);
            panel.querySelector('#echoImg').src = `images/Echoes/${echo.name}.png`;
            panel.querySelector('#selectedEchoLabel').textContent = echo.name;
            panel.querySelector('#selectEcho').style.right = '10%'; 
            createElementTabs(panel, echo.elements);
            const mainStatsData = await loadMainStatsData();
            if (mainStatsData) {
                updateMainStats(panel, echo.cost, mainStatsData);
            }
            echoModal.style.display = 'none';
        });

        echoElement.appendChild(img);
        const nameLabel = document.createElement('span');
        nameLabel.className = 'echo-name';
        nameLabel.textContent = echo.name;
        echoElement.appendChild(nameLabel);

        if (costSections[echo.cost]) {
            costSections[echo.cost].grid.appendChild(echoElement);
        }
    });

    costs.forEach(cost => {
        if (costSections[cost]) {
            echoList.appendChild(costSections[cost].section);
        }
    });
}

createEchoPanels();
initializeStatsTab();