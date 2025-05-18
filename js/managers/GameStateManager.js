// GameStateManager.js - Manages game state for level completion and game over states
class GameStateManager {
    constructor(scene) {
        this.scene = scene;
        this.isLevelComplete = false;
        this.isGameOver = false;
        this.UI_DEPTH = 1000; // Same depth as in GameScene
        this.lastBombActive = false; // Flag to track if last bomb is still active
        this.waitingForLastBomb = false; // Flag to indicate we're waiting for last bomb to resolve
    }

    // Initialize the manager
    init() {
        console.log("GameStateManager: Initializing");
    }

    // Check if the level is complete based on reveal percentage
    checkLevelCompletion() {
        if (this.isLevelComplete) return;
        
        if (this.scene.revealPercentage >= this.scene.targetPercentage) {
            console.log("Level complete! Playing victory music...");
            this.isLevelComplete = true;
            
            // Clear any trajectory display
            if (this.scene.clearTrajectory) {
                this.scene.clearTrajectory();
            }
            
            // Play victory music with enhanced error handling
            if (this.scene.audioManager) {
                try {
                    this.scene.audioManager.playVictoryMusic();
                } catch (error) {
                    console.error("Error during victory music playback:", error);
                }
            } else {
                console.error("Audio manager not available for victory music");
            }
            
            // Change the background to victory background
            this.displayVictoryBackground();
            
            // Set full opacity on the chibi image
            if (this.scene.chibiImage) {
                this.scene.chibiImage.setAlpha(1);
            }
            
            // Force remove the completion veil regardless of previous removal state
            if (this.scene.completionVeil) {
                console.log("Force removing completion veil during level completion");
                this.scene.completionVeilRemoved = true;
                
                // If the completion veil is a container of blocks
                if (this.scene.veilContainer && this.scene.veilContainer.scene) {
                    // Immediately hide and destroy the veil container
                    this.scene.veilContainer.setVisible(false);
                    this.scene.veilContainer.destroy(true);
                    this.scene.veilContainer = null;
                }
                
                // Handle frost graphics separately
                if (this.scene.frostGraphics && this.scene.frostGraphics.scene) {
                    this.scene.frostGraphics.setVisible(false);
                    this.scene.frostGraphics.destroy();
                }
                
                // Ensure the completionVeil reference is cleared
                this.scene.completionVeil = null;
            }
            
            // Clear all remaining blue veils
            if (this.scene.blueVeils) {
                this.scene.blueVeils.forEach(veil => {
                    if (veil && veil.scene) {
                        // Handle any highlight effects
                        if (veil.highlight && veil.highlight.scene) {
                            this.scene.tweens.add({
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
                        this.scene.tweens.add({
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
                this.scene.blueVeils = [];
            }
            
            // Create a celebratory effect
            this.scene.cameras.main.flash(500, 255, 255, 255, 0.7);
            
            // Add some particles for celebration
            const particles = this.scene.add.particles('particle');
            particles.setDepth(6); // Same depth as explosion effects, above all game elements
            const emitter = particles.createEmitter({
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 2000,
                tint: [0xffff00, 0xff00ff, 0x00ffff, 0xff0000],
                on: false
            });
            
            // Emit particles around the chibi image
            if (this.scene.chibiImage) {
                emitter.explode(100, this.scene.chibiImage.x, this.scene.chibiImage.y);
            }
            
            // Create victory UI elements with high depth
            const victoryText = this.scene.add.text(
                this.scene.cameras.main.centerX,
                100,
                'Level Complete!',
                {
                    fontSize: '48px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 6,
                    shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, fill: true }
                }
            ).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH);
            
            const percentText = this.scene.add.text(
                this.scene.cameras.main.centerX,
                200,
                `${this.scene.revealPercentage}% Revealed!`,
                {
                    fontSize: '32px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH);
            
            // After a delay, show buttons
            this.scene.time.delayedCall(3000, () => {
                // Create container for buttons
                const buttonContainer = this.scene.add.container(0, 0).setDepth(this.UI_DEPTH);
                
                // Style for buttons
                const buttonStyle = {
                    fontSize: '36px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    padding: { x: 20, y: 10 }
                };
                
                // Check if there's a next level
                const hasNextLevel = this.scene.levelManager ? 
                    this.scene.levelManager.hasNextLevel() : 
                    (this.scene.currentLevel < 5);
                
                // Adjust positions based on whether we have a next level button
                const xOffset = hasNextLevel ? 150 : 0;
                
                // Play Again button
                const restartButton = this.scene.add.text(
                    this.scene.cameras.main.centerX - xOffset,
                    this.scene.cameras.main.height - 100,
                    'Play Again',
                    {
                        ...buttonStyle,
                        backgroundColor: '#1a6dd5'
                    }
                ).setOrigin(0.5, 0.5)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.scene.scene.restart());
                
                restartButton.on('pointerover', () => restartButton.setStyle({ color: '#ffff00' }));
                restartButton.on('pointerout', () => restartButton.setStyle({ color: '#ffffff' }));
                
                // Add to container
                buttonContainer.add(restartButton);
                
                // If this isn't the last level, show Next Level button
                if (hasNextLevel) {
                    // Next Level button
                    const nextLevelButton = this.scene.add.text(
                        this.scene.cameras.main.centerX + xOffset,
                        this.scene.cameras.main.height - 100,
                        'Next Level',
                        {
                            ...buttonStyle,
                            backgroundColor: '#22aa22' // Green background for next level
                        }
                    ).setOrigin(0.5, 0.5)
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => {
                        // Properly stop ALL audio first
                        if (this.scene.audioManager) {
                            try {
                                console.log("Stopping audio before transitioning to next level");
                                this.scene.audioManager.stopAll();
                            } catch (e) {
                                console.error("Error stopping audio:", e);
                            }
                        }
                        
                        // Clear any timers or tweens
                        this.scene.tweens.killAll();
                        this.scene.time.removeAllEvents();
                        
                        // Advance to the next level
                        if (this.scene.levelManager && this.scene.levelManager.hasNextLevel()) {
                            // First update the level number
                            this.scene.levelManager.nextLevel();
                            this.scene.currentLevel = this.scene.levelManager.currentLevel;
                            
                            console.log(`Advancing to level ${this.scene.currentLevel}`);
                            
                            // Stop this scene and start the loading scene for the next level
                            this.scene.scene.stop('GameScene');
                            this.scene.scene.start('LoadingScene', { 
                                levelNumber: this.scene.currentLevel
                            });
                        } else {
                            console.log("No more levels available");
                        }
                    });
                    
                    nextLevelButton.on('pointerover', () => nextLevelButton.setStyle({ color: '#ffff00' }));
                    nextLevelButton.on('pointerout', () => nextLevelButton.setStyle({ color: '#ffffff' }));
                    
                    // Add to container
                    buttonContainer.add(nextLevelButton);
                    
                    // Add a celebration message about unlocking a new bomb if applicable
                    if (this.scene.levelManager && this.scene.levelManager.hasUnlockedBomb()) {
                        const bombType = this.scene.levelManager.getUnlockedBombType();
                        const bombName = this.scene.BOMB_NAMES[bombType] || 'New Bomb';
                        
                        const unlockText = this.scene.add.text(
                            this.scene.cameras.main.centerX,
                            this.scene.cameras.main.height - 170,
                            `You've unlocked ${bombName}!`,
                            {
                                fontSize: '28px',
                                fontFamily: 'Arial',
                                color: '#ffff00',
                                stroke: '#000000',
                                strokeThickness: 4,
                                shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 3, fill: true }
                            }
                        ).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH);
                        
                        // Add a pulsing effect to the unlock text
                        this.scene.tweens.add({
                            targets: unlockText,
                            scale: 1.1,
                            duration: 800,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                        
                        // Add to container
                        buttonContainer.add(unlockText);
                    }
                }
            });
        }
    }

    // Method to display the victory background with a nice transition
    displayVictoryBackground() {
        try {
            // Get the victory background key for the current level
            const victoryBgKey = `victoryBackground${this.scene.currentLevel}`;
            
            // Check if the victory background texture exists
            if (this.scene.textures.exists(victoryBgKey)) {
                // Create a new image for the victory background
                const victoryBg = this.scene.add.image(1920/2, 1080/2, victoryBgKey);
                
                // Make sure it spans the entire screen nicely
                victoryBg.setDisplaySize(1920, 1080);
                
                // Start with alpha 0 (fully transparent)
                victoryBg.setAlpha(0);
                
                // Set it to a depth that's above the background but below other elements
                victoryBg.setDepth(0.5); // Between background (0) and chibi (1)
                
                // Create a fade-in transition
                this.scene.tweens.add({
                    targets: victoryBg,
                    alpha: 1, // Fade to fully visible
                    duration: 2000, // Over 2 seconds
                    ease: 'Power2',
                    onComplete: () => {
                        // After fading in, make the background subtly animate
                        this.scene.tweens.add({
                            targets: victoryBg,
                            scale: 1.05, // Slightly grow
                            duration: 10000, // Very slow animation
                            yoyo: true,
                            repeat: -1, // Infinite repetition
                            ease: 'Sine.easeInOut'
                        });
                    }
                });
                
                console.log(`Victory background (${victoryBgKey}) displayed for level ${this.scene.currentLevel}`);
            } else {
                console.warn(`Victory background texture '${victoryBgKey}' not found!`);
            }
        } catch (error) {
            console.error("Error displaying victory background:", error);
        }
    }

    // Check for game over condition
    checkGameOver() {
        console.log("[GameStateManager.checkGameOver] Method ENTERED.");

        // Sync GameStateManager's flags with GameScene's state at the start of the check
        this.isGameOver = this.scene.isGameOver;
        this.isLevelComplete = this.scene.isLevelComplete;

        if (this.isGameOver || this.isLevelComplete) {
            return; // Already handled by GameScene
        }

        const anyBombsAvailable = this.scene.isAnyBombAvailable ? this.scene.isAnyBombAvailable() : false;
        const revealPercentage = this.scene.revealPercentage !== undefined ? this.scene.revealPercentage : 0;
        const targetPercentage = this.scene.targetPercentage !== undefined ? this.scene.targetPercentage : 85;

        // Special handling for the last bomb
        const activeBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;
        
        // Check if this is the last bomb scenario - no bombs available but one is still active
        if (!anyBombsAvailable && activeBomb) {
            this.lastBombActive = true;
            this.waitingForLastBomb = true;
            console.log("[GameStateManager.checkGameOver] Last bomb is active, deferring game over check until it resolves");
            return; // Defer game over check until the bomb resolves
        }
        
        // Don't perform game over check if we're waiting for the last bomb to resolve
        if (this.waitingForLastBomb) {
            // Only proceed with game over check if the last bomb is no longer active
            if (this.scene.bombLauncher && !this.scene.bombLauncher.getActiveLaunchedBomb()) {
                console.log("[GameStateManager.checkGameOver] Last bomb has resolved, proceeding with game over check");
                this.lastBombActive = false;
                this.waitingForLastBomb = false;
            } else {
                return; // Still waiting for last bomb to resolve
            }
        }

        if (!anyBombsAvailable && revealPercentage < targetPercentage) {
            console.log("[GameStateManager.checkGameOver] Conditions met. Calling scene.checkGameOver().");
            // GameStateManager defers the actual setting of isGameOver and event emission to GameScene.checkGameOver
            this.scene.checkGameOver();
        }
    }

    // Check the game state for potential recovery from stuck situations
    checkGameState() {
        if (!this.scene || !this.scene.isFullyInitialized || !this.scene.scene.isActive()) {
            // console.log("[GameStateManager.checkGameState] Scene not fully initialized or inactive, skipping check.");
            return;
        }

        const currentTime = Date.now();
        
        // Case 1: Bomb has been active for too long without hitting anything
        if (this.scene.bomb && this.scene.bomb.isLaunched && 
            (currentTime - this.scene.bombState.lastBombFired) > this.scene.bombState.maxIdleTime) {
                
            // Skip failsafe for ricochet bombs which need to bounce around
            if (this.scene.bomb.isRicochet || 
                this.scene.bomb.bombType === this.scene.BOMB_TYPES.RICOCHET ||
                this.scene.bomb.bombType === 'ricochet_bomb') {
                return;
            }
                
            if (this.scene.debugMode) {
                console.warn(`FAILSAFE: Bomb active for ${Math.floor((currentTime - this.scene.bombState.lastBombFired)/1000)}s without action`);
            }
            
            // Force cleanup and reset
            this.forceResetGameState();
            return;
        }
        
        // Check if we can actually create a bomb now
        const canCreateBomb = this.scene.shotsRemaining > 0 && 
                            !this.isLevelComplete && 
                            !this.isGameOver && 
                            !this.scene.scene.isPaused();
                            
        if (!canCreateBomb) {
            // No need to check failsafe if we shouldn't have a bomb right now
            return;
        }
        
        // Case 2: No active bomb for too long but game expects one
        const noBombExists = (!this.scene.bomb || !this.scene.bomb.scene) && 
                            (!this.scene.bombLauncher || !this.scene.bombLauncher.bomb);
                            
        if (noBombExists && canCreateBomb && 
            (currentTime - this.scene.bombState.lastResetTime) > 15000) { // Increased from 10s to 15s
                
            console.warn("FAILSAFE: No active bomb for 15s when one should exist");
            
            // Force a bomb reset
            this.forceResetGameState();
            return;
        }
        
        // Case 3: Pending reset that never executed
        if (this.scene.bombState.pendingReset && 
            (currentTime - this.scene.bombState.pendingReset) > 5000) {
                
            if (this.scene.debugMode) {
                console.warn("FAILSAFE: Pending reset never executed after 5s");
            }
            
            // Force cleanup and reset
            this.forceResetGameState();
            return;
        }
    }
    
    // Force reset the game state to recover from stuck situations
    forceResetGameState() {
        if (!this.scene || !this.scene.isFullyInitialized || !this.scene.scene.isActive()) {
            console.warn("[GameStateManager.forceResetGameState] Scene not fully initialized or inactive, cannot force reset effectively.");
            return;
        }

        console.warn("[GameStateManager.forceResetGameState] Failsafe triggered. Requesting GameScene to check completion/game over.");

        // Instead of directly setting flags and emitting, let GameScene handle the sequence.
        // GameScene.checkLevelCompletion() will call GameScene.checkGameOver() if not complete.
        if (this.scene && typeof this.scene.checkLevelCompletion === 'function') {
            this.scene.checkLevelCompletion();
        } else {
            console.error("[GameStateManager.forceResetGameState] Scene or scene.checkLevelCompletion is not available!");
            // Fallback to a more direct game over if GameScene is broken, though this is unlikely to be graceful.
            // this.isGameOver = true; 
            // this.scene.isGameOver = true;
            // this.scene.gameOverSetBy = "GameStateManager.forceResetGameState_FALLBACK";
            // this.scene.events.emit('gameOver', { percentage: this.scene.revealPercentage, targetPercentage: this.scene.targetPercentage, score: this.scene.score });
        }

        // Ensure GameScene's bomb states are reset to allow new bomb creation if it's not actually game over
        // This should ideally be handled within GameScene's logic paths triggered by checkLevelCompletion/checkGameOver
        // For example, if it's not game over and not level complete, a new bomb should be creatable.
        // if (this.scene.bombState) { this.scene.bombState.active = false; }
        // if (this.scene.bombLauncher && this.scene.bombLauncher.bombState) { this.scene.bombLauncher.bombState.active = false; }
    }

    // Reset the game state for a new level
    resetGameState() {
        console.log("[GameStateManager.resetGameState] Resetting game state.");
        this.isLevelComplete = false;
        this.isGameOver = false;
        this.scene.isLevelComplete = false;
        this.scene.isGameOver = false;
        this.scene.gameOverSetBy = null; // RESET THE TRACKER
        this.lastBombActive = false;
        this.waitingForLastBomb = false;
        // ... other resets like score, revealPercentage, should be handled by GameScene's resetLevel or similar
        // This manager primarily focuses on the isGameOver and isLevelComplete flags.
    }

    // Clean up resources when the scene is shut down
    shutdown() {
        console.log("GameStateManager: shutting down");
        this.lastBombActive = false;
        this.waitingForLastBomb = false;
    }
}

// Export the GameStateManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameStateManager };
} else {
    // If not in Node.js, add to window object
    window.GameStateManager = GameStateManager;
} 