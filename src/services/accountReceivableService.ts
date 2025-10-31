import type { AccountReceivable, AccountReceivableFormData } from '../types/accountReceivable';
import { api } from '../config/api';
import { customerService } from './customerService';
import { paymentMethodService } from './paymentMethodService';

export const accountReceivableService = {
  getAll: async (): Promise<AccountReceivable[]> => {
    const [receivables, customers, paymentMethods] = await Promise.all([
      api.get<AccountReceivable[]>('/accountReceivables').then(r => r.data),
      customerService.getAll(),
      paymentMethodService.getAll(),
    ]);

    const customersMap = new Map(customers.map(c => [String(c.id), c.name]));
    const paymentMethodsMap = new Map(paymentMethods.map(pm => [String(pm.id), pm.name]));

    return receivables.map(receivable => ({
      ...receivable,
      customerName: receivable.customerId ? customersMap.get(String(receivable.customerId)) : undefined,
      paymentMethodName: receivable.paymentMethodId ? paymentMethodsMap.get(String(receivable.paymentMethodId)) : undefined,
    }));
  },

  getById: async (id: string): Promise<AccountReceivable | null> => {
    try {
      const response = await api.get<AccountReceivable>(`/accountReceivables/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: AccountReceivableFormData): Promise<AccountReceivable> => {
    // Se tem método de pagamento com prazo, calcular data de vencimento
    let dueDate = data.dueDate;
    if (data.receivingDays && data.receivingDays > 0) {
      const date = new Date(data.dueDate + 'T00:00:00');
      date.setDate(date.getDate() + data.receivingDays);
      dueDate = date.toISOString().split('T')[0];
    }

    const payload: Omit<AccountReceivable, 'id'> = {
      customerId: data.customerId,
      description: data.description,
      amount: data.amount,
      dueDate,
      status: 'pending',
      paymentMethodId: data.paymentMethodId,
      receivingDays: data.receivingDays,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await api.post<AccountReceivable>('/accountReceivables', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<AccountReceivableFormData> & { status?: AccountReceivable['status']; receivedDate?: string }): Promise<AccountReceivable> => {
    const current = await accountReceivableService.getById(id);
    if (!current) throw new Error('Conta a receber não encontrada');

    let dueDate = data.dueDate ?? current.dueDate;
    if (data.receivingDays && data.receivingDays > 0) {
      const baseDate = data.dueDate || current.dueDate;
      const date = new Date(baseDate + 'T00:00:00');
      date.setDate(date.getDate() + data.receivingDays);
      dueDate = date.toISOString().split('T')[0];
    }

    const payload: AccountReceivable = {
      ...current,
      ...data,
      dueDate,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<AccountReceivable>(`/accountReceivables/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accountReceivables/${id}`);
  },

  markAsReceived: async (id: string, receivedDate?: string): Promise<AccountReceivable> => {
    return accountReceivableService.update(id, {
      status: 'received',
      receivedDate: receivedDate || new Date().toISOString(),
    });
  },

  markAsUnreceived: async (id: string): Promise<AccountReceivable> => {
    return accountReceivableService.update(id, {
      status: 'pending',
      receivedDate: undefined,
    });
  },
};

