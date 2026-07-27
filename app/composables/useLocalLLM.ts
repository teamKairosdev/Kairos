let engine: any = null;

export function useLocalLLM() {
  async function initEngine() {
    if (engine) return engine;

    if (typeof navigator === 'undefined' || !navigator.gpu) {
      console.warn('[useLocalLLM] WebGPU not supported');
      return null;
    }

    try {
      const { CreateWebLLM } = await import('@mlc-ai/web-llm');
      engine = await CreateWebLLM({
        model: 'Qwen/Qwen3-1.7B-q4f16_1-MLC',
        logLevel: 'INFO',
      });
      return engine;
    } catch (err) {
      console.warn('[useLocalLLM] Failed to initialize:', err);
      return null;
    }
  }

  async function chatLocal(messages: { role: string; content: string }[]): Promise<string | null> {
    const eng = await initEngine();
    if (!eng) return null;

    try {
      const response = await eng.chat.completions.create({
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });
      return response.choices[0].message.content;
    } catch (err) {
      console.warn('[useLocalLLM] Chat error:', err);
      return null;
    }
  }

  async function isAvailable(): Promise<boolean> {
    if (typeof navigator === 'undefined') return false;
    return !!navigator.gpu;
  }

  return { chatLocal, isAvailable };
}
