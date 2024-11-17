let currentImage = null; 
const imageAssignments = {}; 

document.addEventListener('paste', async (event) => {
    event.preventDefault();
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
        }
    }
    
    if (imageFiles.length > 0) {
        handleFiles(imageFiles);
    }
});

function openModal(imageSrc, imgElement) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imageSrc;
    modal.style.display = 'flex';
    currentImage = imgElement;
    
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    currentImage = null;
    document.body.style.overflow = '';
}

document.getElementById('imageModal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && document.getElementById('imageModal').style.display === 'flex') {
        closeModal();
    }
});

const closeModalBtn = document.getElementById('closeModal');
closeModalBtn.addEventListener('click', closeModal);

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
            categoryLabel.classList.remove('loading', 'error');
            closeModal();
        }
    });
});

function openTab(tabName) {
    var i, tabcontent;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";
}

document.getElementById("upload").style.display = "block";

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

document.addEventListener('dragover', (event) => {
    event.preventDefault();
});

document.addEventListener('drop', (event) => {
    event.preventDefault();
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