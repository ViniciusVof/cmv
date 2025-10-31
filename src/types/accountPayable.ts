export type AccountPayableStatus = 'pending' | 'paid' | 'overdue';

export interface AccountPayable {
  id: string;
  supplierId?: string;
  description: string;
  amount: number;
  dueDate: string; // ISO date string
  paidDate?: string; // ISO date string
  status: AccountPayableStatus;
  category?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPayableFormData {
  supplierId?: string;
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  notes?: string;
}

