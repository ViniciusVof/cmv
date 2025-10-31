export interface VariableCost {
  id: string;
  name: string;
  percentage: number;
  calculatedValue?: number; // Calculated based on revenue (optional, for display)
  showInDRE?: boolean; // Se deve aparecer no DRE
}

export interface VariableCostFormData {
  name: string;
  percentage: number;
  showInDRE?: boolean;
}

