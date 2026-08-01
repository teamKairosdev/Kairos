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
    { key: 'interview', label: '모의 면접 ?�림', desc: '면접 ?�션???�료?�면 ?�림??받습?�다.', value: true },
    { key: 'resume', label: '?�력??분석 ?�료', desc: 'ATS 분석???�료?�면 ?�림??받습?�다.', value: true },
    { key: 'marketing', label: '마�???�??�로모션', desc: '?�기??출시 �??�벤???�식??받습?�다.', value: false },
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
        toast.add({ title: '?�로?�이 ?�?�되?�습?�다.', color: 'green' });
      } else {
        toast.add({ title: '?�?�에 ?�패?�습?�다.', color: 'red' });
      }
    } catch {
      toast.add({ title: '?�?�에 ?�패?�습?�다.', color: 'red' });
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
        toast.add({ title: '지�??�장 ?�로그램??찾을 ???�습?�다.', color: 'yellow' });
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
        toast.add({ title: '지갑이 ?�결?�었?�니??', color: 'green' });
      }
    } catch (err: any) {
      toast.add({ title: '지�??�결???�패?�습?�다.', description: err.message, color: 'red' });
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectWallet() {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: null }),
      });
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '지�??�결???�제?�었?�니??', color: 'green' });
      }
    } catch {
      toast.add({ title: '?�결 ?�제???�패?�습?�다.', color: 'red' });
    }
  }

  function confirmDelete() {
    toast.add({ title: '계정 ??�� 기능?� 준�?중입?�다.', color: 'yellow' });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">?�정</h1>
        <p className="text-sm text-gray-500 mt-1">?�로?? ?�림, 계정 ?�정??관리합?�다.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">?�로??/h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">?�함</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="?�길??
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">?�메??/label>
            <input
              type="email"
              value={state.user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '?�??�?..' : '?�??}
          </button>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">?�결??지�?/h2>
        </div>
        <div className="p-6">
          {walletAddress ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  ?��
                </div>
                <div>
                  <p className="text-sm font-mono text-gray-900">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                  </p>
                  <p className="text-xs text-gray-400">Kaikas / MetaMask</p>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                ?�결 ?�제
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">?�결??지갑이 ?�습?�다. 지갑을 ?�결?�면 지갑으�?로그?�할 ???�습?�다.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => connectWallet('kaikas')}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  Kaikas ?�결
                </button>
                <button
                  onClick={() => connectWallet('metamask')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  MetaMask ?�결
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">?�림 ?�정</h2>
        </div>
        <div className="p-6 space-y-4">
          {notifications.map((notif, index) => (
            <div key={notif.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{notif.label}</p>
                <p className="text-xs text-gray-400">{notif.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = [...notifications];
                  updated[index].value = !updated[index].value;
                  setNotifications(updated);
                }}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  notif.value ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    notif.value ? 'translate-x-5' : 'translate-x-0'
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
          <h2 className="text-sm font-semibold text-red-600">?�험 구역</h2>
        </div>
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">계정 ??��</p>
            <p className="text-xs text-gray-500 mt-0.5">계정????��?�면 모든 ?�이?��? ?�구?�으�???��?�며 복구?????�습?�다.</p>
          </div>
          <button
            onClick={confirmDelete}
            className="shrink-0 px-4 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            계정 ??��
          </button>
        </div>
      </div>
    </div>
  );
}
