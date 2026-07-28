export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: User;
  token?: string;
  demo?: boolean;
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  originalContent: string;
  parsedText?: string | null;
  status: 'draft' | 'evaluating' | 'improved';
  currentScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeEvaluation {
  score: number;
  clarityScore: number;
  impactScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export interface ResumeRefinementResult {
  evaluation: ResumeEvaluation;
  improvedResult: {
    improvedContent: string;
    keyChanges: string[];
    estimatedNewScore: number;
  };
}

export interface MockInterview {
  id: string;
  userId: string;
  jobTitle: string;
  companyName?: string | null;
  difficulty: 'junior' | 'medium' | 'senior';
  status: 'in_progress' | 'completed';
  overallScore?: number | null;
  overallFeedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewMessage {
  id: string;
  interviewId: string;
  sender: 'interviewer' | 'candidate';
  message: string;
  questionType?: 'technical' | 'behavioral' | 'followup' | 'introductory' | null;
  feedback?: {
    score: number;
    summary: string;
    tip: string;
  } | null;
  createdAt: string;
}

export interface ATSAnalysis {
  id: string;
  userId: string;
  jobTitle: string;
  jobDescription: string;
  resumeId?: string | null;
  matchScore: number;
  missingKeywords: string[];
  foundKeywords: string[];
  recommendations: string[];
  detailedBreakdown?: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
  } | null;
  createdAt: string;
}

export interface HumanizedText {
  id: string;
  userId: string;
  originalText: string;
  humanizedText: string;
  styleScore: number;
  changesSummary?: string | null;
  createdAt: string;
}

export interface QASet {
  id: string;
  userId: string;
  title: string;
  targetRole: string;
  qaPairs: QAPair[];
  createdAt: string;
}

export interface QAPair {
  question: string;
  sampleAnswer: string;
  keyPoints: string[];
}

export interface CareerEntry {
  id: string;
  userId: string;
  company: string;
  role: string;
  period: string;
  description: string;
  achievements?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface LLMOptions {
  instructions?: string;
  prompt: string;
  temperature?: number;
  schema?: any;
}

export interface LocalATSResult {
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  keywordDensity: number;
}

export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

export interface ChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
