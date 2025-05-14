// Simple test runner for AudioManager tests

// Mock necessary browser APIs
global.document = {
    createElement: jest.fn().mockReturnValue({
        play: jest.fn()
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

global.window = {
    AudioContext: jest.fn().mockImplementation(() => ({
        state: 'running',
        resume: jest.fn().mockResolvedValue(undefined)
    })),
    Audio: jest.fn().mockImplementation(() => ({
        play: jest.fn().mockResolvedValue(undefined),
        volume: 0
    }))
};

// Import the test file
require('./audio/AudioManagerTest');

console.log('AudioManager tests completed'); 