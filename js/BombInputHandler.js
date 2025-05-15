/**
 * BombInputHandler.js
 * Handles input for bomb aiming and launching
 */
class BombInputHandler {
    constructor(scene) {
        // Store reference to the main game scene
        this.scene = scene;
        
        // Input control flags
        this.isAiming = false; // Track if currently aiming
        this.touchIndicator = null; // Reference to touch indicator text
        
        console.log("BombInputHandler initialized");
    }
    
    /**
     * Set up all input handlers for bomb aiming and launching
     */
    setupInputHandlers() {
        try {
            console.log("Setting up input handlers for bomb interaction");
            
            // Clear existing handlers to prevent duplication
            this.scene.input.off('pointerdown');
            this.scene.input.off('pointermove');
            this.scene.input.off('pointerup');
            this.scene.input.off('pointercancel');
            
            // Pointer down event - works for both mouse and touch
            this.scene.input.on('pointerdown', (pointer) => {
                // Only handle if the scene and bomb launcher are available
                if (this.scene && this.scene.bombLauncher) {
                    this.handlePointerDown(pointer);
                }
            });
            
            // Handle pointer movement for aiming
            this.scene.input.on('pointermove', (pointer) => {
                // Only handle if the scene and bomb launcher are available and aiming
                if (this.scene && this.scene.bombLauncher && this.scene.bombLauncher.isAiming) {
                    this.handlePointerMove(pointer);
                }
            });
            
            // Handle pointer up for launching
            this.scene.input.on('pointerup', (pointer) => {
                // Only handle if the scene and bomb launcher are available and aiming
                if (this.scene && this.scene.bombLauncher && this.scene.bombLauncher.isAiming) {
                    this.handlePointerUp(pointer);
                }
            });

            // Add specific handling for touch cancel events (important for mobile)
            this.scene.input.on('pointercancel', () => {
                // Only handle if the scene and bomb launcher are available and aiming
                if (this.scene && this.scene.bombLauncher && this.scene.bombLauncher.isAiming) {
                    this.handlePointerCancel();
                }
            });
            
            console.log("Input handlers setup complete");
            return true;
        } catch (error) {
            console.error("Error in setupInputHandlers:", error);
            return false;
        }
    }
    
