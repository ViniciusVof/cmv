import type { CashTransaction, CashTransactionFormData } from '../types/cashRegister';
import { api } from '../config/api';

export const cashTransactionService = {
  getAll: async (): Promise<CashTransaction[]> => {
    const response = await api.get<CashTransaction[]>('/cashTransactions');
    return response.data;
  },

  getByCashRegisterId: async (cashRegisterId: string): Promise<CashTransaction[]> => {
    const all = await cashTransactionService.getAll();
    return all.filter(t => String(t.cashRegisterId) === String(cashRegisterId));
  },

  create: async (cashRegisterId: string, data: CashTransactionFormData): Promise<CashTransaction> => {
    const transaction: Omit<CashTransaction, 'id'> = {
      cashRegisterId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      createdAt: new Date().toISOString(),
    };

    const response = await api.post<CashTransaction>('/cashTransactions', transaction);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cashTransactions/${id}`);
  },
};

