import type { PdvProduct, PdvProductFormData } from '../types/pdvProduct';
import { api } from '../config/api';

export const pdvProductService = {
  getAll: async (): Promise<PdvProduct[]> => {
    const response = await api.get<PdvProduct[]>('/pdvProducts');
    return response.data;
  },

  getById: async (id: string): Promise<PdvProduct | null> => {
    try {
      const response = await api.get<PdvProduct>(`/pdvProducts/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: PdvProductFormData): Promise<PdvProduct> => {
    // Generate code automatically if not provided
    let code = data.code;
    if (!code) {
      const all = await pdvProductService.getAll();
      if (all.length === 0) {
        code = '1';
      } else {
        const codes = all.map((p) => parseInt(p.code)).filter((code) => !isNaN(code));
        const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
        code = (maxCode + 1).toString();
      }
    }

    const response = await api.post<PdvProduct>('/pdvProducts', {
      ...data,
      code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: PdvProductFormData): Promise<PdvProduct> => {
    const response = await api.put<PdvProduct>(`/pdvProducts/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/pdvProducts/${id}`);
  },
};

