class CGScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CGScene' });
    }

    init(data) {
        console.log("CGScene: Initializing with data:", data);
        // Store the data for use in create
        this.levelId = data.levelId || 1;
        this.starsEarned = data.starsEarned || 0;
        this.score = data.score || 0;
        this.revealPercentage = data.revealPercentage || 0;
    }

    preload() {
        // Load the CG image for the current level if not already loaded
        const cgKey = `cg${this.levelId}`;
        if (!this.textures.exists(cgKey)) {
            console.log(`CGScene: Loading CG image for level ${this.levelId}`);
            this.load.image(cgKey, `assets/images/cg/cg${this.levelId}.png`);
            
            // Add loading progress indicator
            const progressBar = this.add.graphics();
            const progressBox = this.add.graphics();
            progressBox.fillStyle(0x222222, 0.8);
            progressBox.fillRect(
                this.cameras.main.width / 2 - 320,
                this.cameras.main.height / 2 - 30,
                640,
                60
            );
            
            const loadingText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 70,
                'Loading Story Image...',
                {
                    font: '32px Arial',
                    fill: '#ffffff'
                }
            ).setOrigin(0.5);
            
            // Update the progress bar
            this.load.on('progress', (value) => {
                progressBar.clear();
                progressBar.fillStyle(0xffffff, 1);
                progressBar.fillRect(
                    this.cameras.main.width / 2 - 310,
                    this.cameras.main.height / 2 - 20,
                    620 * value,
                    40
                );
            });
            
            // Remove the progress bar when loading is complete
            this.load.on('complete', () => {
                progressBar.destroy();
                progressBox.destroy();
                loadingText.destroy();
            });
        }
    }

    create() {
        console.log(`CGScene: Displaying CG for level ${this.levelId}`);
        
        // Add the CG image as a background
        const cgKey = `cg${this.levelId}`;
        const cgImage = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, cgKey);
        
        // Scale the image to fit the screen while maintaining aspect ratio
        this.scaleToFit(cgImage, this.cameras.main.width, this.cameras.main.height);
        
        // Add a semi-transparent overlay at the bottom for text
        const textBg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height - 70,
            this.cameras.main.width,
            140,
            0x000000,
            0.7
        );
        
        // Add instruction text
        const instructionText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 70,
            'Click or press SPACEBAR to continue',
            {
                font: '28px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        // Add a pulsing animation to the text
        this.tweens.add({
            targets: instructionText,
            alpha: { from: 1, to: 0.5 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });
        
        // Make the CG image appear with a fade-in effect
        cgImage.setAlpha(0);
        this.tweens.add({
            targets: cgImage,
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });
        
        // Add click handler to continue to StoryMapScene
        this.input.on('pointerdown', this.continueToStoryMap, this);
        this.input.keyboard.on('keydown-SPACE', this.continueToStoryMap, this);
    }
    
    // Helper method to scale an image to fit within max dimensions while maintaining aspect ratio
    scaleToFit(image, maxWidth, maxHeight) {
        const scaleX = maxWidth / image.width;
        const scaleY = maxHeight / image.height;
        const scale = Math.min(scaleX, scaleY);
        
        image.setScale(scale);
    }
    
    // Method to transition to StoryMapScene
    continueToStoryMap() {
        // Remove event listeners to prevent multiple calls
        this.input.off('pointerdown', this.continueToStoryMap, this);
        this.input.keyboard.off('keydown-SPACE', this.continueToStoryMap, this);
        
        console.log("CGScene: Transitioning to StoryMapScene");
        
        // Add a fade-out transition
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start StoryMapScene with the level completion data
            this.scene.start('StoryMapScene', {
                completedLevelId: this.levelId,
                starsEarned: this.starsEarned
            });
        });
    }
} 