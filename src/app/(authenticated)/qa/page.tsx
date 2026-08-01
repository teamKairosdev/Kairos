'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function QAPage() {
  const toast = useToast();

  const [targetRole, setTargetRole] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [careerSummary, setCareerSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaSet, setQaSet] = useState<any>(null);

  async function generateQA() {
    if (!targetRole || !careerSummary) return;
    setLoading(true);
    try {
      const res = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, careerSummary, count: questionCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setQaSet(data.qaSet);
      } else {
        toast.add({ title: 'Q&A ?�성 ?�패', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: 'Q&A ?�성 ?�패', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-teal-500 uppercase mb-1">Q&amp;A Generator</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">면접 Q&amp;A ?�성</h1>
        <p className="text-sm text-gray-500 mt-1">직무?� 경력??분석?�여 ?�전 면접 ?�상 질문�?모범 ?�안???�성?�니??</p>
      </div>

      {/* Config Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">?�성 ?�정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              지??직무 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="?? ?�니???�?�택 ?��??�어"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">질문 개수</label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    questionCount === n
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            경력 ?�약 <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={4}
            value={careerSummary}
            onChange={e => setCareerSummary(e.target.value)}
            placeholder="주요 ?�로?�트, ?�용??기술 ?�택, ?�과 ?�을 ?�약?�주?�요. AI가 ?��? 기반?�로 맞춤 질문???�성?�니??"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none leading-relaxed"
          />
        </div>
        <button
          onClick={generateQA}
          disabled={!targetRole.trim() || !careerSummary.trim() || loading}
          className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          <span>{loading ? 'AI가 질문???�성?�고 ?�습?�다...' : `${questionCount}�?Q&A ?�성`}</span>
        </button>
      </div>

      {/* Q&A Results */}
      {qaSet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              {qaSet.targetRole} 맞춤 Q&amp;A
            </h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{qaSet.qaPairs?.length}�?/span>
          </div>

          <div className="space-y-4">
            {qaSet.qaPairs?.map((qa: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="px-6 py-4 flex items-start gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-600">
                    Q{idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          qa.difficulty === 'easy' || qa.difficulty === '기초' || qa.difficulty?.includes('주니??)
                            ? 'bg-green-50 text-green-700'
                            : qa.difficulty === 'medium' || qa.difficulty === '중급' || qa.difficulty?.includes('미들')
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {qa.difficulty}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">{qa.question}</p>
                  </div>
                </div>

                <div className="px-6 pb-5 border-t border-gray-50 pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded flex items-center justify-center bg-emerald-100 text-emerald-600 text-xs">
                      A
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">모범 ?�안</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{qa.sampleAnswer}</p>

                  {qa.keyPoints && qa.keyPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-xs text-gray-400 font-medium">?�심 ?�워??</span>
                      {qa.keyPoints.map((kp: string, kIdx: number) => (
                        <span key={kIdx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          #{kp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
