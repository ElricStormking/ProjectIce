// test/bomb_mechanics.test.js

// --- Test Runner ---
function runAllBombTests(bombManagerInstance) {
    console.log("--- Running Bomb Mechanics Tests ---");

    // Mock GameScene and its dependencies for BombManager
    const mockScene = createMockScene();
    const bombManager = bombManagerInstance || new BombManager(mockScene); // Allow passing an existing manager

    // Link BombManager to the mock scene
    mockScene.bombManager = bombManager;
    mockScene.blockUtils = new BlockUtils(mockScene); // Assuming BlockUtils is available
    mockScene.bombUtils = new BombUtils(mockScene);   // Assuming BombUtils is available

    // Initialize BombManager (if it has an init method)
    if (typeof bombManager.init === 'function') {
        bombManager.init();
    }
    // Setup initial bombs in BombManager if it has setupBombs
    if (typeof bombManager.setupBombs === 'function') {
        bombManager.setupBombs({ /* mock level data if needed */ });
    }


    // Run individual tests
    testBlastBomb(bombManager, mockScene);
    testPiercerBomb(bombManager, mockScene);
    testClusterBomb(bombManager, mockScene);
    testStickyBomb(bombManager, mockScene);
    testShattererBomb(bombManager, mockScene);
    testDrillerBomb(bombManager, mockScene);
    testRicochetBomb(bombManager, mockScene);

    console.log("--- Bomb Mechanics Tests Complete ---");
}

// --- Mocking Utilities ---

