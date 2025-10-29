import type { FixedCost, FixedCostFormData } from '../types/fixedCost';
import { api } from '../config/api';

// Calculate percentages based on total
const calculatePercentages = (costs: FixedCost[]): FixedCost[] => {
  const total = costs.reduce((sum, cost) => sum + cost.value, 0);
  return costs.map((cost) => ({
    ...cost,
    percentage: total > 0 ? (cost.value / total) * 100 : 0,
  }));
};

export const fixedCostService = {
  getAll: async (): Promise<FixedCost[]> => {
    const response = await api.get<FixedCost[]>('/fixedCosts');
    return calculatePercentages(response.data);
  },

  getById: async (id: string): Promise<FixedCost | null> => {
    try {
      const response = await api.get<FixedCost>(`/fixedCosts/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: FixedCostFormData): Promise<FixedCost> => {
    const response = await api.post<FixedCost>('/fixedCosts', data);
    return response.data;
  },

  update: async (id: string, data: FixedCostFormData): Promise<FixedCost> => {
    const response = await api.put<FixedCost>(`/fixedCosts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/fixedCosts/${id}`);
  },

  getTotal: async (): Promise<number> => {
    const response = await api.get<FixedCost[]>('/fixedCosts');
    return response.data.reduce((sum, cost) => sum + cost.value, 0);
  },
};
