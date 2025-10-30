export type OrderStatus = 'kitchen' | 'waiting_delivery' | 'in_delivery' | 'completed';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  paymentMethodId: string;
  items: Omit<OrderItem, 'totalPrice'>[];
  notes?: string;
}

