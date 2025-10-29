import type { ReconciliationReport } from '../types/reconciliationReport';
import { api } from '../config/api';

export const reconciliationReportService = {
  getAll: async (): Promise<ReconciliationReport[]> => {
    const response = await api.get<ReconciliationReport[]>('/reconciliationReports');
    return response.data;
  },

  getById: async (id: string): Promise<ReconciliationReport | null> => {
    try {
      const response = await api.get<ReconciliationReport>(`/reconciliationReports/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (report: Omit<ReconciliationReport, 'id'>): Promise<ReconciliationReport> => {
    const response = await api.post<ReconciliationReport>('/reconciliationReports', {
      ...report,
      reconciledAt: new Date().toISOString(),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/reconciliationReports/${id}`);
  },
};

