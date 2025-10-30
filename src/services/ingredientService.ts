import type { Ingredient, IngredientFormData } from '../types/ingredient';
import { api } from '../config/api';

// Calculate final value based on price, volume and correction factor
const calculateFinalValue = (
  pricePaid: number,
  volume: number,
  correctionFactor: number
): number => {
  if (volume === 0) return 0;
  return (pricePaid / volume) * correctionFactor;
};

export const ingredientService = {
  getAll: async (): Promise<Ingredient[]> => {
    const response = await api.get<Ingredient[]>('/ingredients');
    // helper to create deterministic pseudo-random numbers based on id
    const seededRand = (seed: string) => {
      let h = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      return Math.abs(h);
    };
    // Calculate final values for all ingredients and inject thresholds if missing
    return response.data.map((ingredient) => {
      const finalValue = calculateFinalValue(
        ingredient.pricePaid,
        ingredient.volume,
        ingredient.correctionFactor
      );
      let { minStock, idealStock, maxStock } = ingredient as any;
      if (minStock === undefined || idealStock === undefined || maxStock === undefined) {
        const base = seededRand(String(ingredient.id || ingredient.code));
        const a = (base % 5) + 1; // 1..5
        const b = ((base >> 3) % 5) + 1;
        const c = ((base >> 7) % 5) + 1;
        const arr = [a, b, c].sort((x, y) => x - y);
        minStock = arr[0];
        idealStock = arr[1];
        maxStock = arr[2];
      }
      return {
        ...ingredient,
        finalValue,
        minStock,
        idealStock,
        maxStock,
      } as Ingredient;
    });
  },

  getById: async (id: string): Promise<Ingredient | null> => {
    try {
      const response = await api.get<Ingredient>(`/ingredients/${id}`);
      const ingredient = response.data as any;
      // derive thresholds if missing (same deterministic rule as getAll)
      const seededRand = (seed: string) => {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i++) {
          h ^= seed.charCodeAt(i);
          h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        return Math.abs(h);
      };
      let { minStock, idealStock, maxStock } = ingredient;
      if (minStock === undefined || idealStock === undefined || maxStock === undefined) {
        const base = seededRand(String(ingredient.id || ingredient.code));
        const a = (base % 5) + 1;
        const b = ((base >> 3) % 5) + 1;
        const c = ((base >> 7) % 5) + 1;
        const arr = [a, b, c].sort((x, y) => x - y);
        minStock = arr[0];
        idealStock = arr[1];
        maxStock = arr[2];
      }
      return {
        ...ingredient,
        finalValue: calculateFinalValue(
          ingredient.pricePaid,
          ingredient.volume,
          ingredient.correctionFactor
        ),
        minStock,
        idealStock,
        maxStock,
      } as Ingredient;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  create: async (data: IngredientFormData): Promise<Ingredient> => {
    // Get supplier name to include in response
    const supplierResponse = await api.get(`/suppliers/${data.supplierId}`);
    const supplier = supplierResponse.data;

    const finalValue = calculateFinalValue(
      data.pricePaid,
      data.volume,
      data.correctionFactor
    );

    const ingredientData = {
      ...data,
      finalValue,
      supplierName: supplier.name,
    };

    const response = await api.post<Ingredient>('/ingredients', ingredientData);
    return {
      ...response.data,
      finalValue,
    };
  },

  update: async (id: string, data: IngredientFormData): Promise<Ingredient> => {
    // Get supplier name to include in response
    const supplierResponse = await api.get(`/suppliers/${data.supplierId}`);
    const supplier = supplierResponse.data;

    const finalValue = calculateFinalValue(
      data.pricePaid,
      data.volume,
      data.correctionFactor
    );

    const ingredientData = {
      ...data,
      finalValue,
      supplierName: supplier.name,
    };

    const response = await api.put<Ingredient>(`/ingredients/${id}`, ingredientData);
    return {
      ...response.data,
      finalValue,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/ingredients/${id}`);
  },

  getBySupplier: async (supplierId: string): Promise<Ingredient[]> => {
    // JSON Server doesn't support query params directly, so we filter client-side
    const allIngredients = await ingredientService.getAll();
    return allIngredients.filter((ingredient) => ingredient.supplierId === supplierId);
  },
};

