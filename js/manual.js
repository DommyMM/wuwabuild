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

const characterSlider = document.getElementById("characterLevel");
const characterLevelValue = document.querySelector(".character-level-value");
const starContainer = document.querySelector(".star-container");

function getDiamondLevel(level) {
    if (level <= 20) return 0; 
    if (level <= 40) return 1; 
    if (level <= 50) return 2; 
    if (level <= 60) return 3; 
    if (level <= 70) return 4; 
    if (level <= 80) return 5; 
    return 6; 
}

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

function updateSlider() {
    const value = parseInt(characterSlider.value, 10);
    const snapValues = [1, 20, 40, 50, 60, 70, 80, 90]; 
    
    let closest = snapValues[0];
    for (let snap of snapValues) {
        if (Math.abs(snap - value) < Math.abs(closest - value)) {
            closest = snap;
        }
    }
    characterSlider.value = closest;

    const valuePercentage = (characterSlider.value / characterSlider.max) * 100;
    characterSlider.style.background = `linear-gradient(to right, #ffd700 0%, #ff8c00 ${valuePercentage}%, #d3d3d3 ${valuePercentage}%)`;
    characterLevelValue.textContent = characterSlider.value;
    
    const diamondLevel = getDiamondLevel(characterSlider.value);
    updateDiamonds(diamondLevel);
}

characterSlider.addEventListener('input', updateSlider);

updateSlider();

characterLevelValue.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.max = 90;
    input.value = ''; 
    input.classList.add('level-input'); 

    input.dataset.previousValue = characterSlider.value;

    characterLevelValue.replaceWith(input);
    input.focus();
    input.select();

    function updateLevelFromInput() {
        let typedValue = parseInt(input.value, 10);
        
        if (isNaN(typedValue) || typedValue < 1) typedValue = 1;
        if (typedValue > 90) typedValue = 90;
        
        characterSlider.value = typedValue;
        characterLevelValue.textContent = typedValue;
        updateSlider(); 
    }

    function finalizeLevelFromInput() {
        if (input.value.trim() === '') {
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

document.addEventListener('DOMContentLoaded', () => {
    const tab = document.getElementById('echoes-tab');
    const goNextButton = document.getElementById('goNext'); 
    goNextButton.addEventListener('click', () => {
        document.querySelector('.no-character-msg').style.display = 'none';
        document.querySelector('.echoes-tab').style.display = 'block';
        document.querySelector('.echoes-content').style.display = 'block';
        document.querySelector('#generateDownload').style.display = 'block';
        document.querySelector('.echoes-tab').scrollIntoView({ behavior: 'smooth' });
    });
});