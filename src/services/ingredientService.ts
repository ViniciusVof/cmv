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
    // Calculate final values for all ingredients
    return response.data.map((ingredient) => ({
      ...ingredient,
      finalValue: calculateFinalValue(
        ingredient.pricePaid,
        ingredient.volume,
        ingredient.correctionFactor
      ),
    }));
  },

  getById: async (id: string): Promise<Ingredient | null> => {
    try {
      const response = await api.get<Ingredient>(`/ingredients/${id}`);
      const ingredient = response.data;
      return {
        ...ingredient,
        finalValue: calculateFinalValue(
          ingredient.pricePaid,
          ingredient.volume,
          ingredient.correctionFactor
        ),
      };
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

