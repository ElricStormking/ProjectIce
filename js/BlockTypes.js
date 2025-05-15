// BlockTypes.js - Defines all block types and their properties
/**
 * @class BlockTypes
 * @description Defines and manages different types of blocks in the game, including their properties
 * like colors, transparency, and hit points. This class serves as a central registry for block type
 * information to maintain consistency throughout the game.
 */
class BlockTypes {
    /**
     * Creates a new BlockTypes instance with predefined block types and properties
     */
    constructor() {
        /**
         * Block type definitions
         * @type {Object}
         */
        this.TYPES = {
            STANDARD: 'standard',
            STRONG: 'strong',
            DYNAMITE: 'dynamite',
            ETERNAL: 'eternal',
            BOUNCY: 'bouncy'
        };
        
        /**
         * Block colors by type in hexadecimal format
         * @type {Object}
         */
        this.COLORS = {
            [this.TYPES.STANDARD]: 0xaaddff,  // Default light blue
            [this.TYPES.STRONG]: 0x6666dd,     // Medium blue
            [this.TYPES.DYNAMITE]: 0xdd3333,   // Red
            [this.TYPES.ETERNAL]: 0x3333cc,    // Dark blue
            [this.TYPES.BOUNCY]: 0x00cc44      // Green
        };
        
        /**
         * Block alpha (transparency) values
         * @type {Object}
         */
        this.ALPHA = {
            [this.TYPES.STANDARD]: 0.85,
            [this.TYPES.STRONG]: 0.85,
            [this.TYPES.DYNAMITE]: 0.85,
            [this.TYPES.ETERNAL]: 0.9,
            [this.TYPES.BOUNCY]: 0.9
        };
        
        /**
         * Block hit points - how many hits it takes to destroy each type
         * @type {Object}
         */
        this.HIT_POINTS = {
            [this.TYPES.STANDARD]: 1,
            [this.TYPES.STRONG]: 2,
            [this.TYPES.DYNAMITE]: 1,
            [this.TYPES.ETERNAL]: 3,
            [this.TYPES.BOUNCY]: 1
        };
    }
    
    /**
     * Get color for a given block type
     * @param {string} blockType - The type of block to get color for
     * @returns {number} The color in hexadecimal format
     */
    getColor(blockType) {
        return this.COLORS[blockType] || this.COLORS[this.TYPES.STANDARD];
    }
    
    /**
     * Get alpha (transparency) for a given block type
     * @param {string} blockType - The type of block to get alpha for
     * @returns {number} The alpha value (0.0 to 1.0)
     */
    getAlpha(blockType) {
        return this.ALPHA[blockType] || this.ALPHA[this.TYPES.STANDARD];
    }
    
    /**
     * Get hit points for a given block type
     * @param {string} blockType - The type of block to get hit points for
     * @returns {number} The number of hit points
     */
    getHitPoints(blockType) {
        return this.HIT_POINTS[blockType] || this.HIT_POINTS[this.TYPES.STANDARD];
    }
    
    /**
     * Check if a block type exists
     * @param {string} blockType - The type of block to check
     * @returns {boolean} True if the block type is valid
     */
    isValidType(blockType) {
        return Object.values(this.TYPES).includes(blockType);
    }
}

// Export the BlockTypes class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlockTypes };
} else {
    // If not in Node.js, add to window object
    window.BlockTypes = BlockTypes;
}
