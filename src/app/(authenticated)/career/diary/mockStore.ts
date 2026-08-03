'use client';

export interface MockCareerRecord {
  id: string;
  company?: string;
  role?: string;
  period?: string;
  description?: string;
  achievements?: string[];
}

export interface MockDiaryRecord {
  id: string;
  userId: string;
  entryType: string;
  title: string | null;
  content: string;
  tags: string[];
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockMilestoneRecord {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockGoalRecord {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  targetDate: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  milestones: MockMilestoneRecord[];
}

export interface MockMatchRecord {
  id: string;
  userId: string;
  goalId: string | null;
  jobTitle: string;
  companyName: string | null;
  matchScore: number;
  reasonCodes: string[];
  rationale: string;
  status: string;
  createdAt: string;
  recommendationType: string;
  disclaimer: string;
}

export interface MockCandidate {
  jobTitle: string;
  companyName?: string;
  description?: string;
  keywords?: string[];
}

const STOP_WORDS = new Set(['그리고', '대한', '대해', '있는', '경험', '업무', '역량', '성과', '목표', '통해', '위한', '및', '등']);

export function isCareerMockMode(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem('is_mock_mode') === 'true';
}

export function mockUserId(): string {
  try {
    const user = JSON.parse(window.localStorage.getItem('mock_user') || '{}') as { id?: string };
    return user.id || 'mock-user';
  } catch {
    return 'mock-user';
  }
}

export function readMockList<T>(key: string): T[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

export function writeMockList<T>(key: string, value: T[]): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function mockId(prefix: string): string {
  return `mock-career-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mockTags(value: string): string[] {
  return Array.from(new Set(value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean))).slice(0, 20);
}

function tokens(value: unknown): string[] {
  const text = typeof value === 'string' ? value.toLocaleLowerCase('ko-KR') : '';
  const matches = text.match(/[가-힣]{2,}|[a-z0-9][a-z0-9+#./-]{1,}/gi) || [];
  return Array.from(new Set(matches.filter((item) => !STOP_WORDS.has(item))));
}

function overlap(left: Set<string>, right: Set<string>): string[] {
  return Array.from(left).filter((item) => right.has(item)).sort();
}

export function scoreMockCandidate(
  candidate: MockCandidate,
  careers: MockCareerRecord[],
  diary: MockDiaryRecord[],
  goals: MockGoalRecord[],
): { matchScore: number; reasonCodes: string[]; rationale: string } {
  const candidateTokens = new Set(tokens([
    candidate.jobTitle,
    candidate.companyName,
    candidate.description,
    ...(candidate.keywords || []),
  ].join(' ')));
  const titleTokens = new Set(tokens(candidate.jobTitle));
  const goalTokens = new Set(goals.flatMap((goal) => tokens([
    goal.title,
    goal.description,
    Array.isArray(goal.metadata?.keywords) ? (goal.metadata.keywords as string[]).join(' ') : '',
  ].join(' '))));
  const careerTokens = new Set(careers.flatMap((career) => tokens([
    career.company,
    career.role,
    career.description,
    ...(career.achievements || []),
  ].join(' '))));
  const careerRoleTokens = new Set(careers.flatMap((career) => tokens(career.role)));
  const diaryTokens = new Set(diary.flatMap((entry) => tokens([entry.title, entry.content, ...(entry.tags || [])].join(' '))));
  const goalMatches = overlap(candidateTokens, goalTokens);
  const careerMatches = overlap(candidateTokens, careerTokens);
  const diaryMatches = overlap(candidateTokens, diaryTokens);
  const roleMatches = overlap(titleTokens, careerRoleTokens);
  const reasonCodes: string[] = [];
  if (goalMatches.length) reasonCodes.push('GOAL_KEYWORD_MATCH');
  if (careerMatches.length) reasonCodes.push('CAREER_RECORD_MATCH');
  if (diaryMatches.length) reasonCodes.push('DIARY_THEME_MATCH');
  if (roleMatches.length) reasonCodes.push('ROLE_ALIGNMENT');
  if (!reasonCodes.length) reasonCodes.push('NO_DIRECT_KEYWORD_MATCH');
  const rationale = [
    goalMatches.length ? `목표 키워드 ${goalMatches.slice(0, 4).join(', ')} 일치` : '',
    careerMatches.length ? `경력 기록 ${careerMatches.slice(0, 4).join(', ')} 확인` : '',
    diaryMatches.length ? `일기 주제 ${diaryMatches.slice(0, 4).join(', ')} 확인` : '',
    roleMatches.length ? `기존 직무와 ${roleMatches.slice(0, 3).join(', ')} 관련` : '',
  ].filter(Boolean).join('; ') || '저장된 기록과 직접 일치하는 키워드가 없습니다. 후보 설명을 직접 확인해주세요.';
  return {
    matchScore: Math.min(100, goalMatches.length * 15 + careerMatches.length * 8 + diaryMatches.length * 5 + roleMatches.length * 10),
    reasonCodes,
    rationale,
  };
}
