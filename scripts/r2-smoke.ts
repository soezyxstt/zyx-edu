/**
 * R2 smoke test: put → get (byte-equal check) → delete.
 * Run with: bunx tsx scripts/r2-smoke.ts
 * Requires R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in env.
 */
import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const bucket = process.env.R2_BUCKET || 'zyx';
const key = `smoke-test/${Date.now()}.bin`;
const payload = Buffer.from('zyx-r2-smoke');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function main() {
  // PUT
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: payload }));
  console.log('put ✓', key);

  // GET
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error('GET returned no body');
  const got = await streamToBuffer(res.Body as AsyncIterable<Uint8Array>);
  if (!got.equals(payload)) {
    throw new Error(`byte mismatch: expected "${payload.toString()}", got "${got.toString()}"`);
  }
  console.log('get ✓ (bytes match)');

  // DELETE
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log('delete ✓');

  console.log('\nR2 round-trip passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('R2 smoke test failed:', err.message || err);
  process.exit(1);
});
