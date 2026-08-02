'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

interface QAPair {
  question: string;
  sampleAnswer: string;
  keyPoints?: string[];
}

interface QASet {
  id: string;
  title?: string;
  targetRole?: string;
  qaPairs?: QAPair[];
  qaSet?: QASet;
  createdAt?: string;
}

export default function QAPage() {
  const toast = useToast();
  const [targetRole, setTargetRole] = useState('');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [qaSets, setQaSets] = useState<QASet[]>([]);
  const [selectedSet, setSelectedSet] = useState<QASet | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/qa/list').then(r => r.ok ? r.json() : []).then(d => setQaSets(d || [])).catch(() => {});
  }, []);

  async function generate() {
    if (!targetRole.trim()) {
      toast.add({ title: 'Please enter target role', color: 'red' });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/qa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, context }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedSet(data);
        setQaSets(prev => [data, ...prev]);
        setExpandedIdx(0);
        toast.add({ title: 'Q&A generated!', color: 'green' });
      }
    } catch (err: unknown) {
      toast.add({ title: 'Error', description: (err as Error).message, color: 'red' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Q&A Generator</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Interview Q&A Generator</h1>
        <p className="text-sm text-gray-500 mt-1">AI generates tailored interview questions and sample answers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Generate Q&A</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Target Role *</label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Frontend Engineer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Context (optional)</label>
              <textarea
                rows={4}
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Key skills, company info, resume snippets..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <button
              onClick={generate}
              disabled={generating || !targetRole.trim()}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {generating && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {generating ? 'Generating...' : 'Generate Q&A'}
            </button>
          </div>

          {qaSets.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">History</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {qaSets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSet(s); setExpandedIdx(0); }}
                    className={`w-full px-5 py-3 text-left text-xs font-medium hover:bg-gray-50 transition-colors ${selectedSet?.id === s.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                  >
                    {s.targetRole}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {!selectedSet ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-center h-full">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">🎯</div>
              <p className="text-sm font-medium text-gray-600">Generated Q&A will appear here</p>
              <p className="text-xs text-gray-400">Enter a target role and generate your Q&A set</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-800">{selectedSet.targetRole}</h2>
                <span className="text-xs text-gray-400">{selectedSet.qaPairs?.length || 0} questions</span>
              </div>
              {(selectedSet.qaPairs || []).map((qa, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    className="w-full px-5 py-4 text-left flex items-start justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-black flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 text-left break-words">{qa.question}</p>
                    </div>
                    <span className={`text-gray-400 text-xs transition-transform shrink-0 ${expandedIdx === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {expandedIdx === i && (
                    <div className="px-5 pb-5 border-t border-gray-50">
                      <div className="pt-4 space-y-3">
                        <p className="text-sm text-gray-700 leading-relaxed break-words">{qa.sampleAnswer}</p>
                        {qa.keyPoints && qa.keyPoints.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Key Points</p>
                            <ul className="space-y-1">
                              {qa.keyPoints.map((kp, ki) => (
                                <li key={ki} className="flex items-start gap-2 text-xs text-gray-600">
                                  <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  <span className="break-words">{kp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}