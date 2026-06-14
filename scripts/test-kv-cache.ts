import 'dotenv/config';
import { kvGet, kvPut, kvDelete } from '../lib/kv-cache';

async function main() {
  console.log('=== Starting Cloudflare KV Cache Smoke Test ===');
  
  const testKey = `test:smoke:${Date.now()}`;
  const testVal = { msg: 'Antigravity KV Smoke Test', timestamp: Date.now() };

  console.log(`Using test key: ${testKey}`);

  // 1. Initial Get (should be null/miss)
  console.log('1. Fetching non-existent key...');
  const initVal = await kvGet(testKey);
  console.log(`   Result (expected null):`, initVal);
  if (initVal !== null) {
    throw new Error('Key should not exist initially');
  }

  // 2. Put value (should succeed and trigger counter update)
  console.log('2. Writing value to KV...');
  // Read write count before
  // Since getWriteCount in kv-cache.ts is private/internal, we'll write and get to verify behavior.
  await kvPut(testKey, testVal, 300); // 5 mins TTL
  console.log('   Value written.');

  // 3. Get value (should hit and match)
  console.log('3. Fetching written key...');
  const retrieved = await kvGet<{ msg: string; timestamp: number }>(testKey);
  console.log('   Retrieved value:', retrieved);
  if (!retrieved || retrieved.msg !== testVal.msg || retrieved.timestamp !== testVal.timestamp) {
    throw new Error('Retrieved value does not match written value');
  }
  console.log('   ✓ Match successful.');

  // 4. Verify daily write limit logic (read counter key directly)
  console.log('4. Checking write counter key...');
  const todayStr = new Date().toISOString().slice(0, 10);
  const counterKey = `meta:writes:${todayStr}`;
  const writeCount = await kvGet<number>(counterKey);
  console.log(`   Current daily write counter (${counterKey}):`, writeCount);
  if (writeCount === null || typeof writeCount !== 'number' || writeCount < 2) {
    throw new Error(`Write counter should be a positive number and at least 2, got: ${writeCount}`);
  }
  console.log('   ✓ Write counter incremented correctly.');

  // 5. Delete key
  console.log('5. Deleting test key...');
  await kvDelete(testKey);
  console.log('   Key deleted.');

  // 6. Final Get (should be null/miss)
  console.log('6. Verifying key deletion...');
  const afterDelete = await kvGet(testKey);
  console.log(`   Result (expected null):`, afterDelete);
  if (afterDelete !== null) {
    throw new Error('Key was not deleted successfully');
  }
  console.log('   ✓ Deletion verified.');

  console.log('\n=== All Cloudflare KV cache tests PASSED successfully ===');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
