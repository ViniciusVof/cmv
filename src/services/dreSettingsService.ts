import type { DRESettings, DRESettingsFormData } from '../types/dreSettings';
import { api } from '../config/api';

export const dreSettingsService = {
  get: async (): Promise<DRESettings> => {
    try {
      const response = await api.get<DRESettings[]>('/dreSettings');
      if (response.data.length > 0) {
        return response.data[0];
      }
      // Return default settings if none exist
      return {
        id: '1',
        useAutomaticPDVValues: true, // Por padrão, usa valores automáticos
        useConfiguredFixedValues: true, // Por padrão, usa valores fixos configurados
      };
    } catch (error) {
      // Return default settings on error
      return {
        id: '1',
        useAutomaticPDVValues: true,
        useConfiguredFixedValues: true,
      };
    }
  },

  update: async (data: DRESettingsFormData): Promise<DRESettings> => {
    const existing = await dreSettingsService.get();
    const response = await api.put<DRESettings>(`/dreSettings/${existing.id}`, {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },

  create: async (data: DRESettingsFormData): Promise<DRESettings> => {
    const response = await api.post<DRESettings>('/dreSettings', {
      id: '1',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },
};

