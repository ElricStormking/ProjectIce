class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        console.log("[UIScene.constructor] UIScene instantiated.");
        this.gameScene = null;
        this.UI_DEPTH = 1000;

        // Main UI elements
        this.shotsText = null;
        this.percentageText = null;
        this.targetText = null;
        this.scoreText = null;
        this.progressBarBg = null;
        this.progressBar = null;
        this.progressText = null;

        // Bomb selector UI elements
        this.bombSelectorContainer = null;
        this.bombLabels = {};
        this.bombCounters = {};
        this.bombButtons = {};
        this.selectionIndicator = null;

        // UI Containers
        this.containers = {};
    }

    create() {
        console.log("[UIScene.create] VERY FIRST LINE IN CREATE");
        console.log("UIScene: create called");
        this.gameScene = this.scene.get('GameScene');
        console.log("[UIScene.create] this.gameScene is:", this.gameScene);
        
        this.setupUICamera();
        this.createUIElements();    // For top bar UI (shots, percentage, score)
        this.createBombSelector();  // For bottom bomb selection UI

        this.setupEventListeners();

        // Check if GameScene data was already ready when UIScene started
        const gameSceneReadyFlag = this.gameScene && this.gameScene.isInitialDataReady;
        console.log("[UIScene.create] Checking gameSceneReadyFlag:", gameSceneReadyFlag, "(GameScene:", this.gameScene, ")");
        if (gameSceneReadyFlag) {
            console.log("UIScene: GameScene data was already ready on UIScene create. Requesting UI data immediately.");
            this.requestInitialUIData();
        }
        
        console.log("UIScene: create finished");
    }

    setupEventListeners() {
        console.log("[UIScene.setupEventListeners] Called. this.gameScene is:", this.gameScene);
        if (this.gameScene && this.gameScene.events) {
            console.log("[UIScene.setupEventListeners] GameScene and events emitter found. Attempting to attach 'initialUIDataReady' listener.");
            this.gameScene.events.on('updateShots', this.updateShots, this);
            this.gameScene.events.on('updatePercentage', this.updatePercentage, this);
            this.gameScene.events.on('updateScore', this.updateScore, this);
            this.gameScene.events.on('bombCountUpdated', this.updateBombCounter, this);
            this.gameScene.events.on('bombTypeSelected', this.updateBombSelectionDisplay, this);
            this.gameScene.events.on('levelComplete', this.showLevelComplete, this);
            this.gameScene.events.on('gameOver', this.showGameOverScreen, this);
            this.gameScene.events.on('refreshUI', this.refreshUIElements, this);
            this.gameScene.events.on('displayMessage', this.showMessage, this);
            this.gameScene.events.on('initialUIDataReady', this.requestInitialUIData, this);
            console.log("UIScene: Event listeners set up with GameScene.");
        } else {
            console.warn('[UIScene.setupEventListeners] GameScene or its events emitter not found on create. Attempting delayed setup.');
            this.time.delayedCall(200, () => {
                this.gameScene = this.scene.get('GameScene');
                console.log("[UIScene.setupEventListeners] Delayed call. this.gameScene is now:", this.gameScene);
                if (this.gameScene && this.gameScene.events) {
                    console.log("[UIScene.setupEventListeners] Delayed call: GameScene and events emitter found. Setting up listeners.");
                    this.setupEventListeners(); // This will re-run and set up all listeners including the new one
                    // No need to call requestInitialUIData here directly, event will trigger it.
                    console.log("UIScene: Event listeners set up after delay.");
                } else {
                    console.error("[UIScene.setupEventListeners] Delayed call: Failed to get GameScene even after delay. UI will not function correctly.");
                }
            });
        }
    }

    createUIElements() {
        console.log("UIScene: Creating top UI elements (shots, percentage, score)");
        const gameWidth = 1920;
        const centerX = gameWidth / 2;
        
        // Destroy existing elements if they exist
        if (this.shotsText) this.shotsText.destroy();
        if (this.percentageText) this.percentageText.destroy();
        if (this.targetText) this.targetText.destroy();
        if (this.scoreText) this.scoreText.destroy();
        if (this.progressBarBg) this.progressBarBg.destroy();
        if (this.progressBar) this.progressBar.destroy();
        if (this.progressText) this.progressText.destroy();

        this.shotsText = this.add.text(170, 40, 'Shots: -', {
            font: '28px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 2);
        
        this.percentageText = this.add.text(centerX, 30, 'Revealed: -%', {
            font: '28px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 2);
        
        this.targetText = this.add.text(centerX, 60, 'Target: -%', {
            font: '22px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 2);

        this.scoreText = this.add.text(gameWidth - 170, 40, 'Score: -', {
            font: '28px Arial', fill: '#ffff00', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 2);
        
        this.progressBarBg = this.add.rectangle(centerX, 90, 350, 12, 0x444444, 1)
            .setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 1);
        
        this.progressBar = this.add.rectangle(centerX - 175, 90, 0, 10, 0x00ff00, 1)
            .setOrigin(0, 0.5).setDepth(this.UI_DEPTH + 1);
        
        this.progressText = this.add.text(centerX, 90, '- %', {
            font: '14px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5, 0.5).setDepth(this.UI_DEPTH + 2);
    }

    createBombSelector() {
        console.log("UIScene: Creating bomb selector UI");
        if (!this.gameScene) {
            console.warn("UIScene: GameScene not available for bomb selector creation. Aborting.");
            return;
        }

        const BOMB_TYPES = this.gameScene.BOMB_TYPES || {};
        const BOMB_NAMES = this.gameScene.BOMB_NAMES || {};
        const bombsRemaining = this.gameScene.bombsRemaining || 
            Object.fromEntries(Object.values(BOMB_TYPES).map(type => [type, 0]));
        const currentBombType = this.gameScene.currentBombType || (Object.values(BOMB_TYPES)[0] || 'blast_bomb');
        
        const gameHeight = 1080;
        const gameWidth = 1920;
        const buttonY = gameHeight - 70;
        const spacing = 120;
        
        const numBombs = Object.keys(BOMB_TYPES).length;
        const startX = gameWidth / 2 - (spacing * (numBombs - 1) / 2);
        
        if (this.bombSelectorContainer) this.bombSelectorContainer.destroy();
        
        this.bombSelectorContainer = this.add.container(0, 0).setDepth(this.UI_DEPTH);
        
        const selectorBg = this.add.rectangle(gameWidth / 2, buttonY, gameWidth, 100, 0x000000, 0.6)
            .setStrokeStyle(2, 0x3388ff, 0.8)
            .setDepth(this.UI_DEPTH -1);
        this.bombSelectorContainer.add(selectorBg);
        
        this.bombButtons = {};
        this.bombLabels = {};
        this.bombCounters = {};
        
        const bombColors = {
            [BOMB_TYPES.BLAST]: 0xff4444, [BOMB_TYPES.PIERCER]: 0x44aaff, [BOMB_TYPES.CLUSTER]: 0xffaa44,
            [BOMB_TYPES.STICKY]: 0x44ff44, [BOMB_TYPES.SHATTERER]: 0xaa44ff, [BOMB_TYPES.DRILLER]: 0xBB5500,
            [BOMB_TYPES.RICOCHET]: 0x00FFFF
        };
        
        const createButton = (x, y, bombType) => {
            const button = this.add.image(x, y, bombType)
                .setScale(0.8)
                .setDisplaySize(60, 60)
                .setInteractive({ useHandCursor: true })
                .setDepth(this.UI_DEPTH + 1);
            
            const glowColor = bombColors[bombType] || 0xffffff;
            const glow = this.add.circle(x, y, 30, glowColor, 0.2);
            glow.setDepth(this.UI_DEPTH);
            this.bombSelectorContainer.add(glow);
            
            button.on('pointerdown', () => {
                console.log(`[UIScene.createBombSelector] Button clicked for bombType: ${bombType}`);
                if (this.gameScene && this.gameScene.events) {
                    this.gameScene.events.emit('selectBombTypeRequest', bombType);
                }
            });
            
            const nameStyle = { font: '14px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 };
            const counterStyle = { font: '14px Arial', fill: '#ffff00', stroke: '#000000', strokeThickness: 2 };
            
            const nameLabel = this.add.text(x, y + 40, BOMB_NAMES[bombType] || 'N/A', nameStyle)
                .setOrigin(0.5).setDepth(this.UI_DEPTH + 1);
            
            const count = bombsRemaining[bombType] !== undefined ? bombsRemaining[bombType] : 0;
            const counterLabel = this.add.text(x, y - 35, `x${count}`, counterStyle)
                .setOrigin(0.5).setDepth(this.UI_DEPTH + 1);
            
            this.bombSelectorContainer.add([button, nameLabel, counterLabel]);
            button.glow = glow;
            this.bombButtons[bombType] = button;
            this.bombLabels[bombType] = nameLabel;
            this.bombCounters[bombType] = counterLabel;
            return button;
        };
        
        let index = 0;
        for (const bombKey in BOMB_TYPES) {
            const bombType = BOMB_TYPES[bombKey];
            if (BOMB_NAMES[bombType]) {
                 createButton(startX + spacing * index, buttonY, bombType);
                 index++;
            }
        }
        
        this.createSelectionIndicator();
        this.updateBombSelectionDisplay(currentBombType);
    }

    createSelectionIndicator() {
        if (this.selectionIndicator) this.selectionIndicator.destroy();
        this.selectionIndicator = this.add.circle(0, 0, 40, 0xffff00, 0.3)
            .setDepth(this.UI_DEPTH);
        this.bombSelectorContainer.add(this.selectionIndicator);
        
        this.tweens.add({
            targets: this.selectionIndicator,
            scale: { from: 1, to: 1.15 },
            alpha: { from: 0.3, to: 0.5 },
            duration: 700,
            yoyo: true,
            repeat: -1
        });
    }

    updateBombSelectionDisplay(bombType) {
        console.log(`UIScene: Updating bomb selection display for ${bombType}`);
        if (!this.gameScene || !this.bombButtons) {
             console.warn("UIScene: Cannot update bomb selection, GameScene or bombButtons not ready.");
             return;
        }
        const BOMB_NAMES = this.gameScene.BOMB_NAMES || {};

        for (const type in this.bombButtons) {
            const button = this.bombButtons[type];
            if (!button || !button.scene) continue;

            const isSelected = type === bombType;
            button.setTint(isSelected ? 0xffffff : 0xcccccc);
            button.setScale(isSelected ? 0.9 : 0.8);

            if (button.glow) {
                this.tweens.killTweensOf(button.glow);
                if (isSelected) {
                    button.glow.setAlpha(0.4).setScale(1.1);
                    this.tweens.add({ targets: button.glow, alpha: 0.6, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
                } else {
                    button.glow.setAlpha(0.2).setScale(1);
                }
            }
            if (this.bombLabels[type]) {
                this.bombLabels[type].setStyle({ 
                    font: isSelected ? 'bold 15px Arial' : '14px Arial',
                    fill: isSelected ? '#ffff00' : '#ffffff'
                });
            }
             if (this.bombCounters[type]) {
                this.bombCounters[type].setStyle({
                     font: isSelected ? 'bold 15px Arial' : '14px Arial',
                     fill: isSelected ? '#ffffff' : '#ffff00'
                });
            }
        }
        if (this.selectionIndicator && this.bombButtons[bombType]) {
            this.selectionIndicator.setPosition(this.bombButtons[bombType].x, this.bombButtons[bombType].y);
            this.selectionIndicator.setVisible(true);
        } else if (this.selectionIndicator) {
            this.selectionIndicator.setVisible(false);
        }
    }

    updateBombCounter(bombType, count) {
        console.log(`UIScene: Updating bomb counter for ${bombType} to ${count}`);
        if (this.bombCounters[bombType] && this.bombCounters[bombType].scene) {
            this.bombCounters[bombType].setText(`x${count}`);
        }
        if (this.bombButtons[bombType] && this.bombButtons[bombType].scene) {
            const button = this.bombButtons[bombType];
            if (count > 0) {
                button.setAlpha(1).setInteractive({ useHandCursor: true });
            } else {
                button.setAlpha(0.5).disableInteractive();
            }
        }
    }

    refreshUIElements() {
        console.log("UIScene: Refreshing UI elements.");
        this.createUIElements();
        this.createBombSelector();
        this.requestInitialUIData();
    }

    requestInitialUIData() {
        console.log("UIScene: Requesting initial UI data from GameScene.");
        if (this.gameScene) {
            console.log('[UIScene.requestInitialUIData] GameScene raw data:', {
                shotsRemaining: this.gameScene.shotsRemaining,
                revealPercentage: this.gameScene.revealPercentage,
                targetPercentage: this.gameScene.targetPercentage,
                score: this.gameScene.score,
                bombsRemaining: JSON.parse(JSON.stringify(this.gameScene.bombsRemaining || {})), // Deep copy
                currentBombType: this.gameScene.currentBombType,
                BOMB_TYPES: JSON.parse(JSON.stringify(this.gameScene.BOMB_TYPES || {})), // Deep copy
                BOMB_NAMES: JSON.parse(JSON.stringify(this.gameScene.BOMB_NAMES || {})) // Deep copy
            });

            if (this.gameScene.shotsRemaining !== undefined) this.updateShots(this.gameScene.shotsRemaining);
            if (this.gameScene.revealPercentage !== undefined && this.gameScene.targetPercentage !== undefined) this.updatePercentage(this.gameScene.revealPercentage, this.gameScene.targetPercentage);
            if (this.gameScene.score !== undefined) this.updateScore(this.gameScene.score);
            
            if (this.gameScene.bombsRemaining && this.gameScene.BOMB_TYPES) {
                for (const bombKey in this.gameScene.BOMB_TYPES) {
                    const bombType = this.gameScene.BOMB_TYPES[bombKey];
                    const count = this.gameScene.bombsRemaining[bombType] !== undefined ? this.gameScene.bombsRemaining[bombType] : 0;
                    this.updateBombCounter(bombType, count);
                }
            }
            if (this.gameScene.currentBombType) {
                this.updateBombSelectionDisplay(this.gameScene.currentBombType);
            }

        } else {
            console.warn("UIScene: GameScene not available to request initial UI data.");
        }
    }

    setupUICamera() {
        const gameWidth = 1920;
        const gameHeight = 1080;
        this.cameras.main.setName('UISceneCamera');
        this.cameras.main.setBounds(0, 0, gameWidth, gameHeight);
        this.cameras.main.setViewport(0, 0, gameWidth, gameHeight);
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.cameras.main.setScroll(0,0);
        console.log("UIScene: UI Camera setup complete.");
    }

    updateShots(shots) {
        if (!this.shotsText || !this.shotsText.scene) return;
        this.shotsText.setText(`Shots: ${shots !== undefined ? shots : '-'}`);
    }
    
    updateScore(score) {
        if (!this.scoreText || !this.scoreText.scene) return;
        this.scoreText.setText(`Score: ${score !== undefined ? score : '-'}`);
    }

    updatePercentage(percentage, targetPercentage) {
        if (!this.percentageText || !this.percentageText.scene || !this.progressText || !this.progressText.scene || !this.progressBar || !this.progressBar.scene || !this.targetText || !this.targetText.scene) return;
        
        const perc = percentage !== undefined ? Math.round(percentage) : 0;
        const target = targetPercentage !== undefined ? Math.round(targetPercentage) : 80;

        this.targetText.setText(`Target: ${target}%`);
        this.percentageText.setText(`Revealed: ${perc}%`);
        this.progressText.setText(`${perc}%`);
        this.progressBar.width = (perc / 100) * 350;

        if (perc >= target) {
            this.percentageText.setFill('#00ff00'); this.progressBar.fillColor = 0x00ff00;
        } else if (perc >= target * 0.75) {
            this.percentageText.setFill('#ffff00'); this.progressBar.fillColor = 0xffff00;
        } else if (perc >= target * 0.30) {
            this.percentageText.setFill('#ffffff'); this.progressBar.fillColor = 0xff8800;
        } else {
            this.percentageText.setFill('#ffffff'); this.progressBar.fillColor = 0xff0000;
        }
    }

    showLevelComplete(data = { result: 'win', percentage: 0, shotsRemaining: 0 }) {
        console.log("UIScene: Showing Level Complete screen", data);
        console.log("[UIScene.showLevelComplete] Attempting to clear existing victory container.");
        this.clearExistingUIContainer('victory');
        this.containers.victory = this.add.container(0, 0).setDepth(this.UI_DEPTH + 10);

        // Attempt to add level-specific victory background
        if (this.gameScene && this.gameScene.currentLevel) {
            const levelNum = this.gameScene.currentLevel;
            const victoryBgKey = `victoryBackground${levelNum}`;
            if (this.textures.exists(victoryBgKey)) {
                const victoryBg = this.add.image(960, 540, victoryBgKey);
                this.containers.victory.add(victoryBg); // Add to container first
            }

            // Attempt to add level-specific chibi girl on top of victory background
            const chibiVictoryKey = `chibi_girl${levelNum}`;
            if (this.textures.exists(chibiVictoryKey)) {
                // Position it similarly to how GameScene does, perhaps slightly adjusted for victory screen
                const chibiVictoryX = Math.floor(1920 * 0.7);
                const chibiVictoryY = 1080 / 2;
                const chibiImgVictory = this.add.image(chibiVictoryX, chibiVictoryY, chibiVictoryKey);
                // Scale it down a bit if it's too large for the victory screen
                this.containers.victory.add(chibiImgVictory);
            } else {
                console.warn(`[UIScene.showLevelComplete] Chibi Girl texture for victory screen not found: ${chibiVictoryKey}`);
            }
        }

        // const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.75);
        // overlay.setDepth(this.UI_DEPTH + 10); // Ensure overlay is on top of potential bg, but can be adjusted

        const titleText = data.result === 'win' ? 'Level Complete!' : 'Try Again!';
        const titleColor = data.result === 'win' ? '#00ff00' : '#ff0000';

        const title = this.add.text(960, 200, titleText, { font: '60px Arial', fill: titleColor, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
        const revealed = this.add.text(960, 300, `Revealed: ${data.percentage}%`, { font: '40px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        
        this.containers.victory.add([title, revealed]);
        
        // Star ranking logic
        let stars = 0;
        if (data.percentage >= 100) {
            stars = 3;
        } else if (data.percentage >= 90) {
            stars = 2;
        } else if (data.percentage >= 85) {
            stars = 1;
        }

        const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starsText = this.add.text(960, 350, starDisplay, { font: '50px Arial', fill: '#FFD700', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
        this.containers.victory.add(starsText);
        
        if (data.result === 'win') {
            const bonus = (data.shotsRemaining || 0) * 100;
            // Adjust Y position of bonus and score text to accommodate stars
            const bonusText = this.add.text(960, 410, `Bonus: ${bonus}`, { font: '36px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
            const totalScore = (data.percentage || 0) * 10 + bonus;
            const scoreText = this.add.text(960, 470, `Total Score: ${totalScore}`, { font: '40px Arial', fill: '#ff0', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
            this.containers.victory.add([bonusText, scoreText]);
        }

        const buttonY = data.result === 'win' ? 800 : 700; // Keep original button Y for game over
        // Adjust button Y for victory screen to accommodate stars and score
        const victoryButtonY = data.result === 'win' ? 850 : buttonY; 

        const hasNextLevel = this.gameScene && this.gameScene.levelManager && this.gameScene.levelManager.hasNextLevel();

        this._createButton(this.containers.victory, 960 - (hasNextLevel && data.result === 'win' ? 200 : 0), victoryButtonY, 'Play Again', '#1a6dd5', () => {
            if (this.gameScene) this.gameScene.scene.restart();
            this.scene.restart();
        });

        if (data.result === 'win' && hasNextLevel) {
             this._createButton(this.containers.victory, 960 + 200, victoryButtonY, 'Next Level', '#22aa22', () => {
                if (this.gameScene) this.gameScene.events.emit('goToNextLevel');
            });
        }
    }

    showGameOverScreen(data = { percentage: 0, targetPercentage: 80 }) {
        console.log("UIScene: Showing Game Over screen", data);
        this.clearExistingUIContainer('gameOver');
        this.containers.gameOver = this.add.container(0, 0).setDepth(this.UI_DEPTH + 10);

        const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.75);
        const title = this.add.text(960, 250, 'Game Over!', { font: '72px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
        const stats = this.add.text(960, 350, `Revealed: ${data.percentage}% (Target: ${data.targetPercentage}%)`, { font: '40px Arial', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        
        this.containers.gameOver.add([overlay, title, stats]);
        
        this._createButton(this.containers.gameOver, 960, 750, 'Try Again', '#d51a1a', () => {
            if (this.gameScene) this.gameScene.scene.restart();
            this.scene.restart();
        });
    }
    
    showMessage(data = { message: "Message!", duration: 2000, style: {} }) {
        const defaultStyle = { fontSize: '32px', fontFamily: 'Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 5, align: 'center' };
        const finalStyle = { ...defaultStyle, ...data.style };
        
        const messageText = this.add.text(960, 540, data.message, finalStyle)
            .setOrigin(0.5).setDepth(this.UI_DEPTH + 20);
        
        this.tweens.add({
            targets: messageText,
            alpha: { from: 1, to: 0 },
            y: '-=50',
            duration: data.duration || 2000,
            ease: 'Power2',
            onComplete: () => { messageText.destroy(); }
        });
    }

    _createButton(container, x, y, text, bgColor, callback) {
        const buttonStyle = { fontSize: '36px', fontFamily: 'Arial', fill: '#fff', padding: { x: 25, y: 15 }, backgroundColor: bgColor };
        const button = this.add.text(x, y, text, buttonStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback);
        
        button.on('pointerover', () => button.setStyle({ fill: '#ff0' }));
        button.on('pointerout', () => button.setStyle({ fill: '#fff' }));
        container.add(button);
        return button;
    }
    
    clearExistingUIContainer(containerKey) {
        if (this.containers[containerKey] && this.containers[containerKey].scene) {
            this.containers[containerKey].destroy(true);
        }
        this.containers[containerKey] = null;
    }

    resize() {
        console.log("UIScene: resize event triggered. Camera viewport will be updated by setupUICamera's event listener.");
        this.setupUICamera();
    }
    
    shutdown() {
        console.log("UIScene: Shutting down. [UIScene.shutdown] STARTING");
        for (const key in this.containers) {
            console.log(`[UIScene.shutdown] Clearing container: ${key}`);
            if (key === 'victory' && this.containers[key]) {
                console.log("[UIScene.shutdown] Destroying victory container specifically.");
            }
            this.clearExistingUIContainer(key);
        }
        if (this.bombSelectorContainer && this.bombSelectorContainer.scene) {
            console.log("[UIScene.shutdown] Destroying bombSelectorContainer.");
            this.bombSelectorContainer.destroy(true);
        }

        if (this.shotsText && this.shotsText.scene) this.shotsText.destroy();
        if (this.percentageText && this.percentageText.scene) this.percentageText.destroy();
        if (this.targetText && this.targetText.scene) this.targetText.destroy();
        if (this.scoreText && this.scoreText.scene) this.scoreText.destroy();
        if (this.progressBarBg && this.progressBarBg.scene) this.progressBarBg.destroy();
        if (this.progressBar && this.progressBar.scene) this.progressBar.destroy();
        if (this.progressText && this.progressText.scene) this.progressText.destroy();
        if (this.selectionIndicator && this.selectionIndicator.scene) this.selectionIndicator.destroy();
        
        this.bombButtons = {}; this.bombLabels = {}; this.bombCounters = {};

        if (this.gameScene && this.gameScene.events) {
            this.gameScene.events.off('updateShots', this.updateShots, this);
            this.gameScene.events.off('updatePercentage', this.updatePercentage, this);
            this.gameScene.events.off('updateScore', this.updateScore, this);
            this.gameScene.events.off('bombCountUpdated', this.updateBombCounter, this);
            this.gameScene.events.off('bombTypeSelected', this.updateBombSelectionDisplay, this);
            this.gameScene.events.off('levelComplete', this.showLevelComplete, this);
            this.gameScene.events.off('gameOver', this.showGameOverScreen, this);
            this.gameScene.events.off('refreshUI', this.refreshUIElements, this);
            this.gameScene.events.off('displayMessage', this.showMessage, this);
        }
        this.gameScene = null;
        console.log("[UIScene.shutdown] FINISHED");
    }
} 