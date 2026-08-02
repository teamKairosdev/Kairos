'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/lib/toast';
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
  totalUsers?: number;
  totalResumes?: number;
  totalInterviews?: number;
  totalAts?: number;
  recentUsers?: AdminRecentUser[];
}

export default function AdminPage() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<SystemConfigItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).then(d => { setStats(d); setLoadingStats(false); }).catch(() => setLoadingStats(false));
    fetch('/api/admin/settings').then(r => r.ok ? r.json() : []).then(d => { setSettings(d || []); setLoadingSettings(false); }).catch(() => setLoadingSettings(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast.add({ title: 'Setting saved', color: 'green' });
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      }
    } catch (err: unknown) {
      toast.add({ title: 'Error', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers ?? '-', icon: 'U', color: 'bg-blue-50 text-blue-600' },
    { label: 'Resumes', value: stats.totalResumes ?? '-', icon: 'R', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Interviews', value: stats.totalInterviews ?? '-', icon: 'I', color: 'bg-violet-50 text-violet-600' },
    { label: 'ATS Analyses', value: stats.totalAts ?? '-', icon: 'A', color: 'bg-amber-50 text-amber-600' },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-red-500 uppercase mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform metrics and system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['overview', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black mb-3 ${card.color}`}>
                      {card.icon}
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
                    <div className="text-xs text-gray-400 font-medium mt-0.5">{card.label}</div>
                  </div>
                ))}
              </div>

              {stats?.recentUsers && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Recent Users</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {stats.recentUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-4 px-6 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                          {u.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {u.role}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          {loadingSettings ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : settings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
              <p className="text-sm text-gray-500">No system settings configured</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">System Settings</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {settings.map(s => (
                  <SettingRow key={s.key} setting={s} onSave={saveSetting} saving={saving} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingRow({ setting, onSave, saving }: { setting: SystemConfigItem; onSave: (key: string, val: string) => void; saving: boolean }) {
  const [val, setVal] = useState(setting.value || '');
  return (
    <div className="px-6 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono font-semibold text-gray-800">{setting.key}</p>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">{setting.category}</span>
        </div>
        {setting.description && <p className="text-xs text-gray-400">{setting.description}</p>}
        <input
          type={setting.isEncrypted ? 'password' : 'text'}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        onClick={() => onSave(setting.key, val)}
        disabled={saving || val === setting.value}
        className="shrink-0 mt-6 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}