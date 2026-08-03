import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, customType, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// text-embedding-004 returns 768-dimensional vectors by default.
export const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  },
});

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(), // 'user' | 'admin' | 'manager'
  avatarUrl: text('avatar_url'),
  googleId: varchar('google_id', { length: 255 }),
  walletAddress: varchar('wallet_address', { length: 255 }),
  mfaSecret: text('mfa_secret'),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_google_id_uq').on(table.googleId),
  uniqueIndex('users_wallet_address_uq').on(table.walletAddress),
]);

// Existing tables from 0001 are kept in the schema so future diffs do not treat them as removals.
export const billingInvoices = pgTable('billing_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  tossPaymentKey: varchar('toss_payment_key', { length: 255 }),
  tossOrderId: varchar('toss_order_id', { length: 255 }),
  description: text('description'),
  period: varchar('period', { length: 7 }).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  plan: varchar('plan', { length: 20 }).default('free').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  tossPaymentKey: varchar('toss_payment_key', { length: 255 }),
  tossOrderId: varchar('toss_order_id', { length: 255 }),
  periodStart: timestamp('period_start').defaultNow().notNull(),
  periodEnd: timestamp('period_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(),
  count: integer('count').default(1).notNull(),
  period: varchar('period', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 15. System Settings & Backend Environment Configuration Table
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  category: varchar('category', { length: 50 }).default('env').notNull(), // 'env' | 'feature_flag' | 'llm' | 'storage'
  description: text('description'),
  isEncrypted: boolean('is_encrypted').default(false).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. Audit Logs Table (Admin Action Tracker)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Resumes Table
export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  originalContent: text('original_content').notNull(),
  parsedText: text('parsed_text'),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft' | 'evaluating' | 'improved'
  currentScore: integer('current_score').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Resume Refinement History (Async Chain: Draft -> Evaluate -> Improve)
export const resumeRefinements = pgTable('resume_refinements', {
  id: uuid('id').defaultRandom().primaryKey(),
  resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }).notNull(),
  step: varchar('step', { length: 50 }).notNull(), // 'draft' | 'evaluate' | 'improve'
  draftContent: text('draft_content').notNull(),
  evaluationFeedback: jsonb('evaluation_feedback'), // { strengths, weaknesses, clarityScore, impactScore }
  score: integer('score').default(0),
  improvedContent: text('improved_content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Mock Interviews Table
export const mockInterviews = pgTable('mock_interviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  difficulty: varchar('difficulty', { length: 50 }).default('medium').notNull(), // 'junior' | 'medium' | 'senior'
  status: varchar('status', { length: 50 }).default('in_progress').notNull(), // 'in_progress' | 'completed'
  overallScore: integer('overall_score'),
  overallFeedback: text('overall_feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Interview Messages (SSE streaming conversation logs & per-answer feedback)
export const interviewMessages = pgTable('interview_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  interviewId: uuid('interview_id').references(() => mockInterviews.id, { onDelete: 'cascade' }).notNull(),
  sender: varchar('sender', { length: 50 }).notNull(), // 'interviewer' | 'candidate'
  message: text('message').notNull(),
  questionType: varchar('question_type', { length: 50 }), // 'technical' | 'behavioral' | 'followup'
  feedback: jsonb('feedback'), // { score: number, summary: string, tip: string }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Interview Media (local video/audio metadata and analysis readiness)
export const interviewMedia = pgTable('interview_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  interviewId: uuid('interview_id').references(() => mockInterviews.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mediaType: varchar('media_type', { length: 20 }).notNull(), // 'video' | 'audio'
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  storagePath: text('storage_path').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  durationMs: integer('duration_ms'),
  analysisStatus: varchar('analysis_status', { length: 30 }).default('pending').notNull(),
  transcript: text('transcript'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => [
  index('interview_media_interview_id_created_at_idx').on(table.interviewId, table.createdAt),
  index('interview_media_user_id_created_at_idx').on(table.userId, table.createdAt),
]);

// 6. ATS Match Analyses
export const atsAnalyses = pgTable('ats_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  jobDescription: text('job_description').notNull(),
  resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'cascade' }),
  matchScore: integer('match_score').notNull(),
  missingKeywords: jsonb('missing_keywords').notNull(), // string[]
  foundKeywords: jsonb('found_keywords').notNull(), // string[]
  recommendations: jsonb('recommendations').notNull(), // string[]
  detailedBreakdown: jsonb('detailed_breakdown'), // { skillsScore, experienceScore, educationScore }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. AI Humanized Texts
export const humanizedTexts = pgTable('humanized_texts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  originalText: text('original_text').notNull(),
  humanizedText: text('humanized_text').notNull(),
  styleScore: integer('style_score').default(95).notNull(), // naturalness score
  changesSummary: text('changes_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Q&A Generation Sets
export const qaSets = pgTable('qa_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  targetRole: varchar('target_role', { length: 255 }).notNull(),
  qaPairs: jsonb('qa_pairs').notNull(), // Array of { question: string, sampleAnswer: string, keyPoints: string[] }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Career History (with pgvector semantic search)
export const careers = pgTable('careers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  company: varchar('company', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }).notNull(),
  period: varchar('period', { length: 100 }).notNull(),
  description: text('description').notNull(),
  achievements: jsonb('achievements'), // string[]
  embedding: pgVector('embedding'), // 768-dim vector for semantic search
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  refinements: many(resumeRefinements),
  atsAnalyses: many(atsAnalyses),
}));

export const resumeRefinementsRelations = relations(resumeRefinements, ({ one }) => ({
  resume: one(resumes, { fields: [resumeRefinements.resumeId], references: [resumes.id] }),
}));

export const mockInterviewsRelations = relations(mockInterviews, ({ one, many }) => ({
  user: one(users, { fields: [mockInterviews.userId], references: [users.id] }),
  messages: many(interviewMessages),
  media: many(interviewMedia),
}));

export const interviewMessagesRelations = relations(interviewMessages, ({ one }) => ({
  interview: one(mockInterviews, { fields: [interviewMessages.interviewId], references: [mockInterviews.id] }),
}));

export const interviewMediaRelations = relations(interviewMedia, ({ one }) => ({
  interview: one(mockInterviews, { fields: [interviewMedia.interviewId], references: [mockInterviews.id] }),
  user: one(users, { fields: [interviewMedia.userId], references: [users.id] }),
}));

export const atsAnalysesRelations = relations(atsAnalyses, ({ one }) => ({
  user: one(users, { fields: [atsAnalyses.userId], references: [users.id] }),
  resume: one(resumes, { fields: [atsAnalyses.resumeId], references: [resumes.id] }),
}));

export const humanizedTextsRelations = relations(humanizedTexts, ({ one }) => ({
  user: one(users, { fields: [humanizedTexts.userId], references: [users.id] }),
}));

export const qaSetsRelations = relations(qaSets, ({ one }) => ({
  user: one(users, { fields: [qaSets.userId], references: [users.id] }),
}));

// 10. Company Meta Intelligence (Job Korea x Saramin x Reddit Meta Analysis)
export const companyMeta = pgTable('company_meta', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull().unique(),
  industry: varchar('industry', { length: 100 }),
  wlbScore: integer('wlb_score').default(80),
  cultureScore: integer('culture_score').default(85),
  salaryScore: integer('salary_score').default(88),
  prosSummary: text('pros_summary'),
  consSummary: text('cons_summary'),
  aiInsight: text('ai_insight'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Community SNS Posts
export const communityPosts = pgTable('community_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }).default('career_tip').notNull(), // 'interview_pass' | 'career_tip' | 'qna'
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 17. Deep Agent Canvas
export const agentWorkspaces = pgTable('agent_workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agent_workspaces_user_id_idx').on(table.userId),
]);

export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => agentWorkspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  runType: varchar('run_type', { length: 50 }).default('canvas').notNull(),
  status: varchar('status', { length: 30 }).default('queued').notNull(),
  inputHash: varchar('input_hash', { length: 128 }),
  outputHash: varchar('output_hash', { length: 128 }),
  errorCode: varchar('error_code', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('agent_runs_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('agent_runs_workspace_id_created_at_idx').on(table.workspaceId, table.createdAt),
]);

export const agentArtifacts = pgTable('agent_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => agentWorkspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  artifactType: varchar('artifact_type', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  currentVersion: integer('current_version').default(1).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agent_artifacts_user_id_updated_at_idx').on(table.userId, table.updatedAt),
  index('agent_artifacts_workspace_id_idx').on(table.workspaceId),
]);

export const agentArtifactVersions = pgTable('agent_artifact_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  artifactId: uuid('artifact_id').references(() => agentArtifacts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 128 }).notNull(),
  sizeBytes: integer('size_bytes'),
  createdByRunId: uuid('created_by_run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_artifact_versions_artifact_version_uq').on(table.artifactId, table.version),
  index('agent_artifact_versions_user_id_idx').on(table.userId),
]);

export const agentRunEvents = pgTable('agent_run_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sequence: integer('sequence').notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorType: varchar('actor_type', { length: 30 }).default('agent').notNull(),
  toolName: varchar('tool_name', { length: 100 }),
  status: varchar('status', { length: 30 }),
  payloadHash: varchar('payload_hash', { length: 128 }),
  artifactVersionId: uuid('artifact_version_id').references(() => agentArtifactVersions.id, { onDelete: 'set null' }),
  errorCode: varchar('error_code', { length: 100 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_run_events_run_sequence_uq').on(table.runId, table.sequence),
  index('agent_run_events_user_id_created_at_idx').on(table.userId, table.createdAt),
]);

export const agentToolStatus = pgTable('agent_tool_status', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => agentWorkspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('available').notNull(),
  lastRunAt: timestamp('last_run_at'),
  lastErrorCode: varchar('last_error_code', { length: 100 }),
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_tool_status_workspace_tool_uq').on(table.workspaceId, table.toolName),
  index('agent_tool_status_user_id_idx').on(table.userId),
]);

// 18. Agent Feedback & User Preferences
export const agentFeedback = pgTable('agent_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  rating: integer('rating'),
  feedbackType: varchar('feedback_type', { length: 50 }).notNull(),
  comment: text('comment'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('agent_feedback_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('agent_feedback_run_id_idx').on(table.runId),
]);

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  locale: varchar('locale', { length: 20 }),
  timezone: varchar('timezone', { length: 100 }),
  communicationStyle: varchar('communication_style', { length: 50 }),
  memoryEnabled: boolean('memory_enabled').default(true).notNull(),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_preferences_user_id_uq').on(table.userId),
]);

// 19. Career Planning
export const careerDiaryEntries = pgTable('career_diary_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  entryType: varchar('entry_type', { length: 50 }).default('reflection').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('career_diary_entries_user_id_occurred_at_idx').on(table.userId, table.occurredAt),
]);

export const careerGoals = pgTable('career_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  priority: integer('priority').default(0).notNull(),
  targetDate: timestamp('target_date'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('career_goals_user_id_status_idx').on(table.userId, table.status),
]);

export const careerMilestones = pgTable('career_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').references(() => careerGoals.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('career_milestones_goal_id_sort_order_idx').on(table.goalId, table.sortOrder),
  index('career_milestones_user_id_status_idx').on(table.userId, table.status),
]);

export const careerMatchSuggestions = pgTable('career_match_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalId: uuid('goal_id').references(() => careerGoals.id, { onDelete: 'set null' }),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  jobReferenceHash: varchar('job_reference_hash', { length: 128 }),
  matchScore: integer('match_score').notNull(),
  reasonCodes: jsonb('reason_codes').$type<string[]>().default([]).notNull(),
  rationale: text('rationale'),
  status: varchar('status', { length: 30 }).default('new').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('career_match_suggestions_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('career_match_suggestions_goal_id_idx').on(table.goalId),
]);

// 20. Sea of Contexts
export const contextProviders = pgTable('context_providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  providerType: varchar('provider_type', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 160 }),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  externalAccountHash: varchar('external_account_hash', { length: 128 }),
  credentialRef: varchar('credential_ref', { length: 255 }),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  lastErrorCode: varchar('last_error_code', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('context_providers_user_provider_uq').on(table.userId, table.providerType),
  index('context_providers_user_id_idx').on(table.userId),
]);

export const importedContextItems = pgTable('imported_context_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerId: uuid('provider_id').references(() => contextProviders.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 128 }).notNull(),
  sourceReferenceHash: varchar('source_reference_hash', { length: 128 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  occurredAt: timestamp('occurred_at'),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('imported_context_items_user_id_imported_at_idx').on(table.userId, table.importedAt),
  index('imported_context_items_provider_id_idx').on(table.providerId),
]);

export const memoryExportJobs = pgTable('memory_export_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  providerId: uuid('provider_id').references(() => contextProviders.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 30 }).default('queued').notNull(),
  format: varchar('format', { length: 30 }).default('json').notNull(),
  selection: jsonb('selection').$type<Record<string, unknown>>().default({}).notNull(),
  itemCount: integer('item_count').default(0).notNull(),
  outputRef: varchar('output_ref', { length: 255 }),
  errorCode: varchar('error_code', { length: 100 }),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('memory_export_jobs_user_id_requested_at_idx').on(table.userId, table.requestedAt),
  index('memory_export_jobs_status_idx').on(table.status),
]);

// 21. Employment Preparation & Mentoring
export const preparationRooms = pgTable('preparation_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  roomType: varchar('room_type', { length: 50 }).default('general').notNull(),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('preparation_rooms_user_id_updated_at_idx').on(table.userId, table.updatedAt),
]);

export const preparationMessages = pgTable('preparation_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id').references(() => preparationRooms.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sequence: integer('sequence').notNull(),
  senderType: varchar('sender_type', { length: 30 }).notNull(),
  content: text('content').notNull(),
  contentHash: varchar('content_hash', { length: 128 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('preparation_messages_room_sequence_uq').on(table.roomId, table.sequence),
  index('preparation_messages_user_id_created_at_idx').on(table.userId, table.createdAt),
]);

export const mentorRoadmaps = pgTable('mentor_roadmaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  objective: text('objective'),
  status: varchar('status', { length: 30 }).default('active').notNull(),
  source: varchar('source', { length: 50 }).default('mentor').notNull(),
  targetDate: timestamp('target_date'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('mentor_roadmaps_user_id_status_idx').on(table.userId, table.status),
]);

export const mentorTasks = pgTable('mentor_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  roadmapId: uuid('roadmap_id').references(() => mentorRoadmaps.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).default('todo').notNull(),
  priority: integer('priority').default(0).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('mentor_tasks_roadmap_id_sort_order_idx').on(table.roadmapId, table.sortOrder),
  index('mentor_tasks_user_id_status_idx').on(table.userId, table.status),
]);

export const growthEvents = pgTable('growth_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roadmapId: uuid('roadmap_id').references(() => mentorRoadmaps.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => mentorTasks.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  impactScore: integer('impact_score'),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('growth_events_user_id_occurred_at_idx').on(table.userId, table.occurredAt),
  index('growth_events_roadmap_id_idx').on(table.roadmapId),
]);

// 22. AI Orchestration Auditability
// These records intentionally keep hashes and operational metrics, not prompts or tool payloads.
export const aiRoutingLogs = pgTable('ai_routing_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => agentWorkspaces.id, { onDelete: 'set null' }),
  requestHash: varchar('request_hash', { length: 128 }).notNull(),
  route: varchar('route', { length: 100 }).notNull(),
  provider: varchar('provider', { length: 100 }),
  model: varchar('model', { length: 100 }),
  fallbackUsed: boolean('fallback_used').default(false).notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  latencyMs: integer('latency_ms'),
  status: varchar('status', { length: 30 }).notNull(),
  errorCode: varchar('error_code', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ai_routing_logs_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('ai_routing_logs_run_id_idx').on(table.runId),
]);

export const subagentTasks = pgTable('subagent_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  taskKey: varchar('task_key', { length: 100 }).notNull(),
  agentRole: varchar('agent_role', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('queued').notNull(),
  inputHash: varchar('input_hash', { length: 128 }),
  outputHash: varchar('output_hash', { length: 128 }),
  resultArtifactVersionId: uuid('result_artifact_version_id').references(() => agentArtifactVersions.id, { onDelete: 'set null' }),
  attempt: integer('attempt').default(1).notNull(),
  errorCode: varchar('error_code', { length: 100 }),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('subagent_tasks_run_id_created_at_idx').on(table.runId, table.createdAt),
  index('subagent_tasks_user_id_status_idx').on(table.userId, table.status),
]);

export const toolApprovals = pgTable('tool_approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  argumentsHash: varchar('arguments_hash', { length: 128 }).notNull(),
  riskLevel: varchar('risk_level', { length: 30 }).default('medium').notNull(),
  status: varchar('status', { length: 30 }).default('pending').notNull(),
  decisionCode: varchar('decision_code', { length: 50 }),
  decidedAt: timestamp('decided_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('tool_approvals_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('tool_approvals_run_id_idx').on(table.runId),
]);

export const toolAuditLogs = pgTable('tool_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  runId: uuid('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => agentWorkspaces.id, { onDelete: 'set null' }),
  approvalId: uuid('approval_id').references(() => toolApprovals.id, { onDelete: 'set null' }),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 30 }).notNull(),
  argumentsHash: varchar('arguments_hash', { length: 128 }),
  resultHash: varchar('result_hash', { length: 128 }),
  durationMs: integer('duration_ms'),
  errorCode: varchar('error_code', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('tool_audit_logs_user_id_created_at_idx').on(table.userId, table.createdAt),
  index('tool_audit_logs_run_id_idx').on(table.runId),
]);

