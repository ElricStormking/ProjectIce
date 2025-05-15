// BombUtils.js - Contains utility functions for working with bombs
class BombUtils {
    constructor(scene) {
        this.scene = scene;
    }
    
    // Create a dynamic bomb with appropriate physics
    createDynamicBomb(x, y, bombType, forceX, forceY) {
        // Set bomb properties based on type
        let bombProperties = {
            restitution: 0.9, // Increased for better bouncing in ultra-low gravity
            friction: 0.01, // Reduced for less surface friction
            density: 0.0003, // Keep the same density
            frictionAir: 0.001 // Reduced for less air resistance
        };
        
        // Adjust properties for special bomb types
        switch(bombType) {
            case this.scene.BOMB_TYPES.PIERCER:
                // Piercer has lower friction and higher density
                bombProperties.friction = 0.002;
                bombProperties.frictionAir = 0.0008;
                bombProperties.density = 0.0005;
                break;
                
            case this.scene.BOMB_TYPES.CLUSTER:
                // Cluster is a bit lighter
                bombProperties.density = 0.0002;
                bombProperties.frictionAir = 0.001;
                break;
                
            case this.scene.BOMB_TYPES.STICKY:
                // Sticky bombs should be a bit lighter too
                bombProperties.density = 0.0003;
                bombProperties.frictionAir = 0.001;
                break;
                
            case this.scene.BOMB_TYPES.SHATTERER:
                // Shatterer is heavier but still needs adjustment
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0009;
                break;
                
            case this.scene.BOMB_TYPES.DRILLER:
                // Driller needs good momentum
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0008;
                break;
        }
        
        // Create the bomb with appropriate properties
        const bomb = this.scene.matter.add.image(x, y, bombType, null, bombProperties);
        bomb.setCircle(30); // Set physics circle radius to 30 (half of 60x60)
        bomb.bombType = bombType; // Store the bomb type for later use
        bomb.setDepth(12); // Same depth as static bomb
        
        // Set bomb size to 60x60
        bomb.setDisplaySize(60, 60);
        
        // Mark as a launched bomb (not static at slingshot)
        bomb.isLaunched = true;
        bomb.hasHitIceBlock = false;
        
        // Store initial velocity for driller and sticky bombs
        bomb.storedVelocityX = forceX * 100; // Amplify for better storage
        bomb.storedVelocityY = forceY * 100;
        
        // Apply impulse (instant force)
        this.scene.matter.body.applyForce(bomb.body, 
            { x: x, y: y }, 
            { x: forceX, y: forceY });
        
        // Track when the bomb was launched
        bomb.launchTime = this.scene.time.now;
        
        return bomb;
    }
    
    // Handle blast bomb explosion
    handleBlastBomb(x, y) {
        this.createExplosion(x, y);
        this.destroyBlocksInRadius(x, y, 150);
        
        // Check if any sticky bombs are in range and trigger them
        this.scene.triggerStickyBomb(x, y, 150);
    }
    
