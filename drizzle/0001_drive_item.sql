CREATE TYPE "public"."drive_kind" AS ENUM('folder', 'file');--> statement-breakpoint
CREATE TABLE "drive_item" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"kind" "drive_kind" NOT NULL,
	"name" text NOT NULL,
	"uploadthing_key" text,
	"ufs_url" text,
	"mime_type" text,
	"size_bytes" integer,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_item" ADD CONSTRAINT "drive_item_parent_id_drive_item_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."drive_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_item" ADD CONSTRAINT "drive_item_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "drive_item_parent_idx" ON "drive_item" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "drive_item_created_by_idx" ON "drive_item" USING btree ("created_by_user_id");