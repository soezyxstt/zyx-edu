ALTER TABLE "ai_material_instance_chunks" ADD COLUMN "is_synced" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_material_instances" ADD COLUMN "pinecone_sync_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_material_instances" ADD COLUMN "last_sync_error" text;