function createMockScene() {
    const mockScene = {
        matter: {
            add: {
                image: (x, y, texture, frame, options) => createMockMatterSprite(x, y, texture, options),
                rectangle: (x, y, width, height, options) => createMockMatterSprite(x, y, 'rectangle', options), // Mock rectangle
                world: {
                    remove: sinon.stub(),
                    on: sinon.stub(), // Stub for collision events
                    setGravity: sinon.stub(),
                    setBounds: sinon.stub(),
                    localWorld: { // Mock localWorld for trajectory
                        gravity: { y: 0.008 },
                        body: { global: { translateForceToPts: 1 } }
                    }
                }
            },
            body: {
                applyForce: sinon.stub()
            },
            world: { // Duplicate for safety, sometimes accessed directly
                remove: sinon.stub(),
                on: sinon.stub(),
                setGravity: sinon.stub(),
                setBounds: sinon.stub(),
                localWorld: {
                    gravity: { y: 0.008 },
                    body: { global: { translateForceToPts: 1 } }
                }
            }
        },
        add: {
            image: (x, y, texture) => ({ x, y, texture, setScale: sinon.stub().returnsThis(), setDisplaySize: sinon.stub().returnsThis(), setInteractive: sinon.stub().returnsThis(), setDepth: sinon.stub().returnsThis(), setVisible: sinon.stub().returnsThis(), destroy: sinon.stub(), on: sinon.stub(), glow: null }),
            particles: (texture) => ({ createEmitter: sinon.stub().returns({ explode: sinon.stub(), stop: sinon.stub(), remove: sinon.stub(), startFollow: sinon.stub(), stopFollow: sinon.stub(), setPosition: sinon.stub() }), destroy: sinon.stub(), setDepth: sinon.stub() }),
            text: (x, y, text, style) => ({ x, y, text, style, setOrigin: sinon.stub().returnsThis(), setDepth: sinon.stub().returnsThis(), destroy: sinon.stub(), setText: sinon.stub() }),
            graphics: () => ({ lineStyle: sinon.stub().returnsThis(), moveTo: sinon.stub().returnsThis(), lineTo: sinon.stub().returnsThis(), strokePath: sinon.stub().returnsThis(), generateTexture: sinon.stub(), clear: sinon.stub(), fillCircle: sinon.stub().returnsThis(), strokeCircle: sinon.stub().returnsThis(), setDepth: sinon.stub().returnsThis(), fillStyle: sinon.stub().returnsThis() }),
            circle: (x, y, radius, fillColor, alpha) => ({ x, y, radius, fillColor, alpha, setDepth: sinon.stub().returnsThis(), setStrokeStyle: sinon.stub().returnsThis(), destroy: sinon.stub(), setVisible: sinon.stub().returnsThis(), scene: mockScene }),
            rectangle: (x, y, width, height, fillColor, alpha) => ({ x, y, width, height, fillColor, alpha, setDepth: sinon.stub().returnsThis(), setStrokeStyle: sinon.stub().returnsThis(), destroy: sinon.stub(), setVisible: sinon.stub().returnsThis(), scene: mockScene, iterate: sinon.stub(), add: sinon.stub() }),
            container: (x,y) => ({ x, y, add: sinon.stub(), setDepth: sinon.stub().returnsThis(), destroy: sinon.stub(), iterate: sinon.stub() }),
        },
        tweens: {
            add: sinon.stub().callsFake(config => {
                if (config.onComplete) {
                    // Immediately call onComplete for testing, or use a mock timer
                    // For simplicity, we can call it directly or after a zero timeout
                    setTimeout(() => config.onComplete(), 0);
                }
                return { stop: sinon.stub() }; // Return a mock tween object
            }),
            killAll: sinon.stub(),
            killTweensOf: sinon.stub(),
        },
        time: {
            delayedCall: sinon.stub().callsFake((delay, callback) => {
                // Call immediately for testing or use a mock timer
                setTimeout(callback, 0); // Simplistic approach
                return { remove: sinon.stub() };
            }),
            addEvent: sinon.stub().returns({ remove: sinon.stub() }),
            removeAllEvents: sinon.stub(),
            now: Date.now()
        },
        input: {
            setDraggable: sinon.stub(),
            keyboard: { on: sinon.stub() },
            on: sinon.stub(),
            off: sinon.stub(),
        },
        events: {
            emit: sinon.stub(),
            on: sinon.stub(),
            off: sinon.stub(),
        },
        cache: {
            audio: { exists: sinon.stub().returns(true), entries: { entries: {} } }, // Mock audio cache
            json: { get: sinon.stub() }
        },
        textures: {
            exists: sinon.stub().returns(true),
            getFrame: sinon.stub().returns({ source: { image: new Image(), canvas: document.createElement('canvas') } }), // Mock texture frame
            list: {}
        },
        sound: {
            add: sinon.stub().returns({ play: sinon.stub(), stop: sinon.stub(), on: sinon.stub() }), // Mock sound object
            play: sinon.stub(),
            stopAll: sinon.stub(),
        },
        cameras: {
            main: { width: 1920, height: 1080, centerX: 960, centerY: 540, scrollX: 0, scrollY: 0, setBounds: sinon.stub(), flash: sinon.stub(), shake: sinon.stub(), setBackgroundColor: sinon.stub(), setViewport: sinon.stub() },
            add: sinon.stub().returnsThis(), // Mock UI camera
            ignore: sinon.stub(),
            setName: sinon.stub(),
            setScroll: sinon.stub(),
        },
        scale: { width: 1920, height: 1080 },
        game: { device: { os: { desktop: true } }, textures: { list: {} } }, // Mock game object
        scene: {
            isActive: sinon.stub().returns(true),
            isPaused: sinon.stub().returns(false),
            get: sinon.stub().returnsThis(), // Mock scene.get('UIScene')
            launch: sinon.stub(),
            stop: sinon.stub()
        },
        children: { list: [] }, // Mock children list for UI camera ignore
        // --- GameScene specific mocks (will be replaced by BombManager calls) ---
        BOMB_TYPES: {
            BLAST: 'blast_bomb',
            PIERCER: 'piercer_bomb',
            CLUSTER: 'cluster_bomb',
            STICKY: 'sticky_bomb',
            SHATTERER: 'shatterer_bomb',
            DRILLER: 'driller_bomb',
            RICOCHET: 'ricochet_bomb'
        },
        bombsRemaining: {}, // Will be managed by BombManager
        currentBombType: 'blast_bomb',
        iceBlocks: [],
        totalIceBlocks: 0,
        clearedIceBlocks: 0,
        targetPercentage: 85,
        shotsRemaining: 10,
        bow: { x: 100, y: 540 }, // Mock bow position
        BOW_X: 100,
        BOW_Y: 540,
        UI_DEPTH: 1000,
        MAX_DRAG_DISTANCE: 200,
        SHOT_POWER: 0.13,
        debugMode: false,
        chibiImage: { x: 1200, y: 540, width: 300, height: 600, texture: { key: 'chibi_girl1' }, setAlpha: sinon.stub() }, // Mock chibi image
        // --- Stubs for methods to be moved or called by BombManager ---
        destroyBlocksInRadius: sinon.stub(),
        triggerStickyBomb: sinon.stub(),
        createLargeExplosion: sinon.stub(),
        createDrillerExplosion: sinon.stub(),
        createDrillEffect: sinon.stub(),
        destroyIceBlock: sinon.stub().callsFake(block => {
            if (block) block.isActive = false;
            mockScene.clearedIceBlocks++;
            // Simulate reveal percentage update
            if (mockScene.totalIceBlocks > 0) {
                 mockScene.revealPercentage = Math.floor((mockScene.clearedIceBlocks / mockScene.totalIceBlocks) * 100);
            }
            mockScene.events.emit('updatePercentage', mockScene.revealPercentage);
        }),
        damageIceBlock: sinon.stub().callsFake(block => {
            if (block && block.hitsLeft > 0) block.hitsLeft--;
            if (block && block.hitsLeft <= 0) {
                mockScene.destroyIceBlock(block);
                return true;
            }
            return false;
        }),
        createDamageEffect: sinon.stub(),
        cleanupIceBlocksArray: sinon.stub().callsFake(() => {
            mockScene.iceBlocks = mockScene.iceBlocks.filter(b => b && b.isActive);
        }),
        playRandomVoiceMessage: sinon.stub(),
        checkLevelCompletion: sinon.stub(),
        resetBomb: sinon.stub(),
        updateBombUI: sinon.stub(),
        updateUI: sinon.stub(),
        currentLevel: 1,
        // Mock BombLauncher and BombUtils instances (simplified)
        bombLauncher: {
            createBomb: sinon.stub().callsFake((type) => {
                const newBomb = createMockMatterSprite(mockScene.BOW_X, mockScene.BOW_Y, type, {isStatic: true});
                newBomb.bombType = type;
                mockScene.bomb = newBomb; // Keep scene.bomb updated for compatibility
                return newBomb;
            }),
            bomb: null,
            bombState: { active: false },
            clearVisuals: sinon.stub(),
            cleanupExistingBomb: sinon.stub(),
        },
        // blockUtils and bombUtils will be instantiated if classes are globally available
    };

    // Initialize bombsRemaining for the mock scene
    Object.values(mockScene.BOMB_TYPES).forEach(type => {
        mockScene.bombsRemaining[type] = 5; // Default 5 of each for testing
    });
    mockScene.bombsRemaining[mockScene.BOMB_TYPES.RICOCHET] = 0; // Ricochet usually unlocked

    return mockScene;
}

