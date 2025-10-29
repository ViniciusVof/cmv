import type { LoginCredentials, User } from '../types/auth';
import { api } from '../config/api';

interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // In a real API, this would be a POST to /auth/login
    // For now, we'll query the users and match credentials
    const response = await api.get<Array<{ id: string; name: string; email: string; password: string; role: string }>>('/users');
    const users = response.data;
    
    const user = users.find((u) => u.email === credentials.email);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // In production, password would be validated on backend (never send plain password)
    if (credentials.password !== user.password) {
      throw new Error('Senha incorreta');
    }

    // Transform to User type and generate token
    const userResponse: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'admin',
    };

    return {
      user: userResponse,
      token: `mock-token-${user.id}-${Date.now()}`,
    };
  },

  logout: async (): Promise<void> => {
    // In production, this would invalidate the token on backend
    // For now, just resolve
    return Promise.resolve();
  },
};
