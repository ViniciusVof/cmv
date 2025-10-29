import type { Supplier, SupplierFormData } from '../types/supplier';
import { api } from '../config/api';

export const supplierService = {
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get<Supplier[]>('/suppliers');
    return response.data;
  },

  getById: async (id: string): Promise<Supplier | null> => {
    try {
      const response = await api.get<Supplier>(`/suppliers/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: SupplierFormData): Promise<Supplier> => {
    const response = await api.post<Supplier>('/suppliers', data);
    return response.data;
  },

  update: async (id: string, data: SupplierFormData): Promise<Supplier> => {
    const response = await api.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};

