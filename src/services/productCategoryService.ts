import type { ProductCategory, ProductCategoryFormData } from '../types/productCategory';
import { api } from '../config/api';

export const productCategoryService = {
  getAll: async (): Promise<ProductCategory[]> => {
    const response = await api.get<ProductCategory[]>('/productCategories');
    return response.data;
  },

  getById: async (id: string): Promise<ProductCategory | null> => {
    try {
      const response = await api.get<ProductCategory>(`/productCategories/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: ProductCategoryFormData): Promise<ProductCategory> => {
    const response = await api.post<ProductCategory>('/productCategories', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: ProductCategoryFormData): Promise<ProductCategory> => {
    const response = await api.put<ProductCategory>(`/productCategories/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/productCategories/${id}`);
  },
};

