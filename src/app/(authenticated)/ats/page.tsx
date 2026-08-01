'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

export default function ATSPage() {
  const toast = useToast();

  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  useEffect(() => {
    fetch('/api/resumes').then(r => r.ok ? r.json() : []).then(d => setResumes(d || [])).catch(() => {});
  }, []);

  function onResumeSelect(id: string) {
    setSelectedResumeId(id);
    const found = resumes.find(r => r.id === id);
    if (found) setResumeText(found.originalContent || '');
  }

  async function analyze() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, jobDescription, resumeText, resumeId: selectedResumeId || undefined }),
      });
      if (res.ok) setResult(await res.json());
    } catch (err: any) {
      toast.add({ title: 'Error', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">ATS Match</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ATS Matching Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">AI analyzes keyword matching between JD and resume</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Job Description</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Job Title</label>
              <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Requirements</label>
              <textarea rows={6} value={jobDescription} onChange={e => setJobDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Resume</h2>
            {resumes.length > 0 && (
              <select value={selectedResumeId} onChange={e => onResumeSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Manual input</option>
                {resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            )}
            <textarea rows={8} value={resumeText} onChange={e => setResumeText(e.target.value)}
              placeholder="Paste resume text here..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <button onClick={analyze} disabled={loading || !jobDescription || !resumeText}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Analyzing...' : 'Start ATS Analysis'}
            </button>
          </div>
        </div>

        <div>
          {!result ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 flex flex-col items-center justify-center gap-3 text-center h-full">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">📊</div>
              <p className="text-sm font-medium text-gray-600">Results will appear here</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 text-center">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 p-1 mx-auto">
                  <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
                    <div className="text-3xl font-black text-blue-600">{result.matchScore}</div>
                    <div className="text-xs text-gray-400 font-medium">/ 100</div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-700 mt-3">ATS Match Score</p>
              </div>
              {result.missingKeywords?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-3">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw: string) => (
                      <span key={kw} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.foundKeywords?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Matched Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.foundKeywords.map((kw: string) => (
                      <span key={kw} className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.recommendations?.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}