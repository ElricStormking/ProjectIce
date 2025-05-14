/**
 * BlockManagerTest.js
 * Test utility for the BlockManager class
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Mock scene for testing BlockManager
class MockScene {
    constructor() {
        // Create mock blockTypes instance
        this.blockTypes = new BlockTypes();
        
        // Create mock BlockUtils instance
        this.blockUtils = new BlockUtils(this);
        
        // Mock world object for matter physics
        this.matter = {
            world: {
                remove: (body) => {
                    this.lastRemovedBody = body;
                    return true;
                }
            },
            add: {
                image: (x, y, texture) => {
                    const block = {
                        x, y, texture,
                        setRectangle: (width, height) => {
                            block.width = width;
                            block.height = height;
                            return block;
                        },
                        setStatic: (isStatic) => {
                            block.isStatic = isStatic;
                            return block;
                        },
                        setFrictionAir: (frictionAir) => {
                            block.frictionAir = frictionAir;
                            return block;
                        },
                        setFriction: (friction) => {
                            block.friction = friction;
                            return block;
                        },
                        setRestitution: (restitution) => {
                            block.restitution = restitution;
                            return block;
                        },
                        setTint: (tint) => {
                            block.tint = tint;
                            return block;
                        },
                        setDisplaySize: (width, height) => {
                            block.displayWidth = width;
                            block.displayHeight = height;
                            return block;
                        },
                        setDepth: (depth) => {
                            block.depth = depth;
                            return block;
                        },
                        destroy: () => {
                            block.destroyed = true;
                            return true;
                        },
                        body: {}
                    };
                    return block;
                }
            }
        };
        
        // Mock container
        this.add = {
            container: (x, y) => {
                return {
                    setDepth: (depth) => {
                        return { depth, x, y };
                    }
                };
            },
            rectangle: (x, y, width, height, color, alpha) => {
                const rect = {
                    x, y, width, height, color, alpha,
                    setDepth: (depth) => {
                        rect.depth = depth;
                        return rect;
                    },
                    destroy: () => {
                        rect.destroyed = true;
                        return true;
                    }
                };
                return rect;
            },
            circle: (x, y, radius, color, alpha) => {
                const circle = {
                    x, y, radius, color, alpha,
                    setDepth: (depth) => {
                        circle.depth = depth;
                        return circle;
                    },
                    destroy: () => true
                };
                return circle;
            },
            particles: (key) => {
                return {
                    createEmitter: (config) => {
                        return {
                            explode: (count, x, y) => {
                                this.lastParticleEmission = { count, x, y, key, config };
                                return true;
                            },
                            setPosition: (x, y) => {
                                this.lastEmitterPosition = { x, y };
                                return this;
                            }
                        };
                    },
                    destroy: () => {
                        return true;
                    }
                };
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
        
        // Mock textures
        this.textures = {
            getFrame: (key) => {
                return {
                    source: {
                        image: new Image()
                    }
                };
            }
        };
        
        // Mock audio manager
        this.audioManager = {
            playCrackSound: () => {
                this.lastPlayedSound = 'crack';
                return true;
            },
            playExplosionSound: () => {
                this.lastPlayedSound = 'explosion';
                return true;
            }
        };
        
        // Mock cameras
        this.cameras = {
            main: {
                shake: (duration, intensity) => {
                    this.lastCameraShake = { duration, intensity };
                    return true;
                }
            }
        };
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

// Run tests for BlockManager
function runBlockManagerTests() {
    console.log('Starting BlockManager tests...');
    
    // Test 1: Create MockScene
    const scene = runTest('Create MockScene', () => {
        const scene = new MockScene();
        assertNotNull(scene, 'Scene should be created');
        return scene;
    });
    
    if (!scene) return false;
    
    // Test 2: Create BlockManager instance
    const blockManager = runTest('Create BlockManager instance', () => {
        const manager = new BlockManager(scene);
        assertNotNull(manager, 'BlockManager should be created');
        return manager;
    });
    
    if (!blockManager) return false;
    
    // Test 3: Check initial state
    runTest('Check initial state', () => {
        assertEqual(blockManager.iceBlocks.length, 0, 'iceBlocks should be empty');
        assertEqual(blockManager.blueVeils.length, 0, 'blueVeils should be empty');
        assertEqual(blockManager.dynamiteBlocks.length, 0, 'dynamiteBlocks should be empty');
        assertEqual(blockManager.totalBlocks, 0, 'totalBlocks should be 0');
        assertEqual(blockManager.clearedBlocks, 0, 'clearedBlocks should be 0');
    });
    
    // Test 4: Test createBlock method
    const testBlock = runTest('Test createBlock method', () => {
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        
        assertNotNull(block, 'Block should be created');
        assertEqual(block.x, 100, 'Block x should be set');
        assertEqual(block.y, 200, 'Block y should be set');
        assertEqual(block.blockType, scene.blockTypes.TYPES.STANDARD, 'Block type should be set');
        assertNotNull(block.health, 'Block health should be set');
        
        return block;
    });
    
    // Test 5: Test createVeil method
    const testVeil = runTest('Test createVeil method', () => {
        const veil = blockManager.createVeil(100, 200, 30);
        
        assertNotNull(veil, 'Veil should be created');
        assertEqual(veil.x, 100, 'Veil x should be set');
        assertEqual(veil.y, 200, 'Veil y should be set');
        assertEqual(veil.width, 30, 'Veil width should be set');
        assertEqual(veil.height, 30, 'Veil height should be set');
        
        return veil;
    });
    
    // Test 6: Test getBlockHealth method
    runTest('Test getBlockHealth method', () => {
        assertEqual(blockManager.getBlockHealth(scene.blockTypes.TYPES.STANDARD), 1, 'Standard block health should be 1');
        assertEqual(blockManager.getBlockHealth(scene.blockTypes.TYPES.STRONG), 3, 'Strong block health should be 3');
        assertEqual(blockManager.getBlockHealth(scene.blockTypes.TYPES.DYNAMITE), 1, 'Dynamite block health should be 1');
        assertEqual(typeof blockManager.getBlockHealth(scene.blockTypes.TYPES.ETERNAL), 'number', 'Eternal block health should be Infinity or number');
        assertEqual(blockManager.getBlockHealth(scene.blockTypes.TYPES.BOUNCY), 2, 'Bouncy block health should be 2');
    });
    
    // Test 7: Test damageBlock method - non-destructive
    runTest('Test damageBlock method - non-destructive', () => {
        // Create a block with 3 health
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STRONG, {});
        
        // Initial health
        assertEqual(block.health, 3, 'Initial health should be 3');
        
        // Apply 1 damage
        const result = blockManager.damageBlock(block, 1);
        
        // Check result and new health
        assertFalse(result, 'Result should be false (not destroyed)');
        assertEqual(block.health, 2, 'Health should be reduced to 2');
        
        // Check if damage effect was triggered
        assertNotNull(scene.lastTween, 'Damage effect should be triggered');
    });
    
    // Test 8: Test damageBlock method - destructive
    runTest('Test damageBlock method - destructive', () => {
        // Create a standard block with 1 health
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        
        // Create a veil at the same position
        const veil = blockManager.createVeil(100, 200, 30);
        
        // Add both to tracking arrays
        blockManager.iceBlocks.push(block);
        blockManager.blueVeils.push(veil);
        blockManager.totalBlocks = 1;
        
        // Apply 1 damage (should destroy)
        const result = blockManager.damageBlock(block, 1);
        
        // Check result
        assertTrue(result, 'Result should be true (destroyed)');
        
        // Check if block was removed from array
        assertEqual(blockManager.iceBlocks.length, 0, 'Block should be removed from iceBlocks array');
        assertEqual(blockManager.blueVeils.length, 0, 'Veil should be removed from blueVeils array');
        
        // Check if clearedBlocks was incremented
        assertEqual(blockManager.clearedBlocks, 1, 'clearedBlocks should be incremented');
        
        // Check if sound was played
        assertEqual(scene.lastPlayedSound, 'crack', 'Crack sound should be played');
    });
    
    // Test 9: Test destroyBlock method
    runTest('Test destroyBlock method', () => {
        // Create a block
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        
        // Add to tracking array
        blockManager.iceBlocks.push(block);
        blockManager.totalBlocks = 1;
        
        // Destroy the block
        const result = blockManager.destroyBlock(block);
        
        // Check result
        assertTrue(result, 'Result should be true');
        
        // Check if block was removed from array
        assertEqual(blockManager.iceBlocks.length, 0, 'Block should be removed from iceBlocks array');
        
        // Check if clearedBlocks was incremented
        assertEqual(blockManager.clearedBlocks, 1, 'clearedBlocks should be incremented');
    });
    
    // Test 10: Test destroyBlock method with dynamite
    runTest('Test destroyBlock method with dynamite', () => {
        // Reset clearedBlocks
        blockManager.clearedBlocks = 0;
        
        // Create a dynamite block
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.DYNAMITE, {});
        
        // Add to tracking arrays
        blockManager.iceBlocks.push(block);
        blockManager.dynamiteBlocks.push(block);
        blockManager.totalBlocks = 1;
        
        // Destroy the block
        const result = blockManager.destroyBlock(block);
        
        // Check result
        assertTrue(result, 'Result should be true');
        
        // Check if block was removed from arrays
        assertEqual(blockManager.iceBlocks.length, 0, 'Block should be removed from iceBlocks array');
        assertEqual(blockManager.dynamiteBlocks.length, 0, 'Block should be removed from dynamiteBlocks array');
        
        // Check if clearedBlocks was incremented
        assertEqual(blockManager.clearedBlocks, 1, 'clearedBlocks should be incremented');
        
        // Check if explosion sound was played
        assertEqual(scene.lastPlayedSound, 'explosion', 'Explosion sound should be played');
    });
    
    // Test 11: Test createDamageEffect method
    runTest('Test createDamageEffect method', () => {
        // Create a block
        const block = {
            x: 100,
            y: 200,
            scene: true,
            setAlpha: (alpha) => {
                block.alpha = alpha;
                return block;
            }
        };
        
        // Call the method
        blockManager.createDamageEffect(block);
        
        // Check if tween was created
        assertNotNull(scene.lastTween, 'Tween should be created');
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
    });
    
    // Test 12: Test createDestroyEffect method
    runTest('Test createDestroyEffect method', () => {
        // Reset scene state
        scene.lastParticleEmission = null;
        
        // Call the method
        blockManager.createDestroyEffect(100, 200);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 100, 'Particles should be at correct x');
        assertEqual(scene.lastParticleEmission.y, 200, 'Particles should be at correct y');
    });
    
    // Test 13: Test createDynamiteEffect method
    runTest('Test createDynamiteEffect method', () => {
        // Reset scene state
        scene.lastParticleEmission = null;
        scene.lastPlayedSound = null;
        
        // Create some blocks in radius
        const block1 = blockManager.createBlock(101, 201, 30, scene.blockTypes.TYPES.STANDARD, {});
        const block2 = blockManager.createBlock(200, 300, 30, scene.blockTypes.TYPES.STANDARD, {});
        
        // Add to tracking array
        blockManager.iceBlocks = [block1, block2];
        
        // Call the method
        blockManager.createDynamiteEffect(100, 200);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        
        // Check if sound was played
        assertEqual(scene.lastPlayedSound, 'explosion', 'Explosion sound should be played');
        
        // One block should be destroyed (the one in radius)
        assertEqual(blockManager.iceBlocks.length, 1, 'One block should remain');
        assertEqual(blockManager.iceBlocks[0].x, 200, 'Remaining block should be the one outside radius');
    });
    
    // Test 14: Test destroyBlocksInRadius method
    runTest('Test destroyBlocksInRadius method', () => {
        // Reset tracking
        blockManager.iceBlocks = [];
        blockManager.clearedBlocks = 0;
        
        // Create blocks
        const block1 = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        const block2 = blockManager.createBlock(110, 210, 30, scene.blockTypes.TYPES.STANDARD, {});
        const block3 = blockManager.createBlock(200, 300, 30, scene.blockTypes.TYPES.STANDARD, {});
        const block4 = blockManager.createBlock(105, 205, 30, scene.blockTypes.TYPES.ETERNAL, {});
        
        // Add to tracking array
        blockManager.iceBlocks = [block1, block2, block3, block4];
        blockManager.totalBlocks = 4;
        
        // Call the method with 50 radius
        blockManager.destroyBlocksInRadius(100, 200, 50);
        
        // Two blocks should be destroyed (the ones in radius and not eternal)
        assertEqual(blockManager.iceBlocks.length, 2, 'Two blocks should remain');
        assertNotNull(blockManager.iceBlocks.find(b => b.x === 200), 'Block outside radius should remain');
        assertNotNull(blockManager.iceBlocks.find(b => b.blockType === scene.blockTypes.TYPES.ETERNAL), 'Eternal block should remain');
        
        // Check clearedBlocks
        assertEqual(blockManager.clearedBlocks, 2, 'Two blocks should be counted as cleared');
    });
    
    // Test 15: Test getRevealPercentage method
    runTest('Test getRevealPercentage method', () => {
        // Set up state
        blockManager.totalBlocks = 10;
        blockManager.clearedBlocks = 3;
        
        // Check percentage
        assertEqual(blockManager.getRevealPercentage(), 30, 'Reveal percentage should be 30%');
        
        // Edge case - no blocks
        blockManager.totalBlocks = 0;
        blockManager.clearedBlocks = 0;
        assertEqual(blockManager.getRevealPercentage(), 0, 'Reveal percentage should be 0% when no blocks');
    });
    
    // Test 16: Test clearBlocks method
    runTest('Test clearBlocks method', () => {
        // Create some blocks and veils
        const block1 = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        const block2 = blockManager.createBlock(200, 300, 30, scene.blockTypes.TYPES.DYNAMITE, {});
        const veil1 = blockManager.createVeil(100, 200, 30);
        
        // Set up tracking arrays
        blockManager.iceBlocks = [block1, block2];
        blockManager.blueVeils = [veil1];
        blockManager.dynamiteBlocks = [block2];
        blockManager.totalBlocks = 2;
        blockManager.clearedBlocks = 1;
        
        // Call clearBlocks
        blockManager.clearBlocks();
        
        // Check if arrays were cleared
        assertEqual(blockManager.iceBlocks.length, 0, 'iceBlocks should be empty');
        assertEqual(blockManager.blueVeils.length, 0, 'blueVeils should be empty');
        assertEqual(blockManager.dynamiteBlocks.length, 0, 'dynamiteBlocks should be empty');
        assertEqual(blockManager.totalBlocks, 0, 'totalBlocks should be reset');
        assertEqual(blockManager.clearedBlocks, 0, 'clearedBlocks should be reset');
    });
    
    // Test 17: Test createIceBlocksDirectly method
    runTest('Test createIceBlocksDirectly method', () => {
        // Mock target image
        const targetImage = {
            texture: {
                key: 'test_image'
            }
        };
        
        // Set up a clean state
        blockManager.clearBlocks();
        
        // Call method
        const result = blockManager.createIceBlocksDirectly(targetImage, 100, 200, 300, 200);
        
        // Check result structure
        assertNotNull(result, 'Result should not be null');
        assertNotNull(result.blocks, 'Result should have blocks array');
        assertNotNull(result.veils, 'Result should have veils array');
        assertNotNull(result.dynamiteBlocks, 'Result should have dynamiteBlocks array');
    });
    
    // Test 18: Test damageBlock with eternal block
    runTest('Test damageBlock with eternal block', () => {
        // Create an eternal block
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.ETERNAL, {});
        
        // Apply damage
        const result = blockManager.damageBlock(block, 10);
        
        // Check result - should not be damaged
        assertFalse(result, 'Eternal block should not be damaged');
        assertNotNull(block.health, 'Block should still have health');
    });
    
    // Test 19: Test damageBlock with null block
    runTest('Test damageBlock with null block', () => {
        // Apply damage to null block - should not throw error
        const result = blockManager.damageBlock(null, 1);
        
        // Check result
        assertFalse(result, 'Result should be false for null block');
    });
    
    // Test 20: Test cleanup method
    runTest('Test cleanup method', () => {
        // Create some blocks
        const block = blockManager.createBlock(100, 200, 30, scene.blockTypes.TYPES.STANDARD, {});
        blockManager.iceBlocks = [block];
        blockManager.totalBlocks = 1;
        
        // Call cleanup
        blockManager.cleanup();
        
        // Check if blocks were cleared
        assertEqual(blockManager.iceBlocks.length, 0, 'iceBlocks should be empty after cleanup');
    });
    
    // Report final test results
    console.log('All BlockManager tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runBlockManagerTests = runBlockManagerTests; 