    // Handle piercer bomb effect
    handlePiercerBomb(x, y, providedVelocity) {
        let velocity;
        const activeLaunchedBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;

        if (providedVelocity) {
            velocity = providedVelocity;
            console.log("Using provided velocity for piercer bomb:", velocity);
        } else if (activeLaunchedBomb && activeLaunchedBomb.body && activeLaunchedBomb.body.velocity) {
            velocity = activeLaunchedBomb.body.velocity;
            console.log("Using current active launched bomb velocity for piercer bomb:", velocity);
        } else {
            console.log("No velocity available for piercer bomb (no active launched bomb or no provided velocity), using default downward direction");
            velocity = { x: 0, y: 1 };
        }
        
        // Normalize velocity to get direction
        const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const dirX = magnitude > 0 ? velocity.x / magnitude : 0;
        const dirY = magnitude > 0 ? velocity.y / magnitude : 1;
        
        // Create a narrower but longer explosion effect
        const lineLength = 300;
        
        // Create visual effect - smaller explosion
        this.createExplosion(x, y);
        
        // Create piercing line particles
        const particles = this.scene.add.particles('particle');
        const emitter = particles.createEmitter({
            speed: { min: 20, max: 50 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: 0x77aaff // Blue tint to match the bomb
        });
        
        // Emit along the trajectory line
        for (let i = 0; i < lineLength; i += 10) {
            const pointX = x + dirX * i;
            const pointY = y + dirY * i;
            emitter.explode(3, pointX, pointY);
            
            // Destroy blocks along the line
            this.destroyBlocksInRadius(pointX, pointY, 30);
            
            // Check for sticky bombs along the line
            if (i % 50 === 0) { // Check every 50 pixels to avoid too many calculations
                this.scene.triggerStickyBomb(pointX, pointY, 60);
            }
        }
        
        // Clean up particles
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
    }
    
    // Handle cluster bomb explosions
    handleClusterBomb(x, y) {
        // Create main explosion (smaller than blast bomb)
        this.createExplosion(x, y);
        this.destroyBlocksInRadius(x, y, 100);
        
        // Check for sticky bombs in primary explosion
        this.scene.triggerStickyBomb(x, y, 100);
        
        // Create 3-5 smaller explosions around the main one
        const numClusters = Phaser.Math.Between(3, 5);
        const clusterRadius = 150;
        
        for (let i = 0; i < numClusters; i++) {
            // Calculate random positions around the main explosion
            const angle = Math.random() * Math.PI * 2;
            const distance = 70 + Math.random() * clusterRadius;
            const clusterX = x + Math.cos(angle) * distance;
            const clusterY = y + Math.sin(angle) * distance;
            
            // Add delay based on distance from center
            const delay = distance * 2;
            
            // Create delayed cluster explosion
            this.scene.time.delayedCall(delay, () => {
                // Create mini explosion
                this.createMiniExplosion(clusterX, clusterY);
                // Destroy blocks in smaller radius
                this.destroyBlocksInRadius(clusterX, clusterY, 70);
                // Check for sticky bombs in mini explosion
                this.scene.triggerStickyBomb(clusterX, clusterY, 70);
            });
        }
    }
    
    // Handle sticky bomb placement
    handleStickyBomb(x, y, block) {
        console.log("BombUtils.handleStickyBomb called at", x, y);
        
        // Create a visual sticky effect to show bomb has stuck, but not exploded
        const stickyEffect = this.scene.add.circle(x, y, 30, 0xff99ff, 0.5);
        stickyEffect.setDepth(15);
        
        // Animate the sticky effect to pulse
        this.scene.tweens.add({
            targets: stickyEffect,
            alpha: 0.2,
            scale: 1.2,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 // Repeat forever until removed
        });
        
        // Add small particles to show it's active
        const particles = this.scene.add.particles('sticky_particle');
        const emitter = particles.createEmitter({
            speed: { min: 10, max: 50 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            tint: 0xff99ff, // Pink tint for sticky bombs
            frequency: 500, // Emit particles every 500ms
            quantity: 2
        });
        
        // Set particle emission point
        emitter.setPosition(x, y);
        
        // Keep a reference to the original bomb sprite
        let bombSprite = null;
        
        // Get the active bomb reference from either direct reference or launcher
        let activeBomb = null;
        if (this.scene.bombLauncher && this.scene.bombLauncher.bomb) {
            activeBomb = this.scene.bombLauncher.bomb;
        } else if (this.scene.bomb) {
            activeBomb = this.scene.bomb;
        }
        
        if (activeBomb) {
            // Fix the bomb in place
            activeBomb.setStatic(true);
            // Make the bomb appear at the correct position
            activeBomb.setPosition(x, y);
            
            // Mark the bomb as sticky
            activeBomb.isSticky = true;
            activeBomb.hasExploded = false;
            
            // Store reference to the bomb sprite
            bombSprite = activeBomb;
            
            console.log("Sticky bomb reference maintained, fixing bomb position at", x, y);
            
            // IMPORTANT: Clear the scene's bomb references after storing our local reference
            // This ensures the launcher will create a new bomb
            if (this.scene.bombLauncher && this.scene.bombLauncher.bomb === activeBomb) {
                this.scene.bombLauncher.bomb = null;
                if (this.scene.bombLauncher.bombState) {
                    this.scene.bombLauncher.bombState.active = false;
                }
            }
            
            if (this.scene.bomb === activeBomb) {
            this.scene.bomb = null;
            }
        }
        
        // Create a sticky bomb object to track its state
        const stickyBomb = {
            x: x,
            y: y,
            isActive: true,
            scene: this.scene,
            visualEffect: stickyEffect,
            particles: particles,
            emitter: emitter,
            bombSprite: bombSprite, // Store the bomb sprite reference
            explosionRadius: 440, // Wider explosion radius than standard bomb
            isSticky: true,
            createdAt: Date.now()
        };
        
        // Add the sticky bomb to an array to track all active sticky bombs
        if (!this.scene.activeStickyBombs) {
            this.scene.activeStickyBombs = [];
        }
        this.scene.activeStickyBombs.push(stickyBomb);
        
        // Play a sticking sound if available
        try {
            this.scene.sound.play('explosion', { volume: 0.2, rate: 1.5 }); // Higher pitch for sticking sound
        } catch (e) {
            console.log("Sound not available:", e);
        }
        
        console.log("Sticky bomb - not destroying as it needs to stay stuck until triggered");
        
        return stickyBomb;
    }
    
    // Handle shatterer bomb explosions
    handleShattererBomb(x, y) {
        // Create a large red explosion
        const explosion = this.scene.add.circle(x, y, 100, 0xcc3333, 0.8);
        
        // Shockwave effect
        const shockwave = this.scene.add.circle(x, y, 10, 0xffffff, 0.8);
        this.scene.tweens.add({
            targets: shockwave,
            radius: 150,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                shockwave.destroy();
            },
            onUpdate: (tween) => {
                // Manually update the circle size since radius isn't a standard property
                const radius = 10 + (150 - 10) * tween.progress;
                shockwave.setRadius(radius);
            }
        });
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 2.5,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles for impact effect
        const particles = this.scene.add.particles('impact_particle');
        const emitter = particles.createEmitter({
            speed: { min: 100, max: 300 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            quantity: 50
        });
        
        // Emit particles in a single burst
        emitter.explode(50, x, y);
        
        // For Shatterer bomb, we'll handle block destruction differently to reflect its power
        this.destroyBlocksWithShatterer(x, y, 250);
        
        // Check for sticky bombs in a wide radius with high chance to trigger
        this.scene.triggerStickyBomb(x, y, 300);
        
        // Add a stronger camera shake
        this.scene.cameras.main.shake(500, 0.02);
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // Add explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.8, rate: 0.7 }); // Lower pitch for heavier sound
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Migrated and adapted from GameScene.js
    handleDrillerBomb(activeBombInstance, x, y, block, velocityX_param, velocityY_param) {
        if (!activeBombInstance || !activeBombInstance.scene) {
            console.warn("BombUtils.handleDrillerBomb: activeBombInstance is invalid or not in scene.");
            return null;
        }

<<<<<<< HEAD
        if (activeBombInstance.isCurrentlyDrilling) {
            console.log("BombUtils.handleDrillerBomb: Bomb instance is already drilling. Instance ID:", activeBombInstance.id || "N/A");
            return activeBombInstance.drillerData || null;
        }
        activeBombInstance.isCurrentlyDrilling = true; // Prevent re-entry

        console.log(`[BombUtils.handleDrillerBomb] Initializing Driller Bomb. Impact at (${x.toFixed(1)}, ${y.toFixed(1)}) on block:`, block);

        activeBombInstance.setStatic(true);
        activeBombInstance.setPosition(x, y); // Attach at impact point
        activeBombInstance.isDriller = true;  // Ensure flag is set
        activeBombInstance.hasExploded = false; // It's drilling, not exploded

        // Determine drilling direction from impact velocity
        let dirX = 0, dirY = -1; // Default upwards if no velocity
        const bodyVelocity = activeBombInstance.body ? activeBombInstance.body.velocity : null;

        if (bodyVelocity && (bodyVelocity.x !== 0 || bodyVelocity.y !== 0)) {
            const magnitude = Math.sqrt(bodyVelocity.x * bodyVelocity.x + bodyVelocity.y * bodyVelocity.y);
            dirX = bodyVelocity.x / magnitude;
            dirY = bodyVelocity.y / magnitude;
        } else if (velocityX_param !== undefined && velocityY_param !== undefined && (velocityX_param !== 0 || velocityY_param !== 0) ) {
            // Fallback to provided velocity parameters if body velocity is zero (e.g. if it became static too quickly)
            const magnitude = Math.sqrt(velocityX_param * velocityX_param + velocityY_param * velocityY_param);
            dirX = velocityX_param / magnitude;
            dirY = velocityY_param / magnitude;
            console.log(`[BombUtils.handleDrillerBomb] Using provided velocity for direction: dx=${dirX.toFixed(2)}, dy=${dirY.toFixed(2)}`);
        } else {
            console.warn("[BombUtils.handleDrillerBomb] No valid impact velocity, defaulting drill direction.");
        }


        const drillerData = {
            initialX: x,
            initialY: y,
            currentX: x, // Stores the logical position of the drill head
            currentY: y,
            dirX: dirX,
            dirY: dirY,
            isActive: true, // Drilling is active
            startTime: this.scene.time.now,
            duration: 3000, // Drill for 3 seconds (changed from 5000)
            drillStepDistance: 10, // How far to move each drill interval
            drillInterval: 100, // Milliseconds per drill step (movement & damage check)
            blockTarget: block, // The initial block hit
            associatedBombInstance: activeBombInstance,
            hasCompletedDrilling: false,
            hasBeenTriggeredExternally: false,
            uniqueId: Phaser.Math.RND.uuid(),
            timer: null, // For the 5-second overall duration
            drillIntervalTimer: null // For the periodic drilling action
        };
        activeBombInstance.drillerData = drillerData;

        this.createDrillEffect(drillerData.currentX, drillerData.currentY); // Initial effect at impact

        const completeDrilling = () => {
            if (!drillerData.isActive && drillerData.hasCompletedDrilling) return; // Already handled

            console.log(`[BombUtils.completeDrilling] Driller ID ${drillerData.uniqueId} finished. Final pos: (${drillerData.currentX.toFixed(1)}, ${drillerData.currentY.toFixed(1)})`);
            drillerData.isActive = false; // No longer actively drilling
            drillerData.hasCompletedDrilling = true;

            if (drillerData.timer) {
                drillerData.timer.remove();
                drillerData.timer = null;
            }
            if (drillerData.drillIntervalTimer) {
                drillerData.drillIntervalTimer.remove();
                drillerData.drillIntervalTimer = null;
            }

            // The bomb GameObject (activeBombInstance) remains static at its last drilled position.
            // It does NOT explode here. It waits for an external trigger.
            console.log(`[BombUtils.completeDrilling] Driller ID ${drillerData.uniqueId} now dormant, awaiting external trigger.`);

            // No automatic resetBomb or game state check here. That's handled by external triggers or game over logic.
        };

        // Timer for the total 5-second drilling duration
        drillerData.timer = this.scene.time.addEvent({
            delay: drillerData.duration,
            callback: completeDrilling,
            callbackScope: this
        });

        // Timer for periodic drilling action (movement and damage)
        drillerData.drillIntervalTimer = this.scene.time.addEvent({
            delay: drillerData.drillInterval,
            callback: () => {
                if (!drillerData.isActive || drillerData.hasCompletedDrilling) {
                    if(drillerData.drillIntervalTimer) drillerData.drillIntervalTimer.remove();
                    return;
                }

                // Move the drill head's logical position
                drillerData.currentX += drillerData.dirX * drillerData.drillStepDistance;
                drillerData.currentY += drillerData.dirY * drillerData.drillStepDistance;

                // Update the visual position of the bomb GameObject
                if (drillerData.associatedBombInstance && drillerData.associatedBombInstance.scene) {
                    drillerData.associatedBombInstance.setPosition(drillerData.currentX, drillerData.currentY);
                }

                this.createDrillEffect(drillerData.currentX, drillerData.currentY);

                // Check for blocks in a small radius around the new drill head position
                const drillCheckRadius = drillerData.drillStepDistance * 0.75; // Check slightly less than one step
                if (this.scene.iceBlocks) {
                    this.scene.iceBlocks.forEach(iceBlock => {
                        if (iceBlock && iceBlock.isActive && iceBlock.scene) {
                            const distance = Phaser.Math.Distance.Between(drillerData.currentX, drillerData.currentY, iceBlock.x, iceBlock.y);
                            if (distance < drillCheckRadius + (iceBlock.width || 15) / 2) { // Consider block size
                                console.log(`[BombUtils.drillInterval] Driller ID ${drillerData.uniqueId} damaging block at (${iceBlock.x.toFixed(1)}, ${iceBlock.y.toFixed(1)})`);
                                if (typeof this.scene.damageIceBlock === 'function') {
                                    const destroyed = this.scene.damageIceBlock(iceBlock); // damageIceBlock should return true if destroyed
                                    if (destroyed && iceBlock === drillerData.blockTarget) {
                                        drillerData.blockTarget = null; // Original target gone
                                    }
        } else {
                                     console.warn("[BombUtils.drillInterval] scene.damageIceBlock is not available.");
                                     // Fallback: attempt direct destruction if damageIceBlock is missing
                                     this.destroyIceBlock(iceBlock);
                                      if (iceBlock === drillerData.blockTarget) drillerData.blockTarget = null;
                                }
                            }
                        }
                    });
                }

                // If initial target block is destroyed (and was not nullified yet)
                if (drillerData.blockTarget && (!drillerData.blockTarget.scene || !drillerData.blockTarget.isActive)) {
                    drillerData.blockTarget = null;
                }

            },
            callbackScope: this,
            loop: true
        });

        if (!this.scene.activeDrillerBombs) {
            this.scene.activeDrillerBombs = [];
        }
        this.scene.activeDrillerBombs.push(drillerData);
        console.log(`[BombUtils.handleDrillerBomb] Driller bomb ${drillerData.uniqueId} added to activeDrillerBombs. Count: ${this.scene.activeDrillerBombs.length}`);

        // Clear the main bomb reference in BombLauncher/GameScene so a new bomb can be prepared.
        // The drillerBomb (activeBombInstance) is now managed by its drillerData.
        if (this.scene.bombLauncher) {
            if (this.scene.bombLauncher.bomb === activeBombInstance) {
                this.scene.bombLauncher.bomb = null;
            }
            if (this.scene.bombLauncher.bombState) {
                 this.scene.bombLauncher.bombState.active = false;
            }
        }
        if (this.scene.bomb === activeBombInstance) {
            this.scene.bomb = null;
        }


        return drillerData;
=======
        // Prevent re-initialization if this specific bomb instance is already drilling
        if (activeBombInstance.isCurrentlyDrilling) {
            console.log("BombUtils.handleDrillerBomb: Bomb instance is already drilling. Instance ID:", activeBombInstance.id || "N/A");
            // Return the existing driller data object if available, or null
            return activeBombInstance.drillerData || null;
        }
        activeBombInstance.isCurrentlyDrilling = true; // Set flag on the Phaser GameObject

        console.log("BombUtils.handleDrillerBomb called for bomb at", x, y, "targeting block:", block);
        activeBombInstance.setStatic(true); // Make the bomb static at the contact point
        activeBombInstance.setPosition(x, y);
        activeBombInstance.isDriller = true;
        activeBombInstance.hasExploded = false; // It hasn't exploded, it's drilling

        const drillerBomb = {
            x: x,
            y: y,
            isActive: true,
            startTime: this.scene.time.now,
            duration: 5000, // Drill for 5 seconds
            blockTarget: block,
            associatedBombInstance: activeBombInstance, // Keep a reference to the Phaser GameObject
            hasCompleted: false, // Flag to track if drilling and explosion completed
            uniqueId: Phaser.Math.RND.uuid() // Unique ID for this drilling operation
        };
        activeBombInstance.drillerData = drillerBomb; // Link driller data to the bomb instance

        // Create initial drill effect
        this.createDrillEffect(x, y);

        // Start a timer for the drilling duration
        const drillTimer = this.scene.time.addEvent({
            delay: drillerBomb.duration,
            callback: () => {
                drillingComplete();
            },
            callbackScope: this
        });

        drillerBomb.timer = drillTimer; // Store timer reference

        const drillingComplete = () => {
            if (!drillerBomb.isActive || drillerBomb.hasCompleted) {
                console.log("BombUtils.drillingComplete: Drilling already completed or bomb inactive for ID:", drillerBomb.uniqueId);
                return;
            }
            drillerBomb.hasCompleted = true;
            drillerBomb.isActive = false;
            console.log("BombUtils.drillingComplete: Drilling finished for bomb ID:", drillerBomb.uniqueId, "at", drillerBomb.x, drillerBomb.y);

            // Create a larger explosion at the driller bomb's location
            this.createDrillerExplosion(drillerBomb.x, drillerBomb.y); // Uses BombUtils's own method

            // Destroy blocks in a radius around the driller bomb
            if (this.scene.bombUtils && typeof this.scene.bombUtils.destroyBlocksInRadius === 'function') {
                 this.scene.bombUtils.destroyBlocksInRadius(drillerBomb.x, drillerBomb.y, 120); // Moderate radius
        } else {
                console.warn("BombUtils.drillingComplete: this.scene.bombUtils.destroyBlocksInRadius not found!");
            }


            // Also destroy the target block directly if it's still there (it might have been destroyed by radius)
            if (drillerBomb.blockTarget && drillerBomb.blockTarget.scene && drillerBomb.blockTarget.isActive) {
                this.destroyIceBlock(drillerBomb.blockTarget); // Uses BombUtils's own method
            }

            // Clean up the original bomb instance that initiated the drilling
            if (drillerBomb.associatedBombInstance && drillerBomb.associatedBombInstance.scene) {
                this.cleanupBombResources(drillerBomb.associatedBombInstance); // Uses BombUtils's own method
                drillerBomb.associatedBombInstance.destroy();
                drillerBomb.associatedBombInstance = null; // Clear reference
            }
            // Also tell the BombLauncher to clean up its reference to this bomb
            if (this.scene.bombLauncher && typeof this.scene.bombLauncher.cleanupExistingBomb === 'function') {
                this.scene.bombLauncher.cleanupExistingBomb();
            }
            
            // Remove this driller bomb from the GameScene's activeDrillerBombs array
            if (this.scene.activeDrillerBombs) {
                const index = this.scene.activeDrillerBombs.indexOf(drillerBomb);
                if (index > -1) {
                    this.scene.activeDrillerBombs.splice(index, 1);
                }
            }

            // After drilling, check for level completion or game over
            if (this.scene.checkLevelCompletion) this.scene.checkLevelCompletion();
            if (this.scene.checkGameOver) this.scene.checkGameOver();

            // Logic to reset the bomb if shots are remaining (moved from GameScene's original)
            if (this.scene.shotsRemaining > 0) {
                const noBombAvailable = (!this.scene.bombLauncher || !this.scene.bombLauncher.bomb) && !this.scene.bomb;
                if (noBombAvailable && typeof this.scene.resetBomb === 'function') {
                    console.log("BombUtils.drillingComplete: Scheduling bomb reset.");
                    this.scene.time.delayedCall(1000, () => { // Ensure this is called on the scene's time
                        if ((!this.scene.bombLauncher || !this.scene.bombLauncher.getActiveLaunchedBomb()) && !this.scene.bomb) {
                             this.scene.resetBomb();
                        }
                    }, [], this.scene);
                }
            }
        };
        
        // Periodically damage the target block while drilling
        // And create continuous drill effect
        drillerBomb.drillIntervalTimer = this.scene.time.addEvent({
            delay: 250, // Damage every 250ms
            callback: () => {
                if (!drillerBomb.isActive || !drillerBomb.blockTarget || !drillerBomb.blockTarget.scene || !drillerBomb.blockTarget.isActive) {
                    // If target is gone or driller inactive, stop this interval early
                    if(drillerBomb.drillIntervalTimer) drillerBomb.drillIntervalTimer.remove();
                    // If the block was destroyed by something else, trigger completion early
                    if (drillerBomb.isActive && !drillerBomb.hasCompleted) {
                         console.log("BombUtils.handleDrillerBomb: Target block gone, triggering early completion for ID:", drillerBomb.uniqueId);
                         if(drillTimer) drillTimer.remove(); // Stop the main duration timer
                         drillingComplete();
                    }
                    return;
                }

                if (this.scene.damageIceBlock && typeof this.scene.damageIceBlock === 'function') {
                    this.scene.damageIceBlock(drillerBomb.blockTarget); // GameScene's method to handle block health
        } else {
                     console.warn("BombUtils.handleDrillerBomb: this.scene.damageIceBlock is not available!");
                }
                this.createDrillEffect(drillerBomb.x, drillerBomb.y); // Continuous effect

                // Check if block was destroyed by this damage tick
                if (drillerBomb.blockTarget && (!drillerBomb.blockTarget.scene || !drillerBomb.blockTarget.isActive)) {
                    if(drillerBomb.drillIntervalTimer) drillerBomb.drillIntervalTimer.remove();
                    if (drillerBomb.isActive && !drillerBomb.hasCompleted) {
                        console.log("BombUtils.handleDrillerBomb: Target block destroyed by drill, triggering early completion for ID:", drillerBomb.uniqueId);
                        if(drillTimer) drillTimer.remove();
                        drillingComplete();
                    }
                }
            },
            callbackScope: this,
            loop: true // Keep damaging until drilling is complete or block is gone
        });


        // Add this driller bomb to the GameScene's activeDrillerBombs array for tracking
        if (!this.scene.activeDrillerBombs) {
            this.scene.activeDrillerBombs = [];
        }
        this.scene.activeDrillerBombs.push(drillerBomb);

        // Return the drillerBomb data object for tracking if needed by the caller (CollisionManager)
        return drillerBomb;
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
    }

   
    
    // Create a small fizzle effect when a bomb misses
    createFizzleEffect(x, y) {
        // Create a small particle effect for a "fizzle" or "failure"
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6); // Same depth as other effects
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 60 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            tint: 0xaaaaaa // Gray particles for a "fizzle"
        });
        
        // Emit particles at bomb position
        emitter.explode(15, x, y);
        
        // Small "fizzle" sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const fizzleSound = this.scene.sound.add('fizzle', { volume: 0.3 });
                fizzleSound.play();
            } catch (e) {
                console.log("Fizzle sound not available:", e);
                // Try to use an existing sound at a different rate as a fallback
                try {
                    const fallbackSound = this.scene.sound.add('explosion');
                    fallbackSound.play({ volume: 0.2, rate: 0.5 });
                } catch (e) {
                    console.log("Fallback sound not available either");
                }
            }
        }
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        return particles;
    }
    
    // Create a larger explosion effect for sticky bombs
    createLargeExplosion(x, y) {
        // Create a larger explosion effect for sticky bombs
        const explosion = this.scene.add.circle(x, y, 120, 0xff77cc, 0.8);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 3, // Larger scale
            duration: 500, // Longer duration
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add more particles for a bigger effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 80, max: 250 }, // Faster particles
            scale: { start: 1.5, end: 0 }, // Larger particles
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            tint: 0xff77cc // Pink tint for sticky bomb explosions
        });
        
        // Emit more particles
        emitter.explode(50, x, y);
        
        // Add a larger flash effect
        const flash = this.scene.add.circle(x, y, 150, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Clean up particles after use
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // Add a stronger camera shake
        this.scene.cameras.main.shake(400, 0.015);
        
        // Add explosion sound with lower pitch for bigger boom
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.6, rate: 0.6 });
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Create a driller explosion effect
    createDrillerExplosion(x, y) {
        // Large explosion for driller bombs when triggered
<<<<<<< HEAD
        console.log(`[BombUtils.createDrillerExplosion] Triggered at (${x.toFixed(1)}, ${y.toFixed(1)})`);
=======
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
        const explosion = this.scene.add.circle(x, y, 150, 0xBB5500, 0.8);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 3,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles for a bigger effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 100, max: 300 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1200,
            blendMode: 'ADD',
            tint: 0xBB5500
        });
        
        // Emit more particles
        emitter.explode(60, x, y);
        
        // Add a larger flash effect
        const flash = this.scene.add.circle(x, y, 200, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Destroy blocks in a wider radius
        this.destroyBlocksInRadius(x, y, 180);
        
        // Play an explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.6 });
            } catch (e) {
                console.log("Explosion sound not available:", e);
            }
        }
        
        // Camera shake for impact
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(300, 0.02);
        }
    }
    
    // Create a bounce trail effect for bombs bounced off bouncy blocks
    createBounceTrail(bomb) {
        if (!bomb || !bomb.scene) return;
        
        // Create trail particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            lifespan: 300,
            speed: { min: 5, max: 20 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: 0x88ddff, // Light blue for bounce trail
            frequency: 20, // Emit a particle every 20ms
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 5),
                quantity: 1
            }
        });
        
        // Track the bomb to emit particles
        emitter.startFollow(bomb);
        
        // Clean up particles if bomb is destroyed
        this.scene.time.delayedCall(1200, () => {
            if (particles && particles.scene) {
                particles.destroy();
            }
        });
        
        // Remove the trail after a short time (if bomb hasn't exploded yet)
        this.scene.time.delayedCall(800, () => {
            if (emitter && emitter.manager && emitter.manager.scene) {
                emitter.stopFollow();
                emitter.stop();
            }
        });
        
        return particles;
    }
    
    // Clean up bomb resources to prevent memory leaks
    cleanupBombResources(bomb) {
        try {
            // Clean up visual effects with error handling
            if (bomb.visualEffect) {
                if (bomb.visualEffect.scene) {
                    bomb.visualEffect.destroy();
                }
                bomb.visualEffect = null;
            }
            
            if (bomb.particles) {
                if (bomb.particles.scene) {
                    bomb.particles.destroy();
                }
                bomb.particles = null;
            }
            
            // Destroy the bomb sprite if it exists
            if (bomb.bombSprite) {
                if (bomb.bombSprite.scene) {
                    bomb.bombSprite.destroy();
                }
                bomb.bombSprite = null;
            }
            
            // Clean up any tweens that might be running on bomb elements
            if (bomb.visualEffect) this.scene.tweens.killTweensOf(bomb.visualEffect);
            if (bomb.bombSprite) this.scene.tweens.killTweensOf(bomb.bombSprite);
            
            // If any emitters are stored directly on the bomb
            if (bomb.emitter) {
                if (bomb.emitter.manager && bomb.emitter.manager.scene) {
                    bomb.emitter.stop();
                    bomb.emitter.remove();
                }
                bomb.emitter = null;
            }
        } catch (error) {
            console.error(`Error cleaning up bomb resources:`, error);
        }
    }
    
    // Generic explosion effect
    createExplosion(x, y) {
        if (!this.scene) return;
        
        // Create visual explosion effect
        const explosion = this.scene.add.circle(x, y, 80, 0xff5500, 0.8);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add some particles for more effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD'
        });
        
        // Emit particles at explosion point
        emitter.explode(30, x, y);
        
        // Create a flash effect
        const flash = this.scene.add.circle(x, y, 100, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // Add a camera shake effect
        this.scene.cameras.main.shake(300, 0.01);
        
        // Add explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.5 });
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Create mini explosion effect for cluster bombs
    createMiniExplosion(x, y) {
        if (!this.scene) return;
        
        // Create smaller visual explosion effect
        const explosion = this.scene.add.circle(x, y, 40, 0xffdd44, 0.7);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add some particles for more effect
        const particles = this.scene.add.particles('mini_particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 150 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD'
        });
        
        // Emit particles at explosion point
        emitter.explode(20, x, y);
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(700, () => {
            particles.destroy();
        });
        
        // Add a small camera shake
        this.scene.cameras.main.shake(150, 0.005);
    }
    
    createDrillEffect(x, y) {
        if (!this.scene) { 
            console.warn("BombUtils.createDrillEffect: Scene not available!");
                return;
            }
        // Create a drill dust effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 80 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: [0xBB5500, 0xCCCCCC] // Brown/orange and gray for drill dust
        });
        
        emitter.explode(10, x, y);
        
        this.scene.time.delayedCall(500, () => {
            if (particles && particles.scene) {
                 particles.destroy();
            }
        });
        
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(100, 0.003);
        }
    }
 
    
    // Handle ricochet bomb hitting world boundaries
    handleRicochetBoundaryHit(bomb) {
        try {
            // Safety checks - make sure we have a valid bomb and it hasn't exploded
            if (!bomb || !bomb.scene || !bomb.body || bomb.hasExploded) {
                console.log("Invalid bomb state in handleRicochetBoundaryHit, skipping");
                return;
            }
            
            // Increment bounce count
            bomb.bounceCount = (bomb.bounceCount || 0) + 1;
            
            // Create a bounce flash at the bomb's position
            this.createBounceFlash(bomb.x, bomb.y);
            
            // Ensure the bomb maintains sufficient velocity after boundary hit
            // Drastically reduced for gentler bounces
            const minSpeed = 25;  // Reduced from 250 to 25
            const maxSpeed = 40;  // Reduced from 400 to 40
            
            // Only proceed if body has velocity
            if (bomb.body && bomb.body.velocity) {
                try {
                    const vx = bomb.body.velocity.x;
                    const vy = bomb.body.velocity.y;
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    
                    if (speed < minSpeed) {
                        // Scale velocity to ensure minimum speed
                        const scale = minSpeed / Math.max(speed, 1);
                        bomb.setVelocity(vx * scale, vy * scale);
                    } else if (speed > maxSpeed) {
                        // Cap maximum speed
                        const scale = maxSpeed / speed;
                        bomb.setVelocity(vx * scale, vy * scale);
                    }
                } catch (e) {
                    console.warn("Error adjusting bomb velocity:", e);
                    // Fallback - set a safe velocity if there was an error
                    try {
                        bomb.setVelocity(20, 20);
                    } catch (e2) {
                        console.error("Failed to set fallback velocity:", e2);
                    }
                }
            }
            
            // Play bounce sound
            if (this.scene && this.scene.sound && this.scene.sound.add) {
                try {
                    const bounceSound = this.scene.sound.add('bouncesound');
                    bounceSound.play({ volume: 0.2 });
                } catch (e) {
                    console.log("Sound not available:", e);
                }
            }
            
            // Update the countdown text position if it exists
            if (bomb.countdownText && bomb.countdownText.scene) {
                try {
                    bomb.countdownText.setPosition(bomb.x, bomb.y - 30);
                } catch (e) {
                    console.warn("Error updating countdown text position:", e);
                }
            }
            
            // NOTE: We're disabling the bounce limit check completely 
            // Ricochet bombs will now only explode when the 5-second timer expires
            // This ensures consistent behavior with the pre-refactoring version
            
            /*
            // Check if we've reached the bounce limit (original code - disabled)
            const timeSinceLaunch = Date.now() - (bomb.launchTime || 0);
            if (bomb.bounceCount >= 15 && !bomb.hasExploded && timeSinceLaunch > 1000) {
                console.log("Bounce limit reached, exploding ricochet bomb");
                this.explodeRicochetBomb(bomb);
            }
            */
        } catch (error) {
            console.error("Error in handleRicochetBoundaryHit:", error);
            
            // If there's an error, try to explode the bomb to recover
            if (bomb && bomb.scene && !bomb.hasExploded) {
                try {
                    console.log("Forcing explosion due to error in boundary hit handler");
                    this.explodeRicochetBomb(bomb);
                } catch (e) {
                    console.error("Failed to explode bomb in error recovery:", e);
                }
            }
        }
    }
    
    // Create a ricochet trail effect
    createRicochetTrail(bomb) {
        if (!this.scene || !bomb) return null;
        
        // Create particle emitter for the ricochet trail
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            lifespan: 400,
            speed: { min: 5, max: 15 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            tint: 0x00FFFF, // Cyan for ricochet
            frequency: 15, // Emit particles more frequently than regular bounce
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 8),
                quantity: 2
            }
        });
        
        // Track the bomb to emit particles
        emitter.startFollow(bomb);
        
        // Store the emitter on the bomb for later reference
        bomb.trailEmitter = emitter;
        
        // Store particles on the bomb for cleanup
        bomb.trailParticles = particles;
        
        return particles;
    }
    
    // Create a flash effect at bounce point
    createBounceFlash(x, y) {
        if (!this.scene) return;
        
        // Create a small flash circle
        const flash = this.scene.add.circle(x, y, 25, 0x00FFFF, 0.8);
        flash.setDepth(5);
        
        // Animate it
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2.5,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Add some tiny particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            speed: { min: 40, max: 120 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            tint: 0x00FFFF, // Cyan for ricochet
            quantity: 15
        });
        
        // Emit particles at bounce point
        emitter.explode(15, x, y);
        
        // Add a small concentric ring effect
        const ring = this.scene.add.circle(x, y, 5, 0x00FFFF, 0);
        ring.setStrokeStyle(2, 0x00FFFF, 1);
        ring.setDepth(5);
        
        this.scene.tweens.add({
            targets: ring,
            scale: 5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Destroy particles after they're done
        this.scene.time.delayedCall(500, () => {
            if (particles && particles.scene) {
                particles.destroy();
            }
        });
    }
    
    // Explode the ricochet bomb
    explodeRicochetBomb(bomb) {
        try {
            // Safety check: Ensure bomb exists and hasn't already exploded
            if (!bomb || !bomb.scene || bomb.hasExploded) {
<<<<<<< HEAD
                console.log("[BombUtils.explodeRicochetBomb] Bomb already exploded or invalid, skipping explosion", { 
=======
                console.log("Bomb already exploded or invalid, skipping explosion", { 
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
                    bombExists: !!bomb, 
                    inScene: bomb ? !!bomb.scene : false, 
                    hasExploded: bomb ? bomb.hasExploded : 'N/A'
                });
                return; 
            }

            // --- CAPTURE POSITION BEFORE DESTRUCTION ---
            const explosionX = bomb.x;
            const explosionY = bomb.y;
            console.log(`[BombUtils.explodeRicochetBomb] Captured explosion position: (${explosionX.toFixed(1)}, ${explosionY.toFixed(1)})`);
            // --- END CAPTURE ---

            // Mark as exploded *now* to prevent re-entry or race conditions
            bomb.hasExploded = true;

            // Destroy the bomb GameObject itself if it's still in the scene
            if (bomb.scene) {
                console.log("[BombUtils.explodeRicochetBomb] Destroying ricochet bomb GameObject.");
                bomb.destroy(); 
            }

<<<<<<< HEAD
            console.log(`[BombUtils.explodeRicochetBomb] Exploding ricochet bomb at (${explosionX.toFixed(1)}, ${explosionY.toFixed(1)})`); // USE CAPTURED VALUES
            
            let explosionEffectSuccessfullyCalled = false; // Define the variable here
=======
            console.log(`Exploding ricochet bomb at (${explosionX.toFixed(1)}, ${explosionY.toFixed(1)})`); // USE CAPTURED VALUES
            
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
            // --- REVISED EXPLOSION HANDLING ---
            try {
                console.log("[BombUtils.explodeRicochetBomb] Calling this.createLargeExplosion...");
                this.createLargeExplosion(explosionX, explosionY); // Call own method for visual/audio
<<<<<<< HEAD
                console.log("[BombUtils.explodeRicochetBomb] ... this.createLargeExplosion finished.");

                console.log("[BombUtils.explodeRicochetBomb] Calling this.destroyBlocksInRadius...");
                // Calls own destroyBlocksInRadius method
                this.destroyBlocksInRadius(explosionX, explosionY, 150); 
                console.log("[BombUtils.explodeRicochetBomb] ... this.destroyBlocksInRadius finished.");
                
                console.log("[BombUtils.explodeRicochetBomb] Calling this.scene.triggerStickyBomb...");
                if (typeof this.scene.triggerStickyBomb === 'function') {
                    // scene.triggerStickyBomb is correct as it coordinates across different bomb types
                    this.scene.triggerStickyBomb(explosionX, explosionY, 150); 
                    console.log("[BombUtils.explodeRicochetBomb] ... this.scene.triggerStickyBomb finished.");
                } else {
                    console.warn("[BombUtils.explodeRicochetBomb] this.scene.triggerStickyBomb is not a function!");
                }
                explosionEffectSuccessfullyCalled = true; // Assuming success if no errors
            } catch (explosionError) {
                console.error("[BombUtils.explodeRicochetBomb] Error during revised explosion handling:", explosionError);
                explosionEffectSuccessfullyCalled = false;
            }
            // --- END REVISED EXPLOSION HANDLING ---
            
             console.log(`[BombUtils.explodeRicochetBomb] Explosion effect handled: ${explosionEffectSuccessfullyCalled}. Starting cleanup...`);
=======
                console.log("... this.createLargeExplosion finished.");

                console.log("[BombUtils.explodeRicochetBomb] Calling this.scene.destroyBlocksInRadius...");
                if (typeof this.scene.destroyBlocksInRadius === 'function') {
                    this.scene.destroyBlocksInRadius(explosionX, explosionY, 150); // Standard radius for ricochet
                    console.log("... this.scene.destroyBlocksInRadius finished.");
                } else {
                    console.warn("[BombUtils.explodeRicochetBomb] this.scene.destroyBlocksInRadius is not a function!");
                }

                console.log("[BombUtils.explodeRicochetBomb] Calling this.scene.triggerStickyBomb...");
                if (typeof this.scene.triggerStickyBomb === 'function') {
                    this.scene.triggerStickyBomb(explosionX, explosionY, 150); // Standard radius for ricochet
                    console.log("... this.scene.triggerStickyBomb finished.");
                } else {
                    console.warn("[BombUtils.explodeRicochetBomb] this.scene.triggerStickyBomb is not a function!");
                }
                explosionEffectHandled = true; // Assuming success if no errors
            } catch (explosionError) {
                console.error("[BombUtils.explodeRicochetBomb] Error during revised explosion handling:", explosionError);
                explosionEffectHandled = false;
            }
            // --- END REVISED EXPLOSION HANDLING ---
            
             console.log(`Explosion effect handled: ${explosionEffectHandled}. Starting cleanup...`);
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
            
            // Cleanup bomb resources (timer, text, trail, etc.)
             if (bomb.countdownTimer) {
                bomb.countdownTimer.remove();
            }
            
            if (bomb.countdownText && bomb.countdownText.scene) {
                bomb.countdownText.destroy();
            }
            
            if (bomb.bounceTrail) {
                bomb.bounceTrail.destroy();
            }
            
            if (bomb.trailParticles) {
                bomb.trailParticles.destroy();
            }
            
            // Update bomb state in launcher as well
            if (this.scene.bombLauncher && this.scene.bombLauncher.bombState) {
                this.scene.bombLauncher.bombState.active = false;
            }
            
            // Force reset the game state
<<<<<<< HEAD
            // RETHINK: Exploding a ricochet bomb shouldn't necessarily force a full game state reset.
            // It should allow the game to continue, reset the current bomb, and check win/loss.
            // The original forceResetGameState was too aggressive.
            // Let's schedule a standard bomb reset.
            if (this.scene.shotsRemaining > 0 && typeof this.scene.resetBomb === 'function') {
                this.scene.time.delayedCall(100, this.scene.resetBomb, [], this.scene);
            } else if (typeof this.scene.checkLevelCompletion === 'function') {
                this.scene.time.delayedCall(100, this.scene.checkLevelCompletion, [], this.scene);
            }
=======
            this.scene.time.delayedCall(500, () => {
                try {
                    if (this.scene.forceResetGameState) {
                        this.scene.forceResetGameState();
                    } else if (this.scene.resetBomb) {
                        this.scene.resetBomb();
                    } else if (this.scene.bombLauncher && this.scene.bombLauncher.createBomb) {
                        this.scene.bombLauncher.cleanupExistingBomb();
                        this.scene.bombLauncher.createBomb(this.scene.currentBombType || 'bomb');
                    }
                } catch (e) {
                    console.error("Error in recovery reset:", e);
                }
            });
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
        } catch (error) {
            console.error("Error in explodeRicochetBomb:", error);
            
            // Recovery: If error occurred, make sure to null the scene's bomb reference
            if (this.scene) {
                if (this.scene.bomb === bomb) {
                    this.scene.bomb = null;
                }
                
                // Update bomb state in launcher as well
                if (this.scene.bombLauncher && this.scene.bombLauncher.bombState) {
                    this.scene.bombLauncher.bombState.active = false;
                }
                
                // Force reset the game state
<<<<<<< HEAD
                // RETHINK: Same as above, avoid overly aggressive reset.
                if (this.scene.shotsRemaining > 0 && typeof this.scene.resetBomb === 'function') {
                    this.scene.time.delayedCall(100, this.scene.resetBomb, [], this.scene);
                } else if (typeof this.scene.checkLevelCompletion === 'function') {
                    this.scene.time.delayedCall(100, this.scene.checkLevelCompletion, [], this.scene);
                }
=======
                this.scene.time.delayedCall(500, () => {
                    try {
                        if (this.scene.forceResetGameState) {
                            this.scene.forceResetGameState();
                        } else if (this.scene.resetBomb) {
                            this.scene.resetBomb();
                        } else if (this.scene.bombLauncher && this.scene.bombLauncher.createBomb) {
                            this.scene.bombLauncher.cleanupExistingBomb();
                            this.scene.bombLauncher.createBomb(this.scene.currentBombType || 'bomb');
                        }
                    } catch (e) {
                        console.error("Error in recovery reset:", e);
                    }
                });
>>>>>>> 7e3f691b0351599926fa6cf036ebfbfe68df0282
            }
        }
    }

    // Add a countdown indicator to ricochet bomb
    addRicochetCountdown(bomb) {
        if (!this.scene || !bomb) return;
        
        console.log("Adding countdown timer to ricochet bomb");
        
        // Create the countdown text
        const countdownText = this.scene.add.text(
            bomb.x, 
            bomb.y - 30, 
            '5', 
            { 
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#00FFFF',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        countdownText.setOrigin(0.5, 0.5);
        countdownText.setDepth(10);
        
        // Store reference on the bomb
        bomb.countdownText = countdownText;
        
        // Store the exact explosion time - 5 seconds from now
        bomb.explosionTime = Date.now() + 5000;
        bomb.countdownStarted = Date.now();
        
        // Store a reference to this for the timer
        const self = this;
        
        // This function updates the timer text position every frame to follow the bomb
        const followBomb = function() {
            // Make sure bomb and text still exist
            if (bomb && bomb.scene && countdownText && countdownText.scene) {
                // Update position to follow the bomb
                countdownText.setPosition(bomb.x, bomb.y - 30);
                
                // Continue following in the next frame if the bomb still exists and hasn't exploded
                if (!bomb.hasExploded) {
                    self.scene.time.delayedCall(1, followBomb);
                }
            }
        };
        
        // Start following the bomb immediately and continuously
        followBomb();
        
        // Create a direct method for updating the countdown
        const updateCountdown = function() {
            // Only proceed if bomb and text still exist
            if (!countdownText || !countdownText.scene) {
                console.log("Countdown text no longer exists, stopping countdown");
                return;
            }
            
            if (!bomb || !bomb.scene || bomb.hasExploded) {
                console.log("Bomb no longer exists or has exploded, stopping countdown");
                return;
            }
            
            // Calculate the exact time remaining until explosion
            const currentTime = Date.now();
            const timeRemaining = bomb.explosionTime - currentTime;
            const secondsLeft = Math.ceil(timeRemaining / 1000);
            
            // Log the remaining time with more precision for debugging
            console.log(`Ricochet countdown: ${secondsLeft} seconds left (exact ms remaining: ${timeRemaining}ms)`);
            
            // Make sure we never go below 0
            const displaySeconds = Math.max(secondsLeft, 0);
            
            // Update text with the current remaining seconds
            countdownText.setText(displaySeconds.toString());
            
            // Make text pulse on each second
            self.scene.tweens.add({
                targets: countdownText,
                scale: 1.5,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeOut'
            });
            
            // Change color as time decreases
            if (displaySeconds <= 2) {
                countdownText.setColor('#FF0000'); // Red for last 2 seconds
            } else if (displaySeconds <= 3) {
                countdownText.setColor('#FFFF00'); // Yellow for 3 seconds
            }
            
            // Continue countdown if we still have time left
            if (timeRemaining > 0 && !bomb.hasExploded) {
                // Schedule next update at exact millisecond for next second change
                const timeToNextSecond = timeRemaining % 1000;
                const nextUpdateTime = timeToNextSecond > 0 ? timeToNextSecond : 1000;
                bomb.countdownTimer = self.scene.time.delayedCall(nextUpdateTime, updateCountdown);
            } else if (timeRemaining <= 0 && !bomb.hasExploded) {
                // Time's up - explode the bomb if it hasn't already
                console.log("Countdown reached exactly 5 seconds, triggering explosion");
                self.explodeRicochetBomb(bomb);
            }
        };
        
        // Store the countdown reference for cleanup later
        bomb.countdownFunc = updateCountdown;
        
        // Start the countdown
        updateCountdown();
    }

    /**
     * Destroys an ice block with visual effects
     * This method is moved from GameScene.js
     * @param {Phaser.Physics.Matter.Image} block The block to destroy
     */
    destroyIceBlock(block) {
        if (!block) {
            console.warn("[BombUtils.destroyIceBlock] Attempted to destroy a null block.");
            return;
        }
        // Mark block as inactive
        block.isActive = false;
        
        // Create shatter effect using BlockUtils from the scene
        if (this.scene.blockUtils && typeof this.scene.blockUtils.createBlockShatter === 'function') {
            this.scene.blockUtils.createBlockShatter(block);
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene.blockUtils.createBlockShatter is not available.");
        }
        
        // Remove the physics body from the world
        if (block.body) {
            try {
                this.scene.matter.world.remove(block.body);
            } catch (e) {
                console.warn("[BombUtils.destroyIceBlock] Error removing block body:", e);
            }
        }
        
        // Hide the original block
        block.setVisible(false);
        
        // Handle the blue veil dissipation by calling the scene's method
        if (this.scene && typeof this.scene._fadeOutBlockVeil === 'function') {
            this.scene._fadeOutBlockVeil(block);
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene._fadeOutBlockVeil is not available.");
        }
        
        // If it's a dynamite block, remove from dynamite blocks array in the scene
        if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE && this.scene.dynamiteBlocks) {
            this.scene.dynamiteBlocks = this.scene.dynamiteBlocks.filter(b => b !== block);
        }
        
        // Special effects based on block type
        if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
            // Dynamite blocks get additional particle effects
            if (this.scene.blockUtils && typeof this.scene.blockUtils.createDynamiteDestroyEffect === 'function') {
                this.scene.blockUtils.createDynamiteDestroyEffect(block.x, block.y);
            } else {
                console.warn("[BombUtils.destroyIceBlock] scene.blockUtils.createDynamiteDestroyEffect is not available.");
            }
        }
        
        // Ensure chibi image remains fully opaque (handled by scene)
        if (this.scene.chibiImage) {
            this.scene.chibiImage.setAlpha(1);
        }
        
        // Update revealed percentage and check progress by calling the scene's method
        if (this.scene && typeof this.scene._updateRevealProgress === 'function') {
            this.scene._updateRevealProgress();
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene._updateRevealProgress is not available.");
        }
    }

    /**
     * Destroys blocks within a radius of the explosion
     * @param {number} x X position of the explosion
     * @param {number} y Y position of the explosion
     * @param {number} radius Radius of the explosion
     */
    destroyBlocksInRadius(x, y, radius) {
        if (!this.scene.iceBlocks) return;
        
        // Create lists to track blocks by different categories
        const blocksToDestroy = [];
        const blocksToDamage = [];
        const dynamiteToTrigger = [];
        
        // Categorize blocks based on type and distance
        this._categorizeBlocksByDistance(x, y, radius, blocksToDestroy, blocksToDamage, dynamiteToTrigger);
        
        // Process each category of blocks
        this._processBlockDestruction(blocksToDestroy);
        this._processBlockDamage(blocksToDamage);
        this._processDynamiteTriggers(dynamiteToTrigger);
        
        // Clean up the iceBlocks array after a delay
        this.scene.time.delayedCall(1000, () => {
            // Ensure cleanupIceBlocksArray exists on the scene
            if (this.scene.cleanupIceBlocksArray && typeof this.scene.cleanupIceBlocksArray === 'function') {
                this.scene.cleanupIceBlocksArray();
            } else {
                console.warn('[BombUtils.destroyBlocksInRadius] this.scene.cleanupIceBlocksArray is not a function or does not exist.');
            }
        });
    }
    
    /**
     * Categorizes blocks based on distance from explosion center and block type
     * @private
     * @param {number} x X position of the explosion
     * @param {number} y Y position of the explosion
     * @param {number} radius Radius of the explosion
     * @param {Array} blocksToDestroy Array to store blocks that should be destroyed
     * @param {Array} blocksToDamage Array to store blocks that should be damaged
     * @param {Array} dynamiteToTrigger Array to store dynamite blocks to trigger
     */
    _categorizeBlocksByDistance(x, y, radius, blocksToDestroy, blocksToDamage, dynamiteToTrigger) {
        // Check distance of each block from explosion center
        this.scene.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                if (distance < radius) {
                    if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
                        // Add dynamite blocks to a special trigger list
                        // with a short delay so they explode sequentially
                        const delay = (distance / radius) * 50; // shorter delay for chain reactions
                        dynamiteToTrigger.push({ block, delay });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.BOUNCY) {
                        // Bouncy blocks don't get destroyed, they reflect bombs
                        // However, we'll add a visual indication they were hit
                        this.scene.time.delayedCall(10, () => {
                            // Ensure blockUtils and createBouncyHitEffect exist on the scene
                            if (this.scene.blockUtils && typeof this.scene.blockUtils.createBouncyHitEffect === 'function') {
                                this.scene.blockUtils.createBouncyHitEffect(block.x, block.y);
                            } else {
                                console.warn('[BombUtils._categorizeBlocksByDistance] this.scene.blockUtils.createBouncyHitEffect is not a function or does not exist.');
                            }
                        });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.ETERNAL || 
                               block.blockType === this.scene.blockTypes.TYPES.STRONG) {
                        // Add multi-hit blocks to damage list
                        const delay = (distance / radius) * 100;
                        blocksToDamage.push({ block, delay });
                    } else {
                        // Regular blocks get destroyed
                        const delay = (distance / radius) * 100;
                        blocksToDestroy.push({ block, delay });
                    }
                }
            }
        });
    }
    
    /**
     * Processes destruction of regular blocks with delays
     * @private
     * @param {Array} blocksToDestroy Array of blocks to destroy
     */
    _processBlockDestruction(blocksToDestroy) {
        blocksToDestroy.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    this.destroyIceBlock(block); // Calls the method within BombUtils
                }
            });
        });
    }
    
    /**
     * Processes damage to stronger blocks with delays
     * @private
     * @param {Array} blocksToDamage Array of blocks to damage
     */
    _processBlockDamage(blocksToDamage) {
        blocksToDamage.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Ensure damageIceBlock exists on the scene
                    if (this.scene.damageIceBlock && typeof this.scene.damageIceBlock === 'function') {
                        this.scene.damageIceBlock(block);
                    } else {
                        console.warn('[BombUtils._processBlockDamage] this.scene.damageIceBlock is not a function or does not exist.');
                    }
                }
            });
        });
    }
    
    /**
     * Processes dynamite blocks triggering chain reactions
     * @private
     * @param {Array} dynamiteToTrigger Array of dynamite blocks to trigger
     */
    _processDynamiteTriggers(dynamiteToTrigger) {
        dynamiteToTrigger.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Create explosion at dynamite location
                    // Ensure blockUtils and createExplosion exist on the scene
                    if (this.scene.blockUtils && typeof this.scene.blockUtils.createExplosion === 'function') {
                        this.scene.blockUtils.createExplosion(block.x, block.y);
                    } else {
                        console.warn('[BombUtils._processDynamiteTriggers] this.scene.blockUtils.createExplosion is not a function or does not exist.');
                    }
                    
                    // Destroy the dynamite block
                    this.destroyIceBlock(block); // Calls the method within BombUtils
                    
                    // Destroy additional blocks in radius
                    this.destroyBlocksInRadius(block.x, block.y, 120); // Calls the method within BombUtils
                }
            });
        });
    }

    // Migrated and adapted from GameScene.js - THIS IS THE DEFINITION
    // New method to handle the special destruction properties of the Shatterer bomb
    destroyBlocksWithShatterer(x, y, radius) {
        if (!this.scene.iceBlocks) return;
        
        // Create a list to track blocks to be destroyed
        const blocksToDestroy = [];
        const dynamiteToTrigger = [];
        
        // Check distance of each block from explosion center
        this.scene.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                if (distance < radius) {
                    if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
                        // Add dynamite blocks to a special trigger list
                        const delay = (distance / radius) * 50; // shorter delay for chain reactions
                        dynamiteToTrigger.push({ block, delay });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.BOUNCY) {
                        // Bouncy blocks don't get destroyed by Shatterer either, just show they were hit
                        this.scene.time.delayedCall(10, () => {
                            if (this.scene.blockUtils) {
                                this.scene.blockUtils.createBouncyHitEffect(block.x, block.y);
                            }
                        });
                    } else {
                        // All other blocks (including Eternal and Strong) get destroyed in one hit
                        // by the Shatterer bomb
                        const delay = (distance / radius) * 100;
                        blocksToDestroy.push({ block, delay });
                    }
                }
            }
        });
        
        // Process block destruction with delays
        blocksToDestroy.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // If Eternal or Strong, play special effect before destruction
                    if (block.blockType === this.scene.blockTypes.TYPES.ETERNAL || block.blockType === this.scene.blockTypes.TYPES.STRONG) {
                        if (this.scene.blockUtils) {
                           this.scene.blockUtils.createShattererImpactEffect(block.x, block.y);
                        }
                    }
                    this.destroyIceBlock(block); // Correct (calls own method)
                }
            });
        });
        
        // Process dynamite triggers with delays
        dynamiteToTrigger.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Create explosion at dynamite location
                    if (this.scene.blockUtils) {
                        this.scene.blockUtils.createExplosion(block.x, block.y);
                    }
                    
                    // Destroy the dynamite block
                    this.destroyIceBlock(block); // Correct (calls own method)
                    
                    // Destroy additional blocks in radius
                    this.destroyBlocksInRadius(block.x, block.y, 120); // Corrected (calls own method)
                }
            });
        });
        
        // Clean up the iceBlocks array after a delay
        this.scene.time.delayedCall(1000, () => {
            if (typeof this.scene.cleanupIceBlocksArray === 'function') {
                 this.scene.cleanupIceBlocksArray();
            } else {
                console.warn("BombUtils.destroyBlocksWithShatterer: this.scene.cleanupIceBlocksArray is not a function.");
            }
        });
    }
}

// Export the BombUtils class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombUtils };
} else {
    // If not in Node.js, add to window object
    window.BombUtils = BombUtils;
} 