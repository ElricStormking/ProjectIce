// Mock global browser objects needed for tests

// Mock document
global.document = {
    createElement: jest.fn().mockReturnValue({
        play: jest.fn().mockReturnValue(Promise.resolve()),
        pause: jest.fn(),
        volume: 0
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock window
global.window = {
    AudioContext: jest.fn().mockImplementation(() => ({
        state: 'running',
        resume: jest.fn().mockResolvedValue(undefined),
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
        }),
        currentTime: 0,
        destination: {}
    })),
    Audio: jest.fn().mockImplementation(() => ({
        play: jest.fn().mockResolvedValue(undefined),
        pause: jest.fn(),
        volume: 0
    })),
    navigator: {
        msSaveOrOpenBlob: jest.fn()
    }
};

// Mock Phaser objects
global.Phaser = {
    Scene: class Scene {
        constructor() {}
    },
    Sound: {
        SoundManager: class SoundManager {
            constructor() {
                this.sounds = [];
                this.context = global.window.AudioContext();
            }
            add(key, config) {
                return {
                    key,
                    config,
                    play: jest.fn(),
                    stop: jest.fn(),
                    once: jest.fn(),
                    on: jest.fn(),
                    isPlaying: false,
                    setVolume: jest.fn()
                };
            }
            stopAll() {}
        }
    },
    Math: {
        Clamp: (val, min, max) => Math.min(Math.max(val, min), max)
    },
    GameObjects: {
        Text: class Text {
            constructor() {
                this.setOrigin = jest.fn().mockReturnThis();
                this.setDepth = jest.fn().mockReturnThis();
                this.destroy = jest.fn();
            }
        }
    }
};

// Set up console mocks
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock Math.random to be deterministic in tests
const originalMathRandom = Math.random;
global.mockMathRandom = (value) => {
    Math.random = jest.fn().mockReturnValue(value);
};
global.restoreMathRandom = () => {
    Math.random = originalMathRandom;
}; 