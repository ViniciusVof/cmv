export interface DeliveryArea {
  id: string;
  name: string; // Nome do bairro
  deliveryFee: number; // Taxa de entrega
  estimatedTime?: number; // Tempo estimado de entrega em minutos
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryAreaFormData {
  name: string;
  deliveryFee: number;
  estimatedTime?: number;
  isActive: boolean;
}

