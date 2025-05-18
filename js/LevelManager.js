// LevelManager.js - Manages level data, progression and resources
class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = 1;
        this.maxLevels = 30; // Increased to 30 to match asset structure
        this.levelData = {};
        
        // Initialize with default values in case loading fails
        // These defaults will be used if a specific level_config.json is missing or invalid
        this.defaultBaseLevelConfig = {
            levelNumber: 1, // This will be overridden by the actual level number
            chibiImageKey: 'chibi_girl1', // Will be dynamically set to chibi_girl{level}
            victoryBackgroundKey: 'victoryBackground1', // Will be dynamically set to victoryBackground{level}
            backgroundImageKey: 'background1', // Will be dynamically set to background{level}
            targetPercentage: 85,
            blockSize: 40, // Default block size, can be overridden by level_config.json
            bombsAvailable: { // Default bombs if not specified in level_config.json OR available_bombs.json
                blast_bomb: 3,
                piercer_bomb: 0,
                cluster_bomb: 3, // Ensure cluster bomb is in base defaults for testing
                sticky_bomb: 5,
                shatterer_bomb: 1,
                driller_bomb: 0,
                ricochet_bomb: 0,
                shrapnel_bomb: 4, // Ensure shrapnel bomb is in base defaults for testing
                melter_bomb: 3 // Ensure melter bomb is in base defaults for testing
            },
            unlockedBomb: null,
            blockLayoutPath: 'block_layout.json', // Default relative path within level folder
            availableBombsPath: 'available_bombs.json', // Default relative path
            parsedBlockLayout: null, // To store loaded block layout
            parsedAvailableBombs: null // To store loaded available bombs
        };

        // Initialize defaultLevelData with a basic structure for level 1
        this.defaultLevelData = {
            1: this.createDefaultLevelData(1) // Populate for level 1 by default
        };
    }
    
    // Initialize the level manager and load level data
    async initialize() {
        try {
            // When initialize is called, it should operate based on the *current* this.currentLevel set by setLevel.
            console.log(`[LevelManager.initialize] Initializing/Re-initializing. Will load data considering this.currentLevel: ${this.currentLevel}`);
            await this.loadLevelData(); // loadLevelData loads ALL levels, then other methods use this.currentLevel to pick.
            console.log(`[LevelManager.initialize] Finished loading all level data. Current effective level for gets is: ${this.currentLevel}`);
            return true;
        } catch (error) {
            console.error("[LevelManager.initialize] Error initializing LevelManager:", error);
            // Use default level data if loading fails
            this.levelData = this.defaultLevelData;
            return false;
        }
    }
    
    // Load specific level data - called from GameSceneRefactored
    async loadLevel(level) {
        try {
            console.log(`Loading data for level ${level}`);
            
            // Set the current level
            this.currentLevel = level;
            
            // If level data is not loaded yet, load all level data
            if (Object.keys(this.levelData).length === 0) {
                await this.loadLevelData();
            }
            
            return true;
        } catch (error) {
            console.error(`Error loading level ${level}:`, error);
            
            // Use default level data if available
            if (this.defaultLevelData[level]) {
                this.levelData[level] = this.defaultLevelData[level];
                return true;
            }
            
            return false;
        }
    }
    
    // Load level data from configuration files
    async loadLevelData() {
        try {
            // Create an object to store level data
            this.levelData = {};
            
            // Load data for each level
            for (let level = 1; level <= this.maxLevels; level++) {
                try {
                    // Try to fetch level configuration
                    const configPath = `assets/images/level${level}/level_config.json`;
                    const response = await fetch(configPath);
                    
                    if (response.ok) {
                        const loadedConfig = await response.json();
                        
                        // Start with a copy of the default base config
                        this.levelData[level] = { ...this.defaultBaseLevelConfig };
                        
                        // Override with loaded config values
                        this.levelData[level].levelNumber = level;
                        this.levelData[level].chibiImageKey = loadedConfig.chibiImageKey || `chibi_girl${level}`;
                        this.levelData[level].victoryBackgroundKey = loadedConfig.victoryBackgroundKey || `victoryBackground${level}`;
                        this.levelData[level].backgroundImageKey = loadedConfig.backgroundImageKey || `background${level}`;
                        this.levelData[level].targetPercentage = loadedConfig.targetPercentage || this.defaultBaseLevelConfig.targetPercentage;
                        this.levelData[level].blockSize = loadedConfig.blockSize || this.defaultBaseLevelConfig.blockSize;
                        this.levelData[level].unlockedBomb = loadedConfig.unlockedBomb || this.defaultBaseLevelConfig.unlockedBomb;
                        this.levelData[level].blockLayoutPath = loadedConfig.blockLayoutPath || this.defaultBaseLevelConfig.blockLayoutPath;
                        this.levelData[level].availableBombsPath = loadedConfig.availableBombsPath || this.defaultBaseLevelConfig.availableBombsPath;

                        // Load available_bombs.json
                        const availableBombsConfigPath = `assets/images/level${level}/${this.levelData[level].availableBombsPath}`;
                        try {
                            const bombsResponse = await fetch(availableBombsConfigPath);
                            if (bombsResponse.ok) {
                                const bombsData = await bombsResponse.json();
                                // Adapt to the new structure: { availableBombs: [], bombCounts: {}, unlockedBomb: "" }
                                if (bombsData && bombsData.bombCounts) {
                                    this.levelData[level].parsedAvailableBombs = bombsData.bombCounts;
                                    if (bombsData.unlockedBomb) { // Prioritize unlockedBomb from this file
                                        this.levelData[level].unlockedBomb = bombsData.unlockedBomb;
                                    }
                                } else {
                                    // If structure is not as expected, try to use the root object as counts
                                    this.levelData[level].parsedAvailableBombs = bombsData;
                                }
                                console.log(`Level ${level}: Loaded bombs from ${this.levelData[level].availableBombsPath}`);
                            } else {
                                throw new Error(`Failed to fetch ${availableBombsConfigPath}`);
                            }
                        } catch (bombsError) {
                            console.warn(`Level ${level}: Could not load bombs from ${this.levelData[level].availableBombsPath} (${bombsError.message}). Checking level_config.json for 'bombsAvailable'...`);
                            if (loadedConfig.bombsAvailable) {
                                this.levelData[level].parsedAvailableBombs = loadedConfig.bombsAvailable; // Use bombsAvailable from level_config.json as fallback
                                console.log(`Level ${level}: Loaded bombs from level_config.json's bombsAvailable field.`);
                            } else {
                                this.levelData[level].parsedAvailableBombs = { ...this.defaultBaseLevelConfig.bombsAvailable }; // Fallback to hardcoded defaults
                                console.log(`Level ${level}: Used default hardcoded bomb counts.`);
                            }
                        }
                        
                        // Ensure Shrapnel, Cluster and Melter bomb counts for testing
                        if (this.levelData[level].parsedAvailableBombs) {
                            this.levelData[level].parsedAvailableBombs.shrapnel_bomb = 4;
                            this.levelData[level].parsedAvailableBombs.cluster_bomb = 3;
                            this.levelData[level].parsedAvailableBombs.melter_bomb = 3;
                        } else {
                            this.levelData[level].parsedAvailableBombs = { shrapnel_bomb: 4, cluster_bomb: 3, melter_bomb: 3 };
                        }

                        // Load block_layout.json
                        const blockLayoutRelativePath = this.levelData[level].blockLayoutPath; // e.g. "block_layout.json"
                        const blockLayoutFullConfigPath = `assets/images/level${level}/${blockLayoutRelativePath}`;
                        console.log(`Level ${level}: Attempting to load block layout from full path: ${blockLayoutFullConfigPath}`); 
                        try {
                            const blockLayoutResponse = await fetch(blockLayoutFullConfigPath);
                            console.log(`Level ${level}: Fetch response for ${blockLayoutFullConfigPath} - ok: ${blockLayoutResponse.ok}, status: ${blockLayoutResponse.status}`); 
                            if (blockLayoutResponse.ok) {
                                const rawText = await blockLayoutResponse.text(); 
                                console.log(`Level ${level}: Raw text from ${blockLayoutFullConfigPath} (first 500 chars): ${rawText.substring(0,500)}`);
                                try {
                                    this.levelData[level].parsedBlockLayout = JSON.parse(rawText); 
                                    console.log(`Level ${level}: Successfully parsed block layout from ${blockLayoutRelativePath}. Example data: blockSize: ${this.levelData[level].parsedBlockLayout ? this.levelData[level].parsedBlockLayout.blockSize : 'N/A'}`);
                                } catch (parseError) {
                                    console.error(`Level ${level}: ERROR parsing JSON from ${blockLayoutFullConfigPath}:`, parseError.message); 
                                    console.error(`Level ${level}: Raw text that failed to parse (first 500 chars): ${rawText.substring(0,500)}`);
                                    this.levelData[level].parsedBlockLayout = null;
                                }
                            } else {
                                throw new Error(`Failed to fetch ${blockLayoutFullConfigPath} (status: ${blockLayoutResponse.status})`);
                            }
                        } catch (layoutError) {
                            console.warn(`Level ${level}: Could not load block layout from ${blockLayoutRelativePath} (${layoutError.message}). Block layout will be null.`);
                            this.levelData[level].parsedBlockLayout = null; 
                        }
                        
                        console.log(`Loaded configuration for level ${level}:`, this.levelData[level]);
                    } else {
                        console.warn(`No configuration found for level ${level} at ${configPath}, creating from defaults.`);
                        this.levelData[level] = this.createDefaultLevelData(level); // This will include shrapnel_bomb: 4 and cluster_bomb: 3
                    }
                } catch (levelError) {
                    console.warn(`Error loading level ${level} configuration: ${levelError.message}. Creating from defaults.`);
                    this.levelData[level] = this.createDefaultLevelData(level); // This will include shrapnel_bomb: 4 and cluster_bomb: 3
                }
            }
            
            console.log("Level data loaded successfully:", this.levelData);
            return true;
        } catch (error) {
            console.error("Error loading level data:", error);
            // Fallback to default data
            this.levelData = this.defaultLevelData; // Ensure defaultLevelData also has shrapnel_bomb: 4 and cluster_bomb: 3
            // Make sure all levels in defaultLevelData also get the shrapnel, cluster, and melter bombs
            Object.keys(this.levelData).forEach(lvl => {
                if (this.levelData[lvl] && this.levelData[lvl].bombsAvailable) {
                    this.levelData[lvl].bombsAvailable.shrapnel_bomb = 4;
                    this.levelData[lvl].bombsAvailable.cluster_bomb = 3;
                    this.levelData[lvl].bombsAvailable.melter_bomb = 3;
                } else if (this.levelData[lvl]) {
                    this.levelData[lvl].bombsAvailable = { 
                        shrapnel_bomb: 4, 
                        cluster_bomb: 3,
                        melter_bomb: 3
                    };
                }
            });
            return false;
        }
    }
    
    // Create default level data for a level without configuration
    createDefaultLevelData(level) {
        console.log(`Creating default level data for level ${level}`);
        // Start with a copy of the default base config
        const defaultData = { ...this.defaultBaseLevelConfig };
        
        // Customize for the specific level
        defaultData.levelNumber = level;
        defaultData.chibiImageKey = `chibi_girl${level}`;
        defaultData.victoryBackgroundKey = `victoryBackground${level}`;
        defaultData.backgroundImageKey = `background${level}`;
        
        // Ensure bombsAvailable exists and add/set shrapnel_bomb and cluster_bomb
        if (!defaultData.bombsAvailable) {
            defaultData.bombsAvailable = {};
        }
        defaultData.bombsAvailable.shrapnel_bomb = 4; // Ensure shrapnel bomb for testing
        defaultData.bombsAvailable.cluster_bomb = 3; // Ensure cluster bomb for testing
        defaultData.bombsAvailable.melter_bomb = 3; // Ensure melter bomb for testing

        // Example of how bombs might change per level by default if not specified
        if (level === 1) {
            defaultData.bombsAvailable = { ...defaultData.bombsAvailable, blast_bomb: 3, sticky_bomb: 5, shatterer_bomb: 1, driller_bomb: 0, ricochet_bomb: 0, piercer_bomb: 0 };
        } else if (level === 2) {
            defaultData.bombsAvailable = { ...defaultData.bombsAvailable, blast_bomb: 3, piercer_bomb: 2, driller_bomb: 0, ricochet_bomb: 2, sticky_bomb: 0, shatterer_bomb: 0 };
            defaultData.unlockedBomb = 'piercer_bomb';
        } else if (level >= 3 && level <= 5) { // Generic for 3-5
            defaultData.bombsAvailable = { ...defaultData.bombsAvailable, blast_bomb: 2, piercer_bomb: 2, sticky_bomb: 2, shatterer_bomb: 1, driller_bomb: 0, ricochet_bomb: 1 };
            if (level === 3) defaultData.unlockedBomb = 'cluster_bomb'; // Cluster bomb is unlocked here
            if (level === 4) defaultData.unlockedBomb = 'sticky_bomb';
            if (level === 5) defaultData.unlockedBomb = 'shatterer_bomb';
        } else { // For levels > 5, provide a generic set or scale them
             defaultData.bombsAvailable = { ...defaultData.bombsAvailable, blast_bomb: 2, piercer_bomb: 2, sticky_bomb: 2, shatterer_bomb: 2, driller_bomb: 0, ricochet_bomb: 2 };
        }
        
        // Ensure shrapnel_bomb, cluster_bomb, and melter_bomb are set to desired testing values again after specific level logic.
        defaultData.bombsAvailable.shrapnel_bomb = 4;
        defaultData.bombsAvailable.cluster_bomb = 3;
        defaultData.bombsAvailable.melter_bomb = 3;

        // Default paths for block layout and available bombs JSON files within the level's asset folder
        defaultData.blockLayoutPath = `block_layout.json`;
        defaultData.availableBombsPath = `available_bombs.json`;

        // Ensure parsedAvailableBombs also reflects this for consistency, as getBombCounts might use it.
        defaultData.parsedAvailableBombs = { ...defaultData.bombsAvailable };

        console.log(`Created default data for level ${level}:`, defaultData);
        return defaultData;
    }
    
    // Create default bomb counts for a level
    createDefaultBombCounts(level) {
        // Define a pattern of bombs per level
        return {
            blast_bomb: 3, // Always have some basic bombs
            piercer_bomb: Math.max(0, level - 1), // Start at level 2
            cluster_bomb: Math.max(0, level - 2), // Start at level 3
            sticky_bomb: Math.max(0, level - 2), // Start at level 3
            shatterer_bomb: Math.max(0, level - 3), // Start at level 4
            driller_bomb: Math.max(0, level - 3), // Start at level 4
            ricochet_bomb: level >= 2 ? 2 : 0, // Available from level 2
            melter_bomb: 3 // Always have 3 Melter bombs for testing
        };
    }
    
    // Get the current level data
    getCurrentLevelData() {
        if (this.levelData && this.levelData[this.currentLevel]) {
            return this.levelData[this.currentLevel];
        }
        console.warn(`LevelManager: No specific data found for level ${this.currentLevel}. Falling back to generating default data for level ${this.currentLevel}.`);
        // Fallback to default data for the CURRENT level if its specific data is missing
        // Ensure this.defaultLevelData has an entry for this.currentLevel, or generate it.
        if (!this.defaultLevelData[this.currentLevel]) {
            this.defaultLevelData[this.currentLevel] = this.createDefaultLevelData(this.currentLevel);
        }
        return this.defaultLevelData[this.currentLevel];
    }
    
    // Move to the next level
    nextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.currentLevel++;
            console.log(`Advanced to level ${this.currentLevel}`);
            return true;
            } else {
            console.log("Already at maximum level");
            return false;
        }
    }
    
    // Set a specific level
    setLevel(level) {
        console.log(`[LevelManager.setLevel] Received level: ${level}. Current internal this.currentLevel before change: ${this.currentLevel}`);
        if (level >= 1 && level <= this.maxLevels) {
            this.currentLevel = parseInt(level); // Ensure it's an integer
            console.log(`[LevelManager.setLevel] Internal this.currentLevel is NOW: ${this.currentLevel}`);
            return true;
        } else {
            console.warn(`[LevelManager.setLevel] Invalid level number: ${level}. Internal this.currentLevel remains: ${this.currentLevel}`);
            return false;
        }
    }
    
    // Check if there's a next level available
    hasNextLevel() {
        return this.currentLevel < this.maxLevels;
    }
    
    // Get bomb counts for the current level
    getBombCounts() {
        const levelData = this.getCurrentLevelData(); // This will now correctly fallback to current level's default if needed
        
        // Prioritize parsedAvailableBombs, then bombsAvailable from the specific levelData.
        // Fallback to defaultBaseLevelConfig as a last resort if levelData itself is minimal.
        let bombsToUse = null;
        if (levelData) {
            if (levelData.parsedAvailableBombs) {
                bombsToUse = levelData.parsedAvailableBombs;
            } else if (levelData.bombsAvailable) {
                bombsToUse = levelData.bombsAvailable;
            }
        }

        if (!bombsToUse) {
            console.warn(`No bomb data found in levelData for level ${this.currentLevel} (parsedAvailableBombs or bombsAvailable). Using hardcoded defaults from defaultBaseLevelConfig.`);
            bombsToUse = { ...this.defaultBaseLevelConfig.bombsAvailable };
        }
        
        console.log(`Getting bomb counts for level ${this.currentLevel}:`, JSON.parse(JSON.stringify(bombsToUse))); // Deep copy for logging to avoid circular refs
        
        return bombsToUse;
    }
    
    // Get image key for the current level's chibi
    getChibiImageKey() {
        console.log(`[LevelManager.getChibiImageKey] ENTERING. Current this.currentLevel is: ${this.currentLevel}`);
        const levelData = this.getCurrentLevelData();
        const key = levelData.chibiImageKey || `chibi_girl${this.currentLevel}`;
        console.log(`[LevelManager.getChibiImageKey] For level ${this.currentLevel}, returning key: '${key}' based on levelData:`, JSON.parse(JSON.stringify(levelData)));
        return key;
    }
    
    // Get background key for the current level
    getBackgroundKey() { // Renamed from getBackgroundImageKey for consistency
        const levelData = this.getCurrentLevelData();
        return levelData.backgroundImageKey || `background${this.currentLevel}`;
    }
    
    // Get victory background key for the current level
    getVictoryBackgroundKey() { // Renamed from getVictoryBackgroundImageKey
        const levelData = this.getCurrentLevelData();
        return levelData.victoryBackgroundKey || `victoryBackground${this.currentLevel}`;
    }
    
    // Get target percentage for the current level
    getTargetPercentage() {
        const levelData = this.getCurrentLevelData();
        return levelData.targetPercentage || 85;
    }
    
    // Get the newly unlocked bomb type for the current level, if any
    getUnlockedBombType() {
        const levelData = this.getCurrentLevelData();
        return levelData.unlockedBomb || null;
    }
    
    // Check if this level has a new unlocked bomb
    hasUnlockedBomb() {
        return this.getUnlockedBombType() !== null;
    }
    
    // Fallback method if level data isn't found
    createDefaultLevel1Data() {
        console.log("Creating fallback level 1 data (using createDefaultLevelData(1))");
        return this.createDefaultLevelData(1);
    }

    // Method to get the path for block_layout.json for the current level
    getBlockLayoutPath() {
        const levelData = this.getCurrentLevelData();
        // Path is relative to assets/images/level{X}/
        return `assets/images/level${this.currentLevel}/${levelData.blockLayoutPath || 'block_layout.json'}`;
    }

    // Method to get the path for available_bombs.json for the current level
    getAvailableBombsPath() {
        const levelData = this.getCurrentLevelData();
        // Path is relative to assets/images/level{X}/
        return `assets/images/level${this.currentLevel}/${levelData.availableBombsPath || 'available_bombs.json'}`;
    }

    // Method to get the parsed block layout for the current level
    getCurrentBlockLayout() {
        const levelData = this.getCurrentLevelData();
        if (levelData && levelData.parsedBlockLayout) {
            return levelData.parsedBlockLayout;
        }
        console.warn(`LevelManager: No parsed block layout found for level ${this.currentLevel}.`);
        return null; // Or return a default empty layout: { blockSize: 40, gridOrigin: {x:0, y:0}, numCols: 0, numRows: 0, blocks: [] }
    }

    // Method to get the parsed available bombs for the current level
    getCurrentAvailableBombs() {
        const levelData = this.getCurrentLevelData();
        if (levelData && levelData.parsedAvailableBombs) {
            return levelData.parsedAvailableBombs;
        }
        console.warn(`LevelManager: No parsed available bombs found for level ${this.currentLevel}. Falling back to bombsAvailable or defaults.`);
        return levelData.bombsAvailable || (this.defaultLevelData[1] ? this.defaultLevelData[1].bombsAvailable : null);
    }
    
    // Get block size for the current level
    getBlockSize() {
        const levelData = this.getCurrentLevelData();
        return levelData.blockSize || this.defaultBaseLevelConfig.blockSize;
    }
}

// Export the LevelManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelManager };
} else {
    // If not in Node.js, add to window object
    window.LevelManager = LevelManager;
} 