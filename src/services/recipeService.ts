import type { Recipe, RecipeFormData, RecipeItem } from '../types/recipe';
import { api } from '../config/api';
import { ingredientService } from './ingredientService';
import { businessSettingsService } from './businessSettingsService';
import { stockService } from './stockService';

// Forward declaration to avoid circular dependency
let recipeServiceRef: any = null;

// Calculate costs for a recipe item
const calculateRecipeItemCost = async (
  item: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'>
): Promise<{ unitCost: number; totalCost: number }> => {
  try {
    // Check if it's a product (recipe) or an ingredient
    // Use dynamic import to avoid circular dependency
    const recipe = recipeServiceRef ? await recipeServiceRef.getById(item.ingredientId) : null;
    if (recipe) {
      // It's a product from another recipe
      // Unit cost = recipe cost (the recipe cost is already the cost for one unit of that product)
      const unitCost = recipe.recipeCost;
      // Total cost = unit cost * quantity used in this recipe
      const totalCost = unitCost * item.netQuantity;
      return { unitCost, totalCost };
    }

    // It's an ingredient from stock
    const ingredient = await ingredientService.getById(item.ingredientId);
    if (!ingredient) {
      throw new Error('Ingrediente não encontrado');
    }

    // Get business settings to determine cost calculation method
    const businessSettings = await businessSettingsService.get();
    let baseUnitCost: number;

    if (businessSettings.costCalculationMethod === 'monthly_average') {
      // Use monthly average cost from stock movements (last 30 days)
      const monthlyAvgCost = await stockService.getMonthlyAverageCost(item.ingredientId);
      if (monthlyAvgCost !== undefined) {
        baseUnitCost = monthlyAvgCost;
      } else {
        // Fallback to current cost if no monthly average available
        baseUnitCost = ingredient.finalValue;
      }
    } else {
      // Use current cost (finalValue)
      baseUnitCost = ingredient.finalValue;
    }

    // Unit cost = base unit cost * correction factor
    const unitCost = baseUnitCost * item.correctionFactor;
    
    // Total cost = unit cost * net quantity
    const totalCost = unitCost * item.netQuantity;

    return { unitCost, totalCost };
  } catch (error) {
    console.error('Error calculating recipe item cost:', error);
    return { unitCost: 0, totalCost: 0 };
  }
};

// Calculate all recipe metrics
const calculateRecipeMetrics = async (
  items: RecipeItem[],
  markup?: number
): Promise<{
  recipeCost: number;
  suggestedPrice: number;
  suggestedIfoodPrice: number;
  grossProfit: number;
  cmv: number;
  itemsWithPercentage: RecipeItem[];
}> => {
  const businessSettings = await businessSettingsService.get();
  const finalMarkup = markup || businessSettings.markup;
  const ifoodTax = businessSettings.ifoodTaxPercentage / 100;

  // Calculate total recipe cost
  const recipeCost = items.reduce((sum, item) => sum + item.totalCost, 0);

  // Calculate percentage for each item
  const itemsWithPercentage = items.map((item) => ({
    ...item,
    percentage: recipeCost > 0 ? (item.totalCost / recipeCost) * 100 : 0,
  }));

  // Suggested price with markup (normal)
  const suggestedPrice = recipeCost * finalMarkup;

  // Suggested price for IFood (with markup + IFood tax)
  const suggestedIfoodPrice = suggestedPrice / (1 - ifoodTax);

  // Gross profit (assuming current price = suggested price for calculation)
  const grossProfit = suggestedPrice - recipeCost;

  // CMV (Custo da Mercadoria Vendida) in percentage
  const cmv = suggestedPrice > 0 ? (recipeCost / suggestedPrice) * 100 : 0;

  return {
    recipeCost,
    suggestedPrice,
    suggestedIfoodPrice,
    grossProfit,
    cmv,
    itemsWithPercentage,
  };
};

