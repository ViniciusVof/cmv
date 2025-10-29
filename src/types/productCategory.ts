export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategoryFormData {
  name: string;
  description?: string;
  isActive: boolean;
}

