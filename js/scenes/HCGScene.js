class HCGScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HCGScene' });
        this.returnSceneKey = 'UIScene'; // Default return scene
    }

    init(data) {
        console.log("[HCGScene] init:", data);
        this.levelId = data.levelId || 1;
        this.starsEarned = data.starsEarned || 0;
        this.victoryData = data.victoryData || null;
        
        // Store the return scene - if coming from Album or victory screen
        this.returnSceneKey = data.returnSceneKey || 'UIScene';
        this.fromAlbum = data.fromAlbum || false;
        
        // If we're coming from Album, we don't need the UIScene reference
        this.uiSceneKey = !this.fromAlbum ? (data.uiSceneKey || 'UIScene') : null;
    }

    preload() {
        console.log(`[HCGScene] preload for level ${this.levelId}`);
        
        // Load the main HCG image if not already loaded
        const hcgKey = `hcg_level_${this.levelId}`;
        if (!this.textures.exists(hcgKey)) {
            // Try to load from 'assets/images/hcg' directory
            this.load.image(hcgKey, `assets/images/hcg/hcg${this.levelId}.png`);
            
            // If the above path doesn't work, try the legacy path format
            this.load.on('filecomplete', (key) => {
                if (key === hcgKey) {
                    console.log(`[HCGScene] Successfully loaded ${hcgKey}`);
                }
            });
            
            this.load.on('loaderror', (file) => {
                if (file.key === hcgKey) {
                    console.log(`[HCGScene] Error loading ${hcgKey}, trying alternate path`);
                    // Try an alternate path with legacy naming
                    this.load.image(hcgKey, `assets/images/hcg/hcg${this.levelId}.png`);
                }
            });
        }
        
        // Load back button image
        if (!this.textures.exists('back_button')) {
            this.load.image('back_button', 'assets/images/back_button.png');
        }
        
        // Load extra star images if we're showing from victory
        if (!this.fromAlbum && this.starsEarned > 0) {
            if (!this.textures.exists('star_full_hcg')) {
                this.load.image('star_full_hcg', 'assets/images/star_full_map.png');
            }
        }
    }

    create() {
        console.log(`[HCGScene] create for level ${this.levelId}`);
        
        // Set black background
        this.cameras.main.setBackgroundColor('#000000');
        
        // Create centered HCG image
        const hcgKey = `hcg_level_${this.levelId}`;
        const legacyHcgKey = `hcg${this.levelId}`; // Try the legacy key format as fallback
        
        try {
            let hcgImage;
            
            if (this.textures.exists(hcgKey)) {
                console.log(`[HCGScene] Using ${hcgKey} for HCG image`);
                hcgImage = this.add.image(this.cameras.main.width/2, this.cameras.main.height/2, hcgKey);
            } 
            else if (this.textures.exists(legacyHcgKey)) {
                console.log(`[HCGScene] Using legacy key ${legacyHcgKey} for HCG image`);
                hcgImage = this.add.image(this.cameras.main.width/2, this.cameras.main.height/2, legacyHcgKey);
            }
            else {
                // Show error message if image couldn't be loaded
                throw new Error(`Neither ${hcgKey} nor ${legacyHcgKey} textures exist`);
            }
            
            // Scale the image to fit within the screen while maintaining aspect ratio
            this.scaleToFit(hcgImage, this.cameras.main.width * 0.9, this.cameras.main.height * 0.9);
        } catch (err) {
            console.error(`Error loading HCG image for level ${this.levelId}:`, err);
            // Show error message
            this.add.text(this.cameras.main.width/2, this.cameras.main.height/2, 
                `Error loading CG image: ${err.message}`, {
                font: '24px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        }
        
        // Add back button
        this.createBackButton();
        
        // If this is from victory screen (not album), add congratulatory text and stars
        if (!this.fromAlbum && this.starsEarned > 0) {
            this.showCongratulationsMessage();
        }
        
        // Add level info
        this.add.text(this.cameras.main.width/2, 40, `Level ${this.levelId} CG`, {
            font: '24px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    scaleToFit(image, maxWidth, maxHeight) {
        const width = image.width;
        const height = image.height;
        
        let newWidth = width;
        let newHeight = height;
        
        if (width > maxWidth || height > maxHeight) {
            const ratioWidth = maxWidth / width;
            const ratioHeight = maxHeight / height;
            const ratio = Math.min(ratioWidth, ratioHeight);
            
            newWidth = width * ratio;
            newHeight = height * ratio;
        }
        
        image.setDisplaySize(newWidth, newHeight);
    }

    createBackButton() {
        // Create back button in the top-left corner
        const backButton = this.add.rectangle(60, 40, 100, 40, 0x333333, 0.8)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.returnToPreviousScene())
            .on('pointerover', () => {
                backButton.setFillStyle(0x555555, 0.8);
                backText.setFill('#ffffff');
            })
            .on('pointerout', () => {
                backButton.setFillStyle(0x333333, 0.8);
                backText.setFill('#dddddd');
            });
            
        const backText = this.add.text(60, 40, 'Back', {
            font: '20px Arial',
            fill: '#dddddd'
        }).setOrigin(0.5);
    }

    showCongratulationsMessage() {
        // Add congratulation text
        this.add.text(this.cameras.main.width/2, this.cameras.main.height - 90, 
            `Congratulations! You earned ${this.starsEarned} stars!`, {
            font: '28px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Add stars display
        const starSpacing = 40;
        const startX = this.cameras.main.width/2 - ((this.starsEarned - 1) * starSpacing / 2);
        
        for (let i = 0; i < this.starsEarned; i++) {
            const star = this.add.image(startX + (i * starSpacing), this.cameras.main.height - 40, 'star_full_hcg')
                .setDisplaySize(30, 30);
                
            // Add a tween to make stars pulse
            this.tweens.add({
                targets: star,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 200 // Stagger the animations
            });
        }
    }

    returnToPreviousScene() {
        console.log(`[HCGScene] returning to ${this.returnSceneKey}`);
        
        // Fade out 
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop this scene
            this.scene.stop();
            
            if (this.fromAlbum) {
                // If from album, return to album
                this.scene.wake('AlbumScene');
            } else {
                // If from victory screen, return to the UI scene
                if (this.uiSceneKey) {
                    this.scene.wake(this.uiSceneKey);
                } else {
                    // Fallback if no UI scene specified - go to StoryMapScene
                    this.scene.start('StoryMapScene');
                }
            }
        });
    }
} 