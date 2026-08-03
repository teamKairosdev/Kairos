import { getDb } from '@/db';
import { careers, communityPosts, users } from '@/db/schema';
import { eq, inArray, ne } from 'drizzle-orm';

export const COMMUNITY_MATCH_DEFAULT_LIMIT = 5;
export const COMMUNITY_MATCH_MAX_LIMIT = 10;
export const COMMUNITY_MATCH_MIN_SCORE = 25;
export const COMMUNITY_MATCH_RATE_LIMIT = 30;
export const COMMUNITY_MATCH_RATE_WINDOW_MS = 5 * 60 * 1000;

export const PUBLIC_COMMUNITY_CATEGORIES = ['interview_pass', 'career_tip', 'qna'] as const;
export type PublicCommunityCategory = (typeof PUBLIC_COMMUNITY_CATEGORIES)[number];

export type ExperienceLevel = '경력 초기' | '중간 경력' | '고경력';

export type CommunityMatchReasonCode =
  | 'ROLE_SIMILARITY'
  | 'CAREER_THEME_SIMILARITY'
  | 'ACHIEVEMENT_PATTERN_SIMILARITY'
  | 'EXPERIENCE_LEVEL_ALIGNED';

export type CareerRecord = {
  id: string;
  userId: string;
  company: string;
  role: string;
  period: string;
  description: string;
  achievements: unknown;
  createdAt?: Date | string | null;
};

export type CandidateCareerRecord = CareerRecord & {
  displayName: string | null;
};

export type PublicCommunityInfo = {
  postCount: number;
  categories: PublicCommunityCategory[];
};

export type PublicCommunityCareerMatch = {
  displayName: string;
  role: string;
  experienceLevel: ExperienceLevel;
  score: number;
  reasonCodes: CommunityMatchReasonCode[];
  reasons: string[];
  community: PublicCommunityInfo;
};

export type MatchEmptyReason =
  | 'DATABASE_UNAVAILABLE'
  | 'NO_CAREER_RECORD'
  | 'NO_OTHER_CAREERS'
  | 'NO_SIMILAR_MATCHES';

export type CommunityMatchQueryResult = {
  matches: PublicCommunityCareerMatch[];
  emptyReason?: MatchEmptyReason;
};

type SimilarityBreakdown = {
  score: number;
  role: number;
  company: number;
  description: number;
  achievements: number;
  reasonCodes: CommunityMatchReasonCode[];
};

type PublicCommunityPostRow = {
  userId: string;
  category: string;
};

type RateLimitEntry = {
  startedAt: number;
  count: number;
};

const rateLimitEntries = new Map<string, RateLimitEntry>();

const REASON_LABELS: Record<CommunityMatchReasonCode, string> = {
  ROLE_SIMILARITY: '비슷한 직무 경험이 있어요',
  CAREER_THEME_SIMILARITY: '경력 설명에서 비슷한 관심사와 업무 흐름이 보여요',
  ACHIEVEMENT_PATTERN_SIMILARITY: '성과를 만든 방식이 비슷해요',
  EXPERIENCE_LEVEL_ALIGNED: '비슷한 연차 수준에서 경험을 나눌 수 있어요',
};

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()
    : '';
}

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(' ');
  if (value && typeof value === 'object') {
    return Object.values(value).map(extractText).filter(Boolean).join(' ');
  }
  return '';
}

function tokenize(value: unknown): Set<string> {
  const words = normalize(extractText(value)).match(/[a-z0-9가-힣]+/g) ?? [];
  const tokens = new Set<string>();

  for (const word of words) {
    if (word.length >= 2) tokens.add(word);

    // Whitespace tokenization alone misses shared Korean words inside compounds.
    if (/^[가-힣]+$/.test(word)) {
      for (let size = 2; size <= 3; size += 1) {
        for (let index = 0; index <= word.length - size; index += 1) {
          tokens.add(word.slice(index, index + size));
        }
      }
    }
  }

  return tokens;
}

function tokenSimilarity(left: unknown, right: unknown): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  return (2 * intersection) / (leftTokens.size + rightTokens.size);
}

function reasonCodesFor(breakdown: Omit<SimilarityBreakdown, 'reasonCodes'>): CommunityMatchReasonCode[] {
  const reasonCodes: CommunityMatchReasonCode[] = [];

  if (breakdown.role >= 0.3) reasonCodes.push('ROLE_SIMILARITY');
  if (breakdown.description >= 0.2) reasonCodes.push('CAREER_THEME_SIMILARITY');
  if (breakdown.achievements >= 0.2) reasonCodes.push('ACHIEVEMENT_PATTERN_SIMILARITY');

  return reasonCodes;
}

/**
 * Compares two career records without external services so the same input always
 * produces the same score and reason codes.
 */
