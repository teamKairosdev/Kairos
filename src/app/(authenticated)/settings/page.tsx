'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

interface WalletProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface WindowWithWalletProviders {
  klaytn?: WalletProvider;
  ethereum?: WalletProvider & { isMetaMask?: boolean };
}

const NOTIFICATION_STORAGE_KEY = 'kairos_notification_prefs';

interface NotificationItem {
  key: string;
  label: string;
  desc: string;
  value: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { key: 'interview', label: '모의 면접 알림', desc: '면접 세션이 완료되면 알림을 받습니다.', value: true },
  { key: 'resume', label: '이력서 분석 완료', desc: 'ATS 분석이 완료되면 알림을 받습니다.', value: true },
  { key: 'marketing', label: '마케팅 및 프로모션', desc: '신기능 출시 및 이벤트 소식을 받습니다.', value: false },
];

function loadNotificationPrefs(): NotificationItem[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const saved = JSON.parse(raw) as Record<string, boolean>;
    return DEFAULT_NOTIFICATIONS.map(n => ({ ...n, value: saved[n.key] ?? n.value }));
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export default function SettingsPage() {
  const { state, fetchUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotificationPrefs);
  const deleteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.user) {
      setName(state.user.name || '');
      setOriginalName(state.user.name || '');
    }
  }, [state.user]);

  useEffect(() => {
    if (!showDeleteModal) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDeleteModal();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDeleteModal, deleting]);

  const walletAddress = state.user?.walletAddress || '';

  function openDeleteModal() {
    setConfirmTyped('');
    setShowDeleteModal(true);
    setTimeout(() => deleteInputRef.current?.focus(), 0);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setShowDeleteModal(false);
    setConfirmTyped('');
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '프로필이 업데이트되었습니다.', color: 'green' });
      } else {
        toast.add({ title: '업데이트에 실패했습니다.', description: data?.error, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '업데이트에 실패했습니다.', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  async function connectWallet(type: 'kaikas' | 'metamask') {
    setConnecting(true);
    try {
      let provider: WalletProvider | null = null;
      if (type === 'kaikas') {
        provider = (window as unknown as WindowWithWalletProviders).klaytn ?? null;
      } else {
        const eth = (window as unknown as WindowWithWalletProviders).ethereum;
        provider = eth?.isMetaMask ? eth : null;
      }
      if (!provider) {
        toast.add({ title: '지갑 확장 프로그램을 찾을 수 없습니다.', color: 'yellow' });
        return;
      }
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      const address = accounts[0].toLowerCase();
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce, id } = await nonceRes.json();
      const message = `Kairos Sign-In\n${nonce}\n${address}`;
      const signature = (await provider.request({ method: 'personal_sign', params: [message, address] })) as `0x${string}`;
      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature, nonce: id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '지갑이 연결되었습니다.', color: 'green' });
      } else {
        toast.add({ title: '지갑 연결에 실패했습니다.', description: data?.error, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '지갑 연결에 실패했습니다.', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectWallet() {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/auth/wallet', { method: 'DELETE' });
      if (res.ok) {
        await fetchUser();
        toast.add({ title: '지갑 연결이 해제되었습니다.', color: 'green' });
      } else {
        const data = await res.json().catch(() => null);
        toast.add({ title: '지갑 연결 해제에 실패했습니다.', description: data?.error, color: 'red' });
      }
    } catch (err: unknown) {
      toast.add({ title: '지갑 연결 해제에 실패했습니다.', description: err instanceof Error ? err.message : undefined, color: 'red' });
    } finally {
      setDisconnecting(false);
    }
  }

  function toggleNotification(key: string) {
    const current = notifications.find(n => n.key === key);
    if (!current) return;
    setNotifications(prev => {
      const next = prev.map(n => (n.key === key ? { ...n, value: !n.value } : n));
      try {
        localStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(Object.fromEntries(next.map(n => [n.key, n.value])))
        );
      } catch {}
      return next;
    });
    toast.add({
      title: current.value ? `${current.label} 알림이 꺼졌습니다.` : `${current.label} 알림이 켜졌습니다.`,
      color: current.value ? 'neutral' : 'green',
    });
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        toast.add({ title: '계정이 삭제되었습니다.', color: 'green' });
        window.location.href = '/';
      } else {
        toast.add({ title: '계정 삭제에 실패했습니다.', description: data?.error, color: 'red' });
        setDeleting(false);
      }
    } catch (err: unknown) {
      toast.add({ title: '계정 삭제 중 오류가 발생했습니다.', description: err instanceof Error ? err.message : undefined, color: 'red' });
      setDeleting(false);
    }
  }

  const nameChanged = name.trim() !== originalName;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Account</p>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">설정</h1>
        <p className="text-sm text-gray-500 mt-1">프로필, 알림, 계정 설정을 관리합니다.</p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">프로필</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-semibold text-gray-500 mb-1.5">성함</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-xs font-semibold text-gray-500 mb-1.5">이메일</label>
            <input
              id="profile-email"
              type="email"
              value={state.user?.email || ''}
              readOnly
              className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving || !nameChanged || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {saving && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? '저장 중...' : '저장'}
            </button>
            {nameChanged && <span className="text-xs text-gray-400">변경사항이 있습니다.</span>}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">연결된 지갑</h2>
        </div>
        <div className="p-6">
          {walletAddress ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  지갑
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
                disabled={disconnecting}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {disconnecting && <Spinner className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
                {disconnecting ? '해제 중...' : '연결 해제'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">연결된 지갑이 없습니다. 지갑을 연결하면 지갑으로 로그인할 수 있습니다.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => connectWallet('kaikas')}
                  disabled={connecting}
                  className="px-4 py-2.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Kaikas 연결
                </button>
                <button
                  onClick={() => connectWallet('metamask')}
                  disabled={connecting}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  MetaMask 연결
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
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
                role="switch"
                aria-checked={notif.value}
                aria-label={notif.label}
                onClick={() => toggleNotification(notif.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
                  notif.value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    notif.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-red-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100">
          <h2 className="text-sm font-semibold text-red-600">위험 구역</h2>
        </div>
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">계정 삭제</p>
            <p className="text-xs text-gray-500 mt-0.5">계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.</p>
          </div>
          <button
            onClick={openDeleteModal}
            className="shrink-0 px-4 py-2.5 text-xs font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            계정 삭제
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && closeDeleteModal()}
        >
          <div className="bg-white rounded-2xl shadow-lift w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <h2 id="delete-account-title" className="text-lg font-bold text-red-600">계정 삭제</h2>
            <p className="text-sm text-gray-500">
              계정을 삭제하면 모든 데이터가 <span className="font-semibold text-gray-800">영구적으로 삭제</span>되며
              복구할 수 없습니다.
            </p>
            <div>
              <label htmlFor="delete-confirm-input" className="block text-xs font-semibold text-gray-500 mb-1.5">
                확인을 위해 <span className="text-red-500 font-bold">삭제</span>를 입력하세요
              </label>
              <input
                id="delete-confirm-input"
                ref={deleteInputRef}
                type="text"
                value={confirmTyped}
                onChange={e => setConfirmTyped(e.target.value)}
                placeholder="삭제"
                disabled={deleting}
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:bg-gray-50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
              >
                취소
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting || confirmTyped.trim() !== '삭제'}
                className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors duration-200 disabled:opacity-40 inline-flex items-center justify-center gap-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {deleting && <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? '삭제 중...' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
