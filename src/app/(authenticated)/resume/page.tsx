'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/lib/toast';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import Spinner from '@/components/Spinner';
import EmptyState from '@/components/EmptyState';

const workflowSteps = [
  { num: '01', title: 'Draft Generation', desc: '초안 작성 또는 PDF/DOCX 파싱' },
  { num: '02', title: 'LLM Evaluation', desc: '점수, 강약점, STAR 프레임워크 분석' },
  { num: '03', title: 'Intelligent Rewrite', desc: '성과 중심 고도화 재작성' },
];

export default function ResumeListPage() {
  const toast = useToast();
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [refiningId, setRefiningId] = useState<string | null>(null);

  const { parseResumeFile } = useDocumentParser();

  async function fetchResumes() {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        setResumes(data || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResumes();
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let text: string;
      if (ext === 'hwpx') {
        const { extractHwpText } = await import('@/lib/hwpTextExtract');
        text = await extractHwpText(new Uint8Array(await file.arrayBuffer()));
      } else if (ext === 'hwp') {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/docs/parse', { method: 'POST', body: form });
        const data = await res.json();
        text = data.text;
      } else {
        text = await parseResumeFile(file);
      }
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      setNewContent(text);
      toast.add({ title: '파일이 성공적으로 로드되었습니다.', color: 'green' });
    } catch (err: any) {
      toast.add({ title: '파일 파싱 오류', description: err.message || '파일 읽기 오류', color: 'red' });
    }
  }

  async function createResume() {
    if (!newTitle || !newContent) return;
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, originalContent: newContent }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        fetchResumes();
        toast.add({ title: '이력서가 등록되었습니다.', color: 'green' });
      }
    } catch (err: any) {
      toast.add({ title: '이력서 등록 실패', description: err.message, color: 'red' });
    }
  }

  async function triggerRefine(id: string) {
    setRefiningId(id);
    try {
      const res = await fetch(`/api/resumes/${id}/refine`, { method: 'POST' });
      if (res.ok) {
        await fetchResumes();
        toast.add({ title: 'AI 고도화 완료', color: 'green' });
      }
    } catch (err: any) {
      toast.add({ title: 'AI 고도화 오류', description: err.message, color: 'red' });
    } finally {
      setRefiningId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Resume Builder</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">이력서 관리</h1>
          <p className="text-sm text-gray-500 mt-1">Draft → Evaluate → Improve 3단계 AI 체인으로 이력서를 고도화합니다.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          신규 이력서 등록
        </button>
      </div>

      {/* 3-step workflow banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">AI Workflow</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workflowSteps.map(step => (
            <div key={step.num} className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                {step.num}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{step.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resume grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">내 이력서</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : resumes && resumes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {resumes.map(r => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 hover:shadow-md hover:border-blue-100 transition-all group space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide ${
                        r.status === 'improved'
                          ? 'bg-emerald-50 text-emerald-600'
                          : r.status === 'evaluating'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {r.status}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{r.title}</h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-black text-blue-600">{r.currentScore || 0}</div>
                    <div className="text-[10px] text-gray-400 font-medium">점</div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{r.originalContent}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerRefine(r.id)}
                      disabled={refiningId === r.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {refiningId === r.id && (
                        <Spinner className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                      )}
                      AI 고도화
                    </button>
                    <Link
                      href={`/resume/${r.id}`}
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Canvas 열기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📄"
            iconWrapperClass="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400"
            title="등록된 이력서가 없습니다"
            description="첫 이력서를 등록하고 AI로 고도화하세요"
            actionLabel="이력서 등록하기"
            onAction={() => setShowCreateModal(true)}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">신규 이력서 등록</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              >
                ✕
              </button>
            </div>

            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all ${
                newContent ? 'border-blue-400 bg-blue-50/50' : ''
              }`}
            >
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.docx,.doc,.txt,.hwp,.hwpx"
                className="hidden"
              />
              <span className="text-2xl mb-1">📎</span>
              <p className="text-xs text-gray-500">PDF / DOCX / HWP 드로하기</p>
              <p className="text-xs text-gray-400 mt-0.5">또는 아래에 직접 입력</p>
            </label>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  제목 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="이력서 제목"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  본문 <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={6}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="경력, 프로젝트, 기술 스택을 입력하세요.."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={createResume}
                disabled={!newTitle || !newContent}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
