/**
 * BombLauncherTest.js
 * Simple test utility for the BombLauncher class
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Mock scene object
class MockScene {
    constructor() {
        this.BOW_X = 300;
        this.BOW_Y = 540;
        this.MAX_DRAG_DISTANCE = 200;
        this.SHOT_POWER = 0.13;
        this.debugMode = false;
        
        this.bombsRemaining = {
            'bomb': 10,
            'piercer': 5,
            'cluster': 3
        };
        
        this.mockObjects = {
            lines: [],
            circles: [],
            images: []
        };
        
        this.matter = {
            add: {
                image: (x, y, texture) => {
                    const img = {
                        x, y, texture: { key: texture },
                        setCircle: () => img,
                        setStatic: () => img,
                        setVisible: () => img,
                        setDepth: () => img,
                        setDisplaySize: () => img,
                        setPosition: (x, y) => {
                            img.x = x;
                            img.y = y;
                            return img;
                        },
                        destroy: () => {
                            img.scene = null;
                        },
                        scene: this
                    };
                    this.mockObjects.images.push(img);
                    return img;
                }
            },
            body: {
                applyForce: (body, pos, force) => {
                    console.log('Force applied:', force);
                    body.force = force;
                }
            }
        };
        
        this.add = {
            line: (x, y, x1, y1, x2, y2, color) => {
                const line = {
                    x, y, x1, y1, x2, y2, color,
                    setOrigin: () => line,
                    setLineWidth: () => line,
                    setDepth: () => line,
                    destroy: () => {
                        line.scene = null;
                    },
                    scene: this
                };
                this.mockObjects.lines.push(line);
                return line;
            },
            circle: (x, y, radius, color, alpha) => {
                const circle = {
                    x, y, radius, color, alpha,
                    setStrokeStyle: () => circle,
                    setDepth: () => circle,
                    destroy: () => {
                        circle.scene = null;
                    },
                    scene: this
                };
                this.mockObjects.circles.push(circle);
                return circle;
            },
            text: (x, y, text, style) => {
                return {
                    x, y, text, style,
                    setDepth: () => ({
                        setText: (newText) => {}
                    })
                };
            }
        };
        
        this.time = {
            delayedCall: (delay, callback) => {
                setTimeout(callback, delay);
                return {
                    remove: () => {}
                };
            }
        };
        
        this.cameras = {
            main: {
                width: 800,
                height: 600
            }
        };
        
        this.sys = {
            game: {
                config: {
                    width: 800,
                    height: 600
                }
            }
        };
    }
    
    decrementBombCount(bombType) {
        if (this.bombsRemaining[bombType] !== undefined) {
            this.bombsRemaining[bombType]--;
            console.log(`Decreased ${bombType} bombs to ${this.bombsRemaining[bombType]}`);
        }
    }
    
    updateBombUI() {
        console.log('Update Bomb UI called');
    }
    
    createFizzleEffect(x, y) {
        console.log(`Fizzle effect created at ${x},${y}`);
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

// Run tests for BombLauncher
function runBombLauncherTests() {
    console.log('Starting BombLauncher tests...');
    
    // Test 1: Create BombLauncher instance
    const scene = runTest('Create MockScene', () => {
        const scene = new MockScene();
        assertNotNull(scene, 'Scene should be created');
        return scene;
    });
    
    if (!scene) return false;
    
    // Test 2: Create BombLauncher instance
    const launcher = runTest('Create BombLauncher', () => {
        const launcher = new BombLauncher(scene);
        assertNotNull(launcher, 'BombLauncher should be created');
        return launcher;
    });
    
    if (!launcher) return false;
    
    // Test 3: Create a bomb
    const bomb = runTest('Create Bomb', () => {
        const bomb = launcher.createBomb('bomb');
        assertNotNull(bomb, 'Bomb should be created');
        assertEqual(scene.mockObjects.lines.length, 2, 'Should create 2 elastic lines');
        return bomb;
    });
    
    // Test 4: Draw trajectory
    runTest('Draw Trajectory', () => {
        launcher.drawTrajectoryFromPointer({ x: 200, y: 500 });
        assertEqual(scene.mockObjects.circles.length > 0, true, 'Should create trajectory dots');
    });
    
    // Test 5: Launch bomb
    runTest('Launch Bomb', () => {
        const result = launcher.launchBomb({ x: 200, y: 500 });
        assertEqual(result, true, 'Bomb should launch successfully');
        assertEqual(launcher.bombState.active, true, 'Bomb state should be active');
        assertEqual(scene.bombsRemaining.bomb, 9, 'Should decrement bomb count');
    });
    
    // Test 6: Check active state
    runTest('Check Active Bomb', () => {
        const active = launcher.isBombActive();
        assertEqual(active, true, 'Bomb should be active');
    });
    
    // Test 7: Toggle debug mode
    runTest('Toggle Debug Mode', () => {
        const result = launcher.toggleDebugMode();
        assertEqual(result, true, 'Debug mode should be enabled');
        assertEqual(launcher.debugMode, true, 'Debug mode flag should be true');
    });
    
    // Report final test results
    console.log('All tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runBombLauncherTests = runBombLauncherTests; 