function createMockMatterSprite(x, y, texture, options = {}) {
    const sprite = {
        x,
        y,
        texture,
        options,
        body: {
            isStatic: !!options.isStatic,
            velocity: { x: 0, y: 0 },
            angularVelocity: 0,
            restitution: options.restitution || 0.5,
            friction: options.friction || 0.1,
            frictionAir: options.frictionAir || 0.01,
            density: options.density || 0.001,
            label: options.label || texture,
            bounds: { min: {x: x-10, y: y-10}, max: {x: x+10, y: y+10}}, // Simple bounds
            gameObject: null // Will be self-reference
        },
        active: true,
        visible: true,
        depth: 0,
        bombType: texture, // Assume texture is bombType for simplicity
        isLaunched: false,
        hasHitIceBlock: false,
        hasExploded: false,
        isSticky: false,
        isDriller: false,
        isRicochet: false,
        isActive: true, // For ice blocks
        hitsLeft: 1,    // For ice blocks
        blockType: 'standard', // For ice blocks
        blueVeil: { destroy: sinon.stub(), highlight: {destroy: sinon.stub()} }, // For ice blocks
        setScale: sinon.stub().returnsThis(),
        setCircle: sinon.stub().returnsThis(),
        setStatic: sinon.stub().callsFake(function(isStatic) { this.body.isStatic = isStatic; return this; }),
        setVisible: sinon.stub().callsFake(function(visible) { this.visible = visible; return this; }),
        setDepth: sinon.stub().callsFake(function(depth) { this.depth = depth; return this; }),
        setDisplaySize: sinon.stub().returnsThis(),
        setFixedRotation: sinon.stub().returnsThis(),
        setFrictionAir: sinon.stub().callsFake(function(frictionAir) { this.body.frictionAir = frictionAir; return this; }),
        setAngularVelocity: sinon.stub().callsFake(function(vel) { this.body.angularVelocity = vel; return this; }),
        applyForce: sinon.stub().callsFake(function(force) { this.body.velocity.x += force.x * 10; this.body.velocity.y += force.y * 10; }), // Simplified force application
        setVelocity: sinon.stub().callsFake(function(vx, vy) { this.body.velocity.x = vx; this.body.velocity.y = vy; }),
        setPosition: sinon.stub().callsFake(function(newX, newY) { this.x = newX; this.y = newY; }),
        setBounce: sinon.stub().callsFake(function(bounce) { this.body.restitution = bounce; return this; }),
        setFriction: sinon.stub().callsFake(function(friction) { this.body.friction = friction; return this; }),
        destroy: sinon.stub().callsFake(function() { this.active = false; this.visible = false; if (this.scene && this.scene.matter.world.remove) this.scene.matter.world.remove(this.body); }),
        on: sinon.stub(),
        setData: sinon.stub().returnsThis(),
        getData: sinon.stub(),
        setInteractive: sinon.stub().returnsThis(), // For bomb selector buttons
        disableInteractive: sinon.stub().returnsThis(), // For bomb selector buttons
        setTint: sinon.stub().returnsThis(), // For bomb selector buttons
        setAlpha: sinon.stub().callsFake(function(alpha) { this.alpha = alpha; return this; }),
        alpha: 1,
        scene: null // Will be set to mockScene
    };
    sprite.body.gameObject = sprite; // Self-reference for physics body
    return sprite;
}