export function calculateCareerSimilarity(left: CareerRecord, right: CareerRecord): SimilarityBreakdown {
  const role = tokenSimilarity(left.role, right.role);
  const company = tokenSimilarity(left.company, right.company);
  const description = tokenSimilarity(left.description, right.description);
  const achievements = tokenSimilarity(left.achievements, right.achievements);
  const score = Math.max(
    0,
    Math.min(100, Math.round((role * 0.4 + company * 0.15 + description * 0.25 + achievements * 0.2) * 100)),
  );
  const breakdown = { score, role, company, description, achievements };

  return {
    ...breakdown,
    reasonCodes: reasonCodesFor(breakdown),
  };
}

function yearsFromPeriod(period: string): number | null {
  const normalizedPeriod = normalize(period);
  const explicitYears = normalizedPeriod.match(/(\d+(?:[.,]\d+)?)\s*(?:년|years?)/);
  if (explicitYears) return Number(explicitYears[1].replace(',', '.'));

  const years = [...normalizedPeriod.matchAll(/(?:19|20)\d{2}/g)].map(match => Number(match[0]));
  if (years.length >= 2) {
    const duration = Math.max(...years) - Math.min(...years);
    return duration > 0 ? duration : 0;
  }

  return null;
}

export function experienceLevelForCareers(records: CareerRecord[]): ExperienceLevel {
  const normalizedPeriods = records.map(record => normalize(record.period));
  if (normalizedPeriods.some(period => /(시니어|senior|lead|리드|관리자|매니저)/.test(period))) {
    return '고경력';
  }

  const knownYears = records
    .map(record => yearsFromPeriod(record.period))
    .filter((years): years is number => years !== null);

  if (knownYears.length > 0) {
    const totalYears = knownYears.reduce((total, years) => total + years, 0);
    if (totalYears >= 8) return '고경력';
    if (totalYears >= 4) return '중간 경력';
    return '경력 초기';
  }

  if (records.length >= 3) return '고경력';
  if (records.length === 2) return '중간 경력';
  return '경력 초기';
}

function careerTimestamp(record: CareerRecord): number {
  if (!record.createdAt) return 0;
  const timestamp = new Date(record.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareCareerOrder(left: CareerRecord, right: CareerRecord): number {
  const timestampDifference = careerTimestamp(right) - careerTimestamp(left);
  if (timestampDifference !== 0) return timestampDifference;
  return left.id.localeCompare(right.id);
}

function safeDisplayName(value: string | null): string {
  const displayName = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!displayName || displayName.includes('@')) return '커뮤니티 사용자';
  return displayName;
}

function safeRole(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 100) || '직무 정보 없음';
}

function communityInfoFor(
  userId: string,
  posts: PublicCommunityPostRow[],
): PublicCommunityInfo {
  const userPosts = posts.filter(post => post.userId === userId && PUBLIC_COMMUNITY_CATEGORIES.includes(post.category as PublicCommunityCategory));
  const categories = PUBLIC_COMMUNITY_CATEGORIES.filter(category =>
    userPosts.some(post => post.category === category),
  );

  return { postCount: userPosts.length, categories };
}

function publicReasons(reasonCodes: CommunityMatchReasonCode[]): string[] {
  return reasonCodes.map(reasonCode => REASON_LABELS[reasonCode]);
}

