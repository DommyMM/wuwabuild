document.querySelector('.skill-input').addEventListener('input', function(e) {
    if (e.target.value > 10) e.target.value = 10;
    if (e.target.value < 1) e.target.value = 1;
});

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

//Get the max button
const maxButton = document.getElementById('maxButton');
let clickCount = 0;

//Add event listener to handle the different click actions
maxButton.addEventListener('click', () => {
    clickCount = (clickCount + 1) % 3; 

    if (clickCount === 1) {
        //First click: Set all forte levels to 10/10
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 10;
        });
    } else if (clickCount === 2) {
        //Second click: Toggle all nodes on
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.add('active');
        });
    } else {
        //Third click: Revert to Lv 1 and turn all nodes off
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 1;
        });
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.remove('active');
        });
    }
});
