document.addEventListener('DOMContentLoaded', function () {
    let selectedCharacter = null;
    let selectedWeapon = null;
    const progressContainers = document.querySelectorAll('.progress-container');
    const sliders = document.querySelectorAll('.slider');
    progressContainers.forEach(container => container.style.display = 'none');
    sliders.forEach(slider => slider.style.display = 'none');

    //Load Characters from the JSON file
    fetch('Data/Characters.json')
        .then(response => response.json())
        .then(characters => {
            const characterListContainer = document.querySelector('.character-list');
            characterListContainer.innerHTML = ''; //Clear previous content

            //Dynamically create elements for each character
            characters.forEach(character => {
                const characterElement = document.createElement('div');
                characterElement.classList.add('character-option');

                //Create image element
                const img = document.createElement('img');
                img.src = `images/Faces/${character.name}.png`;
                img.alt = character.name;
                img.classList.add('character-img');

                //Create label element
                const label = document.createElement('span');
                label.textContent = character.name;
                label.classList.add('char-label');

                //Append to container
                characterElement.appendChild(img);
                characterElement.appendChild(label);
                characterListContainer.appendChild(characterElement);

                //Add click event to select the character
                characterElement.addEventListener('click', () => {
                    document.getElementById('characterImg').src = `images/Faces/${character.name}.png`;
                    document.getElementById('characterModal').style.display = 'none';
                    selectedCharacter = character; //Store the selected character
                
                    //Update the label below the selector image
                    const characterSelector = document.getElementById('selectCharacter');
                    let selectedLabel = document.getElementById('selectedCharacterLabel');
                
                    if (!selectedLabel) {
                        selectedLabel = document.createElement('p');
                        selectedLabel.id = 'selectedCharacterLabel';
                        selectedLabel.style.marginTop = '5px';
                        characterSelector.appendChild(selectedLabel);
                    }
                
                    //Update the selected character's name with color
                    selectedLabel.innerHTML = `<span class="char-sig element-${character.element.toLowerCase()}">${character.name}</span>`;
                
                    //Show character content instead of using tab system
                    document.querySelector('.no-character-message').style.display = 'none';
                    document.querySelector('.character-content').style.display = 'block';
                    
                    //Update content with the selected character's details
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

//Open modal function
document.getElementById('selectCharacter').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'block';
});

//Close modal function
document.getElementById('closeCharacterModal').addEventListener('click', () => {
    document.getElementById('characterModal').style.display = 'none';
});


//Weapon selection behavior
const weaponModal = document.getElementById('weaponModal');
const weaponListContainer = document.querySelector('.weapon-list');
const rarityColors = {
    "5-star": "#fff7b5",   
    "4-star": "#e1bef3",   
    "3-star": "#b4d4da",   
    "2-star": "#bad1bf",   
    "1-star": "#868686"    
};

//Function to load weapons based on the selected character's weapon type
function loadWeapons() {
    //Clear previous content
    weaponListContainer.innerHTML = '';

    const weaponType = selectedCharacter.weaponType;

    //Dynamically fetch the weapon names from the corresponding JSON file
    fetch(`Data/${weaponType}s.json`)
        .then(response => response.json())
        .then(weapons => {
            //Sort the weapons by rarity
            weapons.sort((a, b) => {
                const rarityOrder = ["5-star", "4-star", "3-star", "2-star", "1-star"];
                return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
            });

            weapons.forEach(weapon => {
                const weaponElement = document.createElement('div');
                weaponElement.classList.add('weapon-option');

                //Use rarity to set background
                const rarityBackground = `images/Quality/${weapon.rarity}.png`;
                weaponElement.style.backgroundImage = `url('${rarityBackground}')`;
                weaponElement.style.backgroundSize = 'cover';
                weaponElement.style.backgroundPosition = 'center';
                weaponElement.style.borderRadius = '8px';
                weaponElement.style.padding = '10px';

                //Create image element for the weapon
                const img = document.createElement('img');
                const encodedName = encodeURIComponent(weapon.name); //Encode weapon name so # is read as part of the name
                img.src = `images/Weapons/${weaponType}/${encodedName}.png`;
                img.alt = weapon.name;
                img.classList.add('weapon-img');

                //Create label element for the weapon
                const label = document.createElement('span');
                label.textContent = weapon.name;
                label.classList.add('weapon-label');

                //Append to container
                weaponElement.appendChild(img);
                weaponElement.appendChild(label);
                weaponListContainer.appendChild(weaponElement);

                //Add click event to select the weapon
                weaponElement.addEventListener('click', () => {
                    const encodedName = encodeURIComponent(weapon.name); 
                    document.getElementById('weaponImg').src = `images/Weapons/${weaponType}/${encodedName}.png`;
                    weaponModal.style.display = 'none';
                    const weaponImg = document.getElementById('weaponImg');
                    weaponImg.style.backgroundColor = rarityColors[weapon.rarity] || "transparent";

                    //Update the label below the selector image for the selected weapon
                    const weaponSelector = document.getElementById('selectWeapon');
                    let selectedWeaponLabel = document.getElementById('selectedWeaponLabel');

                    if (!selectedWeaponLabel) {
                        selectedWeaponLabel = document.createElement('p');
                        selectedWeaponLabel.id = 'selectedWeaponLabel';
                        selectedWeaponLabel.style.marginTop = '5px';
                        weaponSelector.appendChild(selectedWeaponLabel);
                    }

                    //Update the selected weapon's name
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


//Add event listener to weapon selector box
const weaponSelector = document.getElementById('selectWeapon');
weaponSelector.addEventListener('click', () => {
    //If no character is selected, display prompt
    if (!selectedCharacter) {
        weaponListContainer.innerHTML = '<p style="color: #FFFFFF; font-size: 60px;">Select a resonator first!</p>';
    } else {
        //Load the appropriate weapons
        loadWeapons();
    }

    //Show the weapon modal
    weaponModal.style.display = 'block';
});

//Close the weapon modal
document.getElementById('closeWeaponModal').addEventListener('click', () => {
    weaponModal.style.display = 'none';
});

});