/**
 * BombLauncher.js
 * Handles all bomb creation, positioning, and launching in the game
 */
class BombLauncher {
    /**
     * Initialize the BombLauncher
     * @param {Phaser.Scene} scene - The game scene this launcher belongs to
     */
    constructor(scene) {
        this.scene = scene;
        this.bomb = null;  // Current active bomb
        this.elasticLine = null; // Visual slingshot line (singular)
        // this.trajectoryGraphics = null; // Graphics object for trajectory - REPLACED WITH GROUP
        this.trajectoryDotGroup = null; // Group to hold trajectory dot sprites
        this.trajectoryPoints = [];  // Points for trajectory prediction
        this.isAiming = false; // Tracks if the user is currently aiming
        this.isLaunching = false; // Flag to indicate a launch is in progress
        this.aimingBombRotationAngle = 0; // For visual spin during aiming
        
        // Bow and aiming related properties from GameScene
        this.BOW_X = 280; 
        this.BOW_Y = 540; 
        this.GRIP_GAP = 20; // Increased from 10 to 20
        this.MAX_DRAG_DISTANCE = 200;
        this.SHOT_POWER = 0.0013; // Reduced to 1% of original value (was 0.13)
        // this.bow = null; // This will hold the bow image - REMOVED
        this.upperBowPart = null;
        this.lowerBowPart = null;
        this.bowPartHeight = 30; // Placeholder: approximate height of one bow part image (adjust!)
        this.bowRotationFactor = 0.001; // How much bow parts rotate per unit of drag distance
        
        // Bomb state tracking
        this.bombState = {
            active: false,
            lastBombFired: 0,
            lastResetTime: 0,
            pendingReset: null,
            bombCreationPending: false, // Flag to prevent multiple bomb creations
            creationTimeoutId: null
        };
        
        // Constants from the scene are now defined above
        // this.BOW_X = this.scene.BOW_X || 300;
        // this.BOW_Y = this.scene.BOW_Y || 540;
        // this.MAX_DRAG_DISTANCE = this.scene.MAX_DRAG_DISTANCE || 200;
        // this.SHOT_POWER = this.scene.SHOT_POWER || 0.13;
        
        this.debugMode = this.scene.debugMode || false;
        
        // Create a debug text display
        if (this.debugMode) {
            this.debugText = this.scene.add.text(10, 100, 'BombLauncher Debug', { 
                font: '16px Arial', 
                fill: '#00ff00' 
            }).setDepth(1000);
        }

        // Create the bow visual
        this.createBow();
        // Initialize trajectory graphics - REMOVED
        // this.trajectoryGraphics = this.scene.add.graphics();
        // this.trajectoryGraphics.setDepth(15); // Ensure it's visible
        // this.trajectoryGraphics.setVisible(true); // Explicitly set visible

        // Initialize trajectory dot group - REVISED to not use texture key
        // this.trajectoryDotGroup = this.scene.add.group({
        //     key: 'particle', // Assuming 'particle' is a loaded texture for dots
        //     frameQuantity: 70, // Create 70 sprites
        //     visible: false,
        //     active: false,
        //     setXY: { x: -100, y: -100 }, // Position them off-screen initially
        //     setDepth: { value: 15 }
        // });
        this.trajectoryDotGroup = this.scene.add.group(); // Create an empty group
        for (let i = 0; i < 70; i++) {
            // Create a small circle graphic instead of a sprite
            const dot = this.scene.add.circle(-100, -100, 3, 0xffffff); // Default white, radius 3
            dot.setDepth(this.scene.UI_DEPTH + 1000); // Ensure high depth for debugging
            dot.setVisible(false);
            dot.setActive(false);
            this.trajectoryDotGroup.add(dot); // Add it to the group
            this.scene.add.existing(dot); // Explicitly add the dot to the scene's display list
        }
        // Explicitly add the group itself to the scene as well
        this.scene.add.existing(this.trajectoryDotGroup);

        if (this.debugMode) {
            console.log(`[BombLauncher Constructor] trajectoryDotGroup initialized. Exists: ${!!this.trajectoryDotGroup}, Active: ${this.trajectoryDotGroup ? this.trajectoryDotGroup.active : 'N/A'}, Length: ${this.trajectoryDotGroup ? this.trajectoryDotGroup.getLength() : 'N/A'}`);
        }
    }
    
    /**
     * Gets the currently active launched bomb.
     * Returns null if no bomb is launched or if the bomb is static at the slingshot.
     * @returns {Phaser.Physics.Matter.Image | null} The active launched bomb or null.
     */
    getActiveLaunchedBomb() {
        if (this.bomb && this.bomb.scene && this.bomb.isLaunched && !this.bomb.isAtSlingshot && this.bombState.active) {
            // Further check: ensure it's a dynamic body if it's supposed to be launched
            // or a sprite if it's a fallback (though sprite fallbacks shouldn't really be 'launched' in a physics sense)
            if (this.bomb.body && !this.bomb.body.isStatic) {
                 return this.bomb;
            } else if (!this.bomb.body && this.bomb.isLaunched) { // if it's a sprite fallback and marked as launched
                return this.bomb;
            }
        }
        return null;
    }

    /**
     * Clean up existing visual elements
     */
    clearVisuals() {
        // Clean up elastic line
        if (this.elasticLine && this.elasticLine.scene) {
            this.elasticLine.destroy();
            this.elasticLine = null;
        }
        
        // Clean up trajectory graphics - REMOVED, createTrajectoryDots handles its own clearing
        // if (this.trajectoryGraphics && this.trajectoryGraphics.scene) {
        //     this.trajectoryGraphics.clear();
        // }
        // Instead, hide the trajectory dots
        if (this.trajectoryDotGroup) {
            this.trajectoryDotGroup.setVisible(false);
        }
        this.trajectoryPoints = []; // Still clear the points array
    }

    /**
     * Create a new bomb at the slingshot position
     * @param {string} bombType - The type/texture of bomb to create (defaults to 'bomb')
     * @return {Phaser.Physics.Matter.Image} The created bomb object
     */
    createBomb(bombType = 'bomb') {
        try {
            // Ensure aiming state is reset when creating a new bomb
            this.setAiming(false);
            this.aimingBombRotationAngle = 0; // Reset visual rotation

            // Check if bomb creation is already pending
            if (this.bombState.bombCreationPending) {
                console.log("[BombLauncher.createBomb] Bomb creation already pending, skipping request");
                
                // Set a timeout to clear the pending flag in case it gets stuck
                if (!this.bombState.creationTimeoutId) {
                    this.bombState.creationTimeoutId = setTimeout(() => {
                        console.log("[BombLauncher.createBomb] Clearing stuck pending flag after timeout");
                        this.bombState.bombCreationPending = false;
                        this.bombState.creationTimeoutId = null;
                    }, 2000); // 2 second timeout
                }
                return null;
            }
            
            console.log(`[BombLauncher.createBomb] Creating bomb of type: ${bombType}`);
            
            // Set the pending flag
            this.bombState.bombCreationPending = true;
            
            // Clean up existing bomb and visuals
            if (this.isAiming) {
                console.log("[BombLauncher.createBomb] Skipping cleanupExistingBomb because currently aiming.");
            } else {
                this.cleanupExistingBomb();
            }
            this.clearVisuals();
            
            // Make sure we're using a valid bomb type
            const validBombType = this.validateBombType(bombType);
            
            // Create inactive bomb at slingshot position
            const x = this.BOW_X || 300;
            const y = (this.BOW_Y || 540) - 20;
            
            // Create the bomb with necessary properties
            try {
                // Create the bomb as a matter physics object
                this.bomb = this.scene.matter.add.image(x, y, validBombType);
                this.bomb.angle = 0; // Ensure initial angle is 0
                
                // Configure bomb physics properties
                this.bomb.setCircle(30);
                this.bomb.setStatic(true);
                this.bomb.setVisible(true);
                this.bomb.setDepth(12); // Above slingshot and elastic line
                this.bomb.setDisplaySize(60, 60);
                
                // Add bomb type for reference
                this.bomb.bombType = validBombType;
                this.bomb.isStatic = true; // Mark as static since it's not a physics object
                this.bomb.angle = 0; // Ensure initial angle is 0 for sprite fallback too
                
                // Reset bomb state
                this.bombState.active = false;
                this.bombState.lastResetTime = Date.now();
                
                // Create initial elastic line (now bowstring)
                this.updateBowstring();
                
                console.log(`[BombLauncher.createBomb] Successfully created bomb of type ${validBombType} at ${x},${y}`);
                
                // Update the scene's bomb reference for backwards compatibility
                this.scene.bomb = this.bomb;
                
                // Ensure bomb is visible with a second check
                if (this.bomb) {
                    this.bomb.setVisible(true);
                    this.bomb.setAlpha(1);
                }
                
                // Clear the pending flag
                this.bombState.bombCreationPending = false;
                if (this.bombState.creationTimeoutId) {
                    clearTimeout(this.bombState.creationTimeoutId);
                    this.bombState.creationTimeoutId = null;
                }
                
                // Create elastic line visual (now bowstring)
                this.updateBowstring();
                
                return this.bomb;
            } catch (err) {
                console.error(`Error creating bomb: ${err.message}`);
                
                // Fallback for critical errors - create a simple sprite instead of matter object
                console.log("Falling back to sprite creation");
                
                // Try again with a simple sprite if matter physics failed
                this.bomb = this.scene.add.sprite(x, y, validBombType);
                this.bomb.setVisible(true);
                this.bomb.setDepth(12);
                this.bomb.setDisplaySize(60, 60);
                this.bomb.bombType = validBombType;
                this.bomb.isStatic = true; // Mark as static since it's not a physics object
                this.bomb.angle = 0; // Ensure initial angle is 0 for sprite fallback too
                
                // Update the scene's bomb reference
                this.scene.bomb = this.bomb;
                
                // Create elastic line visual (now bowstring)
                this.updateBowstring();
                
                // Clear the pending flag
                this.bombState.bombCreationPending = false;
                
                return this.bomb;
            }
        } catch (error) {
            console.error(`Critical error in createBomb: ${error.message}`);
            // Clear the pending flag in case of error
            this.bombState.bombCreationPending = false;
            return null;
        }
    }
    
