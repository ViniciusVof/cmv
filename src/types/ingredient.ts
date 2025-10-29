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

