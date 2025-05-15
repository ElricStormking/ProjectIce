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
            bombsAvailable: { // Default bombs if not specified in level_config.json
                blast_bomb: 3,
                piercer_bomb: 0,
                cluster_bomb: 1,
                sticky_bomb: 5,
                shatterer_bomb: 1,
                driller_bomb: 3,
                ricochet_bomb: 0
            },
            unlockedBomb: null,
            blockLayoutPath: 'block_layout.json', // Default relative path within level folder
            availableBombsPath: 'available_bombs.json' // Default relative path
        };

        // Initialize defaultLevelData with a basic structure for level 1
        this.defaultLevelData = {
            1: this.createDefaultLevelData(1) // Populate for level 1 by default
        };
    }
    
    // Initialize the level manager and load level data
    async initialize() {
        try {
            console.log("Initializing LevelManager...");
            await this.loadLevelData();
            return true;
        } catch (error) {
            console.error("Error initializing LevelManager:", error);
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
                        this.levelData[level].unlockedBomb = loadedConfig.unlockedBomb || this.defaultBaseLevelConfig.unlockedBomb;
                        this.levelData[level].blockLayoutPath = loadedConfig.blockLayoutPath || `${this.defaultBaseLevelConfig.blockLayoutPath}`;
                        this.levelData[level].availableBombsPath = loadedConfig.availableBombsPath || `${this.defaultBaseLevelConfig.availableBombsPath}`;

                        // Handle bombsAvailable: prioritize available_bombs.json, then level_config.json, then defaults
                        const availableBombsConfigPath = `assets/images/level${level}/${this.levelData[level].availableBombsPath}`;
                        try {
                            const bombsResponse = await fetch(availableBombsConfigPath);
                            if (bombsResponse.ok) {
                                this.levelData[level].bombsAvailable = await bombsResponse.json();
                                console.log(`Level ${level}: Loaded bombs from ${this.levelData[level].availableBombsPath}`);
                            } else {
                                throw new Error(`Failed to fetch ${availableBombsConfigPath}`);
                            }
                        } catch (bombsError) {
                            console.warn(`Level ${level}: Could not load bombs from ${this.levelData[level].availableBombsPath} (${bombsError.message}). Checking level_config.json...`);
                            if (loadedConfig.bombsAvailable) {
                                this.levelData[level].bombsAvailable = loadedConfig.bombsAvailable;
                                console.log(`Level ${level}: Loaded bombs from level_config.json`);
                            } else {
                                this.levelData[level].bombsAvailable = { ...this.defaultBaseLevelConfig.bombsAvailable };
                                console.log(`Level ${level}: Used default bomb counts.`);
                            }
                        }
                        
                        console.log(`Loaded configuration for level ${level}:`, this.levelData[level]);
                    } else {
                        console.warn(`No configuration found for level ${level} at ${configPath}, creating from defaults.`);
                        this.levelData[level] = this.createDefaultLevelData(level);
                    }
                } catch (levelError) {
                    console.warn(`Error loading level ${level} configuration: ${levelError.message}. Creating from defaults.`);
                    this.levelData[level] = this.createDefaultLevelData(level);
                }
            }
            
            console.log("Level data loaded successfully:", this.levelData);
            return true;
        } catch (error) {
            console.error("Error loading level data:", error);
            // Fallback to default data
            this.levelData = this.defaultLevelData;
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
        
        // Example of how bombs might change per level by default if not specified
        if (level === 1) {
            defaultData.bombsAvailable = { blast_bomb: 3, cluster_bomb: 1, sticky_bomb: 5, shatterer_bomb: 1, driller_bomb: 3, ricochet_bomb: 0, piercer_bomb: 0 };
        } else if (level === 2) {
            defaultData.bombsAvailable = { blast_bomb: 3, piercer_bomb: 2, driller_bomb: 3, ricochet_bomb: 2, cluster_bomb: 0, sticky_bomb: 0, shatterer_bomb: 0 };
            defaultData.unlockedBomb = 'piercer_bomb';
        } else if (level >= 3 && level <= 5) { // Generic for 3-5
            defaultData.bombsAvailable = { blast_bomb: 2, piercer_bomb: 2, cluster_bomb: 2, sticky_bomb: 2, shatterer_bomb: 1, driller_bomb: 2, ricochet_bomb: 1 };
            if (level === 3) defaultData.unlockedBomb = 'cluster_bomb';
            if (level === 4) defaultData.unlockedBomb = 'sticky_bomb';
            if (level === 5) defaultData.unlockedBomb = 'shatterer_bomb';
        } else { // For levels > 5, provide a generic set or scale them
             defaultData.bombsAvailable = { blast_bomb: 2, piercer_bomb: 2, cluster_bomb: 2, sticky_bomb: 2, shatterer_bomb: 2, driller_bomb: 2, ricochet_bomb: 2 };
        }
        
        // Default paths for block layout and available bombs JSON files within the level's asset folder
        defaultData.blockLayoutPath = `block_layout.json`;
        defaultData.availableBombsPath = `available_bombs.json`;

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
            ricochet_bomb: level >= 2 ? 2 : 0 // Available from level 2
        };
    }
    
    // Get the current level data
    getCurrentLevelData() {
        if (this.levelData && this.levelData[this.currentLevel]) {
            return this.levelData[this.currentLevel];
        }
        console.warn(`LevelManager: No specific data found for level ${this.currentLevel}. Falling back to default for level 1.`);
        // Fallback to default data for level 1 if current level data is missing
        return this.defaultLevelData[1] || this.createDefaultLevelData(1);
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
        if (level >= 1 && level <= this.maxLevels) {
            this.currentLevel = level;
            console.log(`Set to level ${this.currentLevel}`);
            return true;
        } else {
            console.warn(`Invalid level number: ${level}`);
            return false;
        }
    }
    
    // Check if there's a next level available
    hasNextLevel() {
        return this.currentLevel < this.maxLevels;
    }
    
    // Get bomb counts for the current level
    getBombCounts() {
        const levelData = this.getCurrentLevelData();
        console.log(`Getting bomb counts for level ${this.currentLevel}:`, levelData.bombsAvailable);
        
        if (!levelData.bombsAvailable) {
            console.warn(`No bomb data available for level ${this.currentLevel}, using defaults`);
            return this.defaultLevelData[1].bombsAvailable;
        }
        
        return levelData.bombsAvailable;
    }
    
    // Get image key for the current level's chibi
    getChibiImageKey() {
        const levelData = this.getCurrentLevelData();
        return levelData.chibiImageKey || `chibi_girl${this.currentLevel}`;
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
}

// Export the LevelManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelManager };
} else {
    // If not in Node.js, add to window object
    window.LevelManager = LevelManager;
} 