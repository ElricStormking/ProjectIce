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
        console.log("BootScene: Create method called. Starting LoadingScene...");
        // Start the LoadingScene, passing a default level number or any other initial data.
        // Adjust levelNumber as needed for your game's starting point.
        this.scene.start('LoadingScene', { levelNumber: 1 }); 
    }
} 