'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';

export default function DocsPage() {
  const toast = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [files, setFiles] = useState<Array<{ id: string; name: string; ext: string; size: number }>>([]);
  const [loading, setLoading] = useState(true);

  async function loadFiles() {
    try {
      const res = await fetch('/api/docs');
      if (res.ok) {
        const data = await res.json();
        setFiles(
          (data || []).map((f: any) => ({
            id: f.id || f._id,
            name: f.name || f.title || 'Untitled',
            ext: (f.name || '').split('.').pop() || 'hwp',
            size: f.size || 0,
          }))
        );
      }
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setDocTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function uploadFile() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('title', docTitle || selectedFile.name.replace(/\.[^.]+$/, ''));
      const res = await fetch('/api/docs/upload', { method: 'POST', body: form });
      if (res.ok) {
        setShowUpload(false);
        setSelectedFile(null);
        setDocTitle('');
        toast.add({ title: '문서가 ?�로?�되?�습?�다.', color: 'green' });
        await loadFiles();
      } else {
        toast.add({ title: '?�로???�패', color: 'red' });
      }
    } catch {
      toast.add({ title: '?�로???�패', color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    try {
      const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.add({ title: '문서가 ??��?�었?�니??', color: 'green' });
        await loadFiles();
      }
    } catch {
      toast.add({ title: '??�� ?�패', color: 'red' });
    }
  }

  function fileEmoji(ext: string) {
    return { hwp: '?��', hwpx: '?��', docx: '?��', doc: '?��', pdf: '?��' }[ext] || '?��';
  }
  function fileIconBg(ext: string) {
    return { hwp: 'bg-blue-50', hwpx: 'bg-blue-50', docx: 'bg-blue-50', doc: 'bg-blue-50', pdf: 'bg-red-50' }[ext] || 'bg-gray-50';
  }
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Document Vault</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">문서 보�???/h1>
          <p className="text-sm text-gray-500 mt-1">HWP, PDF, DOCX ?�일???�전?�게 보�??�고 AI�?분석?�니??</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          문서 ?�로??        </button>
      </div>

      {/* File list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400 text-2xl">
              ?��
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">?�로?�된 문서가 ?�습?�다</h3>
            <p className="text-sm text-gray-400 mb-6">?�력?? ?�소?? ?�트?�리???�을 ?�로?�하?�요</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all"
            >
              �?문서 ?�로??            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {files.map(f => (
              <div
                key={f.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${fileIconBg(f.ext)}`}>
                  {fileEmoji(f.ext)}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/docs/${f.id}`}
                    className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
                  >
                    {f.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{f.ext.toUpperCase()} · {formatSize(f.size)}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/docs/${f.id}`}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    ?���?                  </Link>
                  <button
                    onClick={() => deleteFile(f.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    ?���?                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowUpload(false)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">문서 ?�로??/h2>
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                ??              </button>
            </div>

            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-orange-300 hover:bg-orange-50/20 transition-all ${
                selectedFile ? 'border-orange-400 bg-orange-50/40' : ''
              }`}
            >
              <input type="file" accept=".hwp,.hwpx,.docx,.doc,.pdf" className="hidden" onChange={onFileSelect} />
              <span className="text-3xl mb-2">?��</span>
              <p className="text-sm font-semibold text-gray-600">{selectedFile ? selectedFile.name : '?�릭?�여 ?�일 ?�택'}</p>
              <p className="text-xs text-gray-400 mt-1">HWP, HWPX, DOCX, PDF 지??/p>
            </label>

            {selectedFile && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">?�목</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder={selectedFile.name.replace(/\.[^.]+$/, '')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={uploadFile}
                disabled={!selectedFile || uploading}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {uploading ? '?�로??�?..' : '?�로??}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
