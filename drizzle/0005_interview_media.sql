CREATE TABLE "interview_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"storage_path" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_ms" integer,
	"analysis_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"transcript" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_media" ADD CONSTRAINT "interview_media_interview_id_mock_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."mock_interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_media" ADD CONSTRAINT "interview_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_media_interview_id_created_at_idx" ON "interview_media" USING btree ("interview_id","created_at");--> statement-breakpoint
CREATE INDEX "interview_media_user_id_created_at_idx" ON "interview_media" USING btree ("user_id","created_at");