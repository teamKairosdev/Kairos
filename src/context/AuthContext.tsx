'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, AuthResponse } from '../../shared/types';

interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue {
  state: AuthState;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    authenticated: false,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (typeof window !== 'undefined' && localStorage.getItem('is_mock_mode') === 'true') {
      try {
        const storedUser = localStorage.getItem('mock_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setState({ user, authenticated: true, loading: false, error: null });
          return;
        }
      } catch {}
    }

    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Not authenticated');
      const data = await res.json() as { user: User | null };
      setState({ user: data.user, authenticated: !!data.user, loading: false, error: null });
    } catch {
      setState({ user: null, authenticated: false, loading: false, error: null });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    if (email.trim() === 'testmockup' && password === '12345') {
      if (typeof window !== 'undefined') {
        const randIndex = Math.floor(Math.random() * 50) + 1;
        localStorage.setItem('is_mock_mode', 'true');
        localStorage.setItem('mock_profile_idx', String(randIndex));

        const { generateProfiles } = await import('../data/mock/mockup');
        const profiles = generateProfiles();
        const activeProfile = profiles[randIndex - 1];

        const mockUser: User = {
          id: activeProfile.user.id,
          name: activeProfile.user.name,
          email: activeProfile.user.email,
          avatarUrl: activeProfile.user.avatarUrl,
        };

        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_resumes', JSON.stringify(activeProfile.resumes));
        localStorage.setItem('mock_careers', JSON.stringify(activeProfile.careers));
        localStorage.setItem('mock_interviews', JSON.stringify(activeProfile.interviews));
        localStorage.setItem('mock_chats', JSON.stringify(activeProfile.interviewChats));
        localStorage.setItem('mock_docs', JSON.stringify(activeProfile.docs));
        localStorage.setItem('mock_qa', JSON.stringify(activeProfile.qaSets));

        setState({ user: mockUser, authenticated: true, loading: false, error: null });
        return true;
      }
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string; statusMessage?: string };
        const message = err?.error || err?.statusMessage || '로그인에 실패했습니다.';
        setState(prev => ({ ...prev, loading: false, error: message }));
        return false;
      }

      const data = await res.json() as AuthResponse;
      setState({ user: data.user, authenticated: true, loading: false, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '로그인 오류';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setState(prev => ({ ...prev, loading: false, error: err?.error || '회원가입 실패' }));
        return false;
      }
      const data = await res.json() as AuthResponse;
      setState({ user: data.user, authenticated: true, loading: false, error: null });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입 오류';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = '/api/auth/google';
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== 'undefined' && localStorage.getItem('is_mock_mode') === 'true') {
      ['is_mock_mode', 'mock_profile_idx', 'mock_user', 'mock_resumes', 'mock_careers',
       'mock_interviews', 'mock_chats', 'mock_docs', 'mock_qa'].forEach(k => localStorage.removeItem(k));
      setState({ user: null, authenticated: false, loading: false, error: null });
      window.location.href = '/auth/login';
      return;
    }
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setState({ user: null, authenticated: false, loading: false, error: null });
    window.location.href = '/auth/login';
  }, []);

  useEffect(() => {
    fetchUser();
    // Force light mode
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      html.classList.remove('dark');
      html.classList.add('light');
    }
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ state, fetchUser, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
