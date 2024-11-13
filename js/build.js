document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateDownload');
    const downloadBtn = document.getElementById('downloadButton');
    const buildTab = document.getElementById('build-tab');
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';
    optionsContainer.style.display = 'none';
    generateBtn.parentNode.insertBefore(optionsContainer, generateBtn);
    
    optionsContainer.appendChild(createInputFields());

    generateBtn.addEventListener('click', async () => {
        if (!await checkEchoCosts()) return;

        await generateBuildTabContent();
        buildTab.style.display = 'flex'; 
        buildTab.style.opacity = '1';
        downloadBtn.style.display = 'inline-block'; 
        document.querySelector('.build-card').scrollIntoView({ behavior: 'smooth' });
    });

    downloadBtn.addEventListener('click', () => {
        downloadBuildTab();
    });
});

function createCharacterIcon() {
    const iconClone = document.createElement('img');
    iconClone.src = document.getElementById('selectedCharacterIcon').src;
    iconClone.className = 'build-character-icon';
    return iconClone;
}

function createCharacterNameSection(characterLabel) {
    const nameDiv = document.createElement('div');
    nameDiv.className = 'build-character-name';
    
    const characterName = characterLabel.textContent;
    nameDiv.textContent = characterName.startsWith('Rover') ? 'Rover' : characterName;
    
    return nameDiv;
}

function createCharacterLevelSection() {
    const levelDiv = document.createElement('div');
    levelDiv.className = 'build-character-level';
    levelDiv.textContent = `Lv.${document.querySelector('.character-level-value').textContent}/90`;
    return levelDiv;
}

function createSequenceSection(characterName) {
    const sequenceContainer = document.createElement('div');
    sequenceContainer.className = 'build-sequence-container';
    
    const Label = document.querySelector('#selectedCharacterLabel span');
    const elementValue = characterName.startsWith("Rover") ? 
        (document.querySelector('.toggle').getAttribute('aria-checked') === 'true' ? "Spectro" : "Havoc") : 
        Label.getAttribute('data-element');
    const elementClass = elementValue ? `element-${elementValue.toLowerCase()}` : 'element-default';

    for (let i = 1; i <= 6; i++) {
        const sequenceNode = document.createElement('div');
        sequenceNode.className = `build-sequence-node ${elementClass}`;
        sequenceNode.setAttribute('data-sequence', i);

        const sequenceImg = document.createElement('img');
        sequenceImg.src = `images/Sequences/T_IconDevice_${characterName}M${i}_UI.png`;
        sequenceImg.className = 'sequence-icon';
        sequenceNode.appendChild(sequenceImg);

        if (i <= currentSequence) {
            sequenceNode.classList.add('active');
        } else {
            sequenceNode.classList.add('inactive');
        }
        sequenceContainer.appendChild(sequenceNode);
    }
    return sequenceContainer;
}

function getCharacterName(characterLabel) {
    let characterName = characterLabel.textContent;
    if (characterName === "Rover (M)" || characterName === "Rover (F)") {
        const isHavoc = document.querySelector('.toggle').getAttribute('aria-checked') === 'true';
        characterName = isHavoc ? "RoverSpectro" : "RoverHavoc";
    }
    return characterName;
}

async function generateBuildTabContent() {
    const tab = document.getElementById('build-tab');
    tab.innerHTML = '';

    const characterLabel = document.querySelector('#selectedCharacterLabel span');
    const characterName = getCharacterName(characterLabel);
    const roleValue = characterLabel.getAttribute('data-role'); 
    const elementValue = characterName.startsWith("Rover") ? 
        (document.querySelector('.toggle').getAttribute('aria-checked') === 'true' ? "Spectro" : "Havoc") : 
        characterLabel.getAttribute('data-element');

    const characterSection = document.createElement('div');
    characterSection.className = 'build-character-section';
    characterSection.appendChild(createCharacterIcon());
    characterSection.appendChild(createSequenceSection(characterName));

    const introSection = document.createElement('div');
    introSection.className = 'build-intro';
    introSection.appendChild(createCharacterNameSection(characterLabel));
    introSection.appendChild(createCharacterLevelSection());
    introSection.appendChild(createRoleImage(roleValue));  
    introSection.appendChild(createElementImage(elementValue));  
    introSection.appendChild(createSimplifiedForte(characterName));

    tab.appendChild(characterSection);
    tab.appendChild(introSection);

    const weaponSection = await generateWeaponSection();
    tab.appendChild(weaponSection);

    const statsSection = await createStatsMenuSection();
    tab.appendChild(statsSection);

    const echoDisplay = createEchoDisplay();
    tab.appendChild(echoDisplay);

    createWatermark(tab);
}

function createElementImage(element) {
    const elementImage = document.createElement('img');
    elementImage.src = `images/Elements/${element}.png`; 
    elementImage.className = 'element-icon';

    return elementImage;
}

function createRoleImage(role) {
    const roleImage = document.createElement('img');
    roleImage.src = `images/Roles/${role}.png`;
    roleImage.className = 'role-icon';
    return roleImage;
}

