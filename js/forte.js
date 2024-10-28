function updateForteIcons(characterName) {
    const imagePaths = {
        "normal-attack": `images/Skills/${characterName}/SP_Icon${characterName}A1.png`,
        "skill": `images/Skills/${characterName}/SP_Icon${characterName}B1.png`,
        "tree3-top": `images/Skills/${characterName}/SP_Icon${characterName}D2.png`,
        "tree3-middle": `images/Skills/${characterName}/SP_Icon${characterName}D1.png`,
        "circuit": `images/Skills/${characterName}/SP_Icon${characterName}Y.png`,
        "liberation": `images/Skills/${characterName}/SP_Icon${characterName}C1.png`,
        "intro": `images/Skills/${characterName}/SP_Icon${characterName}QTE.png`
    };

    const sharedImages = {
        "tree1": `images/Skills/${characterName}/Bonus1.png`,
        "tree5": `images/Skills/${characterName}/Bonus1.png`,
        "tree2": `images/Skills/${characterName}/Bonus2.png`,
        "tree4": `images/Skills/${characterName}/Bonus2.png`
    };

    //Assign unique images to forte slots
    document.querySelectorAll(".forte-slot").forEach(slot => {
        const skillType = slot.getAttribute("data-skill");
        const imagePath = imagePaths[skillType];
        
        if (imagePath) {
            const imgElement = slot.querySelector(".skill-image");
            imgElement.src = imagePath;
            imgElement.alt = `${skillType} icon`;
        }
    });

    //Assign shared and custom images to glowing nodes
    document.querySelectorAll(".glowing-node").forEach(node => {
        const tree = node.getAttribute("data-tree");
        const skillType = node.getAttribute("data-skill");

        //Check if the node should have a unique image or shared image
        const imagePath = imagePaths[skillType] || sharedImages[tree];
        
        if (imagePath) {
            const imgElement = node.querySelector("img");
            if (imgElement) {
                imgElement.src = imagePath;
                imgElement.alt = `${skillType || tree} icon`;
            }
        }
    });
}

document.querySelectorAll('.skill-input').forEach(input => {
    input.addEventListener('click', function() {
        this.value = '';
        this.focus();
        this.select();
    });
 

    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === 'Escape') {
            this.blur();  
        }
    });
 
    // Check bounds and handle empty when leaving focus
    input.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            this.value = '1';
        } else {
            if (this.value > 10) this.value = 10;
            if (this.value < 1) this.value = 1;
        }
    });
 });

const maxButton = document.getElementById('maxButton');
let clickCount = 0;

maxButton.addEventListener('click', () => {
    clickCount = (clickCount + 1) % 3;  
    
    //Update the image based on click count
    const maxImage = document.querySelector('.max-frame');
    maxImage.src = `images/Resources/Max${clickCount === 0 ? '' : clickCount}.png`;

    //Update functionality based on click count
    if (clickCount === 1) {
        //First click: Set all levels to 10
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 10;
        });
    } else if (clickCount === 2) {
        //Second click: Toggle all nodes on
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.add('active');
        });
    } else if (clickCount === 0) {  
        //Third click: Reset everything and return to empty Max.png
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 1;
        });
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.remove('active');
        });
    }
});