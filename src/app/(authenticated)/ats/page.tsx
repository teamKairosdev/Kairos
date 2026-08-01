'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';

export default function ATSPage() {
  const toast = useToast();

  const [jobTitle, setJobTitle] = useState('?œë‹ˆ???„ë¡ ?¸ì—”??ê°œë°œ??);
  const [jobDescription, setJobDescription] = useState(
    '- Nuxt.js, Vue 3, TypeScript ?¤ë¬´ ê²½í—˜ 3???´ìƒ\n- SSR / SSG ë°??±ëŠ¥ ìµœì ??ê²½í—˜\n- CI/CD ?Œì´?„ë¼??ë°?Docker ê²½í—˜ ?°ë?'
  );
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  useEffect(() => {
    async function fetchResumes() {
      try {
        const res = await fetch('/api/resumes');
        if (res.ok) {
          const data = await res.json();
          setResumes(data || []);
        }
      } catch {}
    }
    fetchResumes();
  }, []);

  function handleSelectResume(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedResumeId(id);
    const target = resumes.find(r => r.id === id);
    if (target) {
      setResumeText(target.originalContent || '');
    }
  }

  async function runATSAnalysis() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          resumeText,
          resumeId: selectedResumeId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.analysis);
        toast.add({ title: 'ATS ë§¤ì¹­ ë¶„ì„ ?„ë£Œ', description: '?”êµ¬ ?¤íƒ ë¶„ì„ ?ˆí¬?¸ê? ?˜ë‹¨???‘ì„±?˜ì—ˆ?µë‹ˆ??', color: 'green' });
      } else {
        toast.add({ title: 'ATS ë¶„ì„ ?¤íŒ¨', color: 'red' });
      }
    } catch (err: any) {
      toast.add({ title: 'ATS ë¶„ì„ ?¤íŒ¨', description: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 space-y-10 px-4 pb-20">
      {/* Header */}
      <div className="pb-6 border-b border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI ATS ?í•©??ë§¤ì¹­</h1>
        <p className="text-sm font-medium text-slate-400 mt-2">
          ì±„ìš© ê³µê³ (JD)???”êµ¬ ?¤íƒ ë°??°ë??¬í•­??AI ê¸°ë°˜?¼ë¡œ ?Œì‹±?˜ì—¬ ?´ë ¥?œì???ì§ë¬´ ?í•©ë¥ ì„ ë¶„ì„?©ë‹ˆ??
        </p>
      </div>

      {/* Inputs Group */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* JD Input Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
            <span className="text-blue-600">?’¼</span>
            <h3 className="text-base font-bold text-slate-800">ì±„ìš© ?•ë³´ (Job Description)</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">ì§ë¬´ëª?/label>
            <input
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="?? ?œë‹ˆ???„ë¡ ?¸ì—”??ê°œë°œ??
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">?ê²©?”ê±´ ë°??”êµ¬ ?¤íƒ</label>
            <textarea
              rows={10}
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="ì±„ìš©ê³µê³ ???ê²©?”ê±´, ?°ë??¬í•­ ??ë³¸ë¬¸???¬ê¸°??ë¶™ì—¬?£ìœ¼?¸ìš”..."
              className="w-full font-mono text-sm leading-relaxed p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Resume Selection & Input Card */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">?“„</span>
                <h3 className="text-base font-bold text-slate-800">?€???´ë ¥??? íƒ</h3>
              </div>
              <span className="text-[10px] text-blue-600 font-bold uppercase">Database Sync</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">?‘ì„±???´ë ¥??ë¶ˆëŸ¬?¤ê¸°</label>
              <select
                value={selectedResumeId}
                onChange={handleSelectResume}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">ë¶„ì„???´ë ¥?œë? ? íƒ??ì£¼ì„¸??/option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">?´ë ¥???ìŠ¤??ì§ì ‘ ?…ë ¥/?˜ì •</label>
              <textarea
                rows={8}
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="?´ë ¥??ëª©ë¡?ì„œ ? íƒ?˜ê±°?? ?¬ê¸°???´ë ¥???ìŠ¤?¸ë? ì§ì ‘ ?…ë ¥?˜ì„¸??.."
                className="w-full font-mono text-sm leading-relaxed p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={runATSAnalysis}
              disabled={loading || !jobTitle || !jobDescription || !resumeText}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl hover:shadow-lg hover:shadow-blue-100 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? 'ë¶„ì„ ì¤?..' : 'ATS ?í•©???‰ê? ?¤í–‰'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results Card */}
      {result && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-10 shadow-md shadow-slate-100/50 space-y-8 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />

          {/* Overall score indicator */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                ë¶„ì„ ?ˆí¬??              </span>
              <h2 className="text-2xl font-extrabold text-slate-800 mt-2">{jobTitle} ?í•©??ê²°ê³¼</h2>
            </div>
            <div className="flex items-center gap-4 bg-slate-50/60 border border-slate-100 rounded-2xl px-6 py-4">
              <div className="text-center md:text-right">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ìµœì¢… ë§¤ì¹­ë¥?/div>
                <div className="text-4xl font-black text-blue-600 mt-1">
                  {result.matchScore}<span className="text-lg font-medium text-slate-400 ml-0.5">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Breakdown Scores */}
          {result.detailedBreakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">ê¸°ìˆ  ?¤íƒ ë§¤ì¹­</div>
                <div className="text-2xl font-extrabold text-slate-800">{result.detailedBreakdown.skillsScore}%</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">?”êµ¬ ê²½ë ¥ ì¶©ì¡±</div>
                <div className="text-2xl font-extrabold text-slate-800">{result.detailedBreakdown.experienceScore}%</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">?™ë ¥ ?¬í•­ ë¶€??/div>
                <div className="text-2xl font-extrabold text-slate-800">{result.detailedBreakdown.educationScore}%</div>
              </div>
              <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-center space-y-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">?¤ì›Œ??ë°€??ì§€??/div>
                <div className="text-2xl font-extrabold text-slate-800">{result.detailedBreakdown.keywordDensityScore}%</div>
              </div>
            </div>
          )}

          {/* Keyword Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-green-50/20 border border-green-100/50 space-y-4">
              <div className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                ?´ë ¥????ê°ì???ë§¤ì¹­ ?¤ì›Œ??(Found)
              </div>
              {result.foundKeywords && result.foundKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.foundKeywords.map((k: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-100/80 rounded-xl">
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">ë§¤ì¹­???¤ì›Œ?œê? ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.</p>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-red-50/20 border border-red-100/50 space-y-4">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                ?°ë? ?”êµ¬?¬í•­ ???„ë½???¤ì›Œ??(Missing)
              </div>
              {result.missingKeywords && result.missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((k: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-100/80 rounded-xl">
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">?„ë½???„ìˆ˜ ?¤ì›Œ?œê? ?†ìŠµ?ˆë‹¤.</p>
              )}
            </div>
          </div>

          {/* Actionable recommendations */}
          <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ?’¡ ATS ë§¤ì¹­ë¥??¥ìƒ???„í•œ ê¸°ì¬ ê°œì„  ?œì–¸
            </div>
            <ul className="text-xs text-slate-650 space-y-2 list-disc list-inside">
              {result.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} className="leading-relaxed">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
