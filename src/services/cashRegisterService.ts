import type { CashRegister, CashRegisterFormData, CloseCashRegisterData } from '../types/cashRegister';
import { api } from '../config/api';

export const cashRegisterService = {
  getAll: async (): Promise<CashRegister[]> => {
    const response = await api.get<CashRegister[]>('/cashRegisters');
    return response.data;
  },

  getById: async (id: string): Promise<CashRegister | null> => {
    try {
      const response = await api.get<CashRegister>(`/cashRegisters/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  getOpenCashRegister: async (): Promise<CashRegister | null> => {
    const all = await cashRegisterService.getAll();
    const open = all.find(cr => cr.status === 'open');
    return open || null;
  },

  open: async (data: CashRegisterFormData): Promise<CashRegister> => {
    // Verificar se já existe um caixa aberto
    const openCashRegister = await cashRegisterService.getOpenCashRegister();
    if (openCashRegister) {
      throw new Error('Já existe um caixa aberto');
    }

    const cashRegister: Omit<CashRegister, 'id'> = {
      openedAt: new Date().toISOString(),
      openingBalance: data.openingBalance,
      notes: data.notes,
      status: 'open',
    };

    const response = await api.post<CashRegister>('/cashRegisters', cashRegister);
    return response.data;
  },

  close: async (id: string, data: CloseCashRegisterData): Promise<CashRegister> => {
    const current = await cashRegisterService.getById(id);
    if (!current) throw new Error('Caixa não encontrado');
    if (current.status === 'closed') throw new Error('Caixa já está fechado');

    // Calcular saldo esperado (abertura + vendas + entradas - saídas)
    const [ordersResponse, transactionsResponse] = await Promise.all([
      api.get('/orders'),
      api.get('/cashTransactions'),
    ]);

    const orders = ordersResponse.data || [];
    const salesTotal = orders
      .filter((o: any) => {
        if (!o.createdAt || o.status === 'cancelled') return false;
        const orderDate = new Date(o.createdAt);
        const openDate = new Date(current.openedAt);
        return orderDate >= openDate;
      })
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const transactions = transactionsResponse.data || [];
    const cashTransactions = transactions.filter((t: any) => String(t.cashRegisterId) === String(id));
    const transactionsIn = cashTransactions
      .filter((t: any) => t.type === 'in')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const transactionsOut = cashTransactions
      .filter((t: any) => t.type === 'out')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const expectedBalance = current.openingBalance + salesTotal + transactionsIn - transactionsOut;
    const difference = data.actualBalance - expectedBalance;

    const updated: CashRegister = {
      ...current,
      closedAt: new Date().toISOString(),
      expectedBalance,
      actualBalance: data.actualBalance,
      difference,
      notes: data.notes || current.notes,
      status: 'closed',
    };

    const response = await api.put<CashRegister>(`/cashRegisters/${id}`, updated);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cashRegisters/${id}`);
  },
};