    /**
     * Validate bomb type and ensure we're using a valid texture key
     * @param {string} bombType - The requested bomb type
     * @return {string} - A valid bomb texture key
     */
    validateBombType(bombType) {
        // Default to blast bomb if no type specified
        if (!bombType) {
            return 'blast_bomb';
        }
        
        // Get BOMB_TYPES from scene if available
        const BOMB_TYPES = this.scene.BOMB_TYPES || {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',
            RICOCHET: 'ricochet_bomb',
            SHRAPNEL: 'shrapnel_bomb',
            MELTER: 'melter_bomb'
        };
        
        // Check if this is a short name (e.g. 'blast' vs 'blast_bomb')
        const shortNames = {
            'blast': BOMB_TYPES.BLAST || 'blast_bomb',
            'piercer': BOMB_TYPES.PIERCER || 'piercer_bomb',
            'cluster': BOMB_TYPES.CLUSTER || 'cluster_bomb',
            'sticky': BOMB_TYPES.STICKY || 'sticky_bomb',
            'shatterer': BOMB_TYPES.SHATTERER || 'shatterer_bomb',
            'driller': BOMB_TYPES.DRILLER || 'driller_bomb',
            'ricochet': BOMB_TYPES.RICOCHET || 'ricochet_bomb',
            'shrapnel': BOMB_TYPES.SHRAPNEL || 'shrapnel_bomb',
            'melter': BOMB_TYPES.MELTER || 'melter_bomb'
        };
        
        // If we have a short name, use the full name
        if (shortNames[bombType]) {
            return shortNames[bombType];
        }
        
        // Check if the texture actually exists in the scene
        if (this.scene.textures.exists(bombType)) {
            return bombType;
        }
        
        // Safety fallback - use blast_bomb if the requested type doesn't exist
        console.warn(`Bomb type '${bombType}' not found, falling back to blast_bomb`);
        return 'blast_bomb';
    }
    
    /**
     * Clean up any existing bomb object
     */
    cleanupExistingBomb() {
        // Don't cleanup if we're in the middle of aiming, that would cause the bomb to disappear
        if (this.isAiming) {
            console.log("[BombLauncher.cleanupExistingBomb] Skipping cleanup during aiming to prevent bomb disappearance");
            return;
        }
        
        if (this.bomb) {
            if (this.debugMode) {
                console.log("[BombLauncher.cleanupExistingBomb] Cleaning up existing bomb");
            }
            
            // Clean up any countdown timers for ricochet bombs
            if (this.bomb.countdownText && this.bomb.countdownText.scene) {
                this.bomb.countdownText.destroy();
                this.bomb.countdownText = null;
            }
            if (this.bomb.countdown) {
                this.bomb.countdown.remove();
                this.bomb.countdown = null;
            }
            
            if (this.bomb.scene) {
                this.bomb.destroy();
            }
            this.bomb = null;
        }
    }
    
    /**
     * Create the elastic slingshot line
     */
    updateBowstring(bombX, bombY) {
        if (!this.upperBowPart || !this.upperBowPart.scene || !this.lowerBowPart || !this.lowerBowPart.scene) return; // Don't draw if bow parts don't exist or scene is invalid

        if (!this.elasticLine) {
            this.elasticLine = this.scene.add.graphics();
            this.elasticLine.setDepth(11); // Above bow (bow parts at 10)
        }
        this.elasticLine.clear();
        this.elasticLine.lineStyle(2, 0xFFFFFF, 0.8); // White, slightly transparent
        this.elasticLine.beginPath();

        // Get the world coordinates of the bow tips
        const upperTip = this.upperBowPart.getTopCenter(); 
        const lowerTip = this.lowerBowPart.getBottomCenter();

        if (this.isAiming && bombX !== undefined && bombY !== undefined) {
            // Draw pulled bowstring
            this.elasticLine.moveTo(upperTip.x, upperTip.y); // Top tip of upper bow part
            this.elasticLine.lineTo(bombX, bombY); // Bomb position
            this.elasticLine.lineTo(lowerTip.x, lowerTip.y); // Bottom tip of lower bow part
        } else {
            // Draw default bowstring (a straight line when not pulled)
            this.elasticLine.moveTo(upperTip.x, upperTip.y); // Top tip of upper bow part
            this.elasticLine.lineTo(lowerTip.x, lowerTip.y); // Bottom tip of lower bow part
        }
        this.elasticLine.stroke();
    }

    /**
     * Draw trajectory prediction dots
     */
    createTrajectoryDots(startX, startY, velocityX, velocityY, visualLineLength) {
        if (this.trajectoryDotGroup) {
            this.trajectoryDotGroup.setVisible(true);
        }
        
        try {
            // Calculate trajectory points using the refined method
            this.calculateTrajectoryPoints(startX, startY, velocityX, velocityY, visualLineLength);
            
            // Draw dotted line connecting trajectory points
            if (this.trajectoryPoints.length >= 2) {
                // Ensure the dot group exists
                if (!this.trajectoryDotGroup) {
                     if (!this.scene || !this.scene.add) {
                         return; // Cannot re-initialize without a valid scene
                     }
                     try {
                         this.trajectoryDotGroup = this.scene.add.group(); // Create an empty group
                         for (let i = 0; i < 70; i++) {
                             // Create a small circle graphic instead of a sprite
                             const dot = this.scene.add.circle(-100, -100, 3, 0xffffff); // Default white, radius 3
                             dot.setDepth(this.scene.UI_DEPTH + 1000); // Ensure high depth for debugging
                             dot.setVisible(false);
                             dot.setActive(false);
                             this.trajectoryDotGroup.add(dot); // Add it to the group
                             this.scene.add.existing(dot); // Also add to scene display list during re-init
                         }
                         // Explicitly add the re-initialized group itself to the scene
                         this.scene.add.existing(this.trajectoryDotGroup);
                     } catch (reinitError) {
                         this.trajectoryDotGroup = null; // Ensure it's null if creation failed
                     }
                    if (!this.trajectoryDotGroup) {
                        return; 
                    }
                }

                // Get all children from the group
                const dots = this.trajectoryDotGroup.getChildren();

                // Hide all dots first
                dots.forEach(dot => dot.setVisible(false).setActive(false));

                let dotsDrawn = 0;
                const skipFactor = Math.ceil(this.trajectoryPoints.length / 60); // MOVED skipFactor here
                for (let i = 0; i < this.trajectoryPoints.length && dotsDrawn < dots.length; i += skipFactor) {
                    const dot = dots[dotsDrawn]; 
                    const point = this.trajectoryPoints[i];

                    if (dot && dot.scene) { 
                        dot.setPosition(point.x, point.y);
                        dot.setAlpha(1.0);
                        dot.setRadius(5);
                        dot.setFillStyle(0xFF00FF, 1.0); // Bright magenta
                        dot.setActive(true);
                        dot.setVisible(true);
                        dotsDrawn++;
                    }
                }
            }
        } catch (error) {
            this.updateDebugText(`Trajectory Error: ${error.message}`);
        }
    }
    
