let currentImage = null; 
const imageAssignments = {}; 

async function handleFiles(files) {
    const filePreview = document.getElementById('filePreview');
    const BATCH_SIZE = 4; 
    const fileArray = Array.from(files);
    const totalStartTime = performance.now();

    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
        const batchStartTime = performance.now();
        const batch = fileArray.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (file) => {
            const imageStartTime = performance.now();
            
            if (file.type.startsWith('image/')) {
                const ocrResult = await performMultiRegionOCR(file);
                const ocrEndTime = performance.now();
                
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imgContainer = document.createElement('div');
                        imgContainer.classList.add('image-container');
                        
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.classList.add('preview-image');

                        if (ocrResult?.analysis) {
                            const processingTime = ocrEndTime - imageStartTime;
                            img.setAttribute('data-processing-time', processingTime.toFixed(2));
                            console.log(`Image processed (${ocrResult.analysis.type}): ${processingTime.toFixed(2)}ms`);
                            
                            const category = ocrResult.analysis.type === 'character' ? 'Character' : 
                                          ocrResult.analysis.type === 'weapon' ? 'Weapon' :
                                          ocrResult.analysis.type === 'echo' ? 'Echo' : null;
                            
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
                        
                        const totalImageTime = performance.now() - imageStartTime;
                        console.log(`Total image time (including DOM): ${totalImageTime.toFixed(2)}ms`);
                        
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }
        });

        await Promise.all(batchPromises);
        const batchTime = performance.now() - batchStartTime;
        console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1} completed in: ${batchTime.toFixed(2)}ms`);
    }

    const totalTime = performance.now() - totalStartTime;
    console.log(`Total processing time: ${totalTime.toFixed(2)}ms`);
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