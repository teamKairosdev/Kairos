export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  walletAddress?: string | null;
  role?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  demo?: boolean;
}
