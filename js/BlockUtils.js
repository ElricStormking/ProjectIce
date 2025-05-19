// BlockUtils.js - Contains utility functions for working with blocks
/**
 * @class BlockUtils
 * @description Utility class for creating visual effects and particle-based animations for blocks.
 * This class handles various visual effects like shatter, explosion, and damage effects used in the game.
 */
class BlockUtils {
    /**
     * Initializes the BlockUtils class
     * @param {Phaser.Scene} scene - The scene this utility belongs to
     */
    constructor(scene) {
        this.scene = scene;
    }
    
    // ===== BLOCK VISUAL EFFECTS =====
    
    /**
     * Create a shatter effect for blocks
     * @param {Phaser.Physics.Matter.Image} block - The block to shatter
     */
    createBlockShatter(block) {
        if (!block || !this.scene) return;
        
        // Create 2-3 smaller pieces at the block's position
        const numPieces = Phaser.Math.Between(2, 3);
        const blockSize = block.displayWidth / 2; // Pieces are half the size
        
        for (let i = 0; i < numPieces; i++) {
            this._createShatterPiece(block);
        }
    }
    
    /**
     * Create a damage effect for blocks
     * @param {Phaser.Physics.Matter.Image} block - The block to show damage effect on
     */
    createDamageEffect(block) {
        if (!block || !this.scene) return;
        
        // Create small particles to indicate damage
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        // Get the appropriate tint color based on block type
        const tint = this._getDamageEffectTint(block);
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 80 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            tint: tint
        });
        
        // Emit particles from the center of the block
        emitter.explode(10, block.x, block.y);
        
        // Clean up particles after use
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        // Add a small camera shake for feedback
        this.scene.cameras.main.shake(100, 0.005);
        
        // Play a crack sound for feedback
        this._playSound('cracksound', { volume: 0.3 });
    }
    
    /**
     * Create an effect when bouncy blocks are hit
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createBouncyHitEffect(x, y) {
        if (!this.scene) return;
        
        // Visual bounce effect
        const ring = this.scene.add.circle(x, y, 20, 0x88ddff, 0.8);
        ring.setDepth(6);
        
        this.scene.tweens.add({
            targets: ring,
            radius: 40,
            alpha: 0,
            duration: 300,
            ease: 'Sine.easeOut',
            onUpdate: (tween) => {
                // Manually update the circle size since radius isn't a standard property
                const radius = 20 + (40 - 20) * tween.progress;
                ring.setRadius(radius);
            },
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Play bounce sound
        this._playSound('bouncesound', { volume: 0.4 });
    }
    
    /**
     * Create a special effect for dynamite blocks
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createDynamiteDestroyEffect(x, y) {
        if (!this.scene) return;
        
        // Create special particles for dynamite
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 80, max: 200 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            tint: [0xff0000, 0xff6600, 0xffcc00] // Red/orange/yellow
        });
        
        // Emit more particles for dynamite
        emitter.explode(40, x, y);
        
        // Add a flash effect
        const flash = this.scene.add.circle(x, y, 80, 0xffcc00, 0.8);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Clean up particles after use
        this.scene.time.delayedCall(700, () => {
            particles.destroy();
        });
    }
    
    // ===== SPECIAL EFFECTS =====
    
    /**
     * Create a shatterer impact effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createShattererImpactEffect(x, y) {
        if (!this.scene) return;
        
        try {
            // Create the main burst effect
            this._createShattererBurst(x, y);
            
            // Create electric-like jagged lines
            this._createShattererLightning(x, y);
            
            // Create particles
            this._createShattererParticles(x, y);
            
            // Add small camera shake
            this.scene.cameras.main.shake(100, 0.006);
        } catch (error) {
            console.error("Error in createShattererImpactEffect:", error);
        }
    }
    
    /**
     * Create explosion effect
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createExplosion(x, y) {
        if (!this.scene) return;
        
        // Create visual effects
        const visualElements = this._createExplosionVisuals(x, y);
        
        // Add a camera shake effect
        this.scene.cameras.main.shake(300, 0.01);
        
        // Add explosion sound
        this._playSound('explosion', { volume: 0.5 });
    }
    
    /**
     * Create mini explosion effect for cluster bombs
     * @param {number} x - X position
     * @param {number} y - Y position
     */
    createMiniExplosion(x, y) {
        if (!this.scene) return;
        
        // Create visual effects
        const visualElements = this._createMiniExplosionVisuals(x, y);
        
        // Add a small camera shake
        this.scene.cameras.main.shake(150, 0.005);
    }
    
    // ===== PRIVATE HELPER METHODS =====
    
    /**
     * Create a single shatter piece for a block
     * @private
     * @param {Phaser.Physics.Matter.Image} block - The original block
     * @returns {Phaser.Physics.Matter.Image} The created shatter piece
     */
    _createShatterPiece(block) {
        // Randomize position slightly around the original block
        const offsetX = Phaser.Math.Between(-10, 10);
        const offsetY = Phaser.Math.Between(-10, 10);
        
        const textureKey = block.texture.key;

        const piece = this.scene.matter.add.image(
            block.x + offsetX,
            block.y + offsetY,
            textureKey, 
            null,
            {
                restitution: 0.8,
                friction: 0.01,
                density: 0.001
            }
        );
        
        // Scale piece: Source texture is 20x20. Target display size for pieces ~3.2px to 4.2px.
        piece.setScale(0.16 + Math.random() * 0.05); 
        
        piece.setDepth(5);
        piece.setRotation(Math.random() * Math.PI * 2);
        
        // Apply random velocity
        const velX = Phaser.Math.Between(-5, 5);
        const velY = Phaser.Math.Between(-5, 2);
        piece.setVelocity(velX, velY);
        
        // Make pieces semi-transparent
        piece.setAlpha(0.7);
        
        // Destroy the piece after delay
        this.scene.time.delayedCall(1500 + Math.random() * 1000, () => {
            if (piece && piece.scene) {
                piece.destroy();
            }
        });
        
        return piece;
    }
    
    /**
     * Get the tint color for a damage effect based on block type
     * @private
     * @param {Phaser.Physics.Matter.Image} block - The block being damaged
     * @returns {number} The tint color as a hexadecimal value
     */
    _getDamageEffectTint(block) {
        if (block.blockType === this.scene.blockTypes.TYPES.ETERNAL) {
            return this.scene.blockTypes.getColor(this.scene.blockTypes.TYPES.ETERNAL);
        } else if (block.blockType === this.scene.blockTypes.TYPES.STRONG) {
            return this.scene.blockTypes.getColor(this.scene.blockTypes.TYPES.STRONG);
        }
        return 0xffffff; // Default white tint
    }
    
    /**
     * Create the burst effect for a shatterer impact
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Arc} The burst graphic
     */
    _createShattererBurst(x, y) {
        // Create the main burst
        const burst = this.scene.add.circle(x, y, 30, 0x4444ff, 0.8);
        burst.setDepth(6); // Above game objects but below UI
        
        // Animate and clean up
        this.scene.tweens.add({
            targets: burst,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                burst.destroy();
            }
        });
        
        return burst;
    }
    
    /**
     * Create lightning-like jagged lines for a shatterer impact
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Graphics} The graphics object
     */
    _createShattererLightning(x, y) {
        // Create jagged electric-like lines radiating from the impact point
        const graphics = this.scene.add.graphics();
        graphics.setDepth(6);
        
        // Draw with blue-white color
        graphics.lineStyle(2, 0x88aaff, 0.9);
        
        // Create several jagged lines emanating from the impact point
        const numLines = 6;
        const maxLength = 40;
        
        for (let i = 0; i < numLines; i++) {
            const angle = (i / numLines) * Math.PI * 2;
            
            graphics.beginPath();
            graphics.moveTo(x, y);
            
            // Create a jagged line with multiple segments
            const numSegments = 3;
            for (let j = 0; j < numSegments; j++) {
                // Calculate the target point for this segment with slight randomness
                const segmentLength = maxLength / numSegments;
                const angleJitter = Math.random() * 0.4 - 0.2; // Random angle variation
                const segmentEndX = x + Math.cos(angle + angleJitter) * (j + 1) * segmentLength;
                const segmentEndY = y + Math.sin(angle + angleJitter) * (j + 1) * segmentLength;
                
                graphics.lineTo(segmentEndX, segmentEndY);
            }
            
            graphics.strokePath();
        }
        
        // Animate and clean up
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                graphics.destroy();
            }
        });
        
        return graphics;
    }
    
    /**
     * Create particles for a shatterer impact
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Particles.ParticleEmitterManager} The particle emitter
     */
    _createShattererParticles(x, y) {
        // Create particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 100 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            tint: 0x4488ff  // Blue tint
        });
        
        // Emit particles at impact point
        emitter.explode(15, x, y);
        
        // Clean up particles
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        return particles;
    }
    
    /**
     * Create the visual elements for an explosion
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} Visual elements for the explosion
     */
    _createExplosionVisuals(x, y) {
        // Create visual explosion effect
        const explosion = this.scene.add.circle(x, y, 80, 0xff5500, 0.8);
        explosion.setDepth(6); // Higher than ice blocks (4), blue veils (3), and shattered pieces (5)
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 2,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles
        const particles = this._createExplosionParticles(x, y);
        
        // Create a flash effect
        const flash = this.scene.add.circle(x, y, 100, 0xffffff, 1);
        flash.setDepth(6); // Same depth as explosion
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        return { explosion, particles, flash };
    }
    
    /**
     * Create particles for an explosion
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Particles.ParticleEmitterManager} The particle emitter
     */
    _createExplosionParticles(x, y) {
        // Add some particles for more effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6); // Same depth as explosion
        
        const emitter = particles.createEmitter({
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD'
        });
        
        // Emit particles at explosion point
        emitter.explode(30, x, y);
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        return particles;
    }
    
    /**
     * Create the visual elements for a mini explosion
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} Visual elements for the mini explosion
     */
    _createMiniExplosionVisuals(x, y) {
        // Create smaller visual explosion effect
        const explosion = this.scene.add.circle(x, y, 40, 0xffdd44, 0.7);
        explosion.setDepth(6); // Same depth as regular explosions
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles
        const particles = this._createMiniExplosionParticles(x, y);
        
        return { explosion, particles };
    }
    
    /**
     * Create particles for a mini explosion
     * @private
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Phaser.GameObjects.Particles.ParticleEmitterManager} The particle emitter
     */
    _createMiniExplosionParticles(x, y) {
        // Add particles
        const particles = this.scene.add.particles('mini_particle');
        particles.setDepth(6); // Match explosion depth
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 150 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            blendMode: 'ADD'
        });
        
        // Emit particles at explosion point
        emitter.explode(20, x, y);
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(700, () => {
            particles.destroy();
        });
        
        return particles;
    }
    
    /**
     * Helper method to play a sound with error handling
     * @private
     * @param {string} key - Sound key
     * @param {Object} config - Sound configuration
     * @returns {Phaser.Sound.BaseSound|null} The sound object or null if it couldn't be played
     */
    _playSound(key, config = {}) {
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const sound = this.scene.sound.add(key, config);
                if (!sound.isPlaying) {
                    sound.play(config);
                    return sound;
                }
            } catch (e) {
                console.log(`Sound ${key} not available:`, e);
            }
        }
        return null;
    }
}

// Export the BlockUtils class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlockUtils };
} else {
    // If not in Node.js, add to window object
    window.BlockUtils = BlockUtils;
} 