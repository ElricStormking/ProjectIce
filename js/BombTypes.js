// BombTypes.js - Contains all bomb-related functionality
class BombManager {
    constructor(scene) {
        // Reference to the main game scene
        this.scene = scene;
        
        // Define bomb types with names from Game Design Document
        // Use scene's BOMB_TYPES if available, otherwise define our own
        if (scene.BOMB_TYPES) {
            this.BOMB_TYPES = scene.BOMB_TYPES;
            console.log("BombManager: Using scene's BOMB_TYPES");
        } else {
            this.BOMB_TYPES = {
                BLAST: 'blast_bomb',
                PIERCER: 'piercer_bomb',
                CLUSTER: 'cluster_bomb',
                STICKY: 'sticky_bomb',
                SHATTERER: 'shatterer_bomb',
                DRILLER: 'driller_bomb',
                RICHOCHET: 'ricochet_bomb',
                SHRAPNEL: 'shrapnel_bomb',
                MELTER: 'melter_bomb'
            };
            console.log("BombManager: Defined own BOMB_TYPES");
        }
        
        // Bomb names based on Game Design Document
        this.BOMB_NAMES = {
            [this.BOMB_TYPES.BLAST]: 'Blast Girl',
            [this.BOMB_TYPES.PIERCER]: 'Piercer Girl',
            [this.BOMB_TYPES.CLUSTER]: 'Cluster Girl',
            [this.BOMB_TYPES.STICKY]: 'Sticky Girl',
            [this.BOMB_TYPES.SHATTERER]: 'Shatterer Girl',
            [this.BOMB_TYPES.DRILLER]: 'Driller Girl',
            [this.BOMB_TYPES.RICHOCHET]: 'Ricochet Girl',
            [this.BOMB_TYPES.SHRAPNEL]: 'Shrapnel Girl',
            [this.BOMB_TYPES.MELTER]: 'Melter Girl'
        };
        
        // Initialize array for sticky bombs
        this.activeStickyBombs = [];
        
        // Create bomb placeholders during initialization
        if (this.scene && this.scene.textures) {
            this.createBombPlaceholders();
        } else {
            console.warn('[BombManager.constructor] Scene or textures not available - placeholders will be created later');
        }
    }
    
    // Create placeholder graphics for any missing bomb textures
    createBombPlaceholders() {
        if (!this.scene || !this.scene.textures) {
            console.warn('[BombManager.createBombPlaceholders] Scene or textures not available');
            return;
        }
        
        console.log('[BombManager.createBombPlaceholders] Creating placeholder graphics for bombs');
        
        // Create a placeholder for the Shrapnel bomb if it doesn't exist
        if (!this.scene.textures.exists('shrapnel_bomb')) {
            console.log('[BombManager.createBombPlaceholders] Creating placeholder for shrapnel_bomb');
            
            // Create a graphics object for the Shrapnel bomb
            const graphics = this.scene.make.graphics();
            
            // Draw the bomb body (circle)
            graphics.fillStyle(0xFF6600); // Orange color
            graphics.fillCircle(30, 30, 30);
            
            // Add shrapnel-like lines radiating outward
            graphics.lineStyle(2, 0xFFCC00); // Yellow lines
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const innerX = 30 + Math.cos(angle) * 15;
                const innerY = 30 + Math.sin(angle) * 15;
                const outerX = 30 + Math.cos(angle) * 35;
                const outerY = 30 + Math.sin(angle) * 35;
                graphics.beginPath();
                graphics.moveTo(innerX, innerY);
                graphics.lineTo(outerX, outerY);
                graphics.strokePath();
            }
            
            // Add inner circle to represent the explosives
            graphics.fillStyle(0xFF3300); // Darker orange
            graphics.fillCircle(30, 30, 15);
            
            // Add a highlight effect
            graphics.fillStyle(0xFFFF99, 0.5); // Light yellow with transparency
            graphics.fillCircle(23, 23, 8);
            
            // Generate texture from the graphics
            graphics.generateTexture('shrapnel_bomb', 60, 60);
            graphics.destroy();
            
            console.log('[BombManager.createBombPlaceholders] Placeholder for shrapnel_bomb created successfully');
        }
        
        // Create placeholders for other bomb types if needed
        const bombTypes = [
            { key: 'blast_bomb', color: 0xFF0000 },      // Red
            { key: 'piercer_bomb', color: 0x0099FF },    // Light blue
            { key: 'cluster_bomb', color: 0xFFFF00 },    // Yellow
            { key: 'sticky_bomb', color: 0xFF00FF },     // Pink
            { key: 'shatterer_bomb', color: 0xCC3333 },  // Dark red
            { key: 'driller_bomb', color: 0xCC6600 },    // Brown
            { key: 'ricochet_bomb', color: 0x00FFFF },   // Cyan
            { key: 'melter_bomb', color: 0x00CC99 }      // Teal/Mint green for Melter
        ];
        
        // Create simple placeholders for any other missing bomb textures
        bombTypes.forEach(bombType => {
            if (!this.scene.textures.exists(bombType.key)) {
                console.log(`[BombManager.createBombPlaceholders] Creating placeholder for ${bombType.key}`);
                
                const graphics = this.scene.make.graphics();
                
                // Draw basic bomb circle
                graphics.fillStyle(bombType.color);
                graphics.fillCircle(30, 30, 30);
                
                // Add highlight
                graphics.fillStyle(0xFFFFFF, 0.4);
                graphics.fillCircle(20, 20, 10);
                
                // Generate texture
                graphics.generateTexture(bombType.key, 60, 60);
                graphics.destroy();
                
                console.log(`[BombManager.createBombPlaceholders] Placeholder for ${bombType.key} created successfully`);
            }
        });
        
