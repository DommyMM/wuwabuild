let selectedCharacter = null;
let selectedWeapon = null;

const weaponModal = document.getElementById('weaponModal');
const weaponListContainer = document.querySelector('.weapon-list');
const rarityColors = {
    "5-star": "#fff7b5",   
    "4-star": "#e1bef3",   
    "3-star": "#b4d4da",   
    "2-star": "#bad1bf",   
    "1-star": "#868686"    
};

function initializeUI() {
    const elements = document.querySelectorAll('.progress-container, .slider');
    elements.forEach(el => el.style.display = 'none');
}

async function loadCharacters() {
    try {
        const response = await fetch('Data/Characters.json');
        const characters = await response.json();
        displayCharacters(characters);
    } catch (error) {
        console.error("Error loading characters:", error);
    }
}

function displayCharacters(characters) {
    const characterListContainer = document.querySelector('.character-list');
    characterListContainer.innerHTML = '';
    characters.forEach(character => createCharacterElement(character, characterListContainer));
}

function createCharacterElement(character, container) {
    const characterElement = document.createElement('div');
    characterElement.classList.add('character-option');
    
    const img = createCharacterImage(character);
    const label = createCharacterLabel(character);
    
    characterElement.appendChild(img);
    characterElement.appendChild(label);
    container.appendChild(characterElement);
    
    characterElement.addEventListener('click', () => handleCharacterSelection(character));
}

function createCharacterImage(character) {
    const img = document.createElement('img');
    img.src = `images/Faces/${character.name}.png`;
    img.alt = character.name;
    img.classList.add('character-img');
    return img;
}

function createCharacterLabel(character) {
    const label = document.createElement('span');
    label.textContent = character.name;
    label.classList.add('char-label');
    return label;
}

function resetWeaponDisplay() {
    const weaponImg = document.getElementById('weaponImg');
    if (weaponImg) {
        weaponImg.src = 'images/Resources/Weapon.png';
        weaponImg.style.backgroundColor = '';
        weaponImg.style.border = '';
    }

    selectedWeapon = null;

    const weaponLabel = document.getElementById('selectedWeaponLabel');
    if (weaponLabel) {
        weaponLabel.innerHTML = '';
    }

    const elements = document.querySelectorAll('.progress-container, .slider');
    elements.forEach(el => el.style.display = 'none');
}

function handleCharacterSelection(character) {
    selectedCharacter = character;
    updateCharacterDisplay(character);
    updateCharacterLabel(character);
    handleRoverSpecialCase(character);
    closeCharacterModal();
    resetSequences();
    resetSlider();
}

function updateCharacterDisplay(character) {
    document.getElementById('characterImg').src = `images/Faces/${character.name}.png`;
    resetWeaponDisplay();
    document.querySelector('.no-character-message').style.display = 'none';
    document.querySelector('.character-content').style.display = 'block';
    document.getElementById('selectedCharacterIcon').src = `images/Icons/${character.name}.png`;
}

function updateCharacterLabel(character) {
    const characterSelector = document.getElementById('selectCharacter');
    let selectedLabel = document.getElementById('selectedCharacterLabel') || createSelectedLabel();
    selectedLabel.innerHTML = `<span class="char-sig element-${character.element.toLowerCase()}" 
        data-element="${character.element}" 
        data-weapontype="${character.weaponType}" 
        data-role="${character.Role}">${character.name}</span>`;
}

function createSelectedLabel() {
    const label = document.createElement('p');
    label.id = 'selectedCharacterLabel';
    label.style.marginTop = '5px';
    document.getElementById('selectCharacter').appendChild(label);
    return label;
}

function handleRoverSpecialCase(character) {
    const toggleElement = document.querySelector('.toggle');
    let displayName = character.name;
    
    if (displayName === "Rover (M)" || displayName === "Rover (F)") {
        displayName = "RoverHavoc";
        toggleElement.style.display = 'block';
    } else {
        toggleElement.style.display = 'none';
    }
    
    document.getElementById('sequenceImage').src = `images/Wavebands/${displayName}.png`;
    createForteGroup();
    updateForteIcons(displayName);
}

function closeCharacterModal() {
    document.getElementById('characterModal').style.display = 'none';
}

