import type { DREAdjustment, DREAdjustmentFormData } from '../types/dreAdjustment';
import { api } from '../config/api';

const generatePeriodKey = (fromDate: string, toDate: string): string => {
  return `${fromDate}_${toDate}`;
};

export const dreAdjustmentService = {
  getAll: async (): Promise<DREAdjustment[]> => {
    try {
      const response = await api.get<DREAdjustment[]>('/dreAdjustments');
      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  getByPeriod: async (fromDate: string, toDate: string): Promise<DREAdjustment[]> => {
    const all = await dreAdjustmentService.getAll();
    const periodKey = generatePeriodKey(fromDate, toDate);
    return all.filter((adj) => adj.periodKey === periodKey);
  },

  getByItem: async (
    fromDate: string,
    toDate: string,
    itemName: string,
    itemType: 'revenue' | 'expense'
  ): Promise<DREAdjustment | null> => {
    const adjustments = await dreAdjustmentService.getByPeriod(fromDate, toDate);
    return (
      adjustments.find(
        (adj) => adj.itemName === itemName && adj.itemType === itemType
      ) || null
    );
  },

  create: async (
    fromDate: string,
    toDate: string,
    originalAmount: number,
    data: DREAdjustmentFormData
  ): Promise<DREAdjustment> => {
    const periodKey = generatePeriodKey(fromDate, toDate);
    
    // Verificar se já existe um ajuste para este item neste período
    const existing = await dreAdjustmentService.getByItem(
      fromDate,
      toDate,
      data.itemName,
      data.itemType
    );

    if (existing) {
      // Atualizar ajuste existente
      return dreAdjustmentService.update(existing.id, {
        ...data,
        adjustedAmount: data.adjustedAmount,
        notes: data.notes,
      });
    }

    const adjustment: Omit<DREAdjustment, 'id'> = {
      periodKey,
      itemType: data.itemType,
      itemName: data.itemName,
      categoryId: data.categoryId,
      originalAmount,
      adjustedAmount: data.adjustedAmount,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await api.post<DREAdjustment>('/dreAdjustments', adjustment);
    return response.data;
  },

  update: async (id: string, data: Partial<DREAdjustmentFormData>): Promise<DREAdjustment> => {
    const current = await api.get<DREAdjustment>(`/dreAdjustments/${id}`).then(r => r.data);
    
    const updated: DREAdjustment = {
      ...current,
      ...data,
      adjustedAmount: data.adjustedAmount !== undefined ? data.adjustedAmount : current.adjustedAmount,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<DREAdjustment>(`/dreAdjustments/${id}`, updated);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/dreAdjustments/${id}`);
  },

  deleteByPeriod: async (fromDate: string, toDate: string): Promise<void> => {
    const adjustments = await dreAdjustmentService.getByPeriod(fromDate, toDate);
    await Promise.all(adjustments.map((adj) => dreAdjustmentService.delete(adj.id)));
  },
};

