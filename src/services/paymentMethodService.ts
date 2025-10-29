import type { PaymentMethod, PaymentMethodFormData } from '../types/paymentMethod';
import { api } from '../config/api';

export const paymentMethodService = {
  getAll: async (): Promise<PaymentMethod[]> => {
    const response = await api.get<PaymentMethod[]>('/paymentMethods');
    return response.data;
  },

  getById: async (id: string): Promise<PaymentMethod | null> => {
    try {
      const response = await api.get<PaymentMethod>(`/paymentMethods/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: PaymentMethodFormData): Promise<PaymentMethod> => {
    const response = await api.post<PaymentMethod>('/paymentMethods', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: PaymentMethodFormData): Promise<PaymentMethod> => {
    const response = await api.put<PaymentMethod>(`/paymentMethods/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/paymentMethods/${id}`);
  },
};

