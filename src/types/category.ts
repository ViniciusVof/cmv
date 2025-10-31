export type CategoryType = 'revenue' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType; // 'revenue' ou 'expense'
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  description?: string;
  isActive: boolean;
}

