class StoryMapScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StoryMapScene' });
        this.playerProgress = {}; // To be loaded from localStorage
        this.currentLevel = 1; // Example: Start at level 1 or load from progress
        this.playerAvatar = null;
        this.audioManager = null; // Reference to audio manager
        this.levelNodesData = [ // x, y positions are for the center of the node
            // Starting path - bottom left, with much greater spacing
            { id: 1,  x: 150, y: 950, nextLevel: 2, pathType: 'S' },
            { id: 2,  x: 380, y: 800, nextLevel: 3, pathType: 'S' },
            { id: 3,  x: 610, y: 650, nextLevel: 4, pathType: 'S' },
            { id: 4,  x: 840, y: 500, nextLevel: 5, pathType: 'S' },
            { id: 5,  x: 1070, y: 650, nextLevel: 6, pathType: 'S' },
            
            // Middle right path - much wider horizontal spacing
            { id: 6,  x: 1300, y: 500, nextLevel: 7, pathType: 'S' },
            { id: 7,  x: 1530, y: 650, nextLevel: 8, pathType: 'S' },
            { id: 8,  x: 1300, y: 800, nextLevel: 9, pathType: 'S' },
            { id: 9,  x: 1070, y: 350, nextLevel: 10, pathType: 'S' },
            { id: 10, x: 840, y: 200, nextLevel: 11, pathType: 'S' },
            
            // Central-left segment - greater vertical separation
            { id: 11, x: 1070, y: 200, nextLevel: 12, pathType: 'S' },
            { id: 12, x: 1300, y: 200, nextLevel: 13, pathType: 'S' },
            { id: 13, x: 610, y: 350, nextLevel: 14, pathType: 'S' },
            { id: 14, x: 380, y: 350, nextLevel: 15, pathType: 'S' },
            { id: 15, x: 150, y: 350, nextLevel: 16, pathType: 'S' },
            
            // Upper left path - increased vertical gaps
            { id: 16, x: 150, y: 200, nextLevel: 17, pathType: 'S' },
            { id: 17, x: 380, y: 200, nextLevel: 18, pathType: 'S' },
            { id: 18, x: 610, y: 200, nextLevel: 19, pathType: 'S' },
            { id: 19, x: 610, y: 50, nextLevel: 20, pathType: 'S' },
            { id: 20, x: 840, y: 50, nextLevel: 21, pathType: 'S' },
            
            // Upper right path - wider spacing throughout
            { id: 21, x: 1070, y: 50, nextLevel: 22, pathType: 'S' },
            { id: 22, x: 1300, y: 50, nextLevel: 23, pathType: 'S' },
            { id: 23, x: 1530, y: 50, nextLevel: 24, pathType: 'S' },
            { id: 24, x: 1530, y: 200, nextLevel: 25, pathType: 'S' },
            { id: 25, x: 1530, y: 350, nextLevel: 26, pathType: 'S' },
            
            // Final path on right - ensure no overlap with middle path
            { id: 26, x: 1760, y: 350, nextLevel: 27, pathType: 'S' },
            { id: 27, x: 1760, y: 500, nextLevel: 28, pathType: 'S' },
            { id: 28, x: 1760, y: 650, nextLevel: 29, pathType: 'S' },
            { id: 29, x: 1760, y: 800, nextLevel: 30, pathType: 'S' },
            { id: 30, x: 1530, y: 800, nextLevel: null, pathType: 'S' }
        ];
        this.levelNodeObjects = {}; // To store Phaser game objects for nodes
        this.albumButton = null; // Reference to the album button
    }

    preload() {
        console.log("StoryMapScene: Preload");
        // Map background music
        this.load.audio('story_map_music', 'assets/audio/story_map.mp3');
        
        // Load story map background image
        this.load.image('story_map_bg', 'assets/images/story_map.png');
        
        // Other image loading would go here, e.g.:
        // this.load.image('level_node_locked', 'assets/images/level_node_locked.png');
        // this.load.image('level_node_incomplete', 'assets/images/level_node_incomplete.png');
        // this.load.image('level_node_complete', 'assets/images/level_node_complete.png');
        // this.load.image('star_empty', 'assets/images/star_empty_map.png');
        // this.load.image('star_full', 'assets/images/star_full_map.png');
        // this.load.image('player_avatar_map', 'assets/images/player_avatar_map.png');
    }

    init(data) {
        console.log("StoryMapScene: Init received data:", data);
        this.loadPlayerProgress();

        if (data && data.completedLevelId !== undefined) {
            // Update progress for the completed level
            const progress = this.playerProgress[data.completedLevelId] || { stars: 0, unlocked: true };
            progress.stars = Math.max(progress.stars || 0, data.starsEarned || 0);
            progress.unlocked = true;
            this.playerProgress[data.completedLevelId] = progress;

            // Unlock the next level
            const completedNode = this.levelNodesData.find(node => node.id === data.completedLevelId);
            if (completedNode && completedNode.nextLevel) {
                const nextLevelNode = this.levelNodesData.find(node => node.id === completedNode.nextLevel);
                if (nextLevelNode) {
                     this.playerProgress[nextLevelNode.id] = this.playerProgress[nextLevelNode.id] || { stars: 0, unlocked: false }; // Ensure object exists
                     this.playerProgress[nextLevelNode.id].unlocked = true;
                     this.currentLevel = nextLevelNode.id; // Set current level for avatar movement
                } else {
                    this.currentLevel = completedNode.id; // Stay on last level if no next
                }
            } else if (completedNode) {
                 this.currentLevel = completedNode.id; // Stay on the completed level if it's the last
            }
            this.savePlayerProgress();
        } else {
            // Determine current level if not coming from a completed game
            this.currentLevel = 1; // Default
            let highestUnlocked = 0;
            for (const nodeId in this.playerProgress) {
                if (this.playerProgress[nodeId].unlocked) {
                    highestUnlocked = Math.max(highestUnlocked, parseInt(nodeId));
                }
            }
            // Find the first locked level after the highest unlocked, or stay on highest unlocked
            let firstLockedAfterHighest = null;
            if (highestUnlocked > 0) {
                const lastUnlockedNode = this.levelNodesData.find(n => n.id === highestUnlocked);
                if (lastUnlockedNode && lastUnlockedNode.nextLevel && this.playerProgress[lastUnlockedNode.nextLevel] && !this.playerProgress[lastUnlockedNode.nextLevel].unlocked ) {
                     firstLockedAfterHighest = lastUnlockedNode.nextLevel;
                } else if (lastUnlockedNode && lastUnlockedNode.nextLevel && !this.playerProgress[lastUnlockedNode.nextLevel]) {
                     firstLockedAfterHighest = lastUnlockedNode.nextLevel; // Next level exists but no progress entry yet implies locked
                }


                if (firstLockedAfterHighest) {
                    this.currentLevel = firstLockedAfterHighest;
                } else {
                    // If all reachable levels are unlocked, or if on last level path, currentLevel is the highest unlocked.
                    this.currentLevel = highestUnlocked > 0 ? highestUnlocked : 1;
                }
            }


             // Special case for first launch: unlock level 1 if no progress exists
            if (Object.keys(this.playerProgress).length === 0) {
                this.playerProgress[1] = { stars: 0, unlocked: true };
                this.currentLevel = 1;
                this.savePlayerProgress();
            }
        }
        console.log("StoryMapScene: Current level after init logic:", this.currentLevel);
    }

    create() {
        console.log("StoryMapScene: Create");
        
        // Set the background image instead of just a color
        const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'story_map_bg');
        
        // Make sure the background covers the entire screen
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        
        // Set the background depth to be below everything else
        bg.setDepth(0);
        
        // Initialize audio manager
        this.initializeAudio();

        this.drawLevelPaths();
        this.levelNodesData.forEach(nodeData => {
            this.createLevelNode(nodeData);
        });

        this.createPlayerAvatar();

        // Ensure avatar starts at the right position when first entering the Story Map
        const initialAvatarNode = this.levelNodesData.find(node => node.id === this.currentLevel);
        
        if (initialAvatarNode && this.avatarContainer) {
            // Position avatar above the button
            const buttonHeight = 100; // Match height in createLevelNode
            const avatarX = initialAvatarNode.x;
            const avatarY = initialAvatarNode.y - (buttonHeight/2) - 20; // 20px above the button
            
            this.avatarContainer.setPosition(avatarX, avatarY);
            console.log(`Positioned avatar container at level ${this.currentLevel} (${avatarX}, ${avatarY})`);
        } else if (this.levelNodeObjects[this.currentLevel] && this.avatarContainer) {
            // Fallback if node not found in data array
            const targetNode = this.levelNodeObjects[this.currentLevel];
            const buttonHeight = 100;
            const avatarX = targetNode.x;
            const avatarY = targetNode.y - (buttonHeight/2) - 20;
            
            this.avatarContainer.setPosition(avatarX, avatarY);
            console.log(`Using levelNodeObjects fallback to position avatar at level ${this.currentLevel}`);
        }

        this.input.on('pointerdown', (pointer) => {
            console.log(`StoryMap pointerdown: ${pointer.x}, ${pointer.y}`);
        });
        
        // Add a back button to return to the title screen
        this.createBackButton();
        
        // Add the album button in the lower right corner
        this.createAlbumButton();
    }
    
    findPreviousNodeId(targetNodeId) {
        // Finds the ID of the node that has targetNodeId as its nextLevel
        const previousNode = this.levelNodesData.find(node => node.nextLevel === targetNodeId);
        return previousNode ? previousNode.id : null;
    }


    drawLevelPaths() {
        // Create a graphics object with styled paths
        const graphics = this.add.graphics({ 
            lineStyle: { 
                width: 8, 
                color: 0xffffff, 
                alpha: 0.9  // Increased opacity for better visibility
            } 
        });
        
        // Add a glow effect behind the path lines
        const glowGraphics = this.add.graphics({
            lineStyle: {
                width: 12,
                color: 0x00aaff,
                alpha: 0.5  // Semi-transparent blue glow
            }
        });
        
        // Draw connections between level nodes
        this.levelNodesData.forEach(nodeData => {
            if (nodeData.nextLevel) {
                const nextNodeData = this.levelNodesData.find(n => n.id === nodeData.nextLevel);
                if (nextNodeData) {
                    // Path now connects to bottom center of the current button and top center of the next button
                    const buttonHeight = 100; // Match the height used in createLevelNode
                    const buttonWidth = 180;  // Match the width used in createLevelNode
                    
                    // Calculate connection points at the edges of the buttons
                    let startX = nodeData.x;
                    let startY = nodeData.y;
                    let endX = nextNodeData.x;
                    let endY = nextNodeData.y;
                    
                    // Adjust connection points based on relative positions
                    if (nextNodeData.y > nodeData.y + buttonHeight) {
                        // Next node is below - connect from bottom to top
                        startY = nodeData.y + buttonHeight/2;
                        endY = nextNodeData.y - buttonHeight/2;
                    } else if (nextNodeData.y < nodeData.y - buttonHeight) {
                        // Next node is above - connect from top to bottom
                        startY = nodeData.y - buttonHeight/2;
                        endY = nextNodeData.y + buttonHeight/2;
                    } else if (nextNodeData.x > nodeData.x) {
                        // Next node is to the right - connect from right to left
                        startX = nodeData.x + buttonWidth/2;
                        endX = nextNodeData.x - buttonWidth/2;
                    } else {
                        // Next node is to the left - connect from left to right
                        startX = nodeData.x - buttonWidth/2;
                        endX = nextNodeData.x + buttonWidth/2;
                    }
                    
                    // Draw glow effect first (behind main line)
                    glowGraphics.beginPath();
                    glowGraphics.moveTo(startX, startY);
                    glowGraphics.lineTo(endX, endY);
                    glowGraphics.strokePath();
                    
                    // Draw main path line
                    graphics.beginPath();
                    graphics.moveTo(startX, startY);
                    graphics.lineTo(endX, endY);
                    graphics.strokePath();
                }
            }
        });
        
        // Set appropriate depth for the path lines
        glowGraphics.setDepth(0.5); // Above background but below nodes
        graphics.setDepth(0.6);      // Above glow but below nodes
    }

    createLevelNode(nodeData) {
        const progress = this.playerProgress[nodeData.id] || { stars: 0, unlocked: false };
        
        // Unlock level 1 by default if no progress for it
        if (nodeData.id === 1 && !this.playerProgress[1]) {
            progress.unlocked = true;
            this.playerProgress[1] = progress; // ensure it's in playerProgress
        }

        // Define button dimensions and colors
        const buttonWidth = 180;
        const buttonHeight = 100;
        let fillColor, strokeColor;
        
        if (progress.unlocked) {
            if (progress.stars > 0) {
                // Completed levels (with stars)
                fillColor = 0xA67C52;    // Brown/copper color for completed levels
                strokeColor = 0xFFD700;  // Gold border for contrast
            } else {
                // Just unlocked but not completed
                fillColor = 0xA67C52;    // Brown/copper color
                strokeColor = 0xFFFFFF;  // White border for contrast
            }
        } else {
            // Locked levels
            fillColor = 0x555555;       // Darker gray
            strokeColor = 0x999999;     // Light gray border
        }

        // Create the button background with rounded corners
        const nodeButton = this.add.rectangle(nodeData.x, nodeData.y, buttonWidth, buttonHeight, fillColor, 1)
            .setStrokeStyle(4, strokeColor, 1)
            .setInteractive({ useHandCursor: progress.unlocked });
            
        // Add a darker header area at the top of the button
        const headerHeight = 30;
        const headerBg = this.add.rectangle(
            nodeData.x, 
            nodeData.y - (buttonHeight/2) + (headerHeight/2), 
            buttonWidth, 
            headerHeight, 
            0x333333, 
            1
        );
        
        // Add level number text in the header
        const levelText = this.add.text(
            nodeData.x - (buttonWidth/2) + 15, 
            nodeData.y - (buttonHeight/2) + (headerHeight/2), 
            `Level ${nodeData.id}`, 
            {
                font: '18px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0, 0.5);
        
        // Add preview text in the main part of the button
        const previewText = this.add.text(
            nodeData.x, 
            nodeData.y, 
            `Level ${nodeData.id}\nPreview`, 
            {
                font: '22px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Add event listener for node click
        nodeButton.on('pointerdown', () => {
            if (progress.unlocked) {
                this.startLevel(nodeData.id);
            } else {
                console.log(`Level ${nodeData.id} is locked.`);
                // Add a visual feedback for locked nodes
                this.tweens.add({
                    targets: nodeButton,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                
                // Play a "locked" sound if available
                if (this.audioManager && this.audioManager.playSound) {
                    this.audioManager.playSound('locked');
                }
            }
        });

        // Set appropriate depths for overlapping elements
        headerBg.setDepth(1.1);
        nodeButton.setDepth(1);
        levelText.setDepth(1.2);
        previewText.setDepth(1.2);

        // Add star rating at the bottom of the button
        const starSpacing = 25;
        const starsY = nodeData.y + (buttonHeight/2) - 20; // Position stars at the bottom with margin
        const starsStartX = nodeData.x - starSpacing;
        
        for (let i = 0; i < 3; i++) {
            const starX = starsStartX + (i * starSpacing);
            const isFilled = i < progress.stars;
            
            // Create star using text characters with improved visibility
            const starChar = isFilled ? '★' : '☆';
            const starColor = isFilled ? '#FFD700' : '#FFFFFF';
            const starOutline = '#000000';
            
            const star = this.add.text(starX, starsY, starChar, {
                font: '24px Arial',
                fill: starColor,
                stroke: starOutline,
                strokeThickness: 3
            }).setOrigin(0.5);
            
            star.setDepth(1.2);
        }
        
        // If level is locked, add a lock icon or effect
        if (!progress.unlocked) {
            // Add gray overlay to indicate locked status
            const lockOverlay = this.add.rectangle(
                nodeData.x, 
                nodeData.y, 
                buttonWidth - 10, 
                buttonHeight - 10, 
                0x000000, 
                0.5
            );
            lockOverlay.setDepth(1.5);
            
            // Add lock icon
            const lockIcon = this.add.text(
                nodeData.x, 
                nodeData.y, 
                '🔒', 
                {
                    font: '32px Arial',
                    fill: '#ffffff'
                }
            ).setOrigin(0.5);
            lockIcon.setDepth(1.6);
        }
        
        // Store reference to the button for avatar positioning
        this.levelNodeObjects[nodeData.id] = nodeButton;
    }

    createPlayerAvatar() {
        // Create a more noticeable player avatar with a glowing effect
        this.playerAvatar = this.add.circle(0, 0, 18, 0xff5555, 1); // Larger red circle
        this.playerAvatar.setStrokeStyle(4, 0xffffff, 1); // White border
        
        // Add a pulsing effect to make it stand out
        this.tweens.add({
            targets: this.playerAvatar,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add a glowing circle behind the avatar
        const glow = this.add.circle(0, 0, 25, 0xffff00, 0.4);
        
        // Group the avatar and glow together
        this.avatarContainer = this.add.container(0, 0, [glow, this.playerAvatar]);
        this.avatarContainer.setDepth(3); // Ensure avatar is above all other elements
        
        // Override the setPosition method to update both elements
        const originalSetPosition = this.playerAvatar.setPosition;
        this.playerAvatar.setPosition = (x, y) => {
            this.avatarContainer.setPosition(x, y);
            return originalSetPosition.call(this.playerAvatar, 0, 0); // Local position in container
        };
    }

    moveAvatarToLevel(levelId) {
        const targetNode = this.levelNodeObjects[levelId];
        if (targetNode && this.avatarContainer) {
            // For the button design, place the avatar above the button
            const buttonHeight = 100; // Match height in createLevelNode
            
            // Position for the avatar (centered above the button)
            const avatarX = targetNode.x;
            const avatarY = targetNode.y - (buttonHeight/2) - 20; // 20px above the button
            
            // Add a flash effect at the destination
            const flash = this.add.circle(avatarX, avatarY, 35, 0xffffff, 0.7);
            flash.setDepth(2);
            
            // Animate the flash
            this.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 2,
                duration: 700,
                ease: 'Power2',
                onComplete: () => {
                    flash.destroy();
                }
            });
            
            // Move the avatar container to the target position
            this.tweens.add({
                targets: this.avatarContainer,
                x: avatarX,
                y: avatarY,
                duration: 700,
                ease: 'Power2',
                onStart: () => { console.log(`Avatar moving to level ${levelId} (${avatarX}, ${avatarY})`); },
                onComplete: () => {
                    console.log(`Avatar arrived at level ${levelId}`);
                    this.currentLevel = levelId; // Update current level after movement
                    this.savePlayerProgress(); // Save progress, currentLevel is part of it implicitly
                }
            });
        } else {
            console.warn(`Cannot move avatar: Target node for level ${levelId} not found or avatar container not created.`);
        }
    }

    startLevel(levelId) {
        console.log(`Attempting to start level: ${levelId}`);
        // Ensure this.currentLevel is updated before starting, for consistent state.
        this.currentLevel = levelId;
        this.savePlayerProgress(); // Save before transitioning
        
        // Stop music before transitioning
        if (this.audioManager) {
            this.audioManager.stopAll();
        }
        
        // Stop this scene and start the GameScene
        this.scene.stop(); // Stop StoryMapScene
        this.scene.get('UIScene').scene.stop(); // Stop UIScene explicitly
        
        this.scene.start('LoadingScene', {
            nextScene: 'GameScene',
            levelNumber: levelId
        });
    }

    loadPlayerProgress() {
        const savedProgress = localStorage.getItem('phaserQixPlayerProgress');
        if (savedProgress) {
            this.playerProgress = JSON.parse(savedProgress);
            console.log("Player progress loaded:", this.playerProgress);
        } else {
            // Initialize level 1 as unlocked if no save data
            this.playerProgress = { 1: { stars: 0, unlocked: true } };
            console.log("No saved progress, initialized level 1:", this.playerProgress);
        }
        // Determine currentLevel from loaded progress
        let highestUnlocked = 0;
        let lastPlayedOrHighestUnlockedWithStars = 1; // Default to 1

        for (const levelIdStr in this.playerProgress) {
            const levelId = parseInt(levelIdStr);
            const progress = this.playerProgress[levelId];
            if (progress.unlocked) {
                highestUnlocked = Math.max(highestUnlocked, levelId);
                if (progress.stars > 0 || levelId > lastPlayedOrHighestUnlockedWithStars ) { // Prioritize actual play
                     lastPlayedOrHighestUnlockedWithStars = levelId;
                }
            }
        }
        
        // If highest unlocked has stars, it's likely the one to be on or move to next.
        // If not, find the next logical unlocked level.
        const highestNode = this.levelNodesData.find(n => n.id === highestUnlocked);
        if (highestNode && highestNode.nextLevel && this.playerProgress[highestNode.nextLevel] && this.playerProgress[highestNode.nextLevel].unlocked) {
             this.currentLevel = highestNode.nextLevel;
        } else if (highestUnlocked > 0) {
            this.currentLevel = highestUnlocked;
        } else {
            this.currentLevel = 1; // Fallback
        }
        
        // A simple heuristic: current level is the one after the latest one with stars, if it's unlocked
        // Or the highest unlocked level without stars if no further progress.
        let candidateCurrentLevel = 1;
        let maxStarredLevel = 0;
        this.levelNodesData.forEach(node => {
            if (this.playerProgress[node.id] && this.playerProgress[node.id].unlocked) {
                candidateCurrentLevel = Math.max(candidateCurrentLevel, node.id); // At least the highest unlocked
                if (this.playerProgress[node.id].stars > 0) {
                    maxStarredLevel = Math.max(maxStarredLevel, node.id);
                }
            }
        });

        const maxStarredNode = this.levelNodesData.find(n => n.id === maxStarredLevel);
        if (maxStarredNode && maxStarredNode.nextLevel && this.playerProgress[maxStarredNode.nextLevel] && this.playerProgress[maxStarredNode.nextLevel].unlocked) {
            this.currentLevel = maxStarredNode.nextLevel;
        } else {
            this.currentLevel = candidateCurrentLevel;
        }
        if (Object.keys(this.playerProgress).length === 0) { // Absolutely no data
             this.currentLevel = 1;
        }


        console.log(`Initial currentLevel set to: ${this.currentLevel} based on loaded progress.`);
    }

    savePlayerProgress() {
        try {
            localStorage.setItem('phaserQixPlayerProgress', JSON.stringify(this.playerProgress));
            console.log("Player progress saved:", this.playerProgress);
        } catch (e) {
            console.error("Could not save player progress to localStorage:", e);
        }
    }

    // Helper to store the level ID from which we are transitioning
    setComingFromLevel(levelId) {
        this.lastCompletedLevelId = levelId;
    }
     // Called by GameScene (or via an event from GameScene) when a level is won
    levelWon(levelId, starsEarned) {
        const progress = this.playerProgress[levelId] || { stars: 0, unlocked: true };
        progress.stars = Math.max(progress.stars, starsEarned);
        this.playerProgress[levelId] = progress;

        const currentNode = this.levelNodesData.find(node => node.id === levelId);
        if (currentNode && currentNode.nextLevel) {
            this.playerProgress[currentNode.nextLevel] = this.playerProgress[currentNode.nextLevel] || {};
            this.playerProgress[currentNode.nextLevel].unlocked = true;
        }
        this.savePlayerProgress();
    }

    // Initialize audio system
    initializeAudio() {
        try {
            console.log("StoryMapScene: Initializing audio system...");

            // Ensure any sound from a previous scene (like GameScene's victory music) is stopped.
            if (this.sound && typeof this.sound.stopAll === 'function') {
                this.sound.stopAll();
                console.log("StoryMapScene: Executed global this.sound.stopAll() at the start of initializeAudio.");
            }
            
            // Create a new AudioManager instance
            this.audioManager = new AudioManager(this);
            
            // Initialize the AudioManager
            const initialized = this.audioManager.initialize();
            
            if (initialized) {
                console.log("AudioManager initialized successfully in StoryMapScene");
                
                // Override the default playBackgroundMusic for this scene
                this.audioManager.playBackgroundMusic = () => {
                    try {
                        console.log("StoryMapScene: Attempting to play story map music...");
                        
                        if (!this.audioManager.musicEnabled) {
                            console.log("StoryMapScene: Music is disabled, not playing story map music");
                            return;
                        }
                        
                        // Stop any existing background music
                        if (this.audioManager.bgMusic) {
                            this.audioManager.bgMusic.stop();
                        }
                        
                        // Check if the audio system and music file are available
                        if (!this.sound || !this.sound.add || !this.cache.audio.exists('story_map_music')) {
                            console.error("StoryMapScene: Sound system or story_map_music not available");
                            return;
                        }
                        
                        // Create and play background music
                        try {
                            this.audioManager.bgMusic = this.sound.add('story_map_music', {
                                volume: 0.4,
                                loop: true
                            });
                            
                            if (this.audioManager.bgMusic) {
                                this.audioManager.bgMusic.play();
                                console.log("StoryMapScene: Story map music started successfully");
                            }
                        } catch (err) {
                            console.error("Error playing story map music:", err);
                        }
                    } catch (err) {
                        console.error("Error in StoryMapScene.playBackgroundMusic:", err);
                    }
                };
                
                // Play the background music with a short delay
                this.time.delayedCall(500, () => {
                    this.audioManager.playBackgroundMusic();
                });
            } else {
                console.warn("AudioManager initialization failed in StoryMapScene");
            }
        } catch (error) {
            console.error("Error initializing audio in StoryMapScene:", error);
        }
    }

    shutdown() {
        // Clean up audio resources
        if (this.audioManager) {
            this.audioManager.cleanup();
            this.audioManager = null;
        }
        
        // Stop any active tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
        
        // Clear any event listeners
        this.input.off('pointerdown');
        
        console.log("StoryMapScene: Shutdown complete");
    }

    // Add new method to create a back button
    createBackButton() {
        // Position in the top-left corner with some padding
        const padding = 20;
        const x = padding + 50;
        const y = padding + 30;
        
        // Create button background
        const buttonWidth = 100;
        const buttonHeight = 40;
        const backButton = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4a6fa5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.returnToTitle())
            .on('pointerover', () => {
                backButton.setFillStyle(0x5588cc);
                backText.setFill('#ffffff');
            })
            .on('pointerout', () => {
                backButton.setFillStyle(0x4a6fa5);
                backText.setFill('#ffffff');
            });
            
        // Add border and make it stand out
        backButton.setStrokeStyle(2, 0xffffff);
        
        // Add text
        const backText = this.add.text(x, y, 'Back', {
            font: '22px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Set depth to ensure it's above other elements
        backButton.setDepth(10);
        backText.setDepth(11);
        
        // Store references
        this.backButton = backButton;
        this.backText = backText;
    }
    
    // Add method to handle returning to title
    returnToTitle() {
        console.log('StoryMapScene: Returning to title menu');
        
        // Stop audio before transitioning
        if (this.audioManager) {
            this.audioManager.stopAll();
        }
        
        // Remove any existing listeners to prevent memory leaks
        this.input.off('pointerdown');
        
        // Add a fade-out transition
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop this scene
            this.scene.stop();
            
            // Start TitleScene
            this.scene.start('TitleScene');
        });
    }

    // Add method to create the album button
    createAlbumButton() {
        // Position in the bottom-right corner with some padding
        const padding = 20;
        const x = this.cameras.main.width - padding - 75; // 75 is half of the button width
        const y = this.cameras.main.height - padding - 30; // 30 is half of the button height
        
        // Create button background
        const buttonWidth = 150;
        const buttonHeight = 60;
        const albumButton = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4a6fa5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.openAlbum())
            .on('pointerover', () => {
                albumButton.setFillStyle(0x5588cc);
                albumText.setFill('#ffffff');
            })
            .on('pointerout', () => {
                albumButton.setFillStyle(0x4a6fa5);
                albumText.setFill('#ffffff');
            });
            
        // Add border and make it stand out
        albumButton.setStrokeStyle(2, 0xffffff);
        
        // Add text
        const albumText = this.add.text(x, y, 'Album', {
            font: '28px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Add a small icon for the album (optional)
        const albumIcon = this.add.text(x - 45, y, '📚', {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Set depth to ensure it's above other elements
        albumButton.setDepth(10);
        albumText.setDepth(11);
        albumIcon.setDepth(11);
        
        // Store references
        this.albumButton = albumButton;
        this.albumText = albumText;
        this.albumIcon = albumIcon;
    }

    // Add method to handle opening the album
    openAlbum() {
        console.log('StoryMapScene: Opening Album');
        
        // Stop audio before transitioning (optional, might want music to continue)
        // if (this.audioManager) {
        //     this.audioManager.stopAll();
        // }
        
        // Add a fade-out transition
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Keep this scene active but not visible
            this.scene.sleep();
            
            // Start AlbumScene with player progress data
            this.scene.run('AlbumScene', { playerProgress: this.playerProgress });
        });
    }
} 