'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Spinner from '@/components/Spinner';
import { useToast } from '@/lib/toast';

interface RhwpEditorInstance {
  loadFile(data: ArrayBuffer | Uint8Array, fileName?: string, options?: { skipUnsavedGuard?: boolean; suppressDialogs?: boolean }): Promise<{ pageCount: number }>;
  exportHwp(): Promise<Uint8Array>;
  exportHwpx(): Promise<Uint8Array>;
  notifySaved(fileName?: string): Promise<{ ok: true; wasDirty: boolean }>;
  destroy(): void;
}

interface HwpEditorProps {
  initialDocId?: string;
  onSaved?: (doc: { id: string; title: string; ext: string }) => void;
}

const STUDIO_URL = process.env.NEXT_PUBLIC_RHWP_STUDIO_URL || 'https://edwardkim.github.io/rhwp/';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export default function HwpEditor({ initialDocId, onSaved }: HwpEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditorInstance | null>(null);
  const toast = useToast();
  const addToast = useMemo(() => ({ add: toast.add }), []);
  const toastRef = useRef(addToast);
  toastRef.current = addToast;

  const [loadStage, setLoadStage] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let disposed = false;
    (async () => {
      setLoadStage('loading');
      setLoadError('');
      try {
        const { createEditor } = await import('@rhwp/editor');
        if (disposed || !hostRef.current) return;
        const editor = await createEditor(hostRef.current, { studioUrl: STUDIO_URL, height: '100%' });
        if (disposed) {
          editor.destroy();
          return;
        }
        editorRef.current = editor as unknown as RhwpEditorInstance;

        if (initialDocId) {
          const res = await fetch(`/api/docs/${initialDocId}`);
          if (!res.ok) throw new Error('문서를 불러오지 못했습니다.');
          await editorRef.current.loadFile(await res.arrayBuffer(), undefined, { suppressDialogs: true });
        }
        if (!disposed) setLoadStage('ready');
      } catch (err: unknown) {
        if (!disposed) {
          setLoadError(err instanceof Error ? err.message || '에디터를 초기화하지 못했습니다.' : '에디터를 초기화하지 못했습니다.');
          setLoadStage('error');
        }
      }
    })();
    return () => {
      disposed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [initialDocId]);

  async function handleSave(format: 'hwp' | 'hwpx') {
    const editor = editorRef.current;
    if (!editor || saving) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const bytes = format === 'hwp' ? await editor.exportHwp() : await editor.exportHwpx();
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        const msg = '저장한 파일이 10MB를 초과해 업로드할 수 없습니다.';
        setSavedMsg(msg);
        toastRef.current.add({ title: '저장 실패', description: msg, color: 'red' });
        return;
      }
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const form = new FormData();
      form.append('file', new File([buffer], `document.${format}`));
      const res = await fetch('/api/docs/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('업로드 실패');
      const doc = await res.json();
      await editor.notifySaved(doc.title || `document.${format}`);
      setSavedMsg('저장되었습니다.');
      toastRef.current.add({ title: '문서가 저장되었습니다', color: 'green' });
      onSaved?.(doc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message || '오류' : '오류';
      setSavedMsg(`저장 실패: ${msg}`);
      toastRef.current.add({ title: '저장에 실패했습니다', description: msg, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  const ready = loadStage === 'ready';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('hwp')}
            disabled={!ready || saving}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            HWP로 저장
          </button>
          <button
            onClick={() => handleSave('hwpx')}
            disabled={!ready || saving}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            HWPX로 저장
          </button>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${ready ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
          {ready ? '에디터 준비됨' : '에디터 로딩 중…'}
        </div>
      </div>

      {savedMsg && (
        <div className={`py-3 px-4 rounded-xl text-sm font-medium animate-fade-in-up ${savedMsg.startsWith('저장 실패') || savedMsg.includes('10MB') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {savedMsg}
        </div>
      )}

      <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <div ref={hostRef} className="absolute inset-0" />
        {loadStage === 'loading' && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
            <Spinner className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500">에디터 준비 중…</p>
          </div>
        )}
        {loadStage === 'error' && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 p-6">
            <p className="text-sm text-red-500 text-center break-words">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors active:scale-[0.98]"
            >
              다시 시도
            </button>
          </div>
        )}
        {saving && (
          <div className="absolute inset-0 z-20 bg-black/20 flex items-center justify-center">
            <div className="bg-white rounded-xl px-5 py-4 flex items-center gap-3 shadow-card animate-fade-in-up">
              <Spinner className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-700">저장 중…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
