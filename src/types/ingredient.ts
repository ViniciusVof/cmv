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
}

export interface IngredientFormData {
  code: string;
  name: string;
  pricePaid: number;
  volume: number;
  unit: string;
  correctionFactor: number;
  supplierId: string;
}

