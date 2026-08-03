CREATE TABLE "agent_artifact_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"size_bytes" integer,
	"created_by_run_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"artifact_type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"current_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"run_id" uuid,
	"rating" integer,
	"feedback_type" varchar(50) NOT NULL,
	"comment" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor_type" varchar(30) DEFAULT 'agent' NOT NULL,
	"tool_name" varchar(100),
	"status" varchar(30),
	"payload_hash" varchar(128),
	"artifact_version_id" uuid,
	"error_code" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"run_type" varchar(50) DEFAULT 'canvas' NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"input_hash" varchar(128),
	"output_hash" varchar(128),
	"error_code" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tool_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tool_name" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'available' NOT NULL,
	"last_run_at" timestamp,
	"last_error_code" varchar(100),
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_routing_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"run_id" uuid,
	"workspace_id" uuid,
	"request_hash" varchar(128) NOT NULL,
	"route" varchar(100) NOT NULL,
	"provider" varchar(100),
	"model" varchar(100),
	"fallback_used" boolean DEFAULT false NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"status" varchar(30) NOT NULL,
	"error_code" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" varchar(50) DEFAULT 'reflection' NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"target_date" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_match_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid,
	"job_title" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"job_reference_hash" varchar(128),
	"match_score" integer NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rationale" text,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_type" varchar(50) NOT NULL,
	"display_name" varchar(160),
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"external_account_hash" varchar(128),
	"credential_ref" varchar(255),
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp,
	"last_error_code" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"roadmap_id" uuid,
	"task_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"impact_score" integer,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_context_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"source_reference_hash" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"format" varchar(30) DEFAULT 'json' NOT NULL,
	"selection" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"output_ref" varchar(255),
	"error_code" varchar(100),
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mentor_roadmaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"objective" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"source" varchar(50) DEFAULT 'mentor' NOT NULL,
	"target_date" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentor_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roadmap_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(30) DEFAULT 'todo' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preparation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"sender_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preparation_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"room_type" varchar(50) DEFAULT 'general' NOT NULL,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subagent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"task_key" varchar(100) NOT NULL,
	"agent_role" varchar(100) NOT NULL,
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"input_hash" varchar(128),
	"output_hash" varchar(128),
	"result_artifact_version_id" uuid,
	"attempt" integer DEFAULT 1 NOT NULL,
	"error_code" varchar(100),
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"run_id" uuid,
	"tool_name" varchar(100) NOT NULL,
	"arguments_hash" varchar(128) NOT NULL,
	"risk_level" varchar(30) DEFAULT 'medium' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"decision_code" varchar(50),
	"decided_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"run_id" uuid,
	"workspace_id" uuid,
	"approval_id" uuid,
	"tool_name" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"outcome" varchar(30) NOT NULL,
	"arguments_hash" varchar(128),
	"result_hash" varchar(128),
	"duration_ms" integer,
	"error_code" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" varchar(20),
	"timezone" varchar(100),
	"communication_style" varchar(50),
	"memory_enabled" boolean DEFAULT true NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_artifact_versions" ADD CONSTRAINT "agent_artifact_versions_artifact_id_agent_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."agent_artifacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_artifact_versions" ADD CONSTRAINT "agent_artifact_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_artifact_versions" ADD CONSTRAINT "agent_artifact_versions_created_by_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_artifacts" ADD CONSTRAINT "agent_artifacts_workspace_id_agent_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."agent_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_artifacts" ADD CONSTRAINT "agent_artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run_events" ADD CONSTRAINT "agent_run_events_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run_events" ADD CONSTRAINT "agent_run_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_run_events" ADD CONSTRAINT "agent_run_events_artifact_version_id_agent_artifact_versions_id_fk" FOREIGN KEY ("artifact_version_id") REFERENCES "public"."agent_artifact_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workspace_id_agent_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."agent_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_status" ADD CONSTRAINT "agent_tool_status_workspace_id_agent_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."agent_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_status" ADD CONSTRAINT "agent_tool_status_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workspaces" ADD CONSTRAINT "agent_workspaces_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_routing_logs" ADD CONSTRAINT "ai_routing_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_routing_logs" ADD CONSTRAINT "ai_routing_logs_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_routing_logs" ADD CONSTRAINT "ai_routing_logs_workspace_id_agent_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."agent_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_diary_entries" ADD CONSTRAINT "career_diary_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_match_suggestions" ADD CONSTRAINT "career_match_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_match_suggestions" ADD CONSTRAINT "career_match_suggestions_goal_id_career_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."career_goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_milestones" ADD CONSTRAINT "career_milestones_goal_id_career_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."career_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_milestones" ADD CONSTRAINT "career_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_providers" ADD CONSTRAINT "context_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_roadmap_id_mentor_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."mentor_roadmaps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_task_id_mentor_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."mentor_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_context_items" ADD CONSTRAINT "imported_context_items_provider_id_context_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."context_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_context_items" ADD CONSTRAINT "imported_context_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_export_jobs" ADD CONSTRAINT "memory_export_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_export_jobs" ADD CONSTRAINT "memory_export_jobs_provider_id_context_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."context_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_roadmaps" ADD CONSTRAINT "mentor_roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_tasks" ADD CONSTRAINT "mentor_tasks_roadmap_id_mentor_roadmaps_id_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."mentor_roadmaps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentor_tasks" ADD CONSTRAINT "mentor_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_messages" ADD CONSTRAINT "preparation_messages_room_id_preparation_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."preparation_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_messages" ADD CONSTRAINT "preparation_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_rooms" ADD CONSTRAINT "preparation_rooms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subagent_tasks" ADD CONSTRAINT "subagent_tasks_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subagent_tasks" ADD CONSTRAINT "subagent_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subagent_tasks" ADD CONSTRAINT "subagent_tasks_result_artifact_version_id_agent_artifact_versions_id_fk" FOREIGN KEY ("result_artifact_version_id") REFERENCES "public"."agent_artifact_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_approvals" ADD CONSTRAINT "tool_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_approvals" ADD CONSTRAINT "tool_approvals_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_workspace_id_agent_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."agent_workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_audit_logs" ADD CONSTRAINT "tool_audit_logs_approval_id_tool_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."tool_approvals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_artifact_versions_artifact_version_uq" ON "agent_artifact_versions" USING btree ("artifact_id","version");--> statement-breakpoint
