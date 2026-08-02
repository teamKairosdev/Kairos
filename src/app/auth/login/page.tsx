'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';

const isDev = process.env.NODE_ENV !== 'production';

interface EthereumProvider {
  isMetaMask?: boolean;
  request: <T = unknown>(args: { method: string; params?: unknown[] }) => Promise<T>;
}

type WalletProvider = EthereumProvider | null | undefined;

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none disabled:bg-gray-50 disabled:text-gray-400';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const { state, login, loginWithGoogle } = useAuth();
  const router = useRouter();

  const displayError = localError || state.error || '';
  const formDisabled = loading || walletLoading || socialLoading;

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLocalError('');
    try {
      const success = await login(email, password);
      if (success) {
        router.push('/');
      }
    } catch {
      setLocalError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function fillMockCredentials() {
    if (loading) return;
    setEmail('testmockup');
    setPassword('12345');
    setLoading(true);
    setLocalError('');
    try {
      const success = await login('testmockup', '12345');
      if (success) {
        router.push('/');
      }
    } catch {
      setLocalError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    setSocialLoading(true);
    loginWithGoogle();
  }

  async function connectWallet(getProvider: () => WalletProvider, networkName: string) {
    setWalletLoading(true);
    setLocalError('');
    try {
      const provider = getProvider();
      if (!provider) {
        setLocalError(`${networkName} 지갑을 찾을 수 없습니다.`);
        return;
      }
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0].toLowerCase();
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce, id } = await nonceRes.json();
      const message = `Kairos Sign-In\n${nonce}\n${address}`;
      const signature: `0x${string}` = await provider.request({
        method: 'personal_sign',
        params: [message, address],
      });
      const walletRes = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature, nonce: id }),
      });
      if (walletRes.ok) {
        router.push('/');
      } else {
        setLocalError('지갑 로그인 인증에 실패했습니다.');
      }
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: unknown }).message
          : undefined;
      setLocalError(typeof msg === 'string' && msg ? msg : '지갑 연동 오류가 발생했습니다.');
    } finally {
      setWalletLoading(false);
    }
  }

  function connectKaikas() {
    connectWallet(() => (window as unknown as { klaytn?: EthereumProvider }).klaytn, 'Kaikas');
  }

  function connectMetaMask() {
    connectWallet(() => {
      const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
      return eth?.isMetaMask ? eth : null;
    }, 'MetaMask');
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center px-4 py-8 sm:py-12 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900">
      <div className="w-full max-w-sm animate-fade-in-up motion-reduce:animate-none">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card space-y-6 relative overflow-hidden border border-gray-100">
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-100/30 blur-[30px] rounded-full pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-indigo-100/30 blur-[30px] rounded-full pointer-events-none" />

          <div className="relative text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto mb-3 shadow-lg shadow-blue-600/30">
              K
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kairos 로그인</h1>
            <p className="text-xs text-gray-400 font-medium">개인 맞춤형 AI 커리어 어시스턴트</p>
          </div>

          {isDev && (
            <div className="relative p-3 bg-blue-50 rounded-2xl border border-blue-100/50 text-left space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <span>💡</span>
                <span>테스트 모드 (Mock 체험)</span>
              </div>
              <p className="text-[10px] text-blue-600 font-medium leading-relaxed">
                아이디: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">testmockup</code> / 비번: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">12345</code>
              </p>
              <button
                type="button"
                onClick={fillMockCredentials}
                disabled={formDisabled}
                className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all duration-200 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
              >
                간편 로그인으로 바로 시작하기
              </button>
            </div>
          )}

          <form onSubmit={handleLogin} className="relative space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-gray-500 mb-1.5">
                아이디 (또는 이메일)
              </label>
              <input
                id="login-email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={formDisabled}
                placeholder="아이디 또는 이메일을 입력하세요"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'login-error' : undefined}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-gray-500 mb-1.5">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={formDisabled}
                placeholder="••••••••"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'login-error' : undefined}
                className={inputClass}
              />
            </div>

            {displayError && (
              <div
                id="login-error"
                role="alert"
                className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium"
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={formDisabled}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              {loading ? (
                <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">또는</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={formDisabled}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:text-gray-900 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {socialLoading ? 'Google 로그인 중...' : 'Google로 로그인'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] uppercase font-bold tracking-wider text-gray-400">지갑 로그인</span></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={connectKaikas}
              disabled={formDisabled}
              className="py-3.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              {walletLoading ? '연결 중...' : 'Kaikas'}
            </button>
            <button
              onClick={connectMetaMask}
              disabled={formDisabled}
              className="py-3.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              MetaMask
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            계정이 없으신가요?
            <Link
              href="/auth/register"
              className="text-blue-600 font-semibold hover:underline ml-1 transition-colors"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
