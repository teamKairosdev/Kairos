'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

export default function HumanizerPage() {
  const toast = useToast();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [styleScore, setStyleScore] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/humanizer/history').then(r => r.ok ? r.json() : []).then(d => setHistory(d || [])).catch(() => {});
  }, []);

  async function humanize() {
    if (!inputText.trim()) return;
    setLoading(true);
    setOutputText('');
    setStyleScore(null);
    try {
      const res = await fetch('/api/humanizer/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (res.ok) {
        const data = await res.json();
        setOutputText(data.humanizedText || '');
        setStyleScore(data.styleScore || null);
        if (data.id) setHistory(prev => [data, ...prev]);
      }
    } catch (err: any) {
      toast.add({ title: 'Error', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(outputText);
    toast.add({ title: 'Copied!', color: 'green' });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">AI Humanizer</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Text Humanizer</h1>
        <p className="text-sm text-gray-500 mt-1">Transform AI-generated text to sound natural and human</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Input (AI text)</label>
            <span className="text-xs text-gray-400">{inputText.length} chars</span>
          </div>
          <textarea
            rows={14}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste AI-generated text here..."
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
          />
          <button
            onClick={humanize}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Processing...' : 'Humanize Text'}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Output (Human text)</label>
            {styleScore !== null && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                Naturalness: {styleScore}%
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              rows={14}
              value={outputText}
              readOnly
              placeholder="Humanized text will appear here..."
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm bg-gray-50/50 resize-none leading-relaxed"
            />
            {outputText && (
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shadow-xs"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {history.slice(0, 5).map((h: any) => (
              <div key={h.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{h.originalText}</p>
                  <p className="text-xs font-medium text-gray-800 truncate mt-1">{h.humanizedText}</p>
                </div>
                {h.styleScore && (
                  <span className="shrink-0 text-xs font-bold text-emerald-600">{h.styleScore}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}