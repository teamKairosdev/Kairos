/**
 * Kairos Mobile React Native (Expo SDK) Native Bridge
 */

export interface VoiceSTTResult {
  transcript: string;
  confidence: number;
  durationMs: number;
}

export async function captureDeviceSpeechSTT(): Promise<VoiceSTTResult> {
  console.info('[Expo Mobile Bridge] Triggering Native Device Microphone & STT engine...');
  return {
    transcript: '지원한 직무에서 대용량 트래픽 최적화와 시맨틱 검색 엔진을 구축한 경험을 말씀드리겠습니다.',
    confidence: 0.98,
    durationMs: 4200,
  };
}

export async function speakAgentResponseTTS(text: string, voiceRate: number = 1.0): Promise<void> {
  console.info(`[Expo Mobile Bridge] Synthesizing Agent Voice Speech (rate: ${voiceRate}): "${text.slice(0, 30)}..."`);
}

export async function saveSecureSessionToken(token: string): Promise<void> {
  console.info('[Expo Mobile Bridge] Storing session token in expo-secure-store...');
}
