'use client';

import { useState, useEffect, useRef, use, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/lib/toast';
import DifficultyBadge from '@/components/DifficultyBadge';

const interviewTips = [
  { icon: '목표', title: 'STAR 기법 활용', desc: '상황(S), 과제(T), 행동(A), 결과(R) 순서로 답변하세요.' },
  { icon: '시간', title: '답변 시간 조절', desc: '질문당 1~3분 이내로 간결하고 핵심적으로 답변하세요.' },
  { icon: '수치', title: '수치로 증명', desc: '경험과 성과를 구체적인 수치와 데이터로 뒷받침하세요.' },
  { icon: '질문', title: '역질문 준비', desc: '면접 말미에는 회사나 팀에 대한 관심 있는 질문을 해보세요.' },
];

type MediaKind = 'video' | 'audio';

interface InterviewMedia {
  id: string;
  interviewId: string;
  mediaType: MediaKind;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
  durationMs?: number | null;
  analysisStatus: string;
  createdAt: string;
  expiresAt: string;
  url: string;
}

const MAX_INTERVIEW_MEDIA_BYTES = 100 * 1024 * 1024;

function formatMediaSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatMediaDuration(durationMs?: number | null): string | null {
  if (durationMs == null) return null;
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getRecordingExtension(mimeType: string): string {
  const baseMimeType = mimeType.split(';', 1)[0].toLowerCase();
  if (baseMimeType === 'video/mp4') return 'mp4';
  if (baseMimeType === 'video/quicktime') return 'mov';
  if (baseMimeType === 'audio/mp4') return 'm4a';
  if (baseMimeType === 'audio/ogg' || baseMimeType === 'video/ogg') return 'ogg';
  return 'webm';
}

function getPreferredRecorderMimeType(kind: MediaKind): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = kind === 'video'
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

interface InterviewSession {
  id: string;
  userId?: string;
  jobTitle: string;
  companyName?: string | null;
  difficulty?: string;
  status?: string;
  overallScore?: number | null;
  overallFeedback?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messages?: ChatDisplayMessage[];
}

interface ChatDisplayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const interviewId = resolvedParams.id;
  const router = useRouter();
  const toast = useToast();

  const STORAGE_KEY = `interview:${interviewId}`;

  const [mobileTab, setMobileTab] = useState<'chat' | 'info'>('chat');
  const [sessionInfo, setSessionInfo] = useState<InterviewSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [showEndModal, setShowEndModal] = useState(false);
  const [endPhase, setEndPhase] = useState<'confirm' | 'summary'>('confirm');
  const [ending, setEnding] = useState(false);
  const isCompleted = sessionInfo?.status === 'completed';
  const [mediaItems, setMediaItems] = useState<InterviewMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [recorderSupported, setRecorderSupported] = useState<boolean | null>(null);
  const [recordingKind, setRecordingKind] = useState<MediaKind | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgKeyRef = useRef(new Map<number, string>());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const { messages, setMessages, input, handleInputChange, handleSubmit, stop, streamStarted, isLoading: isStreaming } = useChat({
    api: `/api/interviews/${interviewId}/chat`,
    onError: (err) => {
      toast.add({ title: '오류 발생', description: err.message, color: 'red' });
    },
    onFinish: () => {
      scrollToBottom();
    },
  });

  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        const valid = saved.filter(
          (m: ChatDisplayMessage) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim()
        );
        if (valid.length > 0) {
          setMessages(valid);
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch {
      // noop
    }
  }, [interviewId, setMessages]);

  useEffect(() => {
    function backup() {
      try {
        const persisted = messagesRef.current.filter(
          (m) => m.role !== 'system' && m.content.trim()
        );
        if (persisted.length > 0) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // noop
      }
    }
    window.addEventListener('beforeunload', backup);
    return () => {
      backup();
      window.removeEventListener('beforeunload', backup);
    };
  }, [STORAGE_KEY]);

  function messageKey(idx: number) {
    let key = msgKeyRef.current.get(idx);
    if (!key) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${idx}`;
      msgKeyRef.current.set(idx, key);
    }
    return key;
  }

  function openEndModal() {
    if (isCompleted) return;
    setEndPhase('confirm');
    setShowEndModal(true);
  }

  async function confirmEndInterview() {
    if (ending || isCompleted) return;
    stop();
    setEnding(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) throw new Error(`면접 종료 저장 실패 (${res.status})`);

      setSessionInfo((current) => current ? { ...current, status: 'completed' } : current);
      setEndPhase('summary');
      setTimeout(() => {
        setShowEndModal(false);
        router.push('/interview');
      }, 2500);
    } catch (err: unknown) {
      setEnding(false);
      toast.add({
        title: '면접 종료 저장 실패',
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.',
        color: 'red',
      });
    }
  }

  function closeEndModal() {
    setShowEndModal(false);
  }

  async function fetchMedia() {
    setMediaLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/media`);
      const data = await res.json().catch(() => null) as { media?: InterviewMedia[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || '미디어 목록을 불러오지 못했습니다.');
      setMediaItems(Array.isArray(data?.media) ? data.media : []);
      setMediaError(null);
    } catch (err: unknown) {
      setMediaError(err instanceof Error ? err.message : '미디어 목록을 불러오지 못했습니다.');
    } finally {
      setMediaLoading(false);
    }
  }

  async function uploadMedia(blob: Blob, fileName: string, durationMs?: number) {
    if (blob.size > MAX_INTERVIEW_MEDIA_BYTES) {
      setMediaError('영상·음성 파일은 100MB 이하만 저장할 수 있습니다.');
      return;
    }

    setMediaBusy(true);
    setMediaError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      if (durationMs != null) formData.append('durationMs', String(durationMs));

      const res = await fetch(`/api/interviews/${interviewId}/media`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => null) as { media?: InterviewMedia; error?: string } | null;
      if (!res.ok || !data?.media) throw new Error(data?.error || '미디어 업로드에 실패했습니다.');

      setMediaItems((current) => [data.media as InterviewMedia, ...current]);
      toast.add({
        title: '미디어가 저장되었습니다.',
        description: '분석 대기 상태입니다. 현재는 재생과 삭제만 제공됩니다.',
        color: 'blue',
      });
    } catch (err: unknown) {
      setMediaError(err instanceof Error ? err.message : '미디어 업로드에 실패했습니다.');
    } finally {
      setMediaBusy(false);
    }
  }

  function releaseMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  }

  async function startRecording(kind: MediaKind) {
    if (recordingKind || mediaBusy || recorderSupported !== true) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'video' ? { video: true, audio: true } : { audio: true }
      );
      const preferredMimeType = getPreferredRecorderMimeType(kind);
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      const startedAt = Date.now();

      mediaChunksRef.current = [];
      recordingStartedAtRef.current = startedAt;
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) mediaChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMediaError('녹화 중 브라우저 오류가 발생했습니다. 파일 업로드를 이용해주세요.');
      };
      recorder.onstop = () => {
        const contentType = recorder.mimeType || preferredMimeType || (kind === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(mediaChunksRef.current, { type: contentType });
        const durationMs = Math.max(0, Date.now() - startedAt);
        const fileName = `interview-${startedAt}.${getRecordingExtension(contentType)}`;
        mediaChunksRef.current = [];
        recordingStartedAtRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingKind(null);
        releaseMediaStream();
        void uploadMedia(blob, fileName, durationMs);
      };

      if (kind === 'video' && previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      setRecordingKind(kind);
      setRecordingSeconds(0);
      recorder.start(250);
    } catch (err: unknown) {
      releaseMediaStream();
      mediaRecorderRef.current = null;
      setRecordingKind(null);
      setMediaError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? '카메라·마이크 권한이 없어 녹화를 시작할 수 없습니다. 파일 업로드를 이용해주세요.'
          : '녹화를 시작할 수 없습니다. 파일 업로드를 이용해주세요.'
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }

  function handleMediaFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      setMediaError('영상 또는 음성 파일만 업로드할 수 있습니다.');
      return;
    }
    void uploadMedia(file, file.name);
  }

  async function deleteMedia(mediaId: string) {
    if (!window.confirm('이 미디어를 삭제할까요? 삭제 후에는 재생할 수 없습니다.')) return;
    setMediaBusy(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/media/${mediaId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || '미디어 삭제에 실패했습니다.');
      setMediaItems((current) => current.filter((item) => item.id !== mediaId));
    } catch (err: unknown) {
      setMediaError(err instanceof Error ? err.message : '미디어 삭제에 실패했습니다.');
    } finally {
      setMediaBusy(false);
    }
  }

  useEffect(() => {
    setRecorderSupported(
      typeof MediaRecorder !== 'undefined'
      && typeof navigator !== 'undefined'
      && Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [interviewId]);

  useEffect(() => {
    if (!recordingKind) return;
    const startedAt = recordingStartedAtRef.current || Date.now();
    const timer = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [recordingKind]);

  useEffect(() => {
    if (recordingKind !== 'video' || !previewVideoRef.current || !mediaStreamRef.current) return;
    previewVideoRef.current.srcObject = mediaStreamRef.current;
    void previewVideoRef.current.play().catch(() => {});
  }, [recordingKind]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      releaseMediaStream();
    };
  }, []);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/interviews/${interviewId}`);
        if (res.ok) {
          const data = (await res.json()) as InterviewSession;
          setSessionInfo(data);
          const apiMessages = Array.isArray(data.messages)
            ? data.messages.filter(
                (message) =>
                  message &&
                  (message.role === 'user' || message.role === 'assistant') &&
                  typeof message.content === 'string' &&
                  message.content.trim()
              )
            : [];
          if (apiMessages.length > 0) {
            setMessages((current) => current.length > 0 ? current : apiMessages);
          }
        }
      } catch {}
    }
    fetchSession();
  }, [interviewId]);

  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getMessageText(msg: ChatDisplayMessage): string {
    if (typeof msg.content === 'string') return msg.content;
    if (Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text || '')
        .join('');
    }
    return '';
  }

  const questionCount = messages.filter(m => m.role === 'assistant').length;

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] gap-0 overflow-hidden rounded-none lg:rounded-2xl border-0 lg:border border-gray-100 shadow-none lg:shadow-sm bg-white">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-gray-100 bg-white mb-0">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'
          }`}
        >
           면접 진행
        </button>
        <button
          onClick={() => setMobileTab('info')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            mobileTab === 'info' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400'
          }`}
        >
           녹화·정보
        </button>
      </div>

      {/* Left Panel: Info & Guide */}
      <div
        className={`shrink-0 border-r border-gray-100 bg-gray-50/60 flex-col lg:w-72 xl:w-80 ${
          mobileTab === 'info' ? 'flex' : 'hidden lg:flex'
        }`}
      >
        <div className="p-5 border-b border-gray-100">
           <Link href="/interview" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3">
             목록으로
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-gray-400' : isStreaming ? 'animate-pulse bg-amber-400' : 'animate-pulse bg-emerald-400'}`} />
            <span className={`text-xs font-medium ${isCompleted ? 'text-gray-500' : isStreaming ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isCompleted ? '면접 종료' : isStreaming ? 'AI 응답 중' : '대기 중'}
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900">{sessionInfo?.jobTitle || 'AI 모의 면접'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{sessionInfo?.companyName || '일반 면접'}</p>
        </div>

        <div className="p-5 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">면접 유형</span>
            <DifficultyBadge difficulty={sessionInfo?.difficulty} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">진행 단계</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              sessionInfo?.status === 'completed'
                ? 'bg-green-50 text-green-600'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {sessionInfo?.status === 'completed' ? '완료' : '진행중'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">질문 진행</span>
            <span className="text-xs font-bold text-gray-900">
              {questionCount > 0 ? `${questionCount}번째 질문` : '아직 시작 전'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">주고받은 메시지</span>
            <span className="text-xs font-bold text-gray-900">{messages.length}개</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">경과 시간</span>
            <span className="text-xs font-bold text-gray-900 font-mono">{elapsedTime}</span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">영상·음성 연습</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">답변을 녹화해 저장하고 다시 재생해보세요.</p>
              </div>
              {mediaItems.length > 0 && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500">
                  {mediaItems.length}개
                </span>
              )}
            </div>

            {recordingKind && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                {recordingKind === 'video' ? (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video w-full rounded-lg bg-gray-900 object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-4 text-xs font-semibold text-blue-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    음성 녹음 중
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-blue-700">
                    {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    녹화 중지
                  </button>
                </div>
              </div>
            )}

            {!recordingKind && recorderSupported === true && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => startRecording('video')}
                  disabled={mediaBusy}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  영상 녹화 시작
                </button>
                <button
                  type="button"
                  onClick={() => startRecording('audio')}
                  disabled={mediaBusy}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  음성 녹음 시작
                </button>
              </div>
            )}

            {recorderSupported === false && (
              <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                이 브라우저에서는 카메라·마이크 녹화를 지원하지 않습니다. 아래에서 영상 또는 음성 파일을 선택해 업로드해주세요.
              </div>
            )}

            <input
              ref={mediaFileInputRef}
              type="file"
              accept="video/webm,video/mp4,video/ogg,video/quicktime,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/aac"
              onChange={handleMediaFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => mediaFileInputRef.current?.click()}
              disabled={mediaBusy || Boolean(recordingKind)}
              className="mt-3 w-full rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mediaBusy ? '저장 중...' : '파일 업로드'}
            </button>
            <p className="mt-2 text-[10px] leading-relaxed text-gray-400">WebM, MP4, OGG 등 · 파일당 최대 100MB</p>

            {mediaError && (
              <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[11px] leading-relaxed text-red-600">{mediaError}</p>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-700">저장된 미디어</h4>
                {mediaLoading && <span className="text-[10px] text-gray-400">불러오는 중</span>}
              </div>
              {!mediaLoading && mediaItems.length === 0 && (
                <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[11px] leading-relaxed text-gray-400">
                  아직 저장된 영상이나 음성이 없습니다.
                </p>
              )}
              {mediaItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-2.5">
                  {item.mediaType === 'video' ? (
                    <video controls preload="metadata" src={item.url} className="aspect-video w-full rounded-lg bg-gray-900" />
                  ) : (
                    <audio controls preload="metadata" src={item.url} className="w-full" />
                  )}
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-700" title={item.originalFileName}>
                      {item.originalFileName}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                      {item.mediaType === 'video' ? '영상' : '음성'} · {formatMediaSize(item.sizeBytes)}
                      {formatMediaDuration(item.durationMs) ? ` · ${formatMediaDuration(item.durationMs)}` : ''}
                      {' · '}{new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">
                        {item.analysisStatus === 'pending' ? '분석 대기' : item.analysisStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteMedia(item.id)}
                        disabled={mediaBusy}
                        className="text-[10px] font-semibold text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(item.expiresAt).toLocaleDateString('ko-KR')}까지 보관
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900">분석 로드맵</h3>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-600">MVP</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              현재는 파일 저장과 재생만 제공합니다. 자세·시선·발성 점수는 생성하지 않습니다.
            </p>
            <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-gray-600">
              <li><span className="mr-2 font-semibold text-blue-600">01</span>음성 전사와 화자 구간 확인</li>
              <li><span className="mr-2 font-semibold text-blue-600">02</span>전사 결과를 직접 수정하고 분석 요청</li>
              <li><span className="mr-2 font-semibold text-blue-600">03</span>동의한 범위 안에서 피드백 리포트 제공</li>
            </ol>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-bold text-gray-900">개인정보 및 보관</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              카메라와 마이크 권한은 녹화할 때만 요청합니다. 파일은 이 면접 세션의 소유자만 재생·삭제할 수 있습니다.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              이 MVP는 서버 로컬 저장소에 파일을 최대 30일 보관하며, 필요하지 않은 파일은 삭제 버튼으로 즉시 제거해주세요.
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">면접 팁</h3>
            <ul className="space-y-3">
              {interviewTips.map(tip => (
                <li key={tip.title} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-base">{tip.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{tip.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="p-5 border-t border-gray-100">
          {!isCompleted && (
            <button
              onClick={openEndModal}
              className="w-full py-3 min-h-[44px] rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-[0.98]"
            >
              면접 종료
            </button>
          )}
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div className={`flex-1 flex-col min-w-0 bg-white ${mobileTab === 'info' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            AI
          </div>
           <div>
             <p className="text-sm font-bold text-gray-900">Kairos AI 면접관</p>
             <p className={`text-xs font-medium ${isCompleted ? 'text-gray-400' : 'text-emerald-500'}`}>
               {isCompleted ? '종료된 면접' : '온라인 · 텍스트 면접 진행 중'}
             </p>
           </div>
          {!isCompleted && (
            <button
              onClick={openEndModal}
              className="ml-auto shrink-0 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 active:scale-[0.98]"
            >
              면접 종료
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {messages.map((msg, idx) => (
            <div key={messageKey(idx)} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="shrink-0">
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    AI
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                    나
                  </div>
                )}
              </div>
              <div className="max-w-[75%] min-w-0 space-y-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white rounded-tr-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <span className="whitespace-pre-wrap">{getMessageText(msg)}</span>
                </div>
              </div>
            </div>
          ))}

          {isStreaming && !streamStarted && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AI
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white">
          <form
            onSubmit={(event) => {
              if (isCompleted) {
                event.preventDefault();
                return;
              }
              handleSubmit(event);
            }}
            className="flex items-end gap-2 sm:gap-3 bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={isCompleted ? '종료된 면접입니다.' : isStreaming ? 'AI 면접관이 답변을 작성 중입니다...' : '답변을 입력하세요... (Shift+Enter로 줄바꿈)'}
              rows={1}
              disabled={isStreaming || isCompleted}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isCompleted) handleSubmit(e);
                }
              }}
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 leading-relaxed disabled:cursor-not-allowed"
            />
            {isStreaming && (
              <button
                type="button"
                onClick={stop}
                className="shrink-0 h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 active:scale-[0.98]"
              >
                 생성 중지
              </button>
            )}
            <button
              type="submit"
              disabled={isStreaming || isCompleted || !input.trim()}
          className="shrink-0 w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
               전송
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">Enter로 전송 · Shift+Enter로 줄바꿈</p>
        </div>
      </div>

      {/* End Interview Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-lift w-full max-w-md p-6 space-y-5 animate-fade-in-up">
            {endPhase === 'confirm' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-xs font-semibold mx-auto">종료</div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-lg font-bold text-gray-900">정말 종료할까요?</h3>
                  <p className="text-sm text-gray-500">
                    {questionCount > 0
                      ? `현재 ${questionCount}번째 질문 · 지금까지 ${messages.length}개의 메시지를 주고받았습니다.`
                      : '아직 질문이 시작되지 않았습니다.'}
                  </p>
                  <p className="text-xs text-gray-400">종료하면 대화 내용이 저장되고 면접 목록으로 이동합니다.</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={closeEndModal}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors active:scale-[0.98]"
                  >
                    계속하기
                  </button>
                  <button
                    onClick={confirmEndInterview}
                    disabled={ending}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors active:scale-[0.98]"
                  >
                    {ending ? '저장 중...' : '면접 종료'}
                  </button>
                </div>
              </>
            ) : (
              <>
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold mx-auto">완료</div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900">면접이 종료되었습니다</h3>
                  <p className="text-sm text-gray-500 mt-1">지금까지의 면접 요약입니다.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{messages.length}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-medium">주고받은 메시지</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-gray-900">{questionCount}</div>
                    <div className="text-xs text-gray-400 mt-0.5 font-medium">진행된 질문</div>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400">잠시 후 면접 목록으로 이동합니다...</p>
                <button
                  onClick={() => {
                    setShowEndModal(false);
                    router.push('/interview');
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
                >
                  면접 목록으로 이동
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
