import type { Sale, SaleFormData } from '../types/sale';
import { api } from '../config/api';
import { paymentMethodService } from './paymentMethodService';

export const saleService = {
  getAll: async (): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/sales');
    return response.data;
  },

  getById: async (id: string): Promise<Sale | null> => {
    try {
      const response = await api.get<Sale>(`/sales/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: SaleFormData): Promise<Sale> => {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
      return sum + itemTotal;
    }, 0);

    const total = subtotal + (data.deliveryFee || 0) - (data.discount || 0);

    // Get payment method names
    const paymentMethods = await paymentMethodService.getAll();
    const paymentMethodsMap = new Map(paymentMethods.map(pm => [pm.id, pm.name]));

    const payments = data.payments.map(payment => ({
      id: `${Date.now()}-${Math.random()}`,
      paymentMethodId: payment.paymentMethodId,
      paymentMethodName: paymentMethodsMap.get(payment.paymentMethodId) || 'Desconhecido',
      amount: payment.amount,
      change: payment.change,
    }));

    // Generate sale number (you might want to implement a better numbering system)
    const allSales = await saleService.getAll();
    const nextSaleNumber = (allSales.length + 1).toString().padStart(6, '0');

    const saleData = {
      ...data,
      saleNumber: nextSaleNumber,
      saleDate: new Date().toISOString(),
      items: data.items.map(item => ({
        id: `${Date.now()}-${Math.random()}`,
        ...item,
        totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
      })),
      subtotal,
      total,
      payments,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await api.post<Sale>('/sales', saleData);
    return response.data;
  },

  cancel: async (id: string): Promise<Sale> => {
    const sale = await saleService.getById(id);
    if (!sale) {
      throw new Error('Venda não encontrada');
    }

    const response = await api.put<Sale>(`/sales/${id}`, {
      ...sale,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    return response.data;
  },
};

