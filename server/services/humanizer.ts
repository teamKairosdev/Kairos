import { z } from 'zod';
import { callLLMStructured, isDemoMode } from './llm';

const humanizerSchema = z.object({
  humanizedText: z.string(),
  styleScore: z.number().min(0).max(100),
  changesSummary: z.string(),
  removedClichés: z.array(z.string()),
});

export type HumanizedResult = z.infer<typeof humanizerSchema>;

const DEMO_HUMANIZER_RESULT: HumanizedResult = {
  humanizedText: '3년간 웹 프론트엔드 분야에서 성능 최적화와 대규모 리팩토링을 직접 이끌어 눈에 띄는 성과를 냈습니다. 특히 번들 사이즈를 42% 줄이고 첫 화면 로딩 속도를 2.1초에서 0.8초로 단축해 사용자 경험을 크게 개선했습니다.',
  styleScore: 94,
  changesSummary: '피동형 표현 제거, 과도한 \'~함에 있어\' 구조 수정, 능동적이고 간결한 문체로 전환. 추상적 표현을 수치 기반 성과로 교체하여 설득력을 강화했습니다.',
  removedClichés: ['수행에 있어', '다각도로 접근하여', '완수함에 있어', '효율적인 리팩토링'],
};

// Single function = Single LLM call (AI Humanizer)
export async function processAIHumanizer(originalText: string): Promise<HumanizedResult> {
  if (isDemoMode()) {
    console.info('[Kairos Demo] Humanizer - 데모 모드 응답 반환');
    return DEMO_HUMANIZER_RESULT;
  }

  const instructions = `You are the Kairos AI Humanizer module. Your task is to transform AI-generated or overly robotic Korean job application text into natural, persuasive, human-written professional language.
Remove repetitive patterns (e.g., 과도한 'through', '관점', '~함에 있어', 진부한 비유), fix passive voice, and ensure authentic human tone while preserving all facts.`;

  return await callLLMStructured<HumanizedResult>({
    instructions,
    prompt: `Transform the following text into natural human Korean:\n\n${originalText}`,
    schema: humanizerSchema,
    temperature: 0.5,
  });
}

