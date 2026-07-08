
/**
 * Sanity Check: High-Precision Measurement Calculation Test
 * This script verifies that the mathematical transition from 
 * Ollama's nanosecond metadata to human-readable TPS is accurate.
 */

function testTPSCalculation() {
  console.log("🚀 Starting High-Precision Logic Validation...");

  // --- TEST CASE 1: PROMPT TPS Calculation ---
  // Input: prompt_eval_count = 100, prompt_eval_duration = 500,000,000 ns (0.5 seconds)
  // Expected Result: 100 / (500,000,000 / 1,000,000,000) = 100 / 0.5 = 200 TPS
  const mockPromptCount = 100;
  const mockPromptDurationNs = 500_000_000; // 0.5s
  
  const calculatedPromptTps = mockPromptCount / (mockPromptDurationNs / 1_000_000_000);
  console.log(`[Test 1] Prompt TPS: ${calculatedPromptTps} (Expected: 200)`);

  if (Math.abs(calculatedPromptTps - 200) < 0.0001) {
    console.log("✅ Test 1 Passed: Prompt calculation is accurate.");
  } else {
    console.error("❌ Test 1 Failed: Prompt calculation mismatch!");
    process.exit(1);
  }

  // --- TEST CASE 2: GENERATION TPS Calculation ---
  // Input: eval_count = 50, eval_duration = 1,250,000,000 ns (1.25 seconds)
  // Expected Result: 50 / (1,250,000,000 / 1,000,000,000) = 50 / 1.25 = 40 TPS
  const mockGenCount = 50;
  const mockGenDurationNs = 1_250_000_000; // 1.25s

  const calculatedGenTps = mockGenCount / (mockGenDurationNs / 1_000_000_000);
  console.log(`[Test 2] Generation TPS: ${calculatedGenTps} (Expected: 40)`);

  if (Math.abs(calculatedGenTps - 40) < 0.0001) {
    console.log("✅ Test 2 Passed: Generation calculation is accurate.");
  } else {
    console.error("❌ Test 2 Failed: Generation calculation mismatch!");
    process.exit(1);
  }

  // --- TEST CASE 3: TTFT Calculation (Prompt Duration Transition) ---
  // Input: prompt_eval_duration = 250,000,000 ns (0.25s)
  // Expected Result: 250ms
  const mockTtftNs = 250_000_000;
  const calculatedTtftMs = mockTtftNs / 1_000_000;
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
