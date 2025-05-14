/**
 * CollisionManager.js
 * Handles the registration of collision events and directs collision handling.
 */
class CollisionManager {
    /**
     * Constructor for CollisionManager.
     * @param {Phaser.Scene} scene - The main game scene.
     */
    constructor(scene) {
        this.scene = scene;
        this.debugMode = this.scene.debugMode || false;
        if (this.debugMode) {
            console.log("[CollisionManager] Initialized");
        }
    }

    /**
     * Initializes the collision listeners.
     */
    initialize() {
        if (!this.scene || !this.scene.matter || !this.scene.matter.world) {
            console.error("[CollisionManager] Scene or matter world not available for collision setup.");
            return;
        }
        // Register the main collision event listener
        // The actual handler function (this.handleCollisionStart) will be implemented
        // to delegate to more specific handlers or call back to GameScene.
        this.scene.matter.world.on('collisionstart', this.handleCollisionStart, this);
        if (this.debugMode) {
            console.log("[CollisionManager] 'collisionstart' event listener registered.");
        }
    }

    /**
     * Main handler for the 'collisionstart' event.
     * This method will parse the event and delegate to more specific handlers.
     * @param {Phaser.Physics.Matter.Events.CollisionStartEvent} event - The collision event object.
     */
    handleCollisionStart(event) {
        if (!event || !event.pairs) {
            if (this.debugMode) {
                console.error("[CollisionManager] Invalid collision event received:", event);
            }
            return;
        }

        if (this.debugMode) {
            console.log("[CollisionManager] CollisionStart event triggered with", event.pairs.length, "pairs.");
        }

        try { // Outer try for the whole handler
            if (this.debugMode) console.log("[CollisionManager] Processing CollisionStart event internally.");

            const pairs = event.pairs;
            let overallBombExploded = false; // Tracks if any bomb exploded in this event
            let overallBombStuck = false;    // Tracks if any bomb got stuck

            // Process pairs in a try-catch to handle errors within loop gracefully
            try {
                const activeBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;
                
                if (!activeBomb) {
                    if (this.debugMode) console.log("[CollisionManager] No active bomb to process collisions for.");
                    return;
                }

                if (activeBomb.hasExploded && !(activeBomb.isSticky || activeBomb.isDriller)) { // Allow processing for sticky/driller even if marked exploded by a previous pair
                    if (this.debugMode) console.log("[CollisionManager] Ignoring collision for already definitively exploded bomb.");
                    return;
                }
                
                if (!activeBomb.active || !activeBomb.body) {
                    if (this.debugMode) console.log("[CollisionManager] No active bomb with body to process collisions for.");
                    return;
                }

                // Special handling for ricochet bombs - they don't explode on *block* collision through this path
                if (activeBomb.isRicochet || activeBomb.bombType === this.scene.BOMB_TYPES.RICOCHET) {
                    // Ricochet logic for block hits (if any beyond physics) would be in _handleBombToBlockCollision
                    // Here, we are checking before iterating pairs for general ricochet state.
                    // The main ricochet bounce off boundaries or blocks is handled by physics or specific handlers.
                }

                for (let i = 0; i < pairs.length; i++) {
                    let bombTypeCurrentPair; // Declared here for wider scope within the loop iteration
                    
                    try { // Inner try for individual pair processing
                        const bodyA = pairs[i].bodyA;
                        const bodyB = pairs[i].bodyB;
                        
                        if (!bodyA || !bodyB) continue;
                        if ((!bodyA.gameObject && !bodyA.label)) continue; // Check if it's a game object OR a labeled body
                        if ((!bodyB.gameObject && !bodyB.label)) continue;
                        
                        let bombBody, otherBody;
                        
                        if (bodyA.gameObject === activeBomb) {
                            bombBody = bodyA;
                            otherBody = bodyB;
                        } else if (bodyB.gameObject === activeBomb) {
                            bombBody = bodyB;
                            otherBody = bodyA;
                        } else {
                            continue; // This pair doesn't involve the active bomb
                        }
                            
                        const bombX = activeBomb.x;
                        const bombY = activeBomb.y;
                        bombTypeCurrentPair = activeBomb.bombType || this.scene.BOMB_TYPES.BLAST;
                            
                        // Collision with reflectiveBorder (Boundary)
                        if (!otherBody.gameObject && otherBody.label === 'reflectiveBorder') {
                            if (typeof this.handleBouncyBlock === 'function') {
                                // Create a representation for the border block
                                 const borderBlockRepresentation = { 
                                    body: otherBody, 
                                    x: (otherBody.bounds.min.x + otherBody.bounds.max.x) / 2,
                                    y: (otherBody.bounds.min.y + otherBody.bounds.max.y) / 2,
                                    // isReflectiveBorder: true // Could add a flag if needed by handler
                                };
                                this.handleBouncyBlock(borderBlockRepresentation, activeBomb);
                            }
                            if (activeBomb.bombType === this.scene.BOMB_TYPES.RICOCHET) {
                                activeBomb.isRicochet = true; 
                                activeBomb.lastBounceTime = Date.now();
                                activeBomb.lastBounceX = activeBomb.x;
                                activeBomb.lastBounceY = activeBomb.y;
                            }
                            // For reflective borders, we usually don't "explode" the bomb.
                            // The bounce is the primary interaction.
                            // We might want to `continue` to the next pair.
                            continue; 
                        }
                        
                        // Collision with a GameObject (e.g., an ice block)
                        if (otherBody.gameObject) {
                            const block = otherBody.gameObject;
                            if (!block.scene) { // Check if block is still valid
                                if (this.debugMode) console.log("[CollisionManager] Collided block no longer exists in scene.");
                                continue;
                            }

                            if (block.isActive && this.scene.iceBlocks && this.scene.iceBlocks.includes(block)) {
                                // Call the specific handler for bomb-to-block collisions
                                const collisionResult = this._handleBombToBlockCollision(activeBomb, block, bombTypeCurrentPair, bombX, bombY);
                                if (collisionResult.processed) {
                                    if (collisionResult.hasExploded) overallBombExploded = true;
                                    if (collisionResult.bombStuck) overallBombStuck = true;

                                    // If a standard bomb exploded, it shouldn't process more pairs in this event.
                                    // Sticky/Driller might continue to exist.
                                    if (collisionResult.hasExploded && 
                                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.STICKY &&
                                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.DRILLER &&
                                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.RICOCHET) {
                                        break; // Break from the for-loop over pairs
                                    }
                                }
                            }
                        }
                    } catch (error_pair) {
                        console.error("[CollisionManager] Error processing collision pair:", error_pair, "Pair Index:", i, "BombType for pair:", bombTypeCurrentPair);
                    }
                    // Check if a standard bomb has exploded to break out of the loop.
                    // This needs careful handling if overallBombExploded is set by _handleBombToBlockCollision
                    if (overallBombExploded && 
                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.STICKY &&
                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.DRILLER &&
                        bombTypeCurrentPair !== this.scene.BOMB_TYPES.RICOCHET) {
                        break; 
                    }
                } // End of for loop for pairs
            } catch (error_main_pairs_process) {
                console.error("[CollisionManager] Error in main collision pairs processing block:", error_main_pairs_process);
            } finally { // This finally block is for the inner try that starts with `const activeBomb = ...`
                // This block executes regardless of an error in the pairs processing.
                // Schedule bomb reset in GameScene if a bomb exploded or got stuck, and shots remain.
                if ((overallBombExploded || overallBombStuck) && this.scene.shotsRemaining > 0) {
                    if (this.debugMode) console.log(`[CollisionManager] Scheduling bomb reset in GameScene due to explosion (${overallBombExploded}) or stuck (${overallBombStuck})`);
                    this.scene.time.delayedCall(1000, () => {
                        const noBombAvailable = (!this.scene.bombLauncher || !this.scene.bombLauncher.bomb) && !this.scene.bomb;
                        if (noBombAvailable && typeof this.scene.resetBomb === 'function') {
                            this.scene.resetBomb();
                        }
                    });
                } else if (overallBombExploded || overallBombStuck) { // No shots remaining, but bomb action occurred
                     if (typeof this.scene.checkLevelCompletion === 'function') {
                        this.scene.checkLevelCompletion(); // Check if level is complete or game over
                    }
                }

                // Bomb destruction logic if it truly exploded (non-sticky, non-driller, non-ricochet)
                // This needs to reference `activeBomb` which is only in scope if the inner try didn't fail early.
                // This part is tricky because `activeBomb` might be from the outer scope.
                // Let's get activeBomb again, or rely on the flags.
                const finalActiveBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;
                if (finalActiveBomb && overallBombExploded &&
                    finalActiveBomb.bombType !== this.scene.BOMB_TYPES.STICKY &&
                    finalActiveBomb.bombType !== this.scene.BOMB_TYPES.DRILLER &&
                    finalActiveBomb.bombType !== this.scene.BOMB_TYPES.RICOCHET) {
                    
                    if (finalActiveBomb.countdownText && finalActiveBomb.countdownText.scene) {
                        finalActiveBomb.countdownText.destroy();
                        finalActiveBomb.countdownText = null;
                    }
                    if (finalActiveBomb.countdown) {
                        finalActiveBomb.countdown.remove();
                        finalActiveBomb.countdown = null;
                    }

                    if (finalActiveBomb.scene) finalActiveBomb.destroy();
                    if (this.debugMode) console.log(`[CollisionManager] Called finalActiveBomb.destroy() for exploded ${finalActiveBomb.bombType}`);
                    
                    if (this.scene.bombLauncher && this.scene.bombLauncher.bomb === finalActiveBomb) {
                        this.scene.bombLauncher.bomb = null;
                        this.scene.bombLauncher.bombState.active = false;
                    }
                    if (this.scene.bomb === finalActiveBomb) {
                        this.scene.bomb = null;
                    }
                }
            } // End of finally for inner try
        } catch (error) { // Outer catch for the whole handler
            console.error("[CollisionManager] Outer error in handleCollisionStart:", error);
            // Attempt a safe reset if an unexpected error occurs in the handler's main structure
            if (typeof this.scene.resetBomb === 'function') {
                this.scene.time.delayedCall(1000, () => {
                     const noBombAvailable = (!this.scene.bombLauncher || !this.scene.bombLauncher.bomb) && !this.scene.bomb;
                     if (this.scene.shotsRemaining > 0 && noBombAvailable) this.scene.resetBomb();
                });
            }
        }
    }

