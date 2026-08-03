import { createHash } from 'node:crypto';
import { analyzeATSCompatibility } from '@/server/ats';

export const CAREER_PLANNING_DISCLAIMER =
  '실제 채용 결과 데이터가 반영되지 않은 결정론적 참고지표입니다. 진단이나 지원 결과를 예측하지 않으며, 실제 사용자 간 자동 매칭을 제공하지 않습니다.';

export const CAREER_FIT_DISCLAIMER =
  '실제 채용 결과 데이터가 없어 지원 결과를 예측하지 않습니다. 입력한 공고 요건과 사용자 텍스트를 비교한 참고지표로만 확인해주세요.';

export const RIASEC_TYPES = [
  { code: 'R', label: '현실형', description: '도구와 실제 대상을 다루며 결과를 만들어내는 활동을 돌아봅니다.' },
  { code: 'I', label: '탐구형', description: '원인을 분석하고 문제를 구조화하는 활동을 돌아봅니다.' },
  { code: 'A', label: '예술형', description: '새로운 방식과 표현을 시도하는 활동을 돌아봅니다.' },
  { code: 'S', label: '사회형', description: '사람을 돕고 설명하며 함께 성장한 경험을 돌아봅니다.' },
  { code: 'E', label: '진취형', description: '방향을 제안하고 사람과 자원을 움직인 경험을 돌아봅니다.' },
  { code: 'C', label: '관습형', description: '자료와 절차를 정리해 안정성을 높인 경험을 돌아봅니다.' },
] as const;

export const MATCH_REASON_CODES = {
  GOAL_KEYWORD_MATCH: 'GOAL_KEYWORD_MATCH',
  CAREER_RECORD_MATCH: 'CAREER_RECORD_MATCH',
  DIARY_THEME_MATCH: 'DIARY_THEME_MATCH',
  ROLE_ALIGNMENT: 'ROLE_ALIGNMENT',
  NO_DIRECT_KEYWORD_MATCH: 'NO_DIRECT_KEYWORD_MATCH',
  ATS_REQUIREMENT_MATCH: 'ATS_REQUIREMENT_MATCH',
  ATS_REQUIREMENT_GAP: 'ATS_REQUIREMENT_GAP',
  APPLICATION_FIT_REFERENCE: 'APPLICATION_FIT_REFERENCE',
} as const;

export type MatchReasonCode = (typeof MATCH_REASON_CODES)[keyof typeof MATCH_REASON_CODES];

export interface CareerMatchCandidate {
  jobTitle: string;
  companyName?: string;
  description?: string;
  keywords?: string[];
  requirements?: string;
  skills?: string;
  experience?: string;
  education?: string;
}

export interface CareerMatchContext {
  careers: Array<{
    company?: unknown;
    role?: unknown;
    period?: unknown;
    description?: unknown;
    achievements?: unknown;
  }>;
  diaryEntries: Array<{
    title?: unknown;
    content?: unknown;
    tags?: unknown;
  }>;
  goals: Array<{
    title?: unknown;
    description?: unknown;
    metadata?: unknown;
  }>;
}

export interface CareerMatchResult {
  matchScore: number;
  reasonCodes: MatchReasonCode[];
  rationale: string;
  matchedKeywords: string[];
}

export interface CareerFitInput {
  jobTitle: string;
  companyName?: string;
  requirements: string;
  skills?: string;
  experience?: string;
  education?: string;
}

export type CareerFitLabel = '우선 검토' | '조건 확인' | '근거 부족';

export interface CareerFitAssessment {
  atsScore: number;
  atsHeuristicScore: number;
  recommendationFit: CareerFitLabel;
  recommendationFitScore: number;
  evidence: string[];
  matchedRequirements: string[];
  missingRequirements: string[];
  uncertainty: string[];
  atsBreakdown: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    keywordDensityScore: number;
  };
  matchedKeywords: string[];
  actualHiringDataAvailable: false;
  disclaimer: string;
}

