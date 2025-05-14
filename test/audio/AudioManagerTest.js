// AudioManagerTest.js - Test suite for AudioManager

// Mock Phaser objects
class MockScene {
    constructor() {
        this.sound = {
            add: jest.fn().mockReturnValue({
                play: jest.fn(),
                stop: jest.fn(),
                once: jest.fn(),
                setVolume: jest.fn()
            }),
            stopAll: jest.fn(),
            context: {
                currentTime: 0,
                createOscillator: jest.fn().mockReturnValue({
                    connect: jest.fn(),
                    frequency: {
                        setValueAtTime: jest.fn(),
                        exponentialRampToValueAtTime: jest.fn()
                    },
                    start: jest.fn(),
                    stop: jest.fn()
                }),
                createGain: jest.fn().mockReturnValue({
                    connect: jest.fn(),
                    gain: {
                        setValueAtTime: jest.fn(),
                        exponentialRampToValueAtTime: jest.fn()
                    }
                })
            }
        };
        
        this.cache = {
            audio: {
                exists: jest.fn().mockReturnValue(true),
                entries: {
                    entries: {}
                },
                get: jest.fn()
            }
        };
        
        this.time = {
            delayedCall: jest.fn((delay, callback) => {
                if (callback) callback();
                return { remove: jest.fn() };
            })
        };
        
        this.load = {
            audio: jest.fn(),
            once: jest.fn(),
            start: jest.fn(),
            reset: jest.fn(),
            setBaseURL: jest.fn(),
            setPath: jest.fn()
        };
        
        this.events = {
            emit: jest.fn()
        };
        
        this.add = {
            text: jest.fn().mockReturnValue({
                setOrigin: jest.fn().mockReturnThis(),
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            }),
            circle: jest.fn().mockReturnValue({
                setDepth: jest.fn().mockReturnThis(),
                destroy: jest.fn()
            })
        };
        
        this.tweens = {
            add: jest.fn().mockReturnValue({
                remove: jest.fn()
            }),
            killTweensOf: jest.fn()
        };
        
        this.cameras = {
            main: {
                width: 1920,
                height: 1080
            }
        };
    }
}

describe('AudioManager', () => {
    let audioManager;
    let mockScene;

    beforeEach(() => {
        mockScene = new MockScene();
        audioManager = new AudioManager(mockScene);
    });

    test('should initialize properly', () => {
        const result = audioManager.initialize();
        expect(result).toBe(true);
        expect(mockScene.time.delayedCall).toHaveBeenCalled();
    });

    test('should play background music', () => {
        audioManager.playBackgroundMusic();
        expect(mockScene.sound.add).toHaveBeenCalledWith('bgMusic', expect.objectContaining({
            volume: expect.any(Number),
            loop: true
        }));
    });

    test('should play victory music', () => {
        audioManager.playVictoryMusic();
        expect(mockScene.sound.add).toHaveBeenCalledWith('victoryMusic', expect.objectContaining({
            volume: expect.any(Number),
            loop: false
        }));
    });

    test('should play sound effects', () => {
        const sound = audioManager.playSound('explosion', { volume: 0.7 });
        expect(mockScene.sound.add).toHaveBeenCalledWith('explosion', expect.objectContaining({
            volume: expect.any(Number)
        }));
    });

    test('should toggle music', () => {
        const initialState = audioManager.musicEnabled;
        const newState = audioManager.toggleMusic();
        expect(newState).toBe(!initialState);
    });

    test('should toggle sound effects', () => {
        const initialState = audioManager.soundsEnabled;
        const newState = audioManager.toggleSounds();
        expect(newState).toBe(!initialState);
    });

    test('should set master volume', () => {
        const newVolume = 0.5;
        const result = audioManager.setMasterVolume(newVolume);
        expect(result).toBe(newVolume);
    });

    test('should stop all audio', () => {
        audioManager.bgMusic = { stop: jest.fn() };
        audioManager.victoryMusic = { stop: jest.fn() };
        
        audioManager.stopAll();
        
        expect(audioManager.bgMusic.stop).toHaveBeenCalled();
        expect(audioManager.victoryMusic.stop).toHaveBeenCalled();
        expect(mockScene.sound.stopAll).toHaveBeenCalled();
    });

    test('should clean up resources', () => {
        audioManager.bgMusic = { stop: jest.fn() };
        audioManager.victoryMusic = { stop: jest.fn() };
        
        audioManager.cleanup();
        
        expect(audioManager.bgMusic).toBeNull();
        expect(audioManager.victoryMusic).toBeNull();
        expect(Object.keys(audioManager.sounds).length).toBe(0);
    });
});

// Test voice messaging functionality
describe('Voice Message Functionality', () => {
    let audioManager;
    let mockScene;

    beforeEach(() => {
        mockScene = new MockScene();
        // Mock voice message data
        mockScene.voiceMessages = [
            "fantastic",
            "great_aim",
            "marvelous",
            "superb"
        ];
        audioManager = new AudioManager(mockScene);
    });

    test('should play random voice message', () => {
        // Override Math.random to return a predictable value
        const originalRandom = Math.random;
        Math.random = jest.fn().mockReturnValue(0.1); // Will select first message
        
        const result = audioManager.playRandomVoiceMessage();
        
        expect(result).toBe(true);
        expect(mockScene.sound.add).toHaveBeenCalledWith(
            expect.stringContaining('voice_'), 
            expect.objectContaining({ volume: expect.any(Number) })
        );
        
        // Reset Math.random
        Math.random = originalRandom;
    });

    test('should fall back to direct audio play if sound not in cache', () => {
        mockScene.cache.audio.exists.mockReturnValue(false);
        
        // Mock Audio constructor
        global.Audio = jest.fn().mockImplementation(() => ({
            play: jest.fn().mockResolvedValue(),
            volume: 0
        }));
        
        const result = audioManager.playRandomVoiceMessage();
        
        expect(result).toBe(true);
        expect(global.Audio).toHaveBeenCalledWith(expect.stringContaining('assets/audio/voice/'));
        
        // Clean up
        delete global.Audio;
    });

    test('should display congratulation text', () => {
        audioManager.displayCongratulationText("fantastic");
        
        expect(mockScene.add.text).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            "Fantastic!",
            expect.any(Object)
        );
        expect(mockScene.tweens.add).toHaveBeenCalled();
    });
}); 