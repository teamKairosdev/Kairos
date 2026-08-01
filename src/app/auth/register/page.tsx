'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/Spinner';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const success = await register(email, password, name);
      if (success) {
        router.push('/');
      } else {
        setErrorMsg('회원가입 처리 중 오류가 발생했습니다.');
      }
    } catch {
      setErrorMsg('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white/90 backdrop-blur-xl border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-100/60 space-y-6 relative overflow-hidden">
          <div className="relative text-center space-y-2">
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center font-black text-white text-lg mx-auto mb-3">
              K
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kairos 회원가입</h1>
            <p className="text-xs text-gray-400 font-medium">새로운 AI 커리어 여정을 시작하세요</p>
          </div>

          <form onSubmit={handleRegister} className="relative space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">이름</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">이메일 주소</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>

            {errorMsg && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 hover:shadow-md hover:shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Spinner className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? '가입 중...' : '회원가입 완료'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            이미 계정이 있으신가요?
            <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline ml-1">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
