export interface BusinessSettings {
  id: string;
  markup: number; // Markup padrão (ex: 3.00)
  ifoodTaxPercentage: number; // Taxa IFood em porcentagem (ex: 15.20)
  updatedAt?: string;
}

export interface BusinessSettingsFormData {
  markup: number;
  ifoodTaxPercentage: number;
}

