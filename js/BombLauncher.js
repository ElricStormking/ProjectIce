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
        
        // Bow and aiming related properties from GameScene
        this.BOW_X = 300; 
        this.BOW_Y = 540; 
        this.MAX_DRAG_DISTANCE = 200;
        this.SHOT_POWER = 0.0013; // Reduced to 1% of original value (was 0.13)
        this.bow = null; // This will hold the bow image
        
        // Bomb state tracking
        this.bombState = {
            active: false,
            lastBombFired: 0,
            lastResetTime: 0,
            pendingReset: null,
            bombCreationPending: false // Flag to prevent multiple bomb creations
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
            dot.setDepth(500); // Use a much higher depth
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

            // Check if bomb creation is already pending
            if (this.bombState.bombCreationPending) {
                console.log("Bomb creation already pending, skipping request");
                return null;
            }
            
            console.log(`Creating bomb of type: ${bombType}`);
            
            // Set the pending flag
            this.bombState.bombCreationPending = true;
            
            // Clean up existing bomb and visuals
            this.cleanupExistingBomb();
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
                
                // Configure bomb physics properties
                this.bomb.setCircle(30);
                this.bomb.setStatic(true);
                this.bomb.setVisible(true);
                this.bomb.setDepth(12); // Above slingshot and elastic line
                this.bomb.setDisplaySize(60, 60);
                
                // Add bomb type for reference
                this.bomb.bombType = validBombType;
                
                // Reset bomb state
                this.bombState.active = false;
                this.bombState.lastResetTime = Date.now();
                
                // Create initial elastic line (now bowstring)
                this.updateBowstring();
                
                console.log(`Successfully created bomb of type ${validBombType} at ${x},${y}`);
                
                // Update the scene's bomb reference for backwards compatibility
                this.scene.bomb = this.bomb;
                
                // Clear the pending flag
                this.bombState.bombCreationPending = false;
                
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
            RICOCHET: 'ricochet_bomb'
        };
        
        // Check if this is a short name (e.g. 'blast' vs 'blast_bomb')
        const shortNames = {
            'blast': BOMB_TYPES.BLAST || 'blast_bomb',
            'piercer': BOMB_TYPES.PIERCER || 'piercer_bomb',
            'cluster': BOMB_TYPES.CLUSTER || 'cluster_bomb',
            'sticky': BOMB_TYPES.STICKY || 'sticky_bomb',
            'shatterer': BOMB_TYPES.SHATTERER || 'shatterer_bomb',
            'driller': BOMB_TYPES.DRILLER || 'driller_bomb',
            'ricochet': BOMB_TYPES.RICOCHET || 'ricochet_bomb'
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
        if (this.bomb) {
            if (this.debugMode) {
                console.log("Cleaning up existing bomb");
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
        if (!this.bow) return; // Don't draw if bow doesn't exist

        if (!this.elasticLine) {
            this.elasticLine = this.scene.add.graphics();
            this.elasticLine.setDepth(11); // Above bow
        }
        this.elasticLine.clear();
        this.elasticLine.lineStyle(2, 0xFFFFFF, 0.8); // White, slightly transparent
        this.elasticLine.beginPath();

        if (this.isAiming && bombX !== undefined && bombY !== undefined) {
            // Draw pulled bowstring
            this.elasticLine.moveTo(this.BOW_X, this.BOW_Y - 40); // Top of bow
            this.elasticLine.lineTo(bombX, bombY); // Bomb position
            this.elasticLine.lineTo(this.BOW_X, this.BOW_Y + 40); // Bottom of bow
        } else {
            // Draw default bowstring (a straight line when not pulled)
            this.elasticLine.moveTo(this.BOW_X, this.BOW_Y - 40); // Top of bow
            this.elasticLine.lineTo(this.BOW_X, this.BOW_Y + 40); // Bottom of bow
        }
        this.elasticLine.stroke();
    }

    /**
     * Draw trajectory prediction dots
     */
    createTrajectoryDots(startX, startY, velocityX, velocityY) {
        // Clean up existing graphics - REMOVED, clearVisuals handles this properly
        // if (this.trajectoryGraphics && this.trajectoryGraphics.scene) {
        //     this.trajectoryGraphics.clear();
        // } else {
        // Ensure trajectoryGraphics is initialized if it was somehow cleared elsewhere - Handled in constructor
        //     this.trajectoryGraphics = this.scene.add.graphics();
        //     this.trajectoryGraphics.setDepth(15);
        // }
        
        // Ensure the group is visible before drawing
        if (this.trajectoryDotGroup) {
            this.trajectoryDotGroup.setVisible(true);
        }
        
        if (this.debugMode) {
            console.log("Drawing trajectory from:", startX, startY, "with velocity:", velocityX, velocityY);
            this.updateDebugText(`Drawing trajectory from ${startX.toFixed(2)},${startY.toFixed(2)}`);
        }
        
        try {
            // Calculate trajectory points using the refined method
            this.calculateTrajectoryPoints(startX, startY, velocityX, velocityY);
            
            // Draw dotted line connecting trajectory points
            if (this.trajectoryPoints.length >= 2) {
                const skipFactor = Math.ceil(this.trajectoryPoints.length / 60); // Draw ~60 dots
                if (this.debugMode) console.log(`[Trajectory] Attempting to draw ${Math.ceil(this.trajectoryPoints.length / skipFactor)} dots using sprite group.`);
                
                // Ensure the dot group exists
                if (!this.trajectoryDotGroup) {
                     console.error("[Trajectory] trajectoryDotGroup is missing OR INVALID prior to re-initialization attempt.");
                     if (!this.scene || !this.scene.add) {
                         console.error(`[Trajectory] CRITICAL: Scene invalid during re-initialization! Scene exists: ${!!this.scene}, Scene.add exists: ${!!(this.scene && this.scene.add)}`);
                         return; // Cannot re-initialize without a valid scene
                     }
                     if (this.debugMode) console.log("[Trajectory] Attempting to re-initialize trajectoryDotGroup...");
                     // Re-initialize the group (same as constructor)
                     try {
                         this.trajectoryDotGroup = this.scene.add.group(); // Create an empty group
                         for (let i = 0; i < 70; i++) {
                             // Create a small circle graphic instead of a sprite
                             const dot = this.scene.add.circle(-100, -100, 3, 0xffffff); // Default white, radius 3
                             dot.setDepth(500); // Use a much higher depth
                             dot.setVisible(false);
                             dot.setActive(false);
                             this.trajectoryDotGroup.add(dot); // Add it to the group
                             this.scene.add.existing(dot); // Also add to scene display list during re-init
                         }
                         // Explicitly add the re-initialized group itself to the scene
                         this.scene.add.existing(this.trajectoryDotGroup);
                     } catch (reinitError) {
                         console.error("[Trajectory] CRITICAL: Error during trajectoryDotGroup re-initialization:", reinitError);
                         this.trajectoryDotGroup = null; // Ensure it's null if creation failed
                     }

                     if (this.debugMode) {
                         console.log(`[Trajectory] After re-initialization attempt, trajectoryDotGroup. Exists: ${!!this.trajectoryDotGroup}, Active: ${this.trajectoryDotGroup ? this.trajectoryDotGroup.active : 'N/A'}, Length: ${this.trajectoryDotGroup ? this.trajectoryDotGroup.getLength() : 'N/A'}`);
                     }
                    // If it was missing, it implies something went wrong, maybe return to avoid errors this frame
                    if (!this.trajectoryDotGroup) {
                        console.error("[Trajectory] CRITICAL: Failed to re-initialize trajectoryDotGroup!");
                        return; 
                    }
                }

                // Get all children from the group
                const dots = this.trajectoryDotGroup.getChildren();
                if (this.debugMode) {
                    console.log(`[Trajectory] Group has ${dots.length} children. Is group active: ${this.trajectoryDotGroup.active}`);
                    // Check the scene of the first dot to ensure it's valid
                    if (dots.length > 0 && dots[0]) {
                        console.log(`[Trajectory] First dot scene: ${dots[0].scene ? 'valid' : 'INVALID'}`);
                    } else if (dots.length === 0) {
                        console.warn("[Trajectory] No dots in group during drawing attempt!");
                    }
                }

                // Hide all dots first
                dots.forEach(dot => dot.setVisible(false).setActive(false));

                let dotsDrawn = 0;
                for (let i = 0; i < this.trajectoryPoints.length && dotsDrawn < dots.length; i += skipFactor) {
                    const dot = dots[dotsDrawn]; // Now it's a circle, not a sprite
                    const point = this.trajectoryPoints[i];
                    const alpha = 1.0 - (i / this.trajectoryPoints.length * 0.6); 
                    const radius = 2 + (1.0 - (i / this.trajectoryPoints.length)) * 3; // Dots get smaller, min radius 2, max 5

                    if (dot && dot.scene) { // Ensure circle is still valid
                        dot.setPosition(point.x, point.y);
                        dot.setAlpha(alpha);
                        // For circles, we set radius and fill color
                        dot.setRadius(radius);
                        dot.setFillStyle(0x00ff00, alpha); // Green trajectory dots
                        dot.setActive(true);
                        dot.setVisible(true);
                        dotsDrawn++;
                    } else {
                        if (this.debugMode) console.warn("[Trajectory] Invalid dot/sprite in group during drawing loop.");
                    }
                }
                
                if (this.debugMode) {
                    console.log(`[Trajectory] Drew ${dotsDrawn} dots from sprite group.`);
                }
            }
        } catch (error) {
            console.error("[Trajectory] Error drawing sprite-based trajectory:", error);
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
    calculateTrajectoryPoints(startX, startY, velocityX, velocityY) {
        this.trajectoryPoints = [];
        const numPoints = 30; // Number of dots for the line
        const lineLength = 800; // Fixed length for the trajectory line
        const timeStep = 1; // Arbitrary step, used for segmenting the line

        if (this.debugMode) {
            // console.log(`[BombLauncher.calculateTrajectoryPoints] Straight Line Mode. Start: (${startX.toFixed(2)}, ${startY.toFixed(2)}), Vel: (${velocityX.toFixed(2)}, ${velocityY.toFixed(2)})`);
        }

        const angle = Math.atan2(velocityY, velocityX);

        for (let i = 0; i < numPoints; i++) {
            const distance = (i / numPoints) * lineLength;
            const x = startX + distance * Math.cos(angle);
            const y = startY + distance * Math.sin(angle);
            this.trajectoryPoints.push({ x: x, y: y });

            // Optional: Stop if out of bounds, though less critical for a straight line visual
            // if (x < 0 || x > this.scene.cameras.main.width || y < 0 || y > this.scene.cameras.main.height) {
            //     if (this.debugMode) console.log("[BombLauncher.calculateTrajectoryPoints] Straight line point out of bounds, stopping.");
            //     break;
            // }
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
        if (!this.bomb || !pointer) return;
        
        try {
            // Ensure pointer has valid x and y coordinates
            if (pointer.x === undefined || pointer.y === undefined) {
                console.warn("Invalid pointer coordinates in updateBombPosition");
                return;
            }
            
            // Use the drawTrajectoryFromPointer method for consistent handling
            this.drawTrajectoryFromPointer(pointer);
        } catch (error) {
            console.error("Error in BombLauncher.updateBombPosition:", error);
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
        const dy = this.BOW_Y - 30 - pointer.y; // -30 offset to align with visual bow center
        
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
            
            // Calculate angle and distance from slingshot
            const dx = this.BOW_X - pointer.x;
            const dy = this.BOW_Y - 30 - pointer.y;
            
            // Limit distance by MAX_DRAG_DISTANCE
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
            
            // Update elastic line
            this.updateBowstring(bombX, bombY);
            
            // Calculate velocity for trajectory based on the actual shot power
            const effectiveForceX = dx * this.SHOT_POWER;
            const effectiveForceY = dy * this.SHOT_POWER;
            
            // Create trajectory dots
            this.createTrajectoryDots(bombX, bombY, effectiveForceX, effectiveForceY);
            
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
            RICOCHET: 'ricochet_bomb'
        };

        
        try {
            // Ensure pointer has valid x and y coordinates
            if (pointer.x === undefined || pointer.y === undefined) {
                console.warn("Invalid pointer coordinates in launchBomb");
                return false;
            }
            
            // Calculate angle and distance from slingshot
            const dx = this.BOW_X - pointer.x;
            const dy = this.BOW_Y - 30 - pointer.y;
            
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
                frictionAir: 0.001 // Default from GameScene, was 0.004, then 0.001
            };
    
            switch(bombType) {
                case BOMB_TYPES.PIERCER:
                    bombProperties.friction = 0.002;
                    bombProperties.frictionAir = 0.0008; // Was 0.003 then 0.0008
                    bombProperties.density = 0.0005;
                    break;
                case BOMB_TYPES.CLUSTER:
                    bombProperties.density = 0.0002;
                    bombProperties.frictionAir = 0.001; // Was 0.005 then 0.001
                    break;
                case BOMB_TYPES.STICKY:
                    bombProperties.density = 0.0003;
                    bombProperties.frictionAir = 0.001; // Was 0.004 then 0.001
                    break;
                case BOMB_TYPES.SHATTERER:
                    bombProperties.density = 0.0004;
                    bombProperties.frictionAir = 0.0009; // Was 0.0036 then 0.0009
                    break;
                case BOMB_TYPES.DRILLER:
                    bombProperties.density = 0.0004;
                    bombProperties.frictionAir = 0.0008; // Was 0.003 then 0.0008
                    break;
                case BOMB_TYPES.RICOCHET:
                    bombProperties.restitution = 1.0;
                    bombProperties.friction = 0.001;
                    bombProperties.frictionAir = 0.0005;
                    bombProperties.density = 0.0003;
                    break;
            }
            
            // Create a new dynamic bomb with the right physics properties
            const dynamicBomb = this.scene.matter.add.image(bombX, bombY, bombType, null, bombProperties);
            dynamicBomb.setCircle(30);
            dynamicBomb.bombType = bombType;
            dynamicBomb.setDepth(12);
            dynamicBomb.setDisplaySize(60, 60);
            dynamicBomb.setFixedRotation(false);
            dynamicBomb.setAngularVelocity(0.1);

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
                const dragDy = this.BOW_Y - 30 - pointer.y;
                const launchDistance = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
                this.bomb.launchPower = Math.min(launchDistance, this.MAX_DRAG_DISTANCE); // Store capped distance
                if (this.debugMode) console.log(`[BombLauncher] Driller bomb launched with power (distance): ${this.bomb.launchPower}`);
            }

            // Attach collision handling logic directly to the bomb instance
            this.bomb.onHitBlock = function(block, collisionManagerInstance) {
                // 'this' refers to the bomb instance.
                // collisionManagerInstance is the instance of CollisionManager.
                const scene = collisionManagerInstance.scene;
                const bombUtils = scene.bombUtils;
                const BOMB_TYPES = scene.BOMB_TYPES || {}; // Safeguard

                let hasExploded = false;
                let bombStuck = false;
                let effectProcessedThisCall = false;
                
                // This bomb instance is the activeBomb in CollisionManager's context
                const bombX = this.x;
                const bombY = this.y;
                const bombType = this.bombType;

                // Logic adapted from CollisionManager._handleBombToBlockCollision
                if (!bombUtils) {
                    console.error("[Bomb.onHitBlock] scene.bombUtils is not defined!");
                    this.hasExploded = true;
                    return { processed: true, hasExploded: true, bombStuck: false };
                }

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
                        bombUtils.handleClusterBomb(bombX, bombY);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.STICKY:
                        this.isSticky = true; // Mark the bomb instance
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling STICKY bomb.");
                        if (typeof bombUtils.handleStickyBomb === 'function') {
                            bombUtils.handleStickyBomb(bombX, bombY, block); // Pass block
                        } else {
                            console.warn("[Bomb.onHitBlock] No handler for STICKY bomb! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                            hasExploded = true;
                        }
                        bombStuck = true; // Sticky bombs "stick"
                        hasExploded = false; // Sticky bombs don't explode on initial contact
                        break;
                    case BOMB_TYPES.SHATTERER:
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling SHATTERER bomb.");
                        bombUtils.handleShattererBomb(bombX, bombY);
                        hasExploded = true;
                        break;
                    case BOMB_TYPES.DRILLER:
                        this.isDriller = true; // Mark the bomb instance
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling DRILLER bomb.");
                        let drillerBombInstance = null;
                        let velocityX_drill = 0, velocityY_drill = 0;
                        if (this.body && this.body.velocity) {
                            velocityX_drill = this.body.velocity.x;
                            velocityY_drill = this.body.velocity.y;
                            this.storedVelocityX = velocityX_drill;
                            this.storedVelocityY = velocityY_drill;
                        }
                        if (bombUtils && typeof bombUtils.handleDrillerBomb === 'function') {
                            // Pass 'this' (the bomb instance) to handleDrillerBomb
                            drillerBombInstance = bombUtils.handleDrillerBomb(this, bombX, bombY, block, velocityX_drill, velocityY_drill);
                        } else {
                            console.warn("[Bomb.onHitBlock] Critical: bombUtils.handleDrillerBomb not found! Defaulting to blast.");
                            bombUtils.handleBlastBomb(bombX, bombY);
                            hasExploded = true;
                        }
                        // if (drillerBombInstance && scene.activeDrillerBombs && !scene.activeDrillerBombs.includes(drillerBombInstance)) {
                        //     scene.activeDrillerBombs.push(drillerBombInstance); // This should be handled within handleDrillerBomb or by CollisionManager post-call
                        // }
                        bombStuck = true; // Driller bombs "stick" initially
                        hasExploded = false; // Driller bombs don't explode on initial contact
                        break;
                    case BOMB_TYPES.RICOCHET:
                        this.isRicochet = true; // Ensure ricochet status
                        if (scene.debugMode) console.log("[Bomb.onHitBlock] Handling RICOCHET bomb contact with block. It should bounce.");
                        // Physics engine handles the bounce.
                        // Call CollisionManager's handleBouncyBlock for effects if needed by passing collisionManagerInstance
                        if (collisionManagerInstance && typeof collisionManagerInstance.handleBouncyBlock === 'function') {
                             collisionManagerInstance.handleBouncyBlock(block, this);
                        }
                        hasExploded = false;
                        bombStuck = false;
                        break;
                    default:
                        if (scene.debugMode) console.log(`[Bomb.onHitBlock] Unknown bomb type: ${bombType}, using BLAST.`);
                        bombUtils.handleBlastBomb(bombX, bombY);
                        hasExploded = true;
                        break;
                }
                effectProcessedThisCall = true;
                
                // Update the bomb's own hasExploded state based on the outcome
                // Sticky and Driller bombs set their own this.hasExploded within their specific handlers in BombUtils if they actually explode later.
                // For Ricochet, it's managed by its timer or boundary hits leading to explosion.
                if (bombType !== BOMB_TYPES.STICKY && bombType !== BOMB_TYPES.DRILLER && bombType !== BOMB_TYPES.RICOCHET) {
                    this.hasExploded = hasExploded;
                }

                // NEW: If the bomb has exploded, clean it up here.
                if (this.hasExploded) {
                    // Ensure its own countdowns are cleared (e.g. if a ricochet exploded early due to this hit)
                    if (this.countdown) {
                        this.countdown.remove();
                        this.countdown = null;
                    }
                    if (this.countdownText && this.countdownText.scene) {
                        this.countdownText.destroy();
                        this.countdownText = null;
                    }
                    // Clear trail if it exists (e.g. for ricochet bombs)
                    if (this.trailEmitter) {
                        this.trailEmitter.stop();
                        if (this.trailParticles && this.trailParticles.scene) {
                            this.trailParticles.destroy();
                            this.trailParticles = null;
                            this.trailEmitter = null;
                        }
                    }

                    if (this.scene) { // Check if bomb is still part of a scene
                        const launcher = scene.bombLauncher; // Get reference to BombLauncher from the scene context of onHitBlock
                        
                        this.destroy(); // 'this' is the bomb instance
                        
                        // Notify BombLauncher that its current bomb is gone
                        if (launcher && launcher.bomb === this) {
                            launcher.bomb = null;
                            launcher.bombState.active = false; // Mark as inactive in launcher
                        }
                        // Also clear GameScene's direct reference if it was pointing to this bomb
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
            // Log entry state
            // if (this.debugMode && this.bomb) { // Commented out
            //     const velocity = this.bomb.body?.velocity || {x: NaN, y: NaN};
            //     console.log(`[CheckStop] Entry: Type=${this.bomb.bombType || 'unknown'}, Active=${this.bombState.active}, Exploded=${this.bomb.hasExploded}, Vel=(${velocity.x?.toFixed(2)}, ${velocity.y?.toFixed(2)})`);
            // }

            // Skip if no bomb, bomb is not active, or bomb has been destroyed
            if (!this.bomb || !this.bombState.active || !this.bomb.scene) {
                // if (this.debugMode) console.log(`[CheckStop] Skip: No bomb, inactive, or not in scene.`); // Commented out
                return false;
            }
            
            // Safety check - if the bomb body is null or has been removed
            if (!this.bomb.body || this.bomb.hasExploded) {
                // if (this.debugMode) console.log(`[CheckStop] Skip: No body or already exploded`); // Commented out
                this.bombState.active = false;
                return false;
            }
            
            // Get the bomb type safely with proper fallbacks
            const bombType = this.bomb.bombType || this.scene.currentBombType || 'blast_bomb';
            
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
                                    case BOMB_TYPES.PIERCER: this.scene.bombUtils.handlePiercerBomb(bombX, bombY, {x: 0, y: 1}); break;
                                    case BOMB_TYPES.CLUSTER: this.scene.bombUtils.handleClusterBomb(bombX, bombY); break;
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
                        this.scene.time.delayedCall(1000, () => { // Quicker reset for next bomb
                            try {
                                if (this.scene.shotsRemaining > 0) {
                                     // this.cleanupExistingBomb(); // Careful: BombUtils may have already handled/destroyed current activeBomb
                                     // If this.bomb is null (set by BombUtils or above logic), cleanup is safe.
                                    if (this.bomb) this.cleanupExistingBomb();
                                    this.createBomb(this.scene.currentBombType || 'bomb');
                                } else {
                                    if (this.scene.checkLevelCompletion) this.scene.checkLevelCompletion();
                                }
                            } catch (e) {
                                console.error("Error in reset timer:", e);
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
            
            return false;
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
        this.scene.debugMode = this.debugMode; // Sync with scene
        
        if (this.debugMode) {
            // Create debug text if it doesn't exist
            if (!this.debugText) {
                this.debugText = this.scene.add.text(10, 100, 'BombLauncher Debug', { 
                    font: '16px Arial', 
                    fill: '#00ff00' 
                }).setDepth(1000);
            }
            console.log("BombLauncher debug mode enabled");
            this.updateDebugText("Debug mode enabled");
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
            // Create a silver bow shape using graphics
            const bowGraphics = this.scene.add.graphics();
            
            // Silver color with slight gradient
            const silverColor = 0xC0C0C0;
            const darkSilver = 0x909090;
            
            // Create bow arc
            bowGraphics.lineStyle(5, silverColor, 1);
            bowGraphics.beginPath();
            // Draw a semicircle arc for the bow
            bowGraphics.arc(0, 0, 40, Phaser.Math.DegToRad(150), Phaser.Math.DegToRad(390), false);
            bowGraphics.strokePath();
            
            // Add some details to make it look like a bow
            bowGraphics.lineStyle(3, darkSilver, 1);
            // Bow grip (middle part)
            bowGraphics.fillStyle(darkSilver, 1);
            bowGraphics.fillRect(-5, -10, 10, 20);
            
            // Generate a texture from the graphics
            bowGraphics.generateTexture('bow', 100, 100); // Ensure key is 'bow'
            bowGraphics.destroy(); // Destroy graphics object after texture generation
            
            // Create the bow image using the generated texture
            this.bow = this.scene.add.image(this.BOW_X, this.BOW_Y, 'bow');
            this.bow.setOrigin(0.5, 0.5);
            this.bow.setDepth(10); // Above all game elements but below UI
            
            // Initialize bowstring (elastic line)
            this.updateBowstring();
            
        } catch (error) {
            console.error("Error in createBow:", error);
        }
    }

    // Method to set the aiming state and manage visuals
    setAiming(isAiming) {
        this.isAiming = isAiming;
        // Update the scene's aiming flag as well, if the scene has one
        // This ensures consistency if other parts of the scene rely on scene.isAiming
        if (typeof this.scene.isAiming !== 'undefined') {
            this.scene.isAiming = isAiming;
        }

        if (!isAiming) {
            // Clear trajectory when aiming stops
            if (this.trajectoryGraphics && this.trajectoryGraphics.scene) {
                this.trajectoryGraphics.clear();
            }
            // Reset bowstring to default position
            this.updateBowstring();
        }
    }
} 