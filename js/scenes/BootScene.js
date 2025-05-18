class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // BootScene is now minimal. It will quickly start the LoadingScene.
        // If LoadingScene needed any assets for its OWN display (e.g., a special font),
        // those would be loaded here. For now, it seems LoadingScene uses system fonts
        // and generates its own graphics for the progress bar.
        console.log("BootScene: Preloading minimal assets (if any) and preparing to start LoadingScene.");
    }

    create() {
        console.log("BootScene: Create method called. Starting TitleScene...");

        // Orientation check
        this.checkOrientation();
        this.scale.on('orientationchange', this.checkOrientation, this);

        this.scene.start('TitleScene');
    }

    checkOrientation = (orientation) => {
        if (orientation === undefined) {
            // Check initial orientation if not provided by event
            orientation = this.scale.orientation;
        }

        const isMobile = !this.game.device.os.desktop;
        const isPortrait = orientation === Phaser.Scale.PORTRAIT;

        if (isMobile && isPortrait) {
            this.showOrientationMessage(true);
            if (this.scene.isPaused('TitleScene')) return; // Don't try to pause if already paused
            // Pause the next scene if it's already started or about to start
            // This is a bit tricky as TitleScene starts immediately.
            // We might need to handle this more robustly in TitleScene itself
            // or delay its start. For now, let's assume this message is primary.
        } else {
            this.showOrientationMessage(false);
            // If TitleScene was paused by us, resume it
            // This requires a flag or checking pause state specifically due to this.
        }
    }

    showOrientationMessage(show) {
        let messageElement = document.getElementById('orientationMessage');
        if (show) {
            if (!messageElement) {
                messageElement = document.createElement('div');
                messageElement.id = 'orientationMessage';
                messageElement.innerHTML = '<h1>Please rotate your device to landscape mode to play.</h1>';
                messageElement.style.position = 'fixed';
                messageElement.style.left = '0';
                messageElement.style.top = '0';
                messageElement.style.width = '100%';
                messageElement.style.height = '100%';
                messageElement.style.backgroundColor = 'rgba(0,0,0,0.95)';
                messageElement.style.color = 'white';
                messageElement.style.display = 'flex';
                messageElement.style.justifyContent = 'center';
                messageElement.style.alignItems = 'center';
                messageElement.style.textAlign = 'center';
                messageElement.style.zIndex = '9999'; // Ensure it's on top
                document.body.appendChild(messageElement);
            }
            messageElement.style.display = 'flex';
            // Attempt to pause the game - this is more of a conceptual placement
            // Actual pausing might need to be handled in the active scene or globally
            // if (this.game.scene.getScenes(true).length > 0) {
            //     this.game.scene.getScenes(true).forEach(scene => scene.scene.pause());
            // }
        } else {
            if (messageElement) {
                messageElement.style.display = 'none';
            }
            // Attempt to resume the game
            // if (this.game.scene.getScenes(false).some(s => s.scene.isPaused())) {
            //    this.game.scene.getScenes(false).forEach(scene => {
            //        if(scene.scene.isPaused()) scene.scene.resume();
            //    });
            // }
        }
    }
} 