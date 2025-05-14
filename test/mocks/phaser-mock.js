/**
 * phaser-mock.js
 * Simple mock of Phaser's core functionality for testing purposes
 */

// Create a global Phaser object with minimal required functionality
window.Phaser = {
    // Math utilities
    Math: {
        Distance: {
            Between: (x1, y1, x2, y2) => {
                return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            }
        },
        DEG_TO_RAD: Math.PI / 180,
        RAD_TO_DEG: 180 / Math.PI
    },
    
    // Minimal Game class
    Game: class {
        constructor(config) {
            this.config = config;
            this.device = {
                os: {
                    desktop: true
                }
            };
        }
    },
    
    // Minimal Scene class
    Scene: class {
        constructor(config) {
            this.sys = {
                game: new Phaser.Game({
                    width: 800,
                    height: 600
                })
            };
            this.add = {
                image: (x, y, texture) => ({ x, y, texture, setOrigin: () => ({}) }),
                text: (x, y, text, style) => ({ x, y, text, setOrigin: () => ({}), setDepth: () => ({}) }),
                graphics: () => ({
                    clear: () => ({}),
                    lineStyle: () => ({}),
                    beginPath: () => ({}),
                    moveTo: () => ({}),
                    lineTo: () => ({}),
                    stroke: () => ({}),
                    setDepth: () => ({})
                }),
                line: (x, y, x1, y1, x2, y2, color) => ({
                    setOrigin: () => ({}),
                    setLineWidth: () => ({}),
                    setDepth: () => ({})
                }),
                circle: (x, y, radius, color, alpha) => ({
                    setStrokeStyle: () => ({}),
                    setDepth: () => ({})
                })
            };
            
            this.matter = {
                add: {
                    image: (x, y, texture) => ({
                        x, y, 
                        texture: { key: texture },
                        setCircle: () => ({}),
                        setStatic: () => ({}),
                        setVisible: () => ({}),
                        setDepth: () => ({}),
                        setDisplaySize: () => ({}),
                        setPosition: (x, y) => ({}),
                        destroy: () => ({})
                    })
                },
                body: {
                    applyForce: (body, pos, force) => ({})
                }
            };
            
            this.input = {
                on: (event, callback) => ({})
            };
            
            this.time = {
                delayedCall: (delay, callback) => ({ remove: () => ({}) })
            };
            
            this.tweens = {
                add: (config) => ({})
            };
            
            this.cameras = {
                main: {
                    width: 800,
                    height: 600,
                    shake: () => ({})
                }
            };
            
            this.events = {
                emit: (event, ...args) => ({})
            };
        }
        
        create() {}
        update() {}
        preload() {}
    },
    
    // Input related classes
    Input: {
        Keyboard: {
            KeyCodes: {
                ESC: 27,
                SPACE: 32,
                LEFT: 37,
                UP: 38,
                RIGHT: 39,
                DOWN: 40
            }
        }
    },
    
    // Physics
    Physics: {
        Matter: {
            Image: class {}
        }
    }
};

console.log('Phaser mock initialized'); 