    /**
     * Handles collision between an active bomb and a game block (e.g., ice block).
     * @private
     * @param {Phaser.Physics.Matter.Image} activeBomb - The active bomb instance.
     * @param {Phaser.GameObjects.GameObject} block - The block instance.
     * @param {string} bombType - The type of the bomb.
     * @param {number} bombX - The x-coordinate of the bomb at collision.
     * @param {number} bombY - The y-coordinate of the bomb at collision.
     * @returns {{processed: boolean, hasExploded: boolean, bombStuck: boolean}} Result of the collision.
     */
    _handleBombToBlockCollision(activeBomb, block, bombType, bombX, bombY) {
        let hasExploded = false;
        let bombStuck = false;
        let effectProcessedThisCall = false; // Initialize this

        activeBomb.hasHitIceBlock = true;
        if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Bomb hit ice block.");

        // Bouncy block (non-border)
        if (block.blockType === 'bouncy') {
            const bombTypeFromActive = activeBomb.bombType || this.scene.BOMB_TYPES.BLAST;
            if (bombTypeFromActive !== this.scene.BOMB_TYPES.STICKY) {
                if (activeBomb.body && typeof this.handleBouncyBlock === 'function') {
                    this.handleBouncyBlock(block, activeBomb);
                } else {
                    if (!activeBomb.body) console.warn("[CollisionManager._handleBombToBlockCollision] Active bomb has no body for bouncy collision.");
                    if (typeof this.handleBouncyBlock !== 'function') console.warn("[CollisionManager._handleBombToBlockCollision] CollisionManager.handleBouncyBlock not found for bouncy ice block!");
                }
                if (activeBomb.bombType === this.scene.BOMB_TYPES.RICOCHET) {
                    activeBomb.isRicochet = true;
                    activeBomb.lastBounceTime = Date.now();
                    activeBomb.lastBounceX = activeBomb.x;
                    activeBomb.lastBounceY = activeBomb.y;
                }
                return { processed: true, hasExploded: false, bombStuck: false }; // Bounced
            }
        }

        // Dynamite block
        if (block.blockType === 'dynamite' &&
            (bombType === this.scene.BOMB_TYPES.BLAST || bombType === this.scene.BOMB_TYPES.SHATTERER)) {
            if (typeof this.scene.createDynamiteDestroyEffect === 'function') {
                this.scene.createDynamiteDestroyEffect(block.x, block.y);
            }
            if (this.scene.bombUtils && typeof this.scene.bombUtils.destroyBlocksInRadius === 'function') {
                this.scene.bombUtils.destroyBlocksInRadius(block.x, block.y, 200);
            }
            if (this.scene.bombUtils && typeof this.scene.bombUtils.destroyIceBlock === 'function') {
                this.scene.bombUtils.destroyIceBlock(block);
            }
            effectProcessedThisCall = true; 
            // Note: The original bomb that hit the dynamite might still need to explode based on its own type.
            // This logic currently doesn't make the *original* bomb explode here, only the dynamite.
        }

        // If the bomb was already marked as exploded (e.g. by hitting dynamite, or in a previous pair processing for multi-hit bombs if that were a thing)
        // and it's not a type that persists (like sticky or driller), then don't re-apply its effect.
        if (activeBomb.hasExploded && bombType !== this.scene.BOMB_TYPES.STICKY && bombType !== this.scene.BOMB_TYPES.DRILLER) {
             return { processed: effectProcessedThisCall, hasExploded: true, bombStuck: false }; // Return current state
        }

        // General bomb effect processing
        // Set default assumption, then override for sticky/driller.
        // This flag is critical for the logic below.
        let originalBombShouldExplode = true; 

        try {
            if (!this.scene.bombUtils) {
                console.error("[CollisionManager._handleBombToBlockCollision] this.scene.bombUtils is not defined!");
                activeBomb.hasExploded = true; // Ensure it's marked
                return { processed: true, hasExploded: true, bombStuck: false }; // Critical failure
            }

            switch (bombType) {
                case this.scene.BOMB_TYPES.BLAST:
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling BLAST bomb.");
                    this.scene.bombUtils.handleBlastBomb(bombX, bombY);
                    hasExploded = true;
                    break;
                case this.scene.BOMB_TYPES.PIERCER:
                    let velocity = (activeBomb && activeBomb.body) ? activeBomb.body.velocity : { x: 0, y: 1 };
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling PIERCER bomb.");
                    this.scene.bombUtils.handlePiercerBomb(bombX, bombY, velocity);
                    hasExploded = true;
                    break;
                case this.scene.BOMB_TYPES.CLUSTER:
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling CLUSTER bomb.");
                    this.scene.bombUtils.handleClusterBomb(bombX, bombY);
                    hasExploded = true;
                    break;
                case this.scene.BOMB_TYPES.STICKY:
                    originalBombShouldExplode = false; // Sticky bombs stick, don't explode on this contact
                    activeBomb.isSticky = true;
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling STICKY bomb.");
                    if (typeof this.scene.bombUtils.handleStickyBomb === 'function') {
                        this.scene.bombUtils.handleStickyBomb(bombX, bombY, block);
                    } else if (typeof this.scene.handleStickyBomb === 'function') { 
                        this.scene.handleStickyBomb(bombX, bombY, block);
                    } else {
                        console.warn("[CollisionManager._handleBombToBlockCollision] No handler for STICKY bomb!");
                        this.scene.bombUtils.handleBlastBomb(bombX, bombY); 
                        hasExploded = true; originalBombShouldExplode = true; 
                    }
                    bombStuck = true;
                    break;
                case this.scene.BOMB_TYPES.SHATTERER:
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling SHATTERER bomb.");
                    this.scene.bombUtils.handleShattererBomb(bombX, bombY);
                    hasExploded = true;
                    break;
                case this.scene.BOMB_TYPES.DRILLER:
                    originalBombShouldExplode = false; // Driller bombs drill
                    activeBomb.isDriller = true;
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling DRILLER bomb.");
                    let drillerBombInstance = null;
                    let velocityX_drill = 0, velocityY_drill = 0;
                    if (activeBomb && activeBomb.body && activeBomb.body.velocity) {
                        velocityX_drill = activeBomb.body.velocity.x;
                        velocityY_drill = activeBomb.body.velocity.y;
                        activeBomb.storedVelocityX = velocityX_drill;
                        activeBomb.storedVelocityY = velocityY_drill;
                    }
                    if (this.scene.bombUtils && typeof this.scene.bombUtils.handleDrillerBomb === 'function') {
                        drillerBombInstance = this.scene.bombUtils.handleDrillerBomb(activeBomb, bombX, bombY, block, velocityX_drill, velocityY_drill);
                    } else {
                        console.warn("[CollisionManager._handleBombToBlockCollision] Critical: this.scene.bombUtils.handleDrillerBomb not found! Defaulting to blast.");
                        this.scene.bombUtils.handleBlastBomb(bombX, bombY); 
                        hasExploded = true; originalBombShouldExplode = true;
                    }
                    if (drillerBombInstance && this.scene.activeDrillerBombs && !this.scene.activeDrillerBombs.includes(drillerBombInstance)) {
                        this.scene.activeDrillerBombs.push(drillerBombInstance);
                    }
                    bombStuck = true; 
                    break;
                case this.scene.BOMB_TYPES.RICOCHET:
                    originalBombShouldExplode = false; // Ricochet bombs do not explode on normal block contact
                    activeBomb.isRicochet = true; // Ensure ricochet status is maintained/set
                    if (this.debugMode) console.log("[CollisionManager._handleBombToBlockCollision] Handling RICOCHET bomb contact with block. It should bounce.");
                    // Physics engine handles the bounce based on bomb's restitution properties.
                    // No specific explosion or sticking logic here.
                    hasExploded = false;
                    bombStuck = false;
                    // It might be useful to call handleBouncyBlock if we want consistent visual/audio cues for ricochet hits on any block
                    // For now, just letting physics handle it.
                    if (this.handleBouncyBlock && block && activeBomb) {
                         // Treat all blocks like bouncy for ricochet for effect, but don't change physics outcomes here.
                         this.handleBouncyBlock(block, activeBomb);
                    }
                    break;
                default:
                    if (this.debugMode) console.log(`[CollisionManager._handleBombToBlockCollision] Unknown bomb type: ${bombType}, using BLAST.`);
                    this.scene.bombUtils.handleBlastBomb(bombX, bombY);
                    hasExploded = true;
                    break;
            }
            effectProcessedThisCall = true; // Mark that a switch case was handled
        } catch (error_bomb_type) {
            console.error("[CollisionManager._handleBombToBlockCollision] Error handling bomb type:", error_bomb_type, "Bomb Type:", bombType);
            hasExploded = true; // Assume it exploded if error occurs
        }
        
        activeBomb.hasExploded = originalBombShouldExplode ? hasExploded : false; // Set the bomb's final state
        
        return { processed: effectProcessedThisCall, hasExploded: activeBomb.hasExploded, bombStuck };
    }

