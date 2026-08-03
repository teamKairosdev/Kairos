import { analyzeATSCompatibility } from '@/server/ats';

export const RESUME_COMPARE_MIN_COHORT_SIZE = 5;

export const RESUME_COMPARE_PRIVACY_NOTICE =
  '다른 사용자의 이력서 원문과 식별자는 비교 결과에 포함하지 않습니다. 서로 다른 사용자 단위로 지표를 계산하고 집계값만 반환합니다.';

export const RESUME_COMPARE_DISCLAIMER =
  '공고 매치는 키워드 기반 휴리스틱 참고지표이며 채용 결과나 합격 가능성을 예측하지 않습니다.';

type SectionKey = 'summary' | 'experience' | 'projects' | 'education' | 'skills';

interface SectionDefinition {
  key: SectionKey;
  label: string;
  patterns: RegExp[];
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: 'summary',
    label: '요약',
    patterns: [/summary/i, /profile/i, /about/i, /소개/i, /요약/i, /목표/i],
  },
  {
    key: 'experience',
    label: '경력',
    patterns: [/experience/i, /work history/i, /employment/i, /career/i, /경력/i, /근무/i],
  },
  {
    key: 'projects',
    label: '프로젝트',
    patterns: [/project/i, /portfolio/i, /프로젝트/i, /포트폴리오/i],
  },
  {
    key: 'education',
    label: '학력',
    patterns: [/education/i, /학력/i, /학위/i, /대학교/i, /대학/i],
  },
  {
    key: 'skills',
    label: '기술 및 역량',
    patterns: [/skills?/i, /technical/i, /stack/i, /기술/i, /스킬/i, /역량/i],
  },
];

const KEYWORD_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'are', 'was', 'were',
  'will', 'you', 'your', 'our', 'into', 'using', 'used', 'use', 'work', 'worked', 'resume',
  '경력', '경험', '업무', '담당', '수행', '통해', '위해', '및', '등', '기반', '진행', '개발',
  '관리', '사용', '현재', '저는', '합니다', '있습니다', '대한', '관련', '보유', '가능',
  '요약', '경력', '프로젝트', '학력', '기술', '역량',
]);