export const careersRelations = relations(careers, ({ one }) => ({
  user: one(users, { fields: [careers.userId], references: [users.id] }),
}));

export const communityPostsRelations = relations(communityPosts, ({ one }) => ({
  user: one(users, { fields: [communityPosts.userId], references: [users.id] }),
}));

// 12. Push Notification Subscriptions
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Chat Sessions (Persistent Shareable URLs)
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull().default('AI 채팅'),
  messages: jsonb('messages').notNull().default([]),
  context: text('context'),
  isPublic: varchar('is_public', { length: 10 }).default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

// 14. Studio Images (AI Photo Studio)
export const studioImages = pgTable('studio_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('generated'), // 'generated' | 'uploaded'
  prompt: text('prompt'),
  imageUrl: text('image_url').notNull(),
  width: integer('width').default(1024),
  height: integer('height').default(1024),
  originalFileName: varchar('original_file_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studioImagesRelations = relations(studioImages, ({ one }) => ({
  user: one(users, { fields: [studioImages.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  billingInvoices: many(billingInvoices),
  subscriptions: many(subscriptions),
  usageRecords: many(usageRecords),
  resumes: many(resumes),
  mockInterviews: many(mockInterviews),
  interviewMedia: many(interviewMedia),
  atsAnalyses: many(atsAnalyses),
  humanizedTexts: many(humanizedTexts),
  qaSets: many(qaSets),
  careers: many(careers),
  systemSettings: many(systemSettings),
  auditLogs: many(auditLogs),
  communityPosts: many(communityPosts),
  pushSubscriptions: many(pushSubscriptions),
  chatSessions: many(chatSessions),
  studioImages: many(studioImages),
  agentWorkspaces: many(agentWorkspaces),
  agentRuns: many(agentRuns),
  agentRunEvents: many(agentRunEvents),
  agentArtifacts: many(agentArtifacts),
  agentArtifactVersions: many(agentArtifactVersions),
  agentToolStatus: many(agentToolStatus),
  agentFeedback: many(agentFeedback),
  userPreferences: many(userPreferences),
  careerDiaryEntries: many(careerDiaryEntries),
  careerGoals: many(careerGoals),
  careerMilestones: many(careerMilestones),
  careerMatchSuggestions: many(careerMatchSuggestions),
  contextProviders: many(contextProviders),
  importedContextItems: many(importedContextItems),
  memoryExportJobs: many(memoryExportJobs),
  preparationRooms: many(preparationRooms),
  preparationMessages: many(preparationMessages),
  mentorRoadmaps: many(mentorRoadmaps),
  mentorTasks: many(mentorTasks),
  growthEvents: many(growthEvents),
  aiRoutingLogs: many(aiRoutingLogs),
  subagentTasks: many(subagentTasks),
  toolApprovals: many(toolApprovals),
  toolAuditLogs: many(toolAuditLogs),
}));

export const billingInvoicesRelations = relations(billingInvoices, ({ one }) => ({
  user: one(users, { fields: [billingInvoices.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, { fields: [usageRecords.userId], references: [users.id] }),
}));

export const agentWorkspacesRelations = relations(agentWorkspaces, ({ one, many }) => ({
  user: one(users, { fields: [agentWorkspaces.userId], references: [users.id] }),
  runs: many(agentRuns),
  artifacts: many(agentArtifacts),
  toolStatuses: many(agentToolStatus),
  routingLogs: many(aiRoutingLogs),
  toolAuditLogs: many(toolAuditLogs),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  user: one(users, { fields: [agentRuns.userId], references: [users.id] }),
  workspace: one(agentWorkspaces, { fields: [agentRuns.workspaceId], references: [agentWorkspaces.id] }),
  events: many(agentRunEvents),
  artifacts: many(agentArtifactVersions),
  feedback: many(agentFeedback),
  routingLogs: many(aiRoutingLogs),
  subagentTasks: many(subagentTasks),
  approvals: many(toolApprovals),
  toolAuditLogs: many(toolAuditLogs),
}));

export const agentArtifactsRelations = relations(agentArtifacts, ({ one, many }) => ({
  user: one(users, { fields: [agentArtifacts.userId], references: [users.id] }),
  workspace: one(agentWorkspaces, { fields: [agentArtifacts.workspaceId], references: [agentWorkspaces.id] }),
  versions: many(agentArtifactVersions),
}));

export const agentArtifactVersionsRelations = relations(agentArtifactVersions, ({ one, many }) => ({
  user: one(users, { fields: [agentArtifactVersions.userId], references: [users.id] }),
  artifact: one(agentArtifacts, { fields: [agentArtifactVersions.artifactId], references: [agentArtifacts.id] }),
  createdByRun: one(agentRuns, { fields: [agentArtifactVersions.createdByRunId], references: [agentRuns.id] }),
  events: many(agentRunEvents),
  subagentTasks: many(subagentTasks),
}));

export const agentRunEventsRelations = relations(agentRunEvents, ({ one }) => ({
  user: one(users, { fields: [agentRunEvents.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [agentRunEvents.runId], references: [agentRuns.id] }),
  artifactVersion: one(agentArtifactVersions, { fields: [agentRunEvents.artifactVersionId], references: [agentArtifactVersions.id] }),
}));

export const agentToolStatusRelations = relations(agentToolStatus, ({ one }) => ({
  user: one(users, { fields: [agentToolStatus.userId], references: [users.id] }),
  workspace: one(agentWorkspaces, { fields: [agentToolStatus.workspaceId], references: [agentWorkspaces.id] }),
}));

export const agentFeedbackRelations = relations(agentFeedback, ({ one }) => ({
  user: one(users, { fields: [agentFeedback.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [agentFeedback.runId], references: [agentRuns.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const careerDiaryEntriesRelations = relations(careerDiaryEntries, ({ one }) => ({
  user: one(users, { fields: [careerDiaryEntries.userId], references: [users.id] }),
}));

export const careerGoalsRelations = relations(careerGoals, ({ one, many }) => ({
  user: one(users, { fields: [careerGoals.userId], references: [users.id] }),
  milestones: many(careerMilestones),
  matchSuggestions: many(careerMatchSuggestions),
}));

export const careerMilestonesRelations = relations(careerMilestones, ({ one }) => ({
  user: one(users, { fields: [careerMilestones.userId], references: [users.id] }),
  goal: one(careerGoals, { fields: [careerMilestones.goalId], references: [careerGoals.id] }),
}));

export const careerMatchSuggestionsRelations = relations(careerMatchSuggestions, ({ one }) => ({
  user: one(users, { fields: [careerMatchSuggestions.userId], references: [users.id] }),
  goal: one(careerGoals, { fields: [careerMatchSuggestions.goalId], references: [careerGoals.id] }),
}));

export const contextProvidersRelations = relations(contextProviders, ({ one, many }) => ({
  user: one(users, { fields: [contextProviders.userId], references: [users.id] }),
  items: many(importedContextItems),
  exportJobs: many(memoryExportJobs),
}));

export const importedContextItemsRelations = relations(importedContextItems, ({ one }) => ({
  user: one(users, { fields: [importedContextItems.userId], references: [users.id] }),
  provider: one(contextProviders, { fields: [importedContextItems.providerId], references: [contextProviders.id] }),
}));

export const memoryExportJobsRelations = relations(memoryExportJobs, ({ one }) => ({
  user: one(users, { fields: [memoryExportJobs.userId], references: [users.id] }),
  provider: one(contextProviders, { fields: [memoryExportJobs.providerId], references: [contextProviders.id] }),
}));

export const preparationRoomsRelations = relations(preparationRooms, ({ one, many }) => ({
  user: one(users, { fields: [preparationRooms.userId], references: [users.id] }),
  messages: many(preparationMessages),
}));

export const preparationMessagesRelations = relations(preparationMessages, ({ one }) => ({
  user: one(users, { fields: [preparationMessages.userId], references: [users.id] }),
  room: one(preparationRooms, { fields: [preparationMessages.roomId], references: [preparationRooms.id] }),
}));

export const mentorRoadmapsRelations = relations(mentorRoadmaps, ({ one, many }) => ({
  user: one(users, { fields: [mentorRoadmaps.userId], references: [users.id] }),
  tasks: many(mentorTasks),
  growthEvents: many(growthEvents),
}));

export const mentorTasksRelations = relations(mentorTasks, ({ one, many }) => ({
  user: one(users, { fields: [mentorTasks.userId], references: [users.id] }),
  roadmap: one(mentorRoadmaps, { fields: [mentorTasks.roadmapId], references: [mentorRoadmaps.id] }),
  growthEvents: many(growthEvents),
}));

export const growthEventsRelations = relations(growthEvents, ({ one }) => ({
  user: one(users, { fields: [growthEvents.userId], references: [users.id] }),
  roadmap: one(mentorRoadmaps, { fields: [growthEvents.roadmapId], references: [mentorRoadmaps.id] }),
  task: one(mentorTasks, { fields: [growthEvents.taskId], references: [mentorTasks.id] }),
}));

export const aiRoutingLogsRelations = relations(aiRoutingLogs, ({ one }) => ({
  user: one(users, { fields: [aiRoutingLogs.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [aiRoutingLogs.runId], references: [agentRuns.id] }),
  workspace: one(agentWorkspaces, { fields: [aiRoutingLogs.workspaceId], references: [agentWorkspaces.id] }),
}));

export const subagentTasksRelations = relations(subagentTasks, ({ one }) => ({
  user: one(users, { fields: [subagentTasks.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [subagentTasks.runId], references: [agentRuns.id] }),
  resultArtifactVersion: one(agentArtifactVersions, { fields: [subagentTasks.resultArtifactVersionId], references: [agentArtifactVersions.id] }),
}));

export const toolApprovalsRelations = relations(toolApprovals, ({ one, many }) => ({
  user: one(users, { fields: [toolApprovals.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [toolApprovals.runId], references: [agentRuns.id] }),
  auditLogs: many(toolAuditLogs),
}));

export const toolAuditLogsRelations = relations(toolAuditLogs, ({ one }) => ({
  user: one(users, { fields: [toolAuditLogs.userId], references: [users.id] }),
  run: one(agentRuns, { fields: [toolAuditLogs.runId], references: [agentRuns.id] }),
  workspace: one(agentWorkspaces, { fields: [toolAuditLogs.workspaceId], references: [agentWorkspaces.id] }),
  approval: one(toolApprovals, { fields: [toolAuditLogs.approvalId], references: [toolApprovals.id] }),
}));