    /**
     * Handle pointer down events (start aiming)
     * @param {Phaser.Input.Pointer} pointer - The pointer that triggered the event
     */
    handlePointerDown(pointer) {
        try {
            // Only allow interaction if we have shots remaining and a valid bomb
            if (this.scene.shotsRemaining <= 0 || 
                !this.scene.bombLauncher || 
                !this.scene.bombLauncher.bomb || 
                !this.scene.bombLauncher.bomb.visible) {
                return;
            }
            
            // Immediately log touch events for debugging
            if (this.scene.debugMode) {
                console.log('Pointer down detected:', 
                    pointer.x, pointer.y, 
                    'isMobile:', !this.scene.game.device.os.desktop, 
                    'type:', pointer.type);
            }
            
            // Check if click/touch is near the bomb - use larger detection area on mobile
            const touchRadius = this.scene.game.device.os.desktop ? 80 : 120;
            const distance = Phaser.Math.Distance.Between(
                pointer.x, pointer.y, 
                this.scene.bombLauncher.bomb.x, this.scene.bombLauncher.bomb.y
            );
            
            if (distance < touchRadius) {
                // Provide immediate visual feedback
                this.scene.bombLauncher.bomb.setTint(0xffff00);
                
                // Set aiming state in both handler and scene - NOW BOMBLAUNCHER HANDLES THIS
                // this.isAiming = true;
                // this.scene.isAiming = true;
                this.scene.bombLauncher.setAiming(true);
                
                // Immediately start drawing the trajectory
                if (pointer && pointer.x !== undefined && pointer.y !== undefined) {
                    this.drawTrajectoryFromPointer(pointer);
                }
                
                // Mobile touch feedback - pulse the bomb when touched
                this.scene.tweens.add({
                    targets: this.scene.bombLauncher.bomb,
                    scale: { from: 1, to: 1.2 },
                    duration: 100,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                
                // Clear any existing touch indicator
                if (this.touchIndicator) this.touchIndicator.destroy();
                
                // Add mobile-specific instructions
                if (!this.scene.game.device.os.desktop) {
                    this.scene.addMobilePulseHint();
                }
            }
        } catch (error) {
            console.error("Error in handlePointerDown:", error);
        }
    }
    
    /**
     * Handle pointer move events (update aim)
     * @param {Phaser.Input.Pointer} pointer - The pointer that triggered the event
     */
    handlePointerMove(pointer) {
        try {
            // if (!this.isAiming || !this.scene.bombLauncher || !this.scene.bombLauncher.bomb) return;
            // Condition now checked in setupInputHandlers before calling this method
            
            // Validate pointer before passing to BombLauncher
            if (pointer && pointer.x !== undefined && pointer.y !== undefined) {
                this.drawTrajectoryFromPointer(pointer);
            }
        } catch (error) {
            console.error("Error in handlePointerMove:", error);
        }
    }
    
    /**
     * Handle pointer up events (fire bomb)
     * @param {Phaser.Input.Pointer} pointer - The pointer that triggered the event
     */
    handlePointerUp(pointer) {
        try {
            // if (!this.isAiming || !this.scene.bombLauncher) return;
            // Condition now checked in setupInputHandlers before calling this method
            
            // Clear any indicators
            if (this.touchIndicator) {
                this.touchIndicator.destroy();
                this.touchIndicator = null;
            }
            
            // Reset bomb tint
            if (this.scene.bombLauncher.bomb) {
                this.scene.bombLauncher.bomb.clearTint();
            }
            
            // Validate pointer exists before accessing it
            if (!pointer || pointer.x === undefined || pointer.y === undefined) {
                console.warn("Invalid pointer in pointerup event");
                this.resetAimState();
                return;
            }
            
            // Fire the bomb
            this.fireBomb(pointer);
            // this.isAiming = false; // Handled by bombLauncher.launchBomb -> setAiming(false)
            // this.scene.isAiming = false; // Handled by bombLauncher.launchBomb -> setAiming(false)
        } catch (error) {
            console.error("Error in handlePointerUp:", error);
            this.resetAimState();
        }
    }
    
    /**
     * Handle pointer cancel events (abort aiming)
     */
    handlePointerCancel() {
        // if (this.isAiming && this.scene.bombLauncher && this.scene.bombLauncher.bomb) {
        // Condition now checked in setupInputHandlers before calling this method
            // Reset the bomb position if touch is cancelled
            this.resetAimState(); // This will call bombLauncher.setAiming(false)
            
            // Create a new bomb at the slingshot position
            this.scene.bombLauncher.createBomb(this.scene.currentBombType || 'bomb');
            
            // Clear any indicators
            if (this.touchIndicator) {
                this.touchIndicator.destroy();
                this.touchIndicator = null;
            }
            
            // Decrement bomb count and update UI
            this.scene.decrementBombCount(this.scene.currentBombType);

            // this.isAiming = false; // Handled by bombLauncher.launchBomb -> setAiming(false)
            // this.scene.isAiming = false; // Handled by bombLauncher.launchBomb -> setAiming(false)
            
            // Call resetBomb to prepare the next shot - REMOVED, should be handled by game flow after bomb finishes
            // this.scene.resetBomb(); 
    }
    
    /**
     * Draw trajectory based on pointer position
     * @param {Phaser.Input.Pointer} pointer - The pointer to use for trajectory calculation
     * @returns {boolean} Success status
     */
    drawTrajectoryFromPointer(pointer) {
        if (!pointer || pointer.x === undefined || pointer.y === undefined) {
            console.warn("Invalid pointer in drawTrajectoryFromPointer");
            return false;
        }
        
        try {
            // Use BombLauncher if available
            if (this.scene.bombLauncher) {
                this.scene.bombLauncher.drawTrajectoryFromPointer(pointer);
                return true;
            }
            
            console.warn("BombLauncher not available");
            return false;
        } catch (error) {
            console.error("Error in drawTrajectoryFromPointer:", error);
            return false;
        }
    }
    
    /**
     * Fire the bomb based on pointer position
     * @param {Phaser.Input.Pointer} pointer - The pointer to use for firing
     * @returns {boolean} Success status
     */
    fireBomb(pointer) {
        if (!this.scene.bombLauncher || !this.scene.bombLauncher.bomb || this.scene.bombLauncher.isBombActive()) {
            console.log("BombInputHandler: Fire command ignored, no bomb ready or bomb already active.");
            this.resetAimState(); // Reset aiming visuals
            return;
        }

        // Prevent firing if no shots are remaining
        if (this.scene.shotsRemaining <= 0) {
            console.log("No shots remaining!");
            if (this.scene.audioManager && this.scene.audioManager.playSound) {
                this.scene.audioManager.playSound('error', { volume: 0.4 });
            }
            this.resetAimState();
            return;
        }
        
        // Prevent firing if the selected bomb type has no shots left
        const currentBombType = this.scene.currentBombType;
        if (this.scene.bombsRemaining && this.scene.bombsRemaining[currentBombType] <= 0) {
            console.log(`No ${currentBombType} bombs remaining!`);
            if (this.scene.audioManager && this.scene.audioManager.playSound) {
                this.scene.audioManager.playSound('error', { volume: 0.4 });
            }
            this.resetAimState();
            return;
        }

        // Use BombLauncher to launch the bomb
        const launched = this.scene.bombLauncher.launchBomb(pointer);

        if (launched) {
            if (this.scene.debugMode) {
                console.log("BombInputHandler: Bomb launched via BombLauncher.");
            }
            // Decrement general shot count
                    this.scene.shotsRemaining--;
                    this.scene.events.emit('updateShots', this.scene.shotsRemaining);
                    
            // Decrement count for the specific bomb type
            if (this.scene.decrementBombCount && typeof this.scene.decrementBombCount === 'function') {
                    this.scene.decrementBombCount(currentBombType);
                        } else {
                console.warn("GameScene.decrementBombCount is not available.");
            }
            
            // Play launch sound
            if (this.scene.audioManager && this.scene.audioManager.playSound) {
                this.scene.audioManager.playSound('launch', { volume: 0.5 });
                }

        } else {
            if (this.scene.debugMode) {
                console.log("BombInputHandler: BombLauncher.launchBomb call did not result in a launch.");
            }
        }

        // Reset aiming state regardless of launch success
        this.resetAimState();
    }
    
    /**
     * Reset the aiming state
     */
    resetAimState() {
        try {
            if (this.scene.bombLauncher) {
                // Reset aiming state via BombLauncher
                this.scene.bombLauncher.setAiming(false);

                // Reset bomb tint if bomb exists
                if (this.scene.bombLauncher.bomb) {
                    this.scene.bombLauncher.bomb.clearTint();
                }
                
                // Clear any existing trajectory visuals (handled by setAiming(false) in BombLauncher)
                // this.scene.clearTrajectory();
                
                // Reset the bomb position if it was being dragged
                if (this.scene.bombLauncher.bomb && 
                    this.scene.bombLauncher.bomb.body && 
                    this.scene.bombLauncher.bomb.body.isStatic) {
                    this.scene.bombLauncher.bomb.setPosition(
                        this.scene.bombLauncher.BOW_X, 
                        this.scene.bombLauncher.BOW_Y - 20
                    );
                }
            }
            
            // Clear local aiming flag
            this.isAiming = false;
            // Ensure scene's aiming flag is also reset, though bombLauncher should be the source of truth
            if (this.scene) {
                this.scene.isAiming = false; 
            }

        } catch (error) {
            console.error("Error in resetAimState:", error);
        }
    }
    
    /**
     * Clean up all resources
     */
    cleanup() {
        // Clean up touch indicator if it exists
        if (this.touchIndicator) {
            this.touchIndicator.destroy();
            this.touchIndicator = null;
        }
        
        // Remove all input event listeners
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerup');
        this.scene.input.off('pointercancel');
        
        console.log("BombInputHandler cleaned up");
    }
} 