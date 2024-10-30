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

    const echoInfo = document.createElement('p');
    echoInfo.textContent = `Details for Echo ${index}`;
    echoList.appendChild(echoInfo);

    echoModal.style.display = 'flex';
}

createEchoPanels();
initializeStatsTab();