function createWeaponIcon(weaponImg) {
    const weaponClone = document.createElement('img');
    weaponClone.src = weaponImg.src;
    weaponClone.className = 'build-weapon-icon';
    return weaponClone;
}

function createWeaponNameSection(weaponLabel) {
    const weaponName = document.createElement('div');
    weaponName.className = 'weapon-stat weapon-name';
    weaponName.textContent = weaponLabel.textContent;
    return weaponName;
}

function createRankLevelSection() {
    const rankLevelContainer = document.createElement('div');
    rankLevelContainer.className = 'weapon-stat-row';

    const weaponRank = document.createElement('div');
    weaponRank.className = 'weapon-stat weapon-rank';
    const dragger = document.querySelector('.dragger');
    const draggerValue = dragger ? dragger.textContent : '1';  
    weaponRank.textContent = `R${draggerValue}`;

    const weaponLevel = document.createElement('div');
    weaponLevel.className = 'weapon-stat weapon-level';
    const controlButton = document.querySelector('.control-button');
    const levelValue = controlButton ? controlButton.textContent : '90';  
    weaponLevel.textContent = `Lv.${levelValue}/90`;

    rankLevelContainer.appendChild(weaponRank);
    rankLevelContainer.appendChild(weaponLevel);
    return rankLevelContainer;
}

async function createWeaponStats() {
    const characterLabel = document.querySelector('#selectedCharacterLabel span');
    const weaponLabel = document.querySelector('#selectedWeaponLabel span');
    const controlButton = document.querySelector('.control-button');
    const level = controlButton ? controlButton.textContent : '90';
 
    const [weaponResponse, curveResponse] = await Promise.all([
        fetch(`Data/${characterLabel.getAttribute('data-weapontype')}s.json`),
        fetch('Data/LevelCurve.json')
    ]);
    
    const weapons = await weaponResponse.json();
    const curves = await curveResponse.json();
    const weaponData = weapons.find(w => w.name === weaponLabel.textContent);
 
    let levelKey;
    if (level <= 20) levelKey = "1/20";
    else if (level <= 40) levelKey = `${level}/40`;
    else if (level <= 50) levelKey = `${level}/50`;
    else if (level <= 60) levelKey = `${level}/60`;
    else if (level <= 70) levelKey = `${level}/70`;
    else if (level <= 80) levelKey = `${level}/80`;
    else levelKey = `${level}/90`;
    
    const atkMultiplier = curves.ATK_CURVE[levelKey];
    const statMultiplier = curves.STAT_CURVE[levelKey];
    
    const scaledAtk = (parseFloat(weaponData.ATK) * atkMultiplier).toFixed(1);
    const scaledMainStat = (parseFloat(weaponData.base_main) * statMultiplier).toFixed(1);
 
    const statsContainer = document.createElement('div');
    statsContainer.className = 'weapon-stat-row';

    const weaponAttack = document.createElement('div');
    weaponAttack.className = 'weapon-stat weapon-attack';
    weaponAttack.classList.add('atk');

    const attackIconImg = document.createElement('img');
    attackIconImg.src = 'images/Resources/Attack.png';
    attackIconImg.className = 'stat-icon-img';

    weaponAttack.appendChild(attackIconImg);
    weaponAttack.setAttribute('data-precise', scaledAtk); 
    weaponAttack.appendChild(document.createTextNode(Math.floor(scaledAtk)));

    const weaponMainStat = document.createElement('div');
    weaponMainStat.className = 'weapon-stat weapon-main-stat';
    const mainStatClass = weaponData.main_stat.toLowerCase().replace(/\s+/g, '-').replace(/%/g, '').replace('-dmg', '');
    weaponMainStat.classList.add(mainStatClass);

    weaponMainStat.setAttribute('data-main', weaponData.main_stat);
    if (weaponData.passive) {
        weaponMainStat.setAttribute('data-passive', weaponData.passive);
        weaponMainStat.setAttribute('data-passive-value', weaponData.passive_stat);
    }
    if (weaponData.passive2) {
        weaponMainStat.setAttribute('data-passive2', weaponData.passive2);
        weaponMainStat.setAttribute('data-passive2-value', weaponData.passive_stat2);
    }

    const mainStatIconImg = document.createElement('img');
    mainStatIconImg.src = `images/Stats/${weaponData.main_stat}.png`;
    mainStatIconImg.className = 'stat-icon-img';

    weaponMainStat.appendChild(mainStatIconImg);
    weaponMainStat.appendChild(document.createTextNode(`${scaledMainStat}%`));

    statsContainer.appendChild(weaponAttack);
    statsContainer.appendChild(weaponMainStat);

    return statsContainer;
 }

function createRaritySection(weaponLabel) {
    const starContainer = document.createElement('div');
    starContainer.className = 'build-weapon-star-container';
    
    const rarityClass = weaponLabel.className.match(/rarity-(\d)/);
    const weaponRarity = rarityClass ? parseInt(rarityClass[1]) : 0;
    for (let i = 0; i < weaponRarity; i++) {
        const star = document.createElement('img');
        star.src = 'images/Resources/Star.png';
        star.className = 'star-icon';
        starContainer.appendChild(star);
    }
    
    return starContainer;
}

