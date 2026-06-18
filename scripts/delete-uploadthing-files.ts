/**
 * delete-uploadthing-files.ts
 * Deletes the legacy UploadThing files from the server via UTAPI.
 * Run with: bunx tsx scripts/delete-uploadthing-files.ts
 */
import 'dotenv/config';
import { UTApi } from 'uploadthing/server';

const LEGACY_KEYS = [
  '66nPsBvCMf37MOdARFLylNEfxFIKRg8PX0p76TotknUDe2aV',
  '66nPsBvCMf37FCH5kyB2zTY8muXxAHU13dO9Btjf5c4bWhrQ',
  '66nPsBvCMf37EAw8SnJ0BsNZAPt5C8jYfiehG2MrySJmR4V6',
];

async function main() {
  console.log('=== Starting Deletion of Legacy UploadThing Files ===');
  
  if (!process.env.UPLOADTHING_TOKEN) {
    console.error('Error: UPLOADTHING_TOKEN environment variable is not defined.');
    process.exit(1);
  }

  console.log(`Configured keys for deletion:\n${LEGACY_KEYS.map((k) => ` - ${k}`).join('\n')}\n`);

  try {
    const utapi = new UTApi();
    console.log('Sending delete request to UploadThing API...');
    const result = await utapi.deleteFiles(LEGACY_KEYS);

    console.log('Deletion result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✓ Success: All legacy UploadThing files deleted successfully.');
      process.exit(0);
    } else {
      console.error('\n✗ Error: Failed to delete legacy UploadThing files.');
      process.exit(1);
    }
  } catch (err) {
    console.error('\n✗ Script crashed during UploadThing API request:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
