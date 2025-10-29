import type { BusinessSettings, BusinessSettingsFormData } from '../types/businessSettings';
import { api } from '../config/api';

export const businessSettingsService = {
  get: async (): Promise<BusinessSettings> => {
    try {
      const response = await api.get<BusinessSettings[]>('/businessSettings');
      if (response.data.length > 0) {
        return response.data[0];
      }
      // Return default settings if none exist
      return {
        id: '1',
        markup: 3.0,
        ifoodTaxPercentage: 15.2,
        costCalculationMethod: 'current',
      };
    } catch (error) {
      // Return default settings on error
      return {
        id: '1',
        markup: 3.0,
        ifoodTaxPercentage: 15.2,
        costCalculationMethod: 'current',
      };
    }
  },

  update: async (data: BusinessSettingsFormData): Promise<BusinessSettings> => {
    const existing = await businessSettingsService.get();
    const response = await api.put<BusinessSettings>(`/businessSettings/${existing.id}`, {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  create: async (data: BusinessSettingsFormData): Promise<BusinessSettings> => {
    const response = await api.post<BusinessSettings>('/businessSettings', {
      id: '1',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },
};