    // New method to handle bouncy block reflections
    handleBouncyBlock(block, bomb) {
        if (!bomb || !block) return;

        try {
            // Ensure the bomb still exists in the scene
            if (!bomb.scene) {
                console.warn("[CollisionManager.handleBouncyBlock] Bomb no longer in scene during bounce handling");
                return;
            }
            
            // Safety check for required bomb properties
            if (!bomb.body) {
                console.warn("[CollisionManager.handleBouncyBlock] Bomb has no physics body during bounce handling");
                return;
            }
            
            // Check if this is a reflective border (from a specific label)
            const isReflectiveBorder = block.body && block.body.label === 'reflectiveBorder';
            
            // Get the current velocity (with safety checks)
            let vx = 0, vy = 0;
            if (bomb.body && bomb.body.velocity) {
                vx = bomb.body.velocity.x;
                vy = bomb.body.velocity.y;
            }
            
            // Get current speed for later use
            const currentSpeed = Math.sqrt(vx * vx + vy * vy);
            
            // Initialize normal vector variables
            let nx = 0, ny = 0;
            
            // Determine the correct visual effect position for the bounce
            let effectX = block.x;
            let effectY = block.y;
            
            if (isReflectiveBorder) {
                // For reflective borders, we need to calculate normal differently based on which border was hit
                // The normal should point inward from the border
                
                // Get the border dimensions
                const borderWidth = block.body.bounds.max.x - block.body.bounds.min.x;
                const borderHeight = block.body.bounds.max.y - block.body.bounds.min.y;
                
                // For border blocks, use the bomb's position for the visual effect,
                // but clamp to the nearest border edge
                if (borderWidth > borderHeight) {
                    // This is a horizontal border (top or bottom)
                    effectX = bomb.x; // Keep x position of the bomb
                    // Clamp y to the border edge - use bomb's x but border's y
                    effectY = (block.y < this.scene.cameras.main.height / 2) ? 
                        block.body.bounds.max.y : // Top border: use bottom edge
                        block.body.bounds.min.y;  // Bottom border: use top edge
                    
                    // Normal should point up or down
                    nx = 0;
                    ny = (block.y < this.scene.cameras.main.height / 2) ? 1 : -1;  // Top border: normal points down, Bottom border: normal points up
                } else {
                    // This is a vertical border (left or right)
                    effectY = bomb.y; // Keep y position of the bomb
                    // Clamp x to the border edge - use bomb's y but border's x
                    effectX = (block.x < this.scene.cameras.main.width / 2) ? 
                        block.body.bounds.max.x : // Left border: use right edge
                        block.body.bounds.min.x;  // Right border: use left edge
                    
                    // Normal should point left or right  
                    nx = (block.x < this.scene.cameras.main.width / 2) ? 1 : -1;  // Left border: normal points right, Right border: normal points left
                    ny = 0;
                }
                
                // Create the bounce effect at the correct position
                if (this.scene.blockUtils) {
                    this.scene.blockUtils.createBouncyHitEffect(effectX, effectY);
                }
            } else {
                // For normal bouncy blocks, use the block's position for the effect
                if (this.scene.blockUtils) {
                    this.scene.blockUtils.createBouncyHitEffect(block.x, block.y);
                }
                
                // For normal bouncy blocks, calculate normal as vector from block center to bomb
                nx = bomb.x - block.x;
                ny = bomb.y - block.y;
        
                // Normalize the normal vector
                const length = Math.sqrt(nx * nx + ny * ny);
                if (length > 0) {
                    nx /= length;
                    ny /= length;
                } else {
                    // Fallback if positions are the same (should be rare)
                    nx = 0;
                    ny = -1; // Default upward normal
                }
            }
            
            // Calculate the reflection with proper math:
            // r = v - 2(v·n)n
            // First, calculate dot product v·n
            const dotProduct = vx * nx + vy * ny;
            
            // Calculate reflection vector components
            let reflectX = vx - 2 * dotProduct * nx;
            let reflectY = vy - 2 * dotProduct * ny;
            
            // Add a small random factor for more natural bouncing (±10%)
            const randomFactor = 0.9 + Math.random() * 0.2;
            
            // Calculate the reflection speed, with a slight boost to maintain motion
            const restitution = 0.95; // 95% of energy maintained
            const targetSpeed = currentSpeed * restitution;
            
            // Normalize and rescale the reflection vector to match the target speed
            const reflectSpeed = Math.sqrt(reflectX * reflectX + reflectY * reflectY);
            if (reflectSpeed > 0) {
                reflectX = (reflectX / reflectSpeed) * targetSpeed * randomFactor;
                reflectY = (reflectY / reflectSpeed) * targetSpeed * randomFactor;
            }
            
            // Apply the reflection vector as the new velocity
            bomb.setVelocity(reflectX, reflectY);
            
            // Ensure the bomb is not embedded in the block by moving it slightly along the normal
            const pushDistance = 5; // 5 pixels away from collision point
            bomb.x += nx * pushDistance;
            bomb.y += ny * pushDistance;
            
            // If this is a ricochet bomb, update its bounce tracking
            if (bomb.isRicochet || bomb.bombType === this.scene.BOMB_TYPES.RICOCHET) {
                bomb.lastBounceTime = Date.now();
                bomb.lastBounceX = bomb.x;
                bomb.lastBounceY = bomb.y;
                bomb.bounceCount = (bomb.bounceCount || 0) + 1;
                
                // Update countdown text position
                if (bomb.countdownText && bomb.countdownText.scene) {
                    bomb.countdownText.setPosition(bomb.x, bomb.y - 30);
                }
            
                // Create bounce effect
                if (this.scene.bombUtils) {
                    this.scene.bombUtils.createBounceFlash(effectX, effectY);
                }
            }
            
            // Add a camera shake effect for feedback
            this.scene.cameras.main.shake(100, 0.003);
            
        } catch (error) {
            console.error("[CollisionManager.handleBouncyBlock] Error in handleBouncyBlock:", error);
        }
    }

    /**
     * Cleans up any listeners or resources.
     */
    shutdown() {
        if (this.scene && this.scene.matter && this.scene.matter.world) {
            this.scene.matter.world.off('collisionstart', this.handleCollisionStart, this);
        }
        if (this.debugMode) {
            console.log("[CollisionManager] Shutdown, 'collisionstart' listener removed.");
        }
    }
} 