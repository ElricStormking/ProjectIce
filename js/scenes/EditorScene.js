class EditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorScene' });
        this.selectedLevel = 1; // Represents the currently loaded/processed level in the scene logic
        this.uiSelectedLevel = 1; // Represents the level currently selected in the HTML dropdown
        this.levelManager = null;
        this.blockTypes = null;
        this.chibiImage = null;
        this.gridGraphics = null;
        this.blockRenderGroup = null; // Phaser Group for block sprites
        this.blockGridData = []; // Stores the state of blocks {x, y, type} NO SPRITE HERE
        this.currentBlockSize = 20; // Fixed block size
        this.selectedBlockType = 'STANDARD';
        this.isLoadingLevelData = false; // Add this lock flag

        this.BOMB_TYPES_CONST = {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',
            RICOCHET: 'ricochet_bomb'
        };
         // For mapping saved block types to BlockTypes constants
        this.stringToBlockType = {};
    }

    init(data) {
        // Assign to the global instance variable AS EARLY AS POSSIBLE.
        editorSceneInstance = this;
        console.log("[EditorScene.init] editorSceneInstance has been set.");

        const initialLevel = data.level || parseInt(document.getElementById('level-select').value) || 1;
        this.selectedLevel = initialLevel;
        this.uiSelectedLevel = initialLevel; 
        console.log(`EditorScene initialized for level: ${this.selectedLevel}. UI selected: ${this.uiSelectedLevel}`);
    }

    preload() {
        // this.load.image('iceBlockPlaceholder', 'assets/images/ice_block_test.png'); // Removed to prevent 404
    }

    create() {
        console.log("EditorScene create started.");
        this.levelManager = new LevelManager(this);
        this.blockTypes = new BlockTypes();
        this.populateBlockTypeMapping();

        this.blockRenderGroup = this.add.group();
        this.cameras.main.setBackgroundColor('#4A4A4A');
        this.gridGraphics = this.add.graphics({ lineStyle: { width: 1, color: 0x666666, alpha: 0.5 } });

        this.populateBlockTypeSelector();
        this.populateBombSelectors();

        const initialLevelToLoad = this.selectedLevel;
        this.loadLevelDataForEditing(initialLevelToLoad);

        this.input.on('pointerdown', this.handleGridClick, this);
        document.getElementById('block-type-select').addEventListener('change', (event) => {
            this.selectedBlockType = event.target.value;
        });
        console.log("EditorScene create complete.");
    }
    
    populateBlockTypeMapping() {
        for (const key in this.blockTypes.TYPES) {
            this.stringToBlockType[this.blockTypes.TYPES[key].toUpperCase()] = this.blockTypes.TYPES[key];
        }
    }

    populateBlockTypeSelector() {
        const selectElement = document.getElementById('block-type-select');
        selectElement.innerHTML = '';
        Object.values(this.blockTypes.TYPES).forEach(typeValue => {
            const option = document.createElement('option');
            option.value = typeValue;
            option.textContent = typeValue.charAt(0).toUpperCase() + typeValue.slice(1).toLowerCase();
            selectElement.appendChild(option);
        });
        if (selectElement.options.length > 0) {
            this.selectedBlockType = selectElement.options[0].value;
        }
    }

    populateBombSelectors() {
        const bombCountsContainer = document.getElementById('bomb-counts-container');
        const unlockedBombSelect = document.getElementById('unlocked-bomb-select');
        bombCountsContainer.innerHTML = '';
        while (unlockedBombSelect.options.length > 1) unlockedBombSelect.remove(1);

        Object.values(this.BOMB_TYPES_CONST).forEach(bombKey => {
            const div = document.createElement('div');
            div.classList.add('control-group');
            const label = document.createElement('label');
            label.setAttribute('for', `bomb-count-${bombKey}`);
            label.textContent = `${bombKey.replace(/_/g, ' ').replace(/bomb/gi, 'Bomb').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Count:`;
            const input = document.createElement('input');
            input.type = 'number'; input.id = `bomb-count-${bombKey}`; input.name = bombKey; input.value = 0; input.min = 0;
            div.appendChild(label); div.appendChild(input);
            bombCountsContainer.appendChild(div);

            const option = document.createElement('option');
            option.value = bombKey;
            option.textContent = bombKey.replace(/_/g, ' ').replace(/bomb/gi, 'Bomb').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            unlockedBombSelect.appendChild(option);
        });
    }

    async loadLevelDataForEditing(levelNumber) {
        if (this.isLoadingLevelData) {
            console.warn(`[EditorScene.loadLevelDataForEditing] Already loading data for level ${this.selectedLevel}. Request for ${levelNumber} ignored.`);
            return;
        }
        this.isLoadingLevelData = true;
        console.log(`[EditorScene.loadLevelDataForEditing] LOCK ACQUIRED for level ${levelNumber}`);

        try {
            // levelNumber here comes from the HTML click handler, which should be using editorSceneInstance.uiSelectedLevel
            console.log(`[EditorScene.loadLevelDataForEditing] Received levelNumber: ${levelNumber}. Current this.selectedLevel before update: ${this.selectedLevel}, Current this.uiSelectedLevel: ${this.uiSelectedLevel}`);
            
            this.selectedLevel = parseInt(levelNumber); // Update the scene's active processing level
            // this.uiSelectedLevel should already be up-to-date thanks to the 'change' listener on the dropdown
            document.getElementById('level-select').value = this.selectedLevel; // Sync dropdown visual just in case
            
            console.log(`[EditorScene.loadLevelDataForEditing] Editor's this.selectedLevel is NOW: ${this.selectedLevel}. (uiSelectedLevel is ${this.uiSelectedLevel}). Passing this.selectedLevel to LevelManager.`);

            this.levelManager.setLevel(this.selectedLevel);
            await this.levelManager.initialize();
            console.log(`[EditorScene.loadLevelDataForEditing] After LevelManager.initialize() for level ${this.selectedLevel}. LevelManager's currentLevel is REPORTEDLY: ${this.levelManager.currentLevel}. Now getting Chibi key.`);

            // Before loading new, attempt to remove previously loaded dynamic chibi texture from cache
            if (this.chibiImage && this.chibiImage.texture && this.chibiImage.texture.key.startsWith('editor_chibi_lvl')) {
                if (this.textures.exists(this.chibiImage.texture.key)) {
                    console.log(`Editor: Removing previous dynamic texture from cache: ${this.chibiImage.texture.key}`);
                    this.textures.remove(this.chibiImage.texture.key);
                }
            }

            this.clearChibi();
            this.clearAllBlocksInternal(false); // Clear data only, sprites cleared by renderBlocks

            const chibiKeyFromManager = this.levelManager.getChibiImageKey(); // e.g., "chibi_girl1" or "custom_name_from_config"
            
            // Use a unique key for Phaser's loader, incorporating level and original key + timestamp
            const dynamicLoadKeySuffix = (chibiKeyFromManager || 'default').replace(/[^a-zA-Z0-9]/g, '_');
            const chibiDynamicLoadKey = `editor_chibi_lvl${this.selectedLevel}_${dynamicLoadKeySuffix}_${Date.now()}`;

            let primaryChibiPath;
            if (chibiKeyFromManager) {
                primaryChibiPath = `assets/images/level${this.selectedLevel}/${chibiKeyFromManager}.png`;
            } else {
                console.warn(`Editor: chibiKeyFromManager is null or empty for level ${this.selectedLevel}. Attempting a generic fallback name.`);
                primaryChibiPath = `assets/images/level${this.selectedLevel}/chibi_girl.png`; 
            }
            
            const checkAndLoadChibi = (pathAttempt, keyForLoad, isGenericFallbackAttempt = false) => {
                // We ALWAYS want to attempt a load with the unique keyForLoad for the editor context.
                // Avoid directly using a cached chibiKeyFromManager unless it's a last resort after a load error.

                console.log(`Editor: Attempting to load Chibi from ${pathAttempt} with key ${keyForLoad}`);
                this.load.image(keyForLoad, pathAttempt);
                this.load.once(`filecomplete-image-${keyForLoad}`, () => {
                    console.log(`Editor: Successfully loaded image with key ${keyForLoad} from ${pathAttempt}`);
                    this.displayChibiImage(keyForLoad); // Display using the key we just loaded with
                    this.afterChibiLoaded();
                });
                this.load.once('loaderror', (fileObj) => {
                    if (fileObj.key === keyForLoad) {
                        console.warn(`Editor: Failed to load chibi from ${pathAttempt}. Key: ${keyForLoad}`);
                        if (!isGenericFallbackAttempt) {
                            const genericChibiName = 'chibi_girl.png'; // Standard generic name
                            const genericChibiPath = `assets/images/level${this.selectedLevel}/${genericChibiName}`;
                            
                            if (pathAttempt !== genericChibiPath) { 
                                console.log(`Editor: Trying generic chibi path: ${genericChibiPath}`);
                                const fallbackKey = `editor_chibi_lvl${this.selectedLevel}_generic_${Date.now()}`;
                                checkAndLoadChibi(genericChibiPath, fallbackKey, true);
                            } else {
                                console.warn("Editor: Primary attempt was already the generic path, and it failed. Displaying placeholder.");
                                this.displayChibiImage(null); 
                                this.afterChibiLoaded(); 
                            }
                        } else {
                            console.warn("Editor: Already tried the generic fallback, and it also failed. Displaying placeholder.");
                            this.displayChibiImage(null); 
                            this.afterChibiLoaded();
                        }
                    }
                });
                this.load.start();
            };
            
            checkAndLoadChibi(primaryChibiPath, chibiDynamicLoadKey, !chibiKeyFromManager); 
        } finally {
            this.isLoadingLevelData = false;
            console.log(`[EditorScene.loadLevelDataForEditing] LOCK RELEASED for level ${this.selectedLevel}`);
        }
    }

    afterChibiLoaded() {
        // this.currentBlockSize is now fixed, no need to get from levelManager for this purpose
        // document.getElementById('block-size-input').value = this.currentBlockSize; // UI element removed
        document.getElementById('target-percentage-input').value = this.levelManager.getTargetPercentage();
        document.getElementById('max-shots-input').value = this.levelManager.getMaxShots();

        const blockLayoutData = this.levelManager.getCurrentBlockLayout();
        if (blockLayoutData) {
            this.parseAndStoreBlockLayout(blockLayoutData);
        }
        this.drawGrid();
        this.renderBlocks();

        const availableBombs = this.levelManager.getCurrentAvailableBombs(); // This should be the bombCounts object
        const unlockedBomb = this.levelManager.getUnlockedBombType();

        if (availableBombs) {
            Object.keys(availableBombs).forEach(bombKey => {
                const inputElement = document.getElementById(`bomb-count-${bombKey}`);
                if (inputElement) inputElement.value = availableBombs[bombKey];
            });
        }
        document.getElementById('unlocked-bomb-select').value = unlockedBomb || "";
        console.log("Editor: Level data settings applied.");
    }

    displayChibiImage(chibiTextureKey) {
        this.clearChibi();

        const gameWidth = 1920; // Fixed game width
        const gameHeight = 1080; // Fixed game height

        // Position Chibi as in GameScene: 70% of screen width, centered vertically
        const chibiX = Math.floor(gameWidth * 0.7);
        const chibiY = gameHeight / 2;

        if (this.textures.exists(chibiTextureKey)) {
            this.chibiImage = this.add.image(chibiX, chibiY, chibiTextureKey);
            this.chibiImage.setDepth(1); // Ensure it's above background but below grid/blocks
            this.chibiImage.isPlaceholder = false;
            console.log(`EditorScene: Displayed Chibi '${chibiTextureKey}' at x: ${chibiX}, y: ${chibiY}`);
        } else {
            // Fallback for missing texture (should ideally not happen if preloaded)
            console.error(`EditorScene: Chibi texture '${chibiTextureKey}' not found. Displaying placeholder.`);
            const placeholder = this.add.rectangle(chibiX, chibiY, 300, 600, 0xff00ff, 0.5).setDepth(1);
            this.chibiImage = placeholder; // Assign placeholder to this.chibiImage
            this.chibiImage.isPlaceholder = true;
            this.chibiImage.texture = { key: 'placeholder_chibi_texture' }; // Mock texture key for placeholder
        }
        this.events.emit('chibiImageReady');
    }

    clearChibi() {
        if (this.chibiImage) {
            this.chibiImage.destroy();
            this.chibiImage = null;
        }
    }

    drawGrid() {
        if (this.gridGraphics) {
            this.gridGraphics.clear();
        } else {
            this.gridGraphics = this.add.graphics();
        }
        this.gridGraphics.setDepth(2); // Grid above Chibi, below blocks
        this.gridGraphics.lineStyle(1, 0xffffff, 0.1); 

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        for (let x = 0; x < width; x += this.currentBlockSize) {
            this.gridGraphics.lineStyle(1, 0xffffff, 0.1).beginPath().moveTo(x, 0).lineTo(x, height).stroke();
        }
        for (let y = 0; y < height; y += this.currentBlockSize) {
            this.gridGraphics.lineStyle(1, 0xffffff, 0.1).beginPath().moveTo(0, y).lineTo(width, y).stroke();
        }
    }
    
    parseAndStoreBlockLayout(blockLayoutData) {
        this.blockGridData = []; // Clear existing data
        if (!blockLayoutData) return;

        // Block size from data is for interpretation of old formats; new blocks are placed based on currentBlockSize (20)
        // const blockSizeFromData = blockLayoutData.blockSize || this.currentBlockSize; 
        
        if (blockLayoutData.blockPositions && Array.isArray(blockLayoutData.blockPositions)) {
            blockLayoutData.blockPositions.forEach(typeGroup => {
                const blockTypeConst = this.stringToBlockType[typeGroup.type.toUpperCase()] || this.blockTypes.TYPES.STANDARD;
                if (typeGroup.type && Array.isArray(typeGroup.positions)) {
                    typeGroup.positions.forEach(pos => {
                        // Store absolute positions as provided by the file
                        this.blockGridData.push({ x: pos.x, y: pos.y, type: blockTypeConst });
                    });
                }
            });
        } 
        else if (blockLayoutData.gridOrigin && blockLayoutData.blocks && Array.isArray(blockLayoutData.blocks)) {
            const { gridOrigin, blocks } = blockLayoutData;
            const fileBlockSize = blockLayoutData.blockSize || 40; // Assume old default if not specified
            blocks.forEach(blockData => {
                const blockTypeConst = this.stringToBlockType[blockData.type.toUpperCase()] || this.blockTypes.TYPES.STANDARD;
                // Calculate absolute center X, Y from old grid format
                const x = gridOrigin.x + (blockData.col * fileBlockSize) + (fileBlockSize / 2);
                const y = gridOrigin.y + (blockData.row * fileBlockSize) + (fileBlockSize / 2);
                this.blockGridData.push({ x: x, y: y, type: blockTypeConst });
            });
        }
    }

    renderBlocks() {
        this.blockRenderGroup.clear(true, true); // Destroy children
        this.blockGridData.forEach(blockData => {
            const blockSprite = this.add.rectangle(blockData.x, blockData.y, this.currentBlockSize, this.currentBlockSize, this.getBlockColor(blockData.type), 0.7)
                .setStrokeStyle(1, 0xffffff, 0.5);
            blockSprite.setDepth(3); // Blocks above Chibi (1) and Grid (2)
            this.blockRenderGroup.add(blockSprite);
        });
    }
    
    getBlockColor(blockType) {
        // blockType is expected to be lowercase e.g. 'standard', 'strong' as stored in blockGridData
        // console.log(`getBlockColor: received blockType '${blockType}'`);
        // console.log(`Comparing with STANDARD: '${this.blockTypes.TYPES.STANDARD}', STRONG: '${this.blockTypes.TYPES.STRONG}'`);

        if (!blockType || !this.blockTypes.isValidType(blockType)) {
            // console.log('getBlockColor: blockType is invalid or undefined, returning default gray');
            return 0xcccccc; // Default for undefined or invalid type
        }

        // Use the getColor method from BlockTypes instance for consistency
        return this.blockTypes.getColor(blockType);
    }

    handleGridClick(pointer) {
        const cam = this.cameras.main;
        const clickX = pointer.x; // Already world coordinates
        const clickY = pointer.y;

        const gridCol = Math.floor(clickX / this.currentBlockSize);
        const gridRow = Math.floor(clickY / this.currentBlockSize);

        const blockCenterX = gridCol * this.currentBlockSize + this.currentBlockSize / 2;
        const blockCenterY = gridRow * this.currentBlockSize + this.currentBlockSize / 2;

        const existingBlockIndex = this.blockGridData.findIndex(b => 
            Math.abs(b.x - blockCenterX) < (this.currentBlockSize * 0.1) && // Tighter check for removal
            Math.abs(b.y - blockCenterY) < (this.currentBlockSize * 0.1)
        );

        if (existingBlockIndex !== -1) {
            this.blockGridData.splice(existingBlockIndex, 1);
            console.log(`Editor: Removed block at (${blockCenterX.toFixed(0)}, ${blockCenterY.toFixed(0)})`);
        } else {
            const selectedTypeConstant = this.stringToBlockType[this.selectedBlockType.toUpperCase()] || this.selectedBlockType;
            this.blockGridData.push({ x: blockCenterX, y: blockCenterY, type: selectedTypeConstant });
            console.log(`Editor: Added ${this.selectedBlockType} block at (${blockCenterX.toFixed(0)}, ${blockCenterY.toFixed(0)})`);
        }
        this.renderBlocks();
    }

    clearAllBlocksInternal(alsoRender = true) {
        this.blockGridData = [];
        if (alsoRender) {
            this.renderBlocks();
        }
    }

    clearAllBlocks() {
        this.clearAllBlocksInternal(true);
        console.log("Editor: Cleared all blocks from grid.");
    }

    generateInitialBlocks() {
        if (!this.chibiImage || this.chibiImage.isPlaceholder || !this.chibiImage.texture || this.chibiImage.texture.key === Phaser.Textures.MISSING) {
            alert("Chibi image not properly loaded. Cannot generate initial blocks.");
            return;
        }
        this.clearAllBlocksInternal(false);

        const texture = this.textures.get(this.chibiImage.texture.key);
        const sourceImage = texture.getSourceImage(); 
        if (!sourceImage || !sourceImage.width || !sourceImage.height) {
             alert("Chibi texture source image is invalid. Cannot generate initial blocks.");
            return;
        }

        // Create a temporary canvas using standard DOM methods
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceImage.width;
        tempCanvas.height = sourceImage.height;
        const tempContext = tempCanvas.getContext('2d');
        
        if (!tempContext) {
            alert("Failed to get 2D context from temporary canvas. Cannot generate initial blocks.");
            return;
        }
        tempContext.drawImage(sourceImage, 0, 0);

        const alphaThreshold = 30; 
        
        // Dimensions of the Chibi image as it's displayed on the screen
        // These account for the frame's size and any scaling applied to the Phaser Image object.
        const chibiDisplayWidthOnScreen = this.chibiImage.displayWidth;
        const chibiDisplayHeightOnScreen = this.chibiImage.displayHeight;
        
        // Scale factors of the Phaser Image object itself
        const chibiScaleX = this.chibiImage.scaleX;
        const chibiScaleY = this.chibiImage.scaleY;

        // The frame's actual unscaled dimensions and offset within the source texture (atlas)
        const frameCutX = this.chibiImage.frame.cutX;
        const frameCutY = this.chibiImage.frame.cutY;
        const frameCutWidth = this.chibiImage.frame.cutWidth;   // Unscaled width of the Chibi character part
        const frameCutHeight = this.chibiImage.frame.cutHeight; // Unscaled height of the Chibi character part

        // Calculate the top-left position of the displayed Chibi image on the main canvas
        // This should use the actual position of the this.chibiImage object
        const chibiActualTopLeftX = this.chibiImage.x - (chibiDisplayWidthOnScreen / 2);
        const chibiActualTopLeftY = this.chibiImage.y - (chibiDisplayHeightOnScreen / 2);
        const chibiActualBottomRightX = chibiActualTopLeftX + chibiDisplayWidthOnScreen;
        const chibiActualBottomRightY = chibiActualTopLeftY + chibiDisplayHeightOnScreen;

        console.log(`Editor GenerateInitialBlocks Debug:
  Chibi Display W/H on screen: ${chibiDisplayWidthOnScreen.toFixed(1)} / ${chibiDisplayHeightOnScreen.toFixed(1)}
  Chibi Object ScaleX/Y: ${chibiScaleX.toFixed(2)} / ${chibiScaleY.toFixed(2)}
  Source Image (Atlas/File) W/H: ${sourceImage.width} / ${sourceImage.height}
  Frame cutX/cutY: ${frameCutX}/${frameCutY}, Frame cutW/cutH: ${frameCutWidth}/${frameCutHeight}
  Chibi Canvas TopLeft X/Y: ${chibiActualTopLeftX.toFixed(1)} / ${chibiActualTopLeftY.toFixed(1)}`
        );

        const samplePoints = [
            { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.25 },
            { x: 0.50, y: 0.50 },
            { x: 0.25, y: 0.75 }, { x: 0.75, y: 0.75 }
        ];
        const canvasWidth = this.cameras.main.width; 
        const canvasHeight = this.cameras.main.height; 

        let blocksPlacedCount = 0;

        for (let gridY = 0; gridY < canvasHeight; gridY += this.currentBlockSize) {
            for (let gridX = 0; gridX < canvasWidth; gridX += this.currentBlockSize) {
                
                let blockShouldBePlaced = false;
                const cellCenterX_onCanvas = gridX + this.currentBlockSize / 2;
                const cellCenterY_onCanvas = gridY + this.currentBlockSize / 2;

                // Check if the center of the current grid cell is within the Chibi's displayed bounding box on screen
                if (cellCenterX_onCanvas >= chibiActualTopLeftX && 
                    cellCenterX_onCanvas < chibiActualBottomRightX &&
                    cellCenterY_onCanvas >= chibiActualTopLeftY &&
                    cellCenterY_onCanvas < chibiActualBottomRightY) {

                    // Coordinate of cell center relative to the Chibi's display top-left
                    const cellCenterX_relativeToChibiDisplay = cellCenterX_onCanvas - chibiActualTopLeftX;
                    const cellCenterY_relativeToChibiDisplay = cellCenterY_onCanvas - chibiActualTopLeftY;

                    for (const point of samplePoints) {
                        // Offset of sample point from cell center
                        const sampleOffsetX_fromCellCenter = (point.x - 0.5) * this.currentBlockSize;
                        const sampleOffsetY_fromCellCenter = (point.y - 0.5) * this.currentBlockSize;

                        // Absolute position of sample point, relative to Chibi's display top-left
                        const sampleX_relativeToChibiDisplay = cellCenterX_relativeToChibiDisplay + sampleOffsetX_fromCellCenter;
                        const sampleY_relativeToChibiDisplay = cellCenterY_relativeToChibiDisplay + sampleOffsetY_fromCellCenter;

                        // Convert this on-screen coordinate (relative to displayed Chibi) to a coordinate on the unscaled frame
                        // This accounts for any scaling applied to the this.chibiImage Phaser object.
                        const sampleX_on_unscaled_frame = sampleX_relativeToChibiDisplay / chibiScaleX;
                        const sampleY_on_unscaled_frame = sampleY_relativeToChibiDisplay / chibiScaleY;

                        // Now, convert the coordinate on the unscaled frame to a coordinate on the original source image (texture atlas)
                        // by adding the frame's starting offset (cutX, cutY).
                        const sampleXInOriginalImage = Math.floor(frameCutX + sampleX_on_unscaled_frame);
                        const sampleYInOriginalImage = Math.floor(frameCutY + sampleY_on_unscaled_frame);

                        // Check if this sample point on the unscaled frame is within the frame's actual bounds
                        // And also ensure the final coordinate on the sourceImage is within the sourceImage bounds for safety before sampling.
                        if (sampleX_on_unscaled_frame >= 0 && sampleX_on_unscaled_frame < frameCutWidth && 
                            sampleY_on_unscaled_frame >= 0 && sampleY_on_unscaled_frame < frameCutHeight &&
                            sampleXInOriginalImage >= 0 && sampleXInOriginalImage < sourceImage.width &&
                            sampleYInOriginalImage >= 0 && sampleYInOriginalImage < sourceImage.height) {
                            try {
                                const pixelData = tempContext.getImageData(sampleXInOriginalImage, sampleYInOriginalImage, 1, 1).data;
                                if (pixelData[3] >= alphaThreshold) {
                                    blockShouldBePlaced = true;
                                    break; 
                                }
                            } catch (e) { 
                                // console.warn(`getImageData error at (${sampleXInOriginalImage}, ${sampleYInOriginalImage}): ${e.message}`);
                                // Usually due to out-of-bounds sampling if checks above are not perfect, or tainted canvas from cross-origin.
                                // For local files, cross-origin shouldn't be an issue for getImageData with Phaser's loader.
                            }
                        }
                    }
                }

                if (blockShouldBePlaced) {
                    this.blockGridData.push({
                        x: cellCenterX_onCanvas, 
                        y: cellCenterY_onCanvas, 
                        type: this.blockTypes.TYPES.STANDARD 
                    });
                    blocksPlacedCount++;
                }
            }
        }
        // No need to explicitly destroy tempCanvas when created with document.createElement
        // It will be garbage collected if not added to the DOM.
        this.renderBlocks();
        console.log(`Editor: Generated initial blocks. Placed ${blocksPlacedCount} blocks.`);
    }
    
    generateJsonOutput() {
        const currentLevel = this.selectedLevel;

        const levelConfigData = {
            levelNumber: parseInt(currentLevel),
            chibiImageKey: this.levelManager.getChibiImageKey() || `chibi_girl${currentLevel}`,
            victoryBackgroundKey: this.levelManager.getVictoryBackgroundKey() || `victoryBackground${currentLevel}`,
            backgroundImageKey: this.levelManager.getBackgroundKey() || `background${currentLevel}`,
            targetPercentage: parseInt(document.getElementById('target-percentage-input').value) || 85,
            blockSize: this.currentBlockSize, 
            maxShots: parseInt(document.getElementById('max-shots-input').value) || 20,
            unlockedBomb: document.getElementById('unlocked-bomb-select').value || null,
            blockLayoutPath: 'block_layout.json', // These paths are relative to the level folder
            availableBombsPath: 'available_bombs.json' // These paths are relative to the level folder
        };
        const levelConfigStr = JSON.stringify(levelConfigData, null, 2);
        document.getElementById('level-config-output').value = levelConfigStr;
        // console.log("--- level_config.json ---");
        // console.log(levelConfigStr);
        this.triggerDownload(levelConfigStr, `level_config_lvl${currentLevel}.json`);

        const blocksByType = {};
        this.blockGridData.forEach(block => {
            const typeKey = block.type.toUpperCase();
            if (!blocksByType[typeKey]) blocksByType[typeKey] = [];
            blocksByType[typeKey].push({ x: Math.round(block.x), y: Math.round(block.y) }); 
        });

        const blockPositionsArray = Object.keys(blocksByType).map(type => ({
            type: type, 
            positions: blocksByType[type]
        }));        
        
        const blockLayoutOutput = {
            blockSize: this.currentBlockSize, 
            blockPositions: blockPositionsArray 
        };
        const blockLayoutStr = JSON.stringify(blockLayoutOutput, null, 2);
        document.getElementById('block-layout-output').value = blockLayoutStr;
        // console.log("--- block_layout.json ---");
        // console.log(blockLayoutStr);
        this.triggerDownload(blockLayoutStr, `block_layout_lvl${currentLevel}.json`);

        const bombCounts = {};
        Object.values(this.BOMB_TYPES_CONST).forEach(bombKey => {
            const countInput = document.getElementById(`bomb-count-${bombKey}`);
            if (countInput) bombCounts[bombKey] = parseInt(countInput.value) || 0;
        });
        const availableBombsOutput = {
            bombCounts: bombCounts,
            unlockedBomb: document.getElementById('unlocked-bomb-select').value || null
        };
        const availableBombsStr = JSON.stringify(availableBombsOutput, null, 2);
        document.getElementById('available-bombs-output').value = availableBombsStr;
        // console.log("--- available_bombs.json ---");
        // console.log(availableBombsStr);
        this.triggerDownload(availableBombsStr, `available_bombs_lvl${currentLevel}.json`);

        alert(`JSON data for level ${currentLevel} is being downloaded. Please move the files from your Downloads folder to the appropriate assets/images/level${currentLevel}/ directory, renaming them to level_config.json, block_layout.json, and available_bombs.json respectively.`);
    }

    triggerDownload(jsonString, filename) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Make scene instance globally available for HTML to call its methods
// This is a common way for simple Phaser+HTML interaction but consider events for more complex apps.
// window.editorSceneInstance is already declared in the HTML script tag. 