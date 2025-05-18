// BombUtils.js - Contains utility functions for working with bombs
class BombUtils {
    constructor(scene) {
        this.scene = scene;
        
        // Create bomb placeholders during initialization
        if (this.scene && this.scene.textures) {
            this.createBombPlaceholders();
        } else {
            console.warn('[BombUtils.constructor] Scene or textures not available - placeholders will be created later');
        }
    }
    
    // Create placeholder graphics for any missing bomb textures
    createBombPlaceholders() {
        if (!this.scene || !this.scene.textures) {
            console.warn('[BombUtils.createBombPlaceholders] Scene or textures not available');
            return;
        }
        
        console.log('[BombUtils.createBombPlaceholders] Creating placeholder graphics for bombs');
        
        // Create a placeholder for the Shrapnel bomb if it doesn't exist
        if (!this.scene.textures.exists('shrapnel_bomb')) {
            console.log('[BombUtils.createBombPlaceholders] Creating placeholder for shrapnel_bomb');
            
            // Create a graphics object for the Shrapnel bomb
            const graphics = this.scene.make.graphics();
            
            // Draw the bomb body (circle)
            graphics.fillStyle(0xFF6600); // Orange color
            graphics.fillCircle(30, 30, 30);
            
            // Add shrapnel-like lines radiating outward
            graphics.lineStyle(2, 0xFFCC00); // Yellow lines
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const innerX = 30 + Math.cos(angle) * 15;
                const innerY = 30 + Math.sin(angle) * 15;
                const outerX = 30 + Math.cos(angle) * 35;
                const outerY = 30 + Math.sin(angle) * 35;
                graphics.beginPath();
                graphics.moveTo(innerX, innerY);
                graphics.lineTo(outerX, outerY);
                graphics.strokePath();
            }
            
            // Add inner circle to represent the explosives
            graphics.fillStyle(0xFF3300); // Darker orange
            graphics.fillCircle(30, 30, 15);
            
            // Add a highlight effect
            graphics.fillStyle(0xFFFF99, 0.5); // Light yellow with transparency
            graphics.fillCircle(23, 23, 8);
            
            // Generate texture from the graphics
            graphics.generateTexture('shrapnel_bomb', 60, 60);
            graphics.destroy();
            
            console.log('[BombUtils.createBombPlaceholders] Placeholder for shrapnel_bomb created successfully');
        }
        
        // Create placeholders for other bomb types if needed
        const bombTypes = [
            { key: 'blast_bomb', color: 0xFF0000 },      // Red
            { key: 'piercer_bomb', color: 0x0099FF },    // Light blue
            { key: 'cluster_bomb', color: 0xFFFF00 },    // Yellow
            { key: 'sticky_bomb', color: 0xFF00FF },     // Pink
            { key: 'shatterer_bomb', color: 0xCC3333 },  // Dark red
            { key: 'driller_bomb', color: 0xCC6600 },    // Brown
            { key: 'ricochet_bomb', color: 0x00FFFF },   // Cyan
            { key: 'melter_bomb', color: 0x00CC99 }      // Teal/Mint green for Melter
        ];
        
        // Create simple placeholders for any other missing bomb textures
        bombTypes.forEach(bombType => {
            if (!this.scene.textures.exists(bombType.key)) {
                console.log(`[BombUtils.createBombPlaceholders] Creating placeholder for ${bombType.key}`);
                
                const graphics = this.scene.make.graphics();
                
                // Draw basic bomb circle
                graphics.fillStyle(bombType.color);
                graphics.fillCircle(30, 30, 30);
                
                // Add highlight
                graphics.fillStyle(0xFFFFFF, 0.4);
                graphics.fillCircle(20, 20, 10);
                
                // Generate texture
                graphics.generateTexture(bombType.key, 60, 60);
                graphics.destroy();
                
                console.log(`[BombUtils.createBombPlaceholders] Placeholder for ${bombType.key} created successfully`);
            }
        });
        
