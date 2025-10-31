import type { Order, OrderFormData, OrderStatus } from '../types/order';
import { api } from '../config/api';
import { customerService } from './customerService';
import { deliveryAreaService } from './deliveryAreaService';
import { deliveryDriverService } from './deliveryDriverService';
import { paymentMethodService } from './paymentMethodService';
import { cashRegisterService } from './cashRegisterService';
import { pdvProductService } from './pdvProductService';
// import { businessSettingsService } from './businessSettingsService';

export const orderService = {
  getAll: async (): Promise<Order[]> => {
    const [orders, customers, deliveryAreas, drivers, paymentMethods] = await Promise.all([
      api.get<Order[]>('/orders').then(r => r.data),
      customerService.getAll(),
      deliveryAreaService.getAll(),
      deliveryDriverService.getAll(),
      paymentMethodService.getAll(),
    ]);

    // Create maps for quick lookup
    const customersMap = new Map(customers.map(c => [String(c.id), c.name]));
    const areasMap = new Map(deliveryAreas.map(a => [String(a.id), a.name]));
    const driversMap = new Map(drivers.map(d => [String(d.id), d.name]));
    const paymentMethodsMap = new Map(paymentMethods.map(pm => [String(pm.id), pm.name]));

    // Enrich orders with names
    return orders.map(order => ({
      ...order,
      customerName: order.customerId ? customersMap.get(String(order.customerId)) : undefined,
      deliveryAreaName: order.deliveryAreaId ? areasMap.get(String(order.deliveryAreaId)) : undefined,
      deliveryDriverName: order.deliveryDriverId ? driversMap.get(String(order.deliveryDriverId)) : undefined,
      paymentMethodName: order.paymentMethodId ? paymentMethodsMap.get(String(order.paymentMethodId)) : undefined,
    }));
  },

  getById: async (id: string): Promise<Order | null> => {
    try {
      const response = await api.get<Order>(`/orders/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: OrderFormData): Promise<Order> => {
    // Calculate totals
    const itemsWithTotals = data.items.map(item => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice,
    }));

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Get delivery fee if delivery area is selected
    let deliveryFee = 0;
    if (data.deliveryAreaId) {
      const area = await deliveryAreaService.getById(data.deliveryAreaId);
      deliveryFee = area?.deliveryFee || 0;
    }

    const total = subtotal + deliveryFee;

    // Get open cash register
    const openCashRegister = await cashRegisterService.getOpenCashRegister();
    
    // Get payment method to calculate fees
    let cardFee = 0;
    let deliveryFeeDriverAmount = 0;
    
    if (data.paymentMethodId) {
      const paymentMethod = await paymentMethodService.getById(data.paymentMethodId);
      if (paymentMethod) {
        if (data.paymentMethodKind === 'credit' && paymentMethod.creditFee) {
          cardFee = (total * paymentMethod.creditFee) / 100;
        } else if (data.paymentMethodKind === 'debit' && paymentMethod.debitFee) {
          cardFee = (total * paymentMethod.debitFee) / 100;
        } else if (data.paymentMethodKind === 'pix' && paymentMethod.processingFeePercentage) {
          cardFee = (total * paymentMethod.processingFeePercentage) / 100;
        }
      }
    }
    
    // Repasse ao entregador: 100% da taxa de entrega
    if (deliveryFee > 0) {
      deliveryFeeDriverAmount = deliveryFee;
    }
    
    const netAmount = total - cardFee - deliveryFeeDriverAmount;

    // Generate order number
    const allOrders = await api.get<Order[]>('/orders').then(r => r.data);
    const nextOrderNumber = (allOrders.length + 1).toString().padStart(6, '0');

    const order: Omit<Order, 'id'> = {
      orderNumber: nextOrderNumber,
      status: 'kitchen', // Default status
      customerId: data.customerId,
      deliveryAreaId: data.deliveryAreaId,
      deliveryDriverId: data.deliveryDriverId,
      paymentMethodId: data.paymentMethodId,
      paymentMethodKind: data.paymentMethodKind,
      changeFor: data.changeFor,
      changeAmount: data.changeAmount,
      deliveryFee,
      items: itemsWithTotals,
      subtotal,
      total,
      cashRegisterId: openCashRegister?.id,
      cardFee,
      deliveryFeeDriverAmount,
      netAmount,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // O backend já cria o pedido, registra a transação no caixa e faz a baixa de estoque automaticamente
    const response = await api.post<Order>('/orders', order);

    // Enrich with names
    const [customer, area, driver, paymentMethod] = await Promise.all([
      order.customerId ? customerService.getById(order.customerId) : null,
      order.deliveryAreaId ? deliveryAreaService.getById(order.deliveryAreaId) : null,
      order.deliveryDriverId ? deliveryDriverService.getById(order.deliveryDriverId) : null,
      order.paymentMethodId ? paymentMethodService.getById(order.paymentMethodId) : null,
    ]);

    return {
      ...response.data,
      customerName: customer?.name,
      deliveryAreaName: area?.name,
      deliveryDriverName: driver?.name,
      paymentMethodName: paymentMethod?.name,
    };
  },

  update: async (id: string, data: Partial<OrderFormData> & { status?: OrderStatus }): Promise<Order> => {
    // Fetch current order to merge and recalc if needed
    const current = await orderService.getById(id);
    if (!current) throw new Error('Pedido não encontrado');

    let items = current.items;
    if (data.items) {
      items = data.items.map(item => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));
    }
    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    let deliveryFee = current.deliveryFee || 0;
    const deliveryAreaId = data.deliveryAreaId ?? current.deliveryAreaId;
    if (deliveryAreaId) {
      const area = await deliveryAreaService.getById(deliveryAreaId);
      deliveryFee = area?.deliveryFee || 0;
    }
    const total = subtotal + deliveryFee;

    const payload: Order = {
      ...current,
      customerId: data.customerId ?? current.customerId,
      deliveryAreaId,
      deliveryDriverId: data.deliveryDriverId ?? current.deliveryDriverId,
      paymentMethodId: data.paymentMethodId ?? current.paymentMethodId,
      paymentMethodKind: data.paymentMethodKind ?? current.paymentMethodKind,
      changeFor: data.changeFor ?? current.changeFor,
      changeAmount: data.changeAmount ?? current.changeAmount,
      items,
      subtotal,
      deliveryFee,
      total,
      notes: data.notes ?? current.notes,
      status: (data as any).status ?? current.status,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<Order>(`/orders/${id}`, payload);
    return response.data;
  },

  updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
    // Buscar pedido antes de atualizar
    const currentOrder = await orderService.getById(id);
    
    const response = await api.patch<Order>(`/orders/${id}`, {
      status,
      updatedAt: new Date().toISOString(),
    });
    
    // Se o pedido foi cancelado e tinha um caixa vinculado, registrar saída
    if (status === 'cancelled' && currentOrder && currentOrder.cashRegisterId && currentOrder.netAmount) {
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
      };
      
      await api.post('/cashTransactions', {
        cashRegisterId: currentOrder.cashRegisterId,
        type: 'out',
        amount: currentOrder.netAmount,
        description: `Cancelamento Pedido #${currentOrder.orderNumber || id.slice(0, 6)} - ${formatCurrency(currentOrder.netAmount)}`,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Enrich with names
    const order = response.data;
    const [customer, area, driver, paymentMethod] = await Promise.all([
      order.customerId ? customerService.getById(order.customerId) : null,
      order.deliveryAreaId ? deliveryAreaService.getById(order.deliveryAreaId) : null,
      order.deliveryDriverId ? deliveryDriverService.getById(order.deliveryDriverId) : null,
      order.paymentMethodId ? paymentMethodService.getById(order.paymentMethodId) : null,
    ]);

    return {
      ...order,
      customerName: customer?.name,
      deliveryAreaName: area?.name,
      deliveryDriverName: driver?.name,
      paymentMethodName: paymentMethod?.name,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/orders/${id}`);
  },
};