        console.log('[BombManager.createBombPlaceholders] Bomb placeholder creation completed');
    }
    
    // Handle Blast Bomb explosion
    handleBlastBomb(x, y) {
        try {
            // Safety check - don't allow explosion if scene is in aiming state
            if (this.scene.isAiming) {
                console.log("BombManager: Prevented premature bomb explosion during aiming");
                return;
            }
            
            // Mark the bomb as exploded if it exists
            if (this.scene.bomb && !this.scene.bomb.hasExploded) {
                this.scene.bomb.hasExploded = true;
            }
            
            console.log(`BombManager: Creating explosion at (${x}, ${y})`);
            
            // Create explosion effect via effectsManager
            if (this.scene.effectsManager && typeof this.scene.effectsManager.createExplosion === 'function') {
                this.scene.effectsManager.createExplosion(x, y);
            } else {
                // Fallback to our own explosion if effects manager isn't available
                this.createExplosion(x, y);
            }
            
            // FIXED IMPLEMENTATION: Use the scene's destroyBlocksInRadius properly
            // This calls the properly implemented method in GameScene
            console.log("BombManager: Calling destroyBlocksInRadius with radius 150");
            
            // Added debug info to check if we have ice blocks available
            if (this.scene.iceBlocks) {
                console.log(`BombManager: Found ${this.scene.iceBlocks.length} ice blocks in the scene`);
                
                // Log ALL blocks for debugging when there are few blocks
                if (this.scene.iceBlocks.length < 10) {
                    console.log("BombManager: Logging all blocks for debugging:");
                    this.scene.iceBlocks.forEach((block, index) => {
                        if (block) {
                            const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                            console.log(`BombManager: Block ${index}: position=(${block.x}, ${block.y}), distance=${distance.toFixed(2)}, type=${block.blockType || 'unknown'}, isActive=${block.isActive}`);
                        } else {
                            console.log(`BombManager: Block ${index} is null or undefined`);
                        }
                    });
                } else {
                    // Log a few random blocks for debugging
                    for (let i = 0; i < Math.min(3, this.scene.iceBlocks.length); i++) {
                        const block = this.scene.iceBlocks[i];
                        if (block && block.isActive) {
                            const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                            console.log(`BombManager: Sample block ${i} at ${block.x}, ${block.y}, distance: ${distance.toFixed(2)}, type: ${block.blockType || 'unknown'}`);
                        }
                    }
                }
                
                // EMERGENCY MEASURE: If we have blocks but none are being destroyed,
                // directly destroy the closest block to guarantee progress
                const initialLength = this.scene.iceBlocks.length;
                
                // Call regular destroy method first
                if (this.scene.destroyBlocksInRadius) {
                    this.scene.destroyBlocksInRadius(x, y, 150);
                }
                
                // Check if any blocks were affected after a short delay
                this.scene.time.delayedCall(300, () => {
                    if (this.scene.iceBlocks && this.scene.iceBlocks.length === initialLength && initialLength > 0) {
                        console.log("BombManager: No blocks were destroyed, using emergency measure to destroy closest block");
                        
                        // Find the closest block
                        let closestBlock = null;
                        let closestDistance = Infinity;
                        
                        this.scene.iceBlocks.forEach(block => {
                            if (block && block.isActive) {
                                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                                if (distance < closestDistance) {
                                    closestDistance = distance;
                                    closestBlock = block;
                                }
                            }
                        });
                        
                        // Destroy it directly
                        if (closestBlock && this.scene.destroyIceBlock) {
                            console.log(`BombManager: Emergency destroying closest block at (${closestBlock.x}, ${closestBlock.y})`);
                            this.scene.destroyIceBlock(closestBlock);
                        }
                    }
                });
                
                // Still make all the regular calls with increasing radius
                this.scene.time.delayedCall(50, () => {
                    if (this.scene.destroyBlocksInRadius) {
                        console.log("BombManager: Making second call to destroyBlocksInRadius with larger radius");
                        this.scene.destroyBlocksInRadius(x, y, 170);
                    }
                });
                
                // Make a third call with a huge radius as a fallback if blocks are too far away
                this.scene.time.delayedCall(100, () => {
                    if (this.scene.destroyBlocksInRadius && this.scene.iceBlocks && this.scene.iceBlocks.length > 0) {
                        console.log("BombManager: Making third call to destroyBlocksInRadius with maximum radius");
                        this.scene.destroyBlocksInRadius(x, y, 300);
                        
                        // Last resort - if blocks still exist, try direct destruction
                        this.scene.time.delayedCall(100, () => {
                            if (this.scene.iceBlocks && this.scene.iceBlocks.length > 0) {
                                console.log("BombManager: Attempting direct destruction of all remaining blocks");
                                this.directDestroyAllBlocks();
                            }
                        });
                    }
                });
            } else {
                console.error("BombManager: No iceBlocks array found in scene!");
                // Fallback implementation if needed
                this.directDestroyBlocks(x, y, 150);
            }
            
            // Try to trigger sticky bombs
            if (this.scene.triggerStickyBomb && typeof this.scene.triggerStickyBomb === 'function') {
                this.scene.triggerStickyBomb(x, y, 150);
            }
            
            // Update bomb state
            if (this.scene.bombState) {
                this.scene.bombState.active = false;
            }
            
            // Add camera shake
            this.scene.cameras.main.shake(300, 0.01);
            
            // Play explosion sound if available
            if (this.scene.audioManager && typeof this.scene.audioManager.playSound === 'function') {
                this.scene.audioManager.playSound('explosion', { volume: 0.5 });
            }
        } catch (error) {
            console.error("Error in handleBlastBomb:", error);
        }
    }
    
    // Last resort method to destroy all blocks
    directDestroyAllBlocks() {
        try {
            if (!this.scene.iceBlocks || this.scene.iceBlocks.length === 0) {
                console.log("BombManager: No blocks to destroy in last resort method");
                return;
            }
            
            console.log(`BombManager: Attempting to destroy all ${this.scene.iceBlocks.length} blocks directly`);
            
            // Create a copy of the array to avoid modification during iteration
            const blocksToDestroy = [...this.scene.iceBlocks];
            
            // Destroy all blocks with staggered delays
            blocksToDestroy.forEach((block, index) => {
                if (block && block.isActive) {
                    this.scene.time.delayedCall(index * 50, () => {
                        if (this.scene.destroyIceBlock && block && block.isActive) {
                            console.log(`BombManager: Directly destroying block at (${block.x}, ${block.y})`);
                            this.scene.destroyIceBlock(block);
                        }
                    });
                }
            });
        } catch (error) {
            console.error("Error in directDestroyAllBlocks:", error);
        }
    }
    
    // Fallback method for direct block destruction (only used if destroyBlocksInRadius is missing)
    directDestroyBlocks(x, y, radius) {
        if (!this.scene.iceBlocks || this.scene.iceBlocks.length === 0) {
            console.warn("No ice blocks to destroy");
            return;
        }
        
        console.log(`Direct implementation checking ${this.scene.iceBlocks.length} ice blocks for destruction`);
        
        // Check distance of each block from explosion center
        const blocksToDestroy = [];
        
        this.scene.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                // FIXED: Use a more generous radius check to ensure blocks are destroyed
                if (distance < radius * 1.5) {
                    console.log(`Found block at (${block.x}, ${block.y}) within radius ${distance.toFixed(2)}`);
                    // Calculate delay based on distance
                    const delay = (distance / radius) * 100;
                    blocksToDestroy.push({ block, delay });
                }
            }
        });
        
        console.log(`Direct implementation found ${blocksToDestroy.length} blocks to destroy`);
        
        // If no blocks found with normal radius but there are active blocks, 
        // force destruction of the closest blocks
        if (blocksToDestroy.length === 0 && this.scene.iceBlocks.length > 0) {
            console.log("BombManager: No blocks in radius but blocks exist - destroying closest blocks");
            
            // Find the closest blocks
            const closestBlocks = this.scene.iceBlocks
                .filter(block => block && block.isActive)
                .map(block => {
                    const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                    return { block, distance, delay: 100 };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3); // Get up to 3 closest blocks
                
            closestBlocks.forEach(({ block, delay }, index) => {
                console.log(`BombManager: Force-destroying block at (${block.x}, ${block.y}), distance: ${block.distance}`);
                blocksToDestroy.push({ block, delay: delay + index * 50 });
            });
        }
        
        // Destroy blocks with proper delays
        blocksToDestroy.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive && typeof this.scene.destroyIceBlock === 'function') {
                    this.scene.destroyIceBlock(block);
                }
            });
        });
    }
    
    // Create our own explosion effect
    createExplosion(x, y, radius = 80) {
        try {
            // Create visual explosion
            const explosion = this.scene.add.circle(x, y, radius, 0xffaa00, 0.5);
            explosion.setDepth(6);
            
            // Animate the explosion
            this.scene.tweens.add({
                targets: explosion,
                alpha: 0,
                scale: 1.5,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    explosion.destroy();
                }
            });
            
            // Create particle effect
            const particles = this.scene.add.particles('particle');
            particles.setDepth(6);
            
            const emitter = particles.createEmitter({
                speed: { min: 50, max: 200 },
                scale: { start: 1, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 800,
                blendMode: 'ADD',
                tint: [0xffff00, 0xff6600]
            });
            
            // Emit particles at explosion point
            emitter.explode(40, x, y);
            
            // Add camera shake
            this.scene.cameras.main.shake(200, 0.01);
            
            // Play explosion sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playSound('explosion', { volume: 0.5 });
            }
        } catch (error) {
            console.error("Error creating explosion:", error);
        }
    }
    
    // Create block shatter effect
    createBlockShatter(block) {
        try {
            // Create 2-3 small particles at the block's position
            const particles = this.scene.add.particles('particle');
            const emitter = particles.createEmitter({
                speed: { min: 30, max: 80 },
                scale: { start: 0.2, end: 0 },
                alpha: { start: 0.8, end: 0 },
                lifespan: 600,
                blendMode: 'ADD',
                tint: 0xaaddff // Light blue for ice
            });
            
            // Emit particles at block position
            emitter.explode(10, block.x, block.y);
            
            // Clean up after particles are done
            this.scene.time.delayedCall(700, () => {
                particles.destroy();
            });
        } catch (error) {
            console.error("Error in createBlockShatter:", error);
        }
    }
    
    // Handle Piercer Bomb explosion
    handlePiercerBomb(x, y) {
        try {
            console.log(`BombManager: Handling piercer bomb at (${x}, ${y})`);
            
            // Create the main explosion via effectsManager
            if (this.scene.effectsManager && typeof this.scene.effectsManager.createExplosion === 'function') {
                this.scene.effectsManager.createExplosion(x, y);
            } else {
                // Fallback to our own explosion if effects manager isn't available
                this.createExplosion(x, y);
            }
            
            // Calculate a line through the impact point
            const angleDegrees = Phaser.Math.Between(0, 360);
            const angleRadians = Phaser.Math.DegToRad(angleDegrees);
            
            // Define the line length
            const lineLength = 300;
            
            // Calculate end coordinates
            const endX = x + Math.cos(angleRadians) * lineLength;
            const endY = y + Math.sin(angleRadians) * lineLength;
            
            // Draw debug line
            console.log(`Piercer angle: ${angleDegrees}° (${angleRadians.toFixed(2)} rad), from (${x},${y}) to (${endX.toFixed(0)},${endY.toFixed(0)})`);
            
            // Number of points to check along the line
            const points = 10;
            
            // Check points along the line for blocks to destroy
            for (let i = 0; i < points; i++) {
                const t = i / (points - 1);  // Normalized distance along the line (0 to 1)
                const pointX = x + (endX - x) * t;
                const pointY = y + (endY - y) * t;
                
                // Create small explosions along the line
                this.scene.time.delayedCall(i * 50, () => {
                    // Use a particle effect along the line
                    const particles = this.scene.add.particles('particle');
                    particles.setDepth(6);
                    
                    const emitter = particles.createEmitter({
                        speed: { min: 20, max: 60 },
                        scale: { start: 0.5, end: 0 },
                        alpha: { start: 0.7, end: 0 },
                        lifespan: 400,
                        blendMode: 'ADD',
                        tint: 0x77aaff
                    });
                    
                    // Burst of particles at this point
                    emitter.explode(10, pointX, pointY);
                    
                    // Clean up particles after they're done
                    this.scene.time.delayedCall(500, () => {
                        particles.destroy();
                    });
                    
                    // Destroy blocks at this point using the scene's method
                    if (this.scene.destroyBlocksInRadius) {
                        this.scene.destroyBlocksInRadius(pointX, pointY, 30);
                    } else {
                        this.directDestroyBlocks(pointX, pointY, 30);
                    }
                });
            }
            
            // Add mild camera shake
            this.scene.cameras.main.shake(200, 0.008);
            
            // Play sound if available
            if (this.scene.audioManager) {
                this.scene.audioManager.playSound('piercer', { volume: 0.6 });
            }
        } catch (error) {
            console.error("Error in handlePiercerBomb:", error);
        }
    }
    
    // Handle Cluster Bomb explosion
    handleClusterBomb(x, y) {
        try {
            console.log(`BombManager: Handling cluster bomb at (${x}, ${y})`);
            
            // Create the primary explosion via effectsManager
            if (this.scene.effectsManager && typeof this.scene.effectsManager.createExplosion === 'function') {
                this.scene.effectsManager.createExplosion(x, y);
            } else {
                // Fallback to our own explosion if effects manager isn't available
                this.createExplosion(x, y);
            }
            
            // Call destroyBlocksInRadius for primary explosion
            if (this.scene.destroyBlocksInRadius) {
                this.scene.destroyBlocksInRadius(x, y, 100);
            } else {
                this.directDestroyBlocks(x, y, 100);
            }
            
            // Number of cluster bombs
            const numClusters = Phaser.Math.Between(3, 5);
            
            // Radius within which cluster bombs appear
            const clusterRadius = 150;
            
            // Create cluster explosions
            for (let i = 0; i < numClusters; i++) {
                // Add a small delay before cluster activates
                this.scene.time.delayedCall(300 + i * 100, () => {
                    // Random position within radius
                    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                    const distance = Phaser.Math.FloatBetween(50, clusterRadius);
                    
                    const clusterX = x + Math.cos(angle) * distance;
                    const clusterY = y + Math.sin(angle) * distance;
                    
                    // Create mini explosion via effectsManager
                    if (this.scene.effectsManager && typeof this.scene.effectsManager.createMiniExplosion === 'function') {
                        this.scene.effectsManager.createMiniExplosion(clusterX, clusterY);
                    } else {
                        // Fallback to our own explosion if effects manager isn't available
                        this.createExplosion(clusterX, clusterY, 40); // Smaller radius for mini explosion
                    }
                    
                    // Destroy blocks around cluster point
                    if (this.scene.destroyBlocksInRadius) {
                        this.scene.destroyBlocksInRadius(clusterX, clusterY, 70);
                    } else {
                        this.directDestroyBlocks(clusterX, clusterY, 70);
                    }
                    
                    // Add a small camera shake for each cluster
                    this.scene.cameras.main.shake(100, 0.005);
                });
            }
            
            // Add camera shake for primary explosion
            this.scene.cameras.main.shake(200, 0.01);
            
            // Play explosion sound
            if (this.scene.audioManager) {
                this.scene.audioManager.playSound('cluster', { volume: 0.7 });
            }
        } catch (error) {
            console.error("Error in handleClusterBomb:", error);
        }
    }
    
    // Handle Sticky Bomb explosion
    handleStickyBomb(x, y, block) {
        try {
            // If no block to stick to, fall back to blast bomb
            if (!block) {
                this.handleBlastBomb(x, y);
                return;
            }
            
            // Create visual feedback that it's sticking
            const stickyFeedback = this.scene.add.sprite(x, y, 'sticky_effect');
            stickyFeedback.setScale(0.5);
            stickyFeedback.play('sticky_effect_anim');
            stickyFeedback.once('animationcomplete', () => {
                stickyFeedback.destroy();
            });
            
            // Create the bomb object that will stick to the target
            const stickyBomb = {
                x: x,
                y: y,
                block: block,
                countdown: 3000, // 3 seconds until explosion
                sprite: this.scene.add.sprite(x, y, 'sticky_bomb'),
                countdownText: this.scene.add.text(x, y - 20, '3', {
                    font: '24px Arial',
                    fill: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5)
            };
            
            // Add the sticky bomb to our active list
            this.activeStickyBombs.push(stickyBomb);
            
            // Set up a timer to update the countdown display
            const countdownInterval = setInterval(() => {
                stickyBomb.countdown -= 1000;
                if (stickyBomb.countdown <= 0) {
                    clearInterval(countdownInterval);
                    return;
                }
                const seconds = Math.ceil(stickyBomb.countdown / 1000);
                stickyBomb.countdownText.setText(seconds.toString());
            }, 1000);
            
            // Set up the explosion timer
            this.scene.time.delayedCall(stickyBomb.countdown, () => {
                // Only trigger if the bomb still exists (hasn't been cleared by level completion)
                const bombIndex = this.activeStickyBombs.indexOf(stickyBomb);
                if (bombIndex >= 0) {
                    this.activeStickyBombs.splice(bombIndex, 1);
                    this.triggerStickyBomb(stickyBomb.x, stickyBomb.y, 150);
                    
                    // Clean up sticky bomb resources
                    if (stickyBomb.sprite) stickyBomb.sprite.destroy();
                    if (stickyBomb.countdownText) stickyBomb.countdownText.destroy();
                }
            });
        } catch (error) {
            console.error("Error in handleStickyBomb:", error);
        }
    }
    
    // Trigger a sticky bomb explosion
    triggerStickyBomb(x, y, radius) {
        try {
            // Create a larger explosion effect than regular blast
            this.scene.createLargeExplosion(x, y);
            
            // Destroy blocks in radius (slightly larger than blast bomb)
            this.scene.destroyBlocksInRadius(x, y, radius);
        } catch (error) {
            console.error("Error in triggerStickyBomb:", error);
        }
    }
    
    // Handle Shatterer Bomb explosion
    handleShattererBomb(x, y) {
        try {
            // Shatterer bomb creates a large shockwave
            
            // Create visual effect - more powerful than standard explosion
            const particles = this.scene.add.particles(x, y, 'shatterer_particle', {
                speed: { min: 200, max: 400 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                lifespan: { min: 800, max: 1000 },
                blendMode: 'ADD',
                gravityY: 0,
                quantity: 40
            });
            
            // Create a shockwave visual with ring effect
            this.scene.createShattererImpactEffect(x, y);
            
            // Add a delay before destroying the particles
            this.scene.time.delayedCall(1000, () => {
                particles.destroy();
            });
            
            // Radius is larger than blast bomb
            const radius = 200;
            
            // Special destruction that can damage/break "strong" blocks too
            this.scene.destroyBlocksWithShatterer(x, y, radius);
            
        } catch (error) {
            console.error("Error in handleShattererBomb:", error);
        }
    }
    
    // Handle Driller Bomb
    handleDrillerBomb(x, y, block) {
        try {
            // If no block to drill, fall back to blast bomb
            if (!block) {
                this.handleBlastBomb(x, y);
                return;
            }
            
            // Create drill effect
            this.scene.createDrillEffect(x, y);
            
            // Initial small explosion at impact site
            this.scene.createMiniExplosion(x, y);
            
            // Get initial direction based on block position relative to chibi girl
            const chibiCenter = {
                x: this.scene.chibiImage.x,
                y: this.scene.chibiImage.y
            };
            
            // Direction away from chibi
            const directionX = x - chibiCenter.x;
            const directionY = y - chibiCenter.y;
            
            // Normalize direction
            const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);
            let normalizedDirX = magnitude > 0 ? directionX / magnitude : 1;
            let normalizedDirY = magnitude > 0 ? directionY / magnitude : 0;
            
            // Start position is at the impact block
            let currentX = x;
            let currentY = y;
            
            // How far we've drilled
            let drillDistance = 0;
            const maxDrillDistance = 500; // Maximum pixel distance
            const drillStep = 20; // Pixels per step
            const maxSteps = maxDrillDistance / drillStep;
            let currentStep = 0;
            
            // Blocks we've already processed to avoid duplicates
            const processedBlocks = new Set();
            
            // Add the initial block
            if (block) {
                processedBlocks.add(block);
            }
            
            // Set up recursive function to drill in steps
            const doDrillStep = () => {
                if (currentStep >= maxSteps || this.scene.isLevelComplete) {
                    // We've reached the maximum drilling distance or level completed
                    this.scene.createDrillerExplosion(currentX, currentY);
                    return;
                }
                
                // Move to next position
                currentX += normalizedDirX * drillStep;
                currentY += normalizedDirY * drillStep;
                currentStep++;
                drillDistance += drillStep;
                
                // Create drilling effect at current position
                const drillEffect = this.scene.add.sprite(currentX, currentY, 'drill_effect');
                drillEffect.setScale(0.7);
                drillEffect.play('drill_effect_anim');
                drillEffect.once('animationcomplete', () => {
                    drillEffect.destroy();
                });
                
                // Check for blocks near the current drill position
                const nearbyBlocks = this.scene.iceBlocks.filter(b => {
                    // Skip blocks we've already processed
                    if (processedBlocks.has(b)) return false;
                    
                    // Calculate distance
                    const dx = b.x - currentX;
                    const dy = b.y - currentY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Block is within drill radius
                    return distance < 40;
                });
                
                let blocksDestroyed = false;
                
                // Process found blocks
                nearbyBlocks.forEach(b => {
                    processedBlocks.add(b);
                    
                    // Different behavior for different block types
                    switch (b.blockType) {
                        case this.scene.blockManager.BLOCK_TYPES.ETERNAL:
                            // Can't destroy eternal blocks, bounce off them
                            this.scene.createDrillerExplosion(currentX, currentY);
                            currentStep = maxSteps; // Stop drilling
                            return;
                            
                        case this.scene.blockManager.BLOCK_TYPES.STRONG:
                            // Damage strong blocks, might take multiple hits
                            this.scene.damageIceBlock(b);
                            blocksDestroyed = true;
                            break;
                            
                        case this.scene.blockManager.BLOCK_TYPES.DYNAMITE:
                            // Trigger dynamite block explosion
                            this.scene.destroyIceBlock(b);
                            blocksDestroyed = true;
                            break;
                            
                        default:
                            // Standard block gets destroyed
                            this.scene.destroyIceBlock(b);
                            blocksDestroyed = true;
                            break;
                    }
                });
                
                // If we've destroyed blocks, slightly adjust trajectory randomly
                if (blocksDestroyed && Math.random() < 0.3) {
                    // Add some randomness to drilling direction
                    const angleChange = (Math.random() - 0.5) * Math.PI / 4; // ±45 degrees
                    const cosAngle = Math.cos(angleChange);
                    const sinAngle = Math.sin(angleChange);
                    
                    // Rotate direction vector
                    const newDirX = normalizedDirX * cosAngle - normalizedDirY * sinAngle;
                    const newDirY = normalizedDirX * sinAngle + normalizedDirY * cosAngle;
                    
                    normalizedDirX = newDirX;
                    normalizedDirY = newDirY;
                }
                
                // Schedule next drill step with a short delay
                this.scene.time.delayedCall(100, doDrillStep);
            };
            
            // Start the drilling sequence
            doDrillStep();
            
        } catch (error) {
            console.error("Error in handleDrillerBomb:", error);
        }
    }
    
    // Handle Ricochet Bomb
    handleRicochetExplosion(bomb) {
        try {
            // Create explosion at the bomb's position, regardless of bounce count
                this.handleBlastBomb(bomb.x, bomb.y);
                return true;
        } catch (error) {
            console.error("Error in handleRicochetExplosion:", error);
            return false;
        }
    }
    
    // Handle Shrapnel Bomb explosion - fragments into multiple projectiles
    handleShrapnelBomb(x, y) {
        try {
            console.log(`BombManager: Handling shrapnel bomb at (${x}, ${y})`);
            
            // Create initial small explosion at impact point
            if (this.scene.effectsManager && typeof this.scene.effectsManager.createExplosion === 'function') {
                this.scene.effectsManager.createExplosion(x, y);
            } else {
                this.createExplosion(x, y);
            }
            
            // Destroy blocks in small radius at impact point
            if (this.scene.destroyBlocksInRadius) {
                this.scene.destroyBlocksInRadius(x, y, 60);
            } else {
                this.directDestroyBlocks(x, y, 60);
            }
            
            // Check for sticky bombs in initial explosion radius
            if (this.scene.triggerStickyBomb) {
                this.scene.triggerStickyBomb(x, y, 60);
            }
            
            // Create 6-10 shrapnel fragments
            const numFragments = Phaser.Math.Between(6, 10);
            const maxDistance = 300; // Maximum distance fragments can travel
            
            console.log(`BombManager: Creating ${numFragments} shrapnel fragments`);
            
            // Create fragments in all directions
            for (let i = 0; i < numFragments; i++) {
                // Calculate angle for even distribution
                const angle = (i / numFragments) * Math.PI * 2;
                
                // Add some random variation to angle
                const finalAngle = angle + (Math.random() - 0.5) * (Math.PI / 8);
                
                // Calculate random distance
                const distance = 100 + Math.random() * (maxDistance - 100);
                
                // Calculate fragment position
                const fragmentX = x + Math.cos(finalAngle) * distance;
                const fragmentY = y + Math.sin(finalAngle) * distance;
                
                // Add delay based on distance from center (fragments fly outward)
                const delay = (distance / maxDistance) * 500;
                
                // Create delayed fragment explosion
                this.scene.time.delayedCall(delay, () => {
                    // Create fragment visual effect
                    this.createShrapnelFragment(x, y, fragmentX, fragmentY);
                    
                    // Create mini explosion at fragment impact
                    if (this.scene.effectsManager && typeof this.scene.effectsManager.createMiniExplosion === 'function') {
                        this.scene.effectsManager.createMiniExplosion(fragmentX, fragmentY);
                    } else {
                        this.createExplosion(fragmentX, fragmentY, 40); // Smaller radius for mini explosion
                    }
                    
                    // Destroy blocks in smaller radius
                    if (this.scene.destroyBlocksInRadius) {
                        this.scene.destroyBlocksInRadius(fragmentX, fragmentY, 40);
                    } else {
                        this.directDestroyBlocks(fragmentX, fragmentY, 40);
                    }
                    
                    // Check for sticky bombs in fragment explosion
                    if (this.scene.triggerStickyBomb) {
                        this.scene.triggerStickyBomb(fragmentX, fragmentY, 40);
                    }
                });
            }
            
            // Add camera shake
            this.scene.cameras.main.shake(300, 0.01);
            
            // Play shrapnel sound
            if (this.scene.audioManager && typeof this.scene.audioManager.playSound === 'function') {
                this.scene.audioManager.playSound('explosion', { volume: 0.6, rate: 1.2 }); // Higher pitch for shrapnel
            }
        } catch (error) {
            console.error("Error in handleShrapnelBomb:", error);
        }
    }
    
    // Create visual effect for shrapnel fragment trail
    createShrapnelFragment(startX, startY, endX, endY) {
        try {
            // Create a particle trail for the fragment
            const particles = this.scene.add.particles('particle');
            particles.setDepth(6);
            
            // Calculate the trajectory
            const dirX = endX - startX;
            const dirY = endY - startY;
            const distance = Math.sqrt(dirX * dirX + dirY * dirY);
            
            // Create particles along the path
            const numPoints = Math.min(20, Math.floor(distance / 15));
            
            for (let i = 0; i < numPoints; i++) {
                const t = i / (numPoints - 1); // 0 to 1
                const pointX = startX + dirX * t;
                const pointY = startY + dirY * t;
                
                // Create small particle burst at this point
                const emitter = particles.createEmitter({
                    x: pointX,
                    y: pointY,
                    speed: { min: 5, max: 20 },
                    scale: { start: 0.3, end: 0 },
                    alpha: { start: 0.6, end: 0 },
                    lifespan: 300,
                    blendMode: 'ADD',
                    tint: 0xff8800, // Orange color for shrapnel
                });
                
                // Small burst at each point
                emitter.explode(2, pointX, pointY);
            }
            
            // Clean up particles
            this.scene.time.delayedCall(600, () => {
                particles.destroy();
            });
        } catch (error) {
            console.error("Error in createShrapnelFragment:", error);
        }
    }
    
    // Handle Melter Bomb - melts same-type blocks over time
    handleMelterBomb(x, y, block) {
        try {
            console.log(`BombManager: Handling melter bomb at (${x}, ${y})`);
            
            // If no valid block to melt, find closest block instead of creating explosion
            if (!block || !block.isActive) {
                console.log("BombManager: No direct hit on block, searching for nearby blocks");
                
                // Find closest block within a reasonable radius
                let closestBlock = null;
                let closestDistance = 150; // Maximum search radius
                
                if (this.scene.iceBlocks && this.scene.iceBlocks.length > 0) {
                    this.scene.iceBlocks.forEach(iceBlock => {
                        if (iceBlock && iceBlock.isActive) {
                            const distance = Phaser.Math.Distance.Between(x, y, iceBlock.x, iceBlock.y);
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestBlock = iceBlock;
                            }
                        }
                    });
                }
                
                if (closestBlock) {
                    console.log(`BombManager: Found closest block at distance ${closestDistance.toFixed(1)}`);
                    block = closestBlock;
                    // Adjust impact position to block's position for better visual effect
                    x = block.x;
                    y = block.y;
                } else {
                    // Just create splash effect without melting anything
                    console.log("BombManager: No blocks found nearby, just creating visual effect");
                    this.createMeltEffect(x, y);
                    return;
                }
            }
            
            // Create enhanced visual melt effect at impact point
            // NO EXPLOSION OR IMMEDIATE DAMAGE - just visual effects
            this.createMeltEffect(x, y);
            
            // Find up to 30 blocks to melt (now can affect any block type)
            const targetBlockType = block.blockType;
            const maxBlocksToMelt = 30;
            const searchRadius = 500;
            const blocksToMelt = [];
            
            // Add the initial block
            blocksToMelt.push(block);
            
            // Find other blocks of the same type first
            if (this.scene.iceBlocks) {
                this.scene.iceBlocks.forEach(iceBlock => {
                    // Make sure it's not the same block, is active, and is the same type
                    if (iceBlock && iceBlock.isActive && iceBlock !== block && 
                        iceBlock.blockType === targetBlockType) {
                        
                        const distance = Phaser.Math.Distance.Between(x, y, iceBlock.x, iceBlock.y);
                        if (distance < searchRadius) {
                            blocksToMelt.push(iceBlock);
                        }
                    }
                });
                
                // If we didn't find enough same-type blocks, add some Strong/Eternal blocks too
                if (blocksToMelt.length < maxBlocksToMelt) {
                    this.scene.iceBlocks.forEach(iceBlock => {
                        if (iceBlock && iceBlock.isActive && iceBlock !== block && 
                            iceBlock.blockType !== targetBlockType && 
                            (iceBlock.blockType === this.scene.blockTypes.TYPES.STRONG || 
                             iceBlock.blockType === this.scene.blockTypes.TYPES.ETERNAL)) {
                            
                            const distance = Phaser.Math.Distance.Between(x, y, iceBlock.x, iceBlock.y);
                            if (distance < searchRadius && blocksToMelt.indexOf(iceBlock) === -1) {
                                blocksToMelt.push(iceBlock);
                                if (blocksToMelt.length >= maxBlocksToMelt) {
                                    return; // Exit the forEach if we have enough blocks
                                }
                            }
                        }
                    });
                }
            }
            
            // Limit to max blocks
            const actualBlocks = blocksToMelt.slice(0, maxBlocksToMelt);
            
            console.log(`BombManager: Melter found ${actualBlocks.length} blocks to melt (including Strong/Eternal if available)`);
            
            // Create visual paths connecting blocks being melted
            this.createMeltConnectionPaths(x, y, actualBlocks);
            
            // Melt each block with a progressive delay but only apply visuals, no damage
            actualBlocks.forEach((blockToMelt, index) => {
                // Add increasing delay for each block to create a wave-like effect
                const delay = 100 + (index * 75);
                
                this.scene.time.delayedCall(delay, () => {
                    if (blockToMelt && blockToMelt.isActive) {
                        // Create enhanced melting effect on the block - 3 second duration
                        this.createMeltingBlockEffect(blockToMelt);
                        
                        // Delay destruction by 3 seconds to allow full melting effect to play
                        const destructionDelay = 3000 + (index * 25); // Exactly 3 seconds per block + spread delay
                        
                        this.scene.time.delayedCall(destructionDelay, () => {
                            // Melter bombs can destroy ANY block type after 3-second melting
                            // INCLUDING Strong and Eternal blocks
                            if (blockToMelt && blockToMelt.isActive && typeof this.scene.destroyIceBlock === 'function') {
                                this.scene.destroyIceBlock(blockToMelt);
                            }
                        });
                    }
                });
            });
            
            // Play melting sound
            if (this.scene.audioManager && typeof this.scene.audioManager.playSound === 'function') {
                this.scene.audioManager.playSound('melt', { volume: 0.7 }); // Slightly louder
            } else {
                try {
                    this.scene.sound.play('melt', { volume: 0.7 });
                } catch (e) {
                    console.log("Melt sound not available:", e);
                }
            }
            
            // Add a subtle camera effect instead of shake
            if (this.scene.cameras && this.scene.cameras.main) {
                this.scene.cameras.main.flash(300, 0, 204, 153, 0.3); // Subtle teal flash
            }
            
        } catch (error) {
            console.error("Error in handleMelterBomb:", error);
        }
    }
    
    // Create melt effect at impact point
    createMeltEffect(x, y) {
        // Create enhanced melting splash visual
        const meltSplash = this.scene.add.circle(x, y, 80, 0x00CC99, 0.8);
        meltSplash.setDepth(6);
        
        // Create a pulsing effect for more emphasis
        this.scene.tweens.add({
            targets: meltSplash,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Then fade out more slowly
                this.scene.tweens.add({
                    targets: meltSplash,
                    alpha: 0,
                    scale: 3,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        meltSplash.destroy();
                    }
                });
            }
        });
        
        // Add second inner splash for layered effect
        const innerSplash = this.scene.add.circle(x, y, 40, 0x00FFCC, 0.9);
        innerSplash.setDepth(7);
        
        this.scene.tweens.add({
            targets: innerSplash,
            scale: 0.6,
            duration: 300,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: innerSplash,
                    alpha: 0,
                    scale: 2.5,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        innerSplash.destroy();
                    }
                });
            }
        });
        
        // Create "ripple" effect
        const ripple = this.scene.add.circle(x, y, 20, 0x00FFCC, 0);
        ripple.setStrokeStyle(3, 0x00FFCC, 0.7);
        ripple.setDepth(6);
        
        this.scene.tweens.add({
            targets: ripple,
            scale: 4,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                ripple.destroy();
            }
        });
        
        // Add enhanced melt particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 120 }, // Faster particles
            scale: { start: 1.2, end: 0 }, // Larger particles
            alpha: { start: 0.9, end: 0 }, // More visible
            lifespan: 1200, // Longer lifetime
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC, 0x66FFCC], // More varied teal/mint colors
            quantity: 25
        });
        
        // Emit particles in multiple bursts for more dramatic effect
        emitter.explode(40, x, y);
        this.scene.time.delayedCall(150, () => {
            emitter.explode(20, x, y);
        });
        this.scene.time.delayedCall(300, () => {
            emitter.explode(10, x, y);
        });
        
        // Clean up particles after they're finished
        this.scene.time.delayedCall(1500, () => {
            particles.destroy();
        });
    }
    
    // Create visual paths connecting the blocks being melted
    createMeltConnectionPaths(sourceX, sourceY, blocksToMelt) {
        if (!this.scene || blocksToMelt.length <= 1) return;
        
        // Create a fading path between source point and each block
        blocksToMelt.forEach((block, index) => {
            if (index === 0) return; // Skip the first block (impact block)
            
            // Calculate direction from source to block
            const dirX = block.x - sourceX;
            const dirY = block.y - sourceY;
            const distance = Math.sqrt(dirX * dirX + dirY * dirY);
            
            // Only create paths for reasonably distant blocks
            if (distance < 40) return;
            
            // Create a trail of particles along the path
            const particles = this.scene.add.particles('particle');
            particles.setDepth(4); // Below blocks
            
            // Number of points along the path
            const numPoints = Math.min(Math.floor(distance / 20), 10);
            const pathDelay = index * 75; // Match the block melting delay
            
            this.scene.time.delayedCall(pathDelay, () => {
                // Emit particles along the path
                for (let i = 0; i < numPoints; i++) {
                    const t = i / (numPoints - 1); // 0 to 1
                    const pointX = sourceX + (dirX * t);
                    const pointY = sourceY + (dirY * t);
                    
                    // Create small melt particle burst at this point
                    const emitter = particles.createEmitter({
                        x: pointX,
                        y: pointY,
                        speed: { min: 10, max: 30 },
                        scale: { start: 0.3, end: 0 },
                        alpha: { start: 0.7, end: 0 },
                        lifespan: 700,
                        blendMode: 'ADD',
                        tint: 0x00CC99,
                        quantity: 2
                    });
                    
                    // Small burst at each point with progressive delay
                    const pointDelay = i * 50;
                    this.scene.time.delayedCall(pointDelay, () => {
                        emitter.explode(3, pointX, pointY);
                    });
                }
                
                // Clean up the particles
                this.scene.time.delayedCall(1500, () => {
                    particles.destroy();
                });
            });
        });
    }
    
    // Create melting effect on a specific block
    createMeltingBlockEffect(block) {
        if (!block || !block.scene) return;
        
        // Add melting text label
        const meltMarker = this.scene.add.text(block.x, block.y - block.height/2 - 15, "MELTING", {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#00FFCC',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(20);
        
        // Add countdown timer text
        const countdownText = this.scene.add.text(block.x, block.y, "3", {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);
        
        // Add glowing outline to show block is melting
        const glowOutline = this.scene.add.rectangle(
            block.x, block.y,
            block.width * 1.2, block.height * 1.2,
            0x00FFCC, 0.6
        );
        glowOutline.setDepth(block.depth - 0.1); // Behind the block
        
        // Pulse the glow throughout the 3-second duration
        this.scene.tweens.add({
            targets: glowOutline,
            alpha: { from: 0.6, to: 0.9 },
            scale: { from: 1.0, to: 1.2 },
            duration: 600,
            yoyo: true,
            repeat: 4, // Repeat for the full 3 seconds
            ease: 'Sine.easeInOut'
        });
        
        // Create an enhanced melting overlay
        const meltOverlay = this.scene.add.rectangle(
            block.x, block.y,
            block.width * 1.1, block.height * 1.1,
            0x00CC99, 0.5 // More opaque
        );
        meltOverlay.setDepth(block.depth + 0.1); // Just above the block
        
        // Create enhanced dripping particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(block.depth + 0.2); // Above the block
        
        // Enhanced dripping emitter - more particles flowing downward
        const drippingEmitter = particles.createEmitter({
            x: {min: block.x - block.width/2, max: block.x + block.width/2},
            y: {min: block.y - block.height/2, max: block.y + block.height/2},
            speedY: { min: 30, max: 80 }, // Faster drip downward
            speedX: { min: -10, max: 10 },  // More sideways movement for dynamic effect
            scale: { start: 0.4, end: 0 }, // Larger particles
            alpha: { start: 0.9, end: 0 }, // More visible
            lifespan: 2000, // Longer lifetime for 3-second effect
            frequency: 40, // Emit more frequently
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC, 0x66FFCC, 0x00FFAA] // More varied colors
        });
        
        // Add a larger "puddle" effect at the bottom
        const puddleY = block.y + block.height/2 + 10;
        const puddleEmitter = particles.createEmitter({
            x: {min: block.x - block.width/2 - 5, max: block.x + block.width/2 + 5},
            y: puddleY,
            speedY: { min: -5, max: 5 },
            speedX: { min: -25, max: 25 }, // Wider spread horizontally
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1500,
            frequency: 60,
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC]
        });
        
        // Start dripping animations
        drippingEmitter.start();
        puddleEmitter.start();
        
        // Update countdown text for the 3-second duration
        let timeLeft = 3; // Start with 3 seconds
        
        const updateTimer = this.scene.time.addEvent({
            delay: 1000, // Every second
            repeat: 2, // 0, 1, 2 = 3 updates
            callback: () => {
                timeLeft--;
                countdownText.setText(timeLeft.toString());
                
                // Pulse the countdown text
                this.scene.tweens.add({
                    targets: countdownText,
                    scale: 1.5,
                    duration: 200,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                
                // Change color as time decreases
                if (timeLeft === 2) {
                    countdownText.setColor('#FFFF00'); // Yellow at 2
                } else if (timeLeft === 1) {
                    countdownText.setColor('#FF0000'); // Red at 1
                }
            }
        });
        
        // Animate the melting effect - exactly 3 seconds
        this.scene.tweens.add({
            targets: [block, meltOverlay],
            alpha: 0.2,  // Fade as it melts
            scaleY: 0.15, // Squish vertically more dramatically
            scaleX: 1.4, // Spread horizontally more
            y: block.y + block.height/2 + 5, // Move down slightly as it melts
            duration: 3000, // Exactly 3 seconds to melt
            ease: 'Power2',
            onComplete: () => {
                // Stop emitting but let existing particles finish
                drippingEmitter.stop();
                puddleEmitter.stop();
                
                // Stop the timer if it's still running
                if (updateTimer) {
                    updateTimer.remove();
                }
                
                // Clean up melting visuals
                meltOverlay.destroy();
                glowOutline.destroy();
                meltMarker.destroy();
                countdownText.destroy();
                
                // Particles will be cleaned up after block destruction
                this.scene.time.delayedCall(2000, () => {
                    if (particles && particles.scene) {
                        particles.destroy();
                    }
                });
            }
        });
    }
    
    // Clean up all bomb resources
    cleanup() {
        // Clear any sticky bombs
        this.activeStickyBombs.forEach(bomb => {
            if (bomb.sprite) bomb.sprite.destroy();
            if (bomb.countdownText) bomb.countdownText.destroy();
        });
        this.activeStickyBombs = [];
    }
}

// Export the BombManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombManager };
} else {
    // If not in Node.js, add to window object
    window.BombManager = BombManager;
} 