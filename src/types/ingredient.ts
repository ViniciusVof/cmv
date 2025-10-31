export interface Ingredient {
  id: string;
  code: string;
  name: string;
  pricePaid: number;
  volume: number;
  unit: string; // KG, UN, etc.
  correctionFactor: number; // Fator de Correção
  finalValue: number; // Valor Final R$
  supplierId: string;
  supplierName: string;
  isProduct?: boolean; // Se pode ser usado em outras fichas técnicas
  minStock?: number; // nível mínimo recomendado
  idealStock?: number; // nível ideal
  maxStock?: number; // nível máximo permitido
}

export type PaymentType = 'cash' | 'installment';

export interface IngredientFormData {
  code: string;
  name: string;
  pricePaid: number;
  volume: number;
  unit: string;
  correctionFactor: number;
  supplierId: string;
  minStock?: number;
  idealStock?: number;
  maxStock?: number;
  paymentType?: PaymentType; // 'cash' para à vista, 'installment' para à prazo
  paymentDays?: number; // Quantidade de dias para pagamento (quando à prazo)
}

