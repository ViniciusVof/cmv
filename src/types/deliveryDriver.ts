export interface DeliveryDriver {
  id: string;
  name: string;
  dailyRate?: number; // Valor da diária (opcional)
  receivesDeliveryFee: boolean; // Se recebe taxa de entrega
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryDriverFormData {
  name: string;
  dailyRate?: number; // Valor da diária (opcional)
  receivesDeliveryFee: boolean; // Se recebe taxa de entrega
  isActive: boolean;
}

