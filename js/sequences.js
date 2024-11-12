let currentSequence = 0;  

const toggleElement = document.querySelector('.toggle');
const toggleCircle = toggleElement.querySelector('.toggle-circle');
toggleCircle.style.backgroundImage = "url('images/Elements/Havoc.png')";

toggleElement.addEventListener('click', () => {
  toggleElement.classList.add('touched');
  
  const isChecked = toggleElement.getAttribute('aria-checked') === 'true';
  toggleElement.setAttribute('aria-checked', !isChecked);
  const displayName = isChecked ? "RoverHavoc" : "RoverSpectro";


  sequenceImage.src = `images/Wavebands/${displayName}.png`;
  updateForteIcons(displayName);
  toggleCircle.style.backgroundImage = isChecked ? "url('images/Elements/Havoc.png')" : "url('images/Elements/Spectro.png')";
});

document.querySelectorAll('.sequence-option').forEach(option => {
    option.addEventListener('click', () => {
        const clickedSequence = parseInt(option.dataset.sequence);
        
        if (clickedSequence === currentSequence) {
            currentSequence = clickedSequence - 1;
        } 
        else {
            currentSequence = clickedSequence;
        }

        document.querySelectorAll('.sequence-option').forEach(opt => {
            const optSequence = parseInt(opt.dataset.sequence);
            if (optSequence <= currentSequence) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        const selectedCharacterName = document.querySelector('#selectedCharacterLabel span')?.textContent;
        const sequenceImage = document.getElementById('sequenceImage');
        
        if (selectedCharacterName && sequenceImage) {
            if (selectedCharacterName.startsWith("Rover")) {
                const isSpectro = document.querySelector('.toggle').getAttribute('aria-checked') === 'true';
                const displayName = isSpectro ? "RoverSpectro" : "RoverHavoc";
                sequenceImage.src = `images/Wavebands/${displayName}.png`;
            } else {
                sequenceImage.src = `images/Wavebands/${selectedCharacterName}.png`;
            }
        }
    });
});

function resetSequences() {
    currentSequence = 0;
    document.querySelectorAll('.sequence-option').forEach(opt => {
        opt.classList.remove('active');
    });
}