import { S3Client } from "@aws-sdk/client-s3";

// Tigris provides a specific endpoint, usually something like https://fly.storage.tigris.dev
// Make sure to add TIGRIS_ENDPOINT to your .env file alongside the keys
export const s3Client = new S3Client({
  region: "auto", // Tigris handles regions automatically
  endpoint: process.env.TIGRIS_ENDPOINT!, 
  credentials: {
    accessKeyId: process.env.TIGRIS_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_AWS_SECRET_ACCESS_KEY!,
  },
});