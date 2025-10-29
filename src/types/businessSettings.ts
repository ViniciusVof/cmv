export type CostCalculationMethod = 'current' | 'monthly_average';

export interface BusinessSettings {
  id: string;
  markup: number; // Markup padrão (ex: 3.00)
  ifoodTaxPercentage: number; // Taxa IFood em porcentagem (ex: 15.20)
  costCalculationMethod: CostCalculationMethod; // Método de cálculo: 'current' ou 'monthly_average'
  updatedAt?: string;
}

export interface BusinessSettingsFormData {
  markup: number;
  ifoodTaxPercentage: number;
  costCalculationMethod: CostCalculationMethod;
}

