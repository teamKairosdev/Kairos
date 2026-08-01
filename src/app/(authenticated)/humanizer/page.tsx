'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/toast';

export default function HumanizerPage() {
  const toast = useToast();
  const [originalText, setOriginalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function processHumanize() {
    if (!originalText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/humanizer/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalText }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        toast.add({ title: '변???�패', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: '변???�패', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result?.humanizedText) return;
    try {
      await navigator.clipboard.writeText(result.humanizedText);
      toast.add({ title: '?�립보드??복사?�었?�니??', color: 'green' });
    } catch {
      toast.add({ title: '복사???�패?�습?�다.', color: 'red' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Text Humanizer</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">?�머?�이?�</h1>
        <p className="text-sm text-gray-500 mt-1">AI ?�유???�딱??문체�??�연?�럽�??�동�??�는 ?�조�?변?�합?�다.</p>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm font-semibold text-gray-700">?�본 문장</span>
            </div>
            <span className="text-xs text-gray-400">{originalText.length}??/span>
          </div>
          <div className="flex-1 p-5">
            <textarea
              rows={12}
              value={originalText}
              onChange={e => setOriginalText(e.target.value)}
              placeholder="AI가 ?�성???�딱??문장?�나 ?�소?��? 붙여?�으?�요..."
              className="w-full text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none leading-relaxed h-full min-h-[200px]"
            />
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={processHumanize}
              disabled={!originalText.trim() || loading}
              className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? '변??�?..' : '?�간??변??}</span>
            </button>
          </div>
        </div>

        {/* Result Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${result ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              <span className="text-sm font-semibold text-gray-700">변??결과</span>
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">?�연?�러?�</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {result.styleScore}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-5">
            {result ? (
              <div className="space-y-4 h-full">
                <div className="relative">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.humanizedText}</p>
                  <button
                    onClick={copyResult}
                    className="absolute top-0 right-0 px-2.5 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    복사
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">변???�약</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{result.changesSummary}</p>
                  </div>
                  {result.removedClichés && result.removedClichés.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">?�거???�리??/p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.removedClichés.map((c: string, idx: number) => (
                          <span key={idx} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full line-through">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-3 text-gray-400">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-300 text-xl">
                  ??                </div>
                <p className="text-sm">
                  ?�쪽??문장???�력?�고<br />
                  <strong className="text-gray-600">?�간??변??/strong>???�러보세??                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
