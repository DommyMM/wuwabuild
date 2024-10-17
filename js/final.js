//Zoom toggle for the final canvas
const finalCanvas = document.getElementById('finalCanvas');
let isZoomed = false;

//Prevent default double-click zoom (Chrome built-in zoom feature)
finalCanvas.addEventListener('dblclick', function (event) {
  event.preventDefault();
});

finalCanvas.addEventListener('click', function () {
  if (!isZoomed) {
    finalCanvas.style.transform = 'scale(2)'; //Zoom in
    finalCanvas.style.transformOrigin = 'center'; //Zoom relative to the center
    finalCanvas.style.cursor = 'zoom-out';
    isZoomed = true;
  } else {
    finalCanvas.style.transform = 'scale(1)'; //Reset zoom
    finalCanvas.style.cursor = 'zoom-in';
    isZoomed = false;
  }
});

//Get references to the Render and Download buttons
const renderButton = document.getElementById('renderButton');
const downloadButton = document.getElementById('downloadButton');

//Function to trigger re-rendering the final image on the canvas
renderButton.addEventListener('click', function () {
  drawFinalImage();
  console.log('Image re-rendered.');
});

//Function to download the final image as a PNG
downloadButton.addEventListener('click', function () {
  const canvas = document.getElementById('finalCanvas');
  const link = document.createElement('a');
  link.download = 'final_image.png'; //Set the default file name
  link.href = canvas.toDataURL('image/png'); //Convert canvas to PNG data URL
  link.click();
});