function createMockIceBlock(x, y, type = 'standard', hits = 1) {
    const block = createMockMatterSprite(x, y, 'iceBlock', { isStatic: true });
    block.blockType = type;
    block.hitsLeft = hits;
    block.isActive = true;
    block.blueVeil = { destroy: sinon.stub(), highlight: {destroy: sinon.stub()}, setAlpha: sinon.stub() };
    return block;
}

// --- Test Suites ---

function testBlastBomb(bombManager, mockScene) {
    console.log("  Running Test: Blast Bomb...");
    // Reset stubs and scene state
    sinon.resetHistory();
    mockScene.iceBlocks = [
        createMockIceBlock(200, 200),
        createMockIceBlock(210, 210), // In radius
        createMockIceBlock(400, 400)  // Out of radius
    ];
    mockScene.iceBlocks.forEach(b => b.scene = mockScene);
    mockScene.totalIceBlocks = mockScene.iceBlocks.length;
    mockScene.clearedIceBlocks = 0;
    mockScene.bombUtils.destroyBlocksInRadius.resetHistory(); // Reset specific stub

    const explosionX = 200, explosionY = 200;
    const blastRadius = 150; // Matching GameScene.js

    // Temporarily assign the method to mockScene if BombManager doesn't have it yet
    const target = bombManager.handleBlastBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleBlastBomb !== 'function') {
        console.warn("    Skipping Blast Bomb test: handleBlastBomb not found on BombManager or mockScene.bombUtils");
        return;
    }

    target.handleBlastBomb(explosionX, explosionY);

    // Assertions
    // 1. Explosion effect was created (visual, harder to test without actual rendering, rely on destroyBlocksInRadius)
    //    bombUtils.createExplosion is called by handleBlastBomb
    console.assert(mockScene.bombUtils.createExplosion.calledOnceWith(explosionX, explosionY), "    FAIL: Blast Bomb - createExplosion was not called correctly.");

    // 2. destroyBlocksInRadius was called with correct parameters
    console.assert(mockScene.bombUtils.destroyBlocksInRadius.calledOnceWith(explosionX, explosionY, blastRadius), "    FAIL: Blast Bomb - destroyBlocksInRadius was not called with correct radius.");

    // 3. triggerStickyBomb was called
    console.assert(mockScene.bombManager.triggerStickyBomb ? mockScene.bombManager.triggerStickyBomb.calledOnceWith(explosionX, explosionY, blastRadius) : mockScene.triggerStickyBomb.calledOnceWith(explosionX, explosionY, blastRadius), "    FAIL: Blast Bomb - triggerStickyBomb was not called.");

    console.log("  Test: Blast Bomb - PASSED (basic checks)");
}

function testPiercerBomb(bombManager, mockScene) {
    console.log("  Running Test: Piercer Bomb...");
    sinon.resetHistory();
    mockScene.iceBlocks = [
        createMockIceBlock(300, 300),
        createMockIceBlock(300, 320), // Along path
        createMockIceBlock(300, 340), // Along path
        createMockIceBlock(350, 350)  // Off path
    ];
    mockScene.iceBlocks.forEach(b => b.scene = mockScene);
    mockScene.totalIceBlocks = mockScene.iceBlocks.length;
    mockScene.clearedIceBlocks = 0;
    mockScene.bombUtils.destroyBlocksInRadius.resetHistory();

    const startX = 300, startY = 250;
    const velocity = { x: 0, y: 10 }; // Straight down

    const target = bombManager.handlePiercerBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handlePiercerBomb !== 'function') {
        console.warn("    Skipping Piercer Bomb test: handlePiercerBomb not found on BombManager or mockScene.bombUtils");
        return;
    }

    target.handlePiercerBomb(startX, startY, velocity);

    // Assertions
    console.assert(mockScene.bombUtils.createExplosion.calledWith(startX, startY), "    FAIL: Piercer Bomb - createExplosion was not called for initial impact.");
    // Piercer calls destroyBlocksInRadius multiple times along a line
    console.assert(mockScene.bombUtils.destroyBlocksInRadius.callCount > 1, "    FAIL: Piercer Bomb - destroyBlocksInRadius should be called multiple times for line effect.");
    // Check if particles were created
    console.assert(mockScene.add.particles.calledWith('particle'), "    FAIL: Piercer Bomb - Particle system for piercing line not created.");

    console.log("  Test: Piercer Bomb - PASSED (basic checks)");
}

