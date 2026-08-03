import { z } from 'zod';
import { callLLMStructured } from '@/server/llm';

const PROFANITY_DICTIONARY = [
  '씨발',
  '시발',
  'ㅅㅂ',
  '개새끼',
  '병신',
  '지랄',
  '좆',
  'fuck',
  'shit',
] as const;

const PII_PATTERNS = [
  { type: 'email', label: '이메일', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { type: 'phone', label: '전화번호', pattern: /(?:01[016789]|02|0[3-6][1-5])[- .]?\d{3,4}[- .]?\d{4}/g },
  { type: 'resident_number', label: '주민등록번호', pattern: /\b\d{6}[- ]?[1-4]\d{6}\b/g },
  { type: 'ip_address', label: 'IP 주소', pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
] as const;

export interface DeterministicToneResult {
  profanity: {
    detected: boolean;
    matches: string[];
  };
  personalInformation: {
    detected: boolean;
    types: string[];
    matches: Array<{
      type: string;
      label: string;
      maskedValue: string;
    }>;
  };
  redactedText: string;
}

function maskPii(type: string, value: string): string {
  if (type === 'email') {
    const [local, domain] = value.split('@');
    return `${(local?.slice(0, 1) || '*')}***@${domain || '비공개'}`;
  }
  if (type === 'phone') {
    const digits = value.replace(/\D/g, '');
    return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  }
  return `[${type === 'resident_number' ? '주민등록번호' : 'IP 주소'} 비공개]`;
}

export function analyzePreparationText(text: string): DeterministicToneResult {
  const normalized = text.toLocaleLowerCase('ko-KR');
  const profanityMatches = PROFANITY_DICTIONARY.filter((term) => normalized.includes(term));
  const personalInformationMatches: DeterministicToneResult['personalInformation']['matches'] = [];
  let redactedText = text;

  for (const item of PII_PATTERNS) {
    const matches = Array.from(text.matchAll(item.pattern));
    for (const match of matches) {
      const value = match[0];
      if (!value || personalInformationMatches.some((entry) => entry.type === item.type && entry.maskedValue === maskPii(item.type, value))) {
        continue;
      }
      personalInformationMatches.push({
        type: item.type,
        label: item.label,
        maskedValue: maskPii(item.type, value),
      });
      redactedText = redactedText.replaceAll(value, `[${item.label} 비공개]`);
    }
  }

  return {
    profanity: {
      detected: profanityMatches.length > 0,
      matches: profanityMatches,
    },
    personalInformation: {
      detected: personalInformationMatches.length > 0,
      types: [...new Set(personalInformationMatches.map((entry) => entry.label))],
      matches: personalInformationMatches,
    },
    redactedText,
  };
}

export const preparationToneSchema = z.object({
  correctedText: z.string(),
  summary: z.string(),
  changes: z.array(z.string()),
  tone: z.enum(['professional', 'warm', 'concise', 'neutral']),
  riskNotes: z.array(z.string()),
});

export type PreparationToneCorrection = z.infer<typeof preparationToneSchema>;

export async function correctPreparationTone(
  text: string,
  deterministic: DeterministicToneResult,
): Promise<PreparationToneCorrection> {
  return callLLMStructured({
    instructions: [
      '당신은 취업 준비생의 메시지를 검토하는 한국어 커뮤니케이션 코치입니다.',
      '원문의 의미와 사실을 바꾸지 않고 정중하고 명확한 톤으로 교정하세요.',
      '개인정보는 이미 비공개 표기로 치환되어 있으므로 복원하거나 추측하지 마세요.',
      '결과는 지정된 JSON 구조로만 반환하세요.',
      '교정 결과는 제안일 뿐이며 메시지를 전송하거나 저장하지 않습니다.',
    ].join('\n'),
    prompt: JSON.stringify({
      text: deterministic.redactedText,
      deterministicFindings: {
        profanity: deterministic.profanity,
        personalInformation: deterministic.personalInformation,
      },
    }),
    temperature: 0.2,
    schema: preparationToneSchema,
  });
}
