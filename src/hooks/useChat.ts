'use client';

/**
 * 커스텀 AI 채팅 훅 — AI SDK(@ai-sdk/react) 미사용.
 * API 라우트에 메시지 전체를 POST 하고, 응답을 plain text 스트림으로 읽어
 * assistant 메시지에 점진적으로 append 한다.
 *
 * 모든 채팅 UI(모의면접, 캔버스 에이전트 등)는 이 훅을 임포트해서 사용한다.
 */
import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type ChatStatus = 'idle' | 'loading' | 'streaming' | 'stop';

export interface UseChatOptions {
  api?: string;
  body?: Record<string, unknown>;
  onError?: (err: Error) => void;
  onFinish?: (message: ChatMessage) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const { api = '/api/chat', body, onError, onFinish } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInput(e.target.value),
    []
  );

  const setMessageInput = useCallback((value: string) => setInput(value), []);

  const stop = useCallback(() => {
    if (!abortRef.current) return;
    abortRef.current.abort();
    setStreamStarted(false);
    setStatus('stop');
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();
      const content = input.trim();
      if (!content || isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content };
      const messagesToSend = [...messages, userMsg];
      setMessages(messagesToSend);
      setInput('');
      setIsLoading(true);
      setStreamStarted(false);
      setStatus('loading');
      setError(undefined);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abort.signal,
          body: JSON.stringify({
            ...body,
            messages: messagesToSend.map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || `요청 실패 (${res.status})`);
        }
        if (!res.body) throw new Error('응답 스트림이 없습니다.');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setStreamStarted(true);
          setStatus('streaming');
          setMessages([
            ...messagesToSend,
            { role: 'assistant', content: assistantText },
          ]);
        }

        const finalMsg: ChatMessage = { role: 'assistant', content: assistantText };
        setMessages([...messagesToSend, finalMsg]);
        setStreamStarted(false);
        setStatus('idle');
        onFinish?.(finalMsg);
      } catch (err: unknown) {
        if (abort.signal.aborted) return;
        const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.');
        setError(error);
        setStreamStarted(false);
        setStatus('idle');
        onError?.(error);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [api, body, input, isLoading, messages, onError, onFinish]
  );

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    stop,
    error,
    isLoading,
    streamStarted,
    status,
    setMessages,
    setInput: setMessageInput,
  };
}
