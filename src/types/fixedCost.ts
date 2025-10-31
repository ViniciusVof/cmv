export interface FixedCost {
  id: string;
  name: string;
  value: number;
  percentage?: number; // Calculated automatically
  showInDRE?: boolean; // Se deve aparecer no DRE
}

export interface FixedCostFormData {
  name: string;
  value: number;
  showInDRE?: boolean;
}

