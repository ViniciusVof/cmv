export interface DREAdjustment {
  id: string;
  periodKey: string; // Chave do período (ex: "2024-01-01_2024-01-31")
  itemType: 'revenue' | 'expense';
  itemName: string; // Nome do item (ex: "Receita Total", "CMV - Custo das Mercadorias Vendidas")
  categoryId?: string;
  originalAmount: number; // Valor original calculado
  adjustedAmount: number; // Valor ajustado manualmente
  notes?: string; // Observações sobre o ajuste
  createdAt: string;
  updatedAt: string;
}

export interface DREAdjustmentFormData {
  itemType: 'revenue' | 'expense';
  itemName: string;
  categoryId?: string;
  adjustedAmount: number;
  notes?: string;
}

