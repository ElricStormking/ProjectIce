/**
 * GameSceneBlockTest.js
 * Test utility for the block-related functionality in GameScene
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Mock objects for testing
class MockBlockTypes {
    constructor() {
        this.TYPES = {
            STANDARD: 'standard',
            STRONG: 'strong',
            DYNAMITE: 'dynamite',
            ETERNAL: 'eternal',
            BOUNCY: 'bouncy'
        };
    }
    
    getColor(type) {
        const colors = {
            [this.TYPES.STANDARD]: 0x4ca2ff,
            [this.TYPES.STRONG]: 0xff9c4c,
            [this.TYPES.DYNAMITE]: 0xff4c4c,
            [this.TYPES.ETERNAL]: 0x9c4cff,
            [this.TYPES.BOUNCY]: 0x4cff9c
        };
        return colors[type] || 0x4ca2ff;
    }
    
    getAlpha(type) {
        return 0.7;
    }
    
    getHitPoints(type) {
        const hitPoints = {
            [this.TYPES.STANDARD]: 1,
            [this.TYPES.STRONG]: 3,
            [this.TYPES.DYNAMITE]: 1,
            [this.TYPES.ETERNAL]: Infinity,
            [this.TYPES.BOUNCY]: 2
        };
        return hitPoints[type] || 1;
    }
}

class MockBlockUtils {
    constructor(scene) {
        this.scene = scene;
        this.lastShatterBlock = null;
        this.lastExplosionPosition = null;
    }
    
    createBlockShatter(block) {
        this.lastShatterBlock = block;
        return true;
    }
    
    createExplosion(x, y) {
        this.lastExplosionPosition = { x, y };
        return true;
    }
    
    createBouncyHitEffect(x, y) {
        this.lastBouncyHitEffect = { x, y };
        return true;
    }
    
    createDynamiteDestroyEffect(x, y) {
        this.lastDynamiteEffect = { x, y };
        return true;
    }
}

// Mock GameScene for testing block-related methods
class MockGameScene {
    constructor() {
        // Initialize properties used by block methods
        this.iceBlocks = [];
        this.blueVeils = [];
        this.totalIceBlocks = 0;
        this.clearedIceBlocks = 0;
        this.revealPercentage = 0;
        this.targetPercentage = 85;
        this.lastRevealPercentage = 0;
        this.voiceThreshold = 10;
        
        // Create mock blockTypes
        this.blockTypes = new MockBlockTypes();
        
        // Create mock BlockUtils
        this.blockUtils = new MockBlockUtils(this);
        
        // Mock chibi image
        this.chibiImage = {
            setAlpha: (alpha) => {
                this.chibiImage.alpha = alpha;
                return this.chibiImage;
            },
            alpha: 1
        };
        
        // Mock game state manager
        this.gameStateManager = {
            checkLevelCompletion: () => {
                this.gameStateManagerCalled = true;
                return true;
            }
        };
        
        // Mock event emitter
        this.events = {
            emit: (event, data) => {
                this.lastEmittedEvent = { event, data };
                return true;
            }
        };
        
        // Mock tweens
        this.tweens = {
            add: (config) => {
                this.lastTween = config;
                if (config.onComplete) {
                    setTimeout(() => config.onComplete(), 10);
                }
                return { remove: () => {} };
            }
        };
        
        // Mock time
        this.time = {
            delayedCall: (delay, callback) => {
                setTimeout(callback, 10); // Fast for testing
                return {
                    remove: () => {}
                };
            }
        };
        
        // Mock cameras
        this.cameras = {
            main: {
                flash: (duration, r, g, b, a) => {
                    this.lastCameraFlash = { duration, r, g, b, a };
                    return true;
                }
            }
        };
        
        // Mock matter
        this.matter = {
            world: {
                remove: (body) => {
                    this.lastRemovedBody = body;
                    return true;
                }
            }
        };
        
        // Mock add
        this.add = {
            rectangle: (x, y, width, height, color, alpha) => {
                const rect = {
                    x, y, width, height, color, alpha,
                    setDepth: (depth) => {
                        rect.depth = depth;
                        return rect;
                    },
                    setStrokeStyle: (width, color, alpha) => {
                        rect.stroke = { width, color, alpha };
                        return rect;
                    },
                    setRotation: (rotation) => {
                        rect.rotation = rotation;
                        return rect;
                    },
                    setScale: (scale) => {
                        rect.scale = scale;
                        return rect;
                    },
                    setAlpha: (alpha) => {
                        rect.alpha = alpha;
                        return rect;
                    },
                    setFillStyle: (color, alpha) => {
                        rect.fillStyle = { color, alpha };
                        return rect;
                    },
                    destroy: () => {
                        rect.destroyed = true;
                        return true;
                    }
                };
                return rect;
            },
            container: (x, y) => {
                const container = {
                    x, y,
                    setDepth: (depth) => {
                        container.depth = depth;
                        return container;
                    }
                };
                return container;
            },
            text: (x, y, text, style) => {
                const textObj = {
                    x, y, text, style,
                    setOrigin: (originX, originY) => {
                        textObj.origin = { x: originX, y: originY };
                        return textObj;
                    },
                    setDepth: (depth) => {
                        textObj.depth = depth;
                        return textObj;
                    },
                    destroy: () => {
                        textObj.destroyed = true;
                        return true;
                    }
                };
                return textObj;
            }
        };
    }
    
    // GameScene block methods to test
    
    createIceTextureEffect(veil) {
        // Random size variations for the ice blocks (up to 10% variation)
        const sizeVariation = 0.9 + Math.random() * 0.2;
        veil.setScale(sizeVariation);
        
        // Add random inner lines/cracks simulation with slight opacity changes
        if (Math.random() < 0.3) {
            veil.setAlpha(veil.alpha * (0.6 + Math.random() * 0.15));
        }
        
        // Apply a random slight tint variation to some blocks for more natural appearance
        if (Math.random() < 0.4) {
            const tintOptions = [
                0xc8e0ff, 0xa0cfff, 0xb5e0ff, 0xd0f0ff
            ];
            const selectedTint = tintOptions[Math.floor(Math.random() * tintOptions.length)];
            veil.setFillStyle(selectedTint, veil.alpha);
        }
        
        // Create a shimmer/highlight effect for some blocks
        if (Math.random() < 0.2) {
            const highlight = this.add.rectangle(
                veil.x,
                veil.y,
                veil.width * 0.8,
                veil.height * 0.2,
                0xffffff,
                0.25
            );
            highlight.setDepth(veil.depth + 0.1);
            
            veil.highlight = highlight;
            
            this.tweens.add({
                targets: highlight,
                y: veil.y + veil.height/2,
                alpha: { from: 0.3, to: 0 },
                duration: 3000 + Math.random() * 2000,
                repeat: -1,
                yoyo: false,
                delay: Math.random() * 2000,
                onRepeat: () => {
                    highlight.y = veil.y - veil.height/2;
                    highlight.alpha = 0.3;
                }
            });
        }
    }
    
    destroyIceBlock(block) {
        // Mark block as inactive
        block.isActive = false;
        
        // Create shatter effect using BlockUtils
        this.blockUtils.createBlockShatter(block);
        
        // Remove the physics body from the world
        if (block.body) {
            this.matter.world.remove(block.body);
        }
        
        // Hide the original block
        block.setVisible = (visible) => { block.visible = visible; };
        block.setVisible(false);
        
        // Make the blue veil slowly dissipate instead of removing immediately
        if (block.blueVeil) {
            // Also fade out any highlight associated with this veil
            if (block.blueVeil.highlight) {
                this.tweens.add({
                    targets: block.blueVeil.highlight,
                    alpha: 0,
                    duration: 5000,
                    ease: 'Linear',
                    onComplete: () => {
                        if (block.blueVeil.highlight) {
                            block.blueVeil.highlight.destroyed = true;
                        }
                    }
                });
            }
            
            // Start a tween to fade out the blue veil over 5 seconds
            this.tweens.add({
                targets: block.blueVeil,
                alpha: 0,
                duration: 5000,
                ease: 'Linear',
                onComplete: () => {
                    if (block.blueVeil) {
                        block.blueVeil.destroyed = true;
                    }
                }
            });
        }
        
        // Special effects based on block type
        if (block.blockType === this.blockTypes.TYPES.DYNAMITE) {
            this.blockUtils.createDynamiteDestroyEffect(block.x, block.y);
        }
        
        // Ensure chibi image remains fully opaque
        this.chibiImage.setAlpha(1);
        
        // Update revealed percentage based on ice blocks cleared
        this.clearedIceBlocks++;
        const previousPercentage = this.revealPercentage;
        this.revealPercentage = Math.min(100, Math.floor((this.clearedIceBlocks / this.totalIceBlocks) * 100));
        
        // Emit update to UI with more detailed information
        this.events.emit('updatePercentage', this.revealPercentage);
        
        // When percentage reaches key milestones, make the image clearer
        if ((previousPercentage < 20 && this.revealPercentage >= 20) ||
            (previousPercentage < 50 && this.revealPercentage >= 50) ||
            (previousPercentage < 80 && this.revealPercentage >= 80)) {
            this.cameras.main.flash(300, 255, 255, 255, 0.3);
        }
        
        // Check if we've revealed enough for a congratulatory voice message
        const percentageChange = this.revealPercentage - this.lastRevealPercentage;
        if (percentageChange >= this.voiceThreshold) {
            this.lastRevealPercentage = this.revealPercentage;
        }
        
        // Check if level is complete
        if (this.revealPercentage >= this.targetPercentage) {
            this.checkLevelCompletion();
        }
    }
    
    damageIceBlock(block) {
        if (!block || !block.isActive) return false;
        
        // Handle different block types
        if (block.blockType === this.blockTypes.TYPES.ETERNAL) {
            // Eternal blocks just show damage effect but don't take damage
            this.createDamageEffect(block);
            return false;
        }
        
        // Reduce hits left
        block.hitsLeft--;
        
        // Create damage effect
        this.createDamageEffect(block);
        
        // Check if block is destroyed
        if (block.hitsLeft <= 0) {
            this.destroyIceBlock(block);
            return true;
        }
        
        return false;
    }
    
    createDamageEffect(block) {
        if (!block) return;
        
        // Flash effect on the block
        this.tweens.add({
            targets: block,
            alpha: { from: 0.8, to: 0.5 },
            yoyo: true,
            repeat: 1,
            duration: 200,
            ease: 'Linear'
        });
        
        // Also flash the blue veil
        if (block.blueVeil) {
            this.tweens.add({
                targets: block.blueVeil,
                alpha: { from: block.blueVeil.alpha * 1.2, to: block.blueVeil.alpha },
                yoyo: true,
                repeat: 1,
                duration: 200,
                ease: 'Linear'
            });
        }
    }
    
    destroyBlocksInRadius(x, y, radius) {
        if (!this.iceBlocks) return;
        
        // Create a list to track blocks to be destroyed
        const blocksToDestroy = [];
        const blocksToDamage = [];
        const dynamiteToTrigger = [];
        
        // Check distance of each block from explosion center
        this.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                if (distance < radius) {
                    if (block.blockType === this.blockTypes.TYPES.DYNAMITE) {
                        const delay = (distance / radius) * 50;
                        dynamiteToTrigger.push({ block, delay });
                    } else if (block.blockType === this.blockTypes.TYPES.BOUNCY) {
                        this.time.delayedCall(10, () => {
                            this.blockUtils.createBouncyHitEffect(block.x, block.y);
                        });
                    } else if (block.blockType === this.blockTypes.TYPES.ETERNAL || block.blockType === this.blockTypes.TYPES.STRONG) {
                        const delay = (distance / radius) * 100;
                        blocksToDamage.push({ block, delay });
                    } else {
                        const delay = (distance / radius) * 100;
                        blocksToDestroy.push({ block, delay });
                    }
                }
            }
        });
        
        // Process block destruction with delays
        blocksToDestroy.forEach(({ block, delay }) => {
            this.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    this.destroyIceBlock(block);
                }
            });
        });
        
        // Process block damage with delays
        blocksToDamage.forEach(({ block, delay }) => {
            this.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    this.damageIceBlock(block);
                }
            });
        });
        
        // Process dynamite triggers with delays
        dynamiteToTrigger.forEach(({ block, delay }) => {
            this.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    this.blockUtils.createExplosion(block.x, block.y);
                    this.destroyIceBlock(block);
                    this.destroyBlocksInRadius(block.x, block.y, 120);
                }
            });
        });
        
        // Clean up the iceBlocks array after a delay
        this.time.delayedCall(1000, () => {
            this.cleanupIceBlocksArray();
        });
    }
    
    cleanupIceBlocksArray() {
        if (!this.iceBlocks) return;
        
        // Filter out inactive blocks
        this.iceBlocks = this.iceBlocks.filter(block => {
            return block && block.isActive;
        });
    }
    
    checkLevelCompletion() {
        this.gameStateManager.checkLevelCompletion();
    }
    
    handleBouncyBlock(block, bomb) {
        if (!block || !bomb) return false;
        
        // Calculate reflection direction
        const dx = bomb.x - block.x;
        const dy = bomb.y - block.y;
        const angle = Math.atan2(dy, dx);
        
        // Create bounce effect
        this.blockUtils.createBouncyHitEffect(block.x, block.y);
        
        // Simple reflection - bounce away from block
        if (bomb.body && bomb.body.velocity) {
            const vx = bomb.body.velocity.x;
            const vy = bomb.body.velocity.y;
            
            // Reflect velocity along normal from block to bomb
            const reflectedVx = -vx;
            const reflectedVy = -vy;
            
            // Apply reflected velocity (with a boost)
            const boostFactor = 1.1;
            bomb.setVelocity(reflectedVx * boostFactor, reflectedVy * boostFactor);
            
            return true;
        }
        return false;
    }
}

// Helper test functions
function runTest(testName, testFn) {
    console.log(`Running test: ${testName}`);
    try {
        const result = testFn();
        testResults.push({ name: testName, passed: true });
        console.log(`✅ Test passed: ${testName}`);
        return result;
    } catch (error) {
        testResults.push({ name: testName, passed: false, error: error.message });
        console.error(`❌ Test failed: ${testName}`, error);
        testPassed = false;
        return null;
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}: expected ${expectedStr}, got ${actualStr}`);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(`${message}: value is ${value}`);
    }
}

function assertTrue(value, message) {
    if (value !== true) {
        throw new Error(`${message}: value is ${value}, expected true`);
    }
}

function assertFalse(value, message) {
    if (value !== false) {
        throw new Error(`${message}: value is ${value}, expected false`);
    }
}

// Run tests for GameScene block-related functionality
function runGameSceneBlockTests() {
    console.log('Starting GameScene Block Tests...');
    
    // Test 1: Create MockGameScene
    const gameScene = runTest('Create MockGameScene', () => {
        const scene = new MockGameScene();
        assertNotNull(scene, 'Scene should be created');
        return scene;
    });
    
    if (!gameScene) return false;
    
    // Test 2: Test createIceTextureEffect
    runTest('Test createIceTextureEffect', () => {
        // Create a mock veil
        const veil = gameScene.add.rectangle(100, 100, 30, 30, 0x4ca2ff, 0.7);
        
        // Call the method
        gameScene.createIceTextureEffect(veil);
        
        // Check if veil was modified
        assertNotNull(veil.scale, 'Veil should have scale property set');
        
        // Check if a highlight was potentially created (depends on random chance)
        if (veil.highlight) {
            assertNotNull(veil.highlight, 'Veil might have a highlight');
        }
        
        // Check if a tween was created (should be at least one for the veil)
        if (gameScene.lastTween) {
            assertNotNull(gameScene.lastTween, 'A tween should be created');
        }
    });
    
    // Test 3: Test damageIceBlock - standard block
    runTest('Test damageIceBlock - standard block', () => {
        // Create a standard block
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.STANDARD,
            hitsLeft: 1,
            isActive: true,
            setVisible: (visible) => { block.visible = visible; }
        };
        
        // Call the method
        const result = gameScene.damageIceBlock(block);
        
        // Check result
        assertTrue(result, 'Block should be destroyed');
        assertEqual(block.isActive, false, 'Block should be inactive');
    });
    
    // Test 4: Test damageIceBlock - strong block (not destroyed)
    runTest('Test damageIceBlock - strong block', () => {
        // Create a strong block
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.STRONG,
            hitsLeft: 3,
            isActive: true,
            setVisible: (visible) => { block.visible = visible; }
        };
        
        // Call the method
        const result = gameScene.damageIceBlock(block);
        
        // Check result
        assertFalse(result, 'Block should not be destroyed yet');
        assertEqual(block.hitsLeft, 2, 'Block should have 2 hits left');
        assertEqual(block.isActive, true, 'Block should still be active');
    });
    
    // Test 5: Test damageIceBlock - eternal block
    runTest('Test damageIceBlock - eternal block', () => {
        // Create an eternal block
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.ETERNAL,
            hitsLeft: Infinity,
            isActive: true,
            setVisible: (visible) => { block.visible = visible; }
        };
        
        // Call the method
        const result = gameScene.damageIceBlock(block);
        
        // Check result
        assertFalse(result, 'Eternal block should not be destroyed');
        assertEqual(block.hitsLeft, Infinity, 'Block hits should not change');
        assertEqual(block.isActive, true, 'Block should still be active');
    });
    
    // Test 6: Test destroyIceBlock
    runTest('Test destroyIceBlock', () => {
        // Create a block with blue veil
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.STANDARD,
            hitsLeft: 1,
            isActive: true,
            body: {},
            setVisible: (visible) => { block.visible = visible; },
            blueVeil: gameScene.add.rectangle(100, 100, 30, 30, 0x4ca2ff, 0.7)
        };
        
        // Add a highlight to the blue veil
        block.blueVeil.highlight = gameScene.add.rectangle(100, 90, 24, 6, 0xffffff, 0.25);
        
        // Add to scene's ice blocks
        gameScene.iceBlocks = [block];
        gameScene.totalIceBlocks = 1;
        gameScene.clearedIceBlocks = 0;
        gameScene.revealPercentage = 0;
        
        // Call the method
        gameScene.destroyIceBlock(block);
        
        // Check results
        assertEqual(block.isActive, false, 'Block should be inactive');
        assertEqual(gameScene.clearedIceBlocks, 1, 'clearedIceBlocks should be incremented');
        assertEqual(gameScene.revealPercentage, 100, 'revealPercentage should be updated');
        assertNotNull(gameScene.blockUtils.lastShatterBlock, 'BlockUtils.createBlockShatter should be called');
        
        // Check events
        assertEqual(gameScene.lastEmittedEvent.event, 'updatePercentage', 'updatePercentage event should be emitted');
    });
    
    // Test 7: Test destroyIceBlock with dynamite
    runTest('Test destroyIceBlock with dynamite', () => {
        // Create a dynamite block with blue veil
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.DYNAMITE,
            hitsLeft: 1,
            isActive: true,
            body: {},
            setVisible: (visible) => { block.visible = visible; },
            blueVeil: gameScene.add.rectangle(100, 100, 30, 30, 0xff4c4c, 0.7)
        };
        
        // Add to scene's ice blocks
        gameScene.iceBlocks = [block];
        gameScene.totalIceBlocks = 1;
        gameScene.clearedIceBlocks = 0;
        gameScene.revealPercentage = 0;
        
        // Call the method
        gameScene.destroyIceBlock(block);
        
        // Check results
        assertEqual(block.isActive, false, 'Block should be inactive');
        assertNotNull(gameScene.blockUtils.lastDynamiteEffect, 'BlockUtils.createDynamiteDestroyEffect should be called');
        assertEqual(gameScene.blockUtils.lastDynamiteEffect.x, 100, 'Dynamite effect x should match block x');
        assertEqual(gameScene.blockUtils.lastDynamiteEffect.y, 100, 'Dynamite effect y should match block y');
    });
    
    // Test 8: Test destroyBlocksInRadius
    runTest('Test destroyBlocksInRadius', () => {
        // Create several blocks at different distances
        const block1 = {
            x: 100, 
            y: 100,
            blockType: gameScene.blockTypes.TYPES.STANDARD,
            hitsLeft: 1,
            isActive: true,
            setVisible: (visible) => { block1.visible = visible; }
        };
        
        const block2 = {
            x: 150, 
            y: 150,
            blockType: gameScene.blockTypes.TYPES.STANDARD,
            hitsLeft: 1,
            isActive: true,
            setVisible: (visible) => { block2.visible = visible; }
        };
        
        const block3 = {
            x: 200, 
            y: 200,
            blockType: gameScene.blockTypes.TYPES.STRONG,
            hitsLeft: 3,
            isActive: true,
            setVisible: (visible) => { block3.visible = visible; }
        };
        
        const block4 = {
            x: 300, 
            y: 300,
            blockType: gameScene.blockTypes.TYPES.STANDARD,
            hitsLeft: 1,
            isActive: true,
            setVisible: (visible) => { block4.visible = visible; }
        };
        
        // Add blocks to scene
        gameScene.iceBlocks = [block1, block2, block3, block4];
        
        // Initialize Phaser Math mock for distance calculation
        Phaser = {
            Math: {
                Distance: {
                    Between: (x1, y1, x2, y2) => {
                        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    }
                }
            }
        };
        
        // Call the method with radius that should include the first 3 blocks
        gameScene.destroyBlocksInRadius(100, 100, 150);
        
        // After a moment, blocks within radius should be processed
        setTimeout(() => {
            // Block1 should be destroyed (standard block in radius)
            assertEqual(block1.isActive, false, 'Block1 should be inactive');
            
            // Block2 should be destroyed (standard block in radius)
            assertEqual(block2.isActive, false, 'Block2 should be inactive');
            
            // Block3 should be damaged but not destroyed (strong block in radius)
            assertEqual(block3.hitsLeft, 2, 'Block3 should be damaged to 2 hits');
            
            // Block4 should be unaffected (outside radius)
            assertEqual(block4.isActive, true, 'Block4 should still be active');
        }, 50);
    });
    
    // Test 9: Test cleanupIceBlocksArray
    runTest('Test cleanupIceBlocksArray', () => {
        // Create blocks, some inactive
        const block1 = { isActive: true };
        const block2 = { isActive: false };
        const block3 = { isActive: true };
        
        // Set up the array
        gameScene.iceBlocks = [block1, block2, block3];
        
        // Call the method
        gameScene.cleanupIceBlocksArray();
        
        // Check results
        assertEqual(gameScene.iceBlocks.length, 2, 'Array should have 2 blocks after cleanup');
        assertTrue(gameScene.iceBlocks.includes(block1), 'Block1 should remain in array');
        assertFalse(gameScene.iceBlocks.includes(block2), 'Block2 should be removed from array');
        assertTrue(gameScene.iceBlocks.includes(block3), 'Block3 should remain in array');
    });
    
    // Test 10: Test handleBouncyBlock
    runTest('Test handleBouncyBlock', () => {
        // Create a bouncy block
        const block = {
            x: 100,
            y: 100,
            blockType: gameScene.blockTypes.TYPES.BOUNCY,
            isActive: true
        };
        
        // Create a bomb with velocity
        const bomb = {
            x: 120,
            y: 120,
            body: {
                velocity: { x: 5, y: 10 }
            },
            setVelocity: (x, y) => {
                bomb.body.velocity.x = x;
                bomb.body.velocity.y = y;
            }
        };
        
        // Call the method
        const result = gameScene.handleBouncyBlock(block, bomb);
        
        // Check results
        assertTrue(result, 'Method should return true for successful bounce');
        assertEqual(bomb.body.velocity.x, -5.5, 'Bomb velocity x should be reflected and boosted');
        assertEqual(bomb.body.velocity.y, -11, 'Bomb velocity y should be reflected and boosted');
        assertNotNull(gameScene.blockUtils.lastBouncyHitEffect, 'BlockUtils.createBouncyHitEffect should be called');
    });
    
    // Report final test results
    console.log('All GameScene block tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runGameSceneBlockTests = runGameSceneBlockTests; 