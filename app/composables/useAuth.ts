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
    try {
      const data = await $fetch<{ authenticated: boolean; user: User }>('/api/auth/me');
      authState.authenticated = data.authenticated;
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

  function logout() {
    authState.user = null;
    authState.authenticated = false;
    navigateTo('/auth/login');
  }

  return {
    state: readonly(authState),
    fetchUser,
    login,
    register,
    logout,
  };
}
