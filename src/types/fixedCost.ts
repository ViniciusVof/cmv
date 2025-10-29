export interface FixedCost {
  id: string;
  name: string;
  value: number;
  percentage?: number; // Calculated automatically
}

export interface FixedCostFormData {
  name: string;
  value: number;
}