const KEYWORD_PATTERN = /[a-z][a-z0-9+#./-]{1,}|[가-힣]{2,}/gi;
const WORD_PATTERN = /[a-z0-9가-힣]+(?:[+#./-][a-z0-9가-힣]+)*/gi;

const EXAMPLE_BASELINE = {
  sectionCompleteness: { score: 80, completed: 4, total: SECTION_DEFINITIONS.length },
  keywordCount: 12,
  sentenceLength: { averageWords: 18, averageCharacters: 90 },
  jobMatchScore: 60,
};

export interface ResumeCohortEntry {
  userId: string;
  originalContent: string;
}

export interface ResumeSectionMetric {
  key: SectionKey;
  label: string;
  present: boolean;
}

export interface ResumeMetrics {
  sectionCompleteness: {
    score: number;
    completed: number;
    total: number;
    missing: string[];
    sections: ResumeSectionMetric[];
  };
  keywordCount: number;
  sentenceLength: {
    averageWords: number;
    averageCharacters: number;
    sentenceCount: number;
  };
  jobMatch: {
    status: 'calculated' | 'not_provided';
    score: number | null;
    matchedKeywords: string[];
    missingKeywords: string[];
  };
}

export interface ResumeBaselineMetrics {
  sectionCompleteness: {
    score: number;
    completed: number;
    total: number;
  };
  keywordCount: number;
  sentenceLength: {
    averageWords: number;
    averageCharacters: number;
  };
  jobMatch: {
    score: number | null;
  };
}

export interface ResumeMetricComparison {
  current: number | null;
  baseline: number | null;
  delta: number | null;
}

export interface ResumeComparison {
  current: ResumeMetrics;
  baseline: {
    source: 'cohort' | 'example';
    status: 'actual' | 'insufficient_data';
    label: string;
    sampleSize: number;
    minimumSampleSize: number;
    isActual: boolean;
    metrics: ResumeBaselineMetrics;
    notice: string;
  };
  comparisons: {
    sectionCompleteness: ResumeMetricComparison;
    keywordCount: ResumeMetricComparison;
    sentenceLength: ResumeMetricComparison;
    jobMatch: ResumeMetricComparison;
  };
  weaknesses: string[];
  suggestions: string[];
  privacyNotice: string;
  disclaimer: string;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function average(values: number[], decimals = 1): number {
  if (values.length === 0) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, decimals);
}

function getWordTokens(text: string): string[] {
  return text.match(WORD_PATTERN) || [];
}

export function extractResumeKeywords(text: string): string[] {
  const matches = text.toLocaleLowerCase('en-US').match(KEYWORD_PATTERN) || [];
  return Array.from(new Set(
    matches
      .map((keyword) => keyword.trim())
      .filter((keyword) => !KEYWORD_STOP_WORDS.has(keyword))
      .filter((keyword) => keyword.length >= 2),
  ));
}

function calculateSentenceLength(text: string): ResumeMetrics['sentenceLength'] {
  const sentences = text
    .replace(/\r/g, '')
    .split(/[.!?。！？\n]+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const wordCounts = sentences.map((sentence) => getWordTokens(sentence).length);
  const characterCounts = sentences.map((sentence) => sentence.replace(/\s/g, '').length);

  return {
    averageWords: average(wordCounts),
    averageCharacters: average(characterCounts),
    sentenceCount: sentences.length,
  };
}

function calculateSections(text: string): ResumeMetrics['sectionCompleteness'] {
  const sections = SECTION_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    present: definition.patterns.some((pattern) => pattern.test(text)),
  }));
  const completed = sections.filter((section) => section.present).length;

  return {
    score: Math.round((completed / SECTION_DEFINITIONS.length) * 100),
    completed,
    total: SECTION_DEFINITIONS.length,
    missing: sections.filter((section) => !section.present).map((section) => section.label),
    sections,
  };
}

function calculateJobMatch(text: string, jobDescription: string): ResumeMetrics['jobMatch'] {
  if (!jobDescription.trim()) {
    return {
      status: 'not_provided',
      score: null,
      matchedKeywords: [],
      missingKeywords: [],
    };
  }

  const analysis = analyzeATSCompatibility(text, jobDescription);
  return {
    status: 'calculated',
    score: analysis.matchScore,
    matchedKeywords: analysis.foundKeywords,
    missingKeywords: analysis.missingKeywords,
  };
}

export function analyzeResumeMetrics(text: string, jobDescription = ''): ResumeMetrics {
  const safeText = typeof text === 'string' ? text.slice(0, 100_000) : '';
  const safeJobDescription = typeof jobDescription === 'string' ? jobDescription.slice(0, 30_000) : '';

  return {
    sectionCompleteness: calculateSections(safeText),
    keywordCount: extractResumeKeywords(safeText).length,
    sentenceLength: calculateSentenceLength(safeText),
    jobMatch: calculateJobMatch(safeText, safeJobDescription),
  };
}

function toBaselineMetrics(metrics: ResumeMetrics[]): ResumeBaselineMetrics {
  const jobScores = metrics
    .map((metric) => metric.jobMatch.score)
    .filter((score): score is number => score !== null);

  return {
    sectionCompleteness: {
      score: average(metrics.map((metric) => metric.sectionCompleteness.score)),
      completed: average(metrics.map((metric) => metric.sectionCompleteness.completed)),
      total: SECTION_DEFINITIONS.length,
    },
    keywordCount: average(metrics.map((metric) => metric.keywordCount)),
    sentenceLength: {
      averageWords: average(metrics.map((metric) => metric.sentenceLength.averageWords)),
      averageCharacters: average(metrics.map((metric) => metric.sentenceLength.averageCharacters)),
    },
    jobMatch: {
      score: jobScores.length > 0 ? average(jobScores) : null,
    },
  };
}

function buildExampleBaseline(jobDescriptionProvided: boolean): ResumeBaselineMetrics {
  return {
    sectionCompleteness: { ...EXAMPLE_BASELINE.sectionCompleteness },
    keywordCount: EXAMPLE_BASELINE.keywordCount,
    sentenceLength: { ...EXAMPLE_BASELINE.sentenceLength },
    jobMatch: { score: jobDescriptionProvided ? EXAMPLE_BASELINE.jobMatchScore : null },
  };
}

function compareMetric(current: number | null, baseline: number | null): ResumeMetricComparison {
  return {
    current,
    baseline,
    delta: current !== null && baseline !== null ? round(current - baseline) : null,
  };
}

function buildWeaknesses(
  current: ResumeMetrics,
  baseline: ResumeBaselineMetrics,
  baselineLabel: string,
): string[] {
  const weaknesses: string[] = [];

  if (current.sectionCompleteness.score + 5 < baseline.sectionCompleteness.score) {
    weaknesses.push(`섹션 완성도가 ${baselineLabel}보다 낮습니다.`);
  }
  if (current.sectionCompleteness.missing.length > 0) {
    weaknesses.push(`확인되지 않은 핵심 섹션이 있습니다: ${current.sectionCompleteness.missing.join(', ')}.`);
  }
  if (current.keywordCount + 2 < baseline.keywordCount) {
    weaknesses.push(`고유 키워드 수가 ${baselineLabel}보다 적습니다.`);
  }

  const baselineWords = baseline.sentenceLength.averageWords;
  const currentWords = current.sentenceLength.averageWords;
  if (baselineWords > 0 && currentWords > baselineWords * 1.25) {
    weaknesses.push(`문장 평균 길이가 ${baselineLabel}보다 길어 핵심 성과가 묻힐 수 있습니다.`);
  } else if (baselineWords > 0 && currentWords > 0 && currentWords < baselineWords * 0.6) {
    weaknesses.push(`문장 평균 길이가 ${baselineLabel}보다 짧아 성과 맥락이 부족할 수 있습니다.`);
  }

  if (
    current.jobMatch.score !== null &&
    baseline.jobMatch.score !== null &&
    current.jobMatch.score + 5 < baseline.jobMatch.score
  ) {
    weaknesses.push(`공고 매치 휴리스틱 점수가 ${baselineLabel}보다 낮습니다.`);
  }
  if (current.jobMatch.status === 'not_provided') {
    weaknesses.push('채용 공고가 입력되지 않아 공고 매치 휴리스틱을 계산하지 못했습니다.');
  }

  return weaknesses.length > 0 ? weaknesses : ['현재 지표에서 큰 차이가 확인되지 않았습니다.'];
}

function buildSuggestions(current: ResumeMetrics, baseline: ResumeBaselineMetrics): string[] {
  const suggestions: string[] = [];

  if (current.sectionCompleteness.missing.length > 0) {
    suggestions.push(`누락된 섹션을 보완하고 각 섹션에 최근 성과를 한두 문장으로 추가하세요: ${current.sectionCompleteness.missing.join(', ')}.`);
  }
  if (current.keywordCount + 2 < baseline.keywordCount) {
    suggestions.push('지원하는 공고에 실제로 사용된 기술과 역할 키워드를 근거가 있는 경험 문장에 자연스럽게 연결하세요.');
  }
  if (baseline.sentenceLength.averageWords > 0 && current.sentenceLength.averageWords > baseline.sentenceLength.averageWords * 1.25) {
    suggestions.push('긴 문장을 성과, 방법, 결과 단위로 나누어 읽기 쉽게 다듬으세요.');
  } else if (current.sentenceLength.averageWords > 0 && current.sentenceLength.averageWords < baseline.sentenceLength.averageWords * 0.6) {
    suggestions.push('짧은 문장에 본인의 행동과 결과를 수치 또는 범위로 덧붙여 맥락을 보강하세요.');
  }
  if (current.jobMatch.status === 'calculated' && current.jobMatch.missingKeywords.length > 0) {
    suggestions.push(`공고에서 확인된 미매칭 키워드를 실제 경험과 연결해 보세요: ${current.jobMatch.missingKeywords.slice(0, 5).join(', ')}.`);
  }
  if (current.jobMatch.status === 'not_provided') {
    suggestions.push('비교할 채용 공고를 입력하면 공고 매치 휴리스틱과 미매칭 키워드를 확인할 수 있습니다.');
  }

  return suggestions.length > 0
    ? suggestions
    : ['현재 구성을 유지하되 성과의 범위와 결과를 구체적인 근거로 보강하세요.'];
}

function groupCohortByUser(entries: readonly ResumeCohortEntry[]): string[][] {
  const contentByUser = new Map<string, string[]>();
  for (const entry of entries) {
    if (!entry || typeof entry.userId !== 'string' || !entry.userId || typeof entry.originalContent !== 'string') continue;
    const content = entry.originalContent.trim();
    if (!content) continue;
    const userContent = contentByUser.get(entry.userId) || [];
    userContent.push(content);
    contentByUser.set(entry.userId, userContent);
  }
  return Array.from(contentByUser.values());
}

export function buildResumeComparison(
  currentContent: string,
  cohortEntries: readonly ResumeCohortEntry[],
  jobDescription = '',
): ResumeComparison {
  const current = analyzeResumeMetrics(currentContent, jobDescription);
  const cohortByUser = groupCohortByUser(cohortEntries);
  const cohortMetrics = cohortByUser.map((contents) =>
    contents.map((content) => analyzeResumeMetrics(content, jobDescription)),
  );
  const userLevelMetrics = cohortMetrics.map((metrics) => toBaselineMetrics(metrics));
  const hasActualCohort = userLevelMetrics.length >= RESUME_COMPARE_MIN_COHORT_SIZE;
  const baselineMetrics = hasActualCohort
    ? {
        sectionCompleteness: {
          score: average(userLevelMetrics.map((metric) => metric.sectionCompleteness.score)),
          completed: average(userLevelMetrics.map((metric) => metric.sectionCompleteness.completed)),
          total: SECTION_DEFINITIONS.length,
        },
        keywordCount: average(userLevelMetrics.map((metric) => metric.keywordCount)),
        sentenceLength: {
          averageWords: average(userLevelMetrics.map((metric) => metric.sentenceLength.averageWords)),
          averageCharacters: average(userLevelMetrics.map((metric) => metric.sentenceLength.averageCharacters)),
        },
        jobMatch: {
          score: (() => {
            const jobScores = userLevelMetrics
              .map((metric) => metric.jobMatch.score)
              .filter((score): score is number => score !== null);
            return jobScores.length > 0 ? average(jobScores) : null;
          })(),
        },
      }
    : buildExampleBaseline(Boolean(jobDescription.trim()));

  const baseline = {
    source: hasActualCohort ? ('cohort' as const) : ('example' as const),
    status: hasActualCohort ? ('actual' as const) : ('insufficient_data' as const),
    label: hasActualCohort ? '익명 cohort 기준선' : '데이터 부족: 기준선 예시',
    sampleSize: userLevelMetrics.length,
    minimumSampleSize: RESUME_COMPARE_MIN_COHORT_SIZE,
    isActual: hasActualCohort,
    metrics: baselineMetrics,
    notice: hasActualCohort
      ? `서로 다른 사용자 ${RESUME_COMPARE_MIN_COHORT_SIZE}명 이상에서 원문을 노출하지 않고 지표만 집계했습니다.`
      : `서로 다른 사용자의 실제 표본이 ${RESUME_COMPARE_MIN_COHORT_SIZE}명 미만입니다. 아래 값은 실제 사용자 평균이 아닌 기준선 예시이며 통계로 해석하지 마세요.`,
  };

  const comparisons = {
    sectionCompleteness: compareMetric(current.sectionCompleteness.score, baseline.metrics.sectionCompleteness.score),
    keywordCount: compareMetric(current.keywordCount, baseline.metrics.keywordCount),
    sentenceLength: compareMetric(current.sentenceLength.averageWords, baseline.metrics.sentenceLength.averageWords),
    jobMatch: compareMetric(current.jobMatch.score, baseline.metrics.jobMatch.score),
  };
  const baselineLabel = baseline.isActual ? '익명 cohort 기준선' : '기준선 예시';

  return {
    current,
    baseline,
    comparisons,
    weaknesses: buildWeaknesses(current, baseline.metrics, baselineLabel),
    suggestions: buildSuggestions(current, baseline.metrics),
    privacyNotice: RESUME_COMPARE_PRIVACY_NOTICE,
    disclaimer: RESUME_COMPARE_DISCLAIMER,
  };
}
