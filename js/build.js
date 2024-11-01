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
    
    const characterIcon = document.getElementById('selectedCharacterIcon');
    const characterLabel = document.querySelector('#selectedCharacterLabel span'); 
    const characterName = characterLabel.textContent;
    const characterLevel = document.querySelector('.character-level-value').textContent;
    
    tab.className = `tab ${characterLabel.className}`;
    
    const characterSection = document.createElement('div');
    characterSection.className = 'build-character-section';
    
    const iconClone = document.createElement('img');
    iconClone.src = characterIcon.src;
    iconClone.className = 'build-character-icon';
    characterSection.appendChild(iconClone);
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'build-character-info';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'build-character-name';
    nameDiv.textContent = characterName;
    infoContainer.appendChild(nameDiv);
    
    const levelDiv = document.createElement('div');
    levelDiv.className = 'build-character-level';
    levelDiv.textContent = `Level. ${characterLevel}/90`;
    infoContainer.appendChild(levelDiv);
    
    characterSection.appendChild(infoContainer);
    tab.appendChild(characterSection);
    
    const watermark = document.createElement('div');
    watermark.className = 'watermark';
    watermark.innerText = 'Dommy';
    tab.appendChild(watermark);
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
