document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateDownload');
    const downloadBtn = document.getElementById('downloadButton');
    const buildTab = document.getElementById('build-tab');
    
    generateBtn.addEventListener('click', () => {
        generateBuildTabContent();
        buildTab.style.display = 'flex'; 
        buildTab.style.opacity = '1';
        downloadBtn.style.display = 'inline-block'; 
        document.querySelector('.build-card').scrollIntoView({ behavior: 'smooth' });
    });

    downloadBtn.addEventListener('click', () => {
        downloadBuildTab();
    });
});

function generateBuildTabContent() {
    const tab = document.getElementById('build-tab');
    tab.innerHTML = '';
    tab.style.backgroundColor = '#333';
    
    tab.className = `tab ${document.querySelector('#selectedCharacterLabel span').className}`;
    
    const characterSection = document.createElement('div');
    characterSection.className = 'build-character-section';
    
    const iconClone = document.createElement('img');
    iconClone.src = document.getElementById('selectedCharacterIcon').src;
    iconClone.className = 'build-character-icon';
    characterSection.appendChild(iconClone);
    
    const introSection = document.createElement('div');
    introSection.className = 'build-intro';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'build-character-name';
    const characterName = document.querySelector('#selectedCharacterLabel span').textContent;
    nameDiv.textContent = characterName;
    introSection.appendChild(nameDiv);
    
    const levelDiv = document.createElement('div');
    levelDiv.className = 'build-character-level';
    levelDiv.textContent = `Lv.${document.querySelector('.character-level-value').textContent}/90`;
    introSection.appendChild(levelDiv);
    
    const forteContainer = createSimplifiedForte(characterName); 
    introSection.appendChild(forteContainer);
    
    const sequenceContainer = document.createElement('div');
    sequenceContainer.className = 'build-sequence-container';

    // Generate sequence nodes and set active state based on currentSequence
    for(let i = 1; i <= 6; i++) {
        const sequenceNode = document.createElement('div');
        sequenceNode.className = 'build-sequence-node';
        sequenceNode.setAttribute('data-sequence', i);

        const sequenceImg = document.createElement('img');
        sequenceImg.src = `images/SequenceIcons/T_IconDevice_${characterName}M${i}_UI.png`;
        sequenceImg.className = 'sequence-icon';
        sequenceNode.appendChild(sequenceImg);

        // Apply active class to nodes up to the current sequence level
        if (i <= currentSequence) {
            sequenceNode.classList.add('active');
        }

        sequenceContainer.appendChild(sequenceNode);
    }

    characterSection.appendChild(sequenceContainer);
    tab.appendChild(characterSection);
    tab.appendChild(introSection);

    const weaponSection = generateWeaponSection();
    tab.appendChild(weaponSection);
    
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = 'Dommyflex';
    tab.appendChild(watermark);
}


function generateWeaponSection() {
    const weaponSection = document.createElement('div');
    weaponSection.className = 'build-weapon-container';
    
    const weaponImg = document.getElementById('weaponImg');
    const weaponLabel = document.querySelector('#selectedWeaponLabel span');
    
    if (weaponImg && weaponLabel) {
        const weaponClone = document.createElement('img');
        weaponClone.src = weaponImg.src;
        weaponClone.className = 'build-weapon-icon';
        weaponSection.appendChild(weaponClone);
        
       const weaponInfo = document.createElement('div');
       weaponInfo.className = 'weapon-info';

       const weaponName = document.createElement('div');
       weaponName.className = 'weapon-stat weapon-name';
       weaponName.textContent = weaponLabel.textContent;
       weaponInfo.appendChild(weaponName);

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
       weaponInfo.appendChild(rankLevelContainer);

       const statsContainer = document.createElement('div');
       statsContainer.className = 'weapon-stat-row';
       
       const weaponAttack = document.createElement('div');
       weaponAttack.className = 'weapon-stat weapon-attack';
       
       const attackIconImg = document.createElement('img');
       attackIconImg.src = 'images/Resources/Attack.png';
       attackIconImg.className = 'stat-icon-img';
       
       weaponAttack.appendChild(attackIconImg);
       weaponAttack.appendChild(document.createTextNode('47'));
       
       const weaponMainStat = document.createElement('div');
       weaponMainStat.className = 'weapon-stat weapon-main-stat';
       
       const mainStatIconImg = document.createElement('img');
       mainStatIconImg.src = 'images/Stats/Main.png';
       mainStatIconImg.className = 'stat-icon-img';
       
       weaponMainStat.appendChild(mainStatIconImg);
       weaponMainStat.appendChild(document.createTextNode('Main'));
       
       statsContainer.appendChild(weaponAttack);
       statsContainer.appendChild(weaponMainStat);
       weaponInfo.appendChild(statsContainer);
       
       weaponSection.appendChild(weaponInfo);
       
        
        const levelContainer = document.createElement('div');
        levelContainer.className = 'build-weapon-level-container';
        
        const diamondContainer = document.createElement('div');
        diamondContainer.className = 'build-weapon-diamond-container';

        const rarityClass = weaponLabel.className.match(/rarity-(\d)/);
        const weaponRarity = rarityClass ? parseInt(rarityClass[1]) : 0;
        
        for (let i = 0; i < weaponRarity; i++) {
            const diamond = document.createElement('div');
            diamond.className = 'diamond filled';  
            diamondContainer.appendChild(diamond);
        }
        
        levelContainer.appendChild(diamondContainer);
        weaponSection.appendChild(levelContainer);
    }
    
    return weaponSection;
 }

function downloadBuildTab() {
    const tab = document.getElementById('build-tab');
    html2canvas(tab).then(canvas => {
        const link = document.createElement('a');
        link.download = 'build_tab.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}