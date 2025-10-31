import type { Category, CategoryFormData, CategoryType } from '../types/category';
import { api } from '../config/api';

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getById: async (id: string): Promise<Category | null> => {
    try {
      const response = await api.get<Category>(`/categories/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const payload: Omit<Category, 'id'> = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const response = await api.post<Category>('/categories', payload);
    return response.data;
  },

  update: async (id: string, data: CategoryFormData): Promise<Category> => {
    const payload: Category = {
      ...(await categoryService.getById(id))!,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const response = await api.put<Category>(`/categories/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  getByType: async (type: CategoryType): Promise<Category[]> => {
    const all = await categoryService.getAll();
    return all.filter((cat) => cat.type === type && cat.isActive);
  },
};

