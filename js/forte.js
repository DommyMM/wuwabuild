let characters = [];

fetch('Data/Characters.json')
    .then(response => response.json())
    .then(data => {
        characters = data;
    })
    .catch(error => console.error('Error loading characters:', error));

const forteImagePaths = {
    imagePaths: {
        "normal-attack": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}A1.png`,
        "skill": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}B1.png`,
        "tree3-top": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}D2.png`,
        "tree3-middle": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}D1.png`,
        "circuit": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}Y.png`,
        "liberation": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}C1.png`,
        "intro": (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}QTE.png`
    },
    sharedImages: {
        "tree1": (characterName) => {
            const character = characters.find(char => char.name === characterName);
            return character && character.Bonus1 ? 
                `images/Stats/${character.Bonus1}.png` : '';
        },
        "tree5": (characterName) => {
            const character = characters.find(char => char.name === characterName);
            return character && character.Bonus1 ? 
                `images/Stats/${character.Bonus1}.png` : '';
        },
        "tree2": (characterName) => {
            const character = characters.find(char => char.name === characterName);
            return character && character.Bonus2 ? 
                `images/Stats/${character.Bonus2}.png` : '';
        },
        "tree4": (characterName) => {
            const character = characters.find(char => char.name === characterName);
            return character && character.Bonus2 ? 
                `images/Stats/${character.Bonus2}.png` : '';
        }
    }
};

function updateForteIcons(characterName) {
    let characterBonus1 = "";
    let characterBonus2 = "";
    let elementImage = "";

    if (characterName === 'RoverHavoc') {
        elementImage = 'Havoc';
        characterBonus1 = 'Havoc';
        characterBonus2 = 'ATK';
    } else if (characterName === 'RoverSpectro') {
        elementImage = 'Spectro';
        characterBonus1 = 'Spectro';
        
    } else {
        const character = characters.find(char => char.name === characterName);
        characterBonus1 = character ? character.Bonus1 : "";
    }
    document.querySelectorAll(".forte-slot").forEach(slot => {
        const skillType = slot.getAttribute("data-skill");
        const imagePath = forteImagePaths.imagePaths[skillType]?.(characterName);
        
        if (imagePath) {
            const imgElement = slot.querySelector(".skill-image");
            imgElement.src = imagePath;
            imgElement.alt = `${skillType} icon`;
        }
    });

    document.querySelectorAll(".glowing-node").forEach(node => {
        const tree = node.getAttribute("data-tree");
        const skillType = node.getAttribute("data-skill");
        let imagePath;

        if ((characterName === 'RoverHavoc' || characterName === 'RoverSpectro') && (tree === 'tree1' || tree === 'tree5')) {
            imagePath = `images/Stats/${elementImage}.png`;
        } else if ((characterName === 'RoverHavoc' || characterName === 'RoverSpectro') && (tree === 'tree2' || tree === 'tree4')) {
            imagePath = `images/Stats/ATK.png`;  
        }else {
            imagePath = forteImagePaths.imagePaths[skillType]?.(characterName) || 
                        forteImagePaths.sharedImages[tree]?.(characterName);
        }
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
    
    const maxImage = document.querySelector('.max-frame');
    maxImage.src = `images/Resources/Max${clickCount === 0 ? '' : clickCount}.png`;

    if (clickCount === 1) {
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 10;
        });
    } else if (clickCount === 2) {
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.add('active');
        });
    } else if (clickCount === 0) {  
        document.querySelectorAll('.skill-input').forEach(input => {
            input.value = 1;
        });
        document.querySelectorAll('.glowing-node').forEach(node => {
            node.classList.remove('active');
        });
    }
});

function createSimplifiedForte(characterName) {
    const forteContainer = document.createElement('div');
    forteContainer.className = 'simplified-forte';

    const branches = [
        { type: 'circle', name: 'normal-attack', tree: 'tree1' },
        { type: 'circle', name: 'skill', tree: 'tree2' },
        { type: 'square', name: 'circuit', tree: 'tree3' },  
        { type: 'circle', name: 'liberation', tree: 'tree4' },
        { type: 'circle', name: 'intro', tree: 'tree5' }
    ];

    let characterBonus1 = "";
    let elementImage = "";

    if (characterName === 'RoverHavoc') {
        elementImage = 'Havoc';
        characterBonus1 = 'Havoc';
    } else if (characterName === 'RoverSpectro') {
        elementImage = 'Spectro';
        characterBonus1 = 'Spectro';
    } else {
        const character = characters.find(char => char.name === characterName);
        characterBonus1 = character ? character.Bonus1 : "";
    }

    branches.forEach(branch => {
        const originalTopNode = document.querySelector(`.glowing-node[data-skill="${branch.tree}-top"]`);
        const originalMiddleNode = document.querySelector(`.glowing-node[data-skill="${branch.tree}-middle"]`);
        const originalLevel = document.querySelector(`.forte-slot[data-skill="${branch.name}"] ~ .skill-info .skill-input`);

        const branchDiv = document.createElement('div');
        branchDiv.className = 'simplified-branch';

        const topNode = document.createElement('div');
        topNode.className = `simplified-node ${branch.type}`;
        if (originalTopNode?.classList.contains('active')) {
            topNode.classList.add('active');
        }
        const topImg = document.createElement('img');
        topImg.className = 'node-image';
        
        if ((branch.tree === 'tree1' || branch.tree === 'tree5') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            topImg.src = `images/Stats/${elementImage}.png`;
        } else if ((branch.tree === 'tree2' || branch.tree === 'tree4') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            topImg.src = `images/Stats/ATK.png`;  
        } else {
            topImg.src = branch.name === 'circuit' ? 
                forteImagePaths.imagePaths['tree3-top'](characterName) :
                forteImagePaths.sharedImages[branch.tree](characterName);
        }
        topNode.appendChild(topImg);

        if (branch.name === 'circuit') {
            const topInnerDiamond = document.createElement('div');
            topInnerDiamond.className = 'inner-diamond';
            topNode.appendChild(topInnerDiamond);
        }

        const middleNode = document.createElement('div');
        middleNode.className = `simplified-node ${branch.type}`;
        if (originalMiddleNode?.classList.contains('active')) {
            middleNode.classList.add('active');
        }
        const middleImg = document.createElement('img');
        middleImg.className = 'node-image';

        if ((branch.tree === 'tree1' || branch.tree === 'tree5') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            middleImg.src = `images/Stats/${elementImage}.png`;
        } else if ((branch.tree === 'tree2' || branch.tree === 'tree4') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            middleImg.src = `images/Stats/ATK.png`;  
        } else {
            middleImg.src = branch.name === 'circuit' ? 
                forteImagePaths.imagePaths['tree3-middle'](characterName) :
                forteImagePaths.sharedImages[branch.tree](characterName);
        }
        middleNode.appendChild(middleImg);

        if (branch.name === 'circuit') {
            const bottomInnerDiamond = document.createElement('div');
            bottomInnerDiamond.className = 'inner-diamond';
            middleNode.appendChild(bottomInnerDiamond);
        }

        const baseNode = document.createElement('div');
        baseNode.className = 'simplified-base';
        const baseImg = document.createElement('img');
        baseImg.className = 'skill-image';

        if ((branch.tree === 'tree1' || branch.tree === 'tree5') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            baseImg.src = `images/Stats/${elementImage}.png`;
        } else if ((branch.tree === 'tree2' || branch.tree === 'tree4') && (characterName === 'RoverHavoc' || characterName === 'RoverSpectro')) {
            baseImg.src = `images/Stats/ATK.png`;
        } else {
            baseImg.src = forteImagePaths.imagePaths[branch.name](characterName);
        }
        baseNode.appendChild(baseImg);

        const levelIndicator = document.createElement('div');
        levelIndicator.className = 'level-indicator';
        levelIndicator.textContent = originalLevel ? originalLevel.value : '1';
        baseNode.appendChild(levelIndicator);

        const topLine = document.createElement('div');
        topLine.className = 'top-line';
        const bottomLine = document.createElement('div');
        bottomLine.className = 'bottom-line';

        branchDiv.appendChild(topNode);
        branchDiv.appendChild(topLine);
        branchDiv.appendChild(middleNode);
        branchDiv.appendChild(bottomLine);
        branchDiv.appendChild(baseNode);

        forteContainer.appendChild(branchDiv);
    });

    return forteContainer;
}