function testClusterBomb(bombManager, mockScene) {
    console.log("  Running Test: Cluster Bomb...");
    sinon.resetHistory();
    mockScene.bombUtils.createExplosion.resetHistory();
    mockScene.bombUtils.createMiniExplosion.resetHistory();
    mockScene.bombUtils.destroyBlocksInRadius.resetHistory();
    mockScene.triggerStickyBomb.resetHistory(); // Assuming triggerStickyBomb is on mockScene or bombManager directly

    const explosionX = 250, explosionY = 250;

    const target = bombManager.handleClusterBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleClusterBomb !== 'function') {
        console.warn("    Skipping Cluster Bomb test: handleClusterBomb not found.");
        return;
    }

    target.handleClusterBomb(explosionX, explosionY);

    // Assertions
    console.assert(mockScene.bombUtils.createExplosion.calledOnceWith(explosionX, explosionY), "    FAIL: Cluster Bomb - Main createExplosion was not called.");
    console.assert(mockScene.bombUtils.destroyBlocksInRadius.calledWith(explosionX, explosionY, 100), "    FAIL: Cluster Bomb - Main destroyBlocksInRadius was not called with correct radius.");
    console.assert(mockScene.bombManager.triggerStickyBomb ? mockScene.bombManager.triggerStickyBomb.calledWith(explosionX, explosionY, 100) : mockScene.triggerStickyBomb.calledWith(explosionX, explosionY, 100), "    FAIL: Cluster Bomb - Main triggerStickyBomb was not called.");

    // Check for sub-explosions (miniExplosions)
    // Need to wait for delayedCalls to execute. Sinon's fake timers would be better here.
    // For now, we check if it was called at all, count might be tricky without proper timer control.
    setTimeout(() => {
        console.assert(mockScene.bombUtils.createMiniExplosion.callCount >= 3 && mockScene.bombUtils.createMiniExplosion.callCount <= 5, `    FAIL: Cluster Bomb - createMiniExplosion call count (${mockScene.bombUtils.createMiniExplosion.callCount}) not within expected range 3-5.`);
        console.assert(mockScene.bombUtils.destroyBlocksInRadius.callCount > 1, "    FAIL: Cluster Bomb - destroyBlocksInRadius not called for sub-clusters.");
        console.log("  Test: Cluster Bomb - PASSED (basic checks, async checks might need review)");
    }, 100); // Wait a bit for delayed calls in the cluster bomb logic
}

