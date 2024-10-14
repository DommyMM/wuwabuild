// Tab switching logic
function openTab(tabName) {
  var i, tabcontent;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  document.getElementById(tabName).style.display = "block";
}
document.getElementById("upload").style.display = "block";

// Dropzone functionality
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

let currentImage = null; // To keep track of the current image
const imageAssignments = {}; // To store image assignments

// Function to handle file selection and display preview
function handleFiles(files) {
  const filePreview = document.getElementById('filePreview');

  // Loop through all selected files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Only proceed if the file is an image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (event) {
        // Create a container for the image and its label
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('image-container');
        
        // Create an image element
        const img = document.createElement('img');
        img.src = event.target.result;
        img.classList.add('preview-image');

        // Add event listener to open modal on click
        img.addEventListener('click', function () {
          openModal(event.target.src, img); // Pass the image reference
        });

        // Append the image and its container to the file preview
        imgContainer.appendChild(img);
        filePreview.appendChild(imgContainer);
      };
      reader.readAsDataURL(file); // Convert the file to base64
    }
  }
}

// Function to open the modal with the full-size image
function openModal(imageSrc, imgElement) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  modalImage.src = imageSrc;
  modal.style.display = 'flex';

  // Store the reference of the current image
  currentImage = imgElement;
}

// Function to close the modal
const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', function() {
  document.getElementById('imageModal').style.display = 'none';
  currentImage = null; // Reset current image
});

// Add event listeners to category buttons
const categoryButtons = document.querySelectorAll('.category-btn');
categoryButtons.forEach(button => {
  button.addEventListener('click', function() {
    const selectedCategory = button.getAttribute('data-category');
    
    // Assign the category to the current image
    if (currentImage) {
      currentImage.setAttribute('data-category', selectedCategory);
      imageAssignments[selectedCategory] = currentImage; // Save assignment
      console.log(`Assigned category "${selectedCategory}" to the image.`);
      
      // Visually display the assigned category below the image
      const imgContainer = currentImage.parentElement;
      let categoryLabel = imgContainer.querySelector('.category-label');
      
      // If a label doesn't exist, create one
      if (!categoryLabel) {
        categoryLabel = document.createElement('div');
        categoryLabel.classList.add('category-label');
        imgContainer.appendChild(categoryLabel);
      }
      
      categoryLabel.textContent = `Assigned: ${selectedCategory}`;
      
      // Close modal after assigning category
      document.getElementById('imageModal').style.display = 'none'; 
      currentImage = null; // Reset the reference
    }
    
    // After assigning the category, redraw the canvas
    drawFinalImage();
  });
});

// Function to draw the final stitched image on the canvas
function drawFinalImage() {
  const canvas = document.getElementById('finalCanvas');
  const ctx = canvas.getContext('2d');
  
  // Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Example positions for categories (you can adjust as needed)
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

  // Draw the images onto the canvas based on their assigned category
  Object.keys(imageAssignments).forEach(category => {
    const img = imageAssignments[category];
    const position = positions[category];
    if (img && position) {
      // Calculate the aspect ratio to fit the image into the given space (480x540 for this example)
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const maxWidth = 480; // Example width of the area
      const maxHeight = 540; // Example height of the area
      let width, height;

      // Calculate the best fit
      if (imgWidth > imgHeight) {
        width = maxWidth;
        height = (imgHeight / imgWidth) * maxWidth;
      } else {
        height = maxHeight;
        width = (imgWidth / imgHeight) * maxHeight;
      }

      // Draw the image resized to fit the area
      ctx.drawImage(img, position.x, position.y, width, height);
    }
  });
}

// Zoom toggle for the final canvas
const finalCanvas = document.getElementById('finalCanvas');
let isZoomed = false;

// Prevent default double-click zoom (Chrome built-in zoom feature)
finalCanvas.addEventListener('dblclick', function (event) {
  event.preventDefault();
});

finalCanvas.addEventListener('click', function () {
  if (!isZoomed) {
    finalCanvas.style.transform = 'scale(2)'; // Zoom in
    finalCanvas.style.transformOrigin = 'center'; // Zoom relative to the center
    finalCanvas.style.cursor = 'zoom-out';
    isZoomed = true;
  } else {
    finalCanvas.style.transform = 'scale(1)'; // Reset zoom
    finalCanvas.style.cursor = 'zoom-in';
    isZoomed = false;
  }
});

// Get references to the Render and Download buttons
const renderButton = document.getElementById('renderButton');
const downloadButton = document.getElementById('downloadButton');

// Function to trigger re-rendering the final image on the canvas
renderButton.addEventListener('click', function () {
  drawFinalImage();
  console.log('Image re-rendered.');
});

// Function to download the final image as a PNG
downloadButton.addEventListener('click', function () {
  const canvas = document.getElementById('finalCanvas');
  const link = document.createElement('a');
  link.download = 'final_image.png'; // Set the default file name
  link.href = canvas.toDataURL('image/png'); // Convert canvas to PNG data URL
  link.click(); // Programmatically click the link to trigger download
});
