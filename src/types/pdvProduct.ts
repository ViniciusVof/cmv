export interface PdvProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  recipeId: string; // ID da ficha técnica associada
  recipeName?: string; // Nome da receita (para exibição)
  sellingPrice: number; // Preço de venda normal
  ifoodPrice?: number; // Preço no Ifood (opcional)
  isActive: boolean; // Se está disponível para venda
  category?: string; // Categoria do produto
  imageUrl?: string; // URL da imagem
  createdAt?: string;
  updatedAt?: string;
}

export interface PdvProductFormData {
  code: string;
  name: string;
  description?: string;
  recipeId: string; // Pode ser vazio se não houver ficha técnica
  sellingPrice: number;
  ifoodPrice?: number;
  isActive: boolean;
  category?: string;
  imageUrl?: string;
}

