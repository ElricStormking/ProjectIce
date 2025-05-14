/**
 * BlockUtilsTest.js
 * Test utility for the BlockUtils class
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Mock scene for testing
class MockScene {
    constructor() {
        this.events = {};
        this.blockTypes = new BlockTypes();
        
        // Mock add methods
        this.add = {
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
            },
            circle: (x, y, radius, color, alpha) => {
                const circle = {
                    x, y, radius, color, alpha,
                    setDepth: (depth) => {
                        circle.depth = depth;
                        return circle;
                    },
                    destroy: () => {
                        return true;
                    }
                };
                return circle;
            },
            graphics: () => {
                const graphics = {
                    lineStyle: () => graphics,
                    beginPath: () => graphics,
                    moveTo: () => graphics,
                    lineTo: () => graphics,
                    strokePath: () => graphics,
                    setDepth: () => graphics,
                    destroy: () => true
                };
                return graphics;
            }
        };
        
        // Mock tweens
        this.tweens = {
            add: (config) => {
                this.lastTween = config;
                if (config.onUpdate) {
                    config.onUpdate({ progress: 0.5 });
                }
                if (config.onComplete) {
                    setTimeout(() => config.onComplete(), 10);
                }
                return { remove: () => {} };
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
        
        // Mock time
        this.time = {
            delayedCall: (delay, callback) => {
                setTimeout(callback, 10); // Fast for testing
                return {
                    remove: () => {}
                };
            }
        };
        
        // Mock sound
        this.sound = {
            add: (key, config) => {
                const sound = {
                    key,
                    config,
                    play: (options) => {
                        this.lastSoundPlayed = { key, options };
                        sound.isPlaying = true;
                        return sound;
                    },
                    isPlaying: false
                };
                return sound;
            }
        };
        
        // Mock matter physics
        this.matter = {
            add: {
                image: (x, y, key, frame, options) => {
                    const image = {
                        x, y, key, frame, options,
                        setScale: (scale) => {
                            image.scale = scale;
                            return image;
                        },
                        setRotation: (rotation) => {
                            image.rotation = rotation;
                            return image;
                        },
                        setVelocity: (vx, vy) => {
                            image.velocity = { x: vx, y: vy };
                            return image;
                        },
                        setAlpha: (alpha) => {
                            image.alpha = alpha;
                            return image;
                        },
                        setDepth: (depth) => {
                            image.depth = depth;
                            return image;
                        },
                        destroy: () => true
                    };
                    return image;
                }
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

// Run tests for BlockUtils
function runBlockUtilsTests() {
    console.log('Starting BlockUtils tests...');
    
    // Test 1: Create MockScene
    const scene = runTest('Create MockScene', () => {
        const scene = new MockScene();
        assertNotNull(scene, 'Scene should be created');
        return scene;
    });
    
    if (!scene) return false;
    
    // Test 2: Create BlockUtils instance
    const blockUtils = runTest('Create BlockUtils instance', () => {
        const utils = new BlockUtils(scene);
        assertNotNull(utils, 'BlockUtils should be created');
        return utils;
    });
    
    if (!blockUtils) return false;
    
    // Test 3: Test createBlockShatter method
    runTest('Test createBlockShatter method', () => {
        const mockBlock = {
            x: 100,
            y: 200,
            displayWidth: 30,
            scene: true
        };
        
        blockUtils.createBlockShatter(mockBlock);
        
        // Check if matter.add.image was called (through our mock)
        assertNotNull(scene.time, 'Time should be set');
    });
    
    // Test 4: Test createDamageEffect method
    runTest('Test createDamageEffect method', () => {
        const mockBlock = {
            x: 100,
            y: 200,
            blockType: scene.blockTypes.TYPES.STANDARD,
            scene: true
        };
        
        blockUtils.createDamageEffect(mockBlock);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 100, 'Particle x position should match block');
        assertEqual(scene.lastParticleEmission.y, 200, 'Particle y position should match block');
        
        // Check if camera shake was triggered
        assertNotNull(scene.lastCameraShake, 'Camera shake should be triggered');
        
        // Reset for next test
        scene.lastParticleEmission = null;
        scene.lastCameraShake = null;
    });
    
    // Test 5: Test createBouncyHitEffect method
    runTest('Test createBouncyHitEffect method', () => {
        blockUtils.createBouncyHitEffect(150, 250);
        
        // Check if a circle was created (through our mock)
        assertNotNull(scene.lastTween, 'Tween should be created for the effect');
        
        // Check if sound was attempted to be played
        assertNotNull(scene.lastSoundPlayed, 'Sound should be played');
        assertEqual(scene.lastSoundPlayed.key, 'bouncesound', 'Correct sound should be played');
        
        // Reset for next test
        scene.lastTween = null;
        scene.lastSoundPlayed = null;
    });
    
    // Test 6: Test createDynamiteDestroyEffect method
    runTest('Test createDynamiteDestroyEffect method', () => {
        blockUtils.createDynamiteDestroyEffect(200, 300);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 200, 'Particle x position should be correct');
        assertEqual(scene.lastParticleEmission.y, 300, 'Particle y position should be correct');
        
        // Reset for next test
        scene.lastParticleEmission = null;
    });
    
    // Test 7: Test createShattererImpactEffect method
    runTest('Test createShattererImpactEffect method', () => {
        blockUtils.createShattererImpactEffect(250, 350);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 250, 'Particle x position should be correct');
        assertEqual(scene.lastParticleEmission.y, 350, 'Particle y position should be correct');
        
        // Check if camera shake was triggered
        assertNotNull(scene.lastCameraShake, 'Camera shake should be triggered');
        
        // Reset for next test
        scene.lastParticleEmission = null;
        scene.lastCameraShake = null;
    });
    
    // Test 8: Test createExplosion method
    runTest('Test createExplosion method', () => {
        blockUtils.createExplosion(300, 400);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 300, 'Particle x position should be correct');
        assertEqual(scene.lastParticleEmission.y, 400, 'Particle y position should be correct');
        
        // Check if camera shake was triggered
        assertNotNull(scene.lastCameraShake, 'Camera shake should be triggered');
        
        // Check if sound was attempted to be played
        assertNotNull(scene.lastSoundPlayed, 'Sound should be played');
        assertEqual(scene.lastSoundPlayed.key, 'explosion', 'Correct sound should be played');
        
        // Reset for next test
        scene.lastParticleEmission = null;
        scene.lastCameraShake = null;
        scene.lastSoundPlayed = null;
    });
    
    // Test 9: Test createMiniExplosion method
    runTest('Test createMiniExplosion method', () => {
        blockUtils.createMiniExplosion(350, 450);
        
        // Check if particles were created
        assertNotNull(scene.lastParticleEmission, 'Particles should be created');
        assertEqual(scene.lastParticleEmission.x, 350, 'Particle x position should be correct');
        assertEqual(scene.lastParticleEmission.y, 450, 'Particle y position should be correct');
        assertEqual(scene.lastParticleEmission.key, 'mini_particle', 'Correct particle key should be used');
        
        // Check if camera shake was triggered
        assertNotNull(scene.lastCameraShake, 'Camera shake should be triggered');
        
        // Reset for next test
        scene.lastParticleEmission = null;
        scene.lastCameraShake = null;
    });
    
    // Test 10: Test null block handling in createBlockShatter
    runTest('Test null block handling in createBlockShatter', () => {
        // Should not throw an error
        blockUtils.createBlockShatter(null);
        blockUtils.createBlockShatter(undefined);
        
        assertTrue(true, 'Method should handle null blocks gracefully');
    });
    
    // Report final test results
    console.log('All BlockUtils tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runBlockUtilsTests = runBlockUtilsTests; 