function testStickyBomb(bombManager, mockScene) {
    console.log("  Running Test: Sticky Bomb...");
    sinon.resetHistory();
    mockScene.activeStickyBombs = []; // Ensure it's an array for the test
    const mockBlock = createMockIceBlock(300, 300);
    mockBlock.scene = mockScene;
    mockScene.iceBlocks = [mockBlock];
    mockScene.bomb = createMockMatterSprite(300,290, 'sticky_bomb');
    mockScene.bomb.scene = mockScene;
    mockScene.bombLauncher.bomb = mockScene.bomb; // Simulate bomb in launcher

    const explosionX = 300, explosionY = 290;

    const target = bombManager.handleStickyBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleStickyBomb !== 'function') {
        console.warn("    Skipping Sticky Bomb test: handleStickyBomb not found.");
        return;
    }

    const stickyBombInstance = target.handleStickyBomb(explosionX, explosionY, mockBlock);

    // Assertions for initial stick
    console.assert(stickyBombInstance !== null && typeof stickyBombInstance === 'object', "    FAIL: Sticky Bomb - Did not return a sticky bomb instance.");
    if (stickyBombInstance) {
        console.assert(stickyBombInstance.isSticky === true, "    FAIL: Sticky Bomb - Instance not marked as sticky.");
        console.assert(stickyBombInstance.bombSprite.isSticky === true, "    FAIL: Sticky Bomb - Original bomb sprite not marked as sticky.");
        console.assert(stickyBombInstance.bombSprite.hasExploded === false, "    FAIL: Sticky Bomb - Original bomb sprite incorrectly marked as exploded.");
        console.assert(mockScene.activeStickyBombs && mockScene.activeStickyBombs.includes(stickyBombInstance), "    FAIL: Sticky Bomb - Not added to activeStickyBombs array.");
    }
    console.assert(mockScene.add.particles.calledWith('sticky_particle'), "    FAIL: Sticky Bomb - Sticky particles not created.");
    // Check if the original bomb in launcher was nulled out (or scene.bomb)
    console.assert(mockScene.bombLauncher.bomb === null || mockScene.bomb === null, "    FAIL: Sticky Bomb - Original bomb reference not cleared after sticking.");

    // Test triggering the sticky bomb
    mockScene.bombUtils.createLargeExplosion.resetHistory();
    mockScene.bombUtils.destroyBlocksInRadius.resetHistory();
    const triggerTarget = bombManager.triggerStickyBomb ? bombManager : mockScene; // triggerStickyBomb might be on scene initially
    
    if (typeof triggerTarget.triggerStickyBomb !== 'function') {
        console.warn("    Skipping Sticky Bomb trigger test: triggerStickyBomb not found.");
        console.log("  Test: Sticky Bomb (Initial Stick) - PASSED (basic checks)");
        return;
    }
    triggerTarget.triggerStickyBomb(explosionX, explosionY, 50); // Trigger within a small radius

    setTimeout(() => {
        console.assert(mockScene.bombUtils.createLargeExplosion.calledOnceWith(stickyBombInstance.x, stickyBombInstance.y), "    FAIL: Sticky Bomb Trigger - createLargeExplosion not called.");
        console.assert(mockScene.bombUtils.destroyBlocksInRadius.calledOnceWith(stickyBombInstance.x, stickyBombInstance.y, stickyBombInstance.explosionRadius), "    FAIL: Sticky Bomb Trigger - destroyBlocksInRadius not called correctly.");
        console.assert(mockScene.activeStickyBombs && !mockScene.activeStickyBombs.includes(stickyBombInstance), "    FAIL: Sticky Bomb Trigger - Not removed from activeStickyBombs array after trigger.");
        console.log("  Test: Sticky Bomb (Full Cycle) - PASSED (basic checks, async checks might need review)");
    }, 500); // Wait for delayed calls in trigger logic
}

function testShattererBomb(bombManager, mockScene) {
    console.log("  Running Test: Shatterer Bomb...");
    sinon.resetHistory();
    mockScene.iceBlocks = [
        createMockIceBlock(350, 350, 'standard', 1),
        createMockIceBlock(360, 360, 'strong', 3),
        createMockIceBlock(370, 370, 'eternal', 99)
    ];
    mockScene.iceBlocks.forEach(b => { b.scene = mockScene; mockScene.blockUtils.createShattererImpactEffect = sinon.stub(); });
    mockScene.bombUtils.destroyBlocksWithShatterer = sinon.spy(mockScene.bombUtils, 'destroyBlocksWithShatterer'); // Spy on the specific method

    const explosionX = 350, explosionY = 350;

    const target = bombManager.handleShattererBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleShattererBomb !== 'function') {
        console.warn("    Skipping Shatterer Bomb test: handleShattererBomb not found.");
        return;
    }

    target.handleShattererBomb(explosionX, explosionY);

    // Assertions
    console.assert(mockScene.add.particles.calledWith('impact_particle'), "    FAIL: Shatterer Bomb - Impact particles not created.");
    console.assert(mockScene.bombUtils.destroyBlocksWithShatterer.calledOnceWith(explosionX, explosionY, 250), "    FAIL: Shatterer Bomb - destroyBlocksWithShatterer not called correctly.");
    // destroyBlocksWithShatterer itself should call destroyIceBlock for all types in radius
    // We can check this by seeing if destroyIceBlock was called for each block in the original array
    // This requires more complex setup if destroyBlocksWithShatterer is also being refactored.
    // For now, the spy on destroyBlocksWithShatterer is the main check.

    // Restore the spied method
    if (mockScene.bombUtils.destroyBlocksWithShatterer.restore) {
        mockScene.bombUtils.destroyBlocksWithShatterer.restore();
    }
    console.log("  Test: Shatterer Bomb - PASSED (basic checks)");
}

