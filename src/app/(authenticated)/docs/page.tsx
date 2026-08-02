'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';
import Skeleton from '@/components/Skeleton';

interface DocFile {
  id: string;
  title?: string;
  name?: string;
  ext: string;
  size: number;
  createdAt?: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,.doc,.hwp,.hwpx';

interface ExtStyle {
  label: string;
  box: string;
  iconClass: string;
  labelClass: string;
}

const EXT_STYLES: Record<string, ExtStyle> = {
  pdf: { label: 'PDF', box: 'bg-red-50', iconClass: 'text-red-500', labelClass: 'text-red-600' },
  docx: { label: 'DOCX', box: 'bg-blue-50', iconClass: 'text-blue-500', labelClass: 'text-blue-600' },
  doc: { label: 'DOC', box: 'bg-blue-50', iconClass: 'text-blue-500', labelClass: 'text-blue-600' },
  hwp: { label: 'HWP', box: 'bg-orange-50', iconClass: 'text-orange-500', labelClass: 'text-orange-600' },
  hwpx: { label: 'HWPX', box: 'bg-orange-50', iconClass: 'text-orange-500', labelClass: 'text-orange-600' },
  txt: { label: 'TXT', box: 'bg-gray-100', iconClass: 'text-gray-500', labelClass: 'text-gray-600' },
};

const DEFAULT_EXT_STYLE: ExtStyle = { label: 'FILE', box: 'bg-gray-100', iconClass: 'text-gray-500', labelClass: 'text-gray-600' };

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatRelative(iso?: string) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function DocsPage() {
  const toast = useToast();
  const addToast = useMemo(() => ({ add: toast.add }), []);
  const toastRef = useRef(addToast);
  toastRef.current = addToast;

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<DocFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/docs');
      if (res.ok) {
        setFiles(await res.json());
      } else {
        setLoadError('문서 목록을 불러오지 못했습니다.');
        toastRef.current.add({ title: '문서 목록을 불러오지 못했습니다.', color: 'red' });
      }
    } catch {
      setLoadError('문서 목록을 불러오지 못했습니다. 네트워크를 확인해주세요.');
      toastRef.current.add({ title: '문서 목록을 불러오지 못했습니다.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  function pickFile(file: File | null) {
    setFileError('');
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setSelectedFile(null);
      setFileError('10MB 이하의 파일만 업로드할 수 있습니다.');
      return;
    }
    setSelectedFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] || null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      if (docTitle.trim()) form.append('title', docTitle.trim());

      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      if (ext === 'hwp' || ext === 'hwpx') {
        try {
          const { extractHwpText } = await import('@/lib/hwpTextExtract');
          const bytes = new Uint8Array(await selectedFile.arrayBuffer());
          const text = await extractHwpText(bytes);
          if (text) form.append('textContent', text);
        } catch {
          toastRef.current.add({ title: 'HWP 텍스트 추출에 실패했습니다', description: '파일이 손상되었거나 지원되지 않는 형식일 수 있습니다.', color: 'yellow' });
        }
      }

      const res = await fetch('/api/docs/upload', { method: 'POST', body: form });
      if (res.ok) {
        setShowUpload(false);
        setSelectedFile(null);
        setDocTitle('');
        setFileError('');
        await loadFiles();
        toastRef.current.add({ title: '문서가 업로드되었습니다', color: 'green' });
      } else {
        const data = await res.json().catch(() => null);
        toastRef.current.add({ title: '업로드에 실패했습니다', description: data?.error, color: 'red' });
      }
    } catch (err: unknown) {
      toastRef.current.add({ title: '업로드 중 오류가 발생했습니다', description: (err as Error).message, color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== id));
        setConfirmDelete(null);
        toastRef.current.add({ title: '문서가 삭제되었습니다', color: 'green' });
      } else {
        toastRef.current.add({ title: '문서 삭제에 실패했습니다', color: 'red' });
      }
    } catch {
      toastRef.current.add({ title: '문서 삭제에 실패했습니다', color: 'red' });
    } finally {
      setDeleting(false);
    }
  }

  function closeUpload() {
    if (uploading) return;
    setShowUpload(false);
    setSelectedFile(null);
    setFileError('');
    setDocTitle('');
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Document Vault</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">문서 보관함</h1>
          <p className="text-sm text-gray-500 mt-1">HWP · PDF · DOCX 파일을 업로드하고 AI와 함께 분석하세요</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/docs/edit"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            새 HWP 문서
          </Link>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            파일 업로드
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 max-w-56" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-4">{loadError}</p>
            <button
              onClick={loadFiles}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 active:scale-[0.98]"
            >
              다시 시도
            </button>
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            className="p-16 text-center"
            icon="📂"
            iconWrapperClass="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400 text-2xl"
            title="아직 문서가 없습니다"
            description="첫 문서를 업로드해 AI 분석을 시작하세요"
            actionLabel="문서 업로드"
            onAction={() => setShowUpload(true)}
            actionClass="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 active:scale-[0.98]"
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {files.map(f => {
              const style = EXT_STYLES[f.ext?.toLowerCase()] || DEFAULT_EXT_STYLE;
              return (
                <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-200 group">
                  <div className={`relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${style.box}`}>
                    <svg className={`w-5 h-5 ${style.iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4" />
                    </svg>
                    <span className={`absolute bottom-0.5 right-1 text-[8px] font-extrabold leading-none ${style.labelClass}`}>{style.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/docs/${f.id}`}
                      className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
                    >
                      {f.title || f.name}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {style.label} · {formatSize(f.size)} · {formatRelative(f.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(f)}
                    aria-label="문서 삭제"
                    className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors duration-200 opacity-0 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && closeUpload()}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-md p-6 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">문서 업로드</h2>
              <button
                onClick={closeUpload}
                disabled={uploading}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-40"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <label
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 md:p-8 cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-orange-400 bg-orange-50'
                  : selectedFile
                    ? 'border-orange-400 bg-orange-50/50'
                    : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
              }`}
            >
              <input
                type="file"
                accept={ACCEPT}
                onChange={e => pickFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <span className="text-3xl mb-2">📎</span>
              <p className="text-sm font-medium text-gray-600 break-words text-center">
                {selectedFile ? selectedFile.name : '클릭하거나 파일을 끌어다 놓으세요'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF · DOCX · HWP · HWPX · DOC · TXT (10MB 이하)</p>
            </label>
            {fileError && <p className="text-xs font-medium text-red-500">{fileError}</p>}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">제목 (선택)</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="문서 제목을 입력하세요"
                maxLength={100}
                disabled={uploading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeUpload}
                disabled={uploading}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {uploading && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {uploading ? '업로드 중…' : '업로드'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && !deleting && setConfirmDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <h2 className="text-lg font-bold text-gray-900">문서 삭제</h2>
            <p className="text-sm text-gray-500">
              &apos;{confirmDelete.title || confirmDelete.name}&apos; 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={() => deleteFile(confirmDelete.id)}
                disabled={deleting}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors duration-200 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {deleting && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
