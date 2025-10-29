import type { FixedCost, FixedCostFormData } from '../types/fixedCost';

// Initial data based on CSV
const initialFixedCosts: FixedCost[] = [
  { id: '1', name: 'Aluguel', value: 2500.00 },
  { id: '2', name: 'Água', value: 150.00 },
  { id: '3', name: 'Luz', value: 880.00 },
  { id: '4', name: 'Contador', value: 200.00 },
  { id: '5', name: 'Entregador', value: 2400.00 },
  { id: '6', name: 'Marketing', value: 1100.00 },
  { id: '7', name: 'Gás', value: 910.00 },
  { id: '8', name: 'Sistema', value: 270.00 },
  { id: '9', name: 'Internet/Telefone', value: 180.00 },
  { id: '10', name: 'Limpeza', value: 120.00 },
  { id: '11', name: 'Reserva Operacional', value: 300.00 },
];

// Simulated local storage (in production would be an API)
let fixedCosts: FixedCost[] = [...initialFixedCosts];

// Simulated API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Calculate percentages based on total
const calculatePercentages = (costs: FixedCost[]): FixedCost[] => {
  const total = costs.reduce((sum, cost) => sum + cost.value, 0);
  return costs.map((cost) => ({
    ...cost,
    percentage: total > 0 ? (cost.value / total) * 100 : 0,
  }));
};

export const fixedCostService = {
  getAll: async (): Promise<FixedCost[]> => {
    await delay(300);
    return calculatePercentages([...fixedCosts]);
  },

  getById: async (id: string): Promise<FixedCost | null> => {
    await delay(200);
    const cost = fixedCosts.find((c) => c.id === id);
    return cost ? { ...cost } : null;
  },

  create: async (data: FixedCostFormData): Promise<FixedCost> => {
    await delay(500);
    const newCost: FixedCost = {
      id: Date.now().toString(),
      name: data.name,
      value: data.value,
    };
    fixedCosts.push(newCost);
    return newCost;
  },

  update: async (id: string, data: FixedCostFormData): Promise<FixedCost> => {
    await delay(500);
    const index = fixedCosts.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Fixed cost not found');
    }
    fixedCosts[index] = {
      ...fixedCosts[index],
      name: data.name,
      value: data.value,
    };
    return { ...fixedCosts[index] };
  },

  delete: async (id: string): Promise<void> => {
    await delay(500);
    const index = fixedCosts.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Fixed cost not found');
    }
    fixedCosts.splice(index, 1);
  },

  getTotal: async (): Promise<number> => {
    await delay(200);
    return fixedCosts.reduce((sum, cost) => sum + cost.value, 0);
  },
};

