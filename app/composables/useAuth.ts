import type { User, AuthResponse } from '../../shared/types';

interface AuthState {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

const authState = reactive<AuthState>({
  user: null,
  authenticated: false,
  loading: false,
  error: null,
});

export function useAuth() {
  async function fetchUser() {
    authState.loading = true;
    authState.error = null;
    
    if (process.client && localStorage.getItem('is_mock_mode') === 'true') {
      try {
        const storedUser = localStorage.getItem('mock_user');
        if (storedUser) {
          authState.user = JSON.parse(storedUser);
          authState.authenticated = true;
          authState.loading = false;
          return;
        }
      } catch {}
    }

    try {
      const data = await $fetch<{ user: User | null }>('/api/auth/me');
      authState.authenticated = !!data.user;
      authState.user = data.user;
    } catch {
      authState.authenticated = false;
      authState.user = null;
    } finally {
      authState.loading = false;
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    authState.loading = true;
    authState.error = null;

    if (email.trim() === 'testmockup' && password === '12345') {
      if (process.client) {
        const randIndex = Math.floor(Math.random() * 50) + 1;
        localStorage.setItem('is_mock_mode', 'true');
        localStorage.setItem('mock_profile_idx', String(randIndex));
        
        const { generateProfiles } = await import('~/data/mock/mockup');
        const profiles = generateProfiles();
        const activeProfile = profiles[randIndex - 1];
        
        const mockUser: User = {
          id: activeProfile.user.id,
          name: activeProfile.user.name,
          email: activeProfile.user.email,
          avatarUrl: activeProfile.user.avatarUrl,
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        // Reset dynamic mock collections in local storage for this session
        localStorage.setItem('mock_resumes', JSON.stringify(activeProfile.resumes));
        localStorage.setItem('mock_careers', JSON.stringify(activeProfile.careers));
        localStorage.setItem('mock_interviews', JSON.stringify(activeProfile.interviews));
        localStorage.setItem('mock_chats', JSON.stringify(activeProfile.interviewChats));
        localStorage.setItem('mock_docs', JSON.stringify(activeProfile.docs));
        localStorage.setItem('mock_qa', JSON.stringify(activeProfile.qaSets));

        authState.user = mockUser;
        authState.authenticated = true;
        authState.loading = false;
        return true;
      }
    }

    try {
      const data = await $fetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      authState.user = data.user;
      authState.authenticated = true;
      return true;
    } catch (err: any) {
      authState.error = err?.data?.statusMessage || err?.message || '로그인에 실패했습니다.';
      return false;
    } finally {
      authState.loading = false;
    }
  }

  async function register(email: string, password: string, name: string): Promise<boolean> {
    authState.loading = true;
    authState.error = null;
    try {
      const data = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: { email, password, name },
      });
      authState.user = data.user;
      authState.authenticated = true;
      return true;
    } catch (err: any) {
      authState.error = err?.data?.statusMessage || err?.message || '회원가입에 실패했습니다.';
      return false;
    } finally {
      authState.loading = false;
    }
  }

  function loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  async function logout() {
    if (process.client && localStorage.getItem('is_mock_mode') === 'true') {
      localStorage.removeItem('is_mock_mode');
      localStorage.removeItem('mock_profile_idx');
      localStorage.removeItem('mock_user');
      localStorage.removeItem('mock_resumes');
      localStorage.removeItem('mock_careers');
      localStorage.removeItem('mock_interviews');
      localStorage.removeItem('mock_chats');
      localStorage.removeItem('mock_docs');
      localStorage.removeItem('mock_qa');
      authState.user = null;
      authState.authenticated = false;
      navigateTo('/auth/login');
      return;
    }

    try {
      await $fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    authState.user = null;
    authState.authenticated = false;
    navigateTo('/auth/login');
  }

  return {
    state: readonly(authState),
    fetchUser,
    login,
    register,
    loginWithGoogle,
    logout,
  };
}
