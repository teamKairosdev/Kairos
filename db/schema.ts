import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom pgvector Drizzle type definition for 1536-dim embeddings
export const pgVector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
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
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  walletAddress: varchar('wallet_address', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
  embedding: pgVector('embedding'), // 1536-dim vector for semantic search
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  mockInterviews: many(mockInterviews),
  atsAnalyses: many(atsAnalyses),
  humanizedTexts: many(humanizedTexts),
  qaSets: many(qaSets),
  careers: many(careers),
}));

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
}));

export const interviewMessagesRelations = relations(interviewMessages, ({ one }) => ({
  interview: one(mockInterviews, { fields: [interviewMessages.interviewId], references: [mockInterviews.id] }),
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
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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

// 15. Subscriptions (Auto Margin Billing)
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  plan: varchar('plan', { length: 20 }).notNull().default('free'), // 'free' | 'pro' | 'enterprise'
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'canceled' | 'past_due'
  tossPaymentKey: varchar('toss_payment_key', { length: 255 }),
  tossOrderId: varchar('toss_order_id', { length: 255 }),
  periodStart: timestamp('period_start').defaultNow().notNull(),
  periodEnd: timestamp('period_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. Usage Records
export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(), // 'chat' | 'ats' | 'studio' | 'hwp'
  count: integer('count').notNull().default(1),
  period: varchar('period', { length: 7 }).notNull(), // 'YYYY-MM'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 17. Billing Invoices
export const billingInvoices = pgTable('billing_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // in KRW
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  tossPaymentKey: varchar('toss_payment_key', { length: 255 }),
  tossOrderId: varchar('toss_order_id', { length: 255 }),
  description: text('description'),
  period: varchar('period', { length: 7 }).notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, { fields: [usageRecords.userId], references: [users.id] }),
}));

export const billingInvoicesRelations = relations(billingInvoices, ({ one }) => ({
  user: one(users, { fields: [billingInvoices.userId], references: [users.id] }),
}));


