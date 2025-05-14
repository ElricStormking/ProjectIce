// AudioManager.js - Handles all game audio and music
class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.bgMusic = null;
        this.victoryMusic = null;
        this.soundsEnabled = true;
        this.soundCache = {};
        this.isInitialized = false;
        
        // Check if the sound system is available
        this.hasAudio = this.checkAudioAvailability();
        
        // Audio state
        this.musicEnabled = true;
        this.masterVolume = 0.8;
        
        // Voice congratulation messages - get from scene if available
        this.voiceMessages = this.scene.voiceMessages || [
            "fantastic",
            "great_aim",
            "marvelous",
            "superb",
            "amazing",
            "wonderful",
            "nice_shot",
            "incredible"
        ];
        
        // Keep track of the text for animation
        this.congratulationText = null;
        
        console.log("AudioManager constructor called");
    }
    
    // Check if audio is available in the current environment
    checkAudioAvailability() {
        try {
            return !!(this.scene.sound && this.scene.sound.context);
        } catch (error) {
            console.error("Error checking audio availability:", error);
            return false;
        }
    }
    
    // Initialize the audio system
    initialize() {
        try {
            console.log("Initializing audio manager");
            
            if (!this.hasAudio) {
                console.error("Sound system not available, creating dummy audio manager");
                this.createDummyMethods(); // Call this if no audio
                this.isInitialized = true; // Mark as initialized even with dummies
                return false; // Indicate partial success/failure
            }
            
            // Always set up methods. If context is suspended, displayClickPrompt will handle resumption.
            this.setupAudioMethods();
            this.isInitialized = true;

            // Check audio context state AFTER setting up methods
            if (this.scene.sound.context.state === 'suspended') {
                console.log("Audio context suspended - waiting for user interaction to play pending sounds.");
                this.displayClickPrompt(); 
                // Do not return false here, as methods are set up. Music will play once context resumes.
            } else {
                // If context is not suspended, attempt to play music after a delay
                console.log("Setting up delayed call for background music (context active)");
                const self = this; // Use self for clarity in the timeout
                this.scene.time.delayedCall(1500, function() {
                    console.log("Delayed call triggered - playing background music (context active)");
                    self.playBackgroundMusic(); // Use self
                });
            }
            
            return true;
        } catch (error) {
            console.error("Error initializing audio:", error);
            this.createDummyMethods(); // Fallback to dummy methods on any unexpected error
            this.isInitialized = true;
            return false;
        }
    }
    
    // Display a message prompting user to click for audio
    displayClickPrompt() {
        // Create a text message
        const clickMessage = this.scene.add.text(
            this.scene.cameras.main.centerX, 
            100, 
            "Click anywhere to enable audio", 
            {
                font: '24px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        clickMessage.setDepth(1000); // Very high depth
        
        // Make the message blink to attract attention
        this.scene.tweens.add({
            targets: clickMessage,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Set up one-time event listener for user interaction
        const resumeAudio = () => {
            this.scene.sound.context.resume().then(() => {
                console.log("Audio context resumed successfully by user interaction");
                if (clickMessage && clickMessage.scene) clickMessage.destroy();
                
                // Methods are already set up. Now that context is resumed, try playing music.
                // This ensures music plays if it was queued due to suspended context.
                console.log("Attempting to play background music after context resumed by user.");
                this.playBackgroundMusic(); 
            }).catch(err => {
                console.error("Failed to resume audio context after user interaction:", err);
                // Dummies should already be set up if initial check failed, 
                // but if we reach here due to a resume error, ensure they are.
                if(!this.isInitialized || !this.playBackgroundMusic) {
                    this.createDummyMethods();
                    this.isInitialized = true;
                }
            });
        };
        
        // Listen for interaction events
        this.scene.input.once('pointerdown', resumeAudio);
        this.scene.input.keyboard.once('keydown', resumeAudio);
    }
    
    // Set up real audio methods
    setupAudioMethods() {
        // Play background music for the current level
        this.playBackgroundMusic = () => {
            try {
                console.log("Attempting to play background music...");
                
                if (!this.musicEnabled) {
                    console.log("Music is disabled");
                    return;
                }
                
                // Stop any existing background music
                if (this.bgMusic) {
                    this.bgMusic.stop();
                }
                
                // Check if the audio system is available
                if (!this.scene.sound || !this.scene.sound.add) {
                    console.error("Sound system not available");
                    return;
                }
                
                // Try level-specific music first (e.g., bgMusic_level2)
                const currentLevel = this.scene.currentLevel || 1;
                const levelMusicKey = `bgMusic_level${currentLevel}`;
                let musicKeyToPlay = null; 
                
                // First check if the level-specific music exists in cache
                if (this.scene.cache.audio.exists(levelMusicKey)) {
                    console.log(`Found level-specific music: ${levelMusicKey}`);
                    musicKeyToPlay = levelMusicKey;
                } else {
                    console.log(`No level-specific music found for level ${currentLevel}, trying default bgMusic`);
                    if (this.scene.cache.audio.exists('bgMusic')) {
                        musicKeyToPlay = 'bgMusic';
                    } else {
                        console.error(`Default bgMusic asset also not found in cache for level ${currentLevel}! Music will not play.`);
                        return; 
                    }
                }
                
                // Create and play background music with error handling
                try {
                    console.log(`Creating audio with key: ${musicKeyToPlay}`);
                    
                    this.bgMusic = this.scene.sound.add(musicKeyToPlay, {
                        volume: 0.4 * this.masterVolume,
                        loop: true
                    });
                    
                    if (this.bgMusic) {
                        this.bgMusic.play();
                        console.log(`Background music (${musicKeyToPlay}) started successfully`);
                    } else {
                        console.error(`Failed to create audio from key: ${musicKeyToPlay}`);
                    }
                } catch (err) {
                    console.error(`Error playing background music (${musicKeyToPlay}):`, err);
                }
            } catch (err) {
                console.error("Error playing background music:", err);
            }
        };
        
        // Play victory music
        this.playVictoryMusic = () => {
            try {
                console.log("AudioManager: Attempting to play victory music...");
                if (!this.musicEnabled) {
                    console.log("AudioManager: Music is disabled, skipping victory music.");
                    return;
                }
                if (this.bgMusic && this.bgMusic.isPlaying) {
                    this.bgMusic.stop();
                    console.log("AudioManager: Stopped background music for victory.");
                }
                if (!this.scene.cache.audio.exists('victoryMusic')) {
                    console.error("AudioManager: victoryMusic asset not found in cache. Music will not play.");
                    return;
                }
                this.startVictoryMusic(); // Call helper defined below
            } catch (err) {
                console.error("Error in AudioManager.playVictoryMusic:", err);
            }
        };
        
        // Helper function to actually start victory music
        this.startVictoryMusic = () => {
            try {
                if (!this.scene.sound || !this.scene.sound.add) {
                    console.error("AudioManager.startVictoryMusic: Sound system not available.");
                    return;
                }
                console.log("AudioManager: Starting victoryMusic...");
                this.victoryMusic = this.scene.sound.add('victoryMusic', {
                    volume: 0.6 * this.masterVolume,
                    loop: false
                });
                if (this.victoryMusic) {
                    this.victoryMusic.play();
                    console.log("AudioManager: victoryMusic started successfully.");
                } else {
                    console.error("AudioManager: Failed to create victoryMusic instance.");
                }
            } catch (err) {
                console.error("Error in AudioManager.startVictoryMusic:", err);
            }
        };
        
        // Play a sound effect
        this.playSFX = (key, options = {}) => {
            try {
                // Check if sounds are enabled
                if (!this.soundsEnabled) {
                    console.log(`Sounds disabled, skipping SFX: ${key}`);
                    return;
                }
                
                // Set default options
                const defaultOptions = {
                    volume: 0.5,
                    rate: 1.0
                };
                
                // Merge with provided options
                const finalOptions = { ...defaultOptions, ...options };
                
                // Check if the sound exists
                if (!this.scene.cache.audio.exists(key)) {
                    console.warn(`SFX not found in cache: ${key}`);
                    return;
                }
                
                try {
                    // Create and play the sound effect
                    const sfx = this.scene.sound.add(key, {
                        volume: finalOptions.volume,
                        rate: finalOptions.rate
                    });
                    
                    if (sfx) {
                        try {
                            sfx.play();
                            
                            // Store in cache for cleanup
                            this.soundCache[key] = sfx;
                            
                            // Auto-remove from cache when complete
                            sfx.once('complete', () => {
                                delete this.soundCache[key];
                            });
                        } catch (playErr) {
                            console.error(`Error playing SFX ${key}:`, playErr);
                        }
                    }
                } catch (sfxErr) {
                    console.error(`Error creating SFX ${key}:`, sfxErr);
                }
            } catch (error) {
                console.error(`Error in playSFX(${key}):`, error);
            }
        };
        
        // Stop all audio
        this.stopAll = () => {
            try {
                console.log("Stopping all audio...");
                
                // Stop background music
                if (this.bgMusic) {
                    try {
                        if (typeof this.bgMusic.stop === 'function') {
                            this.bgMusic.stop();
                            console.log("Stopped background music");
                        }
                        this.bgMusic = null;
                    } catch (err) {
                        console.error("Error stopping background music:", err);
                        this.bgMusic = null;
                    }
                }
                
                // Stop victory music
                if (this.victoryMusic) {
                    try {
                        if (typeof this.victoryMusic.stop === 'function') {
                            this.victoryMusic.stop();
                            console.log("Stopped victory music");
                        }
                        this.victoryMusic = null;
                    } catch (err) {
                        console.error("Error stopping victory music:", err);
                        this.victoryMusic = null;
                    }
                }
                
                // Stop all cached sound effects
                Object.keys(this.soundCache).forEach(key => {
                    try {
                        if (this.soundCache[key] && typeof this.soundCache[key].stop === 'function') {
                            this.soundCache[key].stop();
                        }
                    } catch (err) {
                        console.warn(`Error stopping sound ${key}:`, err);
                    }
                });
                
                // Clear the sound cache
                this.soundCache = {};
                
                // Try the global sound stopAll method
                try {
                    if (this.scene.sound && typeof this.scene.sound.stopAll === 'function') {
                        this.scene.sound.stopAll();
                        console.log("Used global stopAll as safety measure");
                    }
                } catch (err) {
                    console.warn("Could not stop all sounds through global method:", err);
                }
                
                console.log("All audio stopped");
            } catch (error) {
                console.error("Error in stopAll:", error);
            }
        };
        
        // Play game over sound
        this.playGameOverSound = () => {
            try {
                console.log("Attempting to play game over sound...");
                
                // Check if sounds are enabled
                if (!this.soundsEnabled) {
                    console.log("Sounds disabled, skipping game over sound");
                    return;
                }
                
                // Check if the game over sound exists
                if (this.scene.cache.audio.exists('gameOverSound')) {
                    this.playSFX('gameOverSound', { volume: 0.6 });
                } else {
                    console.warn("gameOverSound asset not found in cache");
                }
            } catch (err) {
                console.error("Error in playGameOverSound:", err);
            }
        };
        
        // Explosion sound effect
        this.playExplosionSound = () => {
            this.playSFX('explosion', { volume: 0.5 });
        };
        
        // Crack sound effect
        this.playCrackSound = () => {
            this.playSFX('cracksound', { volume: 0.4 });
        };
        
        // Bounce sound effect
        this.playBounceSound = () => {
            this.playSFX('bouncesound', { volume: 0.4 });
        };

        this.playRandomVoiceMessage = () => {
            try {
                if (!this.soundsEnabled || !this.scene || !this.scene.sound) return;

                const randomIndex = Math.floor(Math.random() * this.voiceMessages.length);
                const messageKey = this.voiceMessages[randomIndex];
                const audioKey = `voice_${messageKey}`;
                console.log(`AudioManager: Attempting to play voice message: ${messageKey}`);

                this.displayCongratulationText(messageKey); // Display text via AudioManager

                if (this.scene.cache.audio.exists(audioKey)) {
                    this.playSFX(audioKey, { volume: 0.7 * this.masterVolume });
                } else {
                    console.warn(`Voice audio not found in cache: ${audioKey}. Attempting direct load as fallback.`);
                    // Fallback: try to load and play directly if not in cache (less ideal)
                    // This part might be removed if LoadingScene guarantees all voice files
                    const audio = new Audio(`assets/audio/voice/${messageKey}.mp3`);
                    audio.volume = 0.7 * this.masterVolume;
                    audio.play().catch(e => console.error(`Error playing voice directly: ${messageKey}`, e));
                }
            } catch (error) {
                console.error("Error in AudioManager.playRandomVoiceMessage:", error);
            }
        };

        this.displayCongratulationText = (message) => {
            try {
                if (!this.scene) return;
                if (this.congratulationText && this.congratulationText.scene) {
                    this.congratulationText.destroy();
                }
                let displayText = message.replace(/_/g, ' ');
                displayText = displayText.charAt(0).toUpperCase() + displayText.slice(1);
                if (!displayText.endsWith('!')) displayText += '!';

                this.congratulationText = this.scene.add.text(
                    this.scene.cameras.main.width / 2,
                    this.scene.cameras.main.height / 2 - 100,
                    displayText,
                    {
                        fontFamily: 'Arial', fontSize: '48px', fontStyle: 'bold', color: '#FFD700',
                        stroke: '#000000', strokeThickness: 6,
                        shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, fill: true }
                    }
                ).setOrigin(0.5).setDepth(this.scene.UI_DEPTH ? this.scene.UI_DEPTH + 5 : 1005);

                this.scene.tweens.add({
                    targets: this.congratulationText,
                    scale: { from: 0.5, to: 1.2 }, duration: 200, ease: 'Back.easeOut',
                    yoyo: true, hold: 100,
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this.congratulationText,
                            alpha: { from: 1, to: 0 }, y: '-=50',
                            duration: 1000, delay: 800, ease: 'Power2',
                            onComplete: () => {
                                if (this.congratulationText && this.congratulationText.scene) {
                                    this.congratulationText.destroy();
                                    this.congratulationText = null;
                                }
                            }
                        });
                    }
                });
            } catch (error) {
                console.error("Error in AudioManager.displayCongratulationText:", error);
            }
        };

        this.displaySpecialClearText = (percentageCleared) => {
            try {
                if (!this.scene || percentageCleared < 20) return;
                let message, fontSize = 52, color = '#FFD700';
                if (percentageCleared >= 40) { message = 'SPECTACULAR!!!'; fontSize = 64; color = '#FF00FF'; }
                else if (percentageCleared >= 30) { message = 'AMAZING!!!'; fontSize = 60; color = '#00FFFF'; }
                else { message = 'WOW!!'; fontSize = 56; color = '#FFFF00'; }

                const specialText = this.scene.add.text(
                    this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2 - 180, message,
                    {
                        fontFamily: 'Arial', fontSize: `${fontSize}px`, fontStyle: 'bold', color: color,
                        stroke: '#000000', strokeThickness: 8,
                        shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 8, fill: true }
                    }
                ).setOrigin(0.5).setDepth(this.scene.UI_DEPTH ? this.scene.UI_DEPTH + 10 : 1010);

                this.scene.tweens.add({
                    targets: specialText, scale: { from: 0.3, to: 1.5 }, duration: 350, ease: 'Back.easeOut',
                    yoyo: true, hold: 200,
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: specialText, angle: { from: -5, to: 5 }, duration: 150, yoyo: true, repeat: 3,
                            onComplete: () => {
                                this.scene.tweens.add({
                                    targets: specialText, alpha: { from: 1, to: 0 }, y: '-=80',
                                    scale: { from: 1, to: 1.8 }, duration: 800, delay: 300, ease: 'Power2',
                                    onComplete: () => specialText.destroy()
                                });
                            }
                        });
                    }
                });
                this.scene.cameras.main.shake(300, 0.01);
            } catch (error) {
                console.error("Error in AudioManager.displaySpecialClearText:", error);
            }
        };
    }
    
    // Create dummy methods when audio is not available
    createDummyMethods() {
        this.playBackgroundMusic = () => {
            console.log("Dummy AudioManager: Ignoring background music request");
        };
        
        this.playVictoryMusic = () => console.log("Dummy AudioManager: Ignoring playVictoryMusic");
        this.startVictoryMusic = () => console.log("Dummy AudioManager: Ignoring startVictoryMusic");
        
        this.playSFX = (key) => {
            console.log(`Dummy AudioManager: Ignoring SFX request for ${key}`);
        };
        
        this.stopAll = () => {
            console.log("Dummy AudioManager: Ignoring stop all request");
        };
        
        this.playGameOverSound = () => {
            console.log("Dummy AudioManager: Ignoring game over sound request");
        };
        
        this.playExplosionSound = () => {
            console.log("Dummy AudioManager: Ignoring explosion sound request");
        };
        
        this.playCrackSound = () => {
            console.log("Dummy AudioManager: Ignoring crack sound request");
        };
        
        this.playBounceSound = () => {
            console.log("Dummy AudioManager: Ignoring bounce sound request");
        };
        
        this.playRandomVoiceMessage = () => console.log("Dummy AudioManager: Ignoring playRandomVoiceMessage");
        this.displayCongratulationText = (message) => console.log(`Dummy AudioManager: Ignoring displayCongratulationText: ${message}`);
        this.displaySpecialClearText = (percentage) => console.log(`Dummy AudioManager: Ignoring displaySpecialClearText: ${percentage}%`);
        
        console.log("Created dummy audio manager methods");
    }
    
    // Enable/disable all sounds
    setEnabled(enabled) {
        this.soundsEnabled = enabled;
        console.log(`Sound ${enabled ? 'enabled' : 'disabled'}`);
        
        // If disabling, stop all current sounds
        if (!enabled) {
            this.stopAll();
        }
    }
    
    // Clean up resources
    cleanup() {
        this.stopAll();
        this.bgMusic = null;
        this.victoryMusic = null;
        this.soundCache = {};
        console.log("AudioManager resources cleaned up");
    }
}

// Export the AudioManager class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioManager };
} else {
    // If not in Node.js, add to window object
    window.AudioManager = AudioManager;
} 