export type StockMovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  ingredientId: string;
  type: StockMovementType;
  quantity: number; // In the ingredient's unit
  unitCost?: number; // Required for IN, ignored for OUT
  isInitial?: boolean; // Marks initial stock entry
  date: string; // ISO string date
  note?: string;
}

export interface StockMovementFormData {
  ingredientId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  isInitial?: boolean;
  date?: string; // optional for initial; ignored for others
  note?: string;
}

export interface StockSummary {
  ingredientId: string;
  quantityOnHand: number;
  lastEntryUnitCost?: number; // Unit cost based on the latest IN movement
}


