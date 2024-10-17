//Tab switching logic
function openTab(tabName) {
  var i, tabcontent;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  document.getElementById(tabName).style.display = "block";
}
document.getElementById("upload").style.display = "block";

//Dropzone functionality
const dropzone = document.getElementById('dropzone');
const imageInput = document.getElementById('imageUpload');

dropzone.addEventListener('click', () => imageInput.click());

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  
  const files = event.dataTransfer.files;
  handleFiles(files);
});

imageInput.addEventListener('change', (event) => {
  const files = event.target.files;
  handleFiles(files);
});

//Function to draw the final stitched image on the canvas
function drawFinalImage() {
  const canvas = document.getElementById('finalCanvas');
  const ctx = canvas.getContext('2d');
  
  //Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //Example positions for categories (you can adjust as needed)
  const positions = {
    Stats: { x: 0, y: 0 },
    Weapon: { x: 480, y: 0 },
    Sequences: { x: 960, y: 0 },
    Forte: { x: 1440, y: 0 },
    "Advanced Stats": { x: 0, y: 540 },
    Echo1: { x: 480, y: 540 },
    Echo2: { x: 960, y: 540 },
    Echo3: { x: 1440, y: 540 },
    Echo4: { x: 0, y: 1080 },
    Echo5: { x: 480, y: 1080 }
  };

  //Draw the images onto the canvas based on their assigned category
  Object.keys(imageAssignments).forEach(category => {
    const img = imageAssignments[category];
    const position = positions[category];
    if (img && position) {
      //Calculate the aspect ratio to fit the image into the given space (480x540 for this example)
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const maxWidth = 480; //Example width of the area
      const maxHeight = 540; //Example height of the area
      let width, height;

      //Calculate the best fit
      if (imgWidth > imgHeight) {
        width = maxWidth;
        height = (imgHeight / imgWidth) * maxWidth;
      } else {
        height = maxHeight;
        width = (imgWidth / imgHeight) * maxHeight;
      }

      //Draw the image resized to fit the area
      ctx.drawImage(img, position.x, position.y, width, height);
    }
  });
}