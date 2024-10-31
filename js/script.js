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