import type { StockMovement, StockMovementFormData, StockSummary } from '../types/stock';
import { api } from '../config/api';

export const stockService = {
  getAll: async (): Promise<StockMovement[]> => {
    const response = await api.get<StockMovement[]>('/stockMovements');
    return response.data;
  },

  getByIngredient: async (ingredientId: string): Promise<StockMovement[]> => {
    const all = await stockService.getAll();
    return all.filter((m) => m.ingredientId === ingredientId);
  },

  create: async (data: StockMovementFormData): Promise<StockMovement> => {
    const nowIso = new Date().toISOString();
    const isInitial = !!data.isInitial;

    const movement: Omit<StockMovement, 'id'> = {
      ingredientId: data.ingredientId,
      type: data.type,
      quantity: data.quantity,
      unitCost: data.type === 'IN' ? (data.unitCost || 0) : undefined,
      isInitial: isInitial || undefined,
      // If date is provided, use it; otherwise use current date/time for non-initial, or now for initial without date
      date: data.date ? new Date(data.date + (isInitial ? 'T00:00:00' : '')).toISOString() : nowIso,
      note: data.note,
    };

    const response = await api.post<StockMovement>('/stockMovements', movement);
    return response.data;
  },

  getSummaryForIngredient: async (ingredientId: string): Promise<StockSummary> => {
    const movements = await stockService.getByIngredient(ingredientId);
    let quantityOnHand = 0;
    let lastEntryUnitCost: number | undefined = undefined;
    let lastEntryDate = '';
    for (const m of movements) {
      if (m.type === 'IN') {
        quantityOnHand += m.quantity;
        if (!lastEntryDate || new Date(m.date) > new Date(lastEntryDate)) {
          lastEntryDate = m.date;
          lastEntryUnitCost = m.unitCost || lastEntryUnitCost;
        }
      } else {
        quantityOnHand -= m.quantity;
      }
    }
    return { ingredientId, quantityOnHand, lastEntryUnitCost };
  },

  getSummaryAll: async (): Promise<Record<string, StockSummary>> => {
    const all = await stockService.getAll();
    const byIngredient: Record<string, StockSummary & { lastEntryDate?: string }> = {} as any;
    for (const m of all) {
      if (!byIngredient[m.ingredientId]) {
        byIngredient[m.ingredientId] = {
          ingredientId: m.ingredientId,
          quantityOnHand: 0,
          lastEntryUnitCost: undefined,
          lastEntryDate: undefined,
        } as any;
      }
      const s = byIngredient[m.ingredientId];
      if (m.type === 'IN') {
        s.quantityOnHand += m.quantity;
        if (!s.lastEntryDate || new Date(m.date) > new Date(s.lastEntryDate)) {
          s.lastEntryDate = m.date;
          s.lastEntryUnitCost = m.unitCost;
        }
      } else {
        s.quantityOnHand -= m.quantity;
      }
    }
    const result: Record<string, StockSummary> = {};
    for (const [ingredientId, s] of Object.entries(byIngredient)) {
      result[ingredientId] = {
        ingredientId,
        quantityOnHand: s.quantityOnHand,
        lastEntryUnitCost: s.lastEntryUnitCost,
      };
    }
    return result;
  },
};


