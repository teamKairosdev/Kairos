'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';

export default function SettingsPage() {
  const { state, fetchUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [notifications, setNotifications] = useState([
    { key: 'interview', label: '모의 면접 알림', desc: '면접 세션이 완료되면 알림을 받습니다.', value: true },
    { key: 'resume', label: '이력서 분석 완료', desc: 'ATS 분석이 완료되면 알림을 받습니다.', value: true },
    { key: 'marketing', label: '마케팅 및 프로모션', desc: '신기능 출시 및 이벤트 소식을 받습니다.', value: false },
  ]);

  useEffect(() => {
    if (state.user) {
      setName(state.user.name || '');
    }
  }, [state.user]);

  const walletAddress = state.user?.walletAddress || '';

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '프로필이 업데이트되었습니다.', color: 'green' });
      } else {
        toast.add({ title: '업데이트에 실패했습니다.', color: 'red' });
      }
    } catch {
      toast.add({ title: '업데이트에 실패했습니다.', color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  async function connectWallet(type: 'kaikas' | 'metamask') {
    setConnecting(true);
    try {
      let provider: any;
      if (type === 'kaikas') {
        provider = (window as any).klaytn;
      } else {
        const eth = (window as any).ethereum;
        provider = eth?.isMetaMask ? eth : null;
      }
      if (!provider) {
        toast.add({ title: '지갑 확장 프로그램을 찾을 수 없습니다.', color: 'yellow' });
        return;
      }
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0].toLowerCase();
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce, id } = await nonceRes.json();
      const message = `Kairos Sign-In\n${nonce}\n${address}`;
      const signature: `0x${string}` = await provider.request({ method: 'personal_sign', params: [message, address] });
      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature, nonce: id }),
      });
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '지갑이 연결되었습니다.', color: 'green' });
      }
    } catch (err: any) {
      toast.add({ title: '지갑 연결에 실패했습니다.', description: err.message, color: 'red' });
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectWallet() {
    try {
      const res = await fetch('/api/auth/wallet', { method: 'DELETE' });
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '지갑 연결이 해제되었습니다.', color: 'green' });
      }
    } catch {
      toast.add({ title: '오류가 발생했습니다.', color: 'red' });
    }
  }

  function toggleNotification(key: string) {
    setNotifications(prev => prev.map(n => n.key === key ? { ...n, value: !n.value } : n));
  }

  async function deleteAccount() {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch {
      toast.add({ title: '계정 삭제 중 오류가 발생했습니다.', color: 'red' });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Account</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">설정</h1>
        <p className="text-sm text-gray-500 mt-1">프로필, 알림, 계정 설정을 관리합니다.</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">프로필</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">성함</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">이메일</label>
            <input
              type="email"
              value={state.user?.email || ''}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* Wallet */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">연결된 지갑</h2>
        </div>
        <div className="p-6">
          {walletAddress ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  💳
                </div>
                <div>
                  <p className="text-sm font-mono text-gray-900">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-400">Kaikas / MetaMask</p>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                연결 해제
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">연결된 지갑이 없습니다. 지갑을 연결하면 지갑으로 로그인할 수 있습니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => connectWallet('kaikas')}
                  disabled={connecting}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Kaikas 연결
                </button>
                <button
                  onClick={() => connectWallet('metamask')}
                  disabled={connecting}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  MetaMask 연결
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">알림 설정</h2>
        </div>
        <div className="p-6 space-y-4">
          {notifications.map(notif => (
            <div key={notif.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{notif.label}</p>
                <p className="text-xs text-gray-400">{notif.desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(notif.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notif.value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notif.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="text-sm font-semibold text-red-600">위험 구역</h2>
        </div>
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">계정 삭제</p>
            <p className="text-xs text-gray-500 mt-0.5">계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
          </div>
          <button
            onClick={deleteAccount}
            className="shrink-0 px-4 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            계정 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
