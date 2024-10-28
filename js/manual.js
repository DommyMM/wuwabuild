//Add event listener to close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const weaponModal = document.getElementById('weaponModal');
    if (event.target == weaponModal) {
        weaponModal.style.display = 'none';
    }

    const characterModal = document.getElementById('characterModal');
    if (event.target == characterModal) {
        characterModal.style.display = 'none';
    }
});

function handleCharacterSelection(character) {
    document.getElementById('characterImg').src = `images/Faces/${character.name}.png`;
    document.getElementById('characterModal').style.display = 'none';
    selectedCharacter = character; //Store the selected character

    //Update icon and sequence image based on selected character
    const characterTabIcon = document.getElementById('selectedCharacterIcon');
    characterTabIcon.src = `images/Icons/${character.name}.png`;

    const sequenceImage = document.getElementById('sequenceImage');
    sequenceImage.src = `images/Sequences/${character.name}.png`;

    //Enable dropdown (if disabled by default)
    const sequenceDropdown = document.querySelector(".sequence-dropdown");
    if (sequenceDropdown) {
        sequenceDropdown.disabled = false;
    }
}

const characterSlider = document.getElementById("characterLevel");
const characterLevelValue = document.querySelector(".character-level-value");
const starContainer = document.querySelector(".star-container");

//Function to determine diamonds based on level 
function getDiamondLevel(level) {
    if (level <= 20) return 0; //Level 1-20, Ascension 0
    if (level <= 40) return 1; //Level 20-40, Ascension 1
    if (level <= 50) return 2; //Level 40-50, Ascension 2
    if (level <= 60) return 3; //Level 50-60, Ascension 3
    if (level <= 70) return 4; //Level 60-70, Ascension 4
    if (level <= 80) return 5; //Level 70-80, Ascension 5
    return 6; //Level 80-90, Ascension 6
}

//Function to display diamonds
function updateDiamonds(diamondCount) {
    const diamonds = starContainer.querySelectorAll('.diamond');
    diamonds.forEach((diamond, index) => {
        if (index < diamondCount) {
            diamond.classList.add('filled');
        } else {
            diamond.classList.remove('filled');
        }
    });
}

//Function to update the slider background, value, and diamonds
function updateSlider() {
    const value = parseInt(characterSlider.value, 10);
    const snapValues = [1, 20, 40, 50, 60, 70, 80, 90]; 
    
    //Snap to closest value in snapValues
    let closest = snapValues[0];
    for (let snap of snapValues) {
        if (Math.abs(snap - value) < Math.abs(closest - value)) {
            closest = snap;
        }
    }
    characterSlider.value = closest;

    const valuePercentage = (characterSlider.value / characterSlider.max) * 100;
    characterSlider.style.background = `linear-gradient(to right, #ffd700 0%, #ff8c00 ${valuePercentage}%, #d3d3d3 ${valuePercentage}%)`;
    //Update level display
    characterLevelValue.textContent = characterSlider.value;
    
    //Update diamonds based on level
    const diamondLevel = getDiamondLevel(characterSlider.value);
    updateDiamonds(diamondLevel);
}

//Attach event listener to slider
characterSlider.addEventListener('input', updateSlider);

//Initialize the slider and diamonds on page load
updateSlider();

//Add event listener to character-level-value to allow manual input
characterLevelValue.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.max = 90;
    input.value = ''; // Clear the input field for new input
    input.classList.add('level-input'); // Optional: Add class for styling

    // Store the current value to revert if needed
    input.dataset.previousValue = characterSlider.value;

    // Replace the current level display with the input field
    characterLevelValue.replaceWith(input);
    input.focus();

    // Select the input content for easy replacement 
    input.select();

    //Function to update level based on input
    function updateLevelFromInput() {
        let typedValue = parseInt(input.value, 10);
        
        //Ensure the value is within bounds
        if (isNaN(typedValue) || typedValue < 1) typedValue = 1;
        if (typedValue > 90) typedValue = 90;
        
        //Update slider and character-level-value
        characterSlider.value = typedValue;
        characterLevelValue.textContent = typedValue;
        updateSlider(); 
    }

    // **Remove the real-time input event listener**
    // input.addEventListener('input', updateLevelFromInput); // Remove or comment out this line

    //Handle when the user presses Enter or loses focus
    function finalizeLevelFromInput() {
        if (input.value.trim() === '') {
            // If input is empty, revert to the previous value
            input.value = input.dataset.previousValue;
            characterLevelValue.textContent = input.dataset.previousValue;
            characterSlider.value = input.dataset.previousValue;
            updateSlider();
        } else {
            updateLevelFromInput(); 
        }
        input.replaceWith(characterLevelValue); 
    }

    input.addEventListener('blur', finalizeLevelFromInput);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finalizeLevelFromInput();
        }
    });
});