    /**
     * Calculate points for trajectory prediction using a simplified straight line.
     * @param {number} startX - The starting X position of the bomb.
     * @param {number} startY - The starting Y position of the bomb.
     * @param {number} velocityX - The initial X velocity component.
     * @param {number} velocityY - The initial Y velocity component.
     * @return {Array<object>} An array of {x, y} points for the trajectory.
     */
    calculateTrajectoryPoints(startX, startY, velocityX, velocityY, visualLineLength) {
        this.trajectoryPoints = [];
        const numPoints = 30; // Number of dots for the line (can be adjusted)
        // visualLineLength now determines how far the straight prediction line extends.
        // If visualLineLength is small, the line will be short.
        // Ensure visualLineLength is passed from createTrajectoryDots.

        if (velocityX === 0 && velocityY === 0) { // No velocity, no line to draw beyond the start point
            this.trajectoryPoints.push({ x: startX, y: startY });
            return this.trajectoryPoints;
        }

        const angle = Math.atan2(velocityY, velocityX);

        for (let i = 0; i < numPoints; i++) {
            // Distribute points along the visualLineLength
            const currentSegmentDistance = (i / (numPoints -1)) * visualLineLength; // numPoints-1 for segments
            const x = startX + currentSegmentDistance * Math.cos(angle);
            const y = startY + currentSegmentDistance * Math.sin(angle);
            this.trajectoryPoints.push({ x: x, y: y });
        }
        return this.trajectoryPoints;
    }
    
    /**
     * Update the debug text display
     */
    updateDebugText(message) {
        if (this.debugMode && this.debugText) {
            this.debugText.setText(message);
        }
    }

    /**
     * Update bomb position during dragging
     * @param {Phaser.Input.Pointer} pointer - The pointer (mouse/touch) position
     */
    updateBombPosition(pointer) {
        if (!pointer) return;
        
        try {
            // Ensure pointer has valid x and y coordinates
            if (pointer.x === undefined || pointer.y === undefined) {
                console.warn("[BombLauncher.updateBombPosition] Invalid pointer coordinates");
                return;
            }
            
            // Check if we have a valid bomb object
            if (!this.bomb || !this.bomb.scene) {
                console.warn("[BombLauncher.updateBombPosition] Bomb is missing, checking creation pending state");
                
                // Only attempt to recreate if not already in process
                if (!this.bombState.bombCreationPending) {
                    console.log("[BombLauncher.updateBombPosition] Attempting to recreate bomb");
                    const bombType = this.scene.currentBombType || 'blast_bomb';
                    this.createBomb(bombType);
                }
                return; // Exit regardless - either no bomb or creation in progress
            }
            
            // Use the drawTrajectoryFromPointer method for consistent handling
            this.drawTrajectoryFromPointer(pointer);
        } catch (error) {
            console.error("[BombLauncher.updateBombPosition] Error:", error);
            // On error, don't let the bomb disappear - try to recover
            if (!this.bomb && !this.bombState.bombCreationPending) {
                this.bombState.bombCreationPending = false; // Reset flag if it's stuck
                const bombType = this.scene.currentBombType || 'blast_bomb';
                this.createBomb(bombType);
            }
        }
    }

    /**
     * Calculate the force to apply based on pointer position
     * @param {Phaser.Input.Pointer} pointer - The pointer (mouse/touch) position
     * @return {Object} Object containing forceX and forceY values
     */
    calculateForce(pointer) {
        // Calculate direction from slingshot
        const dx = this.BOW_X - pointer.x;
        const dy = this.BOW_Y - pointer.y; // Adjusted to match trajectory calculation
        
        // Scale by shot power 
        const forceX = dx * this.SHOT_POWER; // Removed extra 0.01 scaling for now
        const forceY = dy * this.SHOT_POWER; // Removed extra 0.01 scaling for now
        
        return { forceX, forceY };
    }

    /**
     * Create visual trajectory from pointer for preview
     * @param {Phaser.Input.Pointer} pointer - The pointer position
     */
    drawTrajectoryFromPointer(pointer) {
        try {
            if (!pointer || pointer.x === undefined || pointer.y === undefined) {
                return;
            }

            // ADDED: Safety check to ensure bomb exists and is visible
            if (!this.bomb || !this.bomb.scene) {
                console.log("[BombLauncher.drawTrajectoryFromPointer] Bomb is missing during aiming, attempting to recreate");
                const bombType = this.scene.currentBombType || 'blast_bomb';
                this.createBomb(bombType);
                if (!this.bomb) return; // Still no bomb? Exit.
            }
            
            // Calculate angle and distance from slingshot
            const dx = this.BOW_X - pointer.x;
            const dy = this.BOW_Y - pointer.y; // Adjusted to use BOW_Y directly, assuming it's the visual center of pull
            
            // Actual distance of the mouse drag from the bow's central Y point
            const actualDragDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Clamp the actual drag distance for physics/rotation calculations to MAX_DRAG_DISTANCE
            const clampedActualDragDistance = Math.min(this.MAX_DRAG_DISTANCE, actualDragDistance);
            
            // Calculate the exaggerated visual pull distance
            const visualPullFactor = 1.4; // Changed from 1.2 to 1.4
            const effectiveVisualPullDistance = clampedActualDragDistance * visualPullFactor;
            
            // Calculate angle of pull (remains the same)
            const angle = Math.atan2(dy, dx);
            
            // Calculate bomb position based on the exaggerated visual pull distance
            const bombX = this.BOW_X - effectiveVisualPullDistance * Math.cos(angle);
            const bombY = this.BOW_Y - effectiveVisualPullDistance * Math.sin(angle);
            
            // Update bomb position if it exists - MORE CAREFUL VALIDATION
            if (this.bomb && this.bomb.scene) {
                try {
                    this.bomb.setPosition(bombX, bombY);
                    // Add visual spin during aiming
                    this.aimingBombRotationAngle += 5; // Adjust speed as needed
                    this.bomb.angle = this.aimingBombRotationAngle;
                    
                    // ADDED: Ensure bomb remains visible
                    if (!this.bomb.visible) {
                        console.log("[BombLauncher.drawTrajectoryFromPointer] Bomb was invisible during aiming, making visible");
                        this.bomb.setVisible(true);
                    }
                } catch (positionError) {
                    console.error("[BombLauncher.drawTrajectoryFromPointer] Error updating bomb position:", positionError);
                    // Don't let positioning errors break the whole aiming process
                }
            } else {
                console.warn("[BombLauncher.drawTrajectoryFromPointer] Bomb disappeared during position update");
                return; // Exit early, no point continuing without a bomb
            }
            
            // --- Bow Part Rotation ---
            if (this.upperBowPart && this.lowerBowPart && this.upperBowPart.scene && this.lowerBowPart.scene) {
                const pullRatio = Math.min(1, clampedActualDragDistance / this.MAX_DRAG_DISTANCE); 
                const maxRotationDegrees = 25; 
                
                const absoluteRotationAmount = maxRotationDegrees * pullRatio;

                this.upperBowPart.angle = -absoluteRotationAmount; // Always CCW
                this.lowerBowPart.angle = absoluteRotationAmount;  // Always CW
            }
            // --- End Bow Part Rotation ---

            // Update elastic line (bowstring)
            this.updateBowstring(bombX, bombY);
            
            // Calculate velocity for trajectory based on the actual shot power
            const effectiveForceX = dx * this.SHOT_POWER;
            const effectiveForceY = dy * this.SHOT_POWER;
            
            // Create trajectory dots
            const visualLineLength = clampedActualDragDistance * 3; // Scale actual drag distance for visual length
            this.createTrajectoryDots(bombX, bombY, effectiveForceX, effectiveForceY, visualLineLength);
            
            if (this.debugMode) {
                this.updateDebugText(`Drawing at ${bombX.toFixed(2)},${bombY.toFixed(2)}`);
            }
        } catch (error) {
            console.error("Error in drawTrajectoryFromPointer:", error);
            this.updateDebugText(`Error: ${error.message}`);
        }
    }

