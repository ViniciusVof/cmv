export interface DREItem {
  categoryId?: string;
  categoryName: string;
  amount: number;
  type: 'revenue' | 'expense';
  isVariable?: boolean; // Indica se é despesa variável ou fixa
  details?: DREItemDetail[]; // Detalhes expandidos (ex: por maquininha, por entregador)
}

export interface DREItemDetail {
  name: string; // Nome do item (ex: "Maquininha XYZ", "Entregador João")
  amount: number;
}

export interface DRESummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number; // Faturamento - CMV
  netProfit: number; // Lucro = Receitas - Despesas
  totalCashGeneration: number; // Soma de todos os lucros históricos
  breakEvenPoint: number; // Ponto de equilíbrio (faturamento necessário para cobrir todos os custos)
  revenueBreakdown: DREItem[];
  expenseBreakdown: DREItem[];
  paymentMethodBreakdown: {
    methodName: string;
    amount: number;
  }[];
  cashRegisterDifferences?: {
    positive: number; // Soma dos furos positivos (sobras)
    negative: number; // Soma dos furos negativos (faltas)
    total: number; // Diferença total (positivo - negativo)
    details: {
      cashRegisterId: string;
      date: string;
      expectedBalance: number;
      actualBalance: number;
      difference: number;
    }[];
  };
  previousPeriod?: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: DREItem[];
  };
}

export interface DRECategoryMapping {
  id: string;
  accountPayableId?: string;
  accountReceivableId?: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface DRECategoryMappingFormData {
  accountPayableId?: string;
  accountReceivableId?: string;
  categoryId: string;
  description?: string;
}

