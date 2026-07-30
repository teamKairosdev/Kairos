export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  user: User;
  token?: string;
  demo?: boolean;
}
