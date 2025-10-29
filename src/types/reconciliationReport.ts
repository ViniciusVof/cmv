export interface ReconciliationReport {
  id: string;
  date: string; // Data da conciliação
  reconciledAt: string; // Quando foi aplicada (ISO date)
  items: ReconciliationReportItem[];
  summary: {
    totalItems: number;
    itemsWithDifference: number;
    totalEntries: number;
    totalExits: number;
  };
}

export interface ReconciliationReportItem {
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  adjustmentType: 'IN' | 'OUT' | 'NONE';
}

