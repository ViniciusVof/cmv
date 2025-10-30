export type OrderStatus = 'kitchen' | 'waiting_delivery' | 'in_delivery' | 'completed';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber?: string; // Número do pedido
  status: OrderStatus; // Status do pedido (define a coluna do kanban)
  customerId?: string;
  customerName?: string;
  deliveryAreaId?: string;
  deliveryAreaName?: string;
  deliveryFee?: number;
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentMethodKind?: 'credit' | 'debit' | 'pix' | 'cash' | 'other';
  changeFor?: number; // Valor recebido em dinheiro (para cálculo de troco)
  changeAmount?: number; // Valor de troco a enviar
  items: OrderItem[];
  subtotal: number;
  total: number;
  notes?: string; // Observações do pedido
  createdAt: string;
  updatedAt: string;
}

export interface OrderFormData {
  customerId?: string;
  deliveryAreaId?: string;
  deliveryDriverId?: string;
  paymentMethodId?: string;
  paymentMethodKind?: 'credit' | 'debit' | 'pix' | 'cash' | 'other';
  changeFor?: number;
  changeAmount?: number;
  items: Omit<OrderItem, 'totalPrice'>[];
  notes?: string;
}

