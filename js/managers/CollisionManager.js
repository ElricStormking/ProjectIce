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
    }

    /**
     * Initializes the collision listeners.
     */
    initialize() {
        if (!this.scene || !this.scene.matter || !this.scene.matter.world) {
            return;
        }
        this.scene.matter.world.on('collisionstart', this.handleCollisionStart, this);
    }

    /**
     * Main handler for the 'collisionstart' event.
     * This method will parse the event and delegate to more specific handlers.
     * @param {Phaser.Physics.Matter.Events.CollisionStartEvent} event - The collision event object.
     */
    handleCollisionStart(event) {
        if (!event || !event.pairs) {
            return;
        }

        const pairs = event.pairs;
        let overallBombExploded = false; // Tracks if any bomb exploded in this event
        let overallBombStuck = false;    // Tracks if any bomb got stuck

        // Process pairs in a try-catch to handle errors within loop gracefully
        try {
            const activeBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;
            
            if (!activeBomb) {
                return;
            }

            if (activeBomb.hasExploded && !(activeBomb.isSticky || activeBomb.isDriller)) { // Allow processing for sticky/driller even if marked exploded by a previous pair
                return;
            }
            
            if (!activeBomb.active || !activeBomb.body) {
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
                        const collidedObject = otherBody.gameObject;
                        if (!collidedObject.scene) { // Check if block is still valid
                            continue;
                        }

                        // Check if collidedObject is another bomb
                        const isOtherObjectABomb = collidedObject.bombType && 
                                                   (collidedObject.isLaunched || collidedObject.isSticky || collidedObject.isDriller || collidedObject.isRicochet) &&
                                                   collidedObject !== activeBomb;

                        if (isOtherObjectABomb) {
                            const bombToBombResult = this._handleBombToBombCollision(activeBomb, collidedObject);
                            if (bombToBombResult.processed) {
                                if (bombToBombResult.exploded) overallBombExploded = true;
                                // If activeBomb exploded, break from pair loop
                                if (overallBombExploded) {
                                    break; 
                                }
                            }
                        } else if (collidedObject.isActive && this.scene.iceBlocks && this.scene.iceBlocks.includes(collidedObject)) {
                            // It's an ice block, call the specific handler for bomb-to-block collisions
                            const collisionResult = this._handleBombToBlockCollision(activeBomb, collidedObject, bombTypeCurrentPair, bombX, bombY);
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
                if (this.scene.bombLauncher && this.scene.bombLauncher.bomb === finalActiveBomb) {
                    this.scene.bombLauncher.bomb = null;
                    this.scene.bombLauncher.bombState.active = false;
                }
                if (this.scene.bomb === finalActiveBomb) {
                    this.scene.bomb = null;
                }
            }
        } // End of finally for inner try
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

        let effectProcessedThisCall = false;
        let overallHasExploded = false; // Use a different name to avoid confusion with bomb's property
        let overallBombStuck = false;

        activeBomb.hasHitIceBlock = true; // Still useful to set this flag on the bomb

        // Bouncy block (non-border) - This specific check should be inside the bomb's onHitBlock or a general pre-check
        // For now, let's assume the bomb's onHitBlock for Ricochet or other types handles bouncy blocks appropriately.
        // The new onHitBlock for Ricochet *does* call collisionManager.handleBouncyBlock.
        // Other bombs might not bounce by default off regular ice blocks that happen to be bouncy type.
        // This specific early return for STICKY on BOUNCY might need to be preserved or moved to STICKY bomb's onHitBlock.
        if (block.blockType === 'bouncy') {
            const bombTypeFromActive = activeBomb.bombType || this.scene.BOMB_TYPES.BLAST;
            if (bombTypeFromActive === this.scene.BOMB_TYPES.STICKY) {
                 // Sticky bombs should not bounce off bouncy blocks, they should stick.
                 // So we let it proceed to the bomb's onHitBlock method.
            } else if (bombTypeFromActive === this.scene.BOMB_TYPES.RICOCHET) {
                // Ricochet bomb's onHitBlock will call handleBouncyBlock, so let it proceed.
            } else {
                // For other bomb types hitting a bouncy block that is NOT a border
                if (activeBomb.body && typeof this.handleBouncyBlock === 'function') {
                    this.handleBouncyBlock(block, activeBomb);
                }
                return { processed: true, hasExploded: false, bombStuck: false }; // Bounced, non-sticky, non-ricochet
            }
        }
        
        // Dynamite block - This logic should ideally also move into the bomb's onHitBlock or a specific handler in BombUtils called by it.
        // For now, keeping it here means the bomb's onHitBlock might run *after* dynamite explodes.
        if (block.blockType === 'dynamite' &&
            (activeBomb.bombType === this.scene.BOMB_TYPES.BLAST || activeBomb.bombType === this.scene.BOMB_TYPES.SHATTERER)) {

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
            // The original bomb (blast/shatterer) might still explode based on its own onHitBlock logic.
        }

        // If the bomb was already marked as exploded (e.g., by a previous pair in a multi-hit scenario, or by hitting dynamite above)
        // and it's not a type that persists (like sticky or driller or ricochet), then don't re-apply its effect.
        if (activeBomb.hasExploded && 
            activeBomb.bombType !== this.scene.BOMB_TYPES.STICKY && 
            activeBomb.bombType !== this.scene.BOMB_TYPES.DRILLER &&
            activeBomb.bombType !== this.scene.BOMB_TYPES.RICOCHET) {
             return { processed: effectProcessedThisCall, hasExploded: true, bombStuck: false };
        }

        // Call the bomb's own handler
        if (typeof activeBomb.onHitBlock === 'function') {
            const result = activeBomb.onHitBlock(block, this); // Pass CollisionManager instance as second arg
            effectProcessedThisCall = result.processed || effectProcessedThisCall; // Combine with dynamite effect processing
            overallHasExploded = result.hasExploded;
            overallBombStuck = result.bombStuck;

            // The bomb's onHitBlock method is now responsible for setting activeBomb.hasExploded for most types.
            // For STICKY, DRILLER, RICOCHET, their hasExploded state is managed differently (e.g., later trigger or timer).
            // So, we trust the returned `overallHasExploded` for the immediate outcome of this hit.
        } else {
            // Fallback if onHitBlock is not defined (should not happen if BombLauncher sets it up)
            console.warn(`[CollisionManager._handleBombToBlockCollision] activeBomb.onHitBlock is not a function for bombType: ${activeBomb.bombType}. Defaulting to blast bomb effect.`);
            if (this.scene.bombUtils) {
                this.scene.bombUtils.handleBlastBomb(activeBomb.x, activeBomb.y);
            }
            activeBomb.hasExploded = true; // Mark as exploded
            overallHasExploded = true;
            effectProcessedThisCall = true;
        }
        
        return { processed: effectProcessedThisCall, hasExploded: overallHasExploded, bombStuck: overallBombStuck };
    }

    /**
     * Handles collision between two bombs.
     * @private
     * @param {Phaser.Physics.Matter.Image} bombA - The bomb initiating the collision (usually the active launched bomb).
     * @param {Phaser.Physics.Matter.Image} bombB - The other bomb involved in the collision.
     * @returns {{processed: boolean, exploded: boolean}} Result of the collision.
     */
    _handleBombToBombCollision(bombA, bombB) {
        if (!bombA || !bombA.scene || !bombB || !bombB.scene) {
            return { processed: false, exploded: false };
        }

        if (bombA.hasExploded) { // Don't re-explode bombA if it's already exploded
            return { processed: false, exploded: false };
        }

        const explodingTypes = [
            this.scene.BOMB_TYPES.BLAST,
            this.scene.BOMB_TYPES.PIERCER,
            this.scene.BOMB_TYPES.CLUSTER,
            this.scene.BOMB_TYPES.SHATTERER
        ];

        let hasExploded = false;
        let processed = false;

        // Check if bombA is one of the types that should explode on contact with another bomb
        if (explodingTypes.includes(bombA.bombType)) {
            // Ensure bombB is an actual bomb (e.g., a launched, sticky, or driller bomb)
            // and not some other miscellaneous game object that might have similar properties.
            // A simple check for bombType on bombB is a good indicator.
            if (bombB.bombType && (bombB.isLaunched || bombB.isSticky || bombB.isDriller || bombB.isRicochet)) {
                const bombAX = bombA.x;
                const bombAY = bombA.y;

                // Call the appropriate handler for bombA
                switch (bombA.bombType) {
                    case this.scene.BOMB_TYPES.BLAST:
                        this.scene.bombUtils.handleBlastBomb(bombAX, bombAY);
                        break;
                    case this.scene.BOMB_TYPES.PIERCER:
                        // Piercer needs velocity. If bombA's body is gone, this might be tricky.
                        // Assume velocity is still relevant from the impact.
                        const velocityA_piercer = bombA.body ? { x: bombA.body.velocity.x, y: bombA.body.velocity.y } : { x: 0, y: 1 }; // Default if no body
                        this.scene.bombUtils.handlePiercerBomb(bombAX, bombAY, velocityA_piercer);
                        break;
                    case this.scene.BOMB_TYPES.CLUSTER:
                        const velocityA_cluster = bombA.body ? { x: bombA.body.velocity.x, y: bombA.body.velocity.y } : { x: 0, y: 0 }; // Default if no body
                        this.scene.bombUtils.handleClusterBomb(bombAX, bombAY, velocityA_cluster);
                        break;
                    case this.scene.BOMB_TYPES.SHATTERER:
                        this.scene.bombUtils.handleShattererBomb(bombAX, bombAY);
                        break;
                }

                bombA.hasExploded = true;
                hasExploded = true;
                processed = true;

                // Cleanup bombA. Some handlers might do partial cleanup.
                // This ensures comprehensive cleanup.
                // Check if bombA still exists and is in the scene before cleaning.
                if (bombA.scene) {
                     // If bombA is the current active bomb in the launcher, clear it.
                    if (this.scene.bombLauncher && this.scene.bombLauncher.bomb === bombA) {
                        this.scene.bombLauncher.bomb = null;
                        if(this.scene.bombLauncher.bombState) this.scene.bombLauncher.bombState.active = false;
                    }
                    if (this.scene.bomb === bombA) { // Also clear direct scene reference if it matches
                        this.scene.bomb = null;
                    }
                    this.scene.bombUtils.cleanupBombResources(bombA); // This should destroy the GameObject
                }


                // The explosion from bombA (e.g., handleBlastBomb) should trigger bombB
                // if bombB is a type that can be chain-reacted (like Sticky via triggerStickyBomb).
                // No direct action on bombB is needed here for its explosion, that's part of the bombA's effect.
            } else {
                
            }
        } else {
            
        }

        return { processed, exploded: hasExploded };
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
                
                // NEW: Destroy blocks at bounce point for ricochet bombs
                if (!isReflectiveBorder) { // Only destroy blocks when hitting regular blocks, not borders
                    console.log(`[CollisionManager.handleBouncyBlock] Ricochet bomb destroying blocks at (${effectX}, ${effectY})`);
                    
                    // Destroy the block it collided with
                    if (block && block.isActive && this.scene.destroyIceBlock) {
                        this.scene.destroyIceBlock(block);
                    }
                    
                    // Also destroy blocks in a small radius around the collision
                    if (this.scene.bombUtils && this.scene.bombUtils.destroyBlocksInRadius) {
                        this.scene.bombUtils.destroyBlocksInRadius(effectX, effectY, 40);
                    } else if (this.scene.destroyBlocksInRadius) {
                        this.scene.destroyBlocksInRadius(effectX, effectY, 40);
                    }
                    
                    // Check for sticky bombs too
                    if (this.scene.triggerStickyBomb) {
                        this.scene.triggerStickyBomb(effectX, effectY, 40);
                    }
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
    }
} 