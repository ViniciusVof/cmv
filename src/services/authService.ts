import type { LoginCredentials, User } from '../types/auth';

// Mock de usuário admin
const mockAdminUser: User = {
  id: '1',
  name: 'Administrador',
  email: 'admin@system.com',
  role: 'admin',
};

interface LoginResponse {
  user: User;
  token: string;
}

// Simulação de delay de API
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    // Simula chamada à API
    await delay(1000);

    // Validação simples - apenas admin permitido
    if (credentials.email !== mockAdminUser.email) {
      throw new Error('Usuário não encontrado');
    }

    // Em produção, a senha seria validada no backend
    if (credentials.password !== '123456') {
      throw new Error('Senha incorreta');
    }

    return {
      user: mockAdminUser,
      token: `mock-token-${mockAdminUser.id}-${Date.now()}`,
    };
  },

  logout: async (): Promise<void> => {
    await delay(500);
    // Em produção, invalidaria o token no backend
  },
};

