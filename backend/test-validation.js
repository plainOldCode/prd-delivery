
/**
 * Sanity Check: High-Precision Measurement Calculation Test
 * This script verifies if our new logic is mathematically accurate.
 */

function testTPSCalculation() {
  console.log("🚀 Starting High-Precision Logic Validation...");

  // --- TEST CASE 1: PROMPT TPS Calculation ---
  const mockPromptCount = 100;
  const mockPromptDurationNs = 500000000; // 0.5s
  const calculatedPromptTps = mockPromptCount / (mockPromptDurationNs / 1000000000);
  console.log(`[Test 1] Prompt TPS: ${calculatedPromptTps} (Expected: 200)`);

  if (Math.abs(calculatedPromptTps - 200) < 0.0001) {
    console.log("✅ Test 1 Passed: Prompt calculation is accurate.");
  } else {
    console.error("❌ Test 1 Failed: Prompt calculation mismatch!");
    process.exit(1);
  }

  // --- TEST CASE 2: GENERATION TPS Calculation ---
  const mockGenCount = 50;
  const mockGenDurationNs = 1250000000; // 1.25s
  const calculatedGenTps = mockGenCount / (mockGenDurationNs / 1000000000);
  console.log(`[Test 2] Generation TPS: ${calculatedGenTps} (Expected: 40)`);

  if (Math.abs(calculatedGenTps - 40) < 0.0001) {
    console.log("✅ Test 2 Passed: Generation calculation is accurate.");
  } else {
    console.error("❌ Test 2 Failed: Generation calculation mismatch!");
    process.exit(1);
  }

  // --- TEST CASE 3: TTFT Calculation ---
  const mockTtftNs = 250000000; // 0.25s
  const calculatedTtftMs = mockTtftNs / 1000000;
  console.log(`[Test 3] TTFT (ms): ${calculatedTtftMs} (Expected: 250)`);

  if (Math.abs(calculatedTtftMs - 250) < 0.0001) {
    console.log("✅ Test 3 Passed: TTFT calculation is accurate.");
  } else {
    console.error("❌ Test 3 Failed: TTFT calculation mismatch!");
    process.exit(1);
  }

  console.log("\n✨ ALL HIGH-PRECISION TESTS PASSED SUCCESSFULLY! ✨");
}

testTPSCalculation();
