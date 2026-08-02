'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/lib/toast';
import Skeleton from '@/components/Skeleton';
import Spinner from '@/components/Spinner';
import type { SystemConfigItem } from '@/server/systemConfig';

interface AdminRecentUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  createdAt: string;
}

interface AdminStats {
  usersCount?: number;
  resumesCount?: number;
  interviewsCount?: number;
  atsCount?: number;
  careersCount?: number;
  recentUsers?: AdminRecentUser[];
}

const CATEGORY_LABELS: Record<string, string> = {
  env: '환경',
  feature_flag: '기능 플래그',
  llm: 'LLM',
  storage: '스토리지',
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '-';
  }
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-card p-10 text-center space-y-4 animate-fade-in-up">
      <p className="text-sm font-medium text-red-600">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2.5 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        다시 시도
      </button>
    </div>
  );
}

export default function AdminPage() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<SystemConfigItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error(`통계 요청 실패 (${res.status})`);
      const data = (await res.json()) as AdminStats;
      setStats(data);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '통계를 불러오지 못했습니다.';
      setStatsError(message);
      toast.add({ title: '통계를 불러오지 못했습니다.', color: 'red' });
    } finally {
      setLoadingStats(false);
    }
  }, [toast]);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    setSettingsError(null);
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error(`설정 요청 실패 (${res.status})`);
      const data = (await res.json()) as { configs: SystemConfigItem[] };
      setSettings(data?.configs || []);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '시스템 설정을 불러오지 못했습니다.';
      setSettingsError(message);
      toast.add({ title: '시스템 설정을 불러오지 못했습니다.', color: 'red' });
    } finally {
      setLoadingSettings(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, [loadStats, loadSettings]);

  async function refreshAll() {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadSettings()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function saveSetting(key: string, value: string) {
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.ok) {
        toast.add({ title: `[${key}] 설정이 저장되었습니다.`, color: 'green' });
        setSettings(prev => prev.map(s => (s.key === key ? { ...s, value } : s)));
      } else {
        toast.add({ title: '설정 저장에 실패했습니다.', description: data?.error, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '설정 저장에 실패했습니다.', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setSavingKey(null);
    }
  }

  const statCards = stats
    ? [
        { label: '전체 사용자', value: stats.usersCount ?? '-', color: 'bg-blue-50 text-blue-600', icon: 'user' },
        { label: '이력서', value: stats.resumesCount ?? '-', color: 'bg-emerald-50 text-emerald-600', icon: 'doc' },
        { label: '모의 면접', value: stats.interviewsCount ?? '-', color: 'bg-violet-50 text-violet-600', icon: 'mic' },
        { label: 'ATS 분석', value: stats.atsCount ?? '-', color: 'bg-amber-50 text-amber-600', icon: 'check' },
        { label: '경력', value: stats.careersCount ?? '-', color: 'bg-sky-50 text-sky-600', icon: 'briefcase' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-red-500 uppercase mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">관리자 대시보드</h1>
          <p className="text-sm text-gray-500 mt-1">플랫폼 지표와 시스템 설정을 관리합니다.</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 shrink-0"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'overview', label: '개요' },
          { key: 'settings', label: '시스템 설정' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                    <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                    <Skeleton className="h-7 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 space-y-4">
                <Skeleton className="h-4 w-32" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ) : statsError ? (
            <ErrorState message={statsError} onRetry={loadStats} />
          ) : (
            <>
              <div key={refreshKey} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-in-up">
                {statCards.map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                      {card.icon === 'user' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                      {card.icon === 'doc' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {card.icon === 'mic' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8m-2-11a3 3 0 11-6 0V6a3 3 0 116 0v5z" />
                        </svg>
                      )}
                      {card.icon === 'check' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {card.icon === 'briefcase' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">{card.label}</div>
                  </div>
                ))}
              </div>

              <div key={`table-${refreshKey}`} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">최근 가입 사용자</h2>
                </div>
                {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left">
                      <thead>
                        <tr className="border-b border-gray-50 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          <th className="px-6 py-3">사용자</th>
                          <th className="px-6 py-3">역할</th>
                          <th className="px-6 py-3">가입일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {stats.recentUsers.map(u => (
                          <tr key={u.id} className="transition-colors duration-200 hover:bg-gray-50/70">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                                  {u.name?.[0] || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{u.name || '-'}</p>
                                  <p className="text-xs text-gray-400 truncate">{u.email || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {u.role === 'admin' ? '관리자' : '사용자'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-sm text-gray-500">최근 가입한 사용자가 없습니다.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          {loadingSettings ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 space-y-3">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-4 w-72" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : settingsError ? (
            <ErrorState message={settingsError} onRetry={loadSettings} />
          ) : settings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
              <p className="text-sm text-gray-500">설정된 시스템 설정이 없습니다.</p>
            </div>
          ) : (
            <div key={refreshKey} className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden animate-fade-in-up">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">시스템 설정</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {settings.map(s => (
                  <SettingRow key={s.key} setting={s} onSave={saveSetting} saving={savingKey === s.key} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  onSave,
  saving,
}: {
  setting: SystemConfigItem;
  onSave: (key: string, val: string) => void;
  saving: boolean;
}) {
  const [val, setVal] = useState(setting.value || '');
  return (
    <div className="px-6 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono font-semibold text-gray-800">{setting.key}</p>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
            {CATEGORY_LABELS[setting.category] || setting.category}
          </span>
        </div>
        {setting.description && <p className="text-xs text-gray-400">{setting.description}</p>}
        <input
          type={setting.isEncrypted ? 'password' : 'text'}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        />
      </div>
      <button
        onClick={() => onSave(setting.key, val)}
        disabled={saving || val === setting.value}
        className="shrink-0 mt-6 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      >
        {saving && <Spinner className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
