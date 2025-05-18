class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
        this.levelNumber = 1; // Default to level 1
    }
    
    init(data) {
        // Get level number from scene data
        this.levelNumber = data.levelNumber || 1;
        // Get next scene from data if provided
        this.nextScene = data.nextScene || null;
        console.log(`LoadingScene: Initializing for level ${this.levelNumber}. Next scene: ${this.nextScene || 'Default (GameScene)'}. Received data:`, data);
    }

    createSharedProceduralAssets() {
        // Content from BootScene's createShapes() will go here
        // Create a simple blue background for startup screens
        const background = this.add.graphics({ willReadFrequently: true });
        background.fillStyle(0x000000, 1); // Black background
        background.fillRect(0, 0, 1920, 1080);
        background.generateTexture('background', 1920, 1080);
        background.clear();
        
        // Create ice block (light blue rectangle with alpha)
        const iceBlock = this.add.graphics({ willReadFrequently: true });
        iceBlock.fillStyle(0xaaddff, 0.9);
        iceBlock.fillRect(0, 0, 40, 40);
        iceBlock.lineStyle(2, 0xffffff, 0.9);
        iceBlock.strokeRect(0, 0, 40, 40);
        iceBlock.generateTexture('iceBlock', 40, 40);
        iceBlock.clear();
        
        // Create slingshot (brown Y shape)
        const slingshot = this.add.graphics({ willReadFrequently: true });
        slingshot.fillStyle(0x8B4513, 1);
        slingshot.fillRect(0, 0, 10, 60);  // Base
        slingshot.fillRect(-20, 0, 50, 10); // Top part
        slingshot.generateTexture('slingshot', 50, 60);
        slingshot.clear();
       
        
        // Note: Bomb texture generation is handled by createBombTextures()
        // We will not duplicate that here from BootScene's createShapes()

        // Create particle for explosion effects
        const particle = this.add.graphics({ willReadFrequently: true });
        particle.fillStyle(0xff5500, 1);
        particle.fillCircle(8, 8, 8);
        particle.generateTexture('particle', 16, 16);
        particle.clear();
        
        // Create smaller particle for cluster bombs
        const miniParticle = this.add.graphics({ willReadFrequently: true });
        miniParticle.fillStyle(0xffdd44, 1);
        miniParticle.fillCircle(4, 4, 4);
        miniParticle.generateTexture('mini_particle', 8, 8);
        miniParticle.clear();
        
        // Create green sticky particles
        const stickyParticle = this.add.graphics({ willReadFrequently: true });
        stickyParticle.fillStyle(0x66cc66, 1);
        stickyParticle.fillCircle(6, 6, 6);
        stickyParticle.generateTexture('sticky_particle', 12, 12);
        stickyParticle.clear();
        
        // Create red impact particles
        const impactParticle = this.add.graphics({ willReadFrequently: true });
        impactParticle.fillStyle(0xcc3333, 1);
        impactParticle.fillRect(0, 0, 8, 8);
        impactParticle.generateTexture('impact_particle', 8, 8);
        impactParticle.clear();

        // Content from BootScene's createAudio() will go here
        // We'll use the Phaser sound manager to create a procedurally generated explosion sound
        try {
            // Create an audio context for programmatic sound creation
            const audioContext = this.sound.context;
            if (!audioContext) return;
            
            // Add explosion sound using Web Audio API
            const explosionBuffer = audioContext.createBuffer(1, 4096, audioContext.sampleRate);
            const explosionData = explosionBuffer.getChannelData(0);
            
            // Generate a noise burst for explosion sound
            for (let i = 0; i < explosionData.length; i++) {
                const t = i / explosionData.length;
                // Exponential decay
                const envelope = Math.pow(1 - t, 2);
                // Random noise
                explosionData[i] = (Math.random() * 2 - 1) * envelope;
            }
            
            // Add to the game's cache
            // Ensure 'explosion' sound is not already loaded by file before adding procedural one
            if (!this.cache.audio.exists('explosion')) {
                this.cache.audio.add('explosion', explosionBuffer);
                console.log("LoadingScene: Created procedural explosion sound.");
            } else {
                console.log("LoadingScene: Procedural explosion sound skipped, 'explosion' already in cache (likely from file).");
            }
            
        } catch (e) {
            console.log("LoadingScene: Could not create procedural audio:", e);
        }
        console.log("LoadingScene: Shared procedural assets created.");
    }

    preload() {
        // Add a simple dark background
        this.cameras.main.setBackgroundColor('#000000');
        
        // Create shared procedural assets (moved from BootScene)
        this.createSharedProceduralAssets();
        
        // Create the bomb textures programmatically first, before any loading occurs
        this.createBombTextures(); // This is the primary call for bomb textures
        
        // Display level information
        const levelInfoText = this.add.text(
            1920/2,
            100,
            `Loading Level ${this.levelNumber}`,
            {
                font: '48px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Loading UI with more detailed information
        const loadingText = this.add.text(
            1920/2,
            1080/2 - 120,
            'Loading Game Assets...',
            { 
                font: '42px Arial', 
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6 
            }
        ).setOrigin(0.5);
        
        // Add asset details text
        this.assetText = this.add.text(
            1920/2,
            1080/2 - 60,
            'Preparing...',
            { 
                font: '32px Arial', 
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // More visually appealing loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(
            1920/2 - 400,
            1080/2,
            800,
            70
        );
        
        // Add loading events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(
                1920/2 - 390,
                1080/2 + 10,
                780 * value,
                50
            );
        });
        
        this.load.on('fileprogress', (file) => {
            // Add safety check for assetText
            if (this.assetText && typeof this.assetText.setText === 'function') {
                this.assetText.setText('Loading: ' + file.key);
            } else {
                console.warn('assetText is not available or not a Text object during fileprogress for:', file.key);
            }
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            this.assetText.destroy();
            
            console.log("Asset loading complete");
            
            // The create() method will now handle the rest
        });
        
        // Load the actual game assets
        try {
            console.log(`LoadingScene: Loading game assets for level ${this.levelNumber}`);
            
            // Simplified loading approach:
            // Level 1 uses: background1, chibi_girl1 from level1 folder
            // Level 2-5 use: background2, chibi_girl2, etc. from level2-5 folders
            
            // Always load the default background and victory background as fallbacks
            this.load.image('background', 'assets/images/background.png');
            this.load.image('victoryBackground', 'assets/images/victory_background.png');
            
            // Load level-specific background
            const bgPath = `assets/images/level${this.levelNumber}/background${this.levelNumber}.png`;
            const bgKey = `background${this.levelNumber}`;
            console.log(`Loading level background: ${bgKey} from ${bgPath}`);
            this.load.image(bgKey, bgPath);
            
            // Load level-specific victory background 
            const victoryBgPath = `assets/images/level${this.levelNumber}/victory_background${this.levelNumber}.png`;
            const victoryBgKey = `victoryBackground${this.levelNumber}`;
            console.log(`Loading victory background: ${victoryBgKey} from ${victoryBgPath}`);
            this.load.image(victoryBgKey, victoryBgPath);
            
            // Load level-specific chibi image
            const chibiPath = `assets/images/level${this.levelNumber}/chibi_girl${this.levelNumber}.png`;
            const chibiKey = `chibi_girl${this.levelNumber}`;
            console.log(`Loading chibi image: ${chibiKey} from ${chibiPath}`);
            this.load.image(chibiKey, chibiPath);
            
            // Load level configuration
            this.load.json('levelConfig', `assets/images/level${this.levelNumber}/level_config.json`);
            this.load.json('availableBombs', `assets/images/level${this.levelNumber}/available_bombs.json`);
            
            // Load game object images
            this.load.image('slingshot', 'assets/images/slingshot.png');
            this.load.image('iceBlock', 'assets/images/ice_block.png');
            this.load.image('particle', 'assets/images/particle.png');
            this.load.image('mini_particle', 'assets/images/mini_particle.png');
            this.load.image('sticky_particle', 'assets/images/sticky_particle.png');
            this.load.image('impact_particle', 'assets/images/impact_particle.png');
            this.load.image('magic_arrow_placeholder', 'assets/images/magic_arrow_placeholder.png');
            this.load.image('upper_bow_part', 'assets/images/upper_bow_part.png');
            this.load.image('lower_bow_part', 'assets/images/lower_bow_part.png');
        
            
            // Generate bomb textures programmatically instead of loading images
            // this.createBombTextures(); // REMOVED: Redundant call, already called above
            
            // Load audio files with simpler approach
            try {
                console.log("Loading audio files...");
                
                // Define all audio files to load
                const audioFiles = [
                    { key: 'bgMusic', path: 'assets/audio/background_music.mp3' },
                    { key: 'victoryMusic', path: 'assets/audio/victory_music.mp3' },
                    { key: 'gameOverSound', path: 'assets/audio/game_over.mp3' },
                    { key: 'explosion', path: 'assets/audio/explosion.mp3' },
                    { key: 'cracksound', path: 'assets/audio/crack.mp3' },
                    { key: 'bouncesound', path: 'assets/audio/bounce.mp3' }
                ];
                
                // Add level-specific music based on level number
                if (this.levelNumber > 1) {
                    // For level 2 and above, use level-specific music if available
                    const levelMusicPath = `assets/audio/background_music${this.levelNumber}.mp3`;
                    audioFiles.push({
                        key: `bgMusic_level${this.levelNumber}`,
                        path: levelMusicPath,
                        optional: true // Mark as optional so errors won't stop the game
                    });
                    
                    console.log(`Added level-specific music for level ${this.levelNumber}: ${levelMusicPath}`);
                }
                
                // Add individual error handlers for each audio file
                audioFiles.forEach(file => {
                    // Check if audio is already loaded to avoid duplicate loading
                    if (this.cache.audio.exists(file.key)) {
                        console.log(`Audio ${file.key} already exists in cache, will be replaced.`);
                        try {
                            // Attempt to remove the audio from cache to prevent issues
                            this.cache.audio.remove(file.key);
                            console.log(`Removed ${file.key} from audio cache for clean reload`);
                        } catch (err) {
                            console.warn(`Could not remove ${file.key} from cache:`, err);
                        }
                    }
                    
                    // Create a load handler to track specific file loading
                    this.load.once(`filecomplete-audio-${file.key}`, () => {
                        console.log(`Successfully loaded audio: ${file.key}`);
                    });
                    
                    // Create an error handler for this specific file
                    if (file.optional) {
                        this.load.once(`loaderror`, (fileObj) => {
                            if (fileObj.key === file.key) {
                                console.warn(`Optional audio file ${file.key} failed to load - this is OK for optional files`);
                            }
                        });
                    }
                    
                    // Load the file
                    this.load.audio(file.key, file.path);
                });
                
            } catch (audioError) {
                console.error("Error setting up audio files:", audioError);
                // Create dummy sounds for essential audio
                this.createDummyAudios();
            }
            
            // Add comprehensive error handler for all asset loading
            this.load.on('loaderror', (fileObj) => {
                console.error("Error loading file:", fileObj.key, "from path:", fileObj.url);
                
                // Special handling for audio files
                if (fileObj.type === 'audio') {
                    console.error(`Audio file failed to load: ${fileObj.key}`);
                    // Create a silent dummy sound to prevent errors
                    this.createDummyAudio(fileObj.key);
                }
                
                // Check if the file exists using fetch
                fetch(fileObj.url)
                    .then(response => {
                        console.log(`File ${fileObj.url} check: ${response.status} ${response.statusText}`);
                    })
                    .catch(error => {
                        console.error(`Fetch failed for ${fileObj.url}:`, error);
                    });
                
                if (fileObj.key === bgKey || fileObj.key === chibiKey) {
                    console.log(`${fileObj.key} failed to load, will use fallback`);
                }
            });
        } catch (error) {
            console.error("Error during loading:", error);
            this.assetText.setText('Error loading assets. Click to retry.');
            
            // Allow click to retry
            this.input.once('pointerdown', () => {
                this.scene.restart();
            });
        }
    }
    
    createLevelBackground() {
        // Only create a fallback background if loading the image failed
        if (!this.textures.exists('levelBackground')) {
            console.log("Creating fallback level background");
            
            // Create a simple level background with a solid color
            const levelBg = this.add.graphics({ willReadFrequently: true });
            
            // Use a solid teal color
            levelBg.fillStyle(0x40E0D0, 1);  // Turquoise
            levelBg.fillRect(0, 0, 1920, 1080);
            
            // Add some decorative elements - circles
            levelBg.fillStyle(0xFFFFFF, 0.2);
            
            // Add several random circles with different sizes
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * 1920;
                const y = Math.random() * 1080;
                const radius = 20 + Math.random() * 80;
                levelBg.fillCircle(x, y, radius);
            }
            
            // Add some decorative lines
            levelBg.lineStyle(10, 0xFFFFFF, 0.1);
            
            // Add several straight lines
            for (let i = 0; i < 5; i++) {
                const startX = Math.random() * 500;
                const startY = Math.random() * 300;
                const endX = 1500 + Math.random() * 400;
                const endY = 800 + Math.random() * 200;
                
                levelBg.beginPath();
                levelBg.moveTo(startX, startY);
                levelBg.lineTo(endX, endY);
                levelBg.strokePath();
            }
            
            // Generate the texture for use in the game scene
            levelBg.generateTexture('levelBackground', 1920, 1080);
            levelBg.clear();
            
            console.log("Created custom level background texture");
        } else {
            console.log("Using loaded level background");
        }
    }
    
    createOrLoadChibiImage() {
        // Only create a fallback chibi if loading the image failed
        if (!this.textures.exists('chibi_girl1')) {
            console.log("Creating fallback chibi image");
            
            // Create a fallback chibi image
            const chibi = this.add.graphics({ willReadFrequently: true });
            
            // Create a canvas for the chibi
            chibi.fillStyle(0x000000, 0); // Transparent background
            chibi.fillRect(0, 0, 800, 1080);
            
            // Scale proportions for the image
            const centerX = 400;
            const centerY = 400;
            const headSize = 250;
            
            // Create a pretty anime-style girl silhouette
            
            // Head shape
            chibi.fillStyle(0xff99cc, 1);
            chibi.fillCircle(centerX, centerY, headSize);
            
            // Face details
            chibi.fillStyle(0x000000, 1);
            chibi.fillCircle(centerX - 80, centerY - 50, 25); // Left eye
            chibi.fillCircle(centerX + 80, centerY - 50, 25); // Right eye
            
            // Smile
            chibi.lineStyle(15, 0x000000, 1);
            chibi.beginPath();
            chibi.arc(centerX, centerY + 30, 100, 0, Math.PI, false);
            chibi.strokePath();
            
            // Hair
            chibi.fillStyle(0x663366, 1);
            chibi.fillCircle(centerX, centerY - 120, 150);
            chibi.fillCircle(centerX - 120, centerY - 80, 100);
            chibi.fillCircle(centerX + 120, centerY - 80, 100);
            
            // Body
            chibi.fillStyle(0xff99cc, 1);
            chibi.fillTriangle(
                centerX, centerY + headSize,  // Top point
                centerX - 300, centerY + 700, // Bottom left
                centerX + 300, centerY + 700  // Bottom right
            );
            
            // Arms
            chibi.fillStyle(0xff99cc, 1);
            // Left arm
            chibi.fillRect(centerX - 320, centerY + 100, 80, 300);
            // Right arm
            chibi.fillRect(centerX + 240, centerY + 100, 80, 300);
            
            chibi.generateTexture('chibi_girl1', 800, 1080);
            chibi.clear();
            
            console.log("Created fallback chibi image");
        } else {
            console.log("Using loaded chibi image");
        }
        
        // Create fallback bomb assets if needed
        this.createFallbackGameAssets();
    }
    
    createFallbackGameAssets() {
        // Create fallback assets for critical game objects
        
        // Create fallback background if needed
        if (!this.textures.exists('levelBackground')) {
            console.log("Creating fallback background texture");
            const bg = this.add.graphics({ willReadFrequently: true });
            
            // Deep blue background
            bg.fillStyle(0x001a33, 1);
            bg.fillRect(0, 0, 1920, 1080);
            
            // Add some simple designs
            bg.lineStyle(5, 0x0066cc, 0.5);
            
            // Make a grid pattern
            for (let i = 0; i < 20; i++) {
                // Horizontal lines
                bg.moveTo(0, i * 60);
                bg.lineTo(1920, i * 60);
                
                // Vertical lines
                bg.moveTo(i * 100, 0);
                bg.lineTo(i * 100, 1080);
            }
            
            bg.generateTexture('levelBackground', 1920, 1080);
            bg.clear();
        }
        
        // Create fallback victory background if needed
        if (!this.textures.exists('victoryBackground')) {
            console.log("Creating fallback victory background texture");
            const victoryBg = this.add.graphics({ willReadFrequently: true });
            
            // Create a warm colored victory background (golden sunrise feeling)
            const gradientColors = [0xffd700, 0xff8c00, 0xff4500];
            
            // Create a radial gradient effect
            for (let i = 0; i < 10; i++) {
                const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                    { r: 255, g: 215, b: 0 },
                    { r: 255, g: 69, b: 0 },
                    10,
                    i
                );
                
                const rgb = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
                const alpha = 1 - (i * 0.1);
                
                victoryBg.fillStyle(rgb, alpha);
                victoryBg.fillCircle(1920/2, 1080/2, 1000 - i * 80);
            }
            
            // Add some "rays" of light
            victoryBg.lineStyle(15, 0xffffff, 0.5);
            for (let a = 0; a < 360; a += 15) {
                const rad = a * Math.PI / 180;
                const startX = 1920/2 + Math.cos(rad) * 200;
                const startY = 1080/2 + Math.sin(rad) * 200;
                const endX = 1920/2 + Math.cos(rad) * 900;
                const endY = 1080/2 + Math.sin(rad) * 900;
                
                victoryBg.moveTo(startX, startY);
                victoryBg.lineTo(endX, endY);
            }
            
            victoryBg.generateTexture('victoryBackground', 1920, 1080);
            victoryBg.clear();
        }
        
        // Create fallback slingshot if needed
        if (!this.textures.exists('slingshot')) {
            console.log("Creating fallback slingshot texture");
            const slingshotGraphics = this.add.graphics({ willReadFrequently: true });
            
            // Draw a simple Y shape
            slingshotGraphics.lineStyle(8, 0x663300, 1);
            slingshotGraphics.beginPath();
            slingshotGraphics.moveTo(25, 75);
            slingshotGraphics.lineTo(25, 25);
            slingshotGraphics.moveTo(25, 25);
            slingshotGraphics.lineTo(10, 5);
            slingshotGraphics.moveTo(25, 25);
            slingshotGraphics.lineTo(40, 5);
            slingshotGraphics.strokePath();
            
            slingshotGraphics.generateTexture('slingshot', 50, 80);
            slingshotGraphics.clear();
        }
        
        // Create fallback ice block if needed
        if (!this.textures.exists('iceBlock')) {
            console.log("Creating fallback ice block texture");
            const blockGraphics = this.add.graphics({ willReadFrequently: true });
            
            // Draw a simple blue square
            blockGraphics.fillStyle(0xaaddff, 1);
            blockGraphics.fillRect(0, 0, 40, 40);
            blockGraphics.lineStyle(2, 0xffffff, 0.5);
            blockGraphics.strokeRect(0, 0, 40, 40);
            
            blockGraphics.generateTexture('iceBlock', 40, 40);
            blockGraphics.clear();
        }
        
        // Create fallback particle if needed
        if (!this.textures.exists('particle')) {
            console.log("Creating fallback particle textures");
            const particleGraphics = this.add.graphics({ willReadFrequently: true });
            
            // Main particle
            particleGraphics.fillStyle(0xffffff, 1);
            particleGraphics.fillCircle(8, 8, 8);
            particleGraphics.generateTexture('particle', 16, 16);
            
            // Mini particle
            particleGraphics.fillStyle(0xffffff, 1);
            particleGraphics.fillCircle(4, 4, 4);
            particleGraphics.generateTexture('mini_particle', 8, 8);
            
            // Sticky particle
            particleGraphics.fillStyle(0xff00ff, 1);
            particleGraphics.fillCircle(4, 4, 4);
            particleGraphics.generateTexture('sticky_particle', 8, 8);
            
            // Impact particle
            particleGraphics.fillStyle(0xff5500, 1);
            particleGraphics.fillCircle(4, 4, 4);
            particleGraphics.generateTexture('impact_particle', 8, 8);
            
            particleGraphics.clear();
        }
    }
    
    startGame() {
        console.log(`LoadingScene: Starting game for level ${this.levelNumber}`);
        
        // Double-check audio initialization
        this.ensureAllAudioIsAvailable();
        
        // Clean up any existing scenes - make sure to stop the GameScene if it's already running
        if (this.scene.isActive('GameScene')) {
            console.log("Stopping existing GameScene before starting new one");
            this.scene.stop('GameScene');
        }
        
        // Add a larger delay before starting the next scene to ensure everything is cleaned up
        this.time.delayedCall(300, () => {
            // Get the next scene from the data or default to GameScene
            const nextSceneKey = this.nextScene || 'GameScene';
            console.log(`Starting ${nextSceneKey} after delay with levelNumber: ${this.levelNumber}`);
            
            // Pass the level number to the next scene
            this.scene.start(nextSceneKey, { levelNumber: this.levelNumber });
        });
    }
    
    // Ensure all required audio is available or replaced with dummies
    ensureAllAudioIsAvailable() {
        console.log("Ensuring all audio is available or replaced with dummies");
        
        // List of all audio assets that should be available
        const requiredAudio = [
            'bgMusic',
            'victoryMusic', 
            'gameOverSound',
            'explosion',
            'cracksound',
            'bouncesound'
        ];
        
        // Add level-specific music to the required list if we're above level 1
        if (this.levelNumber > 1) {
            requiredAudio.push(`bgMusic_level${this.levelNumber}`);
        }
        
        // Log all available audio keys
        if (this.cache && this.cache.audio) {
            const availableAudio = this.cache.audio.getKeys();
            console.log("Available audio keys:", availableAudio.join(", "));
            
            // Check that each required audio exists and create dummies if needed
            requiredAudio.forEach(key => {
                if (!availableAudio.includes(key)) {
                    console.warn(`Required audio '${key}' not found - creating dummy`);
                    this.createDummyAudio(key);
                } else {
                    console.log(`Audio '${key}' is available`);
                    
                    try {
                        // Test that the sound can be played without errors
                        const sound = this.sound.add(key, { volume: 0 });
                        
                        // Clean up the test sound
                        if (sound && typeof sound.destroy === 'function') {
                           sound.destroy();
                        }
                    } catch (err) {
                        console.error(`Error testing sound '${key}':`, err);
                        // If there was an error, create a dummy replacement
                        this.createDummyAudio(key);
                    }
                }
            });
        } else {
            console.warn("Audio cache not available - creating all dummy sounds");
            requiredAudio.forEach(key => {
                this.createDummyAudio(key);
            });
        }
        
        console.log("Audio initialization complete");
    }

    // Add a new method to create bomb textures programmatically
    createBombTextures() {
        // Define colors for each bomb type
        const bombColors = {
            'blast_bomb': 0xff4444,     // Red for blast
            'piercer_bomb': 0x44aaff,   // Blue for piercer
            'cluster_bomb': 0xffaa44,   // Orange for cluster
            'sticky_bomb': 0x44ff44,    // Green for sticky
            'shatterer_bomb': 0xaa44ff,  // Purple for shatterer
            'driller_bomb': 0xBB5500,    // Brown for driller
            'ricochet_bomb': 0x00FFFF     // Cyan for ricochet
        };

        // Remove existing textures if they exist
        Object.keys(bombColors).forEach(bombType => {
            if (this.textures.exists(bombType)) {
                this.textures.remove(bombType);
                console.log(`Removed existing texture for ${bombType}`);
            }
        });
        
        // Create a default bomb texture (used for initial loading)
        if (this.textures.exists('bomb')) {
            this.textures.remove('bomb');
        }
        const defaultBomb = this.add.graphics();
        defaultBomb.fillStyle(0xffcc00, 1);
        defaultBomb.lineStyle(4, 0x000000, 1);
        defaultBomb.fillCircle(30, 30, 25);
        defaultBomb.strokeCircle(30, 30, 25);
        defaultBomb.generateTexture('bomb', 60, 60);
        defaultBomb.clear();
        defaultBomb.destroy();
        console.log('Created default bomb texture');

        // Create each bomb texture
        Object.entries(bombColors).forEach(([bombType, color]) => {
            // Create a temporary graphics object
            const graphics = this.add.graphics();
            
            // Draw the bomb (circle with face)
            graphics.fillStyle(color, 1);
            graphics.lineStyle(2, 0x000000, 1);
            
            // Draw main circle
            graphics.fillCircle(30, 30, 25);
            graphics.strokeCircle(30, 30, 25);
            
            // Add a smiley face
            // Eyes
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(22, 22, 6);
            graphics.fillCircle(38, 22, 6);
            
            graphics.fillStyle(0x000000, 1);
            graphics.fillCircle(22, 22, 3);
            graphics.fillCircle(38, 22, 3);
            
            // Mouth
            graphics.lineStyle(2, 0x000000, 1);
            graphics.beginPath();
            graphics.arc(30, 34, 12, 0, Math.PI, false);
            graphics.strokePath();
            
            // Add specific features based on bomb type
            switch(bombType) {
                case 'blast_bomb':
                    // Add explosion-like spikes
                    graphics.lineStyle(2, 0xff0000, 1);
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2;
                        const x1 = 30 + Math.cos(angle) * 25;
                        const y1 = 30 + Math.sin(angle) * 25;
                        const x2 = 30 + Math.cos(angle) * 32;
                        const y2 = 30 + Math.sin(angle) * 32;
                        graphics.lineBetween(x1, y1, x2, y2);
                    }
                    break;
                
                case 'piercer_bomb':
                    // Add arrow-like shape
                    graphics.fillStyle(0x0000ff, 1);
                    graphics.fillTriangle(55, 30, 45, 22, 45, 38);
                    break;
                
                case 'cluster_bomb':
                    // Add smaller circles around
                    graphics.fillStyle(0xff8800, 1);
                    graphics.fillCircle(12, 12, 7);
                    graphics.fillCircle(48, 12, 7);
                    graphics.fillCircle(12, 48, 7);
                    graphics.fillCircle(48, 48, 7);
                    break;
                
                case 'sticky_bomb':
                    // Add sticky drips
                    graphics.fillStyle(0x00dd00, 1);
                    graphics.fillCircle(30, 58, 7);
                    graphics.fillCircle(15, 48, 5);
                    graphics.fillCircle(45, 48, 5);
                    break;
                
                case 'shatterer_bomb':
                    // Add crack pattern
                    graphics.lineStyle(2, 0x000000, 1);
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        const x1 = 30 + Math.cos(angle) * 8;
                        const y1 = 30 + Math.sin(angle) * 8;
                        const x2 = 30 + Math.cos(angle) * 22;
                        const y2 = 30 + Math.sin(angle) * 22;
                        graphics.lineBetween(x1, y1, x2, y2);
                    }
                    break;
                
                case 'driller_bomb':
                    // Add drill-like pattern
                    graphics.lineStyle(2, 0x663300, 1);
                    graphics.beginPath();
                    graphics.moveTo(30, 12);
                    graphics.lineTo(48, 30);
                    graphics.lineTo(30, 48);
                    graphics.lineTo(12, 30);
                    graphics.lineTo(30, 12);
                    graphics.strokePath();
                    break;
                    
                case 'ricochet_bomb':
                    // Add ricochet pattern with bounce arrows
                    graphics.lineStyle(2, 0x00FFFF, 1);
                    // Draw bounce arrows in different directions
                    // Right arrow
                    graphics.beginPath();
                    graphics.moveTo(50, 30);
                    graphics.lineTo(40, 25);
                    graphics.lineTo(40, 35);
                    graphics.lineTo(50, 30);
                    graphics.fillPath();
                    // Left arrow
                    graphics.beginPath();
                    graphics.moveTo(10, 30);
                    graphics.lineTo(20, 25);
                    graphics.lineTo(20, 35);
                    graphics.lineTo(10, 30);
                    graphics.fillPath();
                    // Highlight reflective effect
                    graphics.fillStyle(0xFFFFFF, 0.6);
                    graphics.fillCircle(30, 30, 10);
                    break;
            }
            
            // Generate the texture with smaller size
            graphics.generateTexture(bombType, 60, 60);
            graphics.clear();
            graphics.destroy();
            
            console.log(`Created texture for ${bombType}`);
        });
        
        console.log('Created all bomb textures');
    }

    // Add a create method to ensure the textures are created at scene creation
    create() {
        // Recreate the bomb textures to ensure they exist
        this.createBombTextures();
        
        // Create a custom background for level 1
        this.createLevelBackground();
        
        // Now create or load the chibi image
        this.createOrLoadChibiImage();
        
        // Show "Press any key to continue"
        const continueText = this.add.text(
            1920/2,
            1080/2 + 100,
            'Press any key to continue',
            {
                font: '42px Arial', 
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Make the text pulse
        this.tweens.add({
            targets: continueText,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Listen for input to continue
        this.input.keyboard.once('keydown', () => {
            this.startGame();
        });
        
        this.input.once('pointerdown', () => {
            this.startGame();
        });
    }

    // Create a dummy audio for a specific key
    createDummyAudio(key) {
        console.log(`Creating dummy audio for: ${key}`);
        
        try {
            // Check if sound system is available
            if (!this.sound || !this.sound.context) {
                console.warn(`Cannot create dummy audio for ${key}: sound system not available`);
                return;
            }
            
            // If the sound already exists, remove it first to avoid conflicts
            if (this.sound.get(key)) {
                this.sound.remove(key);
                console.log(`Removed existing sound instance for ${key}`);
            }
            
            // Create an empty WebAudio buffer to use as a silent sound
            const buffer = this.sound.context.createBuffer(1, 1, 22050);
            
            // Create a sound with this empty buffer
            const dummySound = {
                key: key,
                isPlaying: false,
                isPaused: false,
                play: (config) => { 
                    console.log(`Dummy sound ${key}: play() called`); 
                    dummySound.isPlaying = true;
                    dummySound.isPaused = false;
                    return dummySound; 
                },
                stop: () => { 
                    console.log(`Dummy sound ${key}: stop() called`); 
                    dummySound.isPlaying = false;
                    return dummySound; 
                },
                pause: () => { 
                    console.log(`Dummy sound ${key}: pause() called`); 
                    dummySound.isPaused = true;
                    return dummySound; 
                },
                resume: () => { 
                    console.log(`Dummy sound ${key}: resume() called`); 
                    dummySound.isPaused = false;
                    return dummySound; 
                },
                setVolume: (volume) => { 
                    console.log(`Dummy sound ${key}: setVolume(${volume}) called`); 
                    return dummySound; 
                },
                setRate: (rate) => { 
                    console.log(`Dummy sound ${key}: setRate(${rate}) called`); 
                    return dummySound; 
                },
                setLoop: (loop) => { 
                    console.log(`Dummy sound ${key}: setLoop(${loop}) called`); 
                    return dummySound; 
                },
                // Ensure the dummy sound also has a .cut() method
                cut: () => { 
                    console.log(`Dummy sound ${key}: cut() called`); 
                    dummySound.isPlaying = false; // Mimic stop behavior
                    return dummySound; 
                },
                // Add any other methods that might be called
                destroy: () => { 
                    console.log(`Dummy sound ${key}: destroy() called`); 
                    return dummySound; 
                }
            };
            
            // Add the dummy sound to the cache
            this.cache.audio.add(key, buffer);
            
            // Add the dummy sound to the sound manager
            this.sound.add(key, { volume: 0 });
            
            // Override the real sound with our dummy implementation
            this.sound.sounds.forEach(sound => {
                if (sound.key === key) {
                    // Override methods to our dummy implementations
                    sound.play = dummySound.play;
                    sound.stop = dummySound.stop;
                    sound.pause = dummySound.pause;
                    sound.resume = dummySound.resume;
                    sound.setVolume = dummySound.setVolume;
                    sound.setRate = dummySound.setRate;
                    sound.setLoop = dummySound.setLoop;
                    sound.cut = dummySound.cut;
                    sound.destroy = dummySound.destroy;
                }
            });
            
            console.log(`Created dummy sound for: ${key}`);
        } catch (err) {
            console.error(`Failed to create dummy sound for ${key}:`, err);
            
            // Last resort: create a global placeholder
            if (!window._dummySounds) {
                window._dummySounds = {};
            }
            
            if (!window._dummySounds[key]) {
                window._dummySounds[key] = {
                    play: () => console.log(`Global dummy ${key}: play() called`),
                    stop: () => console.log(`Global dummy ${key}: stop() called`),
                    pause: () => console.log(`Global dummy ${key}: pause() called`),
                    resume: () => console.log(`Global dummy ${key}: resume() called`),
                    cut: () => console.log(`Global dummy ${key}: cut() called`)
                };
            }
        }
    }
    
    // Create dummy sounds for all essential audio files
    createDummyAudios() {
        console.log("Creating dummy sounds for all essential audio");
        
        // List of essential audio keys
        const essentialAudioKeys = [
            'bgMusic',
            'victoryMusic',
            'gameOverSound',
            'explosion',
            'cracksound',
            'bouncesound'
        ];
        
        // Create dummy sounds for each key
        essentialAudioKeys.forEach(key => {
            this.createDummyAudio(key);
        });
    }
} 