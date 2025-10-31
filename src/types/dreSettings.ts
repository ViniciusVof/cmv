export interface DRESettings {
  id: string;
  useAutomaticPDVValues: boolean; // Se deve usar valores automáticos do PDV (CMV, taxas de cartão, entregadores)
  useConfiguredFixedValues: boolean; // Se deve usar valores fixos configurados (custos fixos e variáveis)
  createdAt?: string;
  updatedAt?: string;
}

export interface DRESettingsFormData {
  useAutomaticPDVValues: boolean;
  useConfiguredFixedValues: boolean;
}

