/**
 * BlockTypesTest.js
 * Test utility for the BlockTypes class
 */

// Initialize test variables
let testResults = [];
let testPassed = true;

// Helper test functions
function runTest(testName, testFn) {
    console.log(`Running test: ${testName}`);
    try {
        const result = testFn();
        testResults.push({ name: testName, passed: true });
        console.log(`✅ Test passed: ${testName}`);
        return result;
    } catch (error) {
        testResults.push({ name: testName, passed: false, error: error.message });
        console.error(`❌ Test failed: ${testName}`, error);
        testPassed = false;
        return null;
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(`${message}: value is ${value}`);
    }
}

function assertTrue(value, message) {
    if (value !== true) {
        throw new Error(`${message}: value is ${value}, expected true`);
    }
}

function assertFalse(value, message) {
    if (value !== false) {
        throw new Error(`${message}: value is ${value}, expected false`);
    }
}

// Run tests for BlockTypes
function runBlockTypesTests() {
    console.log('Starting BlockTypes tests...');
    
    // Test 1: Create BlockTypes instance
    const blockTypes = runTest('Create BlockTypes instance', () => {
        const blockTypes = new BlockTypes();
        assertNotNull(blockTypes, 'BlockTypes should be created');
        return blockTypes;
    });
    
    if (!blockTypes) return false;
    
    // Test 2: Verify block types exist
    runTest('Verify block types exist', () => {
        assertNotNull(blockTypes.TYPES, 'TYPES should be defined');
        assertNotNull(blockTypes.TYPES.STANDARD, 'STANDARD type should be defined');
        assertNotNull(blockTypes.TYPES.STRONG, 'STRONG type should be defined');
        assertNotNull(blockTypes.TYPES.DYNAMITE, 'DYNAMITE type should be defined');
        assertNotNull(blockTypes.TYPES.ETERNAL, 'ETERNAL type should be defined');
        assertNotNull(blockTypes.TYPES.BOUNCY, 'BOUNCY type should be defined');
    });
    
    // Test 3: Verify colors exist for each type
    runTest('Verify colors exist for each type', () => {
        assertNotNull(blockTypes.COLORS, 'COLORS should be defined');
        Object.values(blockTypes.TYPES).forEach(type => {
            assertNotNull(blockTypes.COLORS[type], `Color should exist for ${type}`);
        });
    });
    
    // Test 4: Verify alpha values exist for each type
    runTest('Verify alpha values exist for each type', () => {
        assertNotNull(blockTypes.ALPHA, 'ALPHA should be defined');
        Object.values(blockTypes.TYPES).forEach(type => {
            assertNotNull(blockTypes.ALPHA[type], `Alpha should exist for ${type}`);
        });
    });
    
    // Test 5: Verify hit points exist for each type
    runTest('Verify hit points exist for each type', () => {
        assertNotNull(blockTypes.HIT_POINTS, 'HIT_POINTS should be defined');
        Object.values(blockTypes.TYPES).forEach(type => {
            assertNotNull(blockTypes.HIT_POINTS[type], `Hit points should exist for ${type}`);
        });
    });
    
    // Test 6: Test getColor method
    runTest('Test getColor method', () => {
        const standardColor = blockTypes.getColor(blockTypes.TYPES.STANDARD);
        assertNotNull(standardColor, 'Standard color should be returned');
        assertEqual(standardColor, blockTypes.COLORS[blockTypes.TYPES.STANDARD], 'Should return correct standard color');
        
        // Test with invalid type (should return standard color)
        const invalidColor = blockTypes.getColor('invalid_type');
        assertEqual(invalidColor, blockTypes.COLORS[blockTypes.TYPES.STANDARD], 'Should return standard color for invalid type');
    });
    
    // Test 7: Test getAlpha method
    runTest('Test getAlpha method', () => {
        const standardAlpha = blockTypes.getAlpha(blockTypes.TYPES.STANDARD);
        assertNotNull(standardAlpha, 'Standard alpha should be returned');
        assertEqual(standardAlpha, blockTypes.ALPHA[blockTypes.TYPES.STANDARD], 'Should return correct standard alpha');
        
        // Test with invalid type (should return standard alpha)
        const invalidAlpha = blockTypes.getAlpha('invalid_type');
        assertEqual(invalidAlpha, blockTypes.ALPHA[blockTypes.TYPES.STANDARD], 'Should return standard alpha for invalid type');
    });
    
    // Test 8: Test getHitPoints method
    runTest('Test getHitPoints method', () => {
        const standardHP = blockTypes.getHitPoints(blockTypes.TYPES.STANDARD);
        assertNotNull(standardHP, 'Standard hit points should be returned');
        assertEqual(standardHP, blockTypes.HIT_POINTS[blockTypes.TYPES.STANDARD], 'Should return correct standard hit points');
        
        // Test with invalid type (should return standard hit points)
        const invalidHP = blockTypes.getHitPoints('invalid_type');
        assertEqual(invalidHP, blockTypes.HIT_POINTS[blockTypes.TYPES.STANDARD], 'Should return standard hit points for invalid type');
    });
    
    // Test 9: Test isValidType method
    runTest('Test isValidType method', () => {
        assertTrue(blockTypes.isValidType(blockTypes.TYPES.STANDARD), 'STANDARD should be a valid type');
        assertTrue(blockTypes.isValidType(blockTypes.TYPES.STRONG), 'STRONG should be a valid type');
        assertTrue(blockTypes.isValidType(blockTypes.TYPES.DYNAMITE), 'DYNAMITE should be a valid type');
        assertTrue(blockTypes.isValidType(blockTypes.TYPES.ETERNAL), 'ETERNAL should be a valid type');
        assertTrue(blockTypes.isValidType(blockTypes.TYPES.BOUNCY), 'BOUNCY should be a valid type');
        
        assertFalse(blockTypes.isValidType('invalid_type'), 'Invalid type should return false');
        assertFalse(blockTypes.isValidType(null), 'Null should return false');
        assertFalse(blockTypes.isValidType(undefined), 'Undefined should return false');
    });
    
    // Report final test results
    console.log('All BlockTypes tests completed!');
    console.log(`${testResults.filter(t => t.passed).length} of ${testResults.length} tests passed`);
    
    return testPassed;
}

// Function to run the tests when the page loads
window.runBlockTypesTests = runBlockTypesTests; 