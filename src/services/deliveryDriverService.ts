import type { DeliveryDriver, DeliveryDriverFormData } from '../types/deliveryDriver';
import { api } from '../config/api';

export const deliveryDriverService = {
  getAll: async (): Promise<DeliveryDriver[]> => {
    const response = await api.get<DeliveryDriver[]>('/deliveryDrivers');
    return response.data;
  },

  getById: async (id: string): Promise<DeliveryDriver | null> => {
    try {
      const response = await api.get<DeliveryDriver>(`/deliveryDrivers/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: DeliveryDriverFormData): Promise<DeliveryDriver> => {
    const response = await api.post<DeliveryDriver>('/deliveryDrivers', {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  update: async (id: string, data: DeliveryDriverFormData): Promise<DeliveryDriver> => {
    const response = await api.put<DeliveryDriver>(`/deliveryDrivers/${id}`, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/deliveryDrivers/${id}`);
  },
};

