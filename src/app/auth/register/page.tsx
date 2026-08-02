'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none disabled:bg-gray-50 disabled:text-gray-400';

function getStrengthLabel(password: string) {
  const hasLetter = /[a-zA-Z가-힣]/.test(password);
  const hasDigit = /\d/.test(password);
  const lengthOk = password.length >= 8;
  const score = [lengthOk, hasLetter, hasDigit].filter(Boolean).length;
  if (score === 0) return { label: '', color: '' };
  if (score === 1) return { label: '약함', color: 'bg-red-500' };
  if (score === 2) return { label: '보통', color: 'bg-amber-500' };
  return { label: '안전', color: 'bg-emerald-500' };
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const { state, register } = useAuth();
  const router = useRouter();

  const strength = useMemo(() => getStrengthLabel(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const displayError = localError || state.error || '';

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = name.trim().length > 0 && emailValid && password.length >= 8 && !passwordMismatch;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!canSubmit) {
      setLocalError('입력 정보를 다시 확인해주세요.');
      return;
    }
    setLoading(true);
    setLocalError('');
    try {
      const success = await register(email, password, name);
      if (success) {
        router.push('/');
      }
    } catch {
      setLocalError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kairos 회원가입</h1>
            <p className="text-xs text-gray-400 font-medium">새로운 AI 커리어 여정을 시작하세요</p>
          </div>

          <form onSubmit={handleRegister} className="relative space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-xs font-bold text-gray-500 mb-1.5">
                이름
              </label>
              <input
                id="register-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                placeholder="홍길동"
                aria-invalid={!!displayError}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-xs font-bold text-gray-500 mb-1.5">
                이메일 주소
              </label>
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                placeholder="name@example.com"
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'register-error' : undefined}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-xs font-bold text-gray-500 mb-1.5">
                비밀번호
              </label>
              <input
                id="register-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="8자 이상, 영문/숫자 조합"
                aria-invalid={passwordMismatch || !!displayError}
                className={inputClass}
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(password.length / 20) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{strength.label}</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[10px] font-medium">
                    <li className={password.length >= 8 ? 'text-emerald-600' : 'text-gray-400'}>
                      {password.length >= 8 ? '✓' : '○'} 8자 이상
                    </li>
                    <li className={/[a-zA-Z가-힣]/.test(password) ? 'text-emerald-600' : 'text-gray-400'}>
                      {/[a-zA-Z가-힣]/.test(password) ? '✓' : '○'} 영문 또는 한글 포함
                    </li>
                    <li className={/\d/.test(password) ? 'text-emerald-600' : 'text-gray-400'}>
                      {/\d/.test(password) ? '✓' : '○'} 숫자 포함
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="register-confirm" className="block text-xs font-bold text-gray-500 mb-1.5">
                비밀번호 확인
              </label>
              <input
                id="register-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
                placeholder="비밀번호를 한 번 더 입력하세요"
                aria-invalid={passwordMismatch || !!displayError}
                className={`${inputClass} ${passwordMismatch ? 'border-red-300 bg-red-50/50' : ''}`}
              />
              {passwordMismatch && (
                <p className="mt-1.5 text-[10px] font-medium text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {displayError && (
              <div
                id="register-error"
                role="alert"
                className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium"
              >
                {displayError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-md shadow-blue-600/20 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:outline-none"
            >
              {loading ? (
                <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? '가입 중...' : '회원가입 완료'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            이미 계정이 있으신가요?
            <Link
              href="/auth/login"
              className="text-blue-600 font-semibold hover:underline ml-1 transition-colors"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
