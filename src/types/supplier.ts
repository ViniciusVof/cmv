export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface SupplierFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

