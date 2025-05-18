/**
 * AlbumScene.js
 * Displays a gallery of unlocked HCG images from all game levels
 */
class AlbumScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AlbumScene' });
        this.playerProgress = {}; // Will be populated from StoryMapScene
        this.thumbnailButtons = []; // Array to store all thumbnail buttons
        this.currentPage = 0; // Current page of thumbnails
        this.itemsPerPage = 15; // Show 15 items per page (5 rows x 3 columns)
        this.totalPages = 2; // For 30 levels we need 2 pages
    }

    init(data) {
        console.log("AlbumScene: Init with data:", data);
        // Get player progress from StoryMapScene
        this.playerProgress = data.playerProgress || {};
    }

    createPlaceholderGraphics() {
        // Create star graphics if they don't exist, using keys 'star_full_album' and 'star_empty_album'
        if (!this.textures.exists('star_full_album')) {
            const starGraphics = this.add.graphics();
            starGraphics.fillStyle(0xffff00);
            // Manual star drawing
            const starOuterRadius = 20;
            const starInnerRadius = 10;
            const numPoints = 5;
            starGraphics.beginPath();
            for (let i = 0; i < numPoints * 2; i++) {
                const radius = (i % 2 === 0) ? starOuterRadius : starInnerRadius;
                const angle = (i * Math.PI) / numPoints - Math.PI / 2; // Adjusted angle for upright star
                const x = 20 + radius * Math.cos(angle); // Centered at 20,20 for a 40x40 texture
                const y = 20 + radius * Math.sin(angle);
                if (i === 0) {
                    starGraphics.moveTo(x, y);
                } else {
                    starGraphics.lineTo(x, y);
                }
            }
            starGraphics.closePath();
            starGraphics.fillPath();
            starGraphics.generateTexture('star_full_album', 40, 40);
            starGraphics.destroy();
        }

        if (!this.textures.exists('star_empty_album')) {
            const emptyStarGraphics = this.add.graphics();
            emptyStarGraphics.lineStyle(2, 0x888888);
            // Manual star drawing
            const starOuterRadius = 19; // Slightly smaller to account for stroke
            const starInnerRadius = 9;
            const numPoints = 5;
            emptyStarGraphics.beginPath();
            for (let i = 0; i < numPoints * 2; i++) {
                const radius = (i % 2 === 0) ? starOuterRadius : starInnerRadius;
                const angle = (i * Math.PI) / numPoints - Math.PI / 2;
                const x = 20 + radius * Math.cos(angle);
                const y = 20 + radius * Math.sin(angle);
                if (i === 0) {
                    emptyStarGraphics.moveTo(x, y);
                } else {
                    emptyStarGraphics.lineTo(x, y);
                }
            }
            emptyStarGraphics.closePath();
            emptyStarGraphics.strokePath();
            emptyStarGraphics.generateTexture('star_empty_album', 40, 40);
            emptyStarGraphics.destroy();
        }

        // Placeholder for the common back button image
        if (!this.textures.exists('back_button')) {
            const btnGraphics = this.add.graphics();
            const btnWidth = 100;
            const btnHeight = 40;
            // Background
            btnGraphics.fillStyle(0x4a6fa5); // Similar to existing buttons
            btnGraphics.fillRect(0, 0, btnWidth, btnHeight);
            // Border
            btnGraphics.lineStyle(2, 0xffffff);
            btnGraphics.strokeRect(0, 0, btnWidth, btnHeight);
            // Text or Arrow
            const backBtnText = this.add.text(btnWidth / 2, btnHeight / 2, '< Back', {
                font: '20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            const rt = this.add.renderTexture(0, 0, btnWidth, btnHeight);
            rt.draw([btnGraphics, backBtnText]);
            rt.saveTexture('back_button');

            rt.destroy();
            btnGraphics.destroy();
            backBtnText.destroy();
        }

        // Create preview thumbnails placeholders with key `hcg_thumb_${i}`
        for (let i = 1; i <= 30; i++) {
            const previewKey = `hcg_thumb_${i}`; // Correct key used by createThumbnailButton
            if (!this.textures.exists(previewKey)) {
                const graphics = this.add.graphics();
                const hue = (i * 30) % 360;
                const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.3).color;
                
                graphics.fillStyle(color);
                graphics.fillRect(0, 0, 240, 135);
                graphics.lineStyle(2, 0xffffff);
                graphics.strokeRect(0, 0, 240, 135);
                graphics.fillStyle(0xffffff, 0.1);
                graphics.fillRect(20, 20, 200, 95);
                
                const text = this.add.text(120, 67, `Level ${i}\\nPreview`, {
                    font: '20px Arial', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5);
                
                const rt = this.add.renderTexture(0, 0, 240, 135);
                rt.draw([graphics, text]); // Draw both graphics and text to the render texture
                rt.saveTexture(previewKey);
                
                rt.destroy();
                graphics.destroy();
                text.destroy(); // Destroy the temporary text object
            }

            // Create level placeholders (full-size CG images) with key `level${i}`
            const levelKey = `level${i}`; // Key for full HCG images
            if (!this.textures.exists(levelKey)) {
                const graphics = this.add.graphics();
                const hue = (i * 30) % 360;
                const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.2).color;
                
                graphics.fillStyle(color);
                graphics.fillRect(0, 0, 1920, 1080);
                graphics.lineStyle(4, 0xffffff);
                graphics.strokeRect(0, 0, 1920, 1080);
                graphics.fillStyle(0xffffff, 0.1);
                graphics.fillRect(100, 100, 1720, 880);
                
                const text = this.add.text(960, 540, `Level ${i}\\nCG Image`, {
                    font: '64px Arial', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 6
                }).setOrigin(0.5);
                
                const rt = this.add.renderTexture(0, 0, 1920, 1080);
                rt.draw([graphics, text]);
                rt.saveTexture(levelKey);
                
                rt.destroy();
                graphics.destroy();
                text.destroy();
            }
        }
    }

    preload() {
        console.log("AlbumScene: Preload");

        // Create placeholder graphics for missing assets FIRST.
        // This will generate textures for 'star_full_album', 'star_empty_album', 'hcg_thumb_i', and 'level_i' if they don't exist.
        this.createPlaceholderGraphics();
        
        // Load background and UI assets that are essential and not covered by placeholders.
        if (!this.textures.exists('album_bg')) {
            this.load.image('album_bg', 'assets/images/album/album_bg.png');
        }
        
        if (!this.textures.exists('lock_icon')) {
            this.load.image('lock_icon', 'assets/images/album/lock_icon.png');
        }

        // DO NOT attempt to load star_full_map.png, star_empty_map.png, or preview_X.png here
        // as their placeholders ('star_full_album', 'star_empty_album', 'hcg_thumb_X') are handled by createPlaceholderGraphics.
        // Also, the HCG image preloading (for hcg_level_X or hcgX) is removed from here,
        // assuming placeholders or on-demand loading in HCGScene is sufficient.
        // If HCG preloading is still desired, it should check for texture existence first or handle load errors gracefully.
    }

    create() {
        console.log("AlbumScene: Create");
        
        // Create background
        this.createBackground();
        
        // Create UI elements
        this.createUI();
        
        // Create thumbnail grid
        this.createThumbnailGrid();
        
        // Create navigation buttons
        this.createNavigationButtons();
    }

    createBackground() {
        // Set a background image or color
        if (this.textures.exists('album_bg')) {
            const bg = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'album_bg');
            bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        } else {
            // Fallback to a color
            this.cameras.main.setBackgroundColor('#111122');
        }
    }

    createUI() {
        // Add title
        const titleText = this.add.text(this.cameras.main.width / 2, 50, 'CG ALBUM', {
            font: '48px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Add subtitle
        const subtitleText = this.add.text(this.cameras.main.width / 2, 100, 'Collect stars to unlock special CG images!', {
            font: '24px Arial',
            fill: '#ffff99',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Add back button to return to story map
        this.createBackButton();
        
        // Add page indicator
        this.pageText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 40, 'Page 1/2', {
            font: '24px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    createBackButton() {
        // Position in the top-left corner with some padding
        const padding = 20;
        const x = padding + 50;
        const y = padding + 30;
        
        // Create button background
        const buttonWidth = 100;
        const buttonHeight = 40;
        const backButton = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4a6fa5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.returnToStoryMap())
            .on('pointerover', () => {
                backButton.setFillStyle(0x5588cc);
                backText.setFill('#ffffff');
            })
            .on('pointerout', () => {
                backButton.setFillStyle(0x4a6fa5);
                backText.setFill('#ffffff');
            });
            
        // Add border and make it stand out
        backButton.setStrokeStyle(2, 0xffffff);
        
        // Add text
        const backText = this.add.text(x, y, 'Back', {
            font: '22px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Set depth to ensure it's above other elements
        backButton.setDepth(10);
        backText.setDepth(11);
    }

    createThumbnailGrid() {
        // Clear any existing thumbnails
        this.thumbnailButtons.forEach(button => {
            if (button.container && button.container.scene) {
                button.container.destroy();
            }
        });
        this.thumbnailButtons = [];
        
        // Grid layout configuration
        const startX = 240;
        const startY = 200;
        const thumbWidth = 240;
        const thumbHeight = 135;
        const paddingX = 70;
        const paddingY = 50;
        const columns = 5;
        const rows = 3;
        
        // Determine which levels to show based on current page
        const startIdx = this.currentPage * this.itemsPerPage;
        const endIdx = Math.min(startIdx + this.itemsPerPage, 30);
        
        // Create thumbnails for current page
        for (let i = startIdx; i < endIdx; i++) {
            const levelId = i + 1; // Level IDs start at 1
            const col = (i - startIdx) % columns;
            const row = Math.floor((i - startIdx) / columns);
            
            const x = startX + col * (thumbWidth + paddingX);
            const y = startY + row * (thumbHeight + paddingY);
            
            this.createThumbnailButton(x, y, levelId, thumbWidth, thumbHeight);
        }
        
        // Update page text
        this.pageText.setText(`Page ${this.currentPage + 1}/${this.totalPages}`);
    }

    createThumbnailButton(x, y, levelId, width, height) {
        // Get level progress data
        const progress = this.playerProgress[levelId] || { stars: 0, unlocked: false };
        const isSpecialLevel = levelId % 5 === 0; // Levels 5, 10, 15, 20, 25, 30
        const requiredStars = isSpecialLevel ? 3 : 2;
        const isUnlocked = progress.stars >= requiredStars;
        
        // Create container for the thumbnail and its elements
        const container = this.add.container(x, y);
        
        // Create background for the thumbnail
        const bg = this.add.rectangle(0, 0, width, height, 0x000000)
            .setStrokeStyle(3, isUnlocked ? 0x66aaff : 0x555555)
            .setOrigin(0.5);
        container.add(bg);
        
        // Use the correct image or placeholder
        const thumbKey = `hcg_thumb_${levelId}`;
        let thumb;
        
        if (isUnlocked && this.textures.exists(thumbKey)) {
            // Show unlocked thumbnail
            thumb = this.add.image(0, 0, thumbKey)
                .setDisplaySize(width - 10, height - 10)
                .setOrigin(0.5);
        } else {
            // Show locked placeholder
            thumb = this.add.rectangle(0, 0, width - 10, height - 10, 0x333333)
                .setOrigin(0.5);
                
            // Add lock icon if available
            if (this.textures.exists('lock_icon')) {
                const lockIcon = this.add.image(0, 0, 'lock_icon')
                    .setDisplaySize(40, 40)
                    .setOrigin(0.5);
                container.add(lockIcon);
            }
            
            // Show required stars text
            const reqText = this.add.text(0, 35, `Requires ${requiredStars} ★`, {
                font: '18px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            container.add(reqText);
        }
        container.add(thumb);
        
        // Add level number
        const levelText = this.add.text(-width/2 + 10, -height/2 + 10, `Level ${levelId}`, {
            font: '16px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0);
        container.add(levelText);
        
        // Add star display
        this.addStarDisplay(container, progress.stars, width/2 - 15, height/2 - 15);
        
        // Make the thumbnail interactive
        bg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (isUnlocked) {
                    this.viewFullImage(levelId);
                } else {
                    this.showLockedMessage(levelId, requiredStars);
                }
            })
            .on('pointerover', () => {
                bg.setStrokeStyle(4, isUnlocked ? 0x00ffff : 0x888888);
                bg.setFillStyle(isUnlocked ? 0x333355 : 0x222222);
            })
            .on('pointerout', () => {
                bg.setStrokeStyle(3, isUnlocked ? 0x66aaff : 0x555555);
                bg.setFillStyle(0x000000);
            });
            
        // Store reference to this thumbnail button
        this.thumbnailButtons.push({
            levelId,
            container,
            isUnlocked
        });
    }

    addStarDisplay(container, stars, x, y) {
        const starSize = 20;
        const starSpacing = 22;
        
        for (let i = 0; i < 3; i++) {
            const starX = x - (starSpacing * (2-i));
            const starY = y;
            
            const starKey = (i < stars) ? 'star_full_album' : 'star_empty_album';
            if (this.textures.exists(starKey)) {
                const star = this.add.image(starX, starY, starKey)
                    .setDisplaySize(starSize, starSize)
                    .setOrigin(0.5);
                container.add(star);
            } else {
                // Fallback to text stars if images aren't available
                const starText = this.add.text(starX, starY, (i < stars) ? '★' : '☆', {
                    font: '18px Arial',
                    fill: (i < stars) ? '#ffff00' : '#aaaaaa'
                }).setOrigin(0.5);
                container.add(starText);
            }
        }
    }

    createNavigationButtons() {
        const btnY = this.cameras.main.height - 80;
        
        // Prev page button
        this.prevButton = this.add.container(300, btnY);
        const prevBg = this.add.rectangle(0, 0, 100, 40, 0x4a6fa5)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.prevPage())
            .on('pointerover', () => prevBg.setFillStyle(0x5588cc))
            .on('pointerout', () => prevBg.setFillStyle(0x4a6fa5));
        const prevText = this.add.text(0, 0, '< Prev', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.prevButton.add([prevBg, prevText]);
        
        // Next page button
        this.nextButton = this.add.container(this.cameras.main.width - 300, btnY);
        const nextBg = this.add.rectangle(0, 0, 100, 40, 0x4a6fa5)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.nextPage())
            .on('pointerover', () => nextBg.setFillStyle(0x5588cc))
            .on('pointerout', () => nextBg.setFillStyle(0x4a6fa5));
        const nextText = this.add.text(0, 0, 'Next >', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.nextButton.add([nextBg, nextText]);
        
        // Update navigation button states
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        // Disable prev button on first page
        const prevBg = this.prevButton.getAt(0);
        if (this.currentPage === 0) {
            prevBg.setFillStyle(0x555555);
            prevBg.disableInteractive();
        } else {
            prevBg.setFillStyle(0x4a6fa5);
            prevBg.setInteractive({ useHandCursor: true });
        }
        
        // Disable next button on last page
        const nextBg = this.nextButton.getAt(0);
        if (this.currentPage === this.totalPages - 1) {
            nextBg.setFillStyle(0x555555);
            nextBg.disableInteractive();
        } else {
            nextBg.setFillStyle(0x4a6fa5);
            nextBg.setInteractive({ useHandCursor: true });
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.createThumbnailGrid();
            this.updateNavigationButtons();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.createThumbnailGrid();
            this.updateNavigationButtons();
        }
    }

    viewFullImage(levelId) {
        console.log(`Viewing full image for level ${levelId}`);
        
        // Open the HCGScene to view the full image
        this.scene.sleep();
        this.scene.run('HCGScene', {
            levelId: levelId,
            fromAlbum: true,
            returnSceneKey: 'AlbumScene'
        });
    }

    showLockedMessage(levelId, requiredStars) {
        // Get current stars for this level
        const currentStars = this.playerProgress[levelId] ? this.playerProgress[levelId].stars : 0;
        
        // Create a message popup
        const message = `Level ${levelId} CG is locked!\nYou have ${currentStars}/3 stars.\nEarn ${requiredStars} stars to unlock.`;
        
        // Create darkened background
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setInteractive()
            .setDepth(100);
            
        // Create message box
        const messageBox = this.add.rectangle(this.cameras.main.width/2, this.cameras.main.height/2, 400, 200, 0x333366)
            .setStrokeStyle(4, 0x6666aa)
            .setDepth(101);
            
        // Add message text
        const messageText = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2 - 30, message, {
            font: '24px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5)
          .setDepth(102);
          
        // Add OK button
        const okButton = this.add.rectangle(this.cameras.main.width/2, this.cameras.main.height/2 + 60, 100, 40, 0x4a6fa5)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setDepth(102)
            .on('pointerdown', () => {
                overlay.destroy();
                messageBox.destroy();
                messageText.destroy();
                okButton.destroy();
                okText.destroy();
            });
            
        const okText = this.add.text(this.cameras.main.width/2, this.cameras.main.height/2 + 60, 'OK', {
            font: '22px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5)
          .setDepth(103);
          
        // Also close on clicking the overlay
        overlay.on('pointerdown', () => {
            overlay.destroy();
            messageBox.destroy();
            messageText.destroy();
            okButton.destroy();
            okText.destroy();
        });
    }

    returnToStoryMap() {
        console.log('AlbumScene: Returning to Story Map');
        
        // Add a fade-out transition
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop this scene
            this.scene.stop();
            
            // Wake up the StoryMapScene (which was put to sleep)
            this.scene.wake('StoryMapScene');
            
            // Add a fade-in effect to StoryMapScene
            const storyMapScene = this.scene.get('StoryMapScene');
            if (storyMapScene && storyMapScene.cameras) {
                storyMapScene.cameras.main.fadeIn(500);
            }
        });
    }

    // Create a procedural thumbnail when image is not found
    createDefaultThumbnail(levelId) {
        const thumbnailKey = `hcg_thumb_${levelId}`; // This matches the placeholder key now
        
        // Create a temporary canvas
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 135;
        const ctx = canvas.getContext('2d');
        
        // Fill with a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 240, 135);
        gradient.addColorStop(0, `hsl(${(levelId * 12) % 360}, 70%, 40%)`);
        gradient.addColorStop(1, `hsl(${(levelId * 12 + 40) % 360}, 70%, 20%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 240, 135);
        
        // Add level number text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Level ${levelId}`, 120, 67);
        
        // Add the thumbnail to the texture manager
        // Check if texture already exists to prevent warnings if createPlaceholderGraphics already made it.
        if (!this.textures.exists(thumbnailKey)) {
            this.textures.addCanvas(thumbnailKey, canvas);
        }
    }
} 