export interface PaymentMethod {
  id: string;
  name: string; // Ex: Dinheiro, PIX, Cartão de Crédito, etc
  requiresChange: boolean; // Se precisa de troco (ex: dinheiro)
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentMethodFormData {
  name: string;
  requiresChange: boolean;
  isActive: boolean;
}

