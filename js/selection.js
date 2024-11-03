document.addEventListener('DOMContentLoaded', function () {
    let selectedCharacter = null;
    let selectedWeapon = null;
    const progressContainers = document.querySelectorAll('.progress-container');
    const sliders = document.querySelectorAll('.slider');
    progressContainers.forEach(container => container.style.display = 'none');
    sliders.forEach(slider => slider.style.display = 'none');

    fetch('Data/Characters.json')
        .then(response => response.json())
        .then(characters => {
            const characterListContainer = document.querySelector('.character-list');
            characterListContainer.innerHTML = ''; 

            characters.forEach(character => {
                const characterElement = document.createElement('div');
                characterElement.classList.add('character-option');

                const img = document.createElement('img');
                img.src = `images/Faces/${character.name}.png`;
                img.alt = character.name;
                img.classList.add('character-img');

                const label = document.createElement('span');
                label.textContent = character.name;
                label.classList.add('char-label');

                characterElement.appendChild(img);
                characterElement.appendChild(label);
                characterListContainer.appendChild(characterElement);

                characterElement.addEventListener('click', () => {
                    document.getElementById('characterImg').src = `images/Faces/${character.name}.png`;
                    document.getElementById('characterModal').style.display = 'none';
                    selectedCharacter = character; 
                    document.getElementById('weaponImg').src = 'images/Resources/Weapon.png';
                    const weaponImg = document.getElementById('weaponImg');
                    weaponImg.style.backgroundColor = '';  
                    weaponImg.style.border = ''; 
                    const characterSelector = document.getElementById('selectCharacter');
                    let selectedLabel = document.getElementById('selectedCharacterLabel');
                
                    if (!selectedLabel) {
                        selectedLabel = document.createElement('p');
                        selectedLabel.id = 'selectedCharacterLabel';
                        selectedLabel.style.marginTop = '5px';
                        characterSelector.appendChild(selectedLabel);
                    }
                
                    selectedLabel.innerHTML = `<span class="char-sig element-${character.element.toLowerCase()}" data-weapontype="${character.weaponType}">${character.name}</span>`;
                
                    document.querySelector('.no-character-message').style.display = 'none';
                    document.querySelector('.character-content').style.display = 'block';  
                    
                    const characterTabIcon = document.getElementById('selectedCharacterIcon');
                    characterTabIcon.src = `images/Icons/${character.name}.png`; 
                    let displayName = character.name;
                    if (displayName === "Rover (M)" || displayName === "Rover (F)") {
                        displayName = "RoverHavoc";
                        const toggleElement = document.querySelector('.toggle');
                        toggleElement.style.display = 'block';
                    }else{
                        toggleElement.style.display = 'none';
                    }
                    sequenceImage.src = `images/Sequences/${displayName}.png`;
                    updateForteIcons(displayName);
                    displayName = character.name;
                    document.querySelector('.character-info').scrollIntoView({ behavior: 'smooth' });
                });
            });
        })
        .catch(error => console.error("Error loading characters:", error));

document.getElementById('selectCharacter').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'block';
});

document.getElementById('closeCharacterModal').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'none';
});


const weaponModal = document.getElementById('weaponModal');
const weaponListContainer = document.querySelector('.weapon-list');
const rarityColors = {
    "5-star": "#fff7b5",   
    "4-star": "#e1bef3",   
    "3-star": "#b4d4da",   
    "2-star": "#bad1bf",   
    "1-star": "#868686"    
};

function loadWeapons() {
    weaponListContainer.innerHTML = '';

    const weaponType = selectedCharacter.weaponType;

    fetch(`Data/${weaponType}s.json`)
        .then(response => response.json())
        .then(weapons => {
            weapons.sort((a, b) => {
                const rarityOrder = ["5-star", "4-star", "3-star", "2-star", "1-star"];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            });

            weapons.forEach(weapon => {
                const weaponElement = document.createElement('div');
                weaponElement.classList.add('weapon-option');

                const rarityBackground = `images/Quality/${weapon.rarity}.png`;
                weaponElement.style.backgroundImage = `url('${rarityBackground}')`;
                weaponElement.style.backgroundSize = 'cover';
                weaponElement.style.backgroundPosition = 'center';
                weaponElement.style.borderRadius = '8px';
                weaponElement.style.padding = '10px';

                const img = document.createElement('img');
                const encodedName = encodeURIComponent(weapon.name); 
                img.src = `images/Weapons/${weaponType}/${encodedName}.png`;
                img.alt = weapon.name;
                img.classList.add('weapon-img');

                const label = document.createElement('span');
                label.textContent = weapon.name;
                label.classList.add('weapon-label');

                weaponElement.appendChild(img);
                weaponElement.appendChild(label);
                weaponListContainer.appendChild(weaponElement);

                weaponElement.addEventListener('click', () => {
                    const encodedName = encodeURIComponent(weapon.name); 
                    document.getElementById('weaponImg').src = `images/Weapons/${weaponType}/${encodedName}.png`;
                    weaponModal.style.display = 'none';
                    const weaponImg = document.getElementById('weaponImg');
                    weaponImg.style.backgroundColor = rarityColors[weapon.rarity] || "transparent";

                    const weaponSelector = document.getElementById('selectWeapon');
                    let selectedWeaponLabel = document.getElementById('selectedWeaponLabel');

                    if (!selectedWeaponLabel) {
                        selectedWeaponLabel = document.createElement('p');
                        selectedWeaponLabel.id = 'selectedWeaponLabel';
                        selectedWeaponLabel.style.marginTop = '5px';
                        weaponSelector.appendChild(selectedWeaponLabel);
                    }

                    selectedWeaponLabel.innerHTML = `<span class="weapon-sig rarity-${weapon.rarity.charAt(0)}">${weapon.name}</span>`;
                    const progressContainers = document.querySelectorAll('.progress-container');
                    const sliders = document.querySelectorAll('.slider');
                    progressContainers.forEach(container => container.style.display = 'block');
                    sliders.forEach(slider => slider.style.display = 'flex');
                });
            });
        })
        .catch(error => {
            console.error("Error loading weapons:", error);
        });
}


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

});