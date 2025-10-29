import type { Customer, CustomerFormData } from '../types/customer';
import { api } from '../config/api';

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get<Customer[]>('/customers');
    return response.data;
  },

  getById: async (id: string): Promise<Customer | null> => {
    try {
      const response = await api.get<Customer>(`/customers/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: CustomerFormData): Promise<Customer> => {
    const response = await api.post<Customer>('/customers', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: CustomerFormData): Promise<Customer> => {
    const response = await api.put<Customer>(`/customers/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/customers/${id}`);
  },
};