export const recipeService = {
  // Set the service reference to handle circular dependency
  _setRef: (ref: any) => {
    recipeServiceRef = ref;
  },
  getAll: async (): Promise<Recipe[]> => {
    const response = await api.get<Recipe[]>('/recipes');
    return response.data;
  },

  getById: async (id: string): Promise<Recipe | null> => {
    try {
      const response = await api.get<Recipe>(`/recipes/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Recalculate costs for all recipes (manual sync)
  recalculateAllCosts: async (): Promise<Recipe[]> => {
    const recipes = await recipeService.getAll();
    
    // Optimize: Load all ingredients and business settings once
    const [allIngredients, businessSettings, allStockMovements] = await Promise.all([
      ingredientService.getAll(),
      businessSettingsService.get(),
      stockService.getAll()
    ]);
    
    // Create a map for quick ingredient lookup
    const ingredientsMap = new Map(allIngredients.map(ing => [ing.id, ing]));
    
    // Create a map for stock movements by ingredient (for monthly average calculation)
    const movementsByIngredient = new Map<string, typeof allStockMovements>();
    allStockMovements.forEach(mov => {
      if (!movementsByIngredient.has(mov.ingredientId)) {
        movementsByIngredient.set(mov.ingredientId, []);
      }
      movementsByIngredient.get(mov.ingredientId)!.push(mov);
    });
    
    // Helper function to calculate monthly average cost (inlined to avoid extra requests)
    const getMonthlyAverageCost = (ingredientId: string): number | undefined => {
      const movements = movementsByIngredient.get(ingredientId) || [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentMovements = movements.filter((m) => {
        const movementDate = new Date(m.date);
        return (
          m.type === 'IN' &&
          m.unitCost !== undefined &&
          m.unitCost !== null &&
          movementDate >= thirtyDaysAgo &&
          movementDate <= now
        );
      });
      
      if (recentMovements.length === 0) {
        return undefined;
      }
      
      let totalCost = 0;
      let totalQuantity = 0;
      for (const movement of recentMovements) {
        if (movement.unitCost !== undefined && movement.unitCost !== null) {
          totalCost += movement.quantity * movement.unitCost;
          totalQuantity += movement.quantity;
        }
      }
      
      if (totalQuantity === 0) {
        return undefined;
      }
      
      return totalCost / totalQuantity;
    };
    
    // Helper function to calculate item cost (optimized, no extra requests)
    const calculateItemCostOptimized = async (
      item: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'>,
      processedRecipes: Map<string, Recipe> = new Map()
    ): Promise<{ unitCost: number; totalCost: number }> => {
      try {
        // Check if it's a product (recipe) - use processed recipes cache to avoid recursion
        if (processedRecipes.has(item.ingredientId)) {
          const recipe = processedRecipes.get(item.ingredientId)!;
          const unitCost = recipe.recipeCost;
          const totalCost = unitCost * item.netQuantity;
          return { unitCost, totalCost };
        }
        
        // Try to get recipe from database (only if not in cache)
        const recipe = recipeServiceRef ? await recipeServiceRef.getById(item.ingredientId) : null;
        if (recipe) {
          const unitCost = recipe.recipeCost;
          const totalCost = unitCost * item.netQuantity;
          return { unitCost, totalCost };
        }

        // It's an ingredient - use cached data
        const ingredient = ingredientsMap.get(item.ingredientId);
        if (!ingredient) {
          return { unitCost: 0, totalCost: 0 };
        }

        let baseUnitCost: number;
        if (businessSettings.costCalculationMethod === 'monthly_average') {
          const monthlyAvgCost = getMonthlyAverageCost(item.ingredientId);
          baseUnitCost = monthlyAvgCost !== undefined ? monthlyAvgCost : ingredient.finalValue;
        } else {
          baseUnitCost = ingredient.finalValue;
        }

        const unitCost = baseUnitCost * item.correctionFactor;
        const totalCost = unitCost * item.netQuantity;

        return { unitCost, totalCost };
      } catch (error) {
        console.error('Error calculating recipe item cost:', error);
        return { unitCost: 0, totalCost: 0 };
      }
    };
    
    // Process recipes in order (to handle dependencies)
    const processedRecipes = new Map<string, Recipe>();
    const recalculatedRecipes: Recipe[] = [];
    
    for (const recipe of recipes) {
      // Recalculate costs for all items
      const itemsWithCosts: RecipeItem[] = await Promise.all(
        recipe.items.map(async (item) => {
          const costs = await calculateItemCostOptimized(item, processedRecipes);
          return {
            ...item,
            ...costs,
          };
        })
      );

      // Calculate recipe metrics
      const metrics = await calculateRecipeMetrics(itemsWithCosts, recipe.markup);

      const recalculatedRecipe: Recipe = {
        ...recipe,
        items: metrics.itemsWithPercentage,
        recipeCost: metrics.recipeCost,
        suggestedPrice: metrics.suggestedPrice,
        suggestedIfoodPrice: metrics.suggestedIfoodPrice,
        grossProfit: metrics.grossProfit,
        cmv: metrics.cmv,
      };
      
      processedRecipes.set(recipe.id, recalculatedRecipe);
      recalculatedRecipes.push(recalculatedRecipe);
      
      // Update recipe in database with recalculated costs
      await api.put<Recipe>(`/recipes/${recipe.id}`, {
        ...recipe,
        items: recalculatedRecipe.items,
        recipeCost: recalculatedRecipe.recipeCost,
        suggestedPrice: recalculatedRecipe.suggestedPrice,
        suggestedIfoodPrice: recalculatedRecipe.suggestedIfoodPrice,
        grossProfit: recalculatedRecipe.grossProfit,
        cmv: recalculatedRecipe.cmv,
        updatedAt: new Date().toISOString(),
      });
    }
    
    return recalculatedRecipes;
  },

  create: async (data: RecipeFormData): Promise<Recipe> => {
    // Calculate costs for all items
    const itemsWithCosts: RecipeItem[] = await Promise.all(
      data.items.map(async (item, index) => {
        const costs = await calculateRecipeItemCost(item);
        // Try to get ingredient first, then recipe (product)
        let ingredient = await ingredientService.getById(item.ingredientId);
        let recipe = null;
        if (!ingredient) {
          recipe = await recipeService.getById(item.ingredientId);
        }
        return {
          id: `${Date.now()}-${index}`,
          ...item,
          ingredientCode: item.ingredientCode || ingredient?.code || recipe?.code || '',
          ingredientName: item.ingredientName || ingredient?.name || recipe?.name || '',
          ...costs,
        };
      })
    );

    // Calculate recipe metrics
    const metrics = await calculateRecipeMetrics(itemsWithCosts, data.markup);

    const businessSettings = await businessSettingsService.get();
    const finalMarkup = data.markup || businessSettings.markup;

    const recipe: Omit<Recipe, 'id'> = {
      code: data.code,
      name: data.name,
      description: data.description,
      isProduct: data.isProduct,
      lossPercentage: data.lossPercentage,
      items: metrics.itemsWithPercentage,
      markup: finalMarkup,
      recipeCost: metrics.recipeCost,
      suggestedPrice: metrics.suggestedPrice,
      suggestedIfoodPrice: metrics.suggestedIfoodPrice,
      currentPrice: data.currentPrice || metrics.suggestedPrice,
      currentIfoodPrice: data.currentIfoodPrice || metrics.suggestedIfoodPrice,
      isCombo: data.isCombo || false,
      grossProfit: metrics.grossProfit,
      cmv: metrics.cmv,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response = await api.post<Recipe>('/recipes', recipe);
    return response.data;
  },

  update: async (id: string, data: RecipeFormData): Promise<Recipe> => {
    // Calculate costs for all items
    const itemsWithCosts: RecipeItem[] = await Promise.all(
      data.items.map(async (item, index) => {
        const costs = await calculateRecipeItemCost(item);
        // Try to get ingredient first, then recipe (product)
        let ingredient = await ingredientService.getById(item.ingredientId);
        let recipe = null;
        if (!ingredient) {
          recipe = await recipeService.getById(item.ingredientId);
        }
        return {
          id: `${Date.now()}-${index}`,
          ...item,
          ingredientCode: item.ingredientCode || ingredient?.code || recipe?.code || '',
          ingredientName: item.ingredientName || ingredient?.name || recipe?.name || '',
          ...costs,
        };
      })
    );

    // Calculate recipe metrics
    const metrics = await calculateRecipeMetrics(itemsWithCosts, data.markup);

    const businessSettings = await businessSettingsService.get();
    const finalMarkup = data.markup || businessSettings.markup;

    const recipe: Partial<Recipe> = {
      code: data.code,
      name: data.name,
      description: data.description,
      isProduct: data.isProduct,
      lossPercentage: data.lossPercentage,
      items: metrics.itemsWithPercentage,
      markup: finalMarkup,
      recipeCost: metrics.recipeCost,
      suggestedPrice: metrics.suggestedPrice,
      suggestedIfoodPrice: metrics.suggestedIfoodPrice,
      currentPrice: data.currentPrice || metrics.suggestedPrice,
      currentIfoodPrice: data.currentIfoodPrice || metrics.suggestedIfoodPrice,
      isCombo: data.isCombo || false,
      grossProfit: metrics.grossProfit,
      cmv: metrics.cmv,
      updatedAt: new Date().toISOString(),
    };

    const response = await api.put<Recipe>(`/recipes/${id}`, recipe);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/recipes/${id}`);
  },

  // Get products that can be used in other recipes
  getAvailableProducts: async (): Promise<Recipe[]> => {
    const allRecipes = recipeServiceRef ? await recipeServiceRef.getAll() : [];
    return allRecipes.filter((recipe: Recipe) => recipe.isProduct);
  },
};

// Set the reference to avoid circular dependency
recipeService._setRef(recipeService);

