class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.revealPercentage = 0;
        this.targetPercentage = 85; // This will be overwritten by LevelManager in create()
        this.UI_DEPTH = 1000; // UI depth for consistent layering
        this.score = 0; // Added for score tracking
        this.isInitialDataReady = false; // ADD THIS LINE
        this.isFullyInitialized = false; // ADD THIS NEW FLAG
        
        // Voice congratulation messages - AudioManager will use this
        this.voiceMessages = [
            "fantastic",
            "great_aim",
            "marvelous",
            "superb",
            "amazing",
            "wonderful",
            "nice_shot",
            "incredible"
        ];
        this.lastRevealPercentage = 0; // Track previous percentage for voice triggers
        this.voiceThreshold = 10; // Changed from 30 to 10 - percentage change needed to trigger voice message
        
        // We'll delegate these properties to the GameStateManager
        // But we keep references here for compatibility
        this.isLevelComplete = false;
        this.isGameOver = false;
        
        // Level management
        this.currentLevel = 1;
        
        // Initialize BlockTypes
        this.blockTypes = new BlockTypes();
        
        // Add bomb state tracking to prevent stuck game state
        this.bombState = {
            active: false,
            lastResetTime: 0,
            lastBombFired: 0,
            pendingReset: null,
            maxIdleTime: 20000, // Auto-reset if bomb is idle for 20 seconds
            autoResetTimer: null
        };
        
        // Add developer method to refresh UI
        if (window) {
            window.refreshGameUI = () => {
                console.log('Forcing UI refresh via GameScene event...');
                this.events.emit('refreshUI'); // Emit event for UIScene
                return 'UI refresh event emitted successfully!';
            };
        }
        
        this.audioManager = null; // Reference to the audio manager instance
        
        // Bomb types with names from Game Design Document
        this.BOMB_TYPES = {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',  // Add Driller Girl bomb type
            RICOCHET: 'ricochet_bomb', // Add Ricochet bomb for level 2
            SHRAPNEL: 'shrapnel_bomb', // Add Shrapnel bomb type
            MELTER: 'melter_bomb' // Add Melter Girl bomb type
        };
        
        // Bomb names based on Game Design Document
        this.BOMB_NAMES = {
            [this.BOMB_TYPES.BLAST]: 'Blast Girl',
            [this.BOMB_TYPES.PIERCER]: 'Piercer Girl',
            [this.BOMB_TYPES.CLUSTER]: 'Cluster Girl',
            [this.BOMB_TYPES.STICKY]: 'Sticky Girl',
            [this.BOMB_TYPES.SHATTERER]: 'Shatterer Girl',
            [this.BOMB_TYPES.DRILLER]: 'Driller Girl',   // Add Driller Girl name
            [this.BOMB_TYPES.RICOCHET]: 'Ricochet Girl',  // Add Ricochet Girl name
            [this.BOMB_TYPES.SHRAPNEL]: 'Shrapnel Girl',  // Add Shrapnel Girl name
            [this.BOMB_TYPES.MELTER]: 'Melter Girl'  // Add Melter Girl name
        };
        
        // Remaining bombs of each type - will be set by level manager
        this.bombsRemaining = {}; // CHANGE THIS LINE - Initialize as empty, setupBombs will populate
        
        // Current selected bomb type
        this.currentBombType = this.BOMB_TYPES.BLAST;
        
        // Debug mode for testing
        this.debugMode = true;
        
        // Configure the game for better performance with frequent pixel operations
        this.willReadPixelsFrequently = true;

        this.collisionManager = null; // Add this property
        this.isTransitioningLevel = false; // Add this flag
    }

    async create() { // Make create method async
        console.log('[GameScene.create] Method started. Current Level:', this.currentLevel);

        // >>> START OF CRUCIAL RESETS <<<
        this.isLevelComplete = false;
        this.isGameOver = false;
        this.gameOverSetBy = null; // Reset who set game over
        this.revealPercentage = 0;
        this.score = 0;
        this.clearedIceBlocks = 0;
        this.lastRevealPercentage = 0; // Reset for voice triggers
        this.isInitialDataReady = false; // Reset UI data ready flag
        this.isFullyInitialized = false; // Reset full initialization flag
        this.isTransitioningLevel = false; // Reset transition flag
        this.victoryDelayTimer = null; // Clear any pending victory timer

        // Reset bomb state more thoroughly
        this.bombState = {
            active: false,
            lastResetTime: 0,
            lastBombFired: 0,
            pendingReset: null,
            maxIdleTime: 20000,
            autoResetTimer: null
        };
        // Ensure bombsRemaining is reset before setupBombs populates it
        this.resetBombCounts(); // This was already in init, but good to ensure it happens before setupBombs
        // >>> END OF CRUCIAL RESETS <<<

        try {
            console.log(`GameScene: Creating scene for level ${this.currentLevel}`);
            
            // Initialize utilities early, before clearResources might need them
            this.blockUtils = new BlockUtils(this);
            this.bombUtils = new BombUtils(this);

            // Clear any existing resources to prevent memory leaks
            this.clearResources();
            
            // Initialize the BombLauncher module EARLY
            this.bombLauncher = new BombLauncher(this);
            
            // Initialize the CollisionManager
            this.collisionManager = new CollisionManager(this);
            this.collisionManager.initialize();
            
            // Initialize the level manager BEFORE setupGame which uses it
            this.levelManager = new LevelManager(this);
            this.levelManager.setLevel(this.currentLevel); // Set the level
            await this.levelManager.initialize(); // Await initialization
            this.targetPercentage = this.levelManager.getTargetPercentage(); // Set targetPercentage here
            this.shotsRemaining = 999; // Set to a very high number for "unlimited"

            // Setup the game level first
            this.setupGame(); // This will also launch UIScene and create bomb selector
            
            // Initialize the game state manager
            this.gameStateManager = new GameStateManager(this);
            this.gameStateManager.init();
            // Explicitly reset GameStateManager's state as well
            this.gameStateManager.resetGameState();
            
            // Initialize audio system EARLY using the manager
            this.initializeAudio();
            
            // Initialize the level manager -- MOVED EARLIER
            // this.levelManager = new LevelManager(this); 
            // this.levelManager.setLevel(this.currentLevel); 
            
                // Now that we have the level manager initialized, setup bombs
                this.setupBombs();
                
                // Create initial bomb at the slingshot
                if (!this.bomb && this.bombLauncher) {
                    // BombLauncher now handles its own bomb creation in its constructor or dedicated method
                }
                
                // Verify assets are loaded properly
                this.verifyAssets();

            // Log current GameScene state before telling UIScene to populate
            console.log('[GameScene.create] Data for UI before emit:', {
                shotsRemaining: this.shotsRemaining,
                revealPercentage: this.revealPercentage,
                targetPercentage: this.targetPercentage,
                score: this.score,
                bombsRemaining: JSON.parse(JSON.stringify(this.bombsRemaining)), // Deep copy for logging
                currentBombType: this.currentBombType,
                currentLevel: this.currentLevel
            });

            this.isInitialDataReady = true; // ADD THIS LINE
            // Signal UIScene that GameScene is ready for UI data population
            this.events.emit('initialUIDataReady');
            
            console.log("GameScene creation complete");
            this.isFullyInitialized = true; // SET FLAG TO TRUE HERE
            console.log("[GameScene.create] GameScene is NOW fully initialized."); // Log for confirmation
        } catch (error) {
            console.error("Error in create function:", error);
        }
    }
    
    // Method to clear resources before creating new ones
    clearResources() {
        // Stop any existing audio
        if (this.audioManager && typeof this.audioManager.stopAll === 'function') {
            try {
                this.audioManager.stopAll();
            } catch (e) {
                console.warn("Error stopping audio:", e);
            }
        }
        
        // Clear any existing tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clear any pending timers
        if (this.time) {
            this.time.removeAllEvents();
        }
        
        // Clear any existing UI elements - Handled by UIScene's shutdown
        // if (this.bombSelectorContainer) {
        //     this.bombSelectorContainer.destroy();
        //     this.bombSelectorContainer = null;
        // }
        
        // Clean up debug visuals if they exist
        if (this.debugVisuals && this.debugVisuals.length > 0) {
            this.debugVisuals.forEach(visual => {
                if (visual && typeof visual.destroy === 'function') {
                    visual.destroy();
                }
            });
            this.debugVisuals = [];
        }
        
        // Clear bomb references
        if (this.bomb) {
            try {
                this.bomb.destroy();
            } catch (e) {
                console.warn("Error destroying bomb:", e);
            }
            this.bomb = null;
        }
        
        // Clear any active sticky bombs
        if (this.activeStickyBombs && this.activeStickyBombs.length > 0) {
            this.activeStickyBombs.forEach(bomb => {
                try {
                    if (this.bombUtils) {
                        this.bombUtils.cleanupBombResources(bomb);
                    }
                } catch (e) {
                    console.warn("Error cleaning up sticky bomb:", e);
                }
            });
            this.activeStickyBombs = [];
        }
        
        console.log("Resources cleared successfully");
    }

    setupCamera() {
        // Set up the main camera to show the entire 1920x1080 game area without overflow
        const gameWidth = 1920;
        const gameHeight = 1080;
        
        // Set strict bounds for the main camera
        this.cameras.main.setBounds(0, 0, gameWidth, gameHeight);
        this.cameras.main.setBackgroundColor('#000000');
        this.cameras.main.setViewport(0, 0, gameWidth, gameHeight);
        
        // Make sure the camera is properly scaled according to the game config
        const scaleX = this.scale.width / gameWidth;
        const scaleY = this.scale.height / gameHeight;
        
        console.log(`Camera setup: Game dimensions ${this.scale.width}x${this.scale.height}, Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`);
        
        // Create a UI camera specifically for UI elements with highest depth
        this.uiCamera = this.cameras.add(0, 0, gameWidth, gameHeight);
        this.uiCamera.setName('UI Camera');
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setBackgroundColor(0x000000, 0); // Transparent background
        
        // Only include UI elements in this camera (depth >= UI_DEPTH)
        this.uiCamera.ignore(this.children.list.filter(item => item.depth < this.UI_DEPTH));
        
        // Ensure our world physics is larger than our camera bounds to prevent bombs from hitting invisible walls
        // Extend the physics world by 2000 pixels in each direction
        this.matter.world.setBounds(-2000, -2000, gameWidth + 4000, gameHeight + 4000);
        
        // Debug camera bounds if in debug mode
        if (this.debugMode) {
            console.log(`Main camera bounds: 0, 0, ${gameWidth}, ${gameHeight}`);
            console.log(`UI camera bounds: 0, 0, ${gameWidth}, ${gameHeight}`);
            console.log(`Physics world bounds: -2000, -2000, ${gameWidth + 4000}, ${gameHeight + 4000}`);
            console.log(`UI depth: ${this.UI_DEPTH}`);
        }
    }

    createBackground() {
        // Add background image, scaled to fit and centered
        // Use level-specific background if available, otherwise fallback
        const bgKey = `background${this.currentLevel}`;
        console.log(`[GameScene.createBackground] Attempting to use background key: ${bgKey}`); // ADD THIS LOG
        const backgroundToUse = this.textures.exists(bgKey) ? bgKey : 'background';
        this.background = this.add.image(0, 0, backgroundToUse).setOrigin(0, 0);
        this.background.setDepth(0); // Lowest depth for background
            
            // Get the background image key for the current level - always use level number
            const backgroundKey = `background${this.currentLevel}`;
            
            console.log(`Attempting to load background with key: ${backgroundKey}`);
            console.log(`Available texture keys:`, Object.keys(this.textures.list).join(', '));
            
            // Check if level background was loaded successfully
            let bgImage;
            
            // Try loading with different possible keys for better compatibility
            if (this.textures.exists(backgroundKey)) {
                // Use the loaded background image
                bgImage = this.add.image(1920/2, 1080/2, backgroundKey);
                console.log(`Using level background image: ${backgroundKey}`);
            } else {
                // Last resort - create a colored background
                console.log(`No background image found for ${backgroundKey}, creating colored background`);
                bgImage = this.add.rectangle(1920/2, 1080/2, 1920, 1080, 0x87CEEB);
            }
            
            // Set background to lowest depth to ensure it's behind everything
            bgImage.setDepth(0);
            
            // Get the chibi image key for the current level - always use level number
            const chibiKey = `chibi_girl${this.currentLevel}`;
        console.log(`[GameScene.createBackground] Attempting to use chibi_girl key: ${chibiKey}`); // ADD THIS LOG
            
            console.log(`Attempting to load chibi with key: ${chibiKey}`);
            
            // Position the chibi image on the right side of the screen
            // Use 2/3 of the screen width for X position to move it rightward
            const chibiX = Math.floor(1920 * 0.7); // 70% of screen width
            const chibiY = 1080/2; // Centered vertically
            
            // Add the chibi image
            if (this.textures.exists(chibiKey)) {
                this.chibiImage = this.add.image(chibiX, chibiY, chibiKey);
                console.log(`Successfully created chibi image with key: ${chibiKey}`);
            this.chibiImage.setDepth(1); // Lower depth for chibi image
            } else {
                console.error(`Chibi image texture ${chibiKey} not found, creating placeholder`);
                // Create a placeholder for the chibi image
                const graphics = this.add.graphics();
                graphics.fillStyle(0xff00ff, 0.5); // Semi-transparent magenta
                graphics.fillRect(0, 0, 300, 600);
                graphics.generateTexture('placeholder_chibi', 300, 600);
                graphics.clear();
                
                this.chibiImage = this.add.image(chibiX, chibiY, 'placeholder_chibi');
            this.chibiImage.setDepth(1); // Lower depth for chibi image
            }
            
            // No scaling, use original size
            // Store dimensions for later reference
            const imageWidth = this.chibiImage.width;
            const imageHeight = this.chibiImage.height;
            
            // Set the image to be fully opaque
            this.chibiImage.setAlpha(1);
            
            // Log the new position
            console.log("Background created with chibi image positioned at:", 
                        chibiX, chibiY,
                        "with dimensions:", imageWidth, "x", imageHeight);
    }

    /**
     * Creates ice blocks over the target image
     * This is the main method for generating the ice blocks covering the chibi image
     */
    createIceBlocks() {
        this.iceBlocks = [];
        this.blueVeils = []; // Array to store individual blue veil rectangles
        this.dynamiteBlocks = []; // Array to track dynamite blocks specifically
        this.totalIceBlocks = 0;
        this.clearedIceBlocks = 0;

        const blockLayoutData = this.levelManager.getCurrentBlockLayout();
        const currentBlockSize = this.levelManager.getBlockSize();

        // ADD THIS LOG (already present from previous step, shown for context)
        console.log(`[GameScene.createIceBlocks - Level ${this.currentLevel}] Received blockLayoutData from LevelManager:`, 
            blockLayoutData ? JSON.stringify(blockLayoutData).substring(0, 500) + '...' : 'null or undefined',
            `BlockSize from LevelManager: ${currentBlockSize}`
        );

        // MORE GRANULAR LOGS BEFORE THE IF
        const cond1 = !!blockLayoutData;
        let cond2 = false;
        let cond3 = false;

        if (cond1) {
            console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] typeof blockLayoutData: ${typeof blockLayoutData}`);
            cond2 = blockLayoutData.hasOwnProperty('blockPositions');
            console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] blockLayoutData.hasOwnProperty('blockPositions'): ${cond2}`);
            if (cond2) {
                console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] typeof blockLayoutData.blockPositions: ${typeof blockLayoutData.blockPositions}`);
                cond3 = Array.isArray(blockLayoutData.blockPositions);
                console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] Array.isArray(blockLayoutData.blockPositions): ${cond3}`);
                console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] blockLayoutData.blockPositions length: ${blockLayoutData.blockPositions ? blockLayoutData.blockPositions.length : 'N/A'}`);
            }
            console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] currentBlockSize value: ${currentBlockSize}, typeof: ${typeof currentBlockSize}`);
        } else {
            console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] blockLayoutData is null or undefined.`);
        }
        console.log(`[GameScene.createIceBlocks - DEBUG PRE-IF] Final conditions for IF: cond1 (blockLayoutData exists): ${cond1}, cond2 (has blockPositions): ${cond2}, cond3 (blockPositions isArray): ${cond3}`);
        // =====

        if (blockLayoutData && blockLayoutData.blockPositions && Array.isArray(blockLayoutData.blockPositions)) {
            console.log(`[GameScene.createIceBlocks] Using absolute positions from LevelManager for level ${this.currentLevel}. Block size: ${currentBlockSize}`);
            let totalBlocksFromLayout = 0;
            blockLayoutData.blockPositions.forEach(typeGroup => {
                if (typeGroup.type && Array.isArray(typeGroup.positions)) {
                    const blockType = typeGroup.type.toUpperCase(); // Ensure type is uppercase for BlockTypes.js
                    typeGroup.positions.forEach(pos => {
                        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                            // The x, y in the JSON are assumed to be the center of the block
                            this._createSingleBlock(pos.x, pos.y, currentBlockSize, blockType);
                            totalBlocksFromLayout++;
                        } else {
                            console.warn("[GameScene.createIceBlocks] Invalid position data in blockPositions:", pos);
                        }
                    });
                }
            });
            this.totalIceBlocks = totalBlocksFromLayout;
        } else if (blockLayoutData.gridOrigin && blockLayoutData.blocks) {
             // Fallback to original grid-based parsing if blockPositions is not found but gridOrigin and blocks are
            console.log(`[GameScene.createIceBlocks] Using gridOrigin layout from LevelManager for level ${this.currentLevel}. Block size: ${currentBlockSize}`);
            const { gridOrigin, blocks } = blockLayoutData;
            if (!gridOrigin || typeof gridOrigin.x !== 'number' || typeof gridOrigin.y !== 'number') {
                console.error("[GameScene.createIceBlocks] Invalid or missing gridOrigin in block layout data. Defaulting to Chibi image position.");
                const imageWidth = this.chibiImage.width;
                const imageHeight = this.chibiImage.height;
                const numCols = blockLayoutData.numCols || 10;
                const numRows = blockLayoutData.numRows || 5;
                gridOrigin.x = this.chibiImage.x - (numCols * currentBlockSize) / 2;
                gridOrigin.y = this.chibiImage.y - (numRows * currentBlockSize) / 2;
            }
            blocks.forEach(blockData => {
                const { type, col, row } = blockData;
                if (typeof col !== 'number' || typeof row !== 'number' || !type) {
                    console.warn("[GameScene.createIceBlocks] Invalid block data in layout:", blockData);
                    return;
                }
                const blockScreenX = gridOrigin.x + (col * currentBlockSize) + (currentBlockSize / 2);
                const blockScreenY = gridOrigin.y + (row * currentBlockSize) + (currentBlockSize / 2);
                this._createSingleBlock(blockScreenX, blockScreenY, currentBlockSize, type.toUpperCase());
            });
            this.totalIceBlocks = blocks.length;
        } else {
            console.warn(`[GameScene.createIceBlocks] Block layout data for level ${this.currentLevel} is not in expected format (neither absolute nor grid). Falling back to procedural.`);
            this.fallbackProceduralIceGeneration(); // Encapsulated old procedural logic
        }

        // Ensure chibi image remains fully opaque after adding blue veils (if any were added)
        this.chibiImage.setAlpha(1);
        
        // Reset revealed pixels counter based on total ice blocks
        this.revealedPixels = 0;
        this.revealPercentage = 0;
        
        console.log(`Created ${this.iceBlocks.length} ice blocks with blue veils`);
        // Log the number of dynamite blocks created
        // console.log(`Created exactly ${dynamitePositions.length} dynamite blocks`);
    }

    // Encapsulated fallback procedural generation logic
    fallbackProceduralIceGeneration() {
        const legacyBlockSize = 15; // Original blockSize for procedural generation
        const blocksContainer = this.add.container(0, 0);
        blocksContainer.setDepth(2);
        const imageWidth = this.chibiImage.width;
        const imageHeight = this.chibiImage.height;
        const imageX = this.chibiImage.x - imageWidth / 2;
        const imageY = this.chibiImage.y - imageHeight / 2;
        const cols = Math.ceil(imageWidth / legacyBlockSize);
        const rows = Math.ceil(imageHeight / legacyBlockSize);
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = imageWidth;
        tempCanvas.height = imageHeight;
        const textureKey = this.chibiImage.texture.key;
        const frame = this.textures.getFrame(textureKey);
        const source = frame.source.image || frame.source.canvas;
        tempContext.drawImage(source, 0, 0, imageWidth, imageHeight);
        const alphaThreshold = 50;
        const sampleSize = 5;
        const sampleOffset = Math.floor(legacyBlockSize / (sampleSize + 1));
        const blockGrid = Array(rows).fill().map(() => Array(cols).fill(false));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let hasVisiblePixel = false;
                for (let sx = 0; sx < sampleSize; sx++) {
                    for (let sy = 0; sy < sampleSize; sy++) {
                        const offsetX = -Math.floor(sampleSize/2) + sx;
                        const offsetY = -Math.floor(sampleSize/2) + sy;
                        const sampleX = Math.floor(col * legacyBlockSize) + offsetX * sampleOffset;
                        const sampleY = Math.floor(row * legacyBlockSize) + offsetY * sampleOffset;
                        if (sampleX >= 0 && sampleX < imageWidth && sampleY >= 0 && sampleY < imageHeight) {
                            try {
                                const pixelData = tempContext.getImageData(sampleX, sampleY, 1, 1).data;
                                if (pixelData[3] >= alphaThreshold) {
                                    hasVisiblePixel = true;
                                    break;
                                }
                            } catch (e) { /* console.error(`Error sampling pixel at ${sampleX},${sampleY}:`, e); */ }
                        }
                    }
                    if (hasVisiblePixel) break;
                }
                if (hasVisiblePixel) blockGrid[row][col] = true;
            }
        }
        const paddingAmount = 1;
        const originalGrid = blockGrid.map(r => [...r]);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (originalGrid[r][c]) {
                    for (let pr = -paddingAmount; pr <= paddingAmount; pr++) {
                        for (let pc = -paddingAmount; pc <= paddingAmount; pc++) {
                            const padRow = r + pr;
                            const padCol = c + pc;
                            if (padRow >= 0 && padRow < rows && padCol >= 0 && padCol < cols) {
                                blockGrid[padRow][padCol] = true;
                            }
                        }
                    }
                }
            }
        }
        const dynamitePositions = [];
        const validPositions = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (blockGrid[r][c]) {
                    const blockScreenX = imageX + c * legacyBlockSize + legacyBlockSize / 2;
                    const blockScreenY = imageY + r * legacyBlockSize + legacyBlockSize / 2;
                    validPositions.push({x: blockScreenX, y: blockScreenY, row: r, col: c});
                }
            }
        }
        if (validPositions.length > 3) {
            for (let i = validPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
            }
            for (let i = 0; i < 3; i++) {
                dynamitePositions.push({ x: validPositions[i].x, y: validPositions[i].y, row: validPositions[i].row, col: validPositions[i].col });
            }
        }
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!blockGrid[r][c]) continue;
                const blockScreenX = imageX + c * legacyBlockSize + legacyBlockSize / 2;
                const blockScreenY = imageY + r * legacyBlockSize + legacyBlockSize / 2;
                let blockType = this.blockTypes.TYPES.STANDARD;
                const isDynamite = dynamitePositions.some(pos => pos.row === r && pos.col === c);
                if (isDynamite) {
                    blockType = this.blockTypes.TYPES.DYNAMITE;
                } else {
                    let blockTypeRand = Math.random();
                    if (blockTypeRand < 0.02) blockType = this.blockTypes.TYPES.ETERNAL;
                    else if (blockTypeRand < 0.08) blockType = this.blockTypes.TYPES.STRONG;
                }
                this._createSingleBlock(blockScreenX, blockScreenY, legacyBlockSize, blockType.toUpperCase());
            }
        }
        console.log(`Created ${this.iceBlocks.length} ice blocks with blue veils (procedural fallback)`);
        this.totalIceBlocks = this.iceBlocks.length; // Ensure totalIceBlocks is set for procedural fallback
    }

    /**
     * Creates a single ice block with associated veil
     * @private
     * @param {number} x X position of the block
     * @param {number} y Y position of the block
     * @param {number} blockSize Size of the block
     * @param {string} blockType Type of block to create
     */
    _createSingleBlock(x, y, blockSize, blockType) {
        // Base physics properties
        let physicsProps = {
            isStatic: true,
            friction: 0.01, 
            restitution: 0.3
        };
        
        // Ensure blockType is valid, default to STANDARD if not
        let typeToUse = this.blockTypes.TYPES.STANDARD; // Default to 'standard' (lowercase)
        if (typeof blockType === 'string') {
            const normalizedBlockType = blockType.toLowerCase(); // Convert to lowercase for comparison
            const validBlockTypeValues = Object.values(this.blockTypes.TYPES); // e.g., ['standard', 'strong', ...]
            
            if (validBlockTypeValues.includes(normalizedBlockType)) {
                typeToUse = normalizedBlockType; // Use the valid lowercase type
                 // console.log(`[GameScene._createSingleBlock] Valid blockType: '${blockType}' (normalized to '${normalizedBlockType}')`); // Optional: Log success
            } else {
                console.warn(`[GameScene._createSingleBlock] Unrecognized blockType: '${blockType}' (normalized to '${normalizedBlockType}'). Defaulting to STANDARD.`);
            }
        } else {
            console.warn(`[GameScene._createSingleBlock] blockType is not a string: ${blockType}. Defaulting to STANDARD.`);
        }
        blockType = typeToUse; // Assign the determined typeToUse back to blockType for the switch statement

        // Create ice block - asset 'iceBlock' is assumed to be 40x40
        const block = this.matter.add.image(x, y, 'iceBlock', null, physicsProps);
        
        // Scale the blocks to match the new size
        // If currentBlockSize from level config is 40, scale is 1.
        // If currentBlockSize is 20, scale is 0.5.
        block.setScale(blockSize / 40); 
        
        // Set a slight random rotation for some blocks
        if (Math.random() < 0.3) {
            block.setRotation(Math.random() * 0.2 - 0.1);
        }
        
        // Set blocks to appear above the chibi image but below UI
        block.setDepth(4); // Higher than chibi (1) and blocksContainer (2) and blue veils (3)
        
        // Initialize block properties based on type
        block.isActive = true;
        block.blockType = blockType;
        
        // Set specific properties based on block type
        let veilColor, veilAlpha;
        
        switch(blockType) {
            case this.blockTypes.TYPES.ETERNAL:
                block.hitsLeft = this.blockTypes.getHitPoints(blockType);
                veilColor = this.blockTypes.getColor(blockType); 
                veilAlpha = this.blockTypes.getAlpha(blockType); 
                break;
            case this.blockTypes.TYPES.STRONG:
                block.hitsLeft = this.blockTypes.getHitPoints(blockType);
                // Custom visual for STRONG blocks - Aqua theme
                veilColor = 0x40E0D0; // Turquoise / Aqua
                veilAlpha = 0.85;    // More opaque
                block.setAlpha(0.65); // Physical block itself slightly more opaque
                break;
            case this.blockTypes.TYPES.DYNAMITE:
                block.hitsLeft = this.blockTypes.getHitPoints(blockType);
                veilColor = 0xff4500; // Force a distinct fiery orange-red for the veil
                veilAlpha = 0.9;      // Make it quite opaque
                this.tweens.add({
                    targets: block, // Pulsing on the main block texture
                    alpha: { from: 0.6, to: 1.0 }, // Make it pulse to more opaque
                    yoyo: true,
                    repeat: -1,
                    duration: 500 // Faster pulse
                });
                if (!this.dynamiteBlocks) {
                    this.dynamiteBlocks = [];
                }
                this.dynamiteBlocks.push(block);
                break;
            case this.blockTypes.TYPES.BOUNCY: 
                // This case is still used by boundary bouncy blocks
                block.hitsLeft = this.blockTypes.getHitPoints(blockType);
                veilColor = this.blockTypes.getColor(blockType);
                veilAlpha = this.blockTypes.getAlpha(blockType);
                // Add pulsating effect like the boundary bouncy blocks
                this.tweens.add({
                    targets: block,
                    alpha: { from: 0.5, to: 0.8 },
                    yoyo: true,
                    repeat: -1,
                    duration: 1500,
                    ease: 'Sine.easeInOut'
                });
                break;
            default: // standard
                block.hitsLeft = this.blockTypes.getHitPoints(this.blockTypes.TYPES.STANDARD);
                veilColor = this.blockTypes.getColor(this.blockTypes.TYPES.STANDARD);
                veilAlpha = this.blockTypes.getAlpha(this.blockTypes.TYPES.STANDARD);
        }
        
        block.setAlpha(0.5); // Physical block is semi-transparent
        
        // Force all veils to 50% transparency as per user request
        // Changing to 25% (twice more transparent)
        veilAlpha = 0.25;
        
        // Create a blue veil rectangle for this block with type-specific color
        const blueVeil = this.add.rectangle(
            x, 
            y, 
            blockSize, 
            blockSize, 
            veilColor,
            veilAlpha
        );
        
        // Add an ice-like texture effect with highlights - standard for all
        blueVeil.setStrokeStyle(2, 0xffffff, 0.3); // Default subtle white border

        // --- Enhancements for special blocks after veil creation ---
        if (blockType === this.blockTypes.TYPES.ETERNAL) {
            blueVeil.setStrokeStyle(3, 0xFFFF00, 0.9); // Thicker, bright yellow, opaque border
            // Add a slow pulse to the ETERNAL veil itself for a subtle glow
            this.tweens.add({
                targets: blueVeil,
                alpha: veilAlpha * 0.7, // Pulse between current alpha and 70% of it
                yoyo: true,
                repeat: -1,
                duration: 1500,
                ease: 'Sine.easeInOut'
            });
        } else if (blockType === this.blockTypes.TYPES.STRONG) {
            // blueVeil.setStrokeStyle(3, 0xA9A9A9, 0.85); // Old: DarkGray border
            blueVeil.setStrokeStyle(3, 0x008080, 0.9); // New: Teal border, slightly more opaque
        } else if (blockType === this.blockTypes.TYPES.DYNAMITE) {
            blueVeil.setStrokeStyle(3, 0xFF0000, 0.8); // Fiery red border for dynamite veil
        }
        // --- End enhancements ---
        
        // Add a slight random rotation for a more natural ice look
        if (Math.random() < 0.5) {
            blueVeil.setRotation(Math.random() * 0.2 - 0.1);
        }
        
        // Set the blue veil to appear at the same depth as blocks
        blueVeil.setDepth(3); // Blue veils below blocks but above chibi
        
        // Store reference to its corresponding blue veil in the block
        block.blueVeil = blueVeil;
        
        this.iceBlocks.push(block);
        this.blueVeils.push(blueVeil);
        
        this.createIceTextureEffect(blueVeil);
        
        // Count each ice block for percentage calculations
        this.totalIceBlocks++;
    }

    /**
     * Creates visual texture effects for ice blocks to make them look more realistic
     * @param {Phaser.GameObjects.Rectangle} veil The veil object to apply effects to
     */
    createIceTextureEffect(veil) {
        // Add ice-like visual effects to make the veil look more like ice
        
        // Random size variations for the ice blocks (up to 10% variation)
        const sizeVariation = 0.9 + Math.random() * 0.2;
        veil.setScale(sizeVariation);
        
        // Add random inner lines/cracks simulation with slight opacity changes
        // This is simulated by making some veils slightly more transparent in certain parts
        /*
        if (Math.random() < 0.3) {
            // Around 30% of blocks will have a slightly different opacity
            veil.setAlpha(veil.alpha * (0.6 + Math.random() * 0.15));
        }
        */
        
        // Create a shimmer/highlight effect for some blocks
        if (Math.random() < 0.2) { // Apply to about 20% of blocks
            // Add a highlight reflective effect that slowly moves
            const highlight = this.add.rectangle(
                veil.x,
                veil.y,
                veil.width * 0.8,
                veil.height * 0.2,
                0xffffff,
                0.25
            );
            highlight.setDepth(veil.depth + 0.1); // Just above the veil
            
            // Store a reference to the highlight in the veil
            veil.highlight = highlight;
            
            // Create shimmer animation
            this.tweens.add({
                targets: highlight,
                y: veil.y + veil.height/2,
                alpha: { from: 0.3, to: 0 },
                duration: 3000 + Math.random() * 2000,
                repeat: -1,
                yoyo: false,
                delay: Math.random() * 2000, // Random delay for each block
                onRepeat: () => {
                    highlight.y = veil.y - veil.height/2; // Reset position to top
                    highlight.alpha = 0.3;                // Reset opacity
                }
            });
        }
    }

    createBomb() {
        console.log("GameScene.createBomb called - DEPRECATED, should use BombLauncher.createBomb");
        
        if (this.bombLauncher) {
            this.bombLauncher.createBomb(this.currentBombType || 'bomb');
            this.bomb = this.bombLauncher.bomb; // Keep scene.bomb reference for compatibility
        } else {
            // Fallback if bombLauncher is not available
            this.bomb = this.matter.add.image(this.bombLauncher ? this.bombLauncher.BOW_X : 300, (this.bombLauncher ? this.bombLauncher.BOW_Y : 540) - 20, 'bomb', null);
            this.bomb.setCircle(30); 
        this.bomb.setStatic(true);
        this.bomb.setVisible(true);
            this.bomb.setDepth(12); 
        this.bomb.setDisplaySize(60, 60);
        }
        
        if (this.debugMode) {
            console.log("Bomb created via GameScene.createBomb (fallback or direct call):", this.bomb);
        }
    }

    setupInput() {
        try {
            // Create BombInputHandler if not already created
            if (!this.bombInputHandler) {
                this.bombInputHandler = new BombInputHandler(this);
                        }
                        
            // Set up input handlers through the BombInputHandler
            this.bombInputHandler.setupInputHandlers();
            
            if (this.debugMode) {
                console.log("Input setup delegated to BombInputHandler");
            }
        } catch (error) {
            console.error("Error in setupInput:", error);
        }
    }
    
 

    decrementBombCount(bombType) {
        // Decrement the counter for the specific bomb type
        if (this.bombsRemaining.hasOwnProperty(bombType)) {
            const oldCount = this.bombsRemaining[bombType];
            if (this.debugMode) console.log(`[DecrementCount] Decrementing ${bombType}. Old count: ${oldCount}`);
            
            if (oldCount > 0) {
                this.bombsRemaining[bombType]--;
                const newCount = this.bombsRemaining[bombType];
                if (this.debugMode) console.log(`[DecrementCount] ${bombType} count is now ${newCount}`);

                // Update the counter display via event for UIScene
                this.events.emit('bombCountUpdated', bombType, newCount);
                
                // If we run out of this bomb type, switch to another available one
                if (newCount === 0) {
                    if (this.debugMode) console.log(`[DecrementCount] Count for ${bombType} reached 0. Checking if switch is needed.`);
                    // Find another bomb type that has remaining bombs
                    const availableBombType = Object.keys(this.bombsRemaining).find(type => 
                        this.bombsRemaining.hasOwnProperty(type) && this.bombsRemaining[type] > 0
                    );
                    
                    if (this.debugMode) console.log(`[DecrementCount] Next available type: ${availableBombType}`);

                    if (availableBombType) {
                        // FIX: Only switch the bomb type after a delay to ensure
                        // the UI shows the current bomb until its explosion completes
                        // REMOVED DELAY - Immediate switch seems intended based on logs
                        // this.time.delayedCall(2000, () => {
                            // Double check that we still need to switch
                            // if (this.bombsRemaining[bombType] === 0 && 
                            //     this.currentBombType === bombType) {
                                if (this.debugMode) console.log(`[DecrementCount] Switching bomb type from ${bombType} to ${availableBombType}`);
                                this.selectBombType(availableBombType);
                            // }
                        // });
                    } else {
                        if (this.debugMode) console.log(`[DecrementCount] No other bomb types available. Checking for game over.`);
                        this.checkGameOver(); // <--- ADD THIS LINE
                    }
                }
            } else {
                 if (this.debugMode) console.log(`[DecrementCount] Cannot decrement ${bombType}, count already ${oldCount}`);
            }
        } else {
            console.warn(`[DecrementCount] Invalid bombType: ${bombType}`);
        }
    }

    
  
  
    
    cleanupIceBlocksArray() {
        if (!this.iceBlocks) return;
        
        // Filter out inactive blocks
        this.iceBlocks = this.iceBlocks.filter(block => {
            return block && block.isActive;
        });
        
        if (this.debugMode) {
            console.log(`Cleaned up ice blocks array. Remaining blocks: ${this.iceBlocks.length}`);
        }
    }

   
    
    /**
     * Fades out a block's veil with tweening effects
     * @private
     * @param {Phaser.Physics.Matter.Image} block The block whose veil to fade out
     */
    _fadeOutBlockVeil(block) {
        // Make the blue veil slowly dissipate instead of removing immediately
        if (block.blueVeil) {
            // Also fade out any highlight associated with this veil
            if (block.blueVeil.highlight) {
                this.tweens.add({
                    targets: block.blueVeil.highlight,
                    alpha: 0,
                    duration: 5000, // 5 seconds, matching the veil
                    ease: 'Linear',
                    onComplete: () => {
                        // Remove the highlight when the animation completes
                        if (block.blueVeil.highlight && block.blueVeil.highlight.scene) {
                            block.blueVeil.highlight.destroy();
                        }
                    }
                });
            }
            
            // Start a tween to fade out the blue veil over 5 seconds
            this.tweens.add({
                targets: block.blueVeil,
                alpha: 0,
                duration: 5000, // 5 seconds
                ease: 'Linear',
                onComplete: () => {
                    // Remove the veil when the animation completes
                    if (block.blueVeil && block.blueVeil.scene) {
                        block.blueVeil.destroy();
                    }
                }
            });
        }
    }
    
    /**
     * Updates the reveal percentage and checks progress after a block is destroyed
     * @private
     */
    _updateRevealProgress() {
        // Update revealed percentage based on ice blocks cleared
        this.clearedIceBlocks++;
        const previousPercentage = this.revealPercentage;
        this.revealPercentage = Math.min(100, Math.floor((this.clearedIceBlocks / this.totalIceBlocks) * 100));
        this.score += 10; // Increment score for each block cleared
        
        // Log for debugging
        if (this.debugMode) {
            console.log(`Cleared ${this.clearedIceBlocks} of ${this.totalIceBlocks} blocks (${this.revealPercentage}%) Score: ${this.score}`);
        }
        
        // Emit update to UI with more detailed information
        this.events.emit('updatePercentage', this.revealPercentage, this.targetPercentage); // Pass target too
        this.events.emit('updateScore', this.score); // Emit score update
        
        // When percentage reaches key milestones, make the image clearer
        if ((previousPercentage < 20 && this.revealPercentage >= 20) ||
            (previousPercentage < 50 && this.revealPercentage >= 50) ||
            (previousPercentage < 80 && this.revealPercentage >= 80)) {
            // Add a little flash effect to highlight the milestone
            this.cameras.main.flash(300, 255, 255, 255, 0.3);
        }
        
        // Check if we've revealed enough for a congratulatory voice message
        const percentageChange = this.revealPercentage - this.lastRevealPercentage;
        if (percentageChange >= this.voiceThreshold) {
            if (this.debugMode) {
                console.log(`Voice message triggered at ${this.revealPercentage}% (${percentageChange}% change)`);
            }
            
            // For larger percentage changes, show special effect text via AudioManager
            if (percentageChange >= 20) {
                // this.displaySpecialClearText(percentageChange);
                if (this.audioManager) {
                    this.audioManager.displaySpecialClearText(percentageChange);
                }
            } else {
                if (this.audioManager) {
                    this.audioManager.playRandomVoiceMessage(); // Play normal voice message
                }
            }
            
            // Update last reveal percentage to current to avoid multiple triggers
            this.lastRevealPercentage = this.revealPercentage;
        }
        
        // Remove the completion veil when we reach 80%
        if (previousPercentage < 80 && this.revealPercentage >= 80) {
            this.removeCompletionVeil();
        }
        
        // Check if level is complete
        if (this.revealPercentage >= this.targetPercentage) {
            this.checkLevelCompletion();
        }
    }

    checkLevelCompletion() {
        if (this.isLevelComplete || this.isGameOver || this.victoryDelayTimer) return; // Prevent multiple completions or if already delaying

        const allBombsUsed = !this.isAnyBombAvailable();
        const targetPercentageReached = this.revealPercentage >= this.targetPercentage; // General level pass condition
        const fullClearReached = this.revealPercentage >= 100;

        // Check if we have an active bomb while having no bombs available (last bomb scenario)
        const activeBomb = this.bombLauncher ? this.bombLauncher.getActiveLaunchedBomb() : null;
        if (allBombsUsed && activeBomb && this.gameStateManager) {
            // Let the GameStateManager handle this special case
            console.log("[GameScene.checkLevelCompletion] Last bomb is still active, deferring completion check");
            return;
        }

        const condition1Met = allBombsUsed && targetPercentageReached;
        const condition2Met = fullClearReached;

        if (condition1Met || condition2Met) {
            let victoryReason = "";
            if (condition2Met) {
                victoryReason = "100% clear!";
            } else if (condition1Met) {
                victoryReason = `Target ${this.targetPercentage}% reached with all bombs used.`;
            }

            // Calculate Stars based on PRD using the current revealPercentage
            const currentRevealAtWin = this.revealPercentage; // SNAPSHOT this value
            let starsEarned = 0;
            if (currentRevealAtWin >= 100) { 
                starsEarned = 3;
            } else if (currentRevealAtWin >= 92) { 
                starsEarned = 2;
            } else if (currentRevealAtWin >= 85) { 
                starsEarned = 1;
            }

            // SNAPSHOT other relevant values
            const scoreAtWin = this.score;
            const completedLevelIdAtWin = this.currentLevel;

            console.log(`Level ${completedLevelIdAtWin} meets completion criteria (${victoryReason}). Reveal: ${currentRevealAtWin}%. Earned ${starsEarned} stars. Starting 5s victory delay.`);
            this.victoryDelayTimer = this.time.delayedCall(5000, () => {
                this.victoryDelayTimer = null; 
                if (this.isGameOver) {
                    console.log("[GameScene.checkLevelCompletion] Victory delay ended, but game is over. No victory UI or transition.");
                    return; 
                }
                
                this.isLevelComplete = true; 
                // Bonus score calculation based on scoreAtWin might be tricky if shotsRemaining is used
                // For now, let's assume scoreAtWin already includes any relevant pre-completion bonuses.
                // If shotsRemaining bonus is applied *after* this point, it should be added to scoreAtWin before emitting.

                if (this.audioManager) this.audioManager.playVictoryMusic();
                console.log(`Level ${completedLevelIdAtWin} Complete! Reason: ${victoryReason}. Final Score: ${scoreAtWin}. Emitting showVictoryScreen event.`);
                
                this.events.emit('showVictoryScreen', { 
                    completedLevelId: completedLevelIdAtWin,  // USE SNAPSHOT
                    starsEarned: starsEarned,               // USE SNAPSHOT
                    score: scoreAtWin,                      // USE SNAPSHOT
                    revealPercentage: currentRevealAtWin,   // USE SNAPSHOT
                    reason: victoryReason                   // USE SNAPSHOT
                });
                
            });
        } else if (allBombsUsed && this.revealPercentage < this.targetPercentage) {
            // If not complete and all bombs used and target not met, check for game over.
            this.checkGameOver();
        }
    }

    checkGameOver() {
        // ADD DETAILED LOG HERE
        console.log(`[GameScene.checkGameOver ENTRY PRE-CHECK] isGameOver: ${this.isGameOver}, isLevelComplete: ${this.isLevelComplete}, anyBombs: ${this.isAnyBombAvailable()}, reveal: ${this.revealPercentage}, target: ${this.targetPercentage}, setBy: ${this.gameOverSetBy}`);

        if (this.isGameOver || this.isLevelComplete) {
            console.log(`[GameScene.checkGameOver SKIPPING] Already game over (set by ${this.gameOverSetBy}) or level complete.`);
            return;
        }

        // If a victory delay timer is running, cancel it because it's game over now.
        if (this.victoryDelayTimer) {
            console.log("[GameScene.checkGameOver] Cancelling victoryDelayTimer due to game over.");
            this.victoryDelayTimer.remove(false); // remove() is the correct method, pass false to prevent callback if not needed
            this.victoryDelayTimer = null;
        }

        // Check if we have an active bomb while having no bombs available (last bomb scenario)
        const activeBomb = this.bombLauncher ? this.bombLauncher.getActiveLaunchedBomb() : null;
        if (!this.isAnyBombAvailable() && activeBomb && this.gameStateManager) {
            // Let the GameStateManager handle this special case
            console.log("[GameScene.checkGameOver] Last bomb is still active, deferring to GameStateManager");
            this.gameStateManager.checkGameOver();
            return;
        }

        if (!this.isAnyBombAvailable() && this.revealPercentage < this.targetPercentage) { // Check if all bombs are used and target not met
            // Double-check if we're in a "last bomb resolution" state
            if (this.gameStateManager && this.gameStateManager.waitingForLastBomb) {
                // Only proceed if GameStateManager indicates the last bomb has resolved
                if (activeBomb) {
                    console.log("[GameScene.checkGameOver] Still waiting for last bomb to fully resolve");
                    return;
                }
                console.log("[GameScene.checkGameOver] Last bomb has resolved, proceeding with game over");
            }

            this.isGameOver = true;
            this.gameOverSetBy = "checkGameOver"; // IDENTIFY SETTER
            if (this.audioManager) this.audioManager.playGameOverSound();
            console.log(`Game Over! Revealed: ${this.revealPercentage}%, Target: ${this.targetPercentage}%`);
            console.log("[GameScene.checkGameOver] Emitting 'gameOver' event NOW.");
            this.events.emit('gameOver', { 
                percentage: this.revealPercentage, 
                targetPercentage: this.targetPercentage, 
                score: this.score 
            });

            // Ensure bomb states are cleared to prevent further bomb creation attempts
            if (this.bombState) {
                this.bombState.active = false;
                // Potentially clear pendingReset flags if they exist and are relevant here
            }
            if (this.bombLauncher && this.bombLauncher.bombState) {
                this.bombLauncher.bombState.active = false;
            }
        }
    }

    isAnyBombAvailable() {
        return Object.values(this.bombsRemaining).some(count => count > 0);
    }

    resetBomb() {
        try {
            // Clear existing bomb if any
            if (this.bomb && this.bomb.scene) {
                // If bomb is a Matter body, remove it from world
                if (this.bomb.body) {
                    this.matter.world.remove(this.bomb.body);
                }
                this.bomb.destroy();
                this.bomb = null;
            }
            
            // Clean up any trajectory dots 
            if (this.bombLauncher) {
                this.bombLauncher.clearVisuals();
                
                // Also reset bomb state in the launcher
                if (this.bombLauncher.bombState) {
                    this.bombLauncher.bombState.active = false;
                }
                
                // Create a new bomb (always possible with unlimited shots)
                console.log("Using BombLauncher to create new bomb of type:", this.currentBombType);
                if (this.debugMode) console.log(`[ResetBomb] Calling BombLauncher.createBomb with type: ${this.currentBombType}`);
                this.bombLauncher.createBomb(this.currentBombType);

            } else {
                console.warn("No bombLauncher found in resetBomb");
                // Create a basic bomb if the launcher doesn't exist
                this.bomb = this.matter.add.image(this.BOW_X, this.BOW_Y - 20, this.currentBombType);
                this.bomb.setCircle(30);
                this.bomb.setStatic(true);
                this.bomb.bombType = this.currentBombType;
            }
        } catch (error) {
            console.error("Error in resetBomb:", error);
        }
    }
    
    updateUI() {
        try {
            if (this.ui && typeof this.ui.setTexts === 'function') {
                // Update UI with current game values
                this.ui.setTexts(
                    `Bombs: ${this.shotsRemaining}`, 
                    `Score: ${this.score || 0}`
                );
                
                // Make sure UI elements have proper depth
                if (this.ui.bombsText) {
                    this.ui.bombsText.setDepth(this.UI_DEPTH + 1);
                }
                if (this.ui.scoreText) {
                    this.ui.scoreText.setDepth(this.UI_DEPTH + 1);
                }
            }
        } catch (error) {
            console.error("Error updating UI:", error);
        }
    }
    
    createDynamicBomb(x, y, bombType, forceX, forceY) {
        // Update bomb state tracking
        this.bombState.lastBombFired = Date.now();
        
        // Reset the last reveal percentage for the new shot
        this.lastRevealPercentage = this.revealPercentage;
        if (this.debugMode) {
            console.log(`Reset voice tracking: current reveal is ${this.revealPercentage}%`);
        }
        
        // Set bomb properties based on type
        let bombProperties = {
            restitution: 0.9, // Increased for better bouncing in ultra-low gravity
            friction: 0.01, // Reduced for less surface friction
            density: 0.0003, // Keep the same density
            frictionAir: 0.001 // Reduced from 0.004 to 0.001 for less air resistance
        };
        
        // Adjust properties for special bomb types
        switch(bombType) {
            case this.BOMB_TYPES.PIERCER:
                // Piercer has lower friction and higher density
                bombProperties.friction = 0.002;
                bombProperties.frictionAir = 0.0008; // Reduced from 0.003 to 0.0008
                bombProperties.density = 0.0005;
                break;
                
            case this.BOMB_TYPES.CLUSTER:
                // Cluster is a bit lighter
                bombProperties.density = 0.0002;
                bombProperties.frictionAir = 0.001; // Reduced from 0.005 to 0.001
                break;
                
            case this.BOMB_TYPES.STICKY:
                // Sticky bombs should be a bit lighter too
                bombProperties.density = 0.0003;
                bombProperties.frictionAir = 0.001; // Reduced from 0.004 to 0.001
                break;
                
            case this.BOMB_TYPES.SHATTERER:
                // Shatterer is heavier but still needs adjustment
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0009; // Reduced from 0.0036 to 0.0009
                break;
                
            case this.BOMB_TYPES.DRILLER:
                // Driller needs good momentum
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0008; // Reduced from 0.003 to 0.0008
                break;
                
            case this.BOMB_TYPES.SHRAPNEL:
                // Shrapnel bomb needs to fragment, similar to Cluster but slightly different
                bombProperties.density = 0.0003;
                bombProperties.frictionAir = 0.001;
                break;
                
            case this.BOMB_TYPES.MELTER:
                // Melter bomb should have medium weight properties
                bombProperties.density = 0.0003;
                bombProperties.frictionAir = 0.001;
                bombProperties.restitution = 0.85; // Slightly less bouncy
                break;
                
            case this.BOMB_TYPES.RICOCHET:
                // Ricochet needs perfect bouncing
                bombProperties.restitution = 1.0; // Perfect elasticity for bouncing
                bombProperties.friction = 0.001; // Very low friction for smooth bounces
                bombProperties.frictionAir = 0.0005; // Very low air friction to maintain speed
                bombProperties.density = 0.0003; // Same density
                // Set special property for ricochet bomb to identify it
                this.isRicochetBomb = true;
                break;
        }
        
        // Create the bomb with appropriate properties - use bombType directly as it already contains the correct texture name
        this.bomb = this.matter.add.image(x, y, bombType, null, bombProperties);
        this.bomb.setCircle(30); // Set physics circle radius to 30 (half of 60x60)
        this.bomb.bombType = bombType; // Store the bomb type for later use
        this.bomb.setDepth(12); // Same depth as static bomb
        
        // Set bomb size to 60x60 (reduced from 80x80)
        this.bomb.setDisplaySize(60, 60);
        
        // Mark as a launched bomb (not static at slingshot)
        this.bomb.isLaunched = true;
        this.bomb.hasHitIceBlock = false;
        
        // Add special properties for Ricochet bombs
        if (bombType === this.BOMB_TYPES.RICOCHET) {
            this.bomb.isRicochet = true;
            
            // Initialize bounce tracking properties
            this.bomb.lastBounceTime = 0;
            this.bomb.lastBounceX = x;
            this.bomb.lastBounceY = y;
            
            // Create a countdown display for the ricochet bomb
            const countdownDuration = 5000; // 5 seconds in ms
            this.bomb.bounceStartTime = Date.now();
            this.bomb.bounceDuration = countdownDuration;
            
            // Text to show countdown
            this.bomb.countdownText = this.add.text(x, y - 30, '5.0', {
                font: '16px Arial',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            this.bomb.countdownText.setDepth(20);
            
            // Update countdown each frame
            this.bomb.countdown = this.time.addEvent({
                delay: 100, // Update every 100ms
                callback: () => {
                    if (!this.bomb || !this.bomb.scene) return;
                    
                    const elapsed = Date.now() - this.bomb.bounceStartTime;
                    const remaining = Math.max(0, (this.bomb.bounceDuration - elapsed) / 1000);
                    
                    // Update the text
                    if (this.bomb.countdownText && this.bomb.countdownText.scene) {
                        this.bomb.countdownText.setText(remaining.toFixed(1));
                        this.bomb.countdownText.setPosition(this.bomb.x, this.bomb.y - 30);
                        
                        // Change color as time gets lower
                        if (remaining < 1) {
                            this.bomb.countdownText.setFill('#FF0000'); // Red when < 1 second
                        } else if (remaining < 2) {
                            this.bomb.countdownText.setFill('#FFFF00'); // Yellow when < 2 seconds
                        }
                    }
                    
                    // Explode when time is up
                    if (remaining <= 0 && this.bomb && !this.bomb.hasExploded) {
                        if (this.bombUtils) {
                            this.bombUtils.explodeRicochetBomb(this.bomb);
                        } else {
                            // Fallback
                            this.handleRicochetBomb(this.bomb.x, this.bomb.y);
                            if (this.bomb && this.bomb.scene) {
                                this.bomb.destroy();
                            }
                            this.bomb = null;
                        }
                    }
                },
                callbackScope: this,
                loop: true
            });
        }
        
        // Update bomb state
        this.bombState.active = true;
        
        // Apply impulse (instant force)
        this.matter.body.applyForce(this.bomb.body, 
            { x: x, y: y }, 
            { x: forceX, y: forceY });
        
        // Track when the bomb was launched
        this.bomb.launchTime = this.time.now;
        
        // Set up a timer to check for missed bombs after 15 seconds (increased from 8 seconds)
        this.bombMissTimer = this.time.delayedCall(15000, () => {
            // If the bomb still exists, is launched, and hasn't hit an ice block, consider it a miss
            if (this.bomb && this.bomb.isLaunched && !this.bomb.hasHitIceBlock) {
                if (this.debugMode) {
                    console.log("Bomb missed all ice blocks for 15 seconds, destroying it");
                }
                
                // Create a small "fizzle" effect
                this.createFizzleEffect(this.bomb.x, this.bomb.y);
                
                // Destroy the bomb
                if (this.bomb && this.bomb.scene) {
                    this.bomb.destroy();
                }
                this.bomb = null;
                
                // Update bomb state
                this.bombState.active = false;
                
                // Reset bomb for next shot if shots remain after a small delay
                // Store the timeout ID so we can cancel it if needed
                if (this.pendingReset) {
                    clearTimeout(this.pendingReset);
                }
                
                // Record when we're scheduling a pending reset
                this.bombState.pendingReset = Date.now();
                
                this.pendingReset = setTimeout(() => {
                    this.pendingReset = null;
                    this.bombState.pendingReset = null;
                    
                    if (this.shotsRemaining > 0) {
                        this.resetBomb();
                    } else {
                        // Check level completion or game over if no shots remain
                        this.checkLevelCompletion();
                    }
                }, 1000);
            }
        });
        
        // Set up an emergency auto-reset timer as a fallback
        // This ensures that even if all other systems fail, we'll still reset after a maximum time
        if (this.bombState.autoResetTimer) {
            clearTimeout(this.bombState.autoResetTimer);
        }
        
        this.bombState.autoResetTimer = setTimeout(() => {
            // Only run if the current bomb is still the one we created
            if (this.bomb && this.bomb.isLaunched && !this.bomb.hasHitIceBlock) {
                if (this.debugMode) {
                    console.warn("EMERGENCY AUTO-RESET: Bomb active too long, forcing reset");
                }
                this.forceResetGameState();
            }
        }, this.bombState.maxIdleTime);
        
        // Fallback: try direct velocity set if needed
        if (this.debugMode) {
            this.time.delayedCall(100, () => {
                if (this.bomb && this.bomb.body && 
                    Math.abs(this.bomb.body.velocity.x) < 0.1 && 
                    Math.abs(this.bomb.body.velocity.y) < 0.1) {
                    console.log("Force didn't work, trying velocity directly");
                    const dx = this.BOW_X - x;
                    const dy = (this.BOW_Y - 30) - y;
                    this.bomb.setVelocity(dx * 0.2, dy * 0.2);
                }
            });
        }
    }
    
    // Create a small fizzle effect when a bomb misses
    createFizzleEffect(x, y) {
        try {
            // Create a particle emitter for the fizzle effect
        const particles = this.add.particles('particle');
        
        const emitter = particles.createEmitter({
                x: x,
                y: y,
                speed: { min: 50, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
                lifespan: 800,
                gravityY: 100,
                quantity: 15,
                tint: [0xffff00, 0xff0000, 0xffffff]
            });
            
            // Play a sound effect if available
            if (this.audioManager && this.audioManager.playSound) {
                this.audioManager.playSound('fizzle'); // Use AudioManager
            } else {
                 // Fallback for fizzle sound if audioManager or playSound is not available
                console.warn("AudioManager or playSound not available for fizzle, trying direct sound as last resort.");
                if (this.sound && this.sound.add) { // Fallback if AudioManager is not ready
            try {
                const fizzleSound = this.sound.add('fizzle', { volume: 0.3 });
                fizzleSound.play();
            } catch (e) {
                        console.log("Fizzle sound not available (direct fallback):", e);
                        try {
                            const fallbackExplosion = this.sound.add('explosion');
                            fallbackExplosion.play({ volume: 0.2, rate: 0.5 });
                        } catch (e2) {
                            console.log("Fallback explosion sound not available either (direct fallback).");
                        }
                    }
                }
            }
            
            // Set the emitter to emit all particles at once, then stop
            emitter.explode(20, x, y);
        
        // Destroy the particle system after emissions complete
        this.time.delayedCall(1000, () => {
            particles.destroy();
        });
        } catch (error) {
            console.error("Error creating fizzle effect:", error);
        }
    }

    createTargets() {
        try {
            // Create ice blocks that will serve as targets to break
            this.createIceBlocks();
            
            // Setup collision detection for the targets
            // this.setupCollisions(); // OLD REGISTRATION - now handled by CollisionManager
            // this.processCollisions(); // INCORRECT CALL - processCollisions is an event handler
            
            console.log("Targets created successfully");
        } catch (error) {
            console.error("Error in createTargets:", error);
        }
    }
    
    setupInputHandlers() {
        console.log("Setting up input handlers");
        
        // Check if input handlers are already set up to avoid duplicate handlers
        if (this.inputHandlersSetup) {
            console.log("Input handlers already set up, skipping");
            return;
        }
        
        // Mark input handlers as set up
        this.inputHandlersSetup = true;
        
        // Create BombInputHandler if not already created
        if (!this.bombInputHandler) {
            this.bombInputHandler = new BombInputHandler(this);
                }
                
        // Set up input handlers through the BombInputHandler
        this.bombInputHandler.setupInputHandlers();
        
        // Add a keyboard shortcut for toggling debug visuals (D key)
        this.input.keyboard.on('keydown-D', () => {
            this.toggleDebugVisuals();
            
            // Also update BombLauncher debug mode if available
            if (this.bombLauncher) {
                this.bombLauncher.debugMode = this.debugMode;
            }
        });
        
        console.log("Input handlers set up successfully");
    }
    
    // Method to toggle debug visuals on/off
    toggleDebugVisuals() {
        // Toggle the debug mode flag
        this.debugMode = !this.debugMode;
        console.log(`Debug visuals ${this.debugMode ? 'enabled' : 'disabled'}`);
        
        // Toggle debug mode in BombLauncher if available
        if (this.bombLauncher && this.bombLauncher.toggleDebugMode) {
            this.bombLauncher.toggleDebugMode(this.debugMode);
        }
        
        // Clean up existing debug visuals if any
        if (this.debugVisuals && this.debugVisuals.length > 0) {
            this.debugVisuals.forEach(visual => {
                if (visual && typeof visual.destroy === 'function') {
                    visual.destroy();
                }
            });
            this.debugVisuals = [];
        }
        
        // If debug mode is now on, recreate the debug visuals
        if (this.debugMode && this.boundaryBlocks && this.boundaryBlocks.length > 0) {
            this.debugVisuals = this.debugVisuals || [];
            
            // Create debug visuals for each boundary
            this.boundaryBlocks.forEach(border => {
                if (border && border.body) {
                    const bounds = border.body.bounds;
                    const width = bounds.max.x - bounds.min.x;
                    const height = bounds.max.y - bounds.min.y;
                    const x = bounds.min.x + width/2;
                    const y = bounds.min.y + height/2;
                    
                    const debugVisual = this.add.rectangle(x, y, width, height, 0x00ff00, 0.3);
                    debugVisual.setDepth(10); // Above everything
                    debugVisual.setStrokeStyle(1, 0xffffff);
                    
                    this.debugVisuals.push(debugVisual);
                }
            });
            
            console.log(`Created ${this.debugVisuals.length} debug visuals for reflective borders`);
        }
    }

    
    
    resetLevel() {
        // Reset game state via GameStateManager
        if (this.gameStateManager) {
            this.gameStateManager.resetGameState();
            
            // Sync state variables for compatibility
            this.isLevelComplete = this.gameStateManager.isLevelComplete;
            this.isGameOver = this.gameStateManager.isGameOver;
        } else {
            // Fallback if gameStateManager is not available
            this.isLevelComplete = false;
            this.isGameOver = false;
        }
        
        // Reset other game state variables
        this.gameOver = false;
        this.revealPercentage = 0;
        
        // Reset the ice block counters
        this.clearedIceBlocks = 0;
        
        // Reset bomb counts
        this.resetBombCounts(); // Ensures all bomb counts are zeroed out
        this.setupBombs(); // ADD THIS LINE - Repopulate bombsRemaining from LevelManager
        
        // Update bomb counter displays via event for UIScene
        this.events.emit('initialUIDataReady'); // UIScene will fetch all counts
        
        // Restart background music
        this.time.delayedCall(500, () => {
            if (this.audioManager) {
                this.audioManager.playBackgroundMusic();
            }
        });
        
        // Clear existing blue veils
        if (this.blueVeils) {
            this.blueVeils.forEach(veil => {
                if (veil && veil.scene) {
                    // Handle any highlight effects
                    if (veil.highlight && veil.highlight.scene) {
                        this.tweens.add({
                            targets: veil.highlight,
                            alpha: 0,
                            duration: 8000, // 8 seconds
                            ease: 'Linear',
                            onComplete: () => {
                                if (veil.highlight && veil.highlight.scene) {
                                    veil.highlight.destroy();
                                }
                            }
                        });
                    }
                    
                    // Instead of destroying immediately, fade them out
                    this.tweens.add({
                        targets: veil,
                        alpha: 0,
                        duration: 8000, // 8 seconds
                        ease: 'Linear',
                        onComplete: () => {
                            if (veil && veil.scene) {
                                veil.destroy();
                            }
                        }
                    });
                }
            });
            // Create a new array for the next level's veils
            this.blueVeils = [];
        }
        
        // Clear any active sticky bombs
        if (this.activeStickyBombs) {
            this.activeStickyBombs.forEach(stickyBomb => {
                this.bombUtils.cleanupBombResources(stickyBomb);
            });
            this.activeStickyBombs = [];
        }
        
        // Make sure chibi image is fully opaque
        if (this.chibiImage) {
            this.chibiImage.setAlpha(1);
        }
        
        // Reset bomb
        this.resetBomb();
        
        // Recreate ice blocks (which will also recreate blue veils)
        this.createIceBlocks();
        
        // Recreate the completion veil
        if (this.completionVeil) {
            console.log("Cleaning up previous completion veil during level reset");
            
            // If it's a container, destroy all children
            if (this.veilContainer) {
                this.veilContainer.setVisible(false);
                this.veilContainer.destroy(true);
                this.veilContainer = null;
            } else if (this.completionVeil.scene) {
                this.completionVeil.setVisible(false);
                this.completionVeil.destroy();
            }
            
            this.completionVeil = null;
        }
        
        if (this.frostGraphics && this.frostGraphics.scene) {
            this.frostGraphics.setVisible(false);
            this.frostGraphics.destroy();
            this.frostGraphics = null;
        }
        
        // Reset the completionVeilRemoved flag
        this.completionVeilRemoved = false;
        
        // Use our new method to create a completion veil that matches the chibi shape
        this.createCompletionVeil();
        
        // Update UI via events for UIScene
        this.events.emit('updateShots', this.shotsRemaining);
        this.events.emit('updatePercentage', this.revealPercentage);
    }
    
    update(time, delta) {
        try {
            // >>> ADD THIS CHECK AT THE VERY BEGINNING <<<
            if (!this.isFullyInitialized || this.scene.isPaused() || !this.scene.isActive()) {
                return;
            }

            // Check if the scene is paused or being destroyed -- This check is now part of the above
            // if (this.scene.isPaused() || !this.scene.isActive()) {
            //         return;
            //     }
                
            // Apply any settings that need to be updated every frame
            if (typeof this.applyGameSettings === 'function') {
                this.applyGameSettings(delta);
            }
            
            // Update bow string and position when aiming
            // This is now handled by BombLauncher and/or BombInputHandler
            /*
            if (this.isAiming && this.lastPointer) {
                this.updateBowstring();
                
                if (this.bombLauncher) {
                    this.bombLauncher.updateBombPosition(this.lastPointer);
                }
            }
            */
            
            // Check for ricochet bombs that may need to bounce
            if (this.bomb && this.bomb.isRicochet && !this.bomb.hasExploded && this.bombUtils) {
                try {
                    // Handle bounces for ricochet bombs if needed
                    this.bombUtils.handleRicochetBoundaryHit(this.bomb);
                } catch (error) {
                    console.error("Error in ricochet boundary handling:", error);
                    
                    // Safely attempt to explode the bomb if it's causing errors
                    if (this.bomb && this.bomb.scene && !this.bomb.hasExploded) {
                        console.log("Forcing explosion of ricochet bomb due to error");
                        this.bombUtils.explodeRicochetBomb(this.bomb);
                    }
                }
            }
            
            // Check for bombs that have gone out of bounds
            if (this.bombLauncher) {
                try {
                    // if (this.debugMode) console.log("[Update] Calling checkForMissedBombs"); // Commented out
                    this.bombLauncher.checkForMissedBombs();
                } catch (e) {
                    console.error("Error checking for missed bombs:", e);
                    
                    // Safety reset if we encounter an error
                    this.resetFailedBomb();
                }
            }
            
            // Check for bombs that have stopped moving
            if (this.bombLauncher) {
                try {
                    // if (this.debugMode) console.log("[Update] Calling checkForStoppedBombs"); // Commented out
                    this.bombLauncher.checkForStoppedBombs();
                } catch (e) {
                    console.error("Error checking for stopped bombs:", e);
                    
                    // Safety reset if we encounter an error
                    this.resetFailedBomb();
                }
            }
            
            // Update UI elements - THIS IS NOW HANDLED BY UISCENE VIA EVENTS
            // this.updateUI(); 
            
            // Check win/lose conditions if needed
            if (this.gameStateManager && typeof this.gameStateManager.checkGameState === 'function') {
                this.gameStateManager.checkGameState();
            }
        } catch (error) {
            console.error("Critical error in update loop:", error);
            
            // Attempt to recover from errors
            this.time.delayedCall(100, () => {
                this.resetFailedBomb();
            });
        }
    }
    
    // Emergency method to reset after a bomb failure
    resetFailedBomb() {
        try {
            // Destroy the failed bomb
            if (this.bomb && this.bomb.scene) {
                // Create fizzle effect if the method exists
                if (this.createFizzleEffect) {
                    this.createFizzleEffect(this.bomb.x, this.bomb.y);
                }
                
                // Remove from Matter world if it's a Matter body
                if (this.bomb.body) {
                    this.matter.world.remove(this.bomb.body);
                }
                
                this.bomb.destroy();
                this.bomb = null;
            }
            
            // Ensure bomb state is inactive
            if (this.bombState) {
                this.bombState.active = false;
            }
            
            // Clear trajectory if it exists
            if (this.clearTrajectory) {
                this.clearTrajectory();
            }
            
            // Create a new bomb after a short delay
            this.time.delayedCall(300, () => {
                // ADDED: If the bomb launcher is currently aiming, don't create a new bomb here.
                if (this.bombLauncher && this.bombLauncher.isAiming) {
                    console.log("[GameScene.resetFailedBomb.delayedCall] Currently aiming, deferring new bomb creation.");
                    this.bombState.active = false; // Ensure state reflects no active bomb for GameScene
                    if(this.bombLauncher.bombState) this.bombLauncher.bombState.active = false; // Sync with launcher
                    return; 
                }

                if (!this.isAnyBombAvailable()) {
                    console.log("resetFailedBomb: No bombs available after failed bomb. Checking level completion/game over.");
                    this.checkLevelCompletion(); // CALL THIS FIRST
                } else {
                    // Only create a new bomb if some are actually available and game is not over/complete
                    if (this.isAnyBombAvailable() && !this.isGameOver && !this.isLevelComplete) {
                        if (this.bombLauncher) {
                            this.bombLauncher.createBomb(this.currentBombType || 'bomb');
                        } else {
                            this.resetBomb();
                        }
                    } else if (!this.isGameOver && !this.isLevelComplete) {
                        // This case implies no bombs available but game not yet over - should be caught by previous checkGameOver
                        console.log("resetFailedBomb: Condition where no bombs available but game not over. Should have been handled.");
                    }
                }
            });
        } catch (e) {
            console.error("Error in resetFailedBomb:", e);
            
            // Last resort - force reset the game state
            this.time.delayedCall(500, () => {
                if (this.forceResetGameState) {
                    this.forceResetGameState();
                }
            });
        }
    }
    
    // Helper method to handle bomb explosions safely
    handleBombExplosion(bombX, bombY, bombType) {
        // Logic to handle the explosion effects based on bomb type
        // For example, creating particles, sound effects, etc.

        // Find the bomb that exploded (if needed, or assume 'bomb' is passed or available)
        // This part is highly dependent on how bomb instances are tracked.
        // For simplicity, assuming 'bomb' is the game object that just exploded.

        let bombToCleanup = this.bombLauncher.getActiveLaunchedBomb(); // Or find it another way

        if (bombToCleanup) {
            console.log("Cleaning up bomb after explosion:", bombToCleanup.bombType);
             this.bombUtils.cleanupBombResources(bombToCleanup); // Use bombUtils
        }


        // After cleaning up, reset the bomb state
        this.bombLauncher.clearActiveBomb(); // Ensure bombLauncher knows the bomb is gone
        this.bombState.active = false; 
        this.bombState.currentBombType = null;

        if (!this.isAnyBombAvailable()) {
            this.checkGameOver();
        } else {
            // If other bombs are available, reset to the default or next available bomb.
            // This logic might need to be more sophisticated depending on game design.
            // For now, let's assume it resets to a state where a new bomb can be selected/launched.
            this.bombLauncher.resetSlingshotBomb(); 
        }
    }
    
    init(data) {
        console.log("[GameScene.init] Received data:", data); // ADD THIS LOG
        // Initialize or reset game state variables
        this.currentLevel = data.levelNumber || 1; // Default to level 1 if not provided
        console.log(`[GameScene.init] Set currentLevel to: ${this.currentLevel}`); // ADD THIS LOG
        
            this.shotsRemaining = 999; // Set to a very high number for "unlimited"
            // this.isAiming = false; // Managed by BombLauncher or BombInputHandler
            this.bombFired = false;
            this.bombReady = false;
            // this.isDragging = false; // Managed by BombInputHandler
            this.gameOver = false;
            this.isLevelComplete = false;
            this.isGameOver = false;
            
            // Debug settings
            this.debugMode = true;
            this.debugText = null;
            
            // Store any data passed from previous scene
            this.sceneData = data || {};
            
        // Initialize UI reference - REMOVE THIS
        // this.ui = null; 
            
            console.log("GameScene initialized with data:", data);
            
            // Carry over data from previous scenes
            if (data) {
                // Handle any input from parent scene
                this.currentLevel = data.levelNumber || 1;
                console.log(`Starting level ${this.currentLevel}`);
                
                // Force cleanup of any existing UI - Handled by UIScene's shutdown and GameScene's stop('UIScene')
                // if (this.bombSelectorContainer) {
                //     this.bombSelectorContainer.destroy();
                //     this.bombSelectorContainer = null;
                //     
                //     // Force clear references to buttons
                //     // this.blastButton = null;
                //     // this.piercerButton = null;
                //     // this.clusterButton = null;
                //     // this.stickyButton = null;
                //     // this.shattererButton = null;
                //     // this.drillerButton = null;
                //     // this.ricochetButton = null;
                //     // this.selectionIndicator = null;
                //     
                //     console.log("Cleaned up previous bomb selector UI");
                // }
                
                // Stop any existing audio
                if (this.audioManager && this.audioManager.bgMusic) {
                    try {
                        this.audioManager.bgMusic.stop();
                        console.log("Stopped background music from previous level");
                    } catch (err) {
                        console.warn("Error stopping previous level music:", err);
                    }
                }
            }
            
            // Fully reset bombs for the new level
            this.resetBombCounts();
        
        // Listen for bomb selection requests from UIScene
        // It's crucial this is set up early, e.g., in init or constructor if UIScene can be active before GameScene's create.
        // However, UIScene gets GameScene reference in its own create, and GameScene launches UIScene in setupGame (called by create).
        // So, this should be fine here, or in create(). Let's confirm UIScene isn't started before this.
        // GameScene.setupGame() ensures UIScene is running. UIScene.setupEventListeners() then gets this.gameScene.
        // This seems like a safe place if init() always runs before UIScene might try to emit.
        if (this.events) {
             console.log(`[GameScene.init for Level ${this.currentLevel}] Setting up listeners. Using .once for 'goToNextLevel'.`);
            // Defensively remove any potential old listener for this specific context before adding a new one.
            this.events.off('goToNextLevel', this.handleGoToNextLevel, this);
            
            this.events.on('selectBombTypeRequest', this.handleBombTypeSelectionRequest, this);
            // Use .once for goToNextLevel to ensure it only fires once per scene instance
            this.events.once('goToNextLevel', this.handleGoToNextLevel, this);
        } else {
            console.error(`[GameScene.init for Level ${this.currentLevel}] this.events not available to set up listeners!`);
        }
            
            console.log("Initialization complete for level", this.currentLevel);
    }
    
    // New helper method to reset bomb counts when changing levels
    resetBombCounts() {
        console.log("Completely resetting bomb counts for new level");
        // Reset all bomb counts to zero to prepare for new level configuration
        this.bombsRemaining = {
            [this.BOMB_TYPES.BLAST]: 0,
            [this.BOMB_TYPES.PIERCER]: 0,
            [this.BOMB_TYPES.CLUSTER]: 0,
            [this.BOMB_TYPES.STICKY]: 0,
            [this.BOMB_TYPES.SHATTERER]: 0,
            [this.BOMB_TYPES.DRILLER]: 0,
            [this.BOMB_TYPES.RICOCHET]: 0,
            [this.BOMB_TYPES.SHRAPNEL]: 0,
            [this.BOMB_TYPES.MELTER]: 0
        };
        
        // Always ensure 3 Melter bombs for testing purposes
        this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3;
    }

   
    
   
    
    selectBombType(bombType) {
        console.log(`[GameScene.selectBombType] Method started for bombType: ${bombType}. Current bomb: ${this.currentBombType}`); // ADD THIS LOG
        // Store previous bomb type before changing
        const previousBombType = this.currentBombType;
        
        // Update current bomb type
        this.currentBombType = bombType;
        
        // Add visual effect for type change
        if (previousBombType !== bombType) {
            // Add a small camera shake effect for feedback
            if (this.cameras && this.cameras.main) {
                this.cameras.main.shake(100, 0.003);
            }
            
            // Add flash effect for bomb switch
            const flash = this.add.circle(this.BOW_X, this.BOW_Y - 20, 40, 0xffffff, 0.7);
            flash.setDepth(50);
            
            // Animate the flash
            this.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 2,
                duration: 300,
                onComplete: () => {
                    flash.destroy();
                }
            });
            
            // Play switch sound if available
            if (this.audioManager && this.audioManager.playSound) {
                this.audioManager.playSound('switch', { volume: 0.3 }); // Use AudioManager
            } else {
                console.warn("AudioManager not available for switch sound.");
            }
            
            console.log(`Bomb type changed from ${previousBombType} to ${bombType}`);
        }
        
        // Update UI
        // this.updateBombUI(); // <--- THIS LINE NEEDS TO BE REMOVED
        
        // Only create a new bomb if not actively aiming or if no bomb exists
        if (!this.isAiming) {
            // Create a new bomb with the selected type using the BombLauncher
            if (this.bombLauncher) {
                console.log(`Creating new bomb of type ${bombType}`);
                this.bombLauncher.createBomb(bombType);
                
                // Store reference to the bombLauncher's bomb for backward compatibility
                this.bomb = this.bombLauncher.bomb;
                
                // Add a small highlight effect to show the new bomb
                const highlight = this.add.circle(this.BOW_X, this.BOW_Y - 20, 35, 0xffff00, 0.3);
                highlight.setDepth(11);
                
                // Animate the highlight
                this.tweens.add({
                    targets: highlight,
                    alpha: 0,
                    scale: 1.5,
                    duration: 500,
                    onComplete: () => {
                        highlight.destroy();
                    }
                });
            } else {
                // Fallback to legacy method if BombLauncher isn't available
        if (this.bomb && this.bomb.body && this.bomb.body.isStatic) {
                    this.bomb.setTexture(bombType);
            
            // Make sure the bomb is at the slingshot position
                this.bomb.setPosition(this.BOW_X, this.BOW_Y - 20);
                
                // Update the highlight position
                if (this.bombHighlight) {
                    this.bombHighlight.setPosition(this.BOW_X, this.BOW_Y - 20);
                }
                } else {
                    // Create a new bomb if none exists
                    this.resetBomb();
                }
            }
        } else if (this.isAiming && this.bomb && this.bomb.body && this.bomb.body.isStatic) {
            // If already aiming, just update the texture without changing position
            this.bomb.setTexture(bombType);
            
            // Add a quick flash effect around the bomb to show the texture change
            const aimingFlash = this.add.circle(this.bomb.x, this.bomb.y, 35, 0xffff00, 0.3);
            aimingFlash.setDepth(11);
            
            // Animate the flash
            this.tweens.add({
                targets: aimingFlash,
                alpha: 0,
                scale: 1.5,
                duration: 300,
                onComplete: () => {
                    aimingFlash.destroy();
                }
            });
            
            console.log(`Changed texture to ${bombType} while aiming`);
        } else {
            console.log(`Bomb type set to ${bombType}, will be used for next bomb`);
        }

        // After all logic, emit an event to notify UIScene (and potentially other listeners)
        console.log(`[GameScene.selectBombType] Emitting 'bombTypeSelected' with type: ${this.currentBombType}`); // ADD THIS LOG
        this.events.emit('bombTypeSelected', this.currentBombType);
    }
    
   

    
    // Add a new method to trigger sticky bombs
    triggerStickyBomb(x, y, radius) {
        // Ensure activeStickyBombs is initialized
        if (!this.activeStickyBombs) {
            this.activeStickyBombs = [];
        }
        if (!this.activeDrillerBombs) { // Ensure activeDrillerBombs is initialized
            this.activeDrillerBombs = [];
        }

        const allTriggeredBombsData = []; // Store data objects (stickyBomb or drillerData)
        
        // Check for regular sticky bombs
        this.activeStickyBombs = this.activeStickyBombs.filter(stickyBombData => {
            if (!stickyBombData || !stickyBombData.isActive || !stickyBombData.bombSprite || !stickyBombData.bombSprite.scene) return false; // Already cleaned up or invalid

            const distance = Phaser.Math.Distance.Between(x, y, stickyBombData.x, stickyBombData.y);
            if (distance < radius) {
                console.log("[GameScene.triggerStickyBomb] Triggering STICKY bomb at", stickyBombData.x, stickyBombData.y, "by explosion at", x, y);
                stickyBombData.isActive = false; // Mark as triggered
                allTriggeredBombsData.push(stickyBombData);
                return false; // Remove from active list
            }
            return true; // Keep in active list
        });
        
        // Check for active driller bombs
        this.activeDrillerBombs = this.activeDrillerBombs.filter(drillerData => {
            if (!drillerData || !drillerData.associatedBombInstance || !drillerData.associatedBombInstance.scene) {
                 console.log("[GameScene.triggerStickyBomb] Filtering out invalid drillerData (no instance or scene):", drillerData ? drillerData.uniqueId : "N/A");
                return false; // Invalid or cleaned up
            }
            // Only trigger driller bombs that have COMPLETED drilling and haven't been triggered yet.
            if (drillerData.hasCompletedDrilling && !drillerData.hasBeenTriggeredExternally) {
                const distance = Phaser.Math.Distance.Between(x, y, drillerData.currentX, drillerData.currentY); // Use currentX/Y for driller
            if (distance < radius) {
                    console.log(`[GameScene.triggerStickyBomb] Triggering COMPLETED DRILLER bomb (ID: ${drillerData.uniqueId}) at (${drillerData.currentX.toFixed(1)}, ${drillerData.currentY.toFixed(1)}) by explosion at (${x.toFixed(1)}, ${y.toFixed(1)})`);
                    drillerData.hasBeenTriggeredExternally = true; // Mark as triggered
                    drillerData.isActive = false; // Ensure it's fully inactive
                    allTriggeredBombsData.push(drillerData); // Add its data object
                    return false; // Remove from active list for further external triggers
                }
                } else {
                if (!drillerData.hasCompletedDrilling) {
                     console.log(`[GameScene.triggerStickyBomb] Driller bomb (ID: ${drillerData.uniqueId}) has not completed drilling. Not triggering.`);
                }
                if (drillerData.hasBeenTriggeredExternally) {
                    console.log(`[GameScene.triggerStickyBomb] Driller bomb (ID: ${drillerData.uniqueId}) has already been triggered. Not re-triggering.`);
                }
            }
            return true; // Keep in active list if not triggered
        });

        // Now process all triggered bombs data
        allTriggeredBombsData.forEach(bombData => {
            if (bombData.isSticky) { // Identified by a property on the stickyBomb object itself
                // Regular sticky bombs get a large explosion after a delay
                this.time.delayedCall(Phaser.Math.Between(50, 250), () => { // Shorter, slightly random delay
                    console.log(`[GameScene.triggerStickyBomb] Detonating STICKY bomb at (${bombData.x.toFixed(1)}, ${bombData.y.toFixed(1)})`);
                    this.bombUtils.createLargeExplosion(bombData.x, bombData.y);
                    this.bombUtils.destroyBlocksInRadius(bombData.x, bombData.y, bombData.explosionRadius || 200);
                    this.bombUtils.cleanupBombResources(bombData); // Pass the whole stickyBomb data object
                });
            } else { // Assumed to be drillerData if not sticky
                // Driller bombs explode immediately using their specific explosion
                console.log(`[GameScene.triggerStickyBomb] Detonating DRILLER bomb (ID: ${bombData.uniqueId}) at (${bombData.currentX.toFixed(1)}, ${bombData.currentY.toFixed(1)})`);
                this.bombUtils.createDrillerExplosion(bombData.currentX, bombData.currentY);
                // The driller's associatedBombInstance should be cleaned up here too
                if (bombData.associatedBombInstance && bombData.associatedBombInstance.scene) {
                    this.bombUtils.cleanupBombResources(bombData.associatedBombInstance);
                    // bombData.associatedBombInstance.destroy(); // This might already happen in cleanupBombResources or createDrillerExplosion handles it
                    bombData.associatedBombInstance = null;
                }
                 // Ensure its timers are stopped if somehow still running (should be stopped by completeDrilling)
                if (bombData.timer) bombData.timer.remove();
                if (bombData.drillIntervalTimer) bombData.drillIntervalTimer.remove();
            }
        });
        
        return allTriggeredBombsData.length > 0;
    }
    
    // Method destroyBlocksWithShatterer (previously around lines 2084-2149) 
    // has been moved to BombUtils.js

    initializeAudio() {
        try {
            console.log("Initializing audio system...");
            
            // First verify if AudioManager class exists globally
            if (typeof AudioManager === 'undefined') {
                console.error("AudioManager class not found! Cannot initialize audio.");
                // Create a dummy object to prevent errors later
                this.audioManager = {
                    initialize: () => false,
                    playBackgroundMusic: () => {},
                    playVictoryMusic: () => {},
                    stopAll: () => {},
                    playGameOverSound: () => {},
                    playSound: () => { console.warn("[Dummy AudioManager] playSound called"); }, // ADDED THIS LINE
                    playRandomVoiceMessage: () => {},
                    loadVoiceFiles: () => {},
                    displayCongratulationText: () => {},
                    displaySpecialClearText: () => {},
                    cleanup: () => {}
                };
                return;
            }
            
            // Create a new AudioManager instance using the class from js/managers/
            this.audioManager = new AudioManager(this);
            
            // Initialize the AudioManager
            const initialized = this.audioManager.initialize();
            
            if (initialized) {
                console.log("AudioManager initialized successfully via GameScene");
            } else {
                console.warn("AudioManager initialization failed via GameScene");
                // AudioManager should handle creating its own dummy methods if initialization fails
            }
        } catch (error) {
            console.error("Error initializing audio in GameScene:", error);
             // Create a dummy object to prevent errors later
            this.audioManager = {
                initialize: () => false,
                playBackgroundMusic: () => {},
                playVictoryMusic: () => {},
                stopAll: () => {},
                playGameOverSound: () => {},
                playSound: () => { console.warn("[Dummy AudioManager] playSound called on error path"); }, // ADDED THIS LINE
                playRandomVoiceMessage: () => {},
                loadVoiceFiles: () => {},
                displayCongratulationText: () => {},
                displaySpecialClearText: () => {},
                cleanup: () => {}
            };
        }
    }
    
    // Add new method to handle veil removal separately from level completion
    removeCompletionVeil() {
        if (this.completionVeil && !this.completionVeilRemoved) {
            console.log("Removing completion veil at " + this.revealPercentage + "% revealed");
            this.completionVeilRemoved = true;
            
            // If the completion veil is a container of blocks
            if (this.veilContainer) {
                // Fade out all individual veil blocks
                this.veilContainer.iterate(veilBlock => {
                    this.tweens.add({
                        targets: veilBlock,
                        alpha: 0,
                        duration: 1500,
                        ease: 'Power2'
                    });
                });
                
                // Remove the container after the animation completes
                this.time.delayedCall(1500, () => {
                    if (this.veilContainer && this.veilContainer.scene) {
                        this.veilContainer.destroy();
                    }
                });
            } 
            // Fallback for rectangular veil
            else if (this.completionVeil.scene) {
                // Remove the completion veil with a nice effect
                this.tweens.add({
                    targets: this.completionVeil,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.completionVeil && this.completionVeil.scene) {
                            this.completionVeil.destroy();
                        }
                    }
                });
            }
            
            // Handle frost graphics separately
            if (this.frostGraphics && this.frostGraphics.scene) {
                this.tweens.add({
                    targets: this.frostGraphics,
                    alpha: 0,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (this.frostGraphics && this.frostGraphics.scene) {
                            this.frostGraphics.destroy();
                        }
                    }
                });
            }
            
            // Add sparkle particles where the veil was
            this.emitParticlesAtChibiCenter();
        }
    }
    
    // Helper to emit particles at chibi image center
    emitParticlesAtChibiCenter() {
        const particles = this.add.particles('particle');
        const emitter = particles.createEmitter({
            x: this.chibiImage.x,
            y: this.chibiImage.y,
            speed: { min: 100, max: 200 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 2000,
            blendMode: 'ADD',
            tint: [0x66aaff, 0x0033aa, 0xffffff], // Blue and white ice particles
            quantity: 50,
            angle: { min: 0, max: 360 }
        });
        
        // Stop the emitter after a short duration
        this.time.delayedCall(2000, () => {
            emitter.stop();
            this.time.delayedCall(2000, () => {
                particles.destroy();
            });
        });
    }

    createCompletionVeil() {
        try {
            // First ensure any existing completion veil is fully cleaned up
            if (this.completionVeil) {
                if (this.veilContainer) {
                    this.veilContainer.destroy(true);
                    this.veilContainer = null;
                } else if (this.completionVeil.scene) {
                    this.completionVeil.destroy();
                }
                this.completionVeil = null;
            }
            
            if (this.frostGraphics && this.frostGraphics.scene) {
                this.frostGraphics.destroy();
                this.frostGraphics = null;
            }
            
            // Reset the removal flag
            this.completionVeilRemoved = false;
            
            // Get the chibi image dimensions - no scaling
            const imageWidth = this.chibiImage.width;
            const imageHeight = this.chibiImage.height;
            
            // Calculate the exact boundaries
            const imageX = this.chibiImage.x - imageWidth / 2;
            const imageY = this.chibiImage.y - imageHeight / 2;
            
            console.log(`Creating completion veil for chibi at ${this.chibiImage.x}, ${this.chibiImage.y}`);
            console.log(`With bounds: ${imageX}, ${imageY}, size: ${imageWidth}x${imageHeight}`);
            
            // Create a container for the veil
            this.veilContainer = this.add.container(0, 0);
            this.veilContainer.setDepth(2); // Above chibi (1) but below ice blocks (4)
            
            // Create a temporary canvas to check pixel data
            const tempCanvas = document.createElement('canvas');
            const tempContext = tempCanvas.getContext('2d');
            tempCanvas.width = imageWidth;
            tempCanvas.height = imageHeight;
            
            // Get the texture key of the chibi image
            const textureKey = this.chibiImage.texture.key;
            
            // Get the image data
            const frame = this.textures.getFrame(textureKey);
            const source = frame.source.image || frame.source.canvas;
            
            // Draw the image to our temp canvas
            tempContext.drawImage(source, 0, 0, imageWidth, imageHeight);
            
            // Create a graphics object for the frost effect
            const frostGraphics = this.add.graphics();
            frostGraphics.setDepth(2);
            this.frostGraphics = frostGraphics;
            
            // Block size for the veil - smaller size for more precise shape
            const blockSize = 10; // Keeping original block size of 10
            
            // Alpha threshold - lower value to include more semi-transparent pixels
            const alphaThreshold = 50; // Keeping original alpha threshold of 50
            
            // Create veil blocks that match the chibi image shape
            const rows = Math.ceil(imageHeight / blockSize);
            const cols = Math.ceil(imageWidth / blockSize);
            
            // Sample size for checking multiple pixels in the block area
            const sampleSize = 5; // Check more points in a 5x5 grid
            const sampleOffset = Math.floor(blockSize / (sampleSize + 1));
            
            // Create a 2D grid to track where we've placed veil blocks
            const veilGrid = Array(rows).fill().map(() => Array(cols).fill(false));
            
            // Keep track of non-transparent points for frost effect
            const nonTransparentPoints = [];
            
            // First pass: Find all blocks with visible pixels
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                    // Calculate screen position
                    const blockScreenX = imageX + col * blockSize + blockSize / 2;
                    const blockScreenY = imageY + row * blockSize + blockSize / 2;
                    
                    // Sample multiple points within this block area
                    let hasVisiblePixel = false;
                    
                    for (let sx = 0; sx < sampleSize; sx++) {
                        for (let sy = 0; sy < sampleSize; sy++) {
                            // Calculate sampling position in the original image
                            const offsetX = -Math.floor(sampleSize/2) + sx;
                            const offsetY = -Math.floor(sampleSize/2) + sy;
                            
                            const sampleX = Math.floor(col * blockSize) + offsetX * sampleOffset;
                            const sampleY = Math.floor(row * blockSize) + offsetY * sampleOffset;
                            
                            // Ensure we're within bounds
                            if (sampleX >= 0 && sampleX < imageWidth && 
                                sampleY >= 0 && sampleY < imageHeight) {
                                
                                try {
                                    const pixelData = tempContext.getImageData(sampleX, sampleY, 1, 1).data;
                                    // If any sampled pixel has alpha above threshold, mark block as visible
                                    if (pixelData[3] >= alphaThreshold) {
                                        hasVisiblePixel = true;
                                        break;
                                    }
                                } catch (e) {
                                    console.error(`Error sampling pixel at ${sampleX},${sampleY}:`, e);
                                }
                            }
                        }
                        if (hasVisiblePixel) break;
                    }
                    
                    if (hasVisiblePixel) {
                        veilGrid[row][col] = true;
                        nonTransparentPoints.push({
                            x: blockScreenX,
                            y: blockScreenY
                        });
                    }
                }
            }
            
            // Second pass: Add padding around detected pixels to ensure edges are covered
            const paddingAmount = 1; // Original padding value (1) restored
            
            // Create a copy of the grid before adding padding
            const originalGrid = veilGrid.map(row => [...row]);
            
            // Add padding around each detected block
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (originalGrid[row][col]) {
                        // Add padding blocks around this block
                        for (let pr = -paddingAmount; pr <= paddingAmount; pr++) {
                            for (let pc = -paddingAmount; pc <= paddingAmount; pc++) {
                                const padRow = row + pr;
                                const padCol = col + pc;
                                
                                // Make sure we're in bounds
                                if (padRow >= 0 && padRow < rows && padCol >= 0 && padCol < cols) {
                                    veilGrid[padRow][padCol] = true;
                                    
                                    // Add these to non-transparent points if not already included
                                    const blockX = imageX + padCol * blockSize + blockSize / 2;
                                    const blockY = imageY + padRow * blockSize + blockSize / 2;
                                    
                                    // Only add if this point is not already in the array
                                    if (!nonTransparentPoints.some(p => p.x === blockX && p.y === blockY)) {
                                        nonTransparentPoints.push({
                                            x: blockX,
                                            y: blockY
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Third pass: Create veil blocks based on our grid
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    if (!veilGrid[row][col]) continue;
                    
                    // Calculate screen position
                    const blockScreenX = imageX + col * blockSize + blockSize / 2;
                    const blockScreenY = imageY + row * blockSize + blockSize / 2;
                    
                    // Create a veil block at this position
                    const veilBlock = this.add.rectangle(
                        blockScreenX,
                        blockScreenY,
                        blockSize,
                        blockSize,
                        0x0033aa, // Deep blue color
                        0.35       // Alpha changed from 0.7 to 0.35
                    );
                    
                    veilBlock.setDepth(2);
                    this.veilContainer.add(veilBlock);
                }
            }
            
            // Add frost effects at random non-transparent points
            frostGraphics.lineStyle(2, 0x66aaff, 0.3); // Light blue lines for frost effect
            
            // Number of frost patterns to create
            const numPatterns = 50;
            
            // Add crystalline patterns only in non-transparent areas
            for (let i = 0; i < numPatterns && nonTransparentPoints.length > 0; i++) {
                // Select a random point from the non-transparent pixels
                const randomIndex = Math.floor(Math.random() * nonTransparentPoints.length);
                const point = nonTransparentPoints[randomIndex];
                
                // Create a frost pattern at this point
                const size = Phaser.Math.Between(15, 40);
                
                // Draw a snowflake-like pattern
                frostGraphics.moveTo(point.x, point.y);
                frostGraphics.lineTo(point.x + size, point.y);
                frostGraphics.moveTo(point.x, point.y);
                frostGraphics.lineTo(point.x - size/2, point.y + size);
                frostGraphics.moveTo(point.x, point.y);
                frostGraphics.lineTo(point.x - size/2, point.y - size);
            }
            
            // Store reference to the veil container
            this.completionVeil = this.veilContainer;
            
            console.log('Completion veil created with shape matching chibi');
        } catch (error) {
            console.error("Error creating completion veil:", error);
            
            // Fallback to simple rectangle if there's an error
            this.completionVeil = this.add.rectangle(
                this.chibiImage.x,
                this.chibiImage.y,
                this.chibiImage.width,
                this.chibiImage.height,
                0x0033aa,
                0.35          // Alpha changed from 0.7 to 0.35
            ).setDepth(2);
        }
    }

    

    // Helper function to create a drill effect
    createDrillEffect(x, y) {
        // Create a drill dust effect
        const particles = this.add.particles('particle');
        particles.setDepth(6);
        
        // Create the emitter for debris
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 80 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: [0xBB5500, 0xCCCCCC], // Brown/orange and gray for drill dust
        });
        
        // Emit a burst of particles
        emitter.explode(10, x, y);
        
        // Clean up after use
        this.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        // Add a small camera shake for drilling feedback
        this.cameras.main.shake(100, 0.003);
    }

   

    // Add a global failsafe mechanism to detect and fix stuck game states
    setupGlobalFailsafe() {
        // Clear any existing failsafe
        if (this.globalFailsafeTimer) {
            clearInterval(this.globalFailsafeTimer);
        }
        
        // Create a periodic check that runs every 5 seconds
        this.globalFailsafeTimer = setInterval(() => {
            try {
                // >>> ADD THIS CHECK INSIDE THE FAILSAFE TIMER CALLBACK <<<
                if (!this.isFullyInitialized || !this.scene.isActive()) {
                    // console.log("[GlobalFailsafe] GameScene not fully initialized or inactive, skipping check.");
                    return;
                }

                if (this.gameStateManager && typeof this.gameStateManager.checkGameState === 'function') {
                    this.gameStateManager.checkGameState();
                } else {
                    // This else block might indicate an issue if gameStateManager is expected but missing
                    console.warn("GlobalFailsafe: gameStateManager or checkGameState not available.");
                }
            } catch (e) {
                console.error("Error in global failsafe:", e);
            }
        }, 5000);
    }
    
    // Check for stuck game states and auto-recover if needed
    checkGameState() {
        // Forward to gameStateManager
        this.gameStateManager.checkGameState();
        
        // For compatibility, sync the state variables
        this.isLevelComplete = this.gameStateManager.isLevelComplete;
        this.isGameOver = this.gameStateManager.isGameOver;
    }
    
    // Force reset the game state to recover from stuck situations
    forceResetGameState() {
        console.warn("GameStateManager: Forcing game state reset due to potential stuck state.");
        this.isLevelComplete = false; // Ensure level complete is false
        this.isGameOver = true;      // Set game over to true to trigger Game Over UI
        this.scene.isLevelComplete = false;
        this.scene.isGameOver = true;
        this.scene.gameOverSetBy = "GameStateManager.forceResetGameState"; // IDENTIFY SETTER

        // Emit a game over event immediately to ensure UI updates
        console.log("[GameStateManager.forceResetGameState] Emitting 'gameOver' event NOW.");
        // ... other resets
    }

 

    /**
     * Damages a block, potentially destroying it
     * @param {Phaser.Physics.Matter.Image} block The block to damage
     * @returns {boolean} True if the block was destroyed
     */
    damageIceBlock(block) {
        if (!block || !block.isActive) return false;
        
        // Handle different block types
        if (block.blockType === this.blockTypes.TYPES.ETERNAL) {
            // Eternal blocks just show damage effect but don't take damage
            this.createDamageEffect(block);
            return false;
        }
        
        // Reduce hits left
        block.hitsLeft--;
        
        // Create damage effect
        this.createDamageEffect(block);
        
        // Check if block is destroyed
        if (block.hitsLeft <= 0) {
            this.bombUtils.destroyIceBlock(block); // Corrected call
            return true;
        }
        
        return false;
    }

    /**
     * Creates a visual damage effect on a block
     * @param {Phaser.Physics.Matter.Image} block The block to show damage on
     */
    createDamageEffect(block) {
        try {
            if (!block || !block.scene) return;
            
            // Create a particle effect at the block's position
            const particles = this.add.particles('crack');
            const emitter = particles.createEmitter({
                x: block.x,
                y: block.y,
                speed: { min: 20, max: 40 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                lifespan: 500,
                quantity: 4,
                blendMode: 'ADD'
            });
            
            // Stop the emitter after one burst
            this.time.delayedCall(100, () => {
                emitter.stop();
            });
            
            // Destroy the particle system after all particles are done
            this.time.delayedCall(600, () => {
                particles.destroy();
            });
        } catch (error) {
            console.error("Error in createDamageEffect:", error);
        }
    }
    
    /**
     * Cleans up the iceBlocks array by removing inactive blocks
     */



   
    
    // New method to add a visual trail to bounced bombs
    createBounceTrail(bomb) {
        if (!bomb || !bomb.scene) return;
        
        // Create trail particles
        const particles = this.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            lifespan: 300,
            speed: { min: 5, max: 20 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: 0x88ddff, // Light blue for bounce trail
            frequency: 20, // Emit a particle every 20ms
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 5),
                quantity: 1
            }
        });
        
        // Track the bomb to emit particles
        emitter.startFollow(bomb);
        
        // Clean up particles if bomb is destroyed
        this.time.delayedCall(1200, () => {
            if (particles && particles.scene) {
                particles.destroy();
            }
        });
        
        // Remove the trail after a short time (if bomb hasn't exploded yet)
        this.time.delayedCall(800, () => {
            if (emitter && emitter.manager && emitter.manager.scene) {
                emitter.stopFollow();
                emitter.stop();
            }
        });
    }

    // New method to create bouncy blocks around the level boundaries
    createBoundaryBouncyBlocks() {
        console.log("Creating zero-thickness reflective borders");
        
        // Add boundary blocks to a tracking array if not already created
        if (!this.boundaryBlocks) {
            this.boundaryBlocks = [];
        }
        
        // Define the physics properties for reflective borders
        const reflectiveProps = {
            isStatic: true,
            friction: 0,
            restitution: 1.0, // Perfect reflection
            isSensor: false,  // Need physical collision
            collisionFilter: {
                category: 0x0002,  // Assign specific collision category
                mask: 0xFFFFFFFF   // Collide with everything
            }
        };
        
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const borderThickness = 10; // Thin but not zero (for physics to work)
        
        // Create the borders as invisible rectangle bodies
        
        // Top border (full width)
        this.createReflectiveBorder(
            gameWidth / 2,           // x at center of screen
            -borderThickness / 2,    // y just off-screen
            gameWidth,               // full width
            borderThickness,         // thin height
            reflectiveProps
        );
        
        // Bottom border (full width)
        this.createReflectiveBorder(
            gameWidth / 2,                      // x at center of screen
            gameHeight + borderThickness / 2,   // y just off-screen
            gameWidth,                          // full width 
            borderThickness,                    // thin height
            reflectiveProps
        );
        
        // Left border (full height)
        this.createReflectiveBorder(
            -borderThickness / 2,               // x just off-screen
            gameHeight / 2,                     // y at center of screen
            borderThickness,                    // thin width
            gameHeight,                         // full height
            reflectiveProps
        );
        
        // Right border (full height)
        this.createReflectiveBorder(
            gameWidth + borderThickness / 2,    // x just off-screen
            gameHeight / 2,                     // y at center of screen
            borderThickness,                    // thin width
            gameHeight,                         // full height
            reflectiveProps
        );
        
        console.log(`Created 4 reflective borders around the game boundary`);
    }
    
    // Helper method to create a single reflective border (invisible)
    createReflectiveBorder(x, y, width, height, physicsProps) {
        // Create an invisible rectangle body
        const border = this.matter.add.rectangle(x, y, width, height, physicsProps);
        
        // Name the body for debugging
        border.label = 'reflectiveBorder';
        
        // For debugging - add a visible representation that won't be in the final game
        if (this.debugMode) {
            const debugVisual = this.add.rectangle(x, y, width, height, 0x00ff00, 0.3);
            debugVisual.setDepth(10); // Above everything
            debugVisual.setStrokeStyle(1, 0xffffff);
        
            // Store reference for cleanup
            this.debugVisuals = this.debugVisuals || [];
            this.debugVisuals.push(debugVisual);
        }
        
        // Track this border
        this.boundaryBlocks.push(border);
        
        return border;
    }

    // Helper method to setup bomb counts based on level
    setupBombs() {
            try {
                console.log(`Setting up bombs for level ${this.currentLevel}`);
                
                // Reset bomb counts to make sure we don't keep any from previous levels
                Object.keys(this.bombsRemaining).forEach(bombType => {
                    this.bombsRemaining[bombType] = 0;
                });
                
                if (this.levelManager) {
                    const levelBombs = this.levelManager.getBombCounts(); // These should be the true counts from JSONs or LevelManager defaults
                    
                    if (levelBombs) {
                        console.log(`Received bomb counts from level manager:`, JSON.stringify(levelBombs));
                        
                        Object.keys(levelBombs).forEach(bombType => {
                            // Ensure the bombType is valid and the count is a number
                            if (this.BOMB_NAMES.hasOwnProperty(bombType) && typeof levelBombs[bombType] === 'number') {
                                this.bombsRemaining[bombType] = levelBombs[bombType]; // Assign directly
                                console.log(`Set bomb count for ${bombType}: ${this.bombsRemaining[bombType]}`);
                            } else if (typeof levelBombs[bombType] !== 'number') {
                                console.warn(`Invalid count for bomb type ${bombType}: ${levelBombs[bombType]}. Setting to 0.`);
                                this.bombsRemaining[bombType] = 0;
                            } else {
                                 // console.warn(`Bomb type ${bombType} from level config not recognized. Skipping.`);
                            }
                        });
                    } else {
                        console.warn("Level manager returned no bomb counts! Using fallback setup.");
                        this.setupFallbackBombs();
                    }
                } else {
                    console.warn("No level manager available! Using fallback setup.");
                    this.setupFallbackBombs();
                }
                
                // Select initial bomb type
                const unlockedBomb = this.levelManager ? this.levelManager.getUnlockedBombType() : null;
                if (unlockedBomb && this.bombsRemaining[unlockedBomb] > 0) {
                    this.currentBombType = unlockedBomb;
                    console.log(`Selected newly unlocked bomb type: ${unlockedBomb}`);
                } else {
                    // Find the first bomb type that has a count greater than 0
                    const availableBombType = Object.keys(this.bombsRemaining).find(type => 
                        this.bombsRemaining.hasOwnProperty(type) && this.bombsRemaining[type] > 0
                    );
                    if (availableBombType) {
                        this.currentBombType = availableBombType;
                        console.log(`Selected first available bomb type: ${availableBombType}`);
                    } else {
                        // If truly no bombs are configured (e.g., level design error or empty fallback)
                        this.currentBombType = this.BOMB_TYPES.BLAST; // Default to Blast
                        this.bombsRemaining[this.BOMB_TYPES.BLAST] = 1; // Give at least one to prevent soft lock
                        console.warn(`No bomb types available from level config or fallback! Defaulting to 1 Blast Bomb.`);
                    }
                }
                            
                console.log(`Bomb setup complete for level ${this.currentLevel}:`, JSON.stringify(this.bombsRemaining));
                console.log(`Starting with bomb type: ${this.currentBombType}`);
                return true;
            } catch (error) {
                console.error("Error setting up bombs:", error);
                this.setupFallbackBombs(); // Ensure fallback is called on error
                return false;
            }
    }    // Helper method to setup bomb counts based on level
        
    
    // Fallback method to set default bomb counts if level manager or JSON loading fails
        setupFallbackBombs() {
            console.log("Using fallback bomb setup for level", this.currentLevel);
            
            // Initialize all to 0 first
            this.bombsRemaining = {
                [this.BOMB_TYPES.BLAST]: 0, [this.BOMB_TYPES.PIERCER]: 0, [this.BOMB_TYPES.CLUSTER]: 0,
                [this.BOMB_TYPES.STICKY]: 0, [this.BOMB_TYPES.SHATTERER]: 0, [this.BOMB_TYPES.DRILLER]: 0,
                [this.BOMB_TYPES.RICOCHET]: 0,
                [this.BOMB_TYPES.SHRAPNEL]: 0,
                [this.BOMB_TYPES.MELTER]: 0
            };
    
            // Set fallback bomb counts based on level, using intended non-testing values
            // ALL levels will get 4 shrapnel and 3 cluster bombs for testing in this fallback.
            this.bombsRemaining[this.BOMB_TYPES.SHRAPNEL] = 4;
            this.bombsRemaining[this.BOMB_TYPES.CLUSTER] = 3;

            switch (this.currentLevel) {
                case 1:
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 5;
                    this.bombsRemaining[this.BOMB_TYPES.SHATTERER] = 1;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.BLAST;
                    break;
                case 2:
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.PIERCER] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.RICOCHET] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.PIERCER;
                    break;
                case 3:
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.PIERCER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.RICOCHET] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.CLUSTER;
                    break;
                case 4:
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.PIERCER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.RICOCHET] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.STICKY;
                    break;
                case 5:
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.PIERCER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.SHATTERER] = 1;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.RICOCHET] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs
                    this.currentBombType = this.BOMB_TYPES.SHRAPNEL; // Default to Shrapnel
                    break;
                case 6:
                    // Level specifically focused on Shrapnel bombs
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 2;
                    // this.bombsRemaining[this.BOMB_TYPES.SHRAPNEL] = 5; // Already set to 4 above
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 1;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.SHRAPNEL;
                    break;
                    
                case 7:
                    // Level specifically focused on Melter bombs
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 5; // Give player plenty of Melter bombs
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 2;
                    this.bombsRemaining[this.BOMB_TYPES.PIERCER] = 1;
                    this.currentBombType = this.BOMB_TYPES.MELTER; // Default to Melter
                    break;
                default: // For any other levels not explicitly defined, use Level 1's fallback values for non-testing bombs
                    this.bombsRemaining[this.BOMB_TYPES.BLAST] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.STICKY] = 5;
                    this.bombsRemaining[this.BOMB_TYPES.SHATTERER] = 1;
                    this.bombsRemaining[this.BOMB_TYPES.DRILLER] = 3;
                    this.bombsRemaining[this.BOMB_TYPES.MELTER] = 3; // Add Melter bombs for testing
                    this.currentBombType = this.BOMB_TYPES.BLAST;
            }
            
            // Log bomb setup
            console.log("Fallback bomb setup complete:", JSON.stringify(this.bombsRemaining));
        }

    // Debugging function to verify if assets are loaded properly
    verifyAssets() {
        console.log('------ Asset Verification ------');
        console.log('Current level:', this.currentLevel);
        
        // Check background images
        const bgKey = `background${this.currentLevel}`;
        console.log(`Background ${bgKey}: ${this.textures.exists(bgKey) ? 'LOADED' : 'MISSING'}`);
        
        // Check chibi images
        const chibiKey = `chibi_girl${this.currentLevel}`;
        console.log(`Chibi ${chibiKey}: ${this.textures.exists(chibiKey) ? 'LOADED' : 'MISSING'}`);
        
        // Check victory background
        const victoryKey = `victoryBackground${this.currentLevel}`;
        console.log(`Victory ${victoryKey}: ${this.textures.exists(victoryKey) ? 'LOADED' : 'MISSING'}`);
        
        // Check voice assets
        let voiceFilesLoaded = 0;
        this.voiceMessages.forEach(message => {
            const audioKey = `voice_${message}`;
            const isLoaded = this.cache.audio.exists(audioKey);
            if (isLoaded) {
                voiceFilesLoaded++;
            }
            console.log(`Voice ${audioKey}: ${isLoaded ? 'LOADED' : 'MISSING'}`);
        });
        console.log(`Voice files: ${voiceFilesLoaded}/${this.voiceMessages.length} loaded`);
        
        // List all loaded textures for reference
        console.log('All loaded textures:', Object.keys(this.textures.list)
            .filter(key => key !== '__DEFAULT' && key !== '__MISSING')
            .join(', '));
        
        console.log('All loaded audio:', Object.keys(this.cache.audio.entries.entries)
            .join(', '));
            
        console.log('-------------------------------');
    }

    // Create placeholder graphics for bomb textures
    createBombPlaceholders() {
        console.log('Creating placeholder graphics for bombs');
        
        // Create a placeholder for the Shrapnel bomb if it doesn't exist
        if (!this.textures.exists('shrapnel_bomb')) {
            console.log('Creating placeholder for shrapnel_bomb');
            
            // Create a graphics object for the Shrapnel bomb
            const graphics = this.make.graphics();
            
            // Draw the bomb body (circle)
            graphics.fillStyle(0xFF6600); // Orange color
            graphics.fillCircle(30, 30, 30);
            
            // Add shrapnel-like lines radiating outward
            graphics.lineStyle(2, 0xFFCC00); // Yellow lines
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const innerX = 30 + Math.cos(angle) * 15;
                const innerY = 30 + Math.sin(angle) * 15;
                const outerX = 30 + Math.cos(angle) * 35;
                const outerY = 30 + Math.sin(angle) * 35;
                graphics.beginPath();
                graphics.moveTo(innerX, innerY);
                graphics.lineTo(outerX, outerY);
                graphics.strokePath();
            }
            
            // Add inner circle to represent the explosives
            graphics.fillStyle(0xFF3300); // Darker orange
            graphics.fillCircle(30, 30, 15);
            
            // Add a highlight effect
            graphics.fillStyle(0xFFFF99, 0.5); // Light yellow with transparency
            graphics.fillCircle(23, 23, 8);
            
            // Generate texture from the graphics
            graphics.generateTexture('shrapnel_bomb', 60, 60);
            graphics.destroy();
            
            console.log('Placeholder for shrapnel_bomb created successfully');
        }
        
        // Check if other bomb placeholders need to be created
        const bombTypes = [
            { key: 'blast_bomb', color: 0xFF0000 },        // Red
            { key: 'piercer_bomb', color: 0x0099FF },      // Light blue
            { key: 'cluster_bomb', color: 0xFFFF00 },      // Yellow
            { key: 'sticky_bomb', color: 0xFF00FF },       // Pink
            { key: 'shatterer_bomb', color: 0xCC3333 },    // Dark red
            { key: 'driller_bomb', color: 0xCC6600 },      // Brown
            { key: 'ricochet_bomb', color: 0x00FFFF }      // Cyan
        ];
        
        // Create simple placeholders for any other missing bomb textures
        bombTypes.forEach(bombType => {
            if (!this.textures.exists(bombType.key)) {
                console.log(`Creating placeholder for ${bombType.key}`);
                
                const graphics = this.make.graphics();
                
                // Draw basic bomb circle
                graphics.fillStyle(bombType.color);
                graphics.fillCircle(30, 30, 30);
                
                // Add highlight
                graphics.fillStyle(0xFFFFFF, 0.4);
                graphics.fillCircle(20, 20, 10);
                
                // Generate texture
                graphics.generateTexture(bombType.key, 60, 60);
                graphics.destroy();
                
                console.log(`Placeholder for ${bombType.key} created successfully`);
            }
        });
        
        console.log('Bomb placeholder creation completed');
    }

    // Setup the game world and physics
    setupGame() {
        console.log('[GameScene.setupGame] Method started.');
        // Clear any cached textures or game objects to ensure fresh UI
        this.game.textures.list = this.textures.list;
        
        // Setup camera to show the full 1920x1080 game world
        this.setupCamera();
        
        // Set zero gravity (world bounds are set in setupCamera)
        this.matter.world.setGravity(0, 0); // Zero gravity for space-like environment

        // Initialize arrays for game objects
        this.activeStickyBombs = [];
        
        // Initialize block utilities
        //this.blockUtils = new BlockUtils(this);
        
        // Initialize bomb utilities
        //this.bombUtils = new BombUtils(this);
        
        // Create game objects
        this.createBackground();
        
        // Create bomb placeholders using Phaser Graphics
        this.createBombPlaceholders();
        
        // Create the completion veil based on chibi image shape
        this.createCompletionVeil();
        
        // Create reflective borders around the game boundary
        this.createBoundaryBouncyBlocks();
        
        this.createTargets(); // Contains createIceBlocks and setupCollisions
        

        
        // Reset bomb and prepare for first shot
        this.resetBomb();
        
        // Setup input handlers
        this.setupInput();
        
        // Setup global failsafe timer to detect stuck game states
        this.setupGlobalFailsafe();
        
        // Debug text display - moved to bottom of screen
        if (this.debugMode) {
            this.debugText = this.add.text(10, this.cameras.main.height - 30, 'Debug: Ready', { 
                font: '16px Arial', 
                fill: '#ffffff',
                backgroundColor: '#333333',
                padding: { x: 5, y: 2 }
            });
            this.debugText.setDepth(this.UI_DEPTH - 1); 
        }
        
        // Make sure UIScene is running
        const uiSceneKey = 'UIScene';
        if (!this.scene.isActive(uiSceneKey)) {
            console.log(`GameScene.setupGame(): Launching ${uiSceneKey}`);
            this.scene.launch(uiSceneKey);
            // UIScene's create() method will call its requestInitialUIData()
        } else {
            const uiScene = this.scene.get(uiSceneKey);
            if (uiScene && typeof uiScene.requestInitialUIData === 'function') {
                console.log(`GameScene.setupGame(): ${uiSceneKey} already active. Requesting it to refresh data.`);
                // Give a brief moment for GameScene to potentially finish its own create() cycle
            this.time.delayedCall(50, () => {
                    if (uiScene.scene && uiScene.scene.isActive()) { // Check again if still active and part of a scene
                         uiScene.requestInitialUIData();
                    } else {
                        console.warn(`GameScene.setupGame(): ${uiSceneKey} became inactive or scene missing before data refresh call.`);
                    }
                });
            } else {
                 console.warn(`GameScene.setupGame(): ${uiSceneKey} is active but requestInitialUIData is not available or scene not retrieved.`);
            }
        }
        
        console.log("Game setup completed successfully");
    }
    
    // Initialize the level manager and return a promise
    // async initializeLevelManager() { 
    //     try {
    //         console.log("Initializing level manager...");
    //         
    //         // Initialize level manager
    //         this.levelManager = new LevelManager(this);
    //         
    //         // Set the current level in the manager
    //         this.levelManager.setLevel(this.currentLevel);
    //         
    //         // Initialize and wait for it to complete
    //         await this.levelManager.initialize();
    //         
    //         console.log("Level manager initialized successfully");
    //         
    //         // Update target percentage based on level config
    //         this.targetPercentage = this.levelManager.getTargetPercentage();
    //         
    //         return true;
    //     } catch (error) {
    //         console.error("Error initializing level manager:", error);
    //         return false;
    //     }
    // }

    
    
    // Helper method to check if a bomb is currently active
    isBombActive() {
        // If BombLauncher is available, use its method
        if (this.bombLauncher) {
            return this.bombLauncher.isBombActive();
        }
        // Fallback to original implementation
        return this.bomb && this.bomb.active && this.bombState && this.bombState.active;
    }
    
    // Helper method to fire the bomb based on pointer position
    fireBomb(pointer) {
        if (!pointer || pointer.x === undefined || pointer.y === undefined) {
            console.warn("fireBomb called with invalid pointer data:", pointer);
            if (this.bombInputHandler) {
                this.bombInputHandler.resetAimState(); // Reset aiming state in handler
            }
            return;
        }

        // Ensure we have a bomb and it's not already launched
        if (!this.bomb || this.bomb.isLaunched || !this.bomb.isAtSlingshot) {
            console.log("No bomb ready or bomb already launched.");
            if (this.bombInputHandler) {
                this.bombInputHandler.resetAimState(); // Reset aiming state in handler
            }
            return;
        }
        
        try {
            // Calculate force
            let dx = this.BOW_X - pointer.x;
            let dy = this.BOW_Y - pointer.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            
            // Limit drag distance
            if (distance > this.MAX_DRAG_DISTANCE) {
                const ratio = this.MAX_DRAG_DISTANCE / distance;
                dx *= ratio;
                dy *= ratio;
                distance = this.MAX_DRAG_DISTANCE;
            }
            
            // Calculate force based on drag distance
            const forceMagnitude = distance * this.SHOT_POWER;
            const forceX = dx * forceMagnitude;
            const forceY = dy * forceMagnitude;
            
            // Apply force to the bomb
            this.matter.body.setStatic(this.bomb.body, false);
            this.matter.applyForce(this.bomb, { x: this.bomb.x, y: this.bomb.y }, { x: forceX, y: forceY });
            
            // Play launch sound
            if (this.audioManager) {
                this.audioManager.playSound('launch', { volume: 0.5 });
            }
            
            // IMPORTANT: Mark the bomb as launched and no longer at slingshot
            this.bomb.isLaunched = true;
            this.bomb.isAtSlingshot = false;
            
            // Set bomb as active and track last bomb fired time
            this.bombState.active = true;
            this.bombState.lastBombFired = Date.now();
            
            // Decrement shot count - REMOVED for unlimited shots
            // this.shotsRemaining--; 
            
            // Update UI to show shots remaining
            this.events.emit('updateShots', this.shotsRemaining); // Still emit to show "Unlimited" or similar
            
            // Clear the trajectory graphics
            this.clearTrajectory();
            
            // Decrement bomb count and update UI
            this.decrementBombCount(this.currentBombType);
            
            console.log(`Bomb fired with force: ${forceX.toFixed(2)}, ${forceY.toFixed(2)}`);
        } catch (error) {
            console.error("Error in fireBomb:", error);
            // Try to recover
            if (this.bombInputHandler) {
                // Reset aiming state via the handler
                this.bombInputHandler.resetAimState();
            }
            
            if (this.bombLauncher) {
                this.bombLauncher.createBomb(this.currentBombType || 'bomb');
            } else {
            this.resetBomb();
            }
        }
    }
    
    // Helper method to draw trajectory based on pointer position
    drawTrajectoryFromPointer(pointer) {
        if (!pointer || pointer.x === undefined || pointer.y === undefined) {
            console.warn("Invalid pointer in drawTrajectoryFromPointer");
            return;
        }
        
        try {
            // Use BombInputHandler if available - THIS IS THE ONLY PATH NOW
            if (this.bombInputHandler) {
                // Delegate directly to the handler
                this.bombInputHandler.drawTrajectoryFromPointer(pointer);
                return; // Ensure no fallback logic runs
            } else {
                // Log an error if the handler is somehow missing
                console.error("BombInputHandler is missing! Cannot draw trajectory.");
            }
            
            // REMOVED Fallback logic that used GameScene.drawTrajectory
            /*
            // Use BombLauncher if available as fallback
            if (this.bombLauncher) {
                this.bombLauncher.drawTrajectoryFromPointer(pointer);
                return;
            }
            
            // Fallback to original implementation if BombLauncher isn't available
            console.warn("BombLauncher and BombInputHandler not available, using legacy drawing method");
            
        // Calculate angle and distance from slingshot
        const dx = this.BOW_X - pointer.x;
        const dy = this.BOW_Y - 30 - pointer.y;
        const distance = Math.min(
            this.MAX_DRAG_DISTANCE,
            Math.sqrt(dx * dx + dy * dy)
        );
        
        // Calculate angle
        const angle = Math.atan2(dy, dx);
        
        // Calculate bomb position
        const bombX = this.BOW_X - distance * Math.cos(angle);
        const bombY = (this.BOW_Y - 30) - distance * Math.sin(angle);
        
        // Update bomb position if it exists
        if (this.bomb) {
            this.bomb.setPosition(bombX, bombY);
        }
        
        // Draw elastic line
        if (this.elasticLine) {
            this.elasticLine.clear();
            this.elasticLine.lineStyle(2, 0xFFFFFF, 0.8); // White, slightly transparent
            this.elasticLine.beginPath();
            // Draw from top of bow through the bomb position and to bottom of bow
            this.elasticLine.moveTo(this.BOW_X, this.BOW_Y - 40); // Top of bow
            this.elasticLine.lineTo(bombX, bombY); // Bomb position
            this.elasticLine.lineTo(this.BOW_X, this.BOW_Y + 40); // Bottom of bow
            this.elasticLine.stroke();
        }
        
        // Calculate velocity based on drag distance and angle
        const forceX = dx * this.SHOT_POWER;
        const forceY = dy * this.SHOT_POWER;
        
        // Draw trajectory prediction
        this.drawTrajectory(bombX, bombY, forceX, forceY);
        */
        } catch (error) {
            console.error("Error in drawTrajectoryFromPointer:", error);
        }
    }

    // New method to play a random congratulatory voice message
    playRandomVoiceMessage() {
        try {
            // Don't play if audio is disabled or the level is complete/game over
            if (this.isLevelComplete || this.isGameOver || 
                (this.audioManager && !this.audioManager.soundsEnabled)) {
                return;
            }
            
            // Get a random voice message from the array
            const randomIndex = Math.floor(Math.random() * this.voiceMessages.length);
            const messageKey = this.voiceMessages[randomIndex];
            const audioKey = `voice_${messageKey}`;
            
            console.log(`Attempting to play voice message: ${messageKey}`);
            
            // Display the congratulatory text on screen
            this.displayCongratulationText(messageKey);
            
            // Local file path - ensure it's correctly formatted for direct access
            const filePath = `assets/audio/voice/${messageKey}.mp3`;
            
            // First try to play using Phaser's audio system
            if (this.sound && this.cache.audio.exists(audioKey)) {
                try {
                    const voiceSound = this.sound.add(audioKey, { volume: 0.7 });
                    voiceSound.play();
                    
                    // Debug log
                    if (this.debugMode) {
                        console.log(`Voice message played successfully: ${messageKey}`);
                    }
                    
                    return true; // Successfully played
                } catch (e) {
                    console.error(`Error playing cached voice clip ${audioKey}:`, e);
                    // Fall through to alternatives
                }
            }
            
            // Alternative 1: Try loading directly from file if not cached
            console.warn(`Voice audio not found in cache: ${audioKey}, attempting direct playback`);
            
            try {
                // Create an Audio element directly (browser API)
                const audio = new Audio(filePath);
                audio.volume = 0.7;
                
                // Log the full URL for debugging
                console.log(`Loading audio directly from: ${audio.src}`);
                
                // Play the audio with proper error handling
                audio.play()
                    .then(() => {
                        console.log(`Direct audio playback started for: ${messageKey}`);
                    })
                    .catch(err => {
                        console.error(`Direct audio play failed: ${err.message}`);
                        
                        // Alternative 2: Try one more approach for Edge/IE
                        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                            console.log("Trying IE/Edge specific method");
                            const sound = document.createElement('audio');
                            sound.src = filePath;
                            sound.volume = 0.7;
                            sound.play();
                        }
                    });
                
                return true; // Attempted to play
            } catch (directErr) {
                console.error("All audio play attempts failed:", directErr);
                return false;
            }
        } catch (error) {
            console.error("Error in playRandomVoiceMessage:", error);
            return false;
        }
    }

    // New method to display congratulatory text messages on screen
    displayCongratulationText(message) {
        try {
            // Remove any existing congratulation text
            if (this.congratulationText && this.congratulationText.scene) {
                this.congratulationText.destroy();
            }
            
            // Format the message text - capitalize and add exclamation if needed
            let displayText = message.replace(/_/g, ' ');
            displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
            if (!displayText.endsWith('!')) {
                displayText += '!';
            }
            
            // Create text in the center of the screen
            this.congratulationText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 100,
                displayText,
                {
                    fontFamily: 'Arial',
                    fontSize: '48px',
                    fontStyle: 'bold',
                    color: '#FFD700', // Gold color
                    stroke: '#000000',
                    strokeThickness: 6,
                    shadow: {
                        offsetX: 3,
                        offsetY: 3,
                        color: '#000',
                        blur: 5,
                        fill: true
                    }
                }
            );
            
            // Center the text
            this.congratulationText.setOrigin(0.5);
            
            // Set high depth to appear above game elements
            this.congratulationText.setDepth(this.UI_DEPTH + 5);
            
            // Add animations to make the text pop and fade
            this.tweens.add({
                targets: this.congratulationText,
                scale: { from: 0.5, to: 1.2 },
                duration: 200,
                ease: 'Back.easeOut',
                yoyo: true,
                hold: 100,
                onComplete: () => {
                    // After the pop animation, let it stay for a moment then fade out
                    this.tweens.add({
                        targets: this.congratulationText,
                        alpha: { from: 1, to: 0 },
                        y: '-=50', // Float up while fading
                        duration: 1000,
                        delay: 800,
                        ease: 'Power2',
                        onComplete: () => {
                            // Clean up after the animation
                            if (this.congratulationText && this.congratulationText.scene) {
                                this.congratulationText.destroy();
                                this.congratulationText = null;
                            }
                        }
                    });
                }
            });
            
            if (this.debugMode) {
                console.log(`Displayed congratulation text: "${displayText}"`);
            }
            
        } catch (error) {
            console.error("Error displaying congratulation text:", error);
        }
    }

    // Method to display special text effects for large percentage clears
    displaySpecialClearText(percentageCleared) {
        // This method now delegates to AudioManager
        if (this.audioManager && typeof this.audioManager.displaySpecialClearText === 'function') {
            this.audioManager.displaySpecialClearText(percentageCleared);
        } else {
            console.warn("[GameScene.displaySpecialClearText] AudioManager not available to display special text.");
        }
    }

    /**
     * Adds a pulsing hint for mobile users when a new bomb is loaded
     */
    addMobilePulseHint() {
        try {
            if (!this.bombLauncher || !this.bombLauncher.bomb) return;
            
            // Add touch indicator text for mobile users
            this.touchIndicator = this.add.text(
                this.bombLauncher.bomb.x,
                this.bombLauncher.bomb.y - 60,
                "Hold & Drag to Aim",
                {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    align: 'center',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 4,
                    shadow: {
                        offsetX: 2,
                        offsetY: 2,
                        color: '#000',
                        blur: 2,
                        stroke: true,
                        fill: true
                    }
                }
            ).setOrigin(0.5, 0.5).setDepth(20);
            
            // Fade out the indicator after a short delay
            this.tweens.add({
                targets: this.touchIndicator,
                alpha: 0,
                delay: 1000,
                duration: 500,
                onComplete: () => {
                    if (this.touchIndicator) this.touchIndicator.destroy();
                }
            });
            
            if (this.debugMode && this.debugText) {
                console.log('Mobile hint added');
            }
        } catch (error) {
            console.error("Error adding mobile pulse hint:", error);
        }
    }

    // Apply any game settings
    applyGameSettings(delta) {
        // Ensure that GameStateManager is initialized
        if (!this.gameStateManager) {
            console.warn("[GameScene.applyGameSettings] GameStateManager not initialized. Skipping further logic.");
            return;
        }

        // ADDED: If the bomb launcher is currently aiming, don't interfere.
        if (this.bombLauncher && this.bombLauncher.isAiming) {
            // console.log("[GameScene.applyGameSettings] Currently aiming, skipping bomb management.");
            return;
        }

        // Only proceed if the GameScene is fully initialized
        if (!this.isFullyInitialized) {
            // console.log("[GameScene.applyGameSettings] GameScene not fully initialized. Skipping."); // Optional: for debugging
            return;
        }

        // Check if the current bomb has gone out of bounds
        if (this.bombLauncher && typeof this.bombLauncher.checkForMissedBombs === 'function') {
            this.bombLauncher.checkForMissedBombs();
        }
        
        // Auto-reset bomb if it has been inactive for too long (e.g., stuck, missed)
        const currentTime = Date.now();
        const bombInactiveDuration = 8000; // 8 seconds
        
        if (this.bombState.active && (currentTime - this.bombState.lastBombFired > bombInactiveDuration)) {
            console.log("Bomb has been active for too long, resetting.");
            this.resetFailedBomb(); // Use resetFailedBomb to handle fizzle etc.
            // If resetFailedBomb determined it's game over, it will handle it.
            // Otherwise, bombState.lastResetTime will be updated if a new bomb is made.
            return; // Return early
        }
        
        // Check if a new bomb needs to be created (e.g., after one explodes or goes off-screen)
        const noBombExists = !this.bomb || !this.bomb.scene; // Check if bomb is destroyed
        const noBombInLauncher = !this.bombLauncher || !this.bombLauncher.bomb || !this.bombLauncher.bomb.scene;
        const bombLauncherReadyForNewBomb = this.bombLauncher && !this.bombLauncher.isBombActive() && !this.bombLauncher.isAiming && !this.isCreatingNewBomb;
        const canCreateBombLogic = (currentTime - this.bombState.lastResetTime > 1000); // Cooldown

        if (noBombExists && noBombInLauncher && !this.isCreatingNewBomb && bombLauncherReadyForNewBomb && canCreateBombLogic) {
            if (!this.isAnyBombAvailable()) {
                // RE-GUARD THE CHECKGAMEOVER CALL
                if (this.isFullyInitialized) { 
                    console.log("applyGameSettings: No bombs available, checking for level completion/game over.");
                    this.checkLevelCompletion(); // CALL THIS FIRST
                } else {
                    console.log("applyGameSettings: No bombs available, but GameScene not fully initialized. Skipping checks.");
                }
                return;
            }

            console.log("No bomb exists, creating one in applyGameSettings");
            this.isCreatingNewBomb = true;
            
            try {
                // Create a new bomb using the launcher if available
                if (this.bombLauncher && this.bombLauncher.createBomb) {
                    console.log("Creating bomb via bombLauncher");
                    const newBomb = this.bombLauncher.createBomb(this.currentBombType || 'blast_bomb');
                    
                    // Update scene.bomb reference for backward compatibility
                    this.bomb = newBomb;
                } else {
                    // Fallback - use resetBomb
                    console.log("Creating bomb via resetBomb");
                    this.resetBomb();
                }
                
                // Update last reset time
                this.bombState.lastResetTime = Date.now();
            } catch (e) {
                console.error("Error creating bomb in applyGameSettings:", e);
            }
            
            // Reset creation flag after a short delay
            this.time.delayedCall(100, () => {
                this.isCreatingNewBomb = false;
            });
        }
    }

    // Handler for bomb selection requests from UIScene
    handleBombTypeSelectionRequest(bombType) {
        console.log(`[GameScene.handleBombTypeSelectionRequest] Received request for bombType: ${bombType}`); // ADD THIS LOG
        if (this.bombsRemaining[bombType] > 0) {
            this.selectBombType(bombType);
        } else {
            console.log(`[GameScene.handleBombTypeSelectionRequest] Bomb type ${bombType} has no remaining shots.`);
            // Optionally, provide feedback to the user (e.g., a sound or brief message)
            if (this.audioManager && this.audioManager.playSound) {
                this.audioManager.playSound('error', { volume: 0.5 }); // Play an error/denial sound
            }
        }
    }

    handleGoToNextLevel() {
        console.log(`[GameScene.handleGoToNextLevel ENTERED] Current isTransitioningLevel: ${this.isTransitioningLevel}, For Level: ${this.currentLevel}, Instance ID: ${this.scene.key}_${this._id || (this._id = Phaser.Utils.String.UUID())}`);

        if (this.isTransitioningLevel) {
            console.warn(`[GameScene.handleGoToNextLevel WARN] Instance ${this.scene.key}_${this._id} for level ${this.currentLevel} is ALREADY transitioning. Aborting duplicate call.`);
            return;
        }
        this.isTransitioningLevel = true; 
        console.log(`[GameScene.handleGoToNextLevel INFO] Instance ${this.scene.key}_${this._id} for level ${this.currentLevel} is NOW transitioning.`);

        const previousLevel = this.currentLevel;
        
        // Stop background music before transitioning
        if (this.audioManager && this.audioManager.bgMusic) {
            try { this.audioManager.bgMusic.stop(); } catch (e) { console.warn('Error stopping BG music', e);}
        }
        
        // The UIScene will handle the transition to CGScene which will then go to StoryMapScene
        // This method now does less because most of the flow is handled by the UI's Next Level button
        if (this.scene.isActive('UIScene')) {
            console.log('[GameScene.handleGoToNextLevel] UIScene is active, it will handle the transition to CGScene.');
        } else {
            console.warn('[GameScene.handleGoToNextLevel] UIScene is not active! Manually transitioning to CGScene.');
            
            // If UIScene is not active for some reason, transition directly to CGScene
            this.scene.stop('UIScene');
            this.scene.start('CGScene', { 
                levelId: this.currentLevel, 
                starsEarned: 1, // Default to 1 star if not provided by UIScene
                score: this.score,
                revealPercentage: this.revealPercentage
            });
        }
    }

    shutdown() {
        console.log(`[GameScene.shutdown CALLED] For scene related to level: ${this.currentLevel}. Current isTransitioningLevel state: ${this.isTransitioningLevel}`);
        
        // Clean up the gameStateManager
        if (this.gameStateManager) {
            this.gameStateManager.shutdown();
        }
        
        // Clean up the collisionManager
        if (this.collisionManager) {
            this.collisionManager.shutdown();
            this.collisionManager = null;
        }
        
        // Clear the failsafe timer to prevent memory leaks
        if (this.globalFailsafeTimer) {
            clearInterval(this.globalFailsafeTimer);
            this.globalFailsafeTimer = null;
        }
        
        // Clean up any pending timeouts
        if (this.pendingReset) {
            clearTimeout(this.pendingReset);
            this.pendingReset = null;
        }
        
        if (this.bombState.autoResetTimer) {
            clearTimeout(this.bombState.autoResetTimer);
            this.bombState.autoResetTimer = null;
        }

        // Explicitly remove event listeners for this scene instance
        if (this.events) {
            console.log(`[GameScene.shutdown] Removing known event listeners for level ${this.currentLevel}.`);
            this.events.off('goToNextLevel', this.handleGoToNextLevel, this);
            this.events.off('selectBombTypeRequest', this.handleBombTypeSelectionRequest, this);
            this.events.off('initialUIDataReady'); // Remove all listeners for this event if any were added by UIScene to this
            // Add any other listeners that GameScene.init or GameScene.create might have set on this.events
        }
        
        // Clean up audio resources via AudioManager
        if (this.audioManager) {
            try {
                console.log("Shutdown: Cleaning up audio resources via AudioManager");
                this.audioManager.cleanup();
            } catch(error) {
                console.error("Error cleaning up audio in shutdown:", error);
            }
            // Null out reference after cleanup
            this.audioManager = null;
        }
        
        // Clean up any remaining bomb or resources
        if (this.bomb && this.bomb.scene) {
            this.bomb.destroy();
            this.bomb = null;
        }
        
        // Clean up BombInputHandler
        if (this.bombInputHandler) {
            this.bombInputHandler.cleanup();
            this.bombInputHandler = null;
        }
        
        // Call original shutdown method
        super.shutdown();
        
        // Remove all input handlers
        this.input.off('pointerdown');
        this.input.off('pointermove');
        this.input.off('pointerup');
        
        // Clear all timers
        if (this.timers) {
            this.timers.forEach(timer => {
                if (timer) timer.remove();
            });
            this.timers = [];
        }
        
        // Remove all tweens
        this.tweens.killAll();
        
        // Clear any bomb-specific resources for a launched bomb
        const activeLaunchedBomb = this.bombLauncher ? this.bombLauncher.getActiveLaunchedBomb() : null;
        if (activeLaunchedBomb) {
            if (this.bombUtils && typeof this.bombUtils.cleanupBombResources === 'function') {
                this.bombUtils.cleanupBombResources(activeLaunchedBomb);
            } else {
                console.warn("GameScene.shutdown: bombUtils or cleanupBombResources not available to clean active bomb.");
                // Fallback: try to destroy directly if bombUtils is missing
                if (activeLaunchedBomb.scene) {
                    activeLaunchedBomb.destroy();
                }
            }
            if (this.bombLauncher && typeof this.bombLauncher.clearActiveBomb === 'function') { 
                 this.bombLauncher.clearActiveBomb(); // Also clear it from launcher state
            } else {
                 console.warn("GameScene.shutdown: bombLauncher.clearActiveBomb not available.");
            }
        }
        console.log(`[GameScene.shutdown COMPLETED] For scene related to level: ${this.currentLevel}.`);
    }
}