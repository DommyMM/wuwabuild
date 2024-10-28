let circle = document.getElementById("circle2");
let controlButton = document.querySelector(".control-button");
let isCircleDragging = false;

controlButton.addEventListener("mousedown", (e) => {
    isCircleDragging = true;
    controlButton.classList.add('dragging');
    e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (isCircleDragging) {
      const rect = circle.getBoundingClientRect();
      const centerX = rect.left + (173 / 2);
      const centerY = rect.top + (173 / 2);

      let deltaX = e.clientX - centerX;
      let deltaY = centerY - e.clientY;
      let angleRad = Math.atan2(deltaY, deltaX);
      let angleDeg = (angleRad * 180) / Math.PI;

      let rotationAngle = (90 - angleDeg + 360) % 360;

      if (rotationAngle > 300) {
          rotationAngle = -2;
      }

      rotationAngle = Math.min(Math.max(rotationAngle, -2), 125);

      let progressPercent = Math.max(0, (rotationAngle + 2) / 127);
      circle.style.strokeDashoffset = `${502.4 - 170 * progressPercent}`;

      let counterValue = Math.round(1 + (progressPercent * 89)); 
      document.querySelector('.control-button').textContent = counterValue;

      rotationAngle -= 92;
      if (counterValue < 30) {
        controlButton.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(90deg)`;
      } else if(counterValue > 69){
          controlButton.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(-30deg)`;
      }else{
        controlButton.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg) translate(81px) rotate(0deg)`;
      }
  }
});


document.addEventListener("mouseup", () => {
    if (isCircleDragging) {
        isCircleDragging = false;
        controlButton.classList.remove('dragging');
    }
});


document.addEventListener("mouseup", () => {
    if (isCircleDragging) {
        isCircleDragging = false;
        controlButton.classList.remove('dragging');
    }
});

const progressFill = document.getElementById("progress-fill");
const progressContainer = document.querySelector(".progress-container");
const dragger = document.querySelector(".dragger");

let isDragging = false;
let startY;
let currentDragPosition;

dragger.addEventListener('mousedown', function(e) {
    isDragging = true;
    startY = e.clientY;
    currentDragPosition = parseInt(dragger.style.bottom) || 0;
    this.classList.add('dragging');
    e.preventDefault();
});

document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;

    const rect = progressContainer.getBoundingClientRect();
    const draggerHeight = dragger.offsetHeight;
    const maxHeight = rect.height - draggerHeight;
    
    const deltaY = startY - e.clientY;
    const newPosition = currentDragPosition + (deltaY / maxHeight) * 100;
    const constrainedPosition = Math.min(Math.max(newPosition, 0), 90);
    
    dragger.style.bottom = `${constrainedPosition}%`;
    const value = Math.round((constrainedPosition / 90) * 4) + 1;
    dragger.innerHTML = value;
    progressFill.style.height = `${constrainedPosition}%`;
});

document.addEventListener('mouseup', function() {
    if (isDragging) {
        isDragging = false;
        dragger.classList.remove('dragging');
    }
});

progressContainer.addEventListener('click', function(e) {
    if (e.target === dragger) return;
    
    const rect = progressContainer.getBoundingClientRect();
    const clickY = rect.bottom - e.clientY;
    const percentage = (clickY / rect.height) * 100;
    const constrainedPercentage = Math.min(Math.max(percentage, 0), 90);
    
    const value = Math.round((constrainedPercentage / 90) * 4) + 1;
    updateProgressBar(value);
    dragger.innerHTML = value;
});

function updateProgressBar(value) {
    const heightPercentage = ((value - 1) / 4) * 90;
    progressFill.style.height = `${heightPercentage}%`;
    dragger.style.bottom = `${heightPercentage}%`;
}