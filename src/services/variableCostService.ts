import type { VariableCost, VariableCostFormData } from '../types/variableCost';
import { api } from '../config/api';

export const variableCostService = {
  getAll: async (): Promise<VariableCost[]> => {
    const response = await api.get<VariableCost[]>('/variableCosts');
    return response.data;
  },

  getById: async (id: string): Promise<VariableCost | null> => {
    try {
      const response = await api.get<VariableCost>(`/variableCosts/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: VariableCostFormData): Promise<VariableCost> => {
    const response = await api.post<VariableCost>('/variableCosts', data);
    return response.data;
  },

  update: async (id: string, data: VariableCostFormData): Promise<VariableCost> => {
    const response = await api.put<VariableCost>(`/variableCosts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/variableCosts/${id}`);
  },

  getTotalPercentage: async (): Promise<number> => {
    const response = await api.get<VariableCost[]>('/variableCosts');
    return response.data.reduce((sum, cost) => sum + cost.percentage, 0);
  },
};
