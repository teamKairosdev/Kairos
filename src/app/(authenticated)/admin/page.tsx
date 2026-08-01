'use client';

import React, { useState, useEffect } from 'react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'env' | 'mfa' | 'audit'>('env');
  const [stats, setStats] = useState<{
    usersCount: number;
    resumesCount: number;
    interviewsCount: number;
    atsCount: number;
    recentLogs: any[];
  }>({
    usersCount: 0,
    resumesCount: 0,
    interviewsCount: 0,
    atsCount: 0,
    recentLogs: [],
  });
  const [settings, setSettings] = useState<{
    envMappings: { key: string; label: string }[];
    configs: any[];
  }>({
    envMappings: [],
    configs: [],
  });
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [mfaData, setMfaData] = useState<{ secret?: string; qrCodeUrl?: string }>({});
  const [otpToken, setOtpToken] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/settings'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
          const form: Record<string, string> = {};
          for (const item of settingsData.configs || []) {
            form[item.key] = item.value;
          }
          setConfigForm(form);
        }
      } catch {}
    }
    loadData();
  }, []);

  async function saveConfig(key: string, value: string, category: string, description: string) {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, category, description }),
      });
      if (res.ok) {
        alert(`[${key}] ?�경변?��? ?�?�되?�습?�다.`);
      } else {
        alert('?�???�패');
      }
    } catch {
      alert('?�???�패');
    }
  }

  async function setupMfa() {
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMfaData(data);
      }
    } catch {
      setMfaMessage('MFA ?�정 ?�패');
    }
  }

  async function enableMfa() {
    try {
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: otpToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setMfaMessage(data.message);
      }
    } catch {
      setMfaMessage('MFA ?�성???�패');
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">?�스??관리자 ?�?�보??/h1>
        <p className="text-sm font-medium text-slate-400 mt-2">?�적 ?�경변?? MFA 2?�계 ?�증, 보안 감사 로그�??�합 관리합?�다.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-8 text-sm">
        <button
          onClick={() => setActiveTab('env')}
          className={`pb-3 font-bold transition-colors ${
            activeTab === 'env' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          ?�️ ?�적 ?�경변??매칭
        </button>
        <button
          onClick={() => setActiveTab('mfa')}
          className={`pb-3 font-bold transition-colors ${
            activeTab === 'mfa' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          ?�� MFA 2?�계 ?�증
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 font-bold transition-colors ${
            activeTab === 'audit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          ?�� 감사 로그 (Audit Logs)
        </button>
      </div>

      {/* Tab 1: Environment Variables */}
      {activeTab === 'env' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">?�적 ?�경변??매칭 관�?/h2>
              <p className="text-xs font-medium text-slate-400 mt-1">DB ?�정 ?�이블에 ?�?�된 ?�경변??매칭 값이 ?�선 ?�용?�며 ?�시간으�?API ??교체 ?�이 가?�합?�다.</p>
            </div>

            <div className="space-y-4 pt-2">
              {settings.envMappings.map(env => (
                <div
                  key={env.key}
                  className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:border-slate-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-800">{env.key}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-600">Active Map</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">{env.label}</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto md:min-w-[400px]">
                    <input
                      type="text"
                      value={configForm[env.key] || ''}
                      onChange={e => setConfigForm({ ...configForm, [env.key]: e.target.value })}
                      className="flex-1 px-4 py-2.5 text-sm font-mono border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                      placeholder={`${env.key} 값을 ?�력?�세??}
                    />
                    <button
                      onClick={() => saveConfig(env.key, configForm[env.key] || '', 'env', env.label)}
                      className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shrink-0"
                    >
                      ?�??                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: MFA OTP Security */}
      {activeTab === 'mfa' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-slate-800">MFA OTP 2?�계 ?�정</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">Google Authenticator ??OTP ?�을 ?�해 계정 보안 ?��???격상?�니??</p>
            </div>

            {!mfaData.qrCodeUrl ? (
              <div className="pt-2">
                <button
                  onClick={setupMfa}
                  className="px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all"
                >
                  OTP 2?�계 ?�증 ?�성???�작
                </button>
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                <div className="flex flex-col items-center p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                  <img src={mfaData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 rounded-xl border border-slate-200 p-2 bg-white" />
                  <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100/50 px-3 py-1.5 rounded-lg select-all">
                    Secret: {mfaData.secret}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-500">6?�리 OTP 코드 검�?/label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpToken}
                      onChange={e => setOtpToken(e.target.value)}
                      placeholder="123456"
                      className="flex-1 px-4 py-2.5 text-center text-lg font-mono font-bold border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={enableMfa}
                      className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all"
                    >
                      검�?�??�동
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mfaMessage && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-xs font-semibold text-blue-600">
                {mfaMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">보안 감사 ?�업 로그</h2>
              <p className="text-xs font-medium text-slate-400 mt-1">?�스??주요 ?�태 변�?�?관리자 ?�업 ?�력??기록?�는 ?�시�?리포?�입?�다.</p>
            </div>
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-2">?�업 코드</th>
                    <th className="py-3 px-2">카테고리</th>
                    <th className="py-3 px-2">IP 주소</th>
                    <th className="py-3 px-2">기록 ?�시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {stats.recentLogs.map((log: any) => (
                    <tr key={log.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-2 font-mono text-slate-800">{log.action}</td>
                      <td className="py-3.5 px-2 text-slate-500">{log.category}</td>
                      <td className="py-3.5 px-2 font-mono text-slate-400">{log.ipAddress}</td>
                      <td className="py-3.5 px-2 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