async function loadWeapons() {
    weaponListContainer.innerHTML = '';
    const weaponType = selectedCharacter.weaponType;
    
    try {
        const weapons = await fetchWeapons(weaponType);
        const sortedWeapons = sortWeaponsByRarity(weapons);
        displayWeapons(sortedWeapons, weaponType);
    } catch (error) {
        console.error("Error loading weapons:", error);
    }
}

async function fetchWeapons(weaponType) {
    const response = await fetch(`Data/${weaponType}s.json`);
    return response.json();
}

function sortWeaponsByRarity(weapons) {
    const rarityOrder = ["5-star", "4-star", "3-star", "2-star", "1-star"];
    return [...weapons].sort((a, b) => 
        rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    );
}

function displayWeapons(weapons, weaponType) {
    weapons.forEach(weapon => {
        const weaponElement = createWeaponElement(weapon, weaponType);
        weaponListContainer.appendChild(weaponElement);
    });
}

function createWeaponElement(weapon, weaponType) {
    const weaponElement = document.createElement('div');
    weaponElement.classList.add('weapon-option');
    
    setWeaponBackground(weaponElement, weapon.rarity);
    
    const img = createWeaponImage(weapon, weaponType);
    const label = createWeaponLabel(weapon);
    
    weaponElement.appendChild(img);
    weaponElement.appendChild(label);
    
    weaponElement.addEventListener('click', () => handleWeaponSelection(weapon, weaponType));
    
    return weaponElement;
}

function setWeaponBackground(element, rarity) {
    element.style.backgroundImage = `url('images/Quality/${rarity}.png')`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.borderRadius = '8px';
    element.style.padding = '10px';
}

function createWeaponImage(weapon, weaponType) {
    const img = document.createElement('img');
    const encodedName = encodeURIComponent(weapon.name);
    img.src = `images/Weapons/${weaponType}/${encodedName}.png`;
    img.alt = weapon.name;
    img.classList.add('weapon-img');
    return img;
}

function createWeaponLabel(weapon) {
    const label = document.createElement('span');
    label.textContent = weapon.name;
    label.classList.add('weapon-label');
    return label;
}

function handleWeaponSelection(weapon, weaponType) {
    updateWeaponImage(weapon, weaponType);
    updateWeaponLabel(weapon);
    showProgressElements();
    weaponModal.style.display = 'none';
}

function updateWeaponImage(weapon, weaponType) {
    const weaponImg = document.getElementById('weaponImg');
    const encodedName = encodeURIComponent(weapon.name);
    weaponImg.src = `images/Weapons/${weaponType}/${encodedName}.png`;
    weaponImg.style.backgroundColor = rarityColors[weapon.rarity] || "transparent";
}

function updateWeaponLabel(weapon) {
    const weaponSelector = document.getElementById('selectWeapon');
    let selectedWeaponLabel = document.getElementById('selectedWeaponLabel');

    if (!selectedWeaponLabel) {
        selectedWeaponLabel = document.createElement('p');
        selectedWeaponLabel.id = 'selectedWeaponLabel';
        selectedWeaponLabel.style.marginTop = '5px';
        weaponSelector.appendChild(selectedWeaponLabel);
    }

    selectedWeaponLabel.innerHTML = `<span class="weapon-sig rarity-${weapon.rarity.charAt(0)}">${weapon.name}</span>`;
}

function showProgressElements() {
    const progressContainers = document.querySelectorAll('.progress-container');
    const sliders = document.querySelectorAll('.slider');
    progressContainers.forEach(container => container.style.display = 'block');
    sliders.forEach(slider => slider.style.display = 'flex');
}

document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadCharacters();
});

document.getElementById('selectCharacter').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'block';
});

document.getElementById('closeCharacterModal').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'none';
});

const weaponSelector = document.getElementById('selectWeapon');
weaponSelector.addEventListener('click', () => {
    if (!selectedCharacter) {
        weaponListContainer.innerHTML = '<p style="color: #FFFFFF; font-size: 60px;">Select a resonator first!</p>';
    } else {
        loadWeapons();
    }
    weaponModal.style.display = 'block';
});

document.getElementById('closeWeaponModal').addEventListener('click', () => {
    weaponModal.style.display = 'none';
});