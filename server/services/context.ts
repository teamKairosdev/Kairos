export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const DEFAULT_WINDOW = 20;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildContextWindow(
  messages: ContextMessage[],
  options?: { windowSize?: number; maxTokens?: number },
): string {
  const windowSize = options?.windowSize ?? DEFAULT_WINDOW;
  const maxTokens = options?.maxTokens ?? 8000;

  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const recent = conversationMessages.slice(-windowSize);

  const parts: string[] = [];
  for (const msg of systemMessages) {
    parts.push(`[${msg.role.toUpperCase()}]\n${msg.content}`);
  }
  for (const msg of recent) {
    parts.push(`[${msg.role.toUpperCase()}]\n${msg.content}`);
  }

  let result = parts.join('\n\n');
  if (maxTokens && estimateTokens(result) > maxTokens) {
    const truncated: string[] = [];
    for (const msg of recent.slice(-Math.floor(windowSize / 2))) {
      const line = `[${msg.role.toUpperCase()}]\n${msg.content}`;
      if (estimateTokens([...truncated, line].join('\n\n')) > maxTokens) break;
      truncated.push(line);
    }
    result = truncated.join('\n\n');
  }

  return result;
}
