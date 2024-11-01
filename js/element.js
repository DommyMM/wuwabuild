const ELEMENT_SETS = {
    'Aero': 'Sierra Gale',
    'ER': 'Moonlit Clouds',
    'Electro': 'Void Thunder',
    'Spectro': 'Celestial Light',
    'Glacio': 'Freezing Frost',
    'Attack': 'Lingering Tunes',
    'Fusion': 'Molten Rift',
    'Havoc': 'Sun-sinking Eclipse',
    'Healing': 'Rejuvenating Glow'
};

function adjustFontSize(element) {
    const text = element.textContent;
    let baseSize;
    if (text.length <= 16) {
        baseSize = 28; 
    } else {
        baseSize = 20; 
    }
    element.style.fontSize = `${baseSize}px`;
}

function createElementTabs(panel, elements = []) {
    const manualSection = panel.querySelector('.manual-section');
    if (!manualSection) {
        console.error('Manual section not found');
        return;
    }

    let elementContainer = manualSection.querySelector('.element-container');
    if (!elementContainer) {
        elementContainer = document.createElement('div');
        elementContainer.className = 'element-container';
        manualSection.appendChild(elementContainer);
    }

    elementContainer.innerHTML = '';

    const setNameDisplay = document.createElement('div');
    setNameDisplay.className = 'set-name-display';
    elementContainer.appendChild(setNameDisplay);

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'element-tabs';
    elementContainer.appendChild(tabsContainer);

    if (elements.length === 1) {
        setNameDisplay.textContent = ELEMENT_SETS[elements[0]];
        setNameDisplay.dataset.element = elements[0];
        setNameDisplay.style.opacity = '1';
        adjustFontSize(setNameDisplay);
        tabsContainer.style.display = 'none';
        return;
    }

    setNameDisplay.style.opacity = '0';
    elements.forEach((element, index) => {
        const tab = document.createElement('div');
        tab.className = 'element-tab';
        tab.dataset.element = element;  
        const numberIndicator = document.createElement('div');
        numberIndicator.className = 'element-number';
        numberIndicator.textContent = index + 1;
        tab.appendChild(numberIndicator);

        tab.addEventListener('click', () => {
            const wasActive = tab.classList.contains('active');
            
            tabsContainer.querySelectorAll('.element-tab').forEach(t => 
                t.classList.remove('active'));
            
            if (!wasActive) {
                tab.classList.add('active');
                setNameDisplay.textContent = ELEMENT_SETS[element];
                setNameDisplay.dataset.element = element;  
                setNameDisplay.style.opacity = '1';
                adjustFontSize(setNameDisplay);
            } else {
                setNameDisplay.style.opacity = '0';
                setNameDisplay.dataset.element = '';  
            }
        });
        tabsContainer.appendChild(tab);
    });
}

function getSelectedElementSet(panel) {
    const activeTab = panel.querySelector('.element-tab.active');
    if (activeTab) {
        return {
            element: activeTab.dataset.element,
            setName: ELEMENT_SETS[activeTab.dataset.element]
        };
    }
    return null;
}