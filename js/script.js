const API_URL = 'http://localhost:5000/api/ocr';

async function handleFiles(files) {
  const filePreview = document.getElementById('filePreview');
  const BATCH_SIZE = 4;
  const fileArray = Array.from(files);
  const totalStartTime = performance.now();

  const containers = await Promise.all(fileArray.map(file => displayImage(file, filePreview)));
  const validContainers = containers.filter(Boolean);

  for (let i = 0; i < validContainers.length; i += BATCH_SIZE) {
      await processBatch(validContainers.slice(i, i + BATCH_SIZE), i, BATCH_SIZE);
  }

}

function displayImage(file, filePreview) {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(event) {
          const imgContainer = createImageContainer(event.target.result);
          addLoadingLabel(imgContainer);
          filePreview.appendChild(imgContainer);
          resolve({ container: imgContainer, file: file, img: imgContainer.querySelector('img') });
      };
      reader.readAsDataURL(file);
  });
}

function addLoadingLabel(container) {
  const categoryLabel = document.createElement('div');
  categoryLabel.classList.add('category-label', 'loading');
  categoryLabel.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Analyzing...</span>
  `;
  container.appendChild(categoryLabel);
  return categoryLabel;
}

async function processBatch(containers, batchIndex, batchSize) {
  const batchStartTime = performance.now();
  const batchPromises = containers.map(container => processImage(container));
  
  await Promise.all(batchPromises);
  console.log(`Batch ${Math.floor(batchIndex/batchSize) + 1} completed`);
}

async function processImage({ file, img, container }) {
  try {
      const base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
      });

      const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image })
      });

      if (!response.ok) throw new Error('OCR request failed');
      
      const ocrResult = await response.json();
      processOCRResult(img, ocrResult);
  } catch (error) {
      console.error('OCR processing failed:', error);
      updateLabelToError(container);
  }
}

function createImageContainer(imageSrc) {
  const imgContainer = document.createElement('div');
  imgContainer.classList.add('image-container');
  
  const img = document.createElement('img');
  img.src = imageSrc;
  img.classList.add('preview-image');
  img.addEventListener('click', () => openModal(img.src, img));
  
  imgContainer.appendChild(img);
  return imgContainer;
}

function processOCRResult(img, ocrResult) {
  if (!ocrResult?.success || !ocrResult?.analysis) {
      updateLabelToError(img.parentElement);
      return;
  }

  const category = determineCategory(ocrResult.analysis.type);
  if (category) {
      applyCategory(img, category);
  } else {
      updateLabelToError(img.parentElement);
  }

  Object.entries(ocrResult.analysis).forEach(([key, value]) => {
      img.setAttribute(`ocr-${key}`, value);
  });
}

function updateLabelToError(container) {
  const label = container.querySelector('.category-label');
  if (label) {
      label.classList.remove('loading');
      label.classList.add('error');
      label.innerHTML = 'Unable to analyze';
  }
}

function determineCategory(type) {
  const categoryMap = {
    'Character': 'Character',
    'Weapon': 'Weapon',
    'Forte': 'Forte',
    'Sequences': 'Sequences',
    'Echo': 'Echo'
  };
  return categoryMap[type] || null;
}

function applyCategory(img, category) {
  imageAssignments[category] = img;

  const label = img.parentElement.querySelector('.category-label');
  if (label) {
      label.classList.remove('loading');
      label.textContent = `Detected: ${category}`;
  }
}