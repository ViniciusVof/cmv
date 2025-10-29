export interface RecipeItem {
  id: string;
  ingredientId: string;
  ingredientCode?: string;
  ingredientName?: string;
  netQuantity: number; // Quantidade líquida
  unit: string; // UND (KG, UN, etc)
  correctionFactor: number; // FAT.C
  unitCost: number; // Custo unitário calculado
  totalCost: number; // Custo total do item
  percentage?: number; // % do custo total
}

export interface Recipe {
  id: string;
  code: string;
  name: string;
  description?: string;
  isProduct: boolean; // Se pode ser usado em outras fichas técnicas
  lossPercentage?: number; // % de perda opcional
  items: RecipeItem[];
  markup: number; // Markup aplicado (ex: 3.00)
  recipeCost: number; // Custo total da receita
  suggestedPrice: number; // Preço sugerido normal (com markup)
  suggestedIfoodPrice: number; // Preço sugerido IFood (com markup + taxa)
  currentPrice: number; // Preço praticado normal
  currentIfoodPrice?: number; // Preço praticado IFood
  isCombo: boolean; // Se é um combo ou não
  grossProfit: number; // Lucro bruto
  cmv: number; // CMV em porcentagem
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeFormData {
  code: string;
  name: string;
  description?: string;
  isProduct: boolean;
  lossPercentage?: number;
  items: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'>[];
  markup?: number;
  currentPrice?: number;
  currentIfoodPrice?: number;
  isCombo?: boolean;
}

