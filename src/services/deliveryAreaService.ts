import type { DeliveryArea, DeliveryAreaFormData } from '../types/deliveryArea';
import { api } from '../config/api';

export const deliveryAreaService = {
  getAll: async (): Promise<DeliveryArea[]> => {
    const response = await api.get<DeliveryArea[]>('/deliveryAreas');
    return response.data;
  },

  getById: async (id: string): Promise<DeliveryArea | null> => {
    try {
      const response = await api.get<DeliveryArea>(`/deliveryAreas/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: DeliveryAreaFormData): Promise<DeliveryArea> => {
    const response = await api.post<DeliveryArea>('/deliveryAreas', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: DeliveryAreaFormData): Promise<DeliveryArea> => {
    const response = await api.put<DeliveryArea>(`/deliveryAreas/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/deliveryAreas/${id}`);
  },
};