export interface FallbackDiaryEntry {
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

export interface FallbackGoal {
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
}

export interface FallbackMilestone {
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

export interface FallbackMatchSuggestion {
  id: string;
  userId: string;
  goalId: string | null;
  jobTitle: string;
  companyName: string | null;
  jobReferenceHash: string | null;
  matchScore: number;
  reasonCodes: string[];
  rationale: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

const STOP_WORDS = new Set([
  '그리고', '대한', '대해', '있는', '있습니다', '경험', '업무', '역량', '성과', '목표', '통해', '위한',
  '에서', '으로', '하는', '하게', '합니다', '및', '등', '더', '잘', '수', '있는지', '현재',
]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nextFallbackId(prefix: string): string {
  fallbackSequence += 1;
  return `demo-${prefix}-${Date.now()}-${fallbackSequence}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown, maxLength = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function toStringArray(value: unknown, maxItems = 20, maxLength = 80): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，\n]/)
      : [];

  return Array.from(new Set(
    values
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
}

export function parseDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return fallback;
}

export function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = parseDate(value, new Date('invalid'));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parsePriority(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(5, Math.round(number)));
}

export function normalizeGoalStatus(value: unknown, fallback = 'active'): string {
  const status = asTrimmedString(value, 30).toLowerCase();
  return ['active', 'completed', 'archived'].includes(status) ? status : fallback;
}

export function normalizeMilestoneStatus(value: unknown, fallback = 'pending'): string {
  const status = asTrimmedString(value, 30).toLowerCase();
  return ['pending', 'completed', 'skipped'].includes(status) ? status : fallback;
}

export function completionStatus(value: unknown, current: string, kind: 'goal' | 'milestone'): string | undefined {
  if (typeof value === 'boolean') {
    if (kind === 'goal') return value ? 'completed' : 'active';
    return value ? 'completed' : 'pending';
  }
  return typeof value === 'string'
    ? kind === 'goal' ? normalizeGoalStatus(value, current) : normalizeMilestoneStatus(value, current)
    : undefined;
}

function normalizeRiasec(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const questions = Array.isArray(value.questions)
    ? value.questions.slice(0, 12).filter(isRecord).map((question) => {
      const rawScore = question.score ?? question.value ?? question.answer;
      return {
        code: asTrimmedString(question.code ?? question.type, 10),
        prompt: asTrimmedString(question.prompt ?? question.question, 300),
        score: typeof rawScore === 'number' && Number.isFinite(rawScore)
          ? Math.max(1, Math.min(5, Math.round(rawScore)))
          : undefined,
        answer: asTrimmedString(question.answer, 500) || undefined,
      };
    })
    : [];

  let result: Record<string, unknown> | undefined;
  if (isRecord(value.result)) {
    const scores = isRecord(value.result.scores)
      ? Object.fromEntries(Object.entries(value.result.scores).slice(0, 6).map(([code, score]) => [
        code.slice(0, 10),
        typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      ]))
      : {};
    result = {
      scores,
      order: Array.isArray(value.result.order)
        ? value.result.order.filter((item): item is string => typeof item === 'string').slice(0, 6)
        : [],
      note: asTrimmedString(value.result.note, 1000) || undefined,
    };
  }

  return {
    mode: 'exploration',
    disclaimer: '이 결과는 자기성찰을 위한 탐색 정보이며 진단 결과가 아닙니다.',
    questions,
    ...(result ? { result } : {}),
    savedAt: asTrimmedString(value.savedAt, 50) || new Date().toISOString(),
  };
}

function normalizeMandalart(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.cells) || value.cells.length !== 9) return null;
  if (!value.cells.every((row) => Array.isArray(row) && row.length === 9)) return null;
  const cells = value.cells.map((row) => (row as unknown[]).map((cell) => asTrimmedString(cell, 120)));
  return {
    mode: 'goal-action-plan',
    disclaimer: '만다라트는 목표와 행동 계획을 정리하는 기록 도구입니다. 달성 가능성을 보장하지 않습니다.',
    cells,
    centerGoal: asTrimmedString(value.centerGoal, 255) || cells[4][4],
    savedAt: asTrimmedString(value.savedAt, 50) || new Date().toISOString(),
  };
}

export function validateGoalMetadata(value: unknown): { value?: Record<string, unknown>; error?: string } {
  if (value === undefined) return {};
  if (!isRecord(value)) return { error: '목표 부가 데이터는 객체여야 합니다.' };

  const metadata: Record<string, unknown> = { ...value };
  if (Object.prototype.hasOwnProperty.call(value, 'riasec')) {
    const riasec = normalizeRiasec(value.riasec);
    if (!riasec) return { error: 'RIASEC 탐색 데이터 형식이 올바르지 않습니다.' };
    metadata.riasec = riasec;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'mandalart')) {
    const mandalart = normalizeMandalart(value.mandalart);
    if (!mandalart) return { error: '만다라트는 9행 9열 데이터여야 합니다.' };
    metadata.mandalart = mandalart;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'keywords')) {
    metadata.keywords = toStringArray(value.keywords, 30, 80);
  }

  try {
    if (JSON.stringify(metadata).length > 50_000) return { error: '목표 부가 데이터가 너무 큽니다.' };
  } catch {
    return { error: '목표 부가 데이터를 저장할 수 없습니다.' };
  }
  return { value: metadata };
}

export function mergeGoalMetadata(
  existing: unknown,
  incoming: unknown,
): { value?: Record<string, unknown>; error?: string } {
  if (incoming === undefined) {
    return validateGoalMetadata(existing ?? {});
  }
  if (!isRecord(incoming)) return { error: '목표 부가 데이터는 객체여야 합니다.' };
  const base = isRecord(existing) ? existing : {};
  return validateGoalMetadata({ ...base, ...incoming });
}

export function goalMetadataWithKeywords(metadata: unknown, keywords: unknown): Record<string, unknown> | undefined {
  const parsed = validateGoalMetadata(metadata);
  if (parsed.error || !parsed.value) return undefined;
  const values = toStringArray(keywords, 30, 80);
  if (values.length > 0) parsed.value.keywords = values;
  return parsed.value;
}

export function tokenize(value: unknown): string[] {
  const text = typeof value === 'string' ? value.normalize('NFKC').toLocaleLowerCase('ko-KR') : '';
  const matches = text.match(/[가-힣]{2,}|[a-z0-9][a-z0-9+#./-]{1,}/gi) ?? [];
  return Array.from(new Set(matches.map((token) => token.replace(/^[./-]+|[./-]+$/g, '')).filter((token) => token && !STOP_WORDS.has(token))));
}

function intersect(left: Set<string>, right: Set<string>): string[] {
  return Array.from(left).filter((token) => right.has(token)).sort((a, b) => a.localeCompare(b, 'ko'));
}

function metadataKeywords(metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];
  return toStringArray(metadata.keywords, 30, 80);
}

const CAREER_FIT_STOP_WORDS = new Set([
  ...STOP_WORDS,
  '경력', '경험', '기술', '스킬', '요건', '요구사항', '자격', '자격요건', '필수', '우대', '관련',
  '담당', '업무', '가능', '보유', '이상', '이하', '이내', '채용', '지원', '모집', '분야', '조건',
  'years', 'year', 'experience', 'required', 'preferred', 'skills', 'skill',
]);

function textFromUnknown(value: unknown, maxLength: number): string {
  if (typeof value === 'string') return value.trim().slice(0, maxLength);
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ')
      .slice(0, maxLength);
  }
  return '';
}

function readTextFromSources(
  sources: Array<Record<string, unknown>>,
  keys: string[],
  maxLength: number,
): string {
  for (const source of sources) {
    for (const key of keys) {
      const value = textFromUnknown(source[key], maxLength);
      if (value) return value;
    }
  }
  return '';
}

export function normalizeCareerFitInput(value: unknown): CareerFitInput | null {
  if (!isRecord(value)) return null;
  const profile = isRecord(value.profile)
    ? value.profile
    : isRecord(value.userProfile) ? value.userProfile : {};
  const jobPosting = isRecord(value.jobPosting) ? value.jobPosting : {};
  const sources = [value, jobPosting, profile];
  const jobTitle = readTextFromSources(sources, ['jobTitle', 'title', 'role', 'jobRole'], 255);
  if (!jobTitle) return null;

  return {
    jobTitle,
    companyName: readTextFromSources(sources, ['companyName', 'company'], 255) || undefined,
    requirements: readTextFromSources(sources, ['requirements', 'requirementsText', 'jobRequirements', 'jobDescription', 'description'], 6_000),
    skills: readTextFromSources(sources, ['skills', 'skillsText', 'skillText', 'userSkills', 'mySkills'], 5_000) || undefined,
    experience: readTextFromSources(sources, ['experience', 'experienceText', 'careerText', 'workExperience', 'career'], 5_000) || undefined,
    education: readTextFromSources(sources, ['education', 'educationText', 'academicBackground', 'academicHistory'], 3_000) || undefined,
  };
}

export function careerFitInputFromCandidate(
  candidate: CareerMatchCandidate,
  profile?: unknown,
): CareerFitInput {
  const profileRecord = isRecord(profile) ? profile : {};
  return {
    jobTitle: candidate.jobTitle,
    companyName: candidate.companyName,
    requirements: candidate.requirements || candidate.description || textFromUnknown(profileRecord.requirements, 6_000),
    skills: candidate.skills || textFromUnknown(profileRecord.skills ?? profileRecord.skillsText ?? profileRecord.userSkills, 5_000) || undefined,
    experience: candidate.experience || textFromUnknown(profileRecord.experience ?? profileRecord.experienceText ?? profileRecord.workExperience, 5_000) || undefined,
    education: candidate.education || textFromUnknown(profileRecord.education ?? profileRecord.educationText ?? profileRecord.academicBackground, 3_000) || undefined,
  };
}

function contextText(context?: CareerMatchContext): string {
  if (!context) return '';
  return [
    ...context.careers.flatMap((career) => [
      textFromUnknown(career.company, 255),
      textFromUnknown(career.role, 255),
      textFromUnknown(career.period, 255),
      textFromUnknown(career.description, 5_000),
      textFromUnknown(career.achievements, 5_000),
    ]),
    ...context.diaryEntries.flatMap((entry) => [
      textFromUnknown(entry.title, 255),
      textFromUnknown(entry.content, 5_000),
      textFromUnknown(entry.tags, 1_000),
    ]),
    ...context.goals.flatMap((goal) => [
      textFromUnknown(goal.title, 255),
      textFromUnknown(goal.description, 5_000),
      textFromUnknown(metadataKeywords(goal.metadata), 2_000),
    ]),
  ].filter(Boolean).join(' ');
}

function extractExperienceYears(value: string): number {
  const matches = Array.from(value.matchAll(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:년|years?|yrs?)/gi));
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((match) => Number(match[1])).filter(Number.isFinite));
}

function extractRequiredExperienceYears(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(?:\+\s*)?(?:년|years?|yrs?)/i);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isFinite(years) ? years : null;
}

function educationLevel(value: string): number {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('ko-KR');
  if (/(박사|ph\.?d|doctor)/i.test(normalized)) return 4;
  if (/(석사|master|m\.?s\.?|m\.?a\.?|msc)/i.test(normalized)) return 3;
  if (/(학사|bachelor|b\.?s\.?|b\.?a\.?)/i.test(normalized)) return 2;
  if (/(전문대|전문학사|고졸|고등학교|associate|high school)/i.test(normalized)) return 1;
  return 0;
}

function educationRequirement(value: string): { level: number; label: string } | null {
  if (/(박사|ph\.?d|doctor)/i.test(value)) return { level: 4, label: '박사 학력' };
  if (/(석사|master|m\.?s\.?|m\.?a\.?|msc)/i.test(value)) return { level: 3, label: '석사 학력' };
  if (/(학사|bachelor|b\.?s\.?|b\.?a\.?)/i.test(value)) return { level: 2, label: '학사 학력' };
  if (/(전문대|전문학사|고졸|고등학교|associate|high school)/i.test(value)) return { level: 1, label: '고등학교 이상 학력' };
  return null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function requirementTokens(value: string, knownTerms: Set<string>): string[] {
  return uniqueStrings(tokenize(value).filter((token) => (
    token.length >= 2 &&
    !CAREER_FIT_STOP_WORDS.has(token) &&
    !/^\d+(?:\.\d+)?$/.test(token) &&
    !knownTerms.has(token)
  ))).slice(0, 24);
}

export function calculateCareerFit(
  input: CareerFitInput,
  context?: CareerMatchContext,
): CareerFitAssessment {
  const requirements = input.requirements.trim();
  const storedContext = contextText(context);
  const explicitProfile = [input.skills, input.experience, input.education].filter(Boolean).join(' ');
  const profileText = [explicitProfile, storedContext].filter(Boolean).join(' ');
  const ats = analyzeATSCompatibility(profileText, requirements);
  const knownTerms = new Set([...ats.foundKeywords, ...ats.missingKeywords].flatMap((value) => tokenize(value)));
  const genericRequirements = requirementTokens(requirements, knownTerms);
  const profileTokens = new Set(tokenize(profileText));
  const matchedGeneric = genericRequirements.filter((token) => profileTokens.has(token));
  const missingGeneric = genericRequirements.filter((token) => !profileTokens.has(token));
  const requiredYears = extractRequiredExperienceYears(requirements);
  const profileYears = extractExperienceYears([input.experience, storedContext].filter(Boolean).join(' '));
  const requiredEducation = educationRequirement(requirements);
  const profileEducation = educationLevel([input.education, storedContext].filter(Boolean).join(' '));
  const roleTokens = tokenize(input.jobTitle).filter((token) => !CAREER_FIT_STOP_WORDS.has(token));
  const roleMatches = roleTokens.filter((token) => profileTokens.has(token));
  const requirementUnits = [
    ...ats.foundKeywords.map((keyword) => ({ label: keyword, matched: true })),
    ...ats.missingKeywords.map((keyword) => ({ label: keyword, matched: false })),
    ...matchedGeneric.map((token) => ({ label: token, matched: true })),
    ...missingGeneric.map((token) => ({ label: token, matched: false })),
    ...(requiredYears === null ? [] : [{ label: `경력 ${requiredYears}년 이상`, matched: profileYears >= requiredYears && profileYears > 0 }]),
    ...(requiredEducation === null ? [] : [{ label: requiredEducation.label, matched: profileEducation >= requiredEducation.level }]),
  ];
  const requirementCoverage = requirementUnits.length === 0
    ? 0
    : Math.round((requirementUnits.filter((unit) => unit.matched).length / requirementUnits.length) * 100);
  const roleCoverage = roleTokens.length === 0 ? 0 : Math.round((roleMatches.length / roleTokens.length) * 100);
  const recommendationFitScore = Math.max(0, Math.min(100, Math.round(
    ats.matchScore * 0.6 + requirementCoverage * 0.3 + roleCoverage * 0.1,
  )));
  const hasCriticalGap = (requiredYears !== null && (profileYears === 0 || profileYears < requiredYears)) ||
    (requiredEducation !== null && profileEducation < requiredEducation.level);
  const recommendationFit: CareerFitLabel = hasCriticalGap
    ? recommendationFitScore >= 65 ? '조건 확인' : '근거 부족'
    : recommendationFitScore >= 75 ? '우선 검토' : recommendationFitScore >= 50 ? '조건 확인' : '근거 부족';

  const matchedRequirements = uniqueStrings([
    ...ats.foundKeywords,
    ...matchedGeneric,
    ...(requiredYears !== null && profileYears >= requiredYears && profileYears > 0 ? [`경력 ${requiredYears}년 이상`] : []),
    ...(requiredEducation !== null && profileEducation >= requiredEducation.level ? [requiredEducation.label] : []),
  ]).slice(0, 30);
  const missingRequirements = uniqueStrings([
    ...ats.missingKeywords,
    ...missingGeneric,
    ...(requiredYears !== null && (profileYears === 0 || profileYears < requiredYears) ? [`경력 ${requiredYears}년 이상`] : []),
    ...(requiredEducation !== null && profileEducation < requiredEducation.level ? [requiredEducation.label] : []),
  ]).slice(0, 30);

  const evidence: string[] = [];
  if (ats.foundKeywords.length > 0) {
    evidence.push(`ATS 기술 키워드 ${ats.foundKeywords.slice(0, 6).join(', ')} 일치`);
  }
  if (matchedGeneric.length > 0) {
    evidence.push(`공고 요건 ${matchedGeneric.slice(0, 6).join(', ')}를 입력 기록에서 확인`);
  }
  if (requiredYears !== null && profileYears >= requiredYears && profileYears > 0) {
    evidence.push(`경력 요건 ${requiredYears}년 이상을 입력 경력 ${profileYears}년에서 확인`);
  }
  if (requiredEducation !== null && profileEducation >= requiredEducation.level) {
    evidence.push(`${requiredEducation.label} 요건을 입력 학력에서 확인`);
  }
  if (roleMatches.length > 0) {
    evidence.push(`직무명과 입력 기록에서 ${roleMatches.slice(0, 4).join(', ')} 연결`);
  }
  if (evidence.length === 0) evidence.push('입력 기록에서 직접 확인된 요건이 없습니다.');
  evidence.push(`ATS ${ats.matchScore}/100, 공고 요건 커버리지 ${requirementCoverage}% 및 직무 근거를 고정 규칙으로 조합`);

  const uncertainty: string[] = [
    '실제 채용 결과 데이터가 없어 지원 결과를 예측하지 않습니다.',
    '입력 텍스트에 없는 경력의 질, 포트폴리오, 면접 및 회사별 심사 기준은 판단하지 않습니다.',
  ];
  if (!input.skills?.trim()) uncertainty.push('스킬 텍스트가 없어 기술 요건 판단이 제한됩니다.');
  if (!input.experience?.trim()) uncertainty.push('경력 텍스트가 없어 경력 요건 판단이 제한됩니다.');
  if (!input.education?.trim()) uncertainty.push('학력 텍스트가 없어 학력 요건 판단이 제한됩니다.');
  if (requirementUnits.length === 0) uncertainty.push('인식 가능한 공고 요건이 부족해 비교 범위가 제한됩니다.');

  const matchedKeywords = uniqueStrings([...matchedRequirements, ...roleMatches]).slice(0, 30);
  return {
    atsScore: ats.matchScore,
    atsHeuristicScore: ats.matchScore,
    recommendationFit,
    recommendationFitScore,
    evidence,
    matchedRequirements,
    missingRequirements,
    uncertainty,
    atsBreakdown: ats.detailedBreakdown,
    matchedKeywords,
    actualHiringDataAvailable: false,
    disclaimer: CAREER_FIT_DISCLAIMER,
  };
}

export function careerFitReasonCodes(assessment: CareerFitAssessment): MatchReasonCode[] {
  return [
    MATCH_REASON_CODES.APPLICATION_FIT_REFERENCE,
    ...(assessment.matchedRequirements.length > 0 ? [MATCH_REASON_CODES.ATS_REQUIREMENT_MATCH] : []),
    ...(assessment.missingRequirements.length > 0 ? [MATCH_REASON_CODES.ATS_REQUIREMENT_GAP] : []),
  ];
}

export function serializeCareerFitRationale(assessment: CareerFitAssessment): string {
  const list = (values: string[]) => values.length > 0 ? values.join(', ') : '없음';
  return [
    `지원 적합도 참고지표: ${assessment.recommendationFit} (${assessment.recommendationFitScore}/100)`,
    `ATS 휴리스틱: ${assessment.atsScore}/100`,
    `근거: ${list(assessment.evidence)}`,
    `부족 요건: ${list(assessment.missingRequirements)}`,
    `불확실성: ${list(assessment.uncertainty)}`,
  ].join(' | ');
}

export function calculateCareerMatch(
  candidate: CareerMatchCandidate,
  context: CareerMatchContext,
): CareerMatchResult {
  const candidateTokens = new Set(tokenize([
    candidate.jobTitle,
    candidate.companyName,
    candidate.description,
    ...(candidate.keywords ?? []),
  ].filter(Boolean).join(' ')));
  const jobTitleTokens = new Set(tokenize(candidate.jobTitle));

  const goalTokens = new Set(context.goals.flatMap((goal) => [
    tokenize(goal.title),
    tokenize(goal.description),
    tokenize(metadataKeywords(goal.metadata).join(' ')),
  ].flat()));
  const careerTokens = new Set(context.careers.flatMap((career) => [
    tokenize(career.company),
    tokenize(career.role),
    tokenize(career.period),
    tokenize(career.description),
    tokenize(Array.isArray(career.achievements) ? career.achievements.join(' ') : career.achievements),
  ].flat()));
  const careerRoleTokens = new Set(context.careers.flatMap((career) => tokenize(career.role)));
  const diaryTokens = new Set(context.diaryEntries.flatMap((entry) => [
    tokenize(entry.title),
    tokenize(entry.content),
    tokenize(toStringArray(entry.tags, 20, 80).join(' ')),
  ].flat()));

  const goalMatches = intersect(candidateTokens, goalTokens);
  const careerMatches = intersect(candidateTokens, careerTokens);
  const diaryMatches = intersect(candidateTokens, diaryTokens);
  const roleMatches = intersect(jobTitleTokens, careerRoleTokens);

  const score = Math.min(
    100,
    goalMatches.length * 15 +
      careerMatches.length * 8 +
      diaryMatches.length * 5 +
      roleMatches.length * 10,
  );

  const reasonCodes: MatchReasonCode[] = [];
  if (goalMatches.length > 0) reasonCodes.push(MATCH_REASON_CODES.GOAL_KEYWORD_MATCH);
  if (careerMatches.length > 0) reasonCodes.push(MATCH_REASON_CODES.CAREER_RECORD_MATCH);
  if (diaryMatches.length > 0) reasonCodes.push(MATCH_REASON_CODES.DIARY_THEME_MATCH);
  if (roleMatches.length > 0) reasonCodes.push(MATCH_REASON_CODES.ROLE_ALIGNMENT);
  if (reasonCodes.length === 0) reasonCodes.push(MATCH_REASON_CODES.NO_DIRECT_KEYWORD_MATCH);

  const rationaleParts: string[] = [];
  if (goalMatches.length > 0) rationaleParts.push(`목표 키워드 ${goalMatches.slice(0, 4).join(', ')} 일치`);
  if (careerMatches.length > 0) rationaleParts.push(`경력 기록 ${careerMatches.slice(0, 4).join(', ')} 확인`);
  if (diaryMatches.length > 0) rationaleParts.push(`일기 주제 ${diaryMatches.slice(0, 4).join(', ')} 확인`);
  if (roleMatches.length > 0) rationaleParts.push(`기존 직무와 ${roleMatches.slice(0, 3).join(', ')} 관련`);
  if (rationaleParts.length === 0) rationaleParts.push('저장된 기록과 직접 일치하는 키워드가 없습니다. 후보 설명을 직접 확인해주세요.');

  return {
    matchScore: score,
    reasonCodes,
    rationale: rationaleParts.join('; '),
    matchedKeywords: Array.from(new Set([...goalMatches, ...careerMatches, ...diaryMatches, ...roleMatches])).slice(0, 20),
  };
}

export function hashJobReference(candidate: CareerMatchCandidate): string {
  const canonical = JSON.stringify({
    jobTitle: asTrimmedString(candidate.jobTitle, 255),
    companyName: asTrimmedString(candidate.companyName, 255),
    description: asTrimmedString(candidate.description, 3000),
    requirements: asTrimmedString(candidate.requirements, 6000) || undefined,
    skills: asTrimmedString(candidate.skills, 5000) || undefined,
    experience: asTrimmedString(candidate.experience, 5000) || undefined,
    education: asTrimmedString(candidate.education, 3000) || undefined,
    keywords: toStringArray(candidate.keywords, 30, 80).sort(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function normalizeCandidate(value: unknown): CareerMatchCandidate | null {
  if (!isRecord(value)) return null;
  const jobTitle = asTrimmedString(value.jobTitle ?? value.title ?? value.role, 255);
  if (!jobTitle) return null;
  return {
    jobTitle,
    companyName: asTrimmedString(value.companyName ?? value.company, 255) || undefined,
    description: asTrimmedString(value.description ?? value.summary, 3000) || undefined,
    keywords: toStringArray(value.keywords ?? value.tags ?? value.skills, 30, 80),
    requirements: asTrimmedString(value.requirements ?? value.requirementsText ?? value.jobRequirements ?? value.jobDescription, 6_000) || undefined,
    skills: textFromUnknown(value.skills ?? value.skillsText ?? value.profileSkills ?? value.userSkills, 5_000) || undefined,
    experience: textFromUnknown(value.experience ?? value.experienceText ?? value.profileExperience ?? value.workExperience, 5_000) || undefined,
    education: textFromUnknown(value.education ?? value.educationText ?? value.profileEducation, 3_000) || undefined,
  };
}

export function normalizeCandidates(body: unknown): CareerMatchCandidate[] {
  if (!isRecord(body)) return [];
  const raw = body.candidates ?? body.jobs ?? body.jobCandidates ?? body.candidateJobs;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [body];
  return values.map(normalizeCandidate).filter((candidate): candidate is CareerMatchCandidate => candidate !== null).slice(0, 50);
}

export function fallbackGoalWithMilestones(userId: string, goal: FallbackGoal): FallbackGoal & { milestones: FallbackMilestone[] } {
  return {
    ...clone(goal),
    milestones: listFallbackMilestones(userId, goal.id),
  };
}

const fallbackDiary = new Map<string, FallbackDiaryEntry[]>();
const fallbackGoals = new Map<string, FallbackGoal[]>();
const fallbackMilestones = new Map<string, FallbackMilestone[]>();
const fallbackMatches = new Map<string, FallbackMatchSuggestion[]>();
let fallbackSequence = 0;

export function resetCareerPlanningFallbackStore(): void {
  fallbackDiary.clear();
  fallbackGoals.clear();
  fallbackMilestones.clear();
  fallbackMatches.clear();
  fallbackSequence = 0;
}

export function listFallbackDiary(userId: string): FallbackDiaryEntry[] {
  return clone((fallbackDiary.get(userId) ?? []).slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
}

export function createFallbackDiary(data: Omit<FallbackDiaryEntry, 'id' | 'createdAt' | 'updatedAt'>): FallbackDiaryEntry {
  const now = new Date().toISOString();
  const item: FallbackDiaryEntry = { ...data, id: nextFallbackId('diary'), createdAt: now, updatedAt: now };
  fallbackDiary.set(data.userId, [item, ...(fallbackDiary.get(data.userId) ?? [])]);
  return clone(item);
}

export function updateFallbackDiary(userId: string, id: string, patch: Partial<FallbackDiaryEntry>): FallbackDiaryEntry | null {
  const items = fallbackDiary.get(userId) ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], ...patch, updatedAt: new Date().toISOString() };
  return clone(items[index]);
}

export function deleteFallbackDiary(userId: string, id: string): boolean {
  const items = fallbackDiary.get(userId) ?? [];
  const next = items.filter((item) => item.id !== id);
  fallbackDiary.set(userId, next);
  return next.length !== items.length;
}

export function listFallbackGoals(userId: string): Array<FallbackGoal & { milestones: FallbackMilestone[] }> {
  return clone((fallbackGoals.get(userId) ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((goal) => fallbackGoalWithMilestones(userId, goal)));
}

export function getFallbackGoal(userId: string, id: string): (FallbackGoal & { milestones: FallbackMilestone[] }) | null {
  const goal = (fallbackGoals.get(userId) ?? []).find((item) => item.id === id);
  return goal ? fallbackGoalWithMilestones(userId, goal) : null;
}

export function createFallbackGoal(data: Omit<FallbackGoal, 'id' | 'createdAt' | 'updatedAt'>): FallbackGoal & { milestones: FallbackMilestone[] } {
  const now = new Date().toISOString();
  const goal: FallbackGoal = { ...data, id: nextFallbackId('goal'), createdAt: now, updatedAt: now };
  fallbackGoals.set(data.userId, [goal, ...(fallbackGoals.get(data.userId) ?? [])]);
  return fallbackGoalWithMilestones(data.userId, goal);
}

export function updateFallbackGoal(userId: string, id: string, patch: Partial<FallbackGoal>): (FallbackGoal & { milestones: FallbackMilestone[] }) | null {
  const items = fallbackGoals.get(userId) ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], ...patch, updatedAt: new Date().toISOString() };
  return fallbackGoalWithMilestones(userId, items[index]);
}

export function deleteFallbackGoal(userId: string, id: string): boolean {
  const goals = fallbackGoals.get(userId) ?? [];
  const next = goals.filter((goal) => goal.id !== id);
  if (next.length === goals.length) return false;
  fallbackGoals.set(userId, next);
  fallbackMilestones.set(userId, (fallbackMilestones.get(userId) ?? []).filter((milestone) => milestone.goalId !== id));
  const matches = fallbackMatches.get(userId) ?? [];
  fallbackMatches.set(userId, matches.map((match) => match.goalId === id ? { ...match, goalId: null } : match));
  return true;
}

export function listFallbackMilestones(userId: string, goalId?: string): FallbackMilestone[] {
  return clone((fallbackMilestones.get(userId) ?? [])
    .filter((item) => goalId === undefined || item.goalId === goalId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)));
}

export function getFallbackMilestone(userId: string, id: string): FallbackMilestone | null {
  return clone((fallbackMilestones.get(userId) ?? []).find((item) => item.id === id) ?? null);
}

export function createFallbackMilestone(data: Omit<FallbackMilestone, 'id' | 'createdAt' | 'updatedAt'>): FallbackMilestone {
  const now = new Date().toISOString();
  const item: FallbackMilestone = { ...data, id: nextFallbackId('milestone'), createdAt: now, updatedAt: now };
  fallbackMilestones.set(data.userId, [...(fallbackMilestones.get(data.userId) ?? []), item]);
  return clone(item);
}

export function updateFallbackMilestone(userId: string, id: string, patch: Partial<FallbackMilestone>): FallbackMilestone | null {
  const items = fallbackMilestones.get(userId) ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], ...patch, updatedAt: new Date().toISOString() };
  return clone(items[index]);
}

export function deleteFallbackMilestone(userId: string, id: string): boolean {
  const items = fallbackMilestones.get(userId) ?? [];
  const next = items.filter((item) => item.id !== id);
  fallbackMilestones.set(userId, next);
  return next.length !== items.length;
}

export function listFallbackMatches(userId: string, goalId?: string): FallbackMatchSuggestion[] {
  return clone((fallbackMatches.get(userId) ?? [])
    .filter((item) => goalId === undefined || item.goalId === goalId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function getFallbackMatch(userId: string, id: string): FallbackMatchSuggestion | null {
  return clone((fallbackMatches.get(userId) ?? []).find((item) => item.id === id) ?? null);
}

export function createFallbackMatch(data: Omit<FallbackMatchSuggestion, 'id' | 'createdAt'>): FallbackMatchSuggestion {
  const item: FallbackMatchSuggestion = { ...data, id: nextFallbackId('match'), createdAt: new Date().toISOString() };
  fallbackMatches.set(data.userId, [item, ...(fallbackMatches.get(data.userId) ?? [])]);
  return clone(item);
}

export function updateFallbackMatch(userId: string, id: string, patch: Partial<FallbackMatchSuggestion>): FallbackMatchSuggestion | null {
  const items = fallbackMatches.get(userId) ?? [];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], ...patch };
  return clone(items[index]);
}

export function deleteFallbackMatch(userId: string, id: string): boolean {
  const items = fallbackMatches.get(userId) ?? [];
  const next = items.filter((item) => item.id !== id);
  fallbackMatches.set(userId, next);
  return next.length !== items.length;
}
