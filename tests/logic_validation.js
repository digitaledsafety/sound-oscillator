/**
 * logic_validation.js
 * Unit tests for core mathematical logic in Sound Oscillator PWA.
 */

const assert = require('assert');

// Mock data
let generatedScaleFrequencies = [];

/**
 * Ported function from js/main.js for testing.
 */
function getSnappedFrequency(rawFreq, scaleFrequencies) {
    if (!scaleFrequencies || scaleFrequencies.length === 0) {
        return rawFreq;
    }

    let closestFreq = scaleFrequencies[0];
    let minDifference = Math.abs(rawFreq - closestFreq);

    for (let i = 1; i < scaleFrequencies.length; i++) {
        const currentFreq = scaleFrequencies[i];
        const difference = Math.abs(rawFreq - currentFreq);
        if (difference < minDifference) {
            minDifference = difference;
            closestFreq = currentFreq;
        }
    }
    return closestFreq;
}

// Test cases
function runTests() {
    console.log("Running logic validation tests...");

    // Test 1: Snapping when scale is empty (should return raw frequency)
    const rawFreq1 = 440;
    const snapped1 = getSnappedFrequency(rawFreq1, []);
    assert.strictEqual(snapped1, rawFreq1, "Should return raw frequency when scale is empty");
    console.log("Test 1 Passed: Empty scale handling");

    // Test 2: Snapping to exact match
    const scale2 = [261.63, 293.66, 329.63]; // C4, D4, E4
    const snapped2 = getSnappedFrequency(293.66, scale2);
    assert.strictEqual(snapped2, 293.66, "Should match exact frequency in scale");
    console.log("Test 2 Passed: Exact match snapping");

    // Test 3: Snapping to closest match (down)
    const scale3 = [100, 200, 300];
    const snapped3 = getSnappedFrequency(190, scale3);
    assert.strictEqual(snapped3, 200, "Should snap to 200 for input 190");
    console.log("Test 3 Passed: Closest match (down)");

    // Test 4: Snapping to closest match (up)
    const snapped4 = getSnappedFrequency(210, scale3);
    assert.strictEqual(snapped4, 200, "Should snap to 200 for input 210");
    console.log("Test 4 Passed: Closest match (up)");

    // Test 5: Snapping with single element scale
    const scale5 = [440];
    const snapped5 = getSnappedFrequency(880, scale5);
    assert.strictEqual(snapped5, 440, "Should snap to the only element in the scale");
    console.log("Test 5 Passed: Single element scale");

    console.log("All logic validation tests passed!");
}

try {
    runTests();
} catch (error) {
    console.error("Test failed!");
    console.error(error);
    process.exit(1);
}
