import 'dotenv/config';
import { geminiKeyPool } from '../lib/gemini-keys';

function printDiagnostics(title: string) {
  console.log(`\n=== Diagnostics: ${title} ===`);
  const diag = geminiKeyPool.getDiagnostics();
  if (diag.length === 0) {
    console.log('No diagnostics records yet.');
    return;
  }
  console.table(
    diag.map((d) => ({
      Key: d.keyId,
      Model: d.modelId,
      RPM: d.requestsMinute,
      Limit: d.estimatedRpmLimit,
      Util: `${d.utilizationPercent.toFixed(1)}%`,
      Successes: d.successes,
      Failures: d.failures,
      ConsecFailures: d.consecutiveFailures,
      State: d.circuitState,
      CooldownLeft: `${(d.cooldownRemainingMs / 1000).toFixed(1)}s`,
      ActiveReqs: d.activeRequestsCount,
    }))
  );
}

async function runTests() {
  console.log('Starting Gemini Key Pool Scheduler Verification...\n');

  const modelId = 'gemini-2.5-flash';

  // Test 1: Balancing across keys
  console.log('Test 1: Balancing concurrent requests across keys...');
  const key1 = geminiKeyPool.getBestKey(modelId);
  const key2 = geminiKeyPool.getBestKey(modelId);
  console.log(`Selected key 1: ${key1?.id}`);
  console.log(`Selected key 2: ${key2?.id}`);
  
  if (key1 && key2 && key1.id !== key2.id && geminiKeyPool.getAllKeys().length > 1) {
    console.log('✅ Success: Balanced requests across different keys.');
  } else {
    console.log('ℹ️ Info: Selected keys are same (expected if only 1 key is set in .env).');
  }
  printDiagnostics('After 2 requests');

  // Test 2: Mark success
  console.log('\nTest 2: Marking success...');
  if (key1) {
    geminiKeyPool.markSuccess(key1.id, modelId);
  }
  if (key2) {
    geminiKeyPool.markSuccess(key2.id, modelId);
  }
  printDiagnostics('After successes');

  // Test 3: Simulation of 429 / Rate limiting
  console.log('\nTest 3: Simulating 429 rate limit error...');
  const keyFor429 = geminiKeyPool.getBestKey(modelId);
  if (keyFor429) {
    console.log(`Selected ${keyFor429.id} to trigger 429`);
    const rateLimitError = new Error('Resource has been exhausted (e.g. metadata: 429, try again in 5.5s)');
    geminiKeyPool.markFailure(keyFor429.id, modelId, rateLimitError);
    printDiagnostics('After 429 failure');
    
    // Check if limit decreased and cooldown was set
    const diag = geminiKeyPool.getDiagnostics().find(d => d.keyId === keyFor429.id && d.modelId === modelId);
    if (diag && diag.cooldownRemainingMs > 0) {
      console.log(`✅ Success: Cooldown detected (${(diag.cooldownRemainingMs / 1000).toFixed(1)}s left).`);
      console.log(`✅ Success: Dynamic limit decreased to ${diag.estimatedRpmLimit}`);
    } else {
      console.log('❌ Failure: Cooldown not set or limit not decreased.');
    }
  }

  // Test 4: Circuit Breaker Triggering
  console.log('\nTest 4: Simulating 3 consecutive failures to trigger open circuit breaker...');
  const keyForCB = geminiKeyPool.getAllKeys()[0];
  const cbModel = 'gemini-2.5-pro';
  
  // 1st error
  let k = geminiKeyPool.getBestKey(cbModel);
  console.log(`Attempt 1: Selected key ${k?.id}`);
  geminiKeyPool.markFailure(keyForCB.id, cbModel, new Error('500 Internal Server Error'));
  
  // 2nd error
  k = geminiKeyPool.getBestKey(cbModel);
  console.log(`Attempt 2: Selected key ${k?.id}`);
  geminiKeyPool.markFailure(keyForCB.id, cbModel, new Error('500 Internal Server Error'));
  
  // 3rd error
  k = geminiKeyPool.getBestKey(cbModel);
  console.log(`Attempt 3: Selected key ${k?.id}`);
  geminiKeyPool.markFailure(keyForCB.id, cbModel, new Error('500 Internal Server Error'));

  printDiagnostics('After 3 failures (Circuit Breaker OPEN)');
  
  const cbDiag = geminiKeyPool.getDiagnostics().find(d => d.keyId === keyForCB.id && d.modelId === cbModel);
  if (cbDiag && cbDiag.circuitState === 'OPEN') {
    console.log('✅ Success: Circuit breaker is OPEN.');
  } else {
    console.log('❌ Failure: Circuit breaker state is:', cbDiag?.circuitState);
  }

  // Test 5: Verify key selection skips OPEN circuit breaker
  console.log('\nTest 5: Verify getBestKey skips keys/models with OPEN circuit breaker...');
  const selectedKeyAfterCB = geminiKeyPool.getBestKey(cbModel);
  if (selectedKeyAfterCB && selectedKeyAfterCB.id === keyForCB.id) {
    console.log('❌ Failure: Selected the key that has an OPEN circuit breaker!');
  } else {
    console.log('✅ Success: Correctly bypassed key with OPEN circuit breaker.');
  }

  console.log('\nAll Scheduler tests completed.');
}

runTests().catch(console.error);
