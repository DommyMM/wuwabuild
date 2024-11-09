let characters = [];
const maxButton = document.getElementById('maxButton');
let clickCount = 0;

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

function createSkillBranch({ skillName, skillKey, treeKey }) {
    const skillBranchDiv = document.createElement('div');
    skillBranchDiv.className = 'skill-branch';

    const upperNodeContainer = createNodeContainer(treeKey, `${treeKey}-top`, 'Top Node', 'upper-line');
    skillBranchDiv.appendChild(upperNodeContainer);

    const lowerLine = document.createElement('div');
    lowerLine.className = 'lower-line';
    skillBranchDiv.appendChild(lowerLine);

    const lowerNodeContainer = createNodeContainer(treeKey, `${treeKey}-middle`, 'Middle Node');
    skillBranchDiv.appendChild(lowerNodeContainer);

    const bottomWrapper = createBottomWrapper(skillName, skillKey);
    skillBranchDiv.appendChild(bottomWrapper);

    return skillBranchDiv;
}

function createNodeContainer(treeKey, skillKey, altText, lineClass) {
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'node-container';

    if (lineClass) {
        const line = document.createElement('div');
        line.className = lineClass;
        nodeContainer.appendChild(line);
    }

    const glowingNode = document.createElement('div');
    glowingNode.className = 'glowing-node';
    glowingNode.dataset.tree = treeKey;
    glowingNode.dataset.skill = skillKey;
    glowingNode.onclick = () => glowingNode.classList.toggle('active');

    const nodeImage = document.createElement('img');
    nodeImage.className = 'node-image';
    nodeImage.alt = altText;
    glowingNode.appendChild(nodeImage);

    nodeContainer.appendChild(glowingNode);

    return nodeContainer;
}


function createBottomWrapper(skillName, skillKey) {
    const bottomWrapper = document.createElement('div');
    bottomWrapper.className = 'bottom-wrapper';

    const forteSlot = document.createElement('div');
    forteSlot.className = 'forte-slot';
    forteSlot.dataset.skill = skillKey;

    const skillImage = document.createElement('img');
    skillImage.className = 'skill-image';
    skillImage.alt = skillName;
    forteSlot.appendChild(skillImage);

    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    forteSlot.appendChild(nodeContent);

    bottomWrapper.appendChild(forteSlot);

    const skillInfo = document.createElement('div');
    skillInfo.className = 'skill-info';

    const levelDisplay = document.createElement('div');
    levelDisplay.className = 'level-display';
    levelDisplay.innerHTML = `Lv. <input type="number" class="skill-input" value="1" min="0" max="10">/10`;
    skillInfo.appendChild(levelDisplay);

    const skillNameDiv = document.createElement('div');
    skillNameDiv.className = 'skill-name';
    skillNameDiv.textContent = skillName;
    skillInfo.appendChild(skillNameDiv);

    bottomWrapper.appendChild(skillInfo);

    return bottomWrapper;
}

function createMaxButton() {
    const maxWrapper = document.createElement('div');
    maxWrapper.className = 'max-wrapper';

    const maxButton = document.createElement('img');
    maxButton.id = 'maxButton';
    maxButton.className = 'max-frame';
    maxButton.src = 'images/Resources/Max.png';
    maxButton.alt = 'Max Frame';
    maxButton.title = 'First click: Set all levels to 10\nSecond click: Activate all nodes\nThird click: Reset everything';
    maxWrapper.appendChild(maxButton);

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

    return maxWrapper;
}

function createForteGroup() {
    const forteGroup = document.querySelector('.forte-group');
    forteGroup.innerHTML = '';

    const forteSlots = document.createElement('div');
    forteSlots.className = 'forte-slots';

    const skillBranches = [
        { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1' },
        { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2' },
        { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3' },
        { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4' },
        { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5' }
    ];

    skillBranches.forEach(branch => {
        const skillBranchDiv = createSkillBranch(branch);
        forteSlots.appendChild(skillBranchDiv);
    });

    forteGroup.appendChild(forteSlots);
    forteGroup.appendChild(createMaxButton());
}


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