export interface CustomerAddress {
  address?: string; // Endereço (opcional)
  deliveryAreaId: string; // ID da área de entrega (bairro) - obrigatório
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  addresses?: CustomerAddress[]; // Múltiplos endereços
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerFormData {
  name: string;
  phone?: string;
  addresses?: CustomerAddress[];
}