async function generateWeaponSection() {
    const weaponSection = document.createElement('div');
    weaponSection.className = 'build-weapon-container';
    
    const weaponImg = document.getElementById('weaponImg');
    const weaponLabel = document.querySelector('#selectedWeaponLabel span');
    
    if (weaponImg && weaponLabel) {
        weaponSection.appendChild(createWeaponIcon(weaponImg));
        
        const weaponInfo = document.createElement('div');
        weaponInfo.className = 'weapon-info';

        weaponInfo.appendChild(createWeaponNameSection(weaponLabel));
        
        const progressValue = document.querySelector('.dragger')?.innerHTML || '1';
        const rank = parseInt(progressValue);
        
        weaponInfo.appendChild(createRankLevelSection());
        const statsSection = await createWeaponStats();
        weaponInfo.appendChild(statsSection);

        const mainStat = statsSection.querySelector('.weapon-main-stat');
        if (mainStat && mainStat.hasAttribute('data-passive')) {
            const rankMultiplier = 1 + ((rank - 1) * 0.25);
            
            const basePassiveValue = parseFloat(mainStat.getAttribute('data-passive-value'));
            const scaledPassiveValue = Math.floor(basePassiveValue * rankMultiplier);
            
            const passiveText = document.createElement('div');
            passiveText.className = 'weapon-passive';
            
            const passiveName = mainStat.getAttribute('data-passive').replace('%', '');
            const passiveClass = passiveName.toLowerCase().replace(/\s+/g, '-').replace('-dmg', '');
            passiveText.classList.add(passiveClass);
            
            if (passiveName === 'Attribute') {
                const characterElement = document.querySelector('.char-sig').getAttribute('data-element').toLowerCase();
                passiveText.classList.add('attribute', characterElement);
            }
            
            passiveText.textContent = `Passive:\n${scaledPassiveValue}% ${passiveName}`;
            
            weaponInfo.appendChild(passiveText);
        }
        
        weaponSection.appendChild(weaponInfo);
        weaponSection.appendChild(createRaritySection(weaponLabel));
    }
    return weaponSection;
}

function downloadBuildTab() {
    const tab = document.getElementById('build-tab');
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    domtoimage.toPng(tab)
        .then(function (dataUrl) {
            const link = document.createElement('a');
            link.download = `${formattedDateTime}.png`;  
            link.href = dataUrl;
            link.click();  
        })
        .catch(function (error) {
            console.error('Error capturing build-tab:', error);
        });
}

function updateWatermarkText() {
    const usernameText = document.querySelector('.watermark-username');
    const uidText = document.querySelector('.watermark-uid');
    
    if (usernameText && uidText) {
        usernameText.innerText = document.getElementById('build-username').value || '';
        uidText.innerText = document.getElementById('build-uid').value || '';
    }
}

function createTextInputs() {
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.placeholder = 'Username';
    usernameInput.maxLength = 12;
    usernameInput.className = 'build-input username-input';
    usernameInput.id = 'build-username';
    usernameInput.addEventListener('input', updateWatermarkText);
    
    const uidInput = document.createElement('input');
    uidInput.type = 'text';
    uidInput.placeholder = 'UID';
    uidInput.maxLength = 9;
    uidInput.className = 'build-input uid-input';
    uidInput.id = 'build-uid';
    uidInput.addEventListener('input', updateWatermarkText);

    return { usernameInput, uidInput };
}

function createCheckboxes() {
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'checkbox-container';

    const rollValueCheckbox = document.createElement('input');
    rollValueCheckbox.type = 'checkbox';
    rollValueCheckbox.id = 'roll-value';
    rollValueCheckbox.className = 'roll-checkbox';

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'roll-value';
    checkboxLabel.textContent = 'Roll Quality';
    checkboxLabel.className = 'roll-label';

    checkboxContainer.appendChild(rollValueCheckbox);
    checkboxContainer.appendChild(checkboxLabel);

    return checkboxContainer;
}

function createInputFields() {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';

    const { usernameInput, uidInput } = createTextInputs();
    const checkboxContainer = createCheckboxes();

    inputContainer.appendChild(usernameInput);
    inputContainer.appendChild(uidInput);
    inputContainer.appendChild(checkboxContainer);
    
    return inputContainer;
}

function createWatermark(tab) {
    const watermarkContainer = document.createElement('div');
    watermarkContainer.className = 'watermark-container';

    const usernameText = document.createElement('div');
    usernameText.className = 'watermark-username';
    usernameText.innerText = document.getElementById('build-username').value || '';
    
    const uidText = document.createElement('div');
    uidText.className = 'watermark-uid';
    uidText.innerText = document.getElementById('build-uid').value || '';

    watermarkContainer.appendChild(usernameText);
    watermarkContainer.appendChild(uidText);
    
    tab.appendChild(watermarkContainer);
}