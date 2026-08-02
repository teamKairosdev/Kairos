'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

export default function DocsPage() {
  const toast = useToast();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [files, setFiles] = useState<Array<{ id: string; title?: string; name?: string; ext: string; size: number }>>([]);
  const [loading, setLoading] = useState(true);

  async function loadFiles() {
    try {
      const res = await fetch('/api/docs');
      if (res.ok) {
        const data = await res.json();
        setFiles(data || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFiles(); }, []);

  function fileEmoji(ext: string) {
    const map: Record<string, string> = { pdf: 'P', docx: 'W', doc: 'W', hwp: 'H', hwpx: 'H', txt: 'T' };
    return map[ext?.toLowerCase()] || 'F';
  }

  function fileIconBg(ext: string) {
    const map: Record<string, string> = {
      pdf: 'bg-red-50 text-red-500',
      docx: 'bg-blue-50 text-blue-500',
      doc: 'bg-blue-50 text-blue-500',
      hwp: 'bg-orange-50 text-orange-500',
      hwpx: 'bg-orange-50 text-orange-500',
      txt: 'bg-gray-50 text-gray-500',
    };
    return map[ext?.toLowerCase()] || 'bg-gray-50 text-gray-500';
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      if (docTitle) form.append('title', docTitle);

      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      if (ext === 'hwp' || ext === 'hwpx') {
        const { extractHwpText } = await import('@/lib/hwpTextExtract');
        const bytes = new Uint8Array(await selectedFile.arrayBuffer());
        form.append('textContent', await extractHwpText(bytes));
      }

      const res = await fetch('/api/docs/upload', { method: 'POST', body: form });
      if (res.ok) {
        setShowUpload(false);
        setSelectedFile(null);
        setDocTitle('');
        await loadFiles();
        toast.add({ title: 'File uploaded successfully', color: 'green' });
      } else {
        toast.add({ title: 'Upload failed', color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: 'Error', description: (err as Error).message, color: 'red' });
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(id: string) {
    if (!confirm('Delete this file?')) return;
    try {
      const res = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== id));
        toast.add({ title: 'Deleted', color: 'green' });
      }
    } catch {
      toast.add({ title: 'Error deleting file', color: 'red' });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-1">Document Vault</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Upload HWP, PDF, DOCX files and analyze with AI</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/docs/edit"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            새 HWP 문서
          </Link>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Spinner className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            className="p-16 text-center"
            icon="📂"
            iconWrapperClass="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-400 text-2xl"
            title="No documents yet"
            description="Upload your first document to get started"
            actionLabel="Upload Document"
            onAction={() => setShowUpload(true)}
            actionClass="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-all"
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${fileIconBg(f.ext)}`}>
                  {fileEmoji(f.ext)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/docs/${f.id}`}
                    className="text-sm font-semibold text-gray-800 hover:text-orange-600 transition-colors truncate block"
                  >
                    {f.title || f.name}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{f.ext?.toUpperCase()} · {formatSize(f.size)}</p>
                </div>
                <button
                  onClick={() => deleteFile(f.id)}
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowUpload(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Upload Document</h2>
              <button onClick={() => setShowUpload(false)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 md:p-8 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all ${selectedFile ? 'border-orange-400 bg-orange-50/50' : ''}`}>
              <input type="file" accept=".pdf,.docx,.doc,.hwp,.hwpx,.txt" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
              <span className="text-3xl mb-2">📎</span>
              <p className="text-sm font-medium text-gray-600 break-words text-center">{selectedFile ? selectedFile.name : 'Click to select file'}</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, HWP, TXT</p>
            </label>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title (optional)</label>
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Document title"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpload(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}