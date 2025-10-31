export type AccountReceivableStatus = 'pending' | 'received' | 'overdue';

export interface AccountReceivable {
  id: string;
  customerId?: string;
  description: string;
  amount: number;
  dueDate: string; // ISO date string
  receivedDate?: string; // ISO date string
  status: AccountReceivableStatus;
  category?: string;
  paymentMethodId?: string; // ID do método de pagamento (maquininha)
  receivingDays?: number; // Prazo de recebimento em dias (para maquininhas)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountReceivableFormData {
  customerId?: string;
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  paymentMethodId?: string;
  receivingDays?: number;
  notes?: string;
}

