import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { pgTable, timestamp, jsonb, integer, uuid, text, varchar, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const pgVector = customType({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value) {
    return JSON.stringify(value);
  },
  fromDriver(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  }
});
const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalContent: text("original_content").notNull(),
  parsedText: text("parsed_text"),
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  // 'draft' | 'evaluating' | 'improved'
  currentScore: integer("current_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const resumeRefinements = pgTable("resume_refinements", {
  id: uuid("id").defaultRandom().primaryKey(),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "cascade" }).notNull(),
  step: varchar("step", { length: 50 }).notNull(),
  // 'draft' | 'evaluate' | 'improve'
  draftContent: text("draft_content").notNull(),
  evaluationFeedback: jsonb("evaluation_feedback"),
  // { strengths, weaknesses, clarityScore, impactScore }
  score: integer("score").default(0),
  improvedContent: text("improved_content"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const mockInterviews = pgTable("mock_interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  difficulty: varchar("difficulty", { length: 50 }).default("medium").notNull(),
  // 'junior' | 'medium' | 'senior'
  status: varchar("status", { length: 50 }).default("in_progress").notNull(),
  // 'in_progress' | 'completed'
  overallScore: integer("overall_score"),
  overallFeedback: text("overall_feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const interviewMessages = pgTable("interview_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  interviewId: uuid("interview_id").references(() => mockInterviews.id, { onDelete: "cascade" }).notNull(),
  sender: varchar("sender", { length: 50 }).notNull(),
  // 'interviewer' | 'candidate'
  message: text("message").notNull(),
  questionType: varchar("question_type", { length: 50 }),
  // 'technical' | 'behavioral' | 'followup'
  feedback: jsonb("feedback"),
  // { score: number, summary: string, tip: string }
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const atsAnalyses = pgTable("ats_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  jobDescription: text("job_description").notNull(),
  resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "cascade" }),
  matchScore: integer("match_score").notNull(),
  missingKeywords: jsonb("missing_keywords").notNull(),
  // string[]
  foundKeywords: jsonb("found_keywords").notNull(),
  // string[]
  recommendations: jsonb("recommendations").notNull(),
  // string[]
  detailedBreakdown: jsonb("detailed_breakdown"),
  // { skillsScore, experienceScore, educationScore }
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const humanizedTexts = pgTable("humanized_texts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  originalText: text("original_text").notNull(),
  humanizedText: text("humanized_text").notNull(),
  styleScore: integer("style_score").default(95).notNull(),
  // naturalness score
  changesSummary: text("changes_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const qaSets = pgTable("qa_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  targetRole: varchar("target_role", { length: 255 }).notNull(),
  qaPairs: jsonb("qa_pairs").notNull(),
  // Array of { question: string, sampleAnswer: string, keyPoints: string[] }
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const careers = pgTable("careers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  period: varchar("period", { length: 100 }).notNull(),
  description: text("description").notNull(),
  achievements: jsonb("achievements"),
  // string[]
  embedding: pgVector("embedding"),
  // 1536-dim vector for semantic search
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  mockInterviews: many(mockInterviews),
  atsAnalyses: many(atsAnalyses),
  humanizedTexts: many(humanizedTexts),
  qaSets: many(qaSets),
  careers: many(careers)
}));
const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  refinements: many(resumeRefinements),
  atsAnalyses: many(atsAnalyses)
}));
const resumeRefinementsRelations = relations(resumeRefinements, ({ one }) => ({
  resume: one(resumes, { fields: [resumeRefinements.resumeId], references: [resumes.id] })
}));
const mockInterviewsRelations = relations(mockInterviews, ({ one, many }) => ({
  user: one(users, { fields: [mockInterviews.userId], references: [users.id] }),
  messages: many(interviewMessages)
}));
const interviewMessagesRelations = relations(interviewMessages, ({ one }) => ({
  interview: one(mockInterviews, { fields: [interviewMessages.interviewId], references: [mockInterviews.id] })
}));
const atsAnalysesRelations = relations(atsAnalyses, ({ one }) => ({
  user: one(users, { fields: [atsAnalyses.userId], references: [users.id] }),
  resume: one(resumes, { fields: [atsAnalyses.resumeId], references: [resumes.id] })
}));
const humanizedTextsRelations = relations(humanizedTexts, ({ one }) => ({
  user: one(users, { fields: [humanizedTexts.userId], references: [users.id] })
}));
const qaSetsRelations = relations(qaSets, ({ one }) => ({
  user: one(users, { fields: [qaSets.userId], references: [users.id] })
}));
const careersRelations = relations(careers, ({ one }) => ({
  user: one(users, { fields: [careers.userId], references: [users.id] })
}));

const schema = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  atsAnalyses: atsAnalyses,
  atsAnalysesRelations: atsAnalysesRelations,
  careers: careers,
  careersRelations: careersRelations,
  humanizedTexts: humanizedTexts,
  humanizedTextsRelations: humanizedTextsRelations,
  interviewMessages: interviewMessages,
  interviewMessagesRelations: interviewMessagesRelations,
  mockInterviews: mockInterviews,
  mockInterviewsRelations: mockInterviewsRelations,
  pgVector: pgVector,
  qaSets: qaSets,
  qaSetsRelations: qaSetsRelations,
  resumeRefinements: resumeRefinements,
  resumeRefinementsRelations: resumeRefinementsRelations,
  resumes: resumes,
  resumesRelations: resumesRelations,
  users: users,
  usersRelations: usersRelations
}, Symbol.toStringTag, { value: 'Module' }));

const { Pool } = pg;
let poolInstance = null;
let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/kairos";
    poolInstance = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 5e3
    });
    dbInstance = drizzle(poolInstance, { schema });
  }
  return dbInstance;
}
const db = getDb();

export { atsAnalyses as a, resumeRefinements as b, careers as c, db as d, humanizedTexts as h, interviewMessages as i, mockInterviews as m, qaSets as q, resumes as r, users as u };
//# sourceMappingURL=index.mjs.map
