let currentImage = null; //To keep track of the current image
const imageAssignments = {}; //To store image assignments

//Function to handle file selection and display preview
function handleFiles(files) {
  const filePreview = document.getElementById('filePreview');

  //Loop through all selected files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    //Only proceed if the file is an image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (event) {
        //Create a container for the image and its label
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('image-container');
        
        //Create an image element
        const img = document.createElement('img');
        img.src = event.target.result;
        img.classList.add('preview-image');

        //Add event listener to open modal on click
        img.addEventListener('click', function () {
          openModal(img.src, img); //Pass the correct image reference
        });

        //Append the image and its container to the file preview
        imgContainer.appendChild(img);
        filePreview.appendChild(imgContainer);
      };
      reader.readAsDataURL(file); //Convert the file to base64
    }
  }
}

function openModal(imageSrc, imgElement) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    console.log("Opening image modal with source:", imageSrc); //Debugging line
    modalImage.src = imageSrc;
    modal.style.display = 'flex';

    //Store the reference of the current image
    currentImage = imgElement;
}

//Function to close the modal
const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', function() {
  document.getElementById('imageModal').style.display = 'none';
  currentImage = null; //Reset current image
});

//Add event listeners to category buttons
const categoryButtons = document.querySelectorAll('.category-btn');
categoryButtons.forEach(button => {
  button.addEventListener('click', function() {
    const selectedCategory = button.getAttribute('data-category');
    
    //Assign the category to the current image
    if (currentImage) {
      currentImage.setAttribute('data-category', selectedCategory);
      imageAssignments[selectedCategory] = currentImage; //Save assignment
      console.log(`Assigned category "${selectedCategory}" to the image.`);
      
      //Visually display the assigned category below the image
      const imgContainer = currentImage.parentElement;
      let categoryLabel = imgContainer.querySelector('.category-label');
      
      //If a label doesn't exist, create one
      if (!categoryLabel) {
        categoryLabel = document.createElement('div');
        categoryLabel.classList.add('category-label');
        imgContainer.appendChild(categoryLabel);
      }
      
      categoryLabel.textContent = `Assigned: ${selectedCategory}`;
      
      //Close modal after assigning category
      document.getElementById('imageModal').style.display = 'none'; 
      currentImage = null; //Reset the reference
    }
    
    //After assigning the category, redraw the canvas
    drawFinalImage();
  });
});
