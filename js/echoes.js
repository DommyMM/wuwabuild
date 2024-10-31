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
                <input type="range" min="1" max="25" value="1" class="echo-slider" id="echoLevel${i}">
                <div class="echo-level-value">1</div>
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

function openEchoModal(index) {
    const echoModal = document.getElementById('echoModal');
    const echoList = echoModal.querySelector('.echo-list');
    echoList.innerHTML = '';

    const cost4Section = document.createElement('div');
    cost4Section.classList.add('echo-cost-section');
    const cost4Label = document.createElement('div');
    cost4Label.classList.add('cost-label');
    cost4Label.textContent = '4 Cost';
    const cost4Grid = document.createElement('div');
    cost4Grid.classList.add('echo-grid');
    cost4Section.appendChild(cost4Label);

    const cost3Section = document.createElement('div');
    cost3Section.classList.add('echo-cost-section');
    const cost3Label = document.createElement('div');
    cost3Label.classList.add('cost-label');
    cost3Label.textContent = '3 Cost';
    const cost3Grid = document.createElement('div');
    cost3Grid.classList.add('echo-grid');
    cost3Section.appendChild(cost3Label);

    const cost1Section = document.createElement('div');
    cost1Section.classList.add('echo-cost-section');
    const cost1Label = document.createElement('div');
    cost1Label.classList.add('cost-label');
    cost1Label.textContent = '1 Cost';
    const cost1Grid = document.createElement('div');
    cost1Grid.classList.add('echo-grid');
    cost1Section.appendChild(cost1Label);

    fetch('Data/Echoes.json')
        .then(response => response.json())
        .then(echoes => {
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

                switch(echo.cost) {
                    case 4:
                        cost4Grid.appendChild(echoElement);
                        break;
                    case 3:
                        cost3Grid.appendChild(echoElement);
                        break;
                    case 1:
                        cost1Grid.appendChild(echoElement);
                        break;
                }
            });

            cost4Section.appendChild(cost4Grid);
            cost3Section.appendChild(cost3Grid);
            cost1Section.appendChild(cost1Grid);

            echoList.appendChild(cost4Section);
            echoList.appendChild(cost3Section);
            echoList.appendChild(cost1Section);
        })
        .catch(error => console.error("Error loading echoes:", error));

    echoModal.style.display = 'flex';
}

createEchoPanels();
initializeStatsTab();