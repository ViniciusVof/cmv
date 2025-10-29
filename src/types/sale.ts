export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number; // Preço unitário no momento da venda
  totalPrice: number; // quantity * unitPrice
  discount?: number; // Desconto aplicado (opcional)
}

export interface SalePayment {
  id: string;
  paymentMethodId: string;
  paymentMethodName: string;
  amount: number; // Valor pago neste método
  change?: number; // Troco (se necessário)
}

export interface Sale {
  id: string;
  saleNumber: string; // Número da venda (único, sequencial)
  customerId?: string; // Cliente (opcional, pode ser venda avulsa)
  customerName?: string;
  saleDate: string; // ISO date
  items: SaleItem[];
  subtotal: number; // Soma dos itens
  deliveryFee?: number; // Taxa de entrega (se houver)
  discount?: number; // Desconto geral (opcional)
  total: number; // subtotal + deliveryFee - discount
  payments: SalePayment[];
  deliveryAreaId?: string; // Área de entrega
  deliveryAddress?: string; // Endereço de entrega
  deliveryDriverId?: string; // Entregador
  notes?: string; // Observações
  status: 'pending' | 'completed' | 'cancelled'; // Status da venda
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleFormData {
  customerId?: string;
  items: Omit<SaleItem, 'id' | 'productName' | 'productCode'>[];
  deliveryAreaId?: string;
  deliveryAddress?: string;
  deliveryDriverId?: string;
  discount?: number;
  payments: Omit<SalePayment, 'id' | 'paymentMethodName'>[];
  notes?: string;
}

