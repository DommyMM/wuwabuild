let currentImage = null; 
const imageAssignments = {}; 

function handleFiles(files) {
  const filePreview = document.getElementById('filePreview');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const imgContainer = document.createElement('div');
        imgContainer.classList.add('image-container');
        
        const img = document.createElement('img');
        img.src = event.target.result;
        img.classList.add('preview-image');

        img.addEventListener('click', function () {
          openModal(img.src, img); 
        });

        imgContainer.appendChild(img);
        filePreview.appendChild(imgContainer);
      };
      reader.readAsDataURL(file); 
    }
  }
}

function openModal(imageSrc, imgElement) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modal.style.display = 'flex';

    currentImage = imgElement;
}

const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', function() {
  document.getElementById('imageModal').style.display = 'none';
  currentImage = null; 
});

const categoryButtons = document.querySelectorAll('.category-btn');
categoryButtons.forEach(button => {
  button.addEventListener('click', function() {
    const selectedCategory = button.getAttribute('data-category');
    
    if (currentImage) {
      currentImage.setAttribute('data-category', selectedCategory);
      imageAssignments[selectedCategory] = currentImage; 
      console.log(`Assigned category "${selectedCategory}" to the image.`);
      
      const imgContainer = currentImage.parentElement;
      let categoryLabel = imgContainer.querySelector('.category-label');
      
      if (!categoryLabel) {
        categoryLabel = document.createElement('div');
        categoryLabel.classList.add('category-label');
        imgContainer.appendChild(categoryLabel);
      }
      
      categoryLabel.textContent = `Assigned: ${selectedCategory}`;
      
      document.getElementById('imageModal').style.display = 'none'; 
      currentImage = null; 
    }
    drawFinalImage();
  });
});