CREATE INDEX "agent_artifact_versions_user_id_idx" ON "agent_artifact_versions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_artifacts_user_id_updated_at_idx" ON "agent_artifacts" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "agent_artifacts_workspace_id_idx" ON "agent_artifacts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_feedback_user_id_created_at_idx" ON "agent_feedback" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_feedback_run_id_idx" ON "agent_feedback" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_run_events_run_sequence_uq" ON "agent_run_events" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE INDEX "agent_run_events_user_id_created_at_idx" ON "agent_run_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_user_id_created_at_idx" ON "agent_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_workspace_id_created_at_idx" ON "agent_runs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_tool_status_workspace_tool_uq" ON "agent_tool_status" USING btree ("workspace_id","tool_name");--> statement-breakpoint
CREATE INDEX "agent_tool_status_user_id_idx" ON "agent_tool_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_workspaces_user_id_idx" ON "agent_workspaces" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_routing_logs_user_id_created_at_idx" ON "ai_routing_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_routing_logs_run_id_idx" ON "ai_routing_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "career_diary_entries_user_id_occurred_at_idx" ON "career_diary_entries" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "career_goals_user_id_status_idx" ON "career_goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "career_match_suggestions_user_id_created_at_idx" ON "career_match_suggestions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "career_match_suggestions_goal_id_idx" ON "career_match_suggestions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "career_milestones_goal_id_sort_order_idx" ON "career_milestones" USING btree ("goal_id","sort_order");--> statement-breakpoint
CREATE INDEX "career_milestones_user_id_status_idx" ON "career_milestones" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "context_providers_user_provider_uq" ON "context_providers" USING btree ("user_id","provider_type");--> statement-breakpoint
CREATE INDEX "context_providers_user_id_idx" ON "context_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "growth_events_user_id_occurred_at_idx" ON "growth_events" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "growth_events_roadmap_id_idx" ON "growth_events" USING btree ("roadmap_id");--> statement-breakpoint
CREATE INDEX "imported_context_items_user_id_imported_at_idx" ON "imported_context_items" USING btree ("user_id","imported_at");--> statement-breakpoint
CREATE INDEX "imported_context_items_provider_id_idx" ON "imported_context_items" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "memory_export_jobs_user_id_requested_at_idx" ON "memory_export_jobs" USING btree ("user_id","requested_at");--> statement-breakpoint
CREATE INDEX "memory_export_jobs_status_idx" ON "memory_export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mentor_roadmaps_user_id_status_idx" ON "mentor_roadmaps" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "mentor_tasks_roadmap_id_sort_order_idx" ON "mentor_tasks" USING btree ("roadmap_id","sort_order");--> statement-breakpoint
CREATE INDEX "mentor_tasks_user_id_status_idx" ON "mentor_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "preparation_messages_room_sequence_uq" ON "preparation_messages" USING btree ("room_id","sequence");--> statement-breakpoint
CREATE INDEX "preparation_messages_user_id_created_at_idx" ON "preparation_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "preparation_rooms_user_id_updated_at_idx" ON "preparation_rooms" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "subagent_tasks_run_id_created_at_idx" ON "subagent_tasks" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "subagent_tasks_user_id_status_idx" ON "subagent_tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tool_approvals_user_id_created_at_idx" ON "tool_approvals" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_approvals_run_id_idx" ON "tool_approvals" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "tool_audit_logs_user_id_created_at_idx" ON "tool_audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_audit_logs_run_id_idx" ON "tool_audit_logs" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_uq" ON "user_preferences" USING btree ("user_id");