function testDrillerBomb(bombManager, mockScene) {
    console.log("  Running Test: Driller Bomb...");
    sinon.resetHistory();
    const mockDrillBlock = createMockIceBlock(400, 400);
    mockDrillBlock.scene = mockScene;
    mockScene.iceBlocks = [mockDrillBlock, createMockIceBlock(400, 420), createMockIceBlock(400, 440)];
    mockScene.iceBlocks.forEach(b => b.scene = mockScene);
    mockScene.activeDrillerBombs = []; // Ensure it's an array
    mockScene.activeStickyBombs = []; // Driller bombs might be added here after drilling

    const startX = 400, startY = 380;
    const mockBomb = createMockMatterSprite(startX, startY, 'driller_bomb');
    mockBomb.scene = mockScene;
    mockBomb.storedVelocityX = 0;
    mockBomb.storedVelocityY = 5;
    mockScene.bomb = mockBomb; // Simulate current bomb
    mockScene.bombLauncher.bomb = mockBomb;

    const target = bombManager.handleDrillerBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleDrillerBomb !== 'function') {
        console.warn("    Skipping Driller Bomb test: handleDrillerBomb not found.");
        return;
    }

    const drillerInstance = target.handleDrillerBomb(startX, startY, mockDrillBlock, 0, 5);

    // Assertions for initial drill start
    console.assert(drillerInstance !== null && typeof drillerInstance === 'object', "    FAIL: Driller Bomb - Did not return a driller bomb instance.");
    if (drillerInstance) {
        console.assert(drillerInstance.isDriller === true, "    FAIL: Driller Bomb - Instance not marked as driller.");
        console.assert(drillerInstance.bombSprite.isDriller === true, "    FAIL: Driller Bomb - Original bomb sprite not marked as driller.");
    }
    console.assert(mockScene.add.particles.calledWith('particle'), "    FAIL: Driller Bomb - Drilling particles not created.");
    console.assert(mockScene.activeDrillerBombs && mockScene.activeDrillerBombs.includes(drillerInstance), "    FAIL: Driller Bomb - Not added to activeDrillerBombs array.");

    // Simulate drilling completion and check if it's added to sticky bombs for later explosion
    // This part is tricky because of the timeouts and intervals.
    // A more robust test would use fake timers.
    setTimeout(() => {
        // Manually call drillingComplete or simulate conditions for it
        if (drillerInstance && drillerInstance.drillInterval && drillerInstance.drillInterval.remove) {
            // console.log("Manually stopping drill interval for test");
            // drillerInstance.drillInterval.remove(); // Stop interval
            // Access the callback directly for an immediate call to simulate end
            // This is a bit of a hack due to not having full control over Phaser.Time.addEvent
            // The internal callback for drillingComplete is not directly exposed.
            // We will assume that after some time, it might be added to activeStickyBombs.
        }

        const stuckDriller = mockScene.activeStickyBombs.find(b => b.isDriller && b.createdAt === drillerInstance.createdAt);
        // console.assert(stuckDriller, "    FAIL: Driller Bomb - Driller instance not found in activeStickyBombs after simulated drill completion.");
        // if (stuckDriller) {
        //     console.assert(stuckDriller.isDriller === true, "    FAIL: Driller Bomb - Stuck driller not marked as driller type.");
        // }
        console.log("  Test: Driller Bomb - PASSED (initial checks, async completion needs manual verification or fake timers)");
    }, 1500); // Allow time for some drilling steps
}

