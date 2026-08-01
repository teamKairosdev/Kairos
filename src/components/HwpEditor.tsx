'use client';

import { useEffect, useRef, useState } from 'react';
import Spinner from '@/components/Spinner';

interface RhwpEditorInstance {
  loadFile(data: ArrayBuffer | Uint8Array, fileName?: string, options?: { skipUnsavedGuard?: boolean; suppressDialogs?: boolean }): Promise<{ pageCount: number }>;
  exportHwp(): Promise<Uint8Array>;
  exportHwpx(): Promise<Uint8Array>;
  notifySaved(fileName?: string): Promise<{ ok: true; wasDirty: boolean }>;
  destroy(): void;
}

interface HwpEditorProps {
  /** 기존 문서 편집 시 초기 로드할 문서 ID */
  initialDocId?: string;
  /** 저장 완료 시 호출 (새 문서 id/제목) */
  onSaved?: (doc: { id: string; title: string; ext: string }) => void;
}

const STUDIO_URL = process.env.NEXT_PUBLIC_RHWP_STUDIO_URL || 'https://edwardkim.github.io/rhwp/';

export default function HwpEditor({ initialDocId, onSaved }: HwpEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditorInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const { createEditor } = await import('@rhwp/editor');
        if (disposed || !hostRef.current) return;
        const editor = await createEditor(hostRef.current, { studioUrl: STUDIO_URL, height: '100%' });
        if (disposed) {
          editor.destroy();
          return;
        }
        editorRef.current = editor as unknown as RhwpEditorInstance;
        setReady(true);

        if (initialDocId) {
          const res = await fetch(`/api/docs/${initialDocId}`);
          if (!res.ok) throw new Error('문서를 불러오지 못했습니다.');
          await editorRef.current.loadFile(await res.arrayBuffer(), undefined, { suppressDialogs: true });
        }
      } catch (err: any) {
        if (!disposed) setLoadError(err?.message || '에디터를 초기화하지 못했습니다.');
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
    if (!editor) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const bytes = format === 'hwp' ? await editor.exportHwp() : await editor.exportHwpx();
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const form = new FormData();
      form.append('file', new File([buffer], `document.${format}`));
      const res = await fetch('/api/docs/upload', { method: 'POST', body: form });
      if (!res.ok) throw new Error('업로드 실패');
      const doc = await res.json();
      await editor.notifySaved(doc.title || `document.${format}`);
      setSavedMsg('저장되었습니다.');
      onSaved?.(doc);
    } catch (err: any) {
      setSavedMsg(`저장 실패: ${err?.message || '오류'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave('hwp')}
            disabled={!ready || saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50"
          >
            {saving && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            HWP로 저장
          </button>
          <button
            onClick={() => handleSave('hwpx')}
            disabled={!ready || saving}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            HWPX로 저장
          </button>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${ready ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
          {ready ? '에디터 준비됨' : '에디터 로딩 중…'}
        </div>
      </div>

      {loadError && (
        <div className="py-6 text-center text-sm text-red-500 bg-red-50 rounded-xl border border-red-100">
          {loadError}
        </div>
      )}

      {savedMsg && (
        <div className={`py-3 px-4 rounded-xl text-sm font-medium ${savedMsg.startsWith('저장 실패') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {savedMsg}
        </div>
      )}

      <div ref={hostRef} className="w-full h-[70vh] rounded-2xl overflow-hidden border border-gray-200 bg-white" />
    </div>
  );
}
