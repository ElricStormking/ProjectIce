/**
 * UISystemTest.js
 * Test utility for the UISystem component
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Mock scene object with UI functionality
class MockScene {
    constructor() {
        this.events = {
            _listeners: {},
            on: (event, callback, context) => {
                if (!this.events._listeners[event]) {
                    this.events._listeners[event] = [];
                }
                this.events._listeners[event].push({ callback, context });
            },
            off: (event, callback, context) => {
                if (!this.events._listeners[event]) return;
                this.events._listeners[event] = this.events._listeners[event].filter(
                    listener => listener.callback !== callback || listener.context !== context
                );
            },
            emit: (event, ...args) => {
                if (!this.events._listeners[event]) return;
                this.events._listeners[event].forEach(listener => {
                    listener.callback.apply(listener.context || this, args);
                });
            }
        };
        
        // Mock properties
        this.BOMB_TYPES = {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',
            RICOCHET: 'ricochet_bomb'
        };
        
        this.BOMB_NAMES = {
            'blast_bomb': 'Blast Girl',
            'piercer_bomb': 'Piercer Girl',
            'cluster_bomb': 'Cluster Girl',
            'sticky_bomb': 'Sticky Girl',
            'shatterer_bomb': 'Shatterer Girl',
            'driller_bomb': 'Driller Girl',
            'ricochet_bomb': 'Ricochet Girl'
        };
        
        this.bombsRemaining = {
            'blast_bomb': 5,
            'piercer_bomb': 3,
            'cluster_bomb': 2,
            'sticky_bomb': 3,
            'shatterer_bomb': 2,
            'driller_bomb': 3,
            'ricochet_bomb': 2
        };
        
        this.currentBombType = 'blast_bomb';
        this.shotsRemaining = 10;
        this.revealPercentage = 0;
        this.score = 0;
        
        // Mock camera properties
        this.cameras = {
            main: {
                width: 1920,
                height: 1080,
                centerX: 960,
                centerY: 540
            }
        };
        
        // Track created objects
        this.mockObjects = {
            containers: [],
            text: [],
            images: [],
            rectangles: [],
            circles: []
        };
        
        // Mock add methods
        this.add = {
            container: (x, y) => {
                const container = {
                    x, y,
                    children: [],
                    add: (items) => {
                        if (Array.isArray(items)) {
                            container.children.push(...items);
                        } else {
                            container.children.push(items);
                        }
                        return container;
                    },
                    destroy: () => {
                        container.children = [];
                        return container;
                    },
                    setDepth: (depth) => {
                        container.depth = depth;
                        return container;
                    },
                    scene: this
                };
                this.mockObjects.containers.push(container);
                return container;
            },
            text: (x, y, text, style = {}) => {
                const textObj = {
                    x, y, text, style,
                    setText: (newText) => {
                        textObj.text = newText;
                        return textObj;
                    },
                    setStyle: (newStyle) => {
                        textObj.style = {...textObj.style, ...newStyle};
                        return textObj;
                    },
                    setOrigin: (x, y) => {
                        textObj.originX = x;
                        textObj.originY = y;
                        return textObj;
                    },
                    setDepth: (depth) => {
                        textObj.depth = depth;
                        return textObj;
                    },
                    setInteractive: (options) => {
                        textObj.interactive = true;
                        textObj.interactiveOptions = options;
                        return textObj;
                    },
                    on: (event, callback) => {
                        if (!textObj.events) textObj.events = {};
                        if (!textObj.events[event]) textObj.events[event] = [];
                        textObj.events[event].push(callback);
                        return textObj;
                    },
                    destroy: () => {
                        textObj.scene = null;
                        return textObj;
                    },
                    scene: this
                };
                this.mockObjects.text.push(textObj);
                return textObj;
            },
            image: (x, y, texture) => {
                const image = {
                    x, y, texture,
                    setScale: (scale) => {
                        image.scale = scale;
                        return image;
                    },
                    setDisplaySize: (width, height) => {
                        image.displayWidth = width;
                        image.displayHeight = height;
                        return image;
                    },
                    setInteractive: (options) => {
                        image.interactive = true;
                        image.interactiveOptions = options;
                        return image;
                    },
                    disableInteractive: () => {
                        image.interactive = false;
                        return image;
                    },
                    setDepth: (depth) => {
                        image.depth = depth;
                        return image;
                    },
                    setAlpha: (alpha) => {
                        image.alpha = alpha;
                        return image;
                    },
                    setTint: (tint) => {
                        image.tint = tint;
                        return image;
                    },
                    on: (event, callback) => {
                        if (!image.events) image.events = {};
                        if (!image.events[event]) image.events[event] = [];
                        image.events[event].push(callback);
                        return image;
                    },
                    destroy: () => {
                        image.scene = null;
                        return image;
                    },
                    scene: this
                };
                this.mockObjects.images.push(image);
                return image;
            },
            rectangle: (x, y, width, height, fillColor = 0xffffff, alpha = 1) => {
                const rect = {
                    x, y, width, height, fillColor, alpha,
                    setOrigin: (x, y) => {
                        rect.originX = x;
                        rect.originY = y;
                        return rect;
                    },
                    setDepth: (depth) => {
                        rect.depth = depth;
                        return rect;
                    },
                    setStrokeStyle: (width, color, alpha) => {
                        rect.strokeWidth = width;
                        rect.strokeColor = color;
                        rect.strokeAlpha = alpha;
                        return rect;
                    },
                    destroy: () => {
                        rect.scene = null;
                        return rect;
                    },
                    scene: this
                };
                this.mockObjects.rectangles.push(rect);
                return rect;
            },
            circle: (x, y, radius, fillColor = 0xffffff, alpha = 1) => {
                const circle = {
                    x, y, radius, fillColor, alpha,
                    setOrigin: (x, y) => {
                        circle.originX = x;
                        circle.originY = y;
                        return circle;
                    },
                    setDepth: (depth) => {
                        circle.depth = depth;
                        return circle;
                    },
                    setScale: (scale) => {
                        circle.scale = scale;
                        return circle;
                    },
                    setVisible: (visible) => {
                        circle.visible = visible;
                        return circle;
                    },
                    setPosition: (x, y) => {
                        circle.x = x;
                        circle.y = y;
                        return circle;
                    },
                    destroy: () => {
                        circle.scene = null;
                        return circle;
                    },
                    scene: this
                };
                this.mockObjects.circles.push(circle);
                return circle;
            }
        };
        
        // Mock tweens
        this.tweens = {
            add: (config) => {
                return {
                    remove: () => {}
                };
            },
            killTweensOf: (target) => {
                return true;
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
            exists: (key) => true
        };
        
        // Mock scene methods
        this.scene = {
            restart: () => { this.sceneRestarted = true; },
            pause: () => { this.scenePaused = true; },
            resume: () => { this.sceneResumed = true; }
        };
    }
    
    selectBombType(bombType) {
        this.currentBombType = bombType;
        this.bombTypeSelected = bombType;
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

// Run tests for UISystem
function runUISystemTests() {
    console.log('Starting UISystem tests...');
    
    // Test 1: Create MockScene
    const scene = runTest('Create MockScene', () => {
        const scene = new MockScene();
        assertNotNull(scene, 'Scene should be created');
        return scene;
    });
    
    if (!scene) return false;
    
    // Test 2: Create UISystem instance
    const uiSystem = runTest('Create UISystem', () => {
        const uiSystem = new UISystem(scene);
        assertNotNull(uiSystem, 'UISystem should be created');
        return uiSystem;
    });
    
    if (!uiSystem) return false;
    
    // Test 3: Initialize UI
    runTest('Initialize UI', () => {
        const result = uiSystem.initialize();
        assertTrue(result, 'Initialize should return true');
        assertNotNull(scene.events._listeners['updateShots'], 'Should set up updateShots event listener');
        assertNotNull(scene.events._listeners['updatePercentage'], 'Should set up updatePercentage event listener');
        assertNotNull(scene.events._listeners['bombCountUpdated'], 'Should set up bombCountUpdated event listener');
    });
    
    // Test 4: Create Main UI
    runTest('Create Main UI', () => {
        uiSystem.createMainUI();
        const shotsText = scene.mockObjects.text.find(t => t.text.includes('Shots:'));
        const percentageText = scene.mockObjects.text.find(t => t.text.includes('Revealed:'));
        const scoreText = scene.mockObjects.text.find(t => t.text.includes('Score:'));
        
        assertNotNull(shotsText, 'Should create shots text');
        assertNotNull(percentageText, 'Should create percentage text');
        assertNotNull(scoreText, 'Should create score text');
        
        // Check container
        const mainContainer = uiSystem.containers.main;
        assertNotNull(mainContainer, 'Should create main container');
        assertTrue(mainContainer.children.length >= 3, 'Container should have at least 3 children');
    });
    
    // Test 5: Update UI Elements
    runTest('Update UI Elements', () => {
        // Update shots
        scene.events.emit('updateShots', 5);
        const shotsText = scene.mockObjects.text.find(t => t.text.includes('Shots:'));
        assertEqual(shotsText.text, 'Shots: 5', 'Should update shots text');
        
        // Update percentage
        scene.events.emit('updatePercentage', 50, 80);
        const percentageText = scene.mockObjects.text.find(t => t.text.includes('Revealed:'));
        assertEqual(percentageText.text, 'Revealed: 50% (Target: 80%)', 'Should update percentage text');
        
        // Update score
        uiSystem.updateScoreDisplay(1000);
        const scoreText = scene.mockObjects.text.find(t => t.text.includes('Score:'));
        assertEqual(scoreText.text, 'Score: 1000', 'Should update score text');
    });
    
    // Test 6: Create Bomb Selector
    runTest('Create Bomb Selector', () => {
        uiSystem.createBombSelector();
        
        // Check if bomb buttons were created for each type
        const bombButtons = uiSystem.bombButtons;
        assertNotNull(bombButtons, 'Should create bomb buttons');
        
        // Check if we have buttons for each bomb type
        const bombTypes = Object.values(scene.BOMB_TYPES);
        bombTypes.forEach(bombType => {
            assertNotNull(bombButtons[bombType], `Should create button for ${bombType}`);
        });
        
        // Check for bomb counters
        const bombCounters = uiSystem.bombCounters;
        assertNotNull(bombCounters, 'Should create bomb counters');
        
        // Check selection indicator
        assertNotNull(uiSystem.selectionIndicator, 'Should create selection indicator');
    });
    
    // Test 7: Update Bomb Selection
    runTest('Update Bomb Selection', () => {
        // Get initial state
        const initialBombType = scene.currentBombType;
        const initialButton = uiSystem.bombButtons[initialBombType];
        
        // Update selection
        uiSystem.updateBombSelection('piercer_bomb');
        
        // Check if selection indicator moved
        const piercerButton = uiSystem.bombButtons['piercer_bomb'];
        assertEqual(uiSystem.selectionIndicator.x, piercerButton.x, 'Selection indicator should move to selected bomb');
        assertEqual(uiSystem.selectionIndicator.y, piercerButton.y, 'Selection indicator should move to selected bomb');
        
        // Check if button scale changed
        assertTrue(piercerButton.scale > 1.0, 'Selected button should be scaled up');
    });
    
    // Test 8: Update Bomb Counter
    runTest('Update Bomb Counter', () => {
        const bombType = 'blast_bomb';
        const newCount = 3;
        
        // Update counter
        uiSystem.updateBombCounter(bombType, newCount);
        
        // Check counter text
        const counterText = uiSystem.bombCounters[bombType];
        assertEqual(counterText.text, `x${newCount}`, 'Should update counter text');
        
        // Update to zero
        uiSystem.updateBombCounter(bombType, 0);
        
        // Check button interactivity
        const button = uiSystem.bombButtons[bombType];
        assertFalse(button.interactive, 'Button should be disabled when count is 0');
    });
    
    // Test 9: Show Victory Screen
    runTest('Show Victory Screen', () => {
        uiSystem.showVictoryScreen(1, 95, true);
        
        // Check victory container
        const victoryContainer = uiSystem.containers.victory;
        assertNotNull(victoryContainer, 'Should create victory container');
        
        // Check victory text
        const victoryText = scene.mockObjects.text.find(t => t.text === 'Level Complete!');
        assertNotNull(victoryText, 'Should create victory text');
        
        // Force trigger delayed call now for testing
        scene.time.delayedCall(0, () => {});
        
        // Check if buttons were created
        const restartButton = scene.mockObjects.text.find(t => t.text === 'Play Again');
        const nextLevelButton = scene.mockObjects.text.find(t => t.text === 'Next Level');
        
        assertNotNull(restartButton, 'Should create restart button');
        assertNotNull(nextLevelButton, 'Should create next level button');
    });
    
    // Test 10: Show Game Over Screen
    runTest('Show Game Over Screen', () => {
        uiSystem.showGameOverScreen(50, 80);
        
        // Check game over container
        const gameOverContainer = uiSystem.containers.gameOver;
        assertNotNull(gameOverContainer, 'Should create game over container');
        
        // Check game over text
        const gameOverText = scene.mockObjects.text.find(t => t.text === 'Game Over!');
        assertNotNull(gameOverText, 'Should create game over text');
        
        // Force trigger delayed call now for testing
        scene.time.delayedCall(0, () => {});
        
        // Check if retry button was created
        const retryButton = scene.mockObjects.text.find(t => t.text === 'Try Again');
        assertNotNull(retryButton, 'Should create retry button');
    });
    
    // Test 11: Show Message
    runTest('Show Message', () => {
        const message = 'Test Message';
        const messageText = uiSystem.showMessage(message);
        
        // Check message text
        assertNotNull(messageText, 'Should create message text');
        assertEqual(messageText.text, message, 'Should set correct message text');
        
        // Check depth and position
        assertTrue(messageText.depth > 1000, 'Message should have high depth');
        assertEqual(messageText.x, scene.cameras.main.centerX, 'Message should be centered horizontally');
        assertEqual(messageText.y, scene.cameras.main.centerY, 'Message should be centered vertically');
    });
    
    // Test 12: Cleanup
    runTest('Cleanup', () => {
        // Run cleanup
        uiSystem.cleanup();
        
        // Check if containers were cleared
        assertEqual(Object.keys(uiSystem.containers).length, 0, 'Should clear containers');
        assertEqual(Object.keys(uiSystem.elements).length, 0, 'Should clear elements');
        assertEqual(Object.keys(uiSystem.bombButtons).length, 0, 'Should clear bomb buttons');
        
        // Check if event listeners were removed
        assertFalse(!!scene.events._listeners['updateShots']?.length, 'Should remove updateShots event listener');
        assertFalse(!!scene.events._listeners['updatePercentage']?.length, 'Should remove updatePercentage event listener');
        assertFalse(!!scene.events._listeners['bombCountUpdated']?.length, 'Should remove bombCountUpdated event listener');
    });
    
    // Report final test results
    console.log('All tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runUISystemTests = runUISystemTests; 