    /**
     * Launch the bomb with the given pointer
     * @param {Phaser.Input.Pointer} pointer - The pointer used for launching
     * @returns {boolean} True if the bomb was launched successfully
     */
    launchBomb(pointer) {
        if (!this.bomb || this.isBombActive() || !pointer || this.isLaunching) {
            if (this.isLaunching) console.log("BombLauncher: Launch skipped, already launching.");
            return false;
        }
        this.isLaunching = true;
        // console.log(`BombLauncher:launchBomb called. isLaunching = true. Bomb type for launch: ${this.bomb.bombType || this.bomb.texture.key}`);
        
        // Explicitly get BOMB_TYPES from the scene context
        const BOMB_TYPES = this.scene.BOMB_TYPES || {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',
            RICOCHET: 'ricochet_bomb',
            SHRAPNEL: 'shrapnel_bomb',
            MELTER: 'melter_bomb'
        };

        
        try {
            // Ensure pointer has valid x and y coordinates
            if (pointer.x === undefined || pointer.y === undefined) {
                console.warn("Invalid pointer coordinates in launchBomb");
                return false;
            }
            
            // Calculate angle and distance from slingshot
            const dx = this.BOW_X - pointer.x;
            const dy = this.BOW_Y - pointer.y;
            
            // Minimum drag distance required to fire (prevents accidental taps)
            const minDragDistance = 20;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDragDistance) {
                // Too small a drag, reset the bomb position
                this.createBomb(this.bomb.texture.key);
                this.setAiming(false); // Reset aiming state
                return false;
            }
            
            // Calculate force based on drag - use calculateForce for consistency
            const { forceX, forceY } = this.calculateForce(pointer);
            
            if (this.debugMode) {
                console.log('Launching bomb with force:', forceX, forceY, 'distance:', distance);
                this.updateDebugText(`Launching with force ${forceX},${forceY}`);
            }
            
            // Clean up all visuals
            this.clearVisuals();

            // Store current position and type
            const bombX = this.bomb.x;
            const bombY = this.bomb.y;
            const bombType = this.bomb.bombType || this.validateBombType(this.bomb.texture.key);

            // Store any existing countdownText for transfer to the dynamic bomb
            let countdownTextTransfer = null;
            if (this.bomb.countdownText) {
                countdownTextTransfer = this.bomb.countdownText;
                this.bomb.countdownText = null; // Detach from old bomb
            }
            let countdownEventTransfer = null;
            if (this.bomb.countdown) {
                countdownEventTransfer = this.bomb.countdown;
                this.bomb.countdown = null; // Detach from old bomb
            }
            const bombId = this.bomb.bombId;

            // Aggressively clear the old static bomb and its references
            if (this.bomb && this.bomb.scene) {
                this.bomb.destroy();
            }
            this.bomb = null; 
            if (this.scene.bomb) { // Check if scene.bomb was pointing to the same static bomb
                 // Only nullify scene.bomb if it was indeed the static bomb launcher is tracking
                 // This check is a bit indirect, ideally cleanupExistingBomb would handle scene.bomb too if needed
                 // For now, assume if launcher had a bomb, scene.bomb should also be cleared if it was that bomb.
                 // This is safer than blanket nulling scene.bomb if it might be a different, active bomb.
                 // However, at this stage of launch, scene.bomb SHOULD be the static one.
                this.scene.bomb = null; 
            }
            
            // Set bomb properties based on type - match original settings
            let bombProperties = {
                restitution: 0.9,
                friction: 0.01,
                density: 0.0003,
                frictionAir: 0.0 // Set to 0 for zero-gravity, no air resistance test
            };
    
            switch(bombType) {
                case BOMB_TYPES.PIERCER:
                    bombProperties.friction = 0.002;
                    // bombProperties.frictionAir = 0.0008; // Keep at 0 for test
                    bombProperties.density = 0.0005;
                    break;
                case BOMB_TYPES.CLUSTER:
                    bombProperties.density = 0.0002;
                    // bombProperties.frictionAir = 0.001; // Keep at 0 for test
                    break;
                case BOMB_TYPES.STICKY:
                    bombProperties.density = 0.0003;
                    // bombProperties.frictionAir = 0.001; // Keep at 0 for test
                    break;
                case BOMB_TYPES.SHATTERER:
                    bombProperties.density = 0.0004;
                    // bombProperties.frictionAir = 0.0009; // Keep at 0 for test
                    break;
                case BOMB_TYPES.DRILLER:
                    bombProperties.density = 0.0004;
                    // bombProperties.frictionAir = 0.0008; // Keep at 0 for test
                    break;
                case BOMB_TYPES.RICOCHET:
                    bombProperties.restitution = 1.0;
                    bombProperties.friction = 0.001;
                    // bombProperties.frictionAir = 0.0005; // Keep at 0 for test
                    bombProperties.density = 0.0003;
                    break;
                case BOMB_TYPES.MELTER:
                    // Set specific properties for Melter bomb if any, otherwise it uses defaults.
                    // Example: bombProperties.density = 0.0003;
                    // The previous erroneous handler calls are removed.
                    break;
                default:
                    // Default case for bombProperties switch.
                    // If a bomb type isn't listed, it uses the initial bombProperties.
                    // The previous erroneous handler calls and 'scene' usage are removed.
                    break;
            }
            
            // Create a new dynamic bomb with the right physics properties
            const dynamicBomb = this.scene.matter.add.image(bombX, bombY, bombType, null, bombProperties);
            dynamicBomb.setCircle(30);
            dynamicBomb.bombType = bombType;
            dynamicBomb.setDepth(12);
            dynamicBomb.setDisplaySize(60, 60);
            dynamicBomb.setFixedRotation(false);
            // dynamicBomb.setAngularVelocity(0.1); // Temporarily commented out for testing

            this.bomb = dynamicBomb; // BombLauncher now tracks the dynamic bomb
            this.scene.bomb = dynamicBomb; // GameScene also tracks the new dynamic bomb
            
            // Mark as a launched bomb (not static at slingshot)
            this.bomb.isLaunched = true;
            this.bomb.isAtSlingshot = false;
            this.bomb.hasHitIceBlock = false; // Reset this flag

            // Store launch power for Driller bombs
            if (bombType === BOMB_TYPES.DRILLER) {
                // distance is calculated earlier in this function
                // Ensure it's the drag distance used for force calculation
                const dragDx = this.BOW_X - pointer.x;
                const dragDy = this.BOW_Y - pointer.y;
                const launchDistance = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
                this.bomb.launchPower = Math.min(launchDistance, this.MAX_DRAG_DISTANCE); // Store capped distance
                if (this.debugMode) console.log(`[BombLauncher] Driller bomb launched with power (distance): ${this.bomb.launchPower}`);
            }

            // Attach collision handling logic directly to the bomb instance
            this.bomb.onHitBlock = function(block, collisionManagerInstance) {
                // 'this' refers to the bomb instance.
                // collisionManagerInstance is the instance of CollisionManager.

                const scene = collisionManagerInstance ? collisionManagerInstance.scene : null;

                if (!scene) {
                    console.error("[Bomb.onHitBlock] CRITICAL: 'scene' is not available from collisionManagerInstance. Aborting bomb effect.");
                    if (this && typeof this.destroy === 'function' && this.scene) { // 'this' is the bomb GameObject
                        this.hasExploded = true; // Mark as exploded to prevent other logic
                        this.destroy();
                    }
                    return { processed: true, hasExploded: true, bombStuck: false }; // Abort
                }

                const bombUtils = scene.bombUtils;
                if (!bombUtils) {
                    console.error(`[Bomb.onHitBlock] CRITICAL: 'bombUtils' is not available on scene '${scene.constructor.name}'. Aborting bomb effect.`);
                    if (this && typeof this.destroy === 'function' && this.scene) { // 'this' is the bomb GameObject
                        this.hasExploded = true; // Mark as exploded
                        this.destroy();
                    }
                    return { processed: true, hasExploded: true, bombStuck: false }; // Abort
                }
                
                const BOMB_TYPES = scene.BOMB_TYPES || { // Safeguard: Ensure this local BOMB_TYPES includes MELTER
                    BLAST: 'blast_bomb',
                    PIERCER: 'piercer_bomb',
                    CLUSTER: 'cluster_bomb',
                    STICKY: 'sticky_bomb',
                    SHATTERER: 'shatterer_bomb',
                    DRILLER: 'driller_bomb',
                    RICOCHET: 'ricochet_bomb',
                    SHRAPNEL: 'shrapnel_bomb',
                    MELTER: 'melter_bomb' 
                };

                let hasExploded = false;
                let bombStuck = false;
                let effectProcessedThisCall = false;
                
                const bombX = this.x;
                const bombY = this.y;
                const bombType = this.bombType;
                const bombVelocity = this.body ? { x: this.body.velocity.x, y: this.body.velocity.y } : { x: 0, y: 0 };

                switch (bombType) {
                    case BOMB_TYPES.BLAST:
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling BLAST bomb.");
                        bombUtils.handleBlastBomb(bombX, bombY);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.PIERCER:
                        let velocity = (this.body) ? this.body.velocity : { x: 0, y: 1 };
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling PIERCER bomb.");
                        bombUtils.handlePiercerBomb(bombX, bombY, velocity);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.CLUSTER:
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling CLUSTER bomb.");
                        bombUtils.handleClusterBomb(bombX, bombY, bombVelocity);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.STICKY:
                        this.isSticky = true; 
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling STICKY bomb.");
                        if (typeof bombUtils.handleStickyBomb === 'function') {
                            bombUtils.handleStickyBomb(bombX, bombY, block, this); // Pass bomb instance (this)
                        } else {
                            console.warn("[Bomb.onHitBlock] No handler for STICKY bomb! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                            hasExploded = true;
                        }
                        bombStuck = true; 
                        hasExploded = false; 
                        break;
                    case BOMB_TYPES.SHATTERER:
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling SHATTERER bomb.");
                        bombUtils.handleShattererBomb(bombX, bombY);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.SHRAPNEL:
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling SHRAPNEL bomb.");
                        if (typeof bombUtils.handleShrapnelBomb === 'function') {
                            bombUtils.handleShrapnelBomb(bombX, bombY);
                        } else {
                            console.warn("[Bomb.onHitBlock] No handler for SHRAPNEL bomb! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                        }
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.DRILLER:
                        this.isDriller = true; 
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling DRILLER bomb.");
                        let velocityX_drill = 0, velocityY_drill = 0;
                        if (this.body && this.body.velocity) {
                            velocityX_drill = this.body.velocity.x;
                            velocityY_drill = this.body.velocity.y;
                            this.storedVelocityX = velocityX_drill;
                            this.storedVelocityY = velocityY_drill;
                        }
                        if (bombUtils && typeof bombUtils.handleDrillerBomb === 'function') {
                            bombUtils.handleDrillerBomb(this, bombX, bombY, block, velocityX_drill, velocityY_drill);
                        } else {
                            console.warn("[Bomb.onHitBlock] Critical: bombUtils.handleDrillerBomb not found! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                            hasExploded = true;
                        }
                        bombStuck = true; 
                        hasExploded = false; 
                        break;
                    case BOMB_TYPES.RICOCHET:
                        this.isRicochet = true; 
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling RICOCHET bomb contact with block. It should bounce.");
                        if (collisionManagerInstance && typeof collisionManagerInstance.handleBouncyBlock === 'function') {
                             collisionManagerInstance.handleBouncyBlock(block, this);
                        }
                        hasExploded = false;
                        bombStuck = false;
                        break;
                    case BOMB_TYPES.MELTER: // ADDED MELTER CASE
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling MELTER bomb.");
                        if (typeof bombUtils.handleMelterBomb === 'function') {
                            bombUtils.handleMelterBomb(bombX, bombY, block);
                        } else {
                            console.warn("[Bomb.onHitBlock] No handler for MELTER bomb! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                            hasExploded = true; 
                        }
                        hasExploded = false; 
                        bombStuck = false;   
                        break;
                    default:
                        if (scene.debugMode) console.log(`[Bomb.onHitBlock] Unknown bomb type: ${bombType}, using BLAST.`);
                        bombUtils.handleBlastBomb(bombX, bombY); // CORRECTED
                        hasExploded = true;
                        break;
                }
                effectProcessedThisCall = true;
                
                if (bombType !== BOMB_TYPES.STICKY && bombType !== BOMB_TYPES.DRILLER && bombType !== BOMB_TYPES.RICOCHET && bombType !== BOMB_TYPES.MELTER) { // Ensure MELTER is excluded here too
                    this.hasExploded = hasExploded;
                }

                if (this.hasExploded) {
                    if (this.countdown) {
                        this.countdown.remove();
                        this.countdown = null;
                    }
                    if (this.countdownText && this.countdownText.scene) {
                        this.countdownText.destroy();
                        this.countdownText = null;
                    }
                    if (this.trailEmitter) {
                        this.trailEmitter.stop();
                        if (this.trailParticles && this.trailParticles.scene) {
                            this.trailParticles.destroy();
                            this.trailParticles = null;
                            this.trailEmitter = null;
                        }
                    }

                    if (this.scene) { 
                        const launcher = scene.bombLauncher; 
                        this.destroy(); 
                        if (launcher && launcher.bomb === this) {
                            launcher.bomb = null;
                            launcher.bombState.active = false; 
                        }
                        if (scene.bomb === this){
                            scene.bomb = null;
                        }
                    }
                }

                return { processed: effectProcessedThisCall, hasExploded: this.hasExploded, bombStuck: bombStuck };
            };


            // Transfer the bombId if it exists (for ricochet bombs from GameScene.createDynamicBomb)
            if (bombId) {
                this.bomb.bombId = bombId;
            }
            
            // If we had a countdown text and event, transfer them to the new bomb
            if (countdownTextTransfer && countdownTextTransfer.scene) {
                this.bomb.countdownText = countdownTextTransfer;
            }
            if (countdownEventTransfer) {
                this.bomb.countdown = countdownEventTransfer;
                // Ensure countdown callback scope is correct if it relies on 'this' being the bomb
                // This might need adjustment if the original callback in GameScene's createDynamicBomb
                // had a different scope or was tightly coupled with GameScene.
                // For now, assume transfer is okay, but good to note.
            }
            
            // === Special Ricochet Setup from GameScene.createDynamicBomb START ===
            if (bombType === BOMB_TYPES.RICOCHET) {
                this.bomb.isRicochet = true; // Crucial flag for GameScene logic
                
                this.bomb.lastBounceTime = this.bomb.lastBounceTime || 0;
                this.bomb.lastBounceX = this.bomb.lastBounceX || bombX;
                this.bomb.lastBounceY = this.bomb.lastBounceY || bombY;
                this.bomb.bounceCount = this.bomb.bounceCount === undefined ? -1 : this.bomb.bounceCount;
                this.bomb.hasExploded = false;

                if (!this.bomb.countdownText && !this.bomb.countdown) { // Only create if not transferred
                    const countdownDuration = 5000;
                    this.bomb.bounceStartTime = Date.now();
                    this.bomb.bounceDuration = countdownDuration;
                    this.bomb.explosionTime = this.bomb.bounceStartTime + countdownDuration;

                    this.bomb.countdownText = this.scene.add.text(bombX, bombY - 30, '5.0', {
                        font: '24px Arial',
                        fill: '#FFFFFF',
                        stroke: '#000000',
                        strokeThickness: 4,
                        fontWeight: 'bold'
                    }).setOrigin(0.5).setDepth(20);

                    this.bomb.countdown = this.scene.time.addEvent({ // Corrected syntax and structure
                        delay: 100, // Update every 100ms
                        callback: () => {
                            if (!this.bomb || !this.bomb.scene || this.bomb.hasExploded) {
                                if (this.bomb && this.bomb.countdown) {
                                     this.bomb.countdown.remove();
                                     this.bomb.countdown = null;
                                }
                                if (this.bomb && this.bomb.countdownText && this.bomb.countdownText.scene) {
                                    this.bomb.countdownText.destroy();
                                    this.bomb.countdownText = null;
                                }
                                return;
                            }

                            const elapsed = Date.now() - this.bomb.bounceStartTime;
                            const remaining = Math.max(0, (this.bomb.bounceDuration - elapsed) / 1000);

                            if (this.bomb.countdownText && this.bomb.countdownText.scene) {
                                this.bomb.countdownText.setText(remaining.toFixed(1));
                                this.bomb.countdownText.setPosition(this.bomb.x, this.bomb.y - 30);

                                if (remaining < 1) this.bomb.countdownText.setFill('#FF0000');
                                else if (remaining < 2) this.bomb.countdownText.setFill('#FFFF00');
                                else this.bomb.countdownText.setFill('#FFFFFF');
                            }

                            if (remaining <= 0 && !this.bomb.hasExploded) {
                                if (this.bomb.countdown) {
                                    this.bomb.countdown.remove();
                                    this.bomb.countdown = null;
                                }
                                // Explosion logic
                                if (this.scene.bombUtils && typeof this.scene.bombUtils.explodeRicochetBomb === 'function') {
                                    this.scene.bombUtils.explodeRicochetBomb(this.bomb);
                                } else if (typeof this.scene.handleRicochetBomb === 'function') {
                                    this.scene.handleRicochetBomb(this.bomb.x, this.bomb.y);
                                }
                            }
                        }, // end callback
                        callbackScope: this,
                        loop: true // Countdown should loop
                    });
                }
                 // Add trail if scene has particle system
                if (this.scene.add.particles) {
                    try {
                        const particles = this.scene.add.particles('particle'); // Assuming 'particle' texture exists
                        particles.setDepth(11);
                        const emitter = particles.createEmitter({
                            lifespan: 500, speed: { min: 5, max: 15 }, scale: { start: 0.3, end: 0 },
                            alpha: { start: 0.8, end: 0 }, blendMode: 'ADD', tint: 0x00FFFF, frequency: 20
                        });
                        emitter.startFollow(this.bomb);
                        this.bomb.trailEmitter = emitter; this.bomb.trailParticles = particles;
                    } catch (e) { console.warn("Could not create ricochet particle trail in BombLauncher:", e); }
                }
                console.log("Ricochet bomb launched with full setup from BombLauncher");
            }
            // === Special Ricochet Setup from GameScene.createDynamicBomb END ===

            // Apply force to the bomb - use matter body apply force for consistent behavior
            this.scene.matter.body.applyForce(
                this.bomb.body, 
                { x: bombX, y: bombY },
                { x: forceX, y: forceY }
            );
            
            // Set flags based on bombType (consolidated)
            if (bombType === BOMB_TYPES.STICKY) this.bomb.isSticky = true;
            if (bombType === BOMB_TYPES.DRILLER) this.bomb.isDriller = true;
            if (bombType === BOMB_TYPES.MELTER) this.bomb.isMelter = true; // Optional: add a flag if needed elsewhere
            // isRicochet is set above within its specific block

            
            // Update bomb state tracking
            this.bombState.active = true;
            this.bombState.lastBombFired = Date.now();
            // ALSO UPDATE SCENE'S BOMB STATE FOR CONSISTENCY WITH GameStateManager
            if (this.scene.bombState) {
                this.scene.bombState.active = true;
                this.scene.bombState.lastBombFired = this.bombState.lastBombFired; // Use the same timestamp
            }
            // Set bomb creation pending flag to true for a while, preventing immediate bomb recreation
            this.bombState.bombCreationPending = true;
            this.scene.time.delayedCall(1000, () => {
                this.bombState.bombCreationPending = false;
            });
            
            // Log special launching properties for ricochet bombs
            if (bombType === BOMB_TYPES.RICOCHET) {
                console.log("Ricochet bomb launched with special properties");
            }
            
            this.setAiming(false); // Bomb launched, stop aiming
            this.isLaunching = false;
            // console.log("BombLauncher:launchBomb successful. isLaunching = false.");
            return true;
        } catch (error) {
            console.error("Error in BombLauncher.launchBomb:", error);
            this.updateDebugText(`Launch error: ${error.message}`);
            this.isLaunching = false; // Clear flag on error
            // console.log("BombLauncher:launchBomb errored. isLaunching = false.");
            // Attempt recovery by creating a new bomb
            try {
                if (this.bomb && this.bomb.texture) { // Check if bomb and texture exist
                    const bombType = this.bomb.texture.key;
                    this.createBomb(bombType); // This will also call setAiming(false)
                } else if (this.scene.currentBombType) {
                    this.createBomb(this.scene.currentBombType); // Fallback to scene's current bomb type
                } else {
                    this.createBomb(); // Absolute fallback
                }
            } catch (e) {
                console.error("Error in recovery attempt within launchBomb:", e);
            }
            return false;
        }
    }
    
    /**
     * Check if a bomb is currently active (in motion)
     * @returns {boolean} True if a bomb is currently in motion
     */
    isBombActive() {
        // Consider a bomb active if:
        // 1. The active flag is set (a bomb was fired) OR
        // 2. A dynamic bomb exists and is visible
        if (this.bombState.active) return true;
        
        // Check if we have a dynamic bomb in the scene
        try {
            return this.bomb && !this.bomb.isStatic && this.bomb.visible;
        } catch (error) {
            console.error("Error checking bomb active state:", error);
            return false;
        }
    }
    
    /**
     * Check if the active bomb has gone out of bounds and handle it
     * 
     * This should be called in the scene's update method
     */
    checkForMissedBombs() {
        try {
            // Skip if no bomb or bomb is not active
            if (!this.bomb || !this.bombState.active) return;
            
            // Check if bomb is out of bounds
            const outOfBounds = this.bomb.x < -100 || 
                                this.bomb.x > this.scene.sys.game.config.width + 100 ||
                                this.bomb.y < -100 || 
                                this.bomb.y > this.scene.sys.game.config.height + 100;
            
            if (outOfBounds) {
                if (this.debugMode) {
                    console.log(`Bomb out of bounds (${this.bomb.x}, ${this.bomb.y}), destroying it`);
                    this.updateDebugText(`Bomb out of bounds (${this.bomb.x}, ${this.bomb.y})`);
                }
                
                // Create a fizzle effect at last known position
                if (this.scene.createFizzleEffect) {
                    this.scene.createFizzleEffect(this.bomb.x, this.bomb.y);
                }
                
                // Destroy the bomb
                if (this.bomb.scene) {
                    this.bomb.destroy();
                }
                this.bomb = null;
                
                // Update bomb state
                this.bombState.active = false;
                
                // Check if this was the last bomb
                this.checkLastBombResolution();

                // Schedule a reset for the next bomb with a longer delay
                this.scene.time.delayedCall(2000, () => {
                    if (this.scene.shotsRemaining > 0) {
                        this.createBomb(this.scene.currentBombType || 'bomb');
                    } else {
                        // Check level completion if no shots remain
                        if (this.scene.checkLevelCompletion) {
                            this.scene.checkLevelCompletion();
                        }
                    }
                });
                
                return true; // Bomb was handled
            }
            
            return false; // No bombs were handled
        } catch (error) {
            console.error("Error in BombLauncher.checkForMissedBombs:", error);
            this.updateDebugText(`Error: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Check if the active bomb has stopped moving and hasn't hit any blocks
     * If so, explode it to match the behavior of the previous version
     * 
     * This should be called in the scene's update method
     */
    checkForStoppedBombs() {
        try {
            // Skip if no bomb, bomb is not active, or bomb has been destroyed
            if (!this.bomb || !this.bombState.active || !this.bomb.scene) {
                return false;
            }
            
            // Safety check - if the bomb body is null or has been removed
            if (!this.bomb.body || this.bomb.hasExploded) {
                this.bombState.active = false;
                
                // Check if this was the last bomb
                this.checkLastBombResolution();
                
                return false;
            }
            
            // Get the bomb type safely with proper fallbacks
            const bombType = this.bomb.bombType || this.scene.currentBombType || 'blast_bomb';
            const bombVelocity = this.bomb.body && this.bomb.body.velocity ? { x: this.bomb.body.velocity.x, y: this.bomb.body.velocity.y } : { x: 0, y: 0 };
            
            // Get BOMB_TYPES safely from scene
            const BOMB_TYPES = this.scene.BOMB_TYPES || {
                BLAST: 'blast_bomb',
                STICKY: 'sticky_bomb',
                DRILLER: 'driller_bomb',
                RICOCHET: 'ricochet_bomb',
                // Include fallbacks for short names too
                STICKY_SHORT: 'sticky',
                DRILLER_SHORT: 'driller',
                RICOCHET_SHORT: 'ricochet'
            };
            
            // Special handling for ricochet bombs
            const isRicochetBomb = bombType === BOMB_TYPES.RICOCHET || 
                bombType === BOMB_TYPES.RICOCHET_SHORT ||
                this.bomb.isRicochet;
                
            if (isRicochetBomb) {
                return false; // Ricochet bombs have their own timer-based explosion
            }
            
            if (this.bomb.body && this.bomb.body.velocity) {
                const speed = Math.sqrt(this.bomb.body.velocity.x * this.bomb.body.velocity.x + this.bomb.body.velocity.y * this.bomb.body.velocity.y);
                const stopThreshold = 0.5;

                if (speed < stopThreshold) {
                    const bombX = this.bomb.x;
                    const bombY = this.bomb.y;
                    const stoppedBombInstance = this.bomb; // Keep a reference

                    const isStickyType = bombType === BOMB_TYPES.STICKY || bombType === BOMB_TYPES.STICKY_SHORT;
                    const isDrillerType = bombType === BOMB_TYPES.DRILLER || bombType === BOMB_TYPES.DRILLER_SHORT;

                    if ((isStickyType || isDrillerType) && !stoppedBombInstance.hasHitIceBlock) {
                        if (this.debugMode) console.log(`[CheckStop] ${bombType} stopped mid-air. Converting to placed bomb.`);
                        
                        if (stoppedBombInstance.body) {
                            stoppedBombInstance.setStatic(true);
                            stoppedBombInstance.setVelocity(0, 0);
                        }
                        this.bombState.active = false; // Allow new bomb preparation

                        if (isStickyType) {
                            if (this.scene.bombUtils && typeof this.scene.bombUtils.handleStickyBomb === 'function') {
                                this.scene.bombUtils.handleStickyBomb(bombX, bombY, null, stoppedBombInstance);
                            }
                        } else if (isDrillerType) {
                            stoppedBombInstance.isDriller = false;
                            stoppedBombInstance.isSticky = true;
                             // Optionally change bombType visually or for other logic if needed:
                            // stoppedBombInstance.bombType = BOMB_TYPES.STICKY; 
                            // stoppedBombInstance.setTexture(BOMB_TYPES.STICKY); // If visual change is desired
                            if (this.scene.bombUtils && typeof this.scene.bombUtils.handleStickyBomb === 'function') {
                                this.scene.bombUtils.handleStickyBomb(bombX, bombY, null, stoppedBombInstance);
                            }
                        }
                        // BombUtils.handleStickyBomb should clear this.bombLauncher.bomb if it was the same instance.
                        // If this.bomb was the stoppedBombInstance and handleStickyBomb didn't nullify it in the launcher context,
                        // we ensure it's nulled so cleanupExistingBomb in delayedCall doesn't try to destroy it again.
                        if (this.bomb === stoppedBombInstance) {
                            this.bomb = null;
                        }

                    } else if (!isStickyType && !isDrillerType) {
                        // Standard bombs that explode when stopped
                        if (this.debugMode) console.log(`[CheckStop] Standard bomb ${bombType} stopped. Exploding.`);
                        this.bombState.active = false;
                        if (stoppedBombInstance.body) {
                            try {
                                stoppedBombInstance.setStatic(true);
                                stoppedBombInstance.setVelocity(0, 0);
                            } catch (e) { /* ignore */ }
                        }
                        
                        try {
                            // Explosion logic from original code
                            if (this.scene.bombUtils) {
                                switch(bombType) {
                                    case BOMB_TYPES.BLAST: case 'bomb': this.scene.bombUtils.handleBlastBomb(bombX, bombY); break;
                                    case BOMB_TYPES.PIERCER: this.scene.bombUtils.handlePiercerBomb(bombX, bombY, {x: 0, y: 1}); break; // Stopped bombs lose velocity context for piercer
                                    case BOMB_TYPES.CLUSTER: this.scene.bombUtils.handleClusterBomb(bombX, bombY, bombVelocity); break; // Pass original velocity
                                    case BOMB_TYPES.SHATTERER: this.scene.bombUtils.handleShattererBomb(bombX, bombY); break;
                                    default: this.scene.bombUtils.handleBlastBomb(bombX, bombY); break;
                                }
                            } else { /* fallback to scene handlers */ }
                        } catch (explosionError) {
                            console.error("Error handling explosion for stopped bomb:", explosionError);
                            if (stoppedBombInstance && stoppedBombInstance.scene) stoppedBombInstance.destroy();
                            if (this.bomb === stoppedBombInstance) this.bomb = null;
                        }
                        
                        if (stoppedBombInstance && stoppedBombInstance.scene) {
                            stoppedBombInstance.hasExploded = true;
                            this.scene.time.delayedCall(16, () => { // Delayed destruction
                                if (stoppedBombInstance && stoppedBombInstance.scene) stoppedBombInstance.destroy();
                                if (this.bomb === stoppedBombInstance) this.bomb = null;
                            });
                        } else {
                           if (this.bomb === stoppedBombInstance) this.bomb = null;
                        }
                    } else if ((isStickyType || isDrillerType) && stoppedBombInstance.hasHitIceBlock) {
                        // Sticky or Driller bomb stopped AFTER hitting a block.
                        // Their onHitBlock logic should have handled them (made them static, set up timers/drilling).
                        // If the launcher still considers this bomb 'active' for firing, but it's now static,
                        // we can set bombState.active to false to allow the next bomb.
                        if (this.debugMode) console.log(`[CheckStop] ${bombType} stopped after hitting block. Ensuring launcher can reset.`);
                        if (stoppedBombInstance.body && stoppedBombInstance.body.isStatic && this.bombState.active) {
                            this.bombState.active = false;
                        }
                        // Return true because we've acknowledged the state, allowing new bomb prep if state changed.
                        // No direct action on the bomb itself here; its own logic prevails.
                        // The general delayedCall below will handle new bomb creation if state became inactive.
                    }

                    // If bombState became inactive by any of the above paths, schedule next bomb
                    if (!this.bombState.active) {
                        // Check if this was the last bomb
                        this.checkLastBombResolution();
                        
                        this.scene.time.delayedCall(1000, () => { // Quicker reset for next bomb
                            try {
                                // First, check if ANY bombs are available AT ALL in the GameScene
                                const anyBombs = this.scene.isAnyBombAvailable ? this.scene.isAnyBombAvailable() : 'undefined'; // LOGGING
                                console.log(`[BombLauncher.checkForStoppedBombs.delayedCall] About to check bombs. GameScene.isAnyBombAvailable() reports: ${anyBombs}`);

                                if (!this.scene.isAnyBombAvailable()) {
                                    // If NO bombs are left at all, it's definitely a game over check
                                    console.log("[BombLauncher.checkForStoppedBombs.delayedCall] No bombs of ANY type available. Calling GameScene.checkGameOver().");
                                    if (this.scene.checkGameOver) {
                                        this.scene.checkGameOver();
                                    }
                                } else {
                                    // Bombs of some type are still available, try to create a new one
                                    // (createBomb will internally handle switching to an available type if current type is out)
                                    if (this.bomb) this.cleanupExistingBomb();
                                    this.createBomb(this.scene.currentBombType || 'bomb'); // GameScene's currentBombType should be an available one
                                }
                            } catch (e) {
                                console.error("Error in reset timer (BombLauncher.checkForStoppedBombs):", e);
                                if (this.scene.forceResetGameState) this.scene.forceResetGameState();
                            }
                        });
                        return true; // Bomb was handled
                    }
                } 
            } else {
                // No velocity data, or bomb has no body
                 if (this.debugMode && this.bomb) console.log(`[CheckStop] Skip: No velocity data or no body for bomb type ${this.bomb.bombType}.`);
            }
            
            return false;
        } catch (error) {
            console.error("Error in BombLauncher.checkForStoppedBombs:", error);
            
            // Safety - try to reset state
            this.bombState.active = false;
            if (this.bomb && this.bomb.scene) {
                try {
                    this.bomb.destroy();
                } catch (e) {
                    console.error("Error destroying bomb in error handler:", e);
                }
            }
            this.bomb = null;
            
            // Check if this was the last bomb
            this.checkLastBombResolution();
            
            return false;
        }
    }

    /**
     * Check if this was the last bomb and notify GameStateManager to proceed with game over/victory checks
     */
    checkLastBombResolution() {
        // Check if we have a GameStateManager
        if (this.scene && this.scene.gameStateManager) {
            const anyBombsAvailable = this.scene.isAnyBombAvailable ? this.scene.isAnyBombAvailable() : false;
            
            if (!anyBombsAvailable && this.scene.gameStateManager.waitingForLastBomb) {
                console.log("[BombLauncher.checkLastBombResolution] Last bomb has resolved, notifying GameStateManager");
                
                // Small delay to allow any visual effects to play before showing game over/victory UI
                this.scene.time.delayedCall(500, () => {
                    // Force check for level completion/game over now that last bomb has resolved
                    if (this.scene.checkLevelCompletion) {
                        this.scene.checkLevelCompletion();
                    } else if (this.scene.gameStateManager.checkGameOver) {
                        this.scene.gameStateManager.checkGameOver();
                    }
                });
            }
        }
    }

    /**
     * Toggle debug mode on/off
     * @param {boolean} [value] - Optional explicit value to set, otherwise toggles current state
     * @returns {boolean} The new debug mode state
     */
    toggleDebugMode(value) {
        // If value is provided, use it, otherwise toggle current state
        this.debugMode = value !== undefined ? value : !this.debugMode;
        if (this.scene) { // Add null check for this.scene
            this.scene.debugMode = this.debugMode; // Sync with scene
        } else {
            console.warn("[BombLauncher.toggleDebugMode] this.scene is null, cannot sync debugMode with scene.");
        }
        
        if (this.debugMode) {
            // Create debug text if it doesn't exist
            if (!this.debugText && this.scene) { // Add null check for this.scene
                this.debugText = this.scene.add.text(10, 100, 'BombLauncher Debug', { 
                    font: '16px Arial', 
                    fill: '#00ff00' 
                }).setDepth(1000);
            }
            console.log("BombLauncher debug mode enabled");
            if (this.debugText) this.updateDebugText("Debug mode enabled");
        } else {
            // Remove debug text if debug mode is turned off
            if (this.debugText && this.debugText.scene) {
                this.debugText.destroy();
                this.debugText = null;
            }
            console.log("BombLauncher debug mode disabled");
        }
        
        return this.debugMode;
    }

    // Method to create the bow visuals (moved from GameScene.js)
    createBow() {
        try {
            console.log("[BombLauncher.createBow] Attempting to create bow parts.");
            // Verify textures exist
            const upperExists = this.scene.textures.exists('upper_bow_part');
            const lowerExists = this.scene.textures.exists('lower_bow_part');
            console.log(`[BombLauncher.createBow] Texture 'upper_bow_part' exists: ${upperExists}`);
            console.log(`[BombLauncher.createBow] Texture 'lower_bow_part' exists: ${lowerExists}`);

            if (!upperExists || !lowerExists) {
                console.error("[BombLauncher.createBow] One or both bow part textures missing. Ensure they are preloaded with correct keys: 'upper_bow_part', 'lower_bow_part'");
                // return; // Optional: stop if textures are missing
            }

            const bowPartDepth = 5000; // Keep EXTREMELY high depth
            const originUpper = { x: 0.5, y: 1 }; // CORRECT origin for upper bow
            const originLower = { x: 0.5, y: 0 }; // Rotates around top-CENTER

            // Adjust Y positions for the grip gap
            const upperBowY = this.BOW_Y - (this.GRIP_GAP / 2);
            const lowerBowY = this.BOW_Y + (this.GRIP_GAP / 2);

            this.upperBowPart = this.scene.add.image(this.BOW_X, upperBowY, 'upper_bow_part');
            this.upperBowPart.setOrigin(originUpper.x, originUpper.y);
            this.upperBowPart.setDepth(bowPartDepth);
            console.log(`[BombLauncher.createBow] upperBowPart details (CORRECT ORIGIN) - x: ${this.upperBowPart.x}, y: ${this.upperBowPart.y}, depth: ${this.upperBowPart.depth}, visible: ${this.upperBowPart.visible}, alpha: ${this.upperBowPart.alpha}, scaleX: ${this.upperBowPart.scaleX}, displayWidth: ${this.upperBowPart.displayWidth}, displayHeight: ${this.upperBowPart.displayHeight}, origin: (${this.upperBowPart.originX}, ${this.upperBowPart.originY})`);
            const upperBounds = this.upperBowPart.getBounds();
            console.log(`[BombLauncher.createBow] upperBowPart BOUNDS (CORRECT ORIGIN): x=${upperBounds.x.toFixed(2)}, y=${upperBounds.y.toFixed(2)}, w=${upperBounds.width.toFixed(2)}, h=${upperBounds.height.toFixed(2)}, L=${upperBounds.left.toFixed(2)}, R=${upperBounds.right.toFixed(2)}, T=${upperBounds.top.toFixed(2)}, B=${upperBounds.bottom.toFixed(2)}`);

            this.lowerBowPart = this.scene.add.image(this.BOW_X, lowerBowY, 'lower_bow_part');
            this.lowerBowPart.setOrigin(originLower.x, originLower.y);
            this.lowerBowPart.setDepth(bowPartDepth);
            console.log(`[BombLauncher.createBow] lowerBowPart details (CORRECT ORIGIN) - x: ${this.lowerBowPart.x}, y: ${this.lowerBowPart.y}, depth: ${this.lowerBowPart.depth}, visible: ${this.lowerBowPart.visible}, alpha: ${this.lowerBowPart.alpha}, scaleX: ${this.lowerBowPart.scaleX}, displayWidth: ${this.lowerBowPart.displayWidth}, displayHeight: ${this.lowerBowPart.displayHeight}, origin: (${this.lowerBowPart.originX}, ${this.lowerBowPart.originY})`);
            const lowerBounds = this.lowerBowPart.getBounds();
            console.log(`[BombLauncher.createBow] lowerBowPart BOUNDS (CORRECT ORIGIN): x=${lowerBounds.x.toFixed(2)}, y=${lowerBounds.y.toFixed(2)}, w=${lowerBounds.width.toFixed(2)}, h=${lowerBounds.height.toFixed(2)}, L=${lowerBounds.left.toFixed(2)}, R=${lowerBounds.right.toFixed(2)}, T=${upperBounds.top.toFixed(2)}, B=${lowerBounds.bottom.toFixed(2)}`); // Corrected to lowerBounds.top
            
            // Explicitly set visible and alpha for debugging, though default should be fine
            this.upperBowPart.setVisible(true).setAlpha(1);
            this.lowerBowPart.setVisible(true).setAlpha(1);

            this.updateBowstring(); 
            
        } catch (error) {
            console.error("Error in createBow:", error);
        }
    }

    // Method to set the aiming state and manage visuals
    setAiming(isAiming) {
        const wasAiming = this.isAiming;
        this.isAiming = isAiming;
        
        // Update the scene's aiming flag as well, if the scene has one
        // This ensures consistency if other parts of the scene rely on scene.isAiming
        if (typeof this.scene.isAiming !== 'undefined') {
            this.scene.isAiming = isAiming;
        }

        // If starting to aim, make sure bomb is visible
        if (isAiming && !wasAiming) {
            if (this.bomb && this.bomb.scene) {
                // Ensure bomb is visible when aiming begins
                this.bomb.setVisible(true);
                console.log("[BombLauncher.setAiming] Starting aim, ensuring bomb is visible");
            } else if (!this.bombState.bombCreationPending) {
                // No bomb when aiming starts - recreate it
                console.log("[BombLauncher.setAiming] No bomb exists when starting aim, creating one");
                const bombType = this.scene.currentBombType || 'blast_bomb';
                this.createBomb(bombType);
            }
        }

        if (!isAiming) {
            this.aimingBombRotationAngle = 0; // Reset visual rotation angle
            if (this.bomb && this.bomb.scene) { // If static bomb still exists
                this.bomb.angle = 0; // Reset its visual angle
            }
            // Clear trajectory when aiming stops
            if (this.trajectoryGraphics && this.trajectoryGraphics.scene) {
                this.trajectoryGraphics.clear();
            }
            // Reset bowstring to default position
            this.updateBowstring();

            // --- ADD THIS: Reset Bow Part Rotation ---
            if (this.upperBowPart && this.upperBowPart.scene) {
                this.upperBowPart.angle = 0;
            }
            if (this.lowerBowPart && this.lowerBowPart.scene) {
                this.lowerBowPart.angle = 0;
            }
            // --- END ADDITION ---
        }
    }
} 