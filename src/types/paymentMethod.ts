export type PaymentMethodType = 'maquininha' | 'dinheiro' | 'outro';

export interface PaymentMethod {
  id: string;
  name: string; // Ex: Dinheiro, PIX, Stone, PagSeguro, etc
  type: PaymentMethodType; // Tipo de forma de pagamento
  creditFee?: number; // Taxa de crédito (%) - apenas para maquininhas
  debitFee?: number; // Taxa de débito (%) - apenas para maquininhas
  processingFeePercentage?: number; // Taxa de processamento PIX em % (apenas para maquininhas)
  requiresChange: boolean; // Se precisa de troco (ex: dinheiro)
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentMethodFormData {
  name: string;
  type: PaymentMethodType;
  creditFee?: number;
  debitFee?: number;
  processingFeePercentage?: number;
  requiresChange: boolean;
  isActive: boolean;
}