function limitValue(limit: number): number {
  return Math.min(COMMUNITY_MATCH_MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

/**
 * Creates public match DTOs. Company, descriptions, achievements, periods,
 * career IDs, and user IDs intentionally stop at this server boundary.
 */
export function buildCommunityCareerMatches(
  currentCareers: CareerRecord[],
  candidateCareers: CandidateCareerRecord[],
  communityPostsForCandidates: PublicCommunityPostRow[],
  limit: number = COMMUNITY_MATCH_DEFAULT_LIMIT,
): PublicCommunityCareerMatch[] {
  if (currentCareers.length === 0 || candidateCareers.length === 0) return [];

  const currentExperienceLevel = experienceLevelForCareers(currentCareers);
  const orderedCurrentCareers = [...currentCareers].sort(compareCareerOrder);
  const candidatesByUser = new Map<string, CandidateCareerRecord[]>();
  for (const career of candidateCareers) {
    const careersForUser = candidatesByUser.get(career.userId) ?? [];
    careersForUser.push(career);
    candidatesByUser.set(career.userId, careersForUser);
  }

  const evaluated = [] as Array<{
    candidateUserId: string;
    candidate: CandidateCareerRecord;
    experienceLevel: ExperienceLevel;
    similarity: SimilarityBreakdown;
    reasonCodes: CommunityMatchReasonCode[];
  }>;

  for (const [candidateUserId, careersForUser] of candidatesByUser) {
    const orderedCareers = [...careersForUser].sort(compareCareerOrder);
    let best: { candidate: CandidateCareerRecord; currentCareerId: string; similarity: SimilarityBreakdown } | null = null;

    for (const candidate of orderedCareers) {
      for (const current of orderedCurrentCareers) {
        const similarity = calculateCareerSimilarity(current, candidate);
        if (
          !best ||
          similarity.score > best.similarity.score ||
          (similarity.score === best.similarity.score && (
            candidate.id.localeCompare(best.candidate.id) < 0 ||
            (candidate.id === best.candidate.id && current.id.localeCompare(best.currentCareerId) < 0)
          ))
        ) {
          best = { candidate, currentCareerId: current.id, similarity };
        }
      }
    }

    if (!best || best.similarity.score < COMMUNITY_MATCH_MIN_SCORE) continue;

    const experienceLevel = experienceLevelForCareers(orderedCareers);
    const reasonCodes = [...best.similarity.reasonCodes];
    if (experienceLevel === currentExperienceLevel && !reasonCodes.includes('EXPERIENCE_LEVEL_ALIGNED')) {
      reasonCodes.push('EXPERIENCE_LEVEL_ALIGNED');
    }

    evaluated.push({
      candidateUserId,
      candidate: best.candidate,
      experienceLevel,
      similarity: best.similarity,
      reasonCodes,
    });
  }

  evaluated.sort((left, right) => {
    const scoreDifference = right.similarity.score - left.similarity.score;
    if (scoreDifference !== 0) return scoreDifference;

    const displayNameDifference = safeDisplayName(left.candidate.displayName).localeCompare(
      safeDisplayName(right.candidate.displayName),
      'ko',
    );
    if (displayNameDifference !== 0) return displayNameDifference;
    return left.candidateUserId.localeCompare(right.candidateUserId);
  });

  return evaluated.slice(0, limitValue(limit)).map(({ candidate, experienceLevel, similarity, reasonCodes }) => ({
    displayName: safeDisplayName(candidate.displayName),
    role: safeRole(candidate.role),
    experienceLevel,
    score: similarity.score,
    reasonCodes,
    reasons: publicReasons(reasonCodes),
    community: communityInfoFor(candidate.userId, communityPostsForCandidates),
  }));
}

export function consumeCommunityMatchRateLimit(
  userId: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const existing = rateLimitEntries.get(userId);
  if (!existing || now - existing.startedAt >= COMMUNITY_MATCH_RATE_WINDOW_MS) {
    rateLimitEntries.set(userId, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= COMMUNITY_MATCH_RATE_LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((COMMUNITY_MATCH_RATE_WINDOW_MS - (now - existing.startedAt)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetCommunityMatchRateLimit(): void {
  rateLimitEntries.clear();
}

function emptyResult(emptyReason: MatchEmptyReason): CommunityMatchQueryResult {
  return { matches: [], emptyReason };
}

export async function findCommunityCareerMatches(
  userId: string,
  limit: number = COMMUNITY_MATCH_DEFAULT_LIMIT,
): Promise<CommunityMatchQueryResult> {
  try {
    const db = getDb();
    if (!db) return emptyResult('DATABASE_UNAVAILABLE');

    const currentRows = await db
      .select({
        id: careers.id,
        userId: careers.userId,
        company: careers.company,
        role: careers.role,
        period: careers.period,
        description: careers.description,
        achievements: careers.achievements,
        createdAt: careers.createdAt,
      })
      .from(careers)
      .where(eq(careers.userId, userId));

    if (currentRows.length === 0) return emptyResult('NO_CAREER_RECORD');

    const candidateRows = await db
      .select({
        id: careers.id,
        userId: careers.userId,
        company: careers.company,
        role: careers.role,
        period: careers.period,
        description: careers.description,
        achievements: careers.achievements,
        createdAt: careers.createdAt,
        displayName: users.name,
      })
      .from(careers)
      .innerJoin(users, eq(careers.userId, users.id))
      .where(ne(careers.userId, userId));

    if (candidateRows.length === 0) return emptyResult('NO_OTHER_CAREERS');

    const candidateUserIds = [...new Set(candidateRows.map(row => row.userId))];
    const communityRows = candidateUserIds.length > 0
      ? await db
        .select({ userId: communityPosts.userId, category: communityPosts.category })
        .from(communityPosts)
        .where(inArray(communityPosts.userId, candidateUserIds))
      : [];

    const matches = buildCommunityCareerMatches(
      currentRows,
      candidateRows,
      communityRows,
      limit,
    );

    return matches.length > 0 ? { matches } : emptyResult('NO_SIMILAR_MATCHES');
  } catch {
    // A failed read must not trigger demo data or an arbitrary fallback match.
    console.warn('[Kairos] community career match read failed');
    return emptyResult('DATABASE_UNAVAILABLE');
  }
}