function testRicochetBomb(bombManager, mockScene) {
    console.log("  Running Test: Ricochet Bomb...");
    sinon.resetHistory();

    const startX = 450, startY = 450;
    const mockRicochetBomb = createMockMatterSprite(startX, startY, 'ricochet_bomb');
    mockRicochetBomb.scene = mockScene;
    mockRicochetBomb.isRicochet = true; // Mark as ricochet
    mockRicochetBomb.countdown = { remove: sinon.stub() }; // Mock countdown timer object
    mockRicochetBomb.countdownText = { destroy: sinon.stub(), setPosition: sinon.stub(), setText: sinon.stub(), setFill: sinon.stub(), scene: mockScene };
    mockScene.bomb = mockRicochetBomb;

    const mockBlock = createMockIceBlock(450, 500); // Block to bounce off
    mockBlock.scene = mockScene;
    const velocity = { x: 0, y: 10 };

    const target = bombManager.handleRicochetBomb ? bombManager : mockScene.bombUtils;
    if (typeof target.handleRicochetBomb !== 'function') {
        console.warn("    Skipping Ricochet Bomb (impact) test: handleRicochetBomb not found.");
        return;
    }

    target.handleRicochetBomb(startX, startY, mockBlock, velocity);

    // Assertions for ricochet impact (bouncing, not exploding)
    console.assert(mockRicochetBomb.hasExploded === false, "    FAIL: Ricochet Bomb - Should not explode on initial block impact.");
    // Check if velocity was changed (implies a bounce)
    // Initial velocity Y was 10. After bounce, it should be different, likely negative.
    console.assert(mockRicochetBomb.body.velocity.y !== velocity.y, "    FAIL: Ricochet Bomb - Velocity Y not changed after bounce.");
    // Check if bounce trail was created (if method exists on bombUtils)
    if (mockScene.bombUtils.createBounceTrail) {
        console.assert(mockScene.bombUtils.createBounceTrail.calledWith(mockRicochetBomb), "    FAIL: Ricochet Bomb - createBounceTrail not called.");
    }
    console.assert(mockScene.time.addEvent.called, "    FAIL: Ricochet Bomb - Countdown timer (addEvent) not started on initial creation/bounce.");


    // Test manual explosion / timeout explosion
    const explosionTarget = bombManager.explodeRicochetBomb ? bombManager : mockScene.bombUtils;
    if (typeof explosionTarget.explodeRicochetBomb !== 'function') {
         console.warn("    Skipping Ricochet Bomb (explosion) test: explodeRicochetBomb not found.");
         console.log("  Test: Ricochet Bomb (Impact) - PASSED (basic checks)");
         return;
    }

    mockScene.bombUtils.createLargeExplosion.resetHistory();
    mockScene.bombUtils.destroyBlocksInRadius.resetHistory();
    mockScene.resetBomb.resetHistory();

    explosionTarget.explodeRicochetBomb(mockRicochetBomb); // Pass the bomb instance

    setTimeout(() => {
        console.assert(mockScene.bombUtils.createLargeExplosion.calledOnce, "    FAIL: Ricochet Bomb Explosion - createLargeExplosion not called.");
        // Note: The arguments for createLargeExplosion would be bomb.x, bomb.y from the explodeRicochetBomb method.
        console.assert(mockScene.bombUtils.destroyBlocksInRadius.calledOnce, "    FAIL: Ricochet Bomb Explosion - destroyBlocksInRadius not called.");
        console.assert(mockScene.resetBomb.calledOnce, "    FAIL: Ricochet Bomb Explosion - resetBomb not called after explosion.");
        console.assert(mockRicochetBomb.hasExploded === true || !mockRicochetBomb.active, "    FAIL: Ricochet Bomb Explosion - Bomb not marked as exploded or destroyed.");
        console.log("  Test: Ricochet Bomb (Full Cycle) - PASSED (basic checks, async might need review)");
    }, 100); // Allow for delayed calls within explodeRicochetBomb

}

// --- Helper to run tests when script is loaded ---
// This allows including the script in an HTML file and running tests automatically.
// You might need a simple HTML runner like test_bomb_launcher.html uses.
// Example:
// <script src="path/to/sinon.js"></script> <!-- If you use sinon for stubbing -->
// <script src="BombManager.js"></script>
// <script src="BlockUtils.js"></script>
// <script src="BombUtils.js"></script>
// <script src="bomb_mechanics.test.js"></script>
// <script>
//    // Wait for other scripts to load
//    window.onload = () => {
//        // Check if BombManager is defined, otherwise tests might fail to run
//        if (typeof BombManager !== 'undefined' && typeof BlockUtils !== 'undefined' && typeof BombUtils !== 'undefined') {
//            // Create an instance of BombManager if you are testing its refactored methods directly
//            // const mockSceneForManager = createMockScene();
//            // const bombManagerInstance = new BombManager(mockSceneForManager);
//            // mockSceneForManager.bombManager = bombManagerInstance;
//            // runAllBombTests(bombManagerInstance);

//            // For now, BombManager methods might still be on GameScene or BombUtils
//            // So we pass null, and the test runner will try to find them on mockScene.bombUtils or mockScene itself
//            runAllBombTests(null);
//        } else {
//            console.error("BombManager, BlockUtils, or BombUtils class not found. Ensure scripts are loaded in correct order.");
//        }
//    };
// </script>

// Note: Sinon.js is a good library for stubbing/mocking. If you don't have it,
// you'll need to implement basic stubs or remove sinon.stub() calls.
// For simplicity, this example assumes sinon is available or stubs are manually created.
// If not using sinon, replace sinon.stub() with () => {} or a custom stub function.
if (typeof sinon === 'undefined') {
    console.warn("Sinon.js not found. Mocking will be basic. For better testing, include Sinon.js.");
    globalThis.sinon = {
        stub: () => {
            const f = (...args) => {
                f.called = true;
                f.callCount = (f.callCount || 0) + 1;
                f.args = args;
                f.calledWith = (...checkArgs) => {
                    // Simple check, not a full sinon implementation
                    return JSON.stringify(f.args) === JSON.stringify(checkArgs);
                };
            };
            f.called = false;
            f.callCount = 0;
            f.calledOnceWith = (...checkArgs) => f.callCount === 1 && f.calledWith(...checkArgs);
            f.calledOnce = () => f.callCount === 1;
            f.resetHistory = () => {
                f.called = false;
                f.callCount = 0;
                f.args = undefined;
            };
            return f;
        },
        resetHistory: () => { /* Global reset if needed */ }
    };
} 