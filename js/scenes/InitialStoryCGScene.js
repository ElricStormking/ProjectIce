class InitialStoryCGScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InitialStoryCGScene' });
        this.currentImageIndex = 0;
        this.cgImages = ['cg0-1', 'cg0-2', 'cg0-3']; // The images to show in sequence
    }

    preload() {
        // Load all the initial story CG images
        this.cgImages.forEach((key, index) => {
            if (!this.textures.exists(key)) {
                console.log(`InitialStoryCGScene: Loading CG image ${key}`);
                this.load.image(key, `assets/images/cg/${key}.png`);
            }
        });
        
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
            'Loading Story Images...',
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

    create() {
        console.log('InitialStoryCGScene: Displaying initial story sequence');
        
        // Create container to hold the current CG image and UI elements
        this.container = this.add.container(0, 0);
        
        // Show the first image
        this.showCurrentImage();
        
        // Add click handler to advance to next image or continue to StoryMapScene
        this.input.on('pointerdown', this.handleClick, this);
        this.input.keyboard.on('keydown-SPACE', this.handleClick, this);
    }
    
    showCurrentImage() {
        // Clear the previous content
        this.container.removeAll(true);
        
        const imageKey = this.cgImages[this.currentImageIndex];
        console.log(`InitialStoryCGScene: Showing image ${imageKey} (${this.currentImageIndex + 1}/${this.cgImages.length})`);
        
        // Add the CG image
        const cgImage = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, imageKey);
        
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
            `Click or press SPACEBAR to ${this.isLastImage() ? 'start game' : 'continue'}`,
            {
                font: '28px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        // Add page indicator
        const pageIndicatorText = this.add.text(
            this.cameras.main.width - 50,
            this.cameras.main.height - 30,
            `${this.currentImageIndex + 1}/${this.cgImages.length}`,
            {
                font: '20px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
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
        
        // Add all elements to the container
        this.container.add([cgImage, textBg, instructionText, pageIndicatorText]);
        
        // Make the CG image appear with a fade-in effect
        cgImage.setAlpha(0);
        this.tweens.add({
            targets: cgImage,
            alpha: 1,
            duration: 800,
            ease: 'Power2'
        });
    }
    
    isLastImage() {
        return this.currentImageIndex === this.cgImages.length - 1;
    }
    
    handleClick() {
        if (this.isLastImage()) {
            this.continueToStoryMap();
        } else {
            this.currentImageIndex++;
            this.showCurrentImage();
        }
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
        this.input.off('pointerdown', this.handleClick, this);
        this.input.keyboard.off('keydown-SPACE', this.handleClick, this);
        
        console.log("InitialStoryCGScene: Transitioning to StoryMapScene");
        
        // Add a fade-out transition
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start StoryMapScene with empty data (fresh start)
            this.scene.start('StoryMapScene');
        });
    }
} 