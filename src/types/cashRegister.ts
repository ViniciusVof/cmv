export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number; // Saldo inicial
  expectedBalance?: number; // Saldo esperado no fechamento (vendas + abertura)
  actualBalance?: number; // Saldo real contado no fechamento
  difference?: number; // Diferença (real - esperado)
  openedBy?: string; // Nome do usuário que abriu
  closedBy?: string; // Nome do usuário que fechou
  notes?: string; // Observações
  status: 'open' | 'closed';
}

export interface CashRegisterFormData {
  openingBalance: number;
  notes?: string;
}

export interface CloseCashRegisterData {
  actualBalance: number;
  notes?: string;
}

export interface CashTransaction {
  id: string;
  cashRegisterId: string;
  type: 'in' | 'out'; // entrada ou saída
  amount: number;
  description: string;
  createdAt: string;
}

export interface CashTransactionFormData {
  type: 'in' | 'out';
  amount: number;
  description: string;
}