        console.log('[BombUtils.createBombPlaceholders] Bomb placeholder creation completed');
    }
    
    // Create a dynamic bomb with appropriate physics
    createDynamicBomb(x, y, bombType, forceX, forceY) {
        // Set bomb properties based on type
        let bombProperties = {
            restitution: 0.9, // Increased for better bouncing in ultra-low gravity
            friction: 0.01, // Reduced for less surface friction
            density: 0.0003, // Keep the same density
            frictionAir: 0.001 // Reduced for less air resistance
        };
        
        // Adjust properties for special bomb types
        switch(bombType) {
            case this.scene.BOMB_TYPES.PIERCER:
                // Piercer has lower friction and higher density
                bombProperties.friction = 0.002;
                bombProperties.frictionAir = 0.0008;
                bombProperties.density = 0.0005;
                break;
                
            case this.scene.BOMB_TYPES.CLUSTER:
                // Cluster is a bit lighter
                bombProperties.density = 0.0002;
                bombProperties.frictionAir = 0.001;
                break;
                
            case this.scene.BOMB_TYPES.STICKY:
                // Sticky bombs should be a bit lighter too
                bombProperties.density = 0.0003;
                bombProperties.frictionAir = 0.001;
                break;
                
            case this.scene.BOMB_TYPES.SHATTERER:
                // Shatterer is heavier but still needs adjustment
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0009;
                break;
                
            case this.scene.BOMB_TYPES.DRILLER:
                // Driller needs good momentum
                bombProperties.density = 0.0004;
                bombProperties.frictionAir = 0.0008;
                break;
        }
        
        // Create the bomb with appropriate properties
        const bomb = this.scene.matter.add.image(x, y, bombType, null, bombProperties);
        bomb.setCircle(30); // Set physics circle radius to 30 (half of 60x60)
        bomb.bombType = bombType; // Store the bomb type for later use
        bomb.setDepth(12); // Same depth as static bomb
        
        // Set bomb size to 60x60
        bomb.setDisplaySize(60, 60);
        
        // Mark as a launched bomb (not static at slingshot)
        bomb.isLaunched = true;
        bomb.hasHitIceBlock = false;
        
        // Store initial velocity for driller and sticky bombs
        bomb.storedVelocityX = forceX * 100; // Amplify for better storage
        bomb.storedVelocityY = forceY * 100;
        
        // Apply impulse (instant force)
        this.scene.matter.body.applyForce(bomb.body, 
            { x: x, y: y }, 
            { x: forceX, y: forceY });
        
        // Track when the bomb was launched
        bomb.launchTime = this.scene.time.now;
        
        return bomb;
    }
    
    // Handle blast bomb explosion
    handleBlastBomb(x, y) {
        // Create explosion effect at bomb position
        this.createExplosion(x, y);
        
        // Destroy ice blocks in radius from explosion
        this.destroyBlocksInRadius(x, y, this.EXPLOSION_RADIUS || 150);
        
        // Check if this was the last bomb
        this.checkLastBombResolution();
    }
    
    // Handle piercer bomb effect
    handlePiercerBomb(x, y, providedVelocity) {
        let velocity;
        const activeLaunchedBomb = this.scene.bombLauncher ? this.scene.bombLauncher.getActiveLaunchedBomb() : null;

        if (providedVelocity) {
            velocity = providedVelocity;
            console.log("Using provided velocity for piercer bomb:", velocity);
        } else if (activeLaunchedBomb && activeLaunchedBomb.body && activeLaunchedBomb.body.velocity) {
            velocity = activeLaunchedBomb.body.velocity;
            console.log("Using current active launched bomb velocity for piercer bomb:", velocity);
        } else {
            console.log("No velocity available for piercer bomb (no active launched bomb or no provided velocity), using default downward direction");
            velocity = { x: 0, y: 1 };
        }
        
        // Normalize velocity to get direction
        const magnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const dirX = magnitude > 0 ? velocity.x / magnitude : 0;
        const dirY = magnitude > 0 ? velocity.y / magnitude : 1;
        
        // Create a narrower but longer explosion effect
        const lineLength = 750; // MODIFIED FROM 300 (300 * 2.5)
        
        // Create visual effect - smaller explosion
        this.createExplosion(x, y);
        
        // Create piercing line particles
        const particles = this.scene.add.particles('particle');
        const emitter = particles.createEmitter({
            speed: { min: 20, max: 50 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: 0x77aaff // Blue tint to match the bomb
        });
        
        // Emit along the trajectory line
        for (let i = 0; i < lineLength; i += 10) {
            const pointX = x + dirX * i;
            const pointY = y + dirY * i;
            emitter.explode(3, pointX, pointY);
            
            // Destroy blocks along the line
            this.destroyBlocksInRadius(pointX, pointY, 30);
            
            // Check for sticky bombs along the line
            if (i % 50 === 0) { // Check every 50 pixels to avoid too many calculations
                this.scene.triggerStickyBomb(pointX, pointY, 60);
            }
        }
        
        // Clean up particles
        this.scene.time.delayedCall(500, () => {
            particles.destroy();
            
            // Check if this was the last bomb after effects complete
            this.checkLastBombResolution();
        });
    }
    
    // Handle cluster bomb explosions
    handleClusterBomb(x, y, velocity = { x: 0, y: 1 }) { // Add velocity parameter with a default
        // Create main explosion (smaller than blast bomb)
        this.createExplosion(x, y); // Main explosion at impact
        this.destroyBlocksInRadius(x, y, 120); // Slightly smaller radius for main impact
        
        // Check for sticky bombs in primary explosion
        this.scene.triggerStickyBomb(x, y, 120);
        
        const numSubMunitions = 5;
        const fanAngleDegrees = 140;
        const fanAngleRadians = Phaser.Math.DegToRad(fanAngleDegrees);
        const subMunitionTravelDistance = 200; // How far sub-munitions travel
        const subMunitionExplosionRadius = 80; // Radius for sub-munition explosions
        const subMunitionDelay = 200; // Base delay for sub-munitions to spread out

        let baseAngle = Math.atan2(velocity.y, velocity.x); // Get angle from initial velocity

        // If velocity is very low (e.g., bomb stopped mid-air), default to upward spread
        if (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1) {
            baseAngle = -Math.PI / 2; // Default to straight up if no significant velocity
        }

        // Track the number of sub-munitions that have completed
        let completedSubMunitions = 0;

        for (let i = 0; i < numSubMunitions; i++) {
            // Calculate angle for this sub-munition
            // Spread them across the fanAngle, centered on baseAngle
            let currentAngleOffset;
            if (numSubMunitions === 1) {
                currentAngleOffset = 0; // Single sub-munition goes straight
            } else {
                currentAngleOffset = (-fanAngleRadians / 2) + (i * (fanAngleRadians / (numSubMunitions - 1)));
            }
            const subMunitionAngle = baseAngle + currentAngleOffset;
            
            // Calculate end position for the sub-munition
            const endX = x + Math.cos(subMunitionAngle) * subMunitionTravelDistance;
            const endY = y + Math.sin(subMunitionAngle) * subMunitionTravelDistance;
            
            // Add a slight progressive delay to make the spread feel more natural
            const delay = subMunitionDelay + i * 50; 
            
            this.scene.time.delayedCall(delay, () => {
                // Create a small visual trail for the sub-munition (optional)
                this.createFragmentTrail(x, y, endX, endY, delay - 50); // Trail effect

                // Create mini explosion at sub-munition end point
                this.createMiniExplosion(endX, endY);
                // Destroy blocks in smaller radius
                this.destroyBlocksInRadius(endX, endY, subMunitionExplosionRadius);
                // Check for sticky bombs in mini explosion
                this.scene.triggerStickyBomb(endX, endY, subMunitionExplosionRadius);
                
                // Track completion
                completedSubMunitions++;
                
                // If this was the last sub-munition, check if it was the last bomb
                if (completedSubMunitions === numSubMunitions) {
                    this.checkLastBombResolution();
                }
            });
        }
    }
    
    // Handle sticky bomb placement
    handleStickyBomb(x, y, block, bombInstanceToUse = null) {
        console.log("BombUtils.handleStickyBomb called at", x, y, "with bomb instance:", bombInstanceToUse ? (bombInstanceToUse.texture ? bombInstanceToUse.texture.key : 'unknown texture') : 'none passed');
        
        // Create a visual sticky effect to show bomb has stuck, but not exploded
        const stickyEffect = this.scene.add.circle(x, y, 30, 0xff99ff, 0.5);
        stickyEffect.setDepth(15);
        
        // Animate the sticky effect to pulse
        this.scene.tweens.add({
            targets: stickyEffect,
            alpha: 0.2,
            scale: 1.2,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 // Repeat forever until removed
        });
        
        // Add small particles to show it's active
        const particles = this.scene.add.particles('sticky_particle');
        const emitter = particles.createEmitter({
            speed: { min: 10, max: 50 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            tint: 0xff99ff, // Pink tint for sticky bombs
            frequency: 500, // Emit particles every 500ms
            quantity: 2
        });
        
        // Set particle emission point
        emitter.setPosition(x, y);
        
        // Keep a reference to the original bomb sprite
        let bombSprite = null;
        
        // Get the active bomb reference from either direct reference or launcher
        let activeBomb = bombInstanceToUse;

        if (!activeBomb) { // If not directly passed, try to find it as before
            if (this.scene.bombLauncher && this.scene.bombLauncher.bomb) {
                activeBomb = this.scene.bombLauncher.bomb;
            } else if (this.scene.bomb) {
                activeBomb = this.scene.bomb;
            }
        }
        
        if (activeBomb) {
            // Fix the bomb in place
            activeBomb.setStatic(true);
            // Make the bomb appear at the correct position
            activeBomb.setPosition(x, y);
            
            // Mark the bomb as sticky
            activeBomb.isSticky = true;
            activeBomb.hasExploded = false;
            
            // Store reference to the bomb sprite
            bombSprite = activeBomb;
            
            console.log("Sticky bomb reference maintained, fixing bomb position at", x, y);
            
            // IMPORTANT: Clear the scene's bomb references after storing our local reference
            // This ensures the launcher will create a new bomb
            if (this.scene.bombLauncher && this.scene.bombLauncher.bomb === activeBomb) {
                this.scene.bombLauncher.bomb = null;
                if (this.scene.bombLauncher.bombState) {
                    this.scene.bombLauncher.bombState.active = false;
                }
            }
            
            if (this.scene.bomb === activeBomb) { // Also clear direct scene reference if it matches
                this.scene.bomb = null;
            }
        }
        
        // Create a sticky bomb object to track its state
        const stickyBomb = {
            x: x,
            y: y,
            isActive: true,
            scene: this.scene,
            visualEffect: stickyEffect,
            particles: particles,
            emitter: emitter,
            bombSprite: bombSprite, // Store the bomb sprite reference
            explosionRadius: 440, // Wider explosion radius than standard bomb
            isSticky: true,
            createdAt: Date.now()
        };
        
        // Add the sticky bomb to an array to track all active sticky bombs
        if (!this.scene.activeStickyBombs) {
            this.scene.activeStickyBombs = [];
        }
        this.scene.activeStickyBombs.push(stickyBomb);
        
        // Play a sticking sound if available
        try {
            this.scene.sound.play('explosion', { volume: 0.2, rate: 1.5 }); // Higher pitch for sticking sound
        } catch (e) {
            console.log("Sound not available:", e);
        }
        
        console.log("Sticky bomb - not destroying as it needs to stay stuck until triggered");
        
        return stickyBomb;
    }
    
    // Handle shatterer bomb explosions
    handleShattererBomb(x, y) {
        // Create a large red explosion
        const explosion = this.scene.add.circle(x, y, 100, 0xcc3333, 0.8);
        
        // Shockwave effect
        const shockwave = this.scene.add.circle(x, y, 10, 0xffffff, 0.8);
        this.scene.tweens.add({
            targets: shockwave,
            radius: 150,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                shockwave.destroy();
            },
            onUpdate: (tween) => {
                // Manually update the circle size since radius isn't a standard property
                const radius = 10 + (150 - 10) * tween.progress;
                shockwave.setRadius(radius);
            }
        });
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 2.5,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles for impact effect
        const particles = this.scene.add.particles('impact_particle');
        const emitter = particles.createEmitter({
            speed: { min: 100, max: 300 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            angle: { min: 0, max: 360 },
            quantity: 50
        });
        
        // Emit particles in a single burst
        emitter.explode(50, x, y);
        
        // For Shatterer bomb, we'll handle block destruction differently to reflect its power
        this.destroyBlocksWithShatterer(x, y, 250);
        
        // Check for sticky bombs in a wide radius with high chance to trigger
        this.scene.triggerStickyBomb(x, y, 300);
        
        // Add a stronger camera shake
        this.scene.cameras.main.shake(500, 0.02);
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
            
            // Check if this was the last bomb after all effects complete
            this.checkLastBombResolution();
        });
        
        // Add explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.8, rate: 0.7 }); // Lower pitch for heavier sound
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Handle shrapnel bomb explosion
    handleShrapnelBomb(x, y) {
        console.log(`[BombUtils.handleShrapnelBomb] Creating explosion at (${x}, ${y})`);
        
        // Create initial small explosion at impact point
        this.createExplosion(x, y);
        
        // Destroy blocks in small radius at impact point
        this.destroyBlocksInRadius(x, y, 100);
        
        // Check for sticky bombs in initial explosion radius
        this.scene.triggerStickyBomb(x, y, 100);
        
        // Create 6-10 shrapnel fragments
        const numFragments = Phaser.Math.Between(6, 10);
        const maxDistance = 300; // Maximum distance fragments can travel
        
        console.log(`[BombUtils.handleShrapnelBomb] Creating ${numFragments} fragments`);
        
        // Track the number of completed fragments
        let completedFragments = 0;
        
        // Create fragments in all directions
        for (let i = 0; i < numFragments; i++) {
            // Calculate angle for even distribution
            const angle = (i / numFragments) * Math.PI * 2;
            
            // Add some random variation to angle
            const finalAngle = angle + (Math.random() - 0.5) * (Math.PI / 8);
            
            // Calculate random distance
            const distance = 100 + Math.random() * (maxDistance - 100);
            
            // Calculate fragment position
            const fragmentX = x + Math.cos(finalAngle) * distance;
            const fragmentY = y + Math.sin(finalAngle) * distance;
            
            // Add delay based on distance from center (fragments fly outward)
            const delay = (distance / maxDistance) * 500;
            
            // Create delayed fragment explosion
            this.scene.time.delayedCall(delay, () => {
                // Create fragment trail
                this.createFragmentTrail(x, y, fragmentX, fragmentY, delay);
                
                // Create mini explosion at fragment impact
                this.createMiniExplosion(fragmentX, fragmentY);
                
                // Destroy blocks in smaller radius
                this.destroyBlocksInRadius(fragmentX, fragmentY, 40);
                
                // Check for sticky bombs in fragment explosion
                this.scene.triggerStickyBomb(fragmentX, fragmentY, 40);
                
                // Track completed fragments
                completedFragments++;
                
                // If this was the last fragment, check if it was the last bomb
                if (completedFragments === numFragments) {
                    // Check if this was the last bomb after all fragments complete
                    this.checkLastBombResolution();
                }
            });
        }
        
        // Add camera shake for primary explosion
        this.scene.cameras.main.shake(300, 0.01);
    }
    
    // Create visual trail for shrapnel fragments
    createFragmentTrail(startX, startY, endX, endY, duration) {
        // Create a particle emitter for the trail
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        // Calculate direction vector
        const dirX = endX - startX;
        const dirY = endY - startY;
        
        // Number of trail points
        const numPoints = Math.min(20, Math.floor(duration / 25));
        
        // Create particle effects along the path
        for (let i = 0; i < numPoints; i++) {
            const t = i / (numPoints - 1); // 0 to 1
            const pointX = startX + dirX * t;
            const pointY = startY + dirY * t;
            
            const emitter = particles.createEmitter({
                x: pointX,
                y: pointY,
                speed: { min: 5, max: 20 },
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 300,
                blendMode: 'ADD',
                tint: 0xff6600, // Orange-ish for shrapnel
                quantity: 1
            });
            
            // Emit just one particle at this point
            emitter.explode(2, pointX, pointY);
        }
        
        // Destroy particles after effect is done
        this.scene.time.delayedCall(600, () => {
            particles.destroy();
        });
    }
    
    // Migrated and adapted from GameScene.js
    handleDrillerBomb(activeBombInstance, x, y, block, velocityX_param, velocityY_param) {
        if (!activeBombInstance || !activeBombInstance.scene) {
            console.warn("BombUtils.handleDrillerBomb: activeBombInstance is invalid or not in scene.");
            return null;
        }

        if (activeBombInstance.isCurrentlyDrilling) {
            console.log("BombUtils.handleDrillerBomb: Bomb instance is already drilling. Instance ID:", activeBombInstance.id || "N/A");
            return activeBombInstance.drillerData || null;
        }
        activeBombInstance.isCurrentlyDrilling = true; // Prevent re-entry

        console.log(`[BombUtils.handleDrillerBomb] Initializing Driller Bomb. Impact at (${x.toFixed(1)}, ${y.toFixed(1)}) on block:`, block);

        activeBombInstance.setStatic(true);
        activeBombInstance.setPosition(x, y); // Attach at impact point
        activeBombInstance.isDriller = true;  // Ensure flag is set
        activeBombInstance.hasExploded = false; // It's drilling, not exploded

        // Determine drilling direction from impact velocity
        let dirX = 0, dirY = -1; // Default upwards if no velocity
        const bodyVelocity = activeBombInstance.body ? activeBombInstance.body.velocity : null;

        if (bodyVelocity && (bodyVelocity.x !== 0 || bodyVelocity.y !== 0)) {
            const magnitude = Math.sqrt(bodyVelocity.x * bodyVelocity.x + bodyVelocity.y * bodyVelocity.y);
            dirX = bodyVelocity.x / magnitude;
            dirY = bodyVelocity.y / magnitude;
        } else if (velocityX_param !== undefined && velocityY_param !== undefined && (velocityX_param !== 0 || velocityY_param !== 0) ) {
            // Fallback to provided velocity parameters if body velocity is zero (e.g. if it became static too quickly)
            const magnitude = Math.sqrt(velocityX_param * velocityX_param + velocityY_param * velocityY_param);
            dirX = velocityX_param / magnitude;
            dirY = velocityY_param / magnitude;
            console.log(`[BombUtils.handleDrillerBomb] Using provided velocity for direction: dx=${dirX.toFixed(2)}, dy=${dirY.toFixed(2)}`);
        } else {
            console.warn("[BombUtils.handleDrillerBomb] No valid impact velocity, defaulting drill direction.");
        }

        // Calculate dynamic drill duration
        const launchPower = activeBombInstance.launchPower || 0;
        const MAX_DRAG_DISTANCE = this.scene.bombLauncher ? this.scene.bombLauncher.MAX_DRAG_DISTANCE : 200;
        const MIN_DRAG_DISTANCE_FOR_LAUNCH = 20; // From BombLauncher logic

        let normalizedPower = 0;
        if (MAX_DRAG_DISTANCE > MIN_DRAG_DISTANCE_FOR_LAUNCH) {
            normalizedPower = (launchPower - MIN_DRAG_DISTANCE_FOR_LAUNCH) / (MAX_DRAG_DISTANCE - MIN_DRAG_DISTANCE_FOR_LAUNCH);
        }
        normalizedPower = Math.max(0, Math.min(normalizedPower, 1)); // Clamp to 0-1

        const MIN_DRILL_DURATION = 500; // ms
        const MAX_DRILL_DURATION = 3000; // ms  MODIFIED FROM 4000
        const dynamicDuration = MIN_DRILL_DURATION + normalizedPower * (MAX_DRILL_DURATION - MIN_DRILL_DURATION);

        if (this.scene.debugMode) {
            console.log(`[BombUtils.handleDrillerBomb] Launch Power: ${launchPower.toFixed(1)}, Normalized: ${normalizedPower.toFixed(2)}, Calculated Duration: ${dynamicDuration.toFixed(0)}ms`);
        }

        const drillerData = {
            initialX: x,
            initialY: y,
            currentX: x, // Stores the logical position of the drill head
            currentY: y,
            dirX: dirX,
            dirY: dirY,
            isActive: true, // Drilling is active
            startTime: this.scene.time.now,
            duration: dynamicDuration, // Use calculated duration
            drillStepDistance: 10, // How far to move each drill interval
            drillInterval: 100, // Milliseconds per drill step (movement & damage check)
            blockTarget: block, // The initial block hit
            associatedBombInstance: activeBombInstance,
            hasCompletedDrilling: false,
            hasBeenTriggeredExternally: false,
            uniqueId: Phaser.Math.RND.uuid(),
            timer: null, // For the overall duration
            drillIntervalTimer: null // For the periodic drilling action
        };
        activeBombInstance.drillerData = drillerData;

        this.createDrillEffect(drillerData.currentX, drillerData.currentY); // Initial effect at impact

        const completeDrilling = () => {
            if (!drillerData.isActive && drillerData.hasCompletedDrilling) return; // Already handled

            console.log(`[BombUtils.completeDrilling] Driller ID ${drillerData.uniqueId} finished. Final pos: (${drillerData.currentX.toFixed(1)}, ${drillerData.currentY.toFixed(1)})`);
            drillerData.isActive = false; // No longer actively drilling
            drillerData.hasCompletedDrilling = true;

            if (drillerData.timer) {
                drillerData.timer.remove();
                drillerData.timer = null;
            }
            if (drillerData.drillIntervalTimer) {
                drillerData.drillIntervalTimer.remove();
                drillerData.drillIntervalTimer = null;
            }

            // The bomb GameObject (activeBombInstance) remains static at its last drilled position.
            // It does NOT explode here. It waits for an external trigger.
            console.log(`[BombUtils.completeDrilling] Driller ID ${drillerData.uniqueId} now dormant, awaiting external trigger.`);

            // No automatic resetBomb or game state check here. That's handled by external triggers or game over logic.
        };

        // Timer for the total 5-second drilling duration
        drillerData.timer = this.scene.time.addEvent({
            delay: drillerData.duration,
            callback: completeDrilling,
            callbackScope: this
        });

        // Timer for periodic drilling action (movement and damage)
        drillerData.drillIntervalTimer = this.scene.time.addEvent({
            delay: drillerData.drillInterval,
            callback: () => {
                if (!drillerData.isActive || drillerData.hasCompletedDrilling) {
                    if(drillerData.drillIntervalTimer) drillerData.drillIntervalTimer.remove();
                    return;
                }

                // Move the drill head's logical position
                drillerData.currentX += drillerData.dirX * drillerData.drillStepDistance;
                drillerData.currentY += drillerData.dirY * drillerData.drillStepDistance;

                // Update the visual position of the bomb GameObject
                if (drillerData.associatedBombInstance && drillerData.associatedBombInstance.scene) {
                    drillerData.associatedBombInstance.setPosition(drillerData.currentX, drillerData.currentY);
                }

                this.createDrillEffect(drillerData.currentX, drillerData.currentY);

                // Check for blocks in a small radius around the new drill head position
                const drillCheckRadius = drillerData.drillStepDistance * 0.75; // Check slightly less than one step
                if (this.scene.iceBlocks) {
                    this.scene.iceBlocks.forEach(iceBlock => {
                        if (iceBlock && iceBlock.isActive && iceBlock.scene) {
                            const distance = Phaser.Math.Distance.Between(drillerData.currentX, drillerData.currentY, iceBlock.x, iceBlock.y);
                            if (distance < drillCheckRadius + (iceBlock.width || 15) / 2) { // Consider block size
                                console.log(`[BombUtils.drillInterval] Driller ID ${drillerData.uniqueId} damaging block at (${iceBlock.x.toFixed(1)}, ${iceBlock.y.toFixed(1)})`);
                                if (typeof this.scene.damageIceBlock === 'function') {
                                    const destroyed = this.scene.damageIceBlock(iceBlock); // damageIceBlock should return true if destroyed
                                    if (destroyed && iceBlock === drillerData.blockTarget) {
                                        drillerData.blockTarget = null; // Original target gone
                                    }
        } else {
                                     console.warn("[BombUtils.drillInterval] scene.damageIceBlock is not available.");
                                     // Fallback: attempt direct destruction if damageIceBlock is missing
                                     this.destroyIceBlock(iceBlock);
                                      if (iceBlock === drillerData.blockTarget) drillerData.blockTarget = null;
                                }
                            }
                        }
                    });
                }

                // If initial target block is destroyed (and was not nullified yet)
                if (drillerData.blockTarget && (!drillerData.blockTarget.scene || !drillerData.blockTarget.isActive)) {
                    drillerData.blockTarget = null;
                }

            },
            callbackScope: this,
            loop: true
        });

        if (!this.scene.activeDrillerBombs) {
            this.scene.activeDrillerBombs = [];
        }
        this.scene.activeDrillerBombs.push(drillerData);
        console.log(`[BombUtils.handleDrillerBomb] Driller bomb ${drillerData.uniqueId} added to activeDrillerBombs. Count: ${this.scene.activeDrillerBombs.length}`);

        // Clear the main bomb reference in BombLauncher/GameScene so a new bomb can be prepared.
        // The drillerBomb (activeBombInstance) is now managed by its drillerData.
        if (this.scene.bombLauncher) {
            if (this.scene.bombLauncher.bomb === activeBombInstance) {
                this.scene.bombLauncher.bomb = null;
            }
            if (this.scene.bombLauncher.bombState) {
                 this.scene.bombLauncher.bombState.active = false;
            }
        }
        if (this.scene.bomb === activeBombInstance) {
            this.scene.bomb = null;
        }


        return drillerData;
    }

   
    
    // Create a small fizzle effect when a bomb misses
    createFizzleEffect(x, y) {
        // Create a small particle effect for a "fizzle" or "failure"
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6); // Same depth as other effects
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 60 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            tint: 0xaaaaaa // Gray particles for a "fizzle"
        });
        
        // Emit particles at bomb position
        emitter.explode(15, x, y);
        
        // Small "fizzle" sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const fizzleSound = this.scene.sound.add('fizzle', { volume: 0.3 });
                fizzleSound.play();
            } catch (e) {
                console.log("Fizzle sound not available:", e);
                // Try to use an existing sound at a different rate as a fallback
                try {
                    const fallbackSound = this.scene.sound.add('explosion');
                    fallbackSound.play({ volume: 0.2, rate: 0.5 });
                } catch (e) {
                    console.log("Fallback sound not available either");
                }
            }
        }
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        return particles;
    }
    
    // Create a larger explosion effect for sticky bombs
    createLargeExplosion(x, y) {
        // Create a larger explosion effect for sticky bombs
        const explosion = this.scene.add.circle(x, y, 120, 0xff77cc, 0.8);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 3, // Larger scale
            duration: 500, // Longer duration
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add more particles for a bigger effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 80, max: 250 }, // Faster particles
            scale: { start: 1.5, end: 0 }, // Larger particles
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD',
            tint: 0xff77cc // Pink tint for sticky bomb explosions
        });
        
        // Emit more particles
        emitter.explode(50, x, y);
        
        // Add a larger flash effect
        const flash = this.scene.add.circle(x, y, 150, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Clean up particles after use
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // Add a stronger camera shake
        this.scene.cameras.main.shake(400, 0.015);
        
        // Add explosion sound with lower pitch for bigger boom
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.6, rate: 0.6 });
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Create a driller explosion effect
    createDrillerExplosion(x, y) {
        // Large explosion for driller bombs when triggered
        console.log(`[BombUtils.createDrillerExplosion] Triggered at (${x.toFixed(1)}, ${y.toFixed(1)})`);
        const explosion = this.scene.add.circle(x, y, 150, 0xBB5500, 0.8);
        explosion.setDepth(6);
        
        // Animate the explosion
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 3,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Add particles for a bigger effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 100, max: 300 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 1200,
            blendMode: 'ADD',
            tint: 0xBB5500
        });
        
        // Emit more particles
        emitter.explode(60, x, y);
        
        // Add a larger flash effect
        const flash = this.scene.add.circle(x, y, 200, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Destroy blocks in a wider radius
        this.destroyBlocksInRadius(x, y, 360);
        
        // Play an explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.6 });
            } catch (e) {
                console.log("Explosion sound not available:", e);
            }
        }
        
        // Camera shake for impact
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(300, 0.02);
        }
    }
    
    // Create a bounce trail effect for bombs bounced off bouncy blocks
    createBounceTrail(bomb) {
        if (!bomb || !bomb.scene) return;
        
        // Create trail particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            lifespan: 300,
            speed: { min: 5, max: 20 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            tint: 0x88ddff, // Light blue for bounce trail
            frequency: 20, // Emit a particle every 20ms
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 5),
                quantity: 1
            }
        });
        
        // Track the bomb to emit particles
        emitter.startFollow(bomb);
        
        // Clean up particles if bomb is destroyed
        this.scene.time.delayedCall(1200, () => {
            if (particles && particles.scene) {
                particles.destroy();
            }
        });
        
        // Remove the trail after a short time (if bomb hasn't exploded yet)
        this.scene.time.delayedCall(800, () => {
            if (emitter && emitter.manager && emitter.manager.scene) {
                emitter.stopFollow();
                emitter.stop();
            }
        });
        
        return particles;
    }
    
    // Clean up bomb resources to prevent memory leaks
    cleanupBombResources(bomb) {
        try {
            // Clean up visual effects with error handling
            if (bomb.visualEffect) {
                if (bomb.visualEffect.scene) {
                    bomb.visualEffect.destroy();
                }
                bomb.visualEffect = null;
            }
            
            if (bomb.particles) {
                if (bomb.particles.scene) {
                    bomb.particles.destroy();
                }
                bomb.particles = null;
            }
            
            // Destroy the bomb sprite if it exists on a nested property
            if (bomb.bombSprite) {
                if (bomb.bombSprite.scene) {
                    bomb.bombSprite.destroy();
                }
                bomb.bombSprite = null;
            }
            
            // Clean up any tweens that might be running on bomb elements
            if (bomb.visualEffect) this.scene.tweens.killTweensOf(bomb.visualEffect);
            if (bomb.bombSprite) this.scene.tweens.killTweensOf(bomb.bombSprite);
            
            // If any emitters are stored directly on the bomb
            if (bomb.emitter) {
                if (bomb.emitter.manager && bomb.emitter.manager.scene) {
                    bomb.emitter.stop();
                    // Consider if emitter.remove() is needed depending on how it's structured
                }
                bomb.emitter = null;
            }

            // Directly destroy the 'bomb' object itself if it's a valid GameObject
            // This handles cases like the driller bomb's associatedBombInstance directly.
            if (bomb && typeof bomb.destroy === 'function' && bomb.scene) {
                console.log(`[BombUtils.cleanupBombResources] Directly destroying object (e.g., bomb sprite): ${bomb.texture ? bomb.texture.key : (bomb.constructor ? bomb.constructor.name : 'Unknown type')}`);
                bomb.destroy();
            }

        } catch (error) {
            console.error(`Error cleaning up bomb resources:`, error);
        }
    }
    
    // Generic explosion effect
    createExplosion(x, y) {
        if (!this.scene) return;
        
        // Create visual explosion effect
        const explosion = this.scene.add.circle(x, y, 80, 0xff5500, 0.8);
        explosion.setDepth(6);
        
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
        
        // Add some particles for more effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            blendMode: 'ADD'
        });
        
        // Emit particles at explosion point
        emitter.explode(30, x, y);
        
        // Create a flash effect
        const flash = this.scene.add.circle(x, y, 100, 0xffffff, 1);
        flash.setDepth(6);
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Destroy the particle system after emissions complete
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
        
        // Add a camera shake effect
        this.scene.cameras.main.shake(300, 0.01);
        
        // Add explosion sound if available
        if (this.scene.sound && this.scene.sound.add) {
            try {
                const explosionSound = this.scene.sound.add('explosion');
                explosionSound.play({ volume: 0.5 });
            } catch (e) {
                console.log("Sound not available:", e);
            }
        }
    }
    
    // Create mini explosion effect for cluster bombs
    createMiniExplosion(x, y) {
        if (!this.scene) return;
        
        // Create smaller visual explosion effect
        const explosion = this.scene.add.circle(x, y, 40, 0xffdd44, 0.7);
        explosion.setDepth(6);
        
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
        
        // Add some particles for more effect
        const particles = this.scene.add.particles('mini_particle');
        particles.setDepth(6);
        
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
        
        // Add a small camera shake
        this.scene.cameras.main.shake(150, 0.005);
    }
    
    createDrillEffect(x, y) {
        if (!this.scene) { 
            console.warn("BombUtils.createDrillEffect: Scene not available!");
                return;
            }
        // Create a drill dust effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            speed: { min: 30, max: 80 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 500,
            blendMode: 'ADD',
            tint: [0xBB5500, 0xCCCCCC] // Brown/orange and gray for drill dust
        });
        
        emitter.explode(10, x, y);
        
        this.scene.time.delayedCall(500, () => {
            if (particles && particles.scene) {
                 particles.destroy();
            }
        });
        
        if (this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(100, 0.003);
        }
    }
 
    
    // Handle ricochet bomb hitting world boundaries
    handleRicochetBoundaryHit(bomb) {
        try {
            // Safety checks - make sure we have a valid bomb and it hasn't exploded
            if (!bomb || !bomb.scene || !bomb.body || bomb.hasExploded) {
                console.log("Invalid bomb state in handleRicochetBoundaryHit, skipping");
                return;
            }
            
            // Increment bounce count
            bomb.bounceCount = (bomb.bounceCount || 0) + 1;
            
            // Create a bounce flash at the bomb's position
            this.createBounceFlash(bomb.x, bomb.y);
            
            // NEW: Destroy blocks at bounce point with a small radius
            if (this.scene.destroyBlocksInRadius) {
                console.log(`[BombUtils.handleRicochetBoundaryHit] Destroying blocks at bounce point (${bomb.x}, ${bomb.y})`);
                this.destroyBlocksInRadius(bomb.x, bomb.y, 40); // Small radius for ricochet collision
                
                // Check if this collision destroyed any blocks
                if (this.scene.triggerStickyBomb) {
                    this.scene.triggerStickyBomb(bomb.x, bomb.y, 40); // Also trigger any nearby sticky bombs
                }
            }
            
            // Ensure the bomb maintains sufficient velocity after boundary hit
            // Drastically reduced for gentler bounces
            const minSpeed = 25;  // Reduced from 250 to 25
            const maxSpeed = 40;  // Reduced from 400 to 40
            
            // Only proceed if body has velocity
            if (bomb.body && bomb.body.velocity) {
                try {
                    const vx = bomb.body.velocity.x;
                    const vy = bomb.body.velocity.y;
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    
                    if (speed < minSpeed) {
                        // Scale velocity to ensure minimum speed
                        const scale = minSpeed / Math.max(speed, 1);
                        bomb.setVelocity(vx * scale, vy * scale);
                    } else if (speed > maxSpeed) {
                        // Cap maximum speed
                        const scale = maxSpeed / speed;
                        bomb.setVelocity(vx * scale, vy * scale);
                    }
                } catch (e) {
                    console.warn("Error adjusting bomb velocity:", e);
                    // Fallback - set a safe velocity if there was an error
                    try {
                        bomb.setVelocity(20, 20);
                    } catch (e2) {
                        console.error("Failed to set fallback velocity:", e2);
                    }
                }
            }
            
            // Play bounce sound
            if (this.scene && this.scene.sound && this.scene.sound.add) {
                try {
                    const bounceSound = this.scene.sound.add('bouncesound');
                    bounceSound.play({ volume: 0.2 });
                } catch (e) {
                    console.log("Sound not available:", e);
                }
            }
            
            // Update the countdown text position if it exists
            if (bomb.countdownText && bomb.countdownText.scene) {
                try {
                    bomb.countdownText.setPosition(bomb.x, bomb.y - 30);
                } catch (e) {
                    console.warn("Error updating countdown text position:", e);
                }
            }
            
                // NOTE: We're disabling the bounce limit check completely 
    // Ricochet bombs will now only explode when the 3-second timer expires
    // They also destroy blocks on collision with non-border elements
            
            /*
            // Check if we've reached the bounce limit (original code - disabled)
            const timeSinceLaunch = Date.now() - (bomb.launchTime || 0);
            if (bomb.bounceCount >= 15 && !bomb.hasExploded && timeSinceLaunch > 1000) {
                console.log("Bounce limit reached, exploding ricochet bomb");
                this.explodeRicochetBomb(bomb);
            }
            */
        } catch (error) {
            console.error("Error in handleRicochetBoundaryHit:", error);
            
            // If there's an error, try to explode the bomb to recover
            if (bomb && bomb.scene && !bomb.hasExploded) {
                try {
                    console.log("Forcing explosion due to error in boundary hit handler");
                    this.explodeRicochetBomb(bomb);
                } catch (e) {
                    console.error("Failed to explode bomb in error recovery:", e);
                }
            }
        }
    }
    
    // Create a ricochet trail effect
    createRicochetTrail(bomb) {
        if (!this.scene || !bomb) return null;
        
        // Create particle emitter for the ricochet trail
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            lifespan: 400,
            speed: { min: 5, max: 15 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            tint: 0x00FFFF, // Cyan for ricochet
            frequency: 15, // Emit particles more frequently than regular bounce
            emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, 8),
                quantity: 2
            }
        });
        
        // Track the bomb to emit particles
        emitter.startFollow(bomb);
        
        // Store the emitter on the bomb for later reference
        bomb.trailEmitter = emitter;
        
        // Store particles on the bomb for cleanup
        bomb.trailParticles = particles;
        
        return particles;
    }
    
    // Create a flash effect at bounce point
    createBounceFlash(x, y) {
        if (!this.scene) return;
        
        // Create a small flash circle
        const flash = this.scene.add.circle(x, y, 25, 0x00FFFF, 0.8);
        flash.setDepth(5);
        
        // Animate it
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2.5,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Add some tiny particles
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5);
        
        const emitter = particles.createEmitter({
            speed: { min: 40, max: 120 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            tint: 0x00FFFF, // Cyan for ricochet
            quantity: 15
        });
        
        // Emit particles at bounce point
        emitter.explode(15, x, y);
        
        // Add a small concentric ring effect
        const ring = this.scene.add.circle(x, y, 5, 0x00FFFF, 0);
        ring.setStrokeStyle(2, 0x00FFFF, 1);
        ring.setDepth(5);
        
        this.scene.tweens.add({
            targets: ring,
            scale: 5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Destroy particles after they're done
        this.scene.time.delayedCall(500, () => {
            if (particles && particles.scene) {
                particles.destroy();
            }
        });
    }
    
    // Explode the ricochet bomb
    explodeRicochetBomb(bomb) {
        try {
            // Safety check: Ensure bomb exists and hasn't already exploded
            if (!bomb || !bomb.scene || bomb.hasExploded) {
                console.log("[BombUtils.explodeRicochetBomb] Bomb already exploded or invalid, skipping explosion", { 
                    bombExists: !!bomb, 
                    inScene: bomb ? !!bomb.scene : false, 
                    hasExploded: bomb ? bomb.hasExploded : 'N/A'
                });
                return; 
            }

            // --- CAPTURE POSITION BEFORE DESTRUCTION ---
            const explosionX = bomb.x;
            const explosionY = bomb.y;
            console.log(`[BombUtils.explodeRicochetBomb] Captured explosion position: (${explosionX.toFixed(1)}, ${explosionY.toFixed(1)})`);
            // --- END CAPTURE ---

            // Mark as exploded *now* to prevent re-entry or race conditions
            bomb.hasExploded = true;

            // Destroy the bomb GameObject itself if it's still in the scene
            if (bomb.scene) {
                console.log("[BombUtils.explodeRicochetBomb] Destroying ricochet bomb GameObject.");
                bomb.destroy(); 
            }

            console.log(`[BombUtils.explodeRicochetBomb] Exploding ricochet bomb at (${explosionX.toFixed(1)}, ${explosionY.toFixed(1)})`); // USE CAPTURED VALUES
            
            let explosionEffectSuccessfullyCalled = false; // Define the variable here
            // --- REVISED EXPLOSION HANDLING ---
            try {
                console.log("[BombUtils.explodeRicochetBomb] Calling this.createLargeExplosion...");
                this.createLargeExplosion(explosionX, explosionY); // Call own method for visual/audio
                console.log("[BombUtils.explodeRicochetBomb] ... this.createLargeExplosion finished.");

                console.log("[BombUtils.explodeRicochetBomb] Calling this.destroyBlocksInRadius...");
                // Calls own destroyBlocksInRadius method
                this.destroyBlocksInRadius(explosionX, explosionY, 150); 
                console.log("[BombUtils.explodeRicochetBomb] ... this.destroyBlocksInRadius finished.");
                
                console.log("[BombUtils.explodeRicochetBomb] Calling this.scene.triggerStickyBomb...");
                if (typeof this.scene.triggerStickyBomb === 'function') {
                    // scene.triggerStickyBomb is correct as it coordinates across different bomb types
                    this.scene.triggerStickyBomb(explosionX, explosionY, 150); 
                    console.log("[BombUtils.explodeRicochetBomb] ... this.scene.triggerStickyBomb finished.");
                } else {
                    console.warn("[BombUtils.explodeRicochetBomb] this.scene.triggerStickyBomb is not a function!");
                }
                explosionEffectSuccessfullyCalled = true; // Assuming success if no errors
            } catch (explosionError) {
                console.error("[BombUtils.explodeRicochetBomb] Error during revised explosion handling:", explosionError);
                explosionEffectSuccessfullyCalled = false;
            }
            // --- END REVISED EXPLOSION HANDLING ---
            
             console.log(`[BombUtils.explodeRicochetBomb] Explosion effect handled: ${explosionEffectSuccessfullyCalled}. Starting cleanup...`);
            
            // Cleanup bomb resources (timer, text, trail, etc.)
             if (bomb.countdownTimer) {
                bomb.countdownTimer.remove();
            }
            
            if (bomb.countdownText && bomb.countdownText.scene) {
                bomb.countdownText.destroy();
            }
            
            if (bomb.bounceTrail) {
                bomb.bounceTrail.destroy();
            }
            
            if (bomb.trailParticles) {
                bomb.trailParticles.destroy();
            }
            
            // Update bomb state in launcher as well
            if (this.scene.bombLauncher && this.scene.bombLauncher.bombState) {
                this.scene.bombLauncher.bombState.active = false;
            }
            
            // Force reset the game state
            // RETHINK: Exploding a ricochet bomb shouldn't necessarily force a full game state reset.
            // It should allow the game to continue, reset the current bomb, and check win/loss.
            // The original forceResetGameState was too aggressive.
            // Let's schedule a standard bomb reset.
            if (this.scene.shotsRemaining > 0 && typeof this.scene.resetBomb === 'function') {
                this.scene.time.delayedCall(100, this.scene.resetBomb, [], this.scene);
            } else if (typeof this.scene.checkLevelCompletion === 'function') {
                this.scene.time.delayedCall(100, this.scene.checkLevelCompletion, [], this.scene);
            }
        } catch (error) {
            console.error("Error in explodeRicochetBomb:", error);
            
            // Recovery: If error occurred, make sure to null the scene's bomb reference
            if (this.scene) {
                if (this.scene.bomb === bomb) {
                    this.scene.bomb = null;
                }
                
                // Update bomb state in launcher as well
                if (this.scene.bombLauncher && this.scene.bombLauncher.bombState) {
                    this.scene.bombLauncher.bombState.active = false;
                }
                
                // Force reset the game state
                // RETHINK: Same as above, avoid overly aggressive reset.
                if (this.scene.shotsRemaining > 0 && typeof this.scene.resetBomb === 'function') {
                    this.scene.time.delayedCall(100, this.scene.resetBomb, [], this.scene);
                } else if (typeof this.scene.checkLevelCompletion === 'function') {
                    this.scene.time.delayedCall(100, this.scene.checkLevelCompletion, [], this.scene);
                }
            }
        }
    }

    // Add a countdown indicator to ricochet bomb
    addRicochetCountdown(bomb) {
        if (!this.scene || !bomb) return;
        
        console.log("Adding countdown timer to ricochet bomb");
        
        // Create the countdown text
        const countdownText = this.scene.add.text(
            bomb.x, 
            bomb.y - 30, 
            '3', 
            { 
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#00FFFF',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        countdownText.setOrigin(0.5, 0.5);
        countdownText.setDepth(10);
        
        // Store reference on the bomb
        bomb.countdownText = countdownText;
        
        // Store the exact explosion time - 3 seconds from now
        bomb.explosionTime = Date.now() + 3000;
        bomb.countdownStarted = Date.now();
        
        // Store a reference to this for the timer
        const self = this;
        
        // This function updates the timer text position every frame to follow the bomb
        const followBomb = function() {
            // Make sure bomb and text still exist
            if (bomb && bomb.scene && countdownText && countdownText.scene) {
                // Update position to follow the bomb
                countdownText.setPosition(bomb.x, bomb.y - 30);
                
                // Continue following in the next frame if the bomb still exists and hasn't exploded
                if (!bomb.hasExploded) {
                    self.scene.time.delayedCall(1, followBomb);
                }
            }
        };
        
        // Start following the bomb immediately and continuously
        followBomb();
        
        // Create a direct method for updating the countdown
        const updateCountdown = function() {
            // Only proceed if bomb and text still exist
            if (!countdownText || !countdownText.scene) {
                console.log("Countdown text no longer exists, stopping countdown");
                return;
            }
            
            if (!bomb || !bomb.scene || bomb.hasExploded) {
                console.log("Bomb no longer exists or has exploded, stopping countdown");
                return;
            }
            
            // Calculate the exact time remaining until explosion
            const currentTime = Date.now();
            const timeRemaining = bomb.explosionTime - currentTime;
            const secondsLeft = Math.ceil(timeRemaining / 1000);
            
            // Log the remaining time with more precision for debugging
            console.log(`Ricochet countdown: ${secondsLeft} seconds left (exact ms remaining: ${timeRemaining}ms)`);
            
            // Make sure we never go below 0
            const displaySeconds = Math.max(secondsLeft, 0);
            
            // Update text with the current remaining seconds
            countdownText.setText(displaySeconds.toString());
            
            // Make text pulse on each second
            self.scene.tweens.add({
                targets: countdownText,
                scale: 1.5,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeOut'
            });
            
            // Change color as time decreases
            if (displaySeconds <= 2) {
                countdownText.setColor('#FF0000'); // Red for last 2 seconds
            } else if (displaySeconds <= 3) {
                countdownText.setColor('#FFFF00'); // Yellow for 3 seconds
            }
            
            // Continue countdown if we still have time left
            if (timeRemaining > 0 && !bomb.hasExploded) {
                // Schedule next update at exact millisecond for next second change
                const timeToNextSecond = timeRemaining % 1000;
                const nextUpdateTime = timeToNextSecond > 0 ? timeToNextSecond : 1000;
                bomb.countdownTimer = self.scene.time.delayedCall(nextUpdateTime, updateCountdown);
            } else if (timeRemaining <= 0 && !bomb.hasExploded) {
                // Time's up - explode the bomb if it hasn't already
                console.log("Countdown reached exactly 3 seconds, triggering explosion");
                self.explodeRicochetBomb(bomb);
            }
        };
        
        // Store the countdown reference for cleanup later
        bomb.countdownFunc = updateCountdown;
        
        // Start the countdown
        updateCountdown();
    }

    /**
     * Destroys an ice block with visual effects
     * This method is moved from GameScene.js
     * @param {Phaser.Physics.Matter.Image} block The block to destroy
     */
    destroyIceBlock(block) {
        if (!block) {
            console.warn("[BombUtils.destroyIceBlock] Attempted to destroy a null block.");
            return;
        }
        // Mark block as inactive
        block.isActive = false;
        
        // Create shatter effect using BlockUtils from the scene
        if (this.scene.blockUtils && typeof this.scene.blockUtils.createBlockShatter === 'function') {
            this.scene.blockUtils.createBlockShatter(block);
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene.blockUtils.createBlockShatter is not available.");
        }
        
        // Remove the physics body from the world
        if (block.body) {
            try {
                this.scene.matter.world.remove(block.body);
            } catch (e) {
                console.warn("[BombUtils.destroyIceBlock] Error removing block body:", e);
            }
        }
        
        // Hide the original block
        block.setVisible(false);
        
        // Handle the blue veil dissipation by calling the scene's method
        if (this.scene && typeof this.scene._fadeOutBlockVeil === 'function') {
            this.scene._fadeOutBlockVeil(block);
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene._fadeOutBlockVeil is not available.");
        }
        
        // If it's a dynamite block, remove from dynamite blocks array in the scene
        if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE && this.scene.dynamiteBlocks) {
            this.scene.dynamiteBlocks = this.scene.dynamiteBlocks.filter(b => b !== block);
        }
        
        // Special effects based on block type
        if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
            // Dynamite blocks get additional particle effects
            if (this.scene.blockUtils && typeof this.scene.blockUtils.createDynamiteDestroyEffect === 'function') {
                this.scene.blockUtils.createDynamiteDestroyEffect(block.x, block.y);
            } else {
                console.warn("[BombUtils.destroyIceBlock] scene.blockUtils.createDynamiteDestroyEffect is not available.");
            }
        }
        
        // Ensure chibi image remains fully opaque (handled by scene)
        if (this.scene.chibiImage) {
            this.scene.chibiImage.setAlpha(1);
        }
        
        // Update revealed percentage and check progress by calling the scene's method
        if (this.scene && typeof this.scene._updateRevealProgress === 'function') {
            this.scene._updateRevealProgress();
        } else {
            console.warn("[BombUtils.destroyIceBlock] scene._updateRevealProgress is not available.");
        }
    }

    /**
     * Destroys blocks within a radius of the explosion
     * @param {number} x X position of the explosion
     * @param {number} y Y position of the explosion
     * @param {number} radius Radius of the explosion
     */
    destroyBlocksInRadius(x, y, radius) {
        if (!this.scene.iceBlocks) return;
        
        // Create lists to track blocks by different categories
        const blocksToDestroy = [];
        const blocksToDamage = [];
        const dynamiteToTrigger = [];
        
        // Categorize blocks based on type and distance
        this._categorizeBlocksByDistance(x, y, radius, blocksToDestroy, blocksToDamage, dynamiteToTrigger);
        
        // Process each category of blocks
        this._processBlockDestruction(blocksToDestroy);
        this._processBlockDamage(blocksToDamage);
        this._processDynamiteTriggers(dynamiteToTrigger);
        
        // Clean up the iceBlocks array after a delay
        this.scene.time.delayedCall(1000, () => {
            // Ensure cleanupIceBlocksArray exists on the scene
            if (this.scene.cleanupIceBlocksArray && typeof this.scene.cleanupIceBlocksArray === 'function') {
                this.scene.cleanupIceBlocksArray();
            } else {
                console.warn('[BombUtils.destroyBlocksInRadius] this.scene.cleanupIceBlocksArray is not a function or does not exist.');
            }
        });
    }
    
    /**
     * Categorizes blocks based on distance from explosion center and block type
     * @private
     * @param {number} x X position of the explosion
     * @param {number} y Y position of the explosion
     * @param {number} radius Radius of the explosion
     * @param {Array} blocksToDestroy Array to store blocks that should be destroyed
     * @param {Array} blocksToDamage Array to store blocks that should be damaged
     * @param {Array} dynamiteToTrigger Array to store dynamite blocks to trigger
     */
    _categorizeBlocksByDistance(x, y, radius, blocksToDestroy, blocksToDamage, dynamiteToTrigger) {
        // Check distance of each block from explosion center
        this.scene.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                if (distance < radius) {
                    if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
                        // Add dynamite blocks to a special trigger list
                        // with a short delay so they explode sequentially
                        const delay = (distance / radius) * 50; // shorter delay for chain reactions
                        dynamiteToTrigger.push({ block, delay });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.BOUNCY) {
                        // Bouncy blocks don't get destroyed, they reflect bombs
                        // However, we'll add a visual indication they were hit
                        this.scene.time.delayedCall(10, () => {
                            // Ensure blockUtils and createBouncyHitEffect exist on the scene
                            if (this.scene.blockUtils && typeof this.scene.blockUtils.createBouncyHitEffect === 'function') {
                                this.scene.blockUtils.createBouncyHitEffect(block.x, block.y);
                            } else {
                                console.warn('[BombUtils._categorizeBlocksByDistance] this.scene.blockUtils.createBouncyHitEffect is not a function or does not exist.');
                            }
                        });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.ETERNAL || 
                               block.blockType === this.scene.blockTypes.TYPES.STRONG) {
                        // Add multi-hit blocks to damage list
                        const delay = (distance / radius) * 100;
                        blocksToDamage.push({ block, delay });
                    } else {
                        // Regular blocks get destroyed
                        const delay = (distance / radius) * 100;
                        blocksToDestroy.push({ block, delay });
                    }
                }
            }
        });
    }
    
    /**
     * Processes destruction of regular blocks with delays
     * @private
     * @param {Array} blocksToDestroy Array of blocks to destroy
     */
    _processBlockDestruction(blocksToDestroy) {
        blocksToDestroy.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    this.destroyIceBlock(block); // Calls the method within BombUtils
                }
            });
        });
    }
    
    /**
     * Processes damage to stronger blocks with delays
     * @private
     * @param {Array} blocksToDamage Array of blocks to damage
     */
    _processBlockDamage(blocksToDamage) {
        blocksToDamage.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Ensure damageIceBlock exists on the scene
                    if (this.scene.damageIceBlock && typeof this.scene.damageIceBlock === 'function') {
                        this.scene.damageIceBlock(block);
                    } else {
                        console.warn('[BombUtils._processBlockDamage] this.scene.damageIceBlock is not a function or does not exist.');
                    }
                }
            });
        });
    }
    
    /**
     * Processes dynamite blocks triggering chain reactions
     * @private
     * @param {Array} dynamiteToTrigger Array of dynamite blocks to trigger
     */
    _processDynamiteTriggers(dynamiteToTrigger) {
        dynamiteToTrigger.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Create explosion at dynamite location
                    // Ensure blockUtils and createExplosion exist on the scene
                    if (this.scene.blockUtils && typeof this.scene.blockUtils.createExplosion === 'function') {
                        this.scene.blockUtils.createExplosion(block.x, block.y);
                    } else {
                        console.warn('[BombUtils._processDynamiteTriggers] this.scene.blockUtils.createExplosion is not a function or does not exist.');
                    }
                    
                    // Destroy the dynamite block
                    this.destroyIceBlock(block); // Calls the method within BombUtils
                    
                    // Destroy additional blocks in radius
                    this.destroyBlocksInRadius(block.x, block.y, 120); // Calls the method within BombUtils
                }
            });
        });
    }

    // Migrated and adapted from GameScene.js - THIS IS THE DEFINITION
    // New method to handle the special destruction properties of the Shatterer bomb
    destroyBlocksWithShatterer(x, y, radius) {
        if (!this.scene.iceBlocks) return;
        
        // Create a list to track blocks to be destroyed
        const blocksToDestroy = [];
        const dynamiteToTrigger = [];
        
        // Check distance of each block from explosion center
        this.scene.iceBlocks.forEach(block => {
            if (block && block.isActive) {
                const distance = Phaser.Math.Distance.Between(x, y, block.x, block.y);
                
                if (distance < radius) {
                    if (block.blockType === this.scene.blockTypes.TYPES.DYNAMITE) {
                        // Add dynamite blocks to a special trigger list
                        const delay = (distance / radius) * 50; // shorter delay for chain reactions
                        dynamiteToTrigger.push({ block, delay });
                    } else if (block.blockType === this.scene.blockTypes.TYPES.BOUNCY) {
                        // Bouncy blocks don't get destroyed by Shatterer either, just show they were hit
                        this.scene.time.delayedCall(10, () => {
                            if (this.scene.blockUtils) {
                                this.scene.blockUtils.createBouncyHitEffect(block.x, block.y);
                            }
                        });
                    } else {
                        // All other blocks (including Eternal and Strong) get destroyed in one hit
                        // by the Shatterer bomb
                        const delay = (distance / radius) * 100;
                        blocksToDestroy.push({ block, delay });
                    }
                }
            }
        });
        
        // Process block destruction with delays
        blocksToDestroy.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // If Eternal or Strong, play special effect before destruction
                    if (block.blockType === this.scene.blockTypes.TYPES.ETERNAL || block.blockType === this.scene.blockTypes.TYPES.STRONG) {
                        if (this.scene.blockUtils) {
                           this.scene.blockUtils.createShattererImpactEffect(block.x, block.y);
                        }
                    }
                    this.destroyIceBlock(block); // Correct (calls own method)
                }
            });
        });
        
        // Process dynamite triggers with delays
        dynamiteToTrigger.forEach(({ block, delay }) => {
            this.scene.time.delayedCall(delay, () => {
                if (block && block.isActive) {
                    // Create explosion at dynamite location
                    if (this.scene.blockUtils) {
                        this.scene.blockUtils.createExplosion(block.x, block.y);
                    }
                    
                    // Destroy the dynamite block
                    this.destroyIceBlock(block); // Correct (calls own method)
                    
                    // Destroy additional blocks in radius
                    this.destroyBlocksInRadius(block.x, block.y, 120); // Corrected (calls own method)
                }
            });
        });
        
        // Clean up the iceBlocks array after a delay
        this.scene.time.delayedCall(1000, () => {
            if (typeof this.scene.cleanupIceBlocksArray === 'function') {
                 this.scene.cleanupIceBlocksArray();
            } else {
                console.warn("BombUtils.destroyBlocksWithShatterer: this.scene.cleanupIceBlocksArray is not a function.");
            }
        });
    }

    // Handle Melter Bomb - applies melting effect without immediate damage
    handleMelterBomb(x, y, block) {
        console.log(`[BombUtils.handleMelterBomb] Creating melt effect at (${x}, ${y})`);
        
        // If no block to melt, find closest block instead of falling back to blast bomb
        if (!block || !block.isActive) {
            console.log("[BombUtils.handleMelterBomb] No direct hit block, searching for nearby blocks");
            
            // Find closest block within a reasonable radius
            let closestBlock = null;
            let closestDistance = 150; // Maximum search radius
            
            if (this.scene.iceBlocks && this.scene.iceBlocks.length > 0) {
                this.scene.iceBlocks.forEach(iceBlock => {
                    if (iceBlock && iceBlock.isActive) {
                        const distance = Phaser.Math.Distance.Between(x, y, iceBlock.x, iceBlock.y);
                        if (distance < closestDistance) {
                            closestDistance = distance;
                            closestBlock = iceBlock;
                        }
                    }
                });
            }
            
            if (closestBlock) {
                console.log(`[BombUtils.handleMelterBomb] Found closest block at distance ${closestDistance.toFixed(1)}`);
                block = closestBlock;
                // Adjust impact position to block's position for visual effect
                x = block.x;
                y = block.y;
            } else {
                // No block found within radius - create impact effect anyway
                console.log("[BombUtils.handleMelterBomb] No blocks found within radius, showing impact effect");
                this.createMeltImpactEffect(x, y);
                
                // Check if this was the last bomb and notify the game state manager
                this.checkLastBombResolution();
                
                return; // No blocks to melt, early exit
            }
        }
        
        // Create enhanced visual effect at impact point (NO EXPLOSION, just visual splash)
        this.createMeltImpactEffect(x, y);
        
        // Determine the target block type to melt
        const targetBlockType = block.blockType;
        console.log(`[BombUtils.handleMelterBomb] Target block type: ${targetBlockType}`);
        
        // Find up to 30 blocks of the same type within range
        const maxBlocksToMelt = 30;
        const melterRadius = 250; // Search radius for same-type blocks (can be adjusted)
        const blocksToMelt = [];
        
        // Add the initial hit block first
        blocksToMelt.push(block);
        
        // Find other blocks of the SAME TYPE
        if (this.scene.iceBlocks) {
            this.scene.iceBlocks.forEach(iceBlock => {
                if (iceBlock && iceBlock.isActive && iceBlock !== block &&
                    iceBlock.blockType === targetBlockType) { // Only same type
                    const distance = Phaser.Math.Distance.Between(x, y, iceBlock.x, iceBlock.y);
                    if (distance < melterRadius) {
                        blocksToMelt.push(iceBlock);
                    }
                }
            });
        }
        
        // Limit to max blocks
        const actualBlocksToMelt = blocksToMelt.slice(0, maxBlocksToMelt);
        console.log(`[BombUtils.handleMelterBomb] Found ${actualBlocksToMelt.length} blocks of type ${targetBlockType} to melt`);
        
        // Create visual path effect connecting the blocks being melted
        this.createMeltPathEffects(x, y, actualBlocksToMelt);
        
        // Apply melting effect over time to each block
        actualBlocksToMelt.forEach((blockToMelt, index) => {
            // Add progressively longer delays for each block
            const baseDelay = 100; // base delay in ms
            const melterSpreadDelay = baseDelay + (index * 75); // Progressive delay
            
            this.scene.time.delayedCall(melterSpreadDelay, () => {
                if (blockToMelt && blockToMelt.isActive) {
                    // Add enhanced visual melt effect to the block
                    this.createMeltingEffect(blockToMelt); // Duration is now 2 seconds internally
                    
                    // Destroy block after exactly 2 seconds of melting
                    const blockDestructionDelay = 2000 + (index * 30); // Exactly 2 seconds per block + spread delay
                    
                    this.scene.time.delayedCall(blockDestructionDelay, () => {
                        if (blockToMelt && blockToMelt.isActive) {
                            // Melter bombs can destroy ANY block type after melting completes
                            // Including Strong and Eternal blocks if they were the target type
                            this.destroyIceBlock(blockToMelt);
                        }
                    });
                }
            });
        });
        
        // Play melting sound if available
        if (this.scene.audioManager && typeof this.scene.audioManager.playSound === 'function') {
            this.scene.audioManager.playSound('melt', { volume: 0.7 }); // Slightly louder
        } else {
            // Try direct sound playback if AudioManager isn't available
            try {
                this.scene.sound.play('melt', { volume: 0.7 });
            } catch (e) {
                // Fallback to a different sound if melt sound not available
                try {
                    // Instead of explosion, use a more melting-like sound if available
                    this.scene.sound.play('splash', { volume: 0.6 });
                } catch (e2) {
                    console.log("[BombUtils.handleMelterBomb] Sound not available:", e2);
                }
            }
        }
        
        // Add subtle camera effect instead of shake
        if (this.scene.cameras && this.scene.cameras.main) {
            // Use a gentle flash instead of shake
            this.scene.cameras.main.flash(300, 0, 204, 153, 0.3); // Subtle teal flash
        }
        
        // After the melting effect is applied and delays set, ensure we check game state
        if (blocksToMelt.length === 0) {
            // Check if this was the last bomb
            this.checkLastBombResolution();
        } else {
            // Add a check after all melting effects complete (for the last bomb)
            this.scene.time.delayedCall(2000, () => {
                this.checkLastBombResolution();
            });
        }
    }
    
    /**
     * Check if this was the last bomb and notify GameStateManager to proceed with game over/victory checks
     */
    checkLastBombResolution() {
        // Check if we have a GameStateManager
        if (this.scene && this.scene.bombLauncher && this.scene.gameStateManager) {
            const anyBombsAvailable = this.scene.isAnyBombAvailable ? this.scene.isAnyBombAvailable() : false;
            
            if (!anyBombsAvailable && this.scene.gameStateManager.waitingForLastBomb) {
                console.log("[BombUtils.checkLastBombResolution] Last bomb effect complete, notifying GameStateManager");
                
                // Small delay to allow visual effects to finish
                this.scene.time.delayedCall(500, () => {
                    // Force check for level completion/game over now that last bomb has resolved
                    if (this.scene.checkLevelCompletion) {
                        this.scene.checkLevelCompletion();
                    } else if (this.scene.gameStateManager.checkGameOver) {
                        this.scene.gameStateManager.checkGameOver();
                    }
                });
            }
        }
    }
    
    // Create visual paths connecting the blocks being melted
    createMeltPathEffects(sourceX, sourceY, blocksToMelt) {
        if (!this.scene || blocksToMelt.length <= 1) return;
        
        // Create a fading path between source point and each block
        blocksToMelt.forEach((block, index) => {
            if (index === 0) return; // Skip the first block (it's the impact block)
            
            // Calculate direction from source to block
            const dirX = block.x - sourceX;
            const dirY = block.y - sourceY;
            const distance = Math.sqrt(dirX * dirX + dirY * dirY);
            
            // Only create paths for reasonably distant blocks
            if (distance < 40) return;
            
            // Create a trail of particles along the path
            const particles = this.scene.add.particles('particle');
            particles.setDepth(4); // Below blocks
            
            // Number of points along the path
            const numPoints = Math.min(Math.floor(distance / 20), 10);
            const pathDelay = index * 75; // Match the block melting delay
            
            this.scene.time.delayedCall(pathDelay, () => {
                // Emit particles along the path
                for (let i = 0; i < numPoints; i++) {
                    const t = i / (numPoints - 1); // 0 to 1
                    const pointX = sourceX + (dirX * t);
                    const pointY = sourceY + (dirY * t);
                    
                    // Create small melt particle burst at this point
                    const emitter = particles.createEmitter({
                        x: pointX,
                        y: pointY,
                        speed: { min: 10, max: 30 },
                        scale: { start: 0.3, end: 0 },
                        alpha: { start: 0.7, end: 0 },
                        lifespan: 700,
                        blendMode: 'ADD',
                        tint: 0x00CC99,
                        quantity: 2
                    });
                    
                    // Small burst at each point with progressive delay
                    const pointDelay = i * 50;
                    this.scene.time.delayedCall(pointDelay, () => {
                        emitter.explode(3, pointX, pointY);
                    });
                }
                
                // Clean up the particles
                this.scene.time.delayedCall(1500, () => {
                    particles.destroy();
                });
            });
        });
    }
    
    // Create melting effect visual at impact point
    createMeltImpactEffect(x, y) {
        if (!this.scene) return;
        
        // Create more obvious melting splash effect (larger and more opaque)
        const splash = this.scene.add.circle(x, y, 80, 0x00CC99, 0.8);
        splash.setDepth(6);
        
        // Add a pulse effect for emphasis
        this.scene.tweens.add({
            targets: splash,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Then fade out
                this.scene.tweens.add({
                    targets: splash,
                    alpha: 0,
                    scale: 3,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        splash.destroy();
                    }
                });
            }
        });
        
        // Create a second inner splash for layered effect
        const innerSplash = this.scene.add.circle(x, y, 40, 0x00FFCC, 0.9);
        innerSplash.setDepth(7);
        this.scene.tweens.add({
            targets: innerSplash,
            scale: 0.5,
            duration: 300,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: innerSplash,
                    alpha: 0,
                    scale: 2,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        innerSplash.destroy();
                    }
                });
            }
        });
        
        // Add more particles for enhanced melting liquid effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(6);
        
        const emitter = particles.createEmitter({
            x: x,
            y: y,
            speed: { min: 50, max: 120 }, // Faster particles
            scale: { start: 1.2, end: 0 }, // Larger particles
            alpha: { start: 0.9, end: 0 }, // More visible
            lifespan: 1200, // Longer lifetime
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC, 0x66FFCC], // More varied teal/mint colors
            angle: { min: 0, max: 360 },
            quantity: 25
        });
        
        // Emit particles in two bursts for more impact
        emitter.explode(40, x, y);
        this.scene.time.delayedCall(150, () => {
            emitter.explode(20, x, y);
        });
        
        // Clean up particles after they're finished
        this.scene.time.delayedCall(1300, () => {
            particles.destroy();
        });
    }
    
    // Create melting effect on a specific block
    createMeltingEffect(block) {
        if (!block || !block.scene || !this.scene) return;
        
        // Track original block position and size
        const blockX = block.x;
        const blockY = block.y;
        const blockWidth = block.width;
        const blockHeight = block.height;
        
        // Store original block type to restore it for display purposes during melting
        const originalBlockType = block.blockType;
        
        // Create more visible marker for melting blocks
        // const meltMarker = this.scene.add.text(blockX, blockY - blockHeight/2 - 15, "MELTING", {
        //     fontFamily: 'Arial',
        //     fontSize: '12px',
        //     color: '#00FFCC',
        //     stroke: '#000000',
        //     strokeThickness: 2
        // }).setOrigin(0.5).setDepth(20);
        
        // Add countdown text for visual feedback
        // const countdownText = this.scene.add.text(blockX, blockY, "3", {
        //     fontFamily: 'Arial',
        //     fontSize: '24px',
        //     color: '#FFFFFF',
        //     stroke: '#000000',
        //     strokeThickness: 3
        // }).setOrigin(0.5).setDepth(20);
        
        // Create dripping particle effect
        const particles = this.scene.add.particles('particle');
        particles.setDepth(5); // Below block depth
        
        // Add glowing outline to show block is melting
        const glowOutline = this.scene.add.rectangle(
            blockX, blockY,
            blockWidth * 1.2, blockHeight * 1.2,
            0x00FFCC, 0.6
        );
        glowOutline.setDepth(block.depth - 0.1); // Behind the block
        
        // Pulse the glow throughout the 3 second duration
        this.scene.tweens.add({
            targets: glowOutline,
            alpha: { from: 0.6, to: 0.9 },
            scale: { from: 1.0, to: 1.2 },
            duration: 500, // Adjusted pulse for 2s total (2s / 4 repeats = 500ms)
            yoyo: true,
            repeat: 3, // Repeat for the full 2 seconds (4 * 500ms = 2000ms)
            ease: 'Sine.easeInOut'
        });
        
        // Enhanced dripping emitter - more particles that flow downward
        const drippingEmitter = particles.createEmitter({
            x: {min: blockX - blockWidth/2, max: blockX + blockWidth/2},
            y: {min: blockY - blockHeight/2, max: blockY + blockHeight/2},
            speedY: { min: 30, max: 80 }, // Faster drip downward
            speedX: { min: -10, max: 10 },  // More sideways movement for dynamic effect
            scale: { start: 0.4, end: 0 }, // Larger particles
            alpha: { start: 0.9, end: 0 }, // More visible
            lifespan: 1500, // Adjusted lifetime for 2-second effect
            frequency: 40, // Emit more frequently (every 40ms)
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC, 0x66FFCC, 0x00FFAA] // More varied teal/mint colors
        });
        
        // Add a "puddle" effect at the bottom
        const puddleY = blockY + blockHeight/2 + 10;
        const puddleEmitter = particles.createEmitter({
            x: {min: blockX - blockWidth/2, max: blockX + blockWidth/2},
            y: puddleY,
            speedY: { min: -5, max: 5 },
            speedX: { min: -20, max: 20 }, // Spread horizontally 
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 1500,
            frequency: 60,
            blendMode: 'ADD',
            tint: [0x00CC99, 0x00FFCC]
        });
        
        // Start dripping animations
        drippingEmitter.start();
        puddleEmitter.start();
        
        // Add a melting visual over the block (more visible now)
        const meltOverlay = this.scene.add.rectangle(
            blockX, blockY, 
            blockWidth * 1.1, blockHeight * 1.1, 
            0x00CC99, 0.5 // More opaque
        );
        meltOverlay.setDepth(block.depth + 0.1); // Just above the block
        
        // Add melting animation to the block - now 2 seconds
        this.scene.tweens.add({
            targets: [block, meltOverlay],
            alpha: 0.2,  // Fade as it melts
            scaleY: 0.15, // Squish vertically more dramatically
            scaleX: 1.3, // Spread horizontally more
            y: blockY + blockHeight/2 + 5, // Move down slightly as it melts
            duration: 2000, // Exactly 2 seconds to melt
            ease: 'Power2',
            onComplete: () => {
                // Stop emitting but let existing particles finish
                drippingEmitter.stop();
                puddleEmitter.stop();
                
                // Clean up melting visuals
                meltOverlay.destroy();
                glowOutline.destroy();
                // meltMarker.destroy(); // Already removed
                // countdownText.destroy(); // Already removed
                
                // Particles will be cleaned up after block destruction
                this.scene.time.delayedCall(1500, () => { // Adjusted delay for particle cleanup
                    particles.destroy();
                });
            }
        });
    }
}

// Export the BombUtils class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BombUtils };
} else {
    // If not in Node.js, add to window object
    window.BombUtils = BombUtils;
} 