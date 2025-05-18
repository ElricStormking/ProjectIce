class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        this.musicEnabled = true;
        this.soundEnabled = true;
        this.hasPlayerInteracted = false; // Track if player has interacted
    }

    init() {
        // Reset interaction state when scene starts/restarts
        console.log('TitleScene: Initializing and resetting interaction state');
        this.hasPlayerInteracted = false;
    }

    preload() {
        // Load title screen assets
        this.load.image('title_background', 'assets/images/title_bg.png');
        // Load background music
        this.load.audio('title_music', 'assets/audio/title_bg.mp3');
        console.log('TitleScene: Preload');
    }

    create() {
        console.log('TitleScene: Create');
        
        // Add background image instead of a solid color
        const background = this.add.image(this.cameras.main.width/2, this.cameras.main.height/2, 'title_background');
        background.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        background.setDepth(0);

        // Load audio preferences
        this.loadAudioPreferences();
        
        // Clean up any existing containers before creating new ones
        if (this.startPromptContainer && this.startPromptContainer.scene) {
            this.startPromptContainer.destroy(true);
            this.startPromptContainer = null;
        }
        
        // Create the initial "start" prompt
        this.createStartPrompt();
        
        // Don't play music or show menu yet - wait for interaction
        
        // Title Text with updated game name
        const titleText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 200, 'Beauty Ice Breaker',
            {
                font: '64px Arial', 
                fill: '#ffffff', 
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Add a subtle glow effect to the title
        const titleGlow = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 200,
            titleText.width + 30,
            titleText.height + 20,
            0x0088ff,
            0.3
        );
        titleGlow.setDepth(0.5);
        titleText.setDepth(1);

        // Add team credit text below the title
        const creditText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 120, 
            'By eHooray Team',
            {
                font: '28px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }
        ).setOrigin(0.5);
        creditText.setDepth(1);

        // Create buttons but keep them hidden initially - will be shown after interaction
        this.createButtons();
        this.hideButtons();

        // Initialize hidden UI elements (confirmation dialog, options panel)
        this.createConfirmationDialog();
        this.createOptionsPanel();

        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
    
    // New method to create the start prompt
    createStartPrompt() {
        // Create a container for the prompt elements
        this.startPromptContainer = this.add.container(0, 0);
        
        // Semi-transparent background overlay
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.5
        );
        
        // Create prompt text
        const promptText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Click or press SPACEBAR to start',
            {
                font: '32px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Add a pulsing animation to the text
        this.tweens.add({
            targets: promptText,
            alpha: { from: 1, to: 0.5 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
        
        // Add elements to the container
        this.startPromptContainer.add([overlay, promptText]);
        this.startPromptContainer.setDepth(100); // Above everything else
        
        // Remove any existing event listeners first
        this.input.off('pointerdown', this.handlePlayerInteraction, this);
        this.input.keyboard.off('keydown-SPACE', this.handlePlayerInteraction, this);
        
        // Add input listeners for the entire scene
        this.input.on('pointerdown', this.handlePlayerInteraction, this);
        this.input.keyboard.on('keydown-SPACE', this.handlePlayerInteraction, this);
        
        console.log('TitleScene: Start prompt created, interaction handlers attached');
    }
    
    // Method to handle player's first interaction
    handlePlayerInteraction() {
        // Only proceed if this is the first interaction
        if (this.hasPlayerInteracted) return;
        
        console.log('TitleScene: Player has interacted, starting music and showing menu');
        this.hasPlayerInteracted = true;
        
        // Remove event listeners to prevent multiple calls
        this.input.off('pointerdown', this.handlePlayerInteraction, this);
        this.input.keyboard.off('keydown-SPACE', this.handlePlayerInteraction, this);
        
        // Start the music
        this.playBackgroundMusic();
        
        // Fade out and remove the prompt container
        this.tweens.add({
            targets: this.startPromptContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.startPromptContainer.destroy();
                
                // Show the menu buttons
                this.showButtons();
            }
        });
    }
    
    // Method to hide all menu buttons
    hideButtons() {
        // Get all buttons from the scene
        const buttons = this.getMenuButtons();
        
        // Hide all buttons
        buttons.forEach(button => {
            if (button) {
                button.setVisible(false);
                button.setActive(false);
            }
        });
    }
    
    // Method to show all menu buttons
    showButtons() {
        // Get all buttons from the scene
        const buttons = this.getMenuButtons();
        
        // Show buttons with a fade-in effect
        buttons.forEach((button, index) => {
            if (button) {
                button.setVisible(true);
                button.setActive(true);
                button.setAlpha(0);
                
                // Add staggered fade-in animation
                this.tweens.add({
                    targets: button,
                    alpha: 1,
                    duration: 300,
                    delay: index * 100, // Stagger the fade-in
                    ease: 'Power2'
                });
            }
        });
    }
    
    // Helper method to get all menu button objects
    getMenuButtons() {
        // Return all necessary button objects
        if (!this.allButtons) {
            this.allButtons = [];
            
            // Find all button objects in the scene
            this.children.each(child => {
                // Check if it's a button (has the right properties)
                if (child.type === 'Rectangle' && child.input && child.input.enabled) {
                    this.allButtons.push(child);
                    
                    // Also find and add associated button text
                    this.children.each(textChild => {
                        if (textChild.type === 'Text' && 
                            Math.abs(textChild.x - child.x) < 5 && 
                            Math.abs(textChild.y - child.y) < 5) {
                            this.allButtons.push(textChild);
                        }
                    });
                }
            });
        }
        
        return this.allButtons;
    }
    
    createButtons() {
        const buttonStyle = {
            font: '32px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        };
        
        // Position buttons at the bottom left with padding
        const leftPadding = 50;
        const bottomPadding = 50;
        const buttonX = leftPadding + 110; // Center of button, accounting for width
        const spacing = 70; // Vertical spacing between buttons
        
        // Calculate Y positions starting from bottom up
        const baseY = this.cameras.main.height - bottomPadding;
        
        // Options Button (bottom)
        const optionsButton = this.createButton(
            buttonX, 
            baseY, 
            'Options', 
            buttonStyle, 
            () => this.toggleOptionsPanel()
        );
        
        // New Game Button (middle)
        const newGameButton = this.createButton(
            buttonX, 
            baseY - spacing, 
            'New Game', 
            buttonStyle, 
            () => this.showConfirmationDialog()
        );
        
        // Continue Button (top)
        const continueButton = this.createButton(
            buttonX, 
            baseY - (spacing * 2), 
            'Continue', 
            buttonStyle, 
            () => this.handleContinueGame()
        );
    }
    
    createButton(x, y, text, style, callback) {
        // Create button background
        const buttonWidth = 220;
        const buttonHeight = 60;
        const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4a6fa5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', callback)
            .on('pointerover', () => {
                button.setFillStyle(0x5588cc);
                buttonText.setFill('#ffffff');
            })
            .on('pointerout', () => {
                button.setFillStyle(0x4a6fa5);
                buttonText.setFill('#ffffff');
            });
            
        // Add border
        button.setStrokeStyle(2, 0xffffff);
        
        // Add text
        const buttonText = this.add.text(x, y, text, style).setOrigin(0.5);
        
        return { button, buttonText };
    }
    
    createConfirmationDialog() {
        // Create confirmation dialog (initially hidden)
        this.confirmationDialog = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
        this.confirmationDialog.setVisible(false);
        
        // Background panel
        const panel = this.add.rectangle(0, 0, 500, 250, 0x000000, 0.8);
        panel.setStrokeStyle(2, 0xffffff);
        
        // Confirmation text
        const confirmText = this.add.text(0, -70, 'Reset all progress?', {
            font: '32px Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        const warningText = this.add.text(0, -20, 'All levels will be locked except level 1', {
            font: '24px Arial',
            fill: '#ff9999',
            align: 'center'
        }).setOrigin(0.5);
        
        // Yes button
        const yesButton = this.createButton(-100, 60, 'Yes', {
            font: '28px Arial',
            fill: '#ffffff'
        }, () => {
            this.resetAllProgress();
            this.confirmationDialog.setVisible(false);
        });
        
        // No button
        const noButton = this.createButton(100, 60, 'No', {
            font: '28px Arial',
            fill: '#ffffff'
        }, () => {
            this.confirmationDialog.setVisible(false);
        });
        
        // Add all elements to container
        this.confirmationDialog.add([panel, confirmText, warningText, yesButton.button, yesButton.buttonText, noButton.button, noButton.buttonText]);
    }
    
    createOptionsPanel() {
        // Create options panel (initially hidden)
        this.optionsPanel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
        this.optionsPanel.setVisible(false);
        
        // Background panel
        const panel = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.8);
        panel.setStrokeStyle(2, 0xffffff);
        
        // Title
        const title = this.add.text(0, -120, 'Options', {
            font: '36px Arial',
            fill: '#ffffff',
        }).setOrigin(0.5);
        
        // Music option
        const musicText = this.add.text(-150, -50, 'Music', {
            font: '28px Arial',
            fill: '#ffffff',
        }).setOrigin(0, 0.5);
        
        // Store music toggle callback for reference
        this.musicToggleCallback = (enabled) => {
            this.musicEnabled = enabled;
            this.saveAudioPreferences();
            console.log('Music enabled:', enabled);
        };
        
        // Music toggle
        this.musicToggle = this.createToggle(100, -50, this.musicEnabled, this.musicToggleCallback);
        
        // Sound option
        const soundText = this.add.text(-150, 20, 'Sound', {
            font: '28px Arial',
            fill: '#ffffff',
        }).setOrigin(0, 0.5);
        
        // Sound toggle
        this.soundToggle = this.createToggle(100, 20, this.soundEnabled, (enabled) => {
            this.soundEnabled = enabled;
            this.saveAudioPreferences();
            console.log('Sound enabled:', enabled);
        });
        
        // Close button
        const closeButton = this.createButton(0, 100, 'Close', {
            font: '28px Arial',
            fill: '#ffffff'
        }, () => {
            this.optionsPanel.setVisible(false);
        });
        
        // Add all elements to container
        this.optionsPanel.add([
            panel, 
            title, 
            musicText, 
            this.musicToggle.background, 
            this.musicToggle.knob, 
            soundText, 
            this.soundToggle.background, 
            this.soundToggle.knob,
            closeButton.button,
            closeButton.buttonText
        ]);
    }
    
    createToggle(x, y, initialState, callback) {
        const width = 80;
        const height = 40;
        
        // Background
        const background = this.add.rectangle(x, y, width, height, initialState ? 0x4a9f4a : 0x666666)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const newState = !initialState;
                background.setFillStyle(newState ? 0x4a9f4a : 0x666666);
                knob.x = x + (newState ? width/4 : -width/4);
                initialState = newState;
                callback(newState);
                
                // If this is the music toggle, update music playback
                if (callback === this.musicToggleCallback) {
                    if (newState) {
                        this.playBackgroundMusic();
                    } else {
                        this.stopBackgroundMusic();
                    }
                }
            });
        background.setStrokeStyle(2, 0xdddddd);
        
        // Knob
        const knob = this.add.circle(x + (initialState ? width/4 : -width/4), y, height/2 - 4, 0xffffff);
        
        return { background, knob };
    }
    
    handleContinueGame() {
        console.log('TitleScene: Continue game. Starting StoryMapScene.');
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop music before scene transition
            this.stopBackgroundMusic();
            this.scene.start('StoryMapScene');
        });
    }
    
    showConfirmationDialog() {
        this.confirmationDialog.setVisible(true);
    }
    
    toggleOptionsPanel() {
        this.optionsPanel.setVisible(!this.optionsPanel.visible);
    }
    
    resetAllProgress() {
        // Clear all progress from localStorage
        localStorage.removeItem('phaserQixPlayerProgress');
        
        // Initialize with only level 1 unlocked
        const initialProgress = { 1: { stars: 0, unlocked: true } };
        localStorage.setItem('phaserQixPlayerProgress', JSON.stringify(initialProgress));
        
        console.log('TitleScene: Progress reset. Starting new game with initial story.');
        
        // Start InitialStoryCGScene for the intro story sequence first
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop music before scene transition
            this.stopBackgroundMusic();
            this.scene.start('InitialStoryCGScene');
        });
    }
    
    saveAudioPreferences() {
        const audioPrefs = {
            musicEnabled: this.musicEnabled,
            soundEnabled: this.soundEnabled
        };
        localStorage.setItem('phaserQixAudioPrefs', JSON.stringify(audioPrefs));
    }
    
    loadAudioPreferences() {
        const savedPrefs = localStorage.getItem('phaserQixAudioPrefs');
        if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            this.musicEnabled = prefs.musicEnabled !== undefined ? prefs.musicEnabled : true;
            this.soundEnabled = prefs.soundEnabled !== undefined ? prefs.soundEnabled : true;
        }
    }
    
    // Add method to play background music
    playBackgroundMusic() {
        // Check if music is enabled in user preferences
        if (!this.musicEnabled) {
            console.log('TitleScene: Music is disabled, not playing title music');
            return;
        }
        
        // Stop any existing music first
        this.stopBackgroundMusic();
        
        console.log('TitleScene: Playing title background music');
        
        // Check if the audio file is loaded
        if (!this.sound || !this.cache.audio.exists('title_music')) {
            console.error('TitleScene: title_music audio file not found!');
            return;
        }
        
        // Create and play the background music
        this.bgMusic = this.sound.add('title_music', {
            volume: 0.45,
            loop: true
        });
        
        this.bgMusic.play();
    }
    
    // Add method to stop background music
    stopBackgroundMusic() {
        if (this.bgMusic) {
            console.log('TitleScene: Stopping title background music');
            this.bgMusic.stop();
            this.bgMusic = null;
        }
    }
    
    // Add shutdown method to clean up resources
    shutdown() {
        console.log('TitleScene: Shutting down');
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Remove event listeners
        this.input.off('pointerdown', this.handlePlayerInteraction, this);
        this.input.keyboard.off('keydown-SPACE', this.handlePlayerInteraction, this);
        
        // Clean up any tweens
        this.tweens.killAll();
        
        // Clean up containers
        if (this.startPromptContainer && this.startPromptContainer.scene) {
            this.startPromptContainer.destroy(true);
            this.startPromptContainer = null;
        }
        
        if (this.confirmationDialog && this.confirmationDialog.scene) {
            this.confirmationDialog.destroy(true);
            this.confirmationDialog = null;
        }
        
        if (this.optionsPanel && this.optionsPanel.scene) {
            this.optionsPanel.destroy(true);
            this.optionsPanel = null;
        }
        
        console.log('TitleScene: Shutdown complete');
    }
} 