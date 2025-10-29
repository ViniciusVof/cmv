export interface DeliveryDriver {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string; // Tipo de veículo (moto, carro, bike, etc)
  licensePlate?: string; // Placa do veículo
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryDriverFormData {
  name: string;
  phone: string;
  vehicleType?: string;
  licensePlate?: string;
  isActive: boolean;
}

