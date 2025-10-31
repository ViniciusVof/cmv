import type { AccountPayable, AccountPayableFormData } from '../types/accountPayable';
import { api } from '../config/api';
import { supplierService } from './supplierService';

export const accountPayableService = {
  getAll: async (): Promise<AccountPayable[]> => {
    const [payables, suppliers] = await Promise.all([
      api.get<AccountPayable[]>('/accountPayables').then(r => r.data),
      supplierService.getAll(),
    ]);

    const suppliersMap = new Map(suppliers.map(s => [String(s.id), s.name]));

    return payables.map(payable => ({
      ...payable,
      supplierName: payable.supplierId ? suppliersMap.get(String(payable.supplierId)) : undefined,
    }));
  },

  getById: async (id: string): Promise<AccountPayable | null> => {
    try {
      const response = await api.get<AccountPayable>(`/accountPayables/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: AccountPayableFormData): Promise<AccountPayable> => {
    const payload: Omit<AccountPayable, 'id'> = {
      supplierId: data.supplierId,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate,
      status: 'pending',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await api.post<AccountPayable>('/accountPayables', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<AccountPayableFormData> & { status?: AccountPayable['status']; paidDate?: string }): Promise<AccountPayable> => {
    const current = await accountPayableService.getById(id);
    if (!current) throw new Error('Conta a pagar não encontrada');

    const payload: AccountPayable = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<AccountPayable>(`/accountPayables/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accountPayables/${id}`);
  },

  markAsPaid: async (id: string, paidDate?: string): Promise<AccountPayable> => {
    return accountPayableService.update(id, {
      status: 'paid',
      paidDate: paidDate || new Date().toISOString(),
    });
  },

  markAsUnpaid: async (id: string): Promise<AccountPayable> => {
    return accountPayableService.update(id, {
      status: 'pending',
      paidDate: undefined,
    });
  },
};

