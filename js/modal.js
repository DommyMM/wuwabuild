let currentImage = null; 
const imageAssignments = {}; 

async function handleFiles(files) {
  const filePreview = document.getElementById('filePreview');

  for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
          const ocrResult = await performMultiRegionOCR(file);
          
          const reader = new FileReader();
          reader.onload = function (event) {
              const imgContainer = document.createElement('div');
              imgContainer.classList.add('image-container');
              
              const img = document.createElement('img');
              img.src = event.target.result;
              img.classList.add('preview-image');

              if (ocrResult?.analysis) {
                  const category = ocrResult.analysis.type === 'character' ? 'Character' : 
                                 ocrResult.analysis.type === 'weapon' ? 'Weapon' : null;
                  
                  if (category) {
                      img.setAttribute('data-category', category);
                      imageAssignments[category] = img;

                      const categoryLabel = document.createElement('div');
                      categoryLabel.classList.add('category-label');
                      categoryLabel.textContent = `Detected: ${category}`;
                      imgContainer.appendChild(categoryLabel);
                  }

                  Object.entries(ocrResult.analysis).forEach(([key, value]) => {
                      img.setAttribute(`data-ocr-${key}`, value);
                  });
              }

              img.addEventListener('click', function() {
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