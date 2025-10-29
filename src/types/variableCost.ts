export interface VariableCost {
  id: string;
  name: string;
  percentage: number;
  calculatedValue?: number; // Calculated based on revenue (optional, for display)
}

export interface VariableCostFormData {
  name: string;
  percentage: number;
}

