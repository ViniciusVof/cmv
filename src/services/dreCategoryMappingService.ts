import type { DRECategoryMapping, DRECategoryMappingFormData } from '../types/dre';
import { api } from '../config/api';
import { categoryService } from './categoryService';

export const dreCategoryMappingService = {
  getAll: async (): Promise<DRECategoryMapping[]> => {
    const [mappings, categories] = await Promise.all([
      api.get<DRECategoryMapping[]>('/dreCategoryMappings').then((r) => r.data),
      categoryService.getAll(),
    ]);

    const categoriesMap = new Map(categories.map((c) => [String(c.id), c.name]));

    return mappings.map((mapping) => ({
      ...mapping,
      categoryName: mapping.categoryId ? categoriesMap.get(String(mapping.categoryId)) || '—' : '—',
    }));
  },

  getById: async (id: string): Promise<DRECategoryMapping | null> => {
    try {
      const response = await api.get<DRECategoryMapping>(`/dreCategoryMappings/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: DRECategoryMappingFormData): Promise<DRECategoryMapping> => {
    const payload: Omit<DRECategoryMapping, 'id'> = {
      accountPayableId: data.accountPayableId,
      accountReceivableId: data.accountReceivableId,
      categoryId: data.categoryId,
      categoryName: '',
      amount: 0,
      description: data.description || '',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Se tem conta a pagar, buscar o valor
    if (data.accountPayableId) {
      try {
        const payable = await api.get(`/accountPayables/${data.accountPayableId}`).then((r) => r.data);
        payload.amount = payable.amount || 0;
        payload.date = payable.dueDate || payload.date;
        payload.description = payable.description || payload.description;
      } catch (error) {
        console.error('Erro ao buscar conta a pagar:', error);
      }
    }

    // Se tem conta a receber, buscar o valor
    if (data.accountReceivableId) {
      try {
        const receivable = await api.get(`/accountReceivables/${data.accountReceivableId}`).then((r) => r.data);
        payload.amount = receivable.amount || 0;
        payload.date = receivable.dueDate || payload.date;
        payload.description = receivable.description || payload.description;
      } catch (error) {
        console.error('Erro ao buscar conta a receber:', error);
      }
    }

    const response = await api.post<DRECategoryMapping>('/dreCategoryMappings', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<DRECategoryMappingFormData>): Promise<DRECategoryMapping> => {
    const current = await dreCategoryMappingService.getById(id);
    if (!current) throw new Error('Mapeamento não encontrado');

    const payload: DRECategoryMapping = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<DRECategoryMapping>(`/dreCategoryMappings/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/dreCategoryMappings/${id}`);
  },
};

