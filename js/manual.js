//manual.js

//Character selection elements
const selectCharacter = document.getElementById('selectCharacter');
const characterModal = document.getElementById('characterModal');
const closeCharacterModal = document.getElementById('closeCharacterModal');
const characterImg = document.getElementById('characterImg');

//Weapon selection elements
const selectWeapon = document.getElementById('selectWeapon');
const weaponModal = document.getElementById('weaponModal');
const closeWeaponModal = document.getElementById('closeWeaponModal');
const weaponImg = document.getElementById('weaponImg');

//Open character modal
selectCharacter.addEventListener('click', () => {
  characterModal.style.display = 'block';
});

//Open weapon modal
selectWeapon.addEventListener('click', () => {
  weaponModal.style.display = 'block';
});

//Close character modal
closeCharacterModal.addEventListener('click', () => {
  characterModal.style.display = 'none';
});

//Close weapon modal
closeWeaponModal.addEventListener('click', () => {
  weaponModal.style.display = 'none';
});

//Close modals when clicking outside the content
window.addEventListener('click', (event) => {
  if (event.target == characterModal) {
    characterModal.style.display = 'none';
  }
  if (event.target == weaponModal) {
    weaponModal.style.display = 'none';
  }
});

//Update character image upon selection
document.querySelectorAll('.character-option').forEach(option => {
  option.addEventListener('click', () => {
    const characterName = option.getAttribute('data-character');
    characterImg.src = `images/${characterName}.png`;
    characterModal.style.display = 'none';
  });
});

//Update weapon image upon selection
document.querySelectorAll('.weapon-option').forEach(option => {
  option.addEventListener('click', () => {
    const weaponName = option.getAttribute('data-weapon');
    weaponImg.src = `images/${weaponName}.png`;
    weaponModal.style.display = 'none';
  });
});
