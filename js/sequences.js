let currentSequence = 0;  //Track current sequence level

const toggleElement = document.querySelector('.toggle');
const toggleCircle = toggleElement.querySelector('.toggle-circle');
toggleCircle.style.backgroundImage = "url('images/Elements/Havoc.png')";

toggleElement.addEventListener('click', () => {
  toggleElement.classList.add('touched');
  
  const isChecked = toggleElement.getAttribute('aria-checked') === 'true';
  toggleElement.setAttribute('aria-checked', !isChecked);
  const displayName = isChecked ? "RoverHavoc" : "RoverSpectro";


  sequenceImage.src = `images/Sequences/${displayName}.png`;
  updateForteIcons(displayName);
  toggleCircle.style.backgroundImage = isChecked ? "url('images/Elements/Havoc.png')" : "url('images/Elements/Spectro.png')";
});

document.querySelectorAll('.sequence-option').forEach(option => {
    option.addEventListener('click', () => {
        const clickedSequence = parseInt(option.dataset.sequence);
        
        //If clicking current active level, decrease by one
        if (clickedSequence === currentSequence) {
            currentSequence = clickedSequence - 1;
        } 
        //If clicking a different level, set to that level
        else {
            currentSequence = clickedSequence;
        }

        //Update all nodes based on currentSequence
        document.querySelectorAll('.sequence-option').forEach(opt => {
            const optSequence = parseInt(opt.dataset.sequence);
            if (optSequence <= currentSequence) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        //Update sequence image if needed
        if (selectedCharacter && currentSequence >= 0) {
            sequenceImage.src = `images/Sequences/${selectedCharacter.name}_${currentSequence}.png`;
        }
    });
});