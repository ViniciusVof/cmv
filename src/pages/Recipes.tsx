import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { Recipe, RecipeFormData, RecipeItem } from '../types/recipe';
import type { Ingredient } from '../types/ingredient';
import { recipeService } from '../services/recipeService';
import { ingredientService } from '../services/ingredientService';
import { businessSettingsService } from '../services/businessSettingsService';
import { variableCostService } from '../services/variableCostService';

type SortField = 'code' | 'name' | 'recipeCost' | 'suggestedPrice' | 'cmv';
type SortDirection = 'asc' | 'desc';

export function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Recipe[]>([]);
  const [variableCostsTotal, setVariableCostsTotal] = useState<number>(0);
  const [ifoodTax, setIfoodTax] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RecipeFormData>({
    code: '',
    name: '',
    description: '',
    isProduct: true, // Todos os produtos podem ser usados
    lossPercentage: undefined,
    items: [],
    markup: undefined,
    currentPrice: undefined,
    currentIfoodPrice: undefined,
    isCombo: false,
  });
  const [previewMetrics, setPreviewMetrics] = useState<{
    suggestedPrice: number;
    suggestedIfoodPrice: number;
    cmv: number;
    recipeCost: number;
    safeRecipeCost: number;
  } | null>(null);
  const [itemInput, setItemInput] = useState('');
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'ingredient' | 'product'; id: string; name: string; unit?: string; correctionFactor?: number } | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(0);
  const [quantityInput, setQuantityInput] = useState('');
  const [quantityUnit, setQuantityUnit] = useState<'kg' | 'g'>('kg');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Generate next code automatically
  const generateNextCode = useMemo(() => {
    if (recipes.length === 0) return '1';
    const codes = recipes.map((r) => parseInt(r.code)).filter((code) => !isNaN(code));
    if (codes.length === 0) return '1';
    const maxCode = Math.max(...codes);
    return (maxCode + 1).toString();
  }, [recipes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recipesData, ingredientsData, productsData, variableCosts, businessSettings] = await Promise.all([
        recipeService.getAll(),
        ingredientService.getAll(),
        recipeService.getAvailableProducts(),
        variableCostService.getAll(),
        businessSettingsService.get(),
      ]);
      setRecipes(recipesData);
      setIngredients(ingredientsData);
      setAvailableProducts(productsData);
      const totalVariableCosts = variableCosts.reduce((sum, cost) => sum + cost.percentage, 0);
      setVariableCostsTotal(totalVariableCosts);
      setIfoodTax(businessSettings.ifoodTaxPercentage);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update code when showing form for new recipe
  useEffect(() => {
    if (showForm && !editingId) {
      setFormData((prev) => ({
        ...prev,
        code: generateNextCode,
      }));
    }
  }, [showForm, editingId, generateNextCode]);

  // Combined items for autocomplete (ingredients + products)
  const combinedItems = useMemo(() => {
    const ingredientItems = ingredients.map((ing) => ({
      type: 'ingredient' as const,
      id: ing.id,
      code: ing.code,
      name: ing.name,
      unit: ing.unit,
      correctionFactor: ing.correctionFactor,
      displayValue: `${ing.code} - ${ing.name}`,
    }));

    const productItems = availableProducts.map((prod) => ({
      type: 'product' as const,
      id: prod.id,
      code: prod.code,
      name: prod.name,
      unit: 'UN',
      correctionFactor: 1.0,
      displayValue: `${prod.code} - ${prod.name} (Produto)`,
    }));

    return [...ingredientItems, ...productItems];
  }, [ingredients, availableProducts]);

  // Filter items for autocomplete
  const filteredItems = useMemo(() => {
    if (!itemInput.trim()) return combinedItems.slice(0, 10);
    return combinedItems
      .filter((item) =>
        item.displayValue.toLowerCase().includes(itemInput.toLowerCase()) ||
        item.code.toLowerCase().includes(itemInput.toLowerCase())
      )
      .slice(0, 10);
  }, [combinedItems, itemInput]);

  const handleItemSelect = (item: typeof combinedItems[0]) => {
    setSelectedItem({
      type: item.type,
      id: item.id,
      name: item.displayValue,
      unit: item.unit,
      correctionFactor: item.correctionFactor,
    });
    setItemInput(item.displayValue);
    setShowItemSuggestions(false);
  };

  const handleAddItem = async () => {
    if (!selectedItem) {
      alert('Selecione um item');
      return;
    }

    // Calculate quantity based on input and unit
    let finalQuantity = newItemQuantity;
    if (quantityInput) {
      const inputValue = parseFloat(quantityInput.replace(',', '.'));
      if (isNaN(inputValue) || inputValue <= 0) {
        alert('Informe uma quantidade válida');
        return;
      }
      // Convert grams to kg if needed
      if (quantityUnit === 'g' && (selectedItem.unit === 'KG' || selectedItem.unit?.toUpperCase() === 'KG')) {
        finalQuantity = inputValue / 1000; // Convert grams to kg
      } else {
        finalQuantity = inputValue;
      }
    }

    if (finalQuantity <= 0) {
      alert('Informe a quantidade');
      return;
    }

    if (selectedItem.type === 'ingredient') {
      const ingredient = ingredients.find((ing) => ing.id === selectedItem.id);
      if (!ingredient) return;

      const newItem: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'> = {
        ingredientId: ingredient.id,
        ingredientCode: ingredient.code,
        ingredientName: ingredient.name,
        netQuantity: finalQuantity,
        unit: selectedItem.unit || ingredient.unit,
        correctionFactor: selectedItem.correctionFactor || ingredient.correctionFactor,
      };

      const updatedFormData = {
        ...formData,
        items: [...formData.items, newItem],
      };
      setFormData(updatedFormData);
      
      // Update preview metrics after state update
      setTimeout(() => {
        updatePreviewMetrics();
      }, 0);
    } else {
      // Product type
      const product = availableProducts.find((p) => p.id === selectedItem.id);
      if (!product) return;

      const newItem: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'> = {
        ingredientId: product.id,
        ingredientCode: product.code,
        ingredientName: product.name,
        netQuantity: finalQuantity,
        unit: 'UN',
        correctionFactor: 1.0,
      };

      const updatedFormData = {
        ...formData,
        items: [...formData.items, newItem],
      };
      setFormData(updatedFormData);
      
      // Update preview metrics after state update
      setTimeout(() => {
        updatePreviewMetrics();
      }, 0);
    }

    // Reset form
    setSelectedItem(null);
    setItemInput('');
    setNewItemQuantity(0);
    setQuantityInput('');
    setQuantityUnit('kg');
  };

  // Calculate preview metrics when items change
  const calculateItemCost = async (
    item: Omit<RecipeItem, 'id' | 'unitCost' | 'totalCost' | 'percentage'>
  ): Promise<{ unitCost: number; totalCost: number }> => {
    try {
      // Check if it's a product (recipe) or an ingredient
      const recipe = await recipeService.getById(item.ingredientId);
      if (recipe) {
        const unitCost = recipe.recipeCost;
        const totalCost = unitCost * item.netQuantity;
        return { unitCost, totalCost };
      }

      // It's an ingredient from stock
      const ingredient = await ingredientService.getById(item.ingredientId);
      if (!ingredient) {
        throw new Error('Ingrediente não encontrado');
      }

      const unitCost = ingredient.finalValue * item.correctionFactor;
      const totalCost = unitCost * item.netQuantity;
      return { unitCost, totalCost };
    } catch (error) {
      console.error('Error calculating recipe item cost:', error);
      return { unitCost: 0, totalCost: 0 };
    }
  };

  const updatePreviewMetrics = async () => {
    if (formData.items.length === 0) {
      setPreviewMetrics(null);
      return;
    }

    try {
      // Calculate costs for all items
      const itemsWithCosts = await Promise.all(
        formData.items.map(async (item) => {
          return await calculateItemCost(item);
        })
      );

      const businessSettings = await businessSettingsService.get();
      const finalMarkup = formData.markup || businessSettings.markup;
      const ifoodTax = businessSettings.ifoodTaxPercentage / 100;
      const recipeCost = itemsWithCosts.reduce((sum, item) => sum + item.totalCost, 0);
      const loss = (formData.lossPercentage || 0) / 100;
      const safeRecipeCost = recipeCost * (1 + loss);
      const suggestedPrice = recipeCost * finalMarkup;

      // Use current price if filled, otherwise use suggested price for IFood calculation
      const basePrice = formData.currentPrice || suggestedPrice;
      const suggestedIfoodPrice = basePrice / (1 - ifoodTax);

      // Calculate CMV based on current price or suggested price
      const priceForCmv = formData.currentPrice || suggestedPrice;
      const cmv = priceForCmv > 0 ? (recipeCost / priceForCmv) * 100 : 0;

      setPreviewMetrics({
        suggestedPrice,
        suggestedIfoodPrice,
        cmv,
        recipeCost,
        safeRecipeCost,
      });
    } catch (error) {
      console.error('Error calculating preview metrics:', error);
    }
  };

  // Recalculate preview when items, markup, or current price change
  useEffect(() => {
    if (showForm && formData.items.length > 0) {
      const timer = setTimeout(() => {
        updatePreviewMetrics();
      }, 100);
      return () => clearTimeout(timer);
    } else if (showForm && formData.items.length === 0) {
      setPreviewMetrics(null);
    }
  }, [JSON.stringify(formData.items), formData.markup, formData.currentPrice, showForm]);

  const handleRemoveItem = (index: number) => {
    const updatedFormData = {
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    };
    setFormData(updatedFormData);
    
    // Update preview metrics after state update
    setTimeout(() => {
      updatePreviewMetrics();
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Adicione pelo menos um item à receita');
      return;
    }

    try {
      if (editingId) {
        await recipeService.update(editingId, formData);
      } else {
        await recipeService.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        code: generateNextCode,
        name: '',
        description: '',
        isProduct: true,
        lossPercentage: undefined,
        items: [],
        markup: undefined,
        currentPrice: undefined,
        currentIfoodPrice: undefined,
        isCombo: false,
      });
      setSelectedItem(null);
      setItemInput('');
      setNewItemQuantity(0);
      setQuantityInput('');
      setQuantityUnit('kg');
      setPreviewMetrics(null);
      loadData();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Erro ao salvar ficha técnica');
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData({
      code: recipe.code,
      name: recipe.name,
      description: recipe.description || '',
      isProduct: true, // Todos os produtos podem ser usados
      lossPercentage: recipe.lossPercentage,
      items: recipe.items.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientCode: item.ingredientCode,
        ingredientName: item.ingredientName,
        netQuantity: item.netQuantity,
        unit: item.unit,
        correctionFactor: item.correctionFactor,
      })),
      markup: recipe.markup,
      currentPrice: recipe.currentPrice,
      currentIfoodPrice: recipe.currentIfoodPrice,
      isCombo: recipe.isCombo,
    });
    setEditingId(recipe.id);
    setShowForm(true);
    // Load preview metrics when editing
    setTimeout(() => {
      updatePreviewMetrics();
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha técnica?')) {
      return;
    }

    try {
      await recipeService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Erro ao excluir ficha técnica');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
      setFormData({
        code: generateNextCode,
        name: '',
        description: '',
        isProduct: true,
        lossPercentage: undefined,
        items: [],
        markup: undefined,
        currentPrice: undefined,
        currentIfoodPrice: undefined,
        isCombo: false,
      });
      setSelectedItem(null);
      setItemInput('');
      setNewItemQuantity(0);
      setQuantityInput('');
      setQuantityUnit('kg');
      setPreviewMetrics(null);
  };

  // Filter and sort recipes
  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = recipes;

    if (searchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'recipeCost':
          aValue = a.recipeCost;
          bValue = b.recipeCost;
          break;
        case 'suggestedPrice':
          aValue = a.suggestedPrice;
          bValue = b.suggestedPrice;
          break;
        case 'cmv':
          aValue = a.cmv;
          bValue = b.cmv;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [recipes, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Fichas Técnicas</h1>
            <p className="text-gray-600">Cadastro de receitas e precificação</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Ficha Técnica
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    % de Perda (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.lossPercentage || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lossPercentage: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Add Item Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Adicionar Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insumo ou Produto *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemInput}
                        onChange={(e) => {
                          setItemInput(e.target.value);
                          setShowItemSuggestions(true);
                          if (!e.target.value.trim()) {
                            setSelectedItem(null);
                          }
                        }}
                        onFocus={() => setShowItemSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowItemSuggestions(false), 200);
                        }}
                        placeholder="Digite para buscar insumo ou produto..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      {showItemSuggestions && filteredItems.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                          {filteredItems.map((item) => (
                            <button
                              key={`${item.type}-${item.id}`}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleItemSelect(item);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                            >
                              <div className="font-medium text-gray-900">{item.displayValue}</div>
                              {item.type === 'ingredient' && (
                                <div className="text-xs text-gray-500">
                                  {item.unit} - FAT.C: {item.correctionFactor?.toFixed(2) || '1.00'}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedItem && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-sm text-gray-700">
                          <strong>Selecionado:</strong> {selectedItem.name}
                          {selectedItem.unit && (
                            <span className="ml-2">
                              | Unidade: <strong>{selectedItem.unit}</strong>
                            </span>
                          )}
                          {selectedItem.correctionFactor && (
                            <span className="ml-2">
                              | FAT.C: <strong>{selectedItem.correctionFactor.toFixed(2)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade Líquida *
                    </label>
                    {selectedItem && (selectedItem.unit === 'KG' || selectedItem.unit?.toUpperCase() === 'KG') ? (
                      <div className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={quantityInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9,.-]/g, '');
                            setQuantityInput(value);
                            const numValue = parseFloat(value.replace(',', '.'));
                            if (!isNaN(numValue)) {
                              setNewItemQuantity(numValue);
                            }
                          }}
                          placeholder="Ex: 0,020 ou 20"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${quantityUnit === 'kg' ? 'text-gray-900' : 'text-gray-500'}`}>
                            KG
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newUnit = quantityUnit === 'kg' ? 'g' : 'kg';
                              setQuantityUnit(newUnit);
                              if (quantityInput) {
                                const numValue = parseFloat(quantityInput.replace(',', '.'));
                                if (!isNaN(numValue)) {
                                  if (newUnit === 'g') {
                                    setNewItemQuantity(numValue / 1000);
                                  } else {
                                    setNewItemQuantity(numValue);
                                  }
                                }
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              quantityUnit === 'g' ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                quantityUnit === 'g' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span className={`text-sm font-medium ${quantityUnit === 'g' ? 'text-gray-900' : 'text-gray-500'}`}>
                            G
                          </span>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={quantityInput || newItemQuantity || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQuantityInput(value);
                          setNewItemQuantity(parseFloat(value) || 0);
                        }}
                        required
                        placeholder="Ex: 1 ou 0.5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    )}
                    {selectedItem && (selectedItem.unit === 'KG' || selectedItem.unit?.toUpperCase() === 'KG') && (
                      <p className="mt-1 text-xs text-gray-500">
                        Você pode digitar 0,020 kg ou 20 g
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedItem || (!quantityInput && newItemQuantity <= 0)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Adicionar Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Itens da Receita</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Cód</th>
                            <th className="px-4 py-2 text-left">Ingrediente</th>
                            <th className="px-4 py-2 text-right">Qtd. Líq</th>
                            <th className="px-4 py-2 text-center">Un</th>
                            <th className="px-4 py-2 text-center">FAT.C</th>
                            <th className="px-4 py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item.ingredientCode}</td>
                              <td className="px-4 py-2">{item.ingredientName}</td>
                              <td className="px-4 py-2 text-right">{item.netQuantity}</td>
                              <td className="px-4 py-2 text-center">{item.unit}</td>
                              <td className="px-4 py-2 text-center">{item.correctionFactor.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Precificação</h3>
                
                {/* Cost Cards */}
                {previewMetrics && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Custo da Receita</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(previewMetrics.recipeCost)}</span>
                      </div>
                      <p className="text-xs text-gray-500">Soma dos custos dos itens</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-amber-800">Custo com Segurança</span>
                        <span className="text-lg font-bold text-amber-900">{formatCurrency(previewMetrics.safeRecipeCost)}</span>
                      </div>
                      <p className="text-xs text-amber-700">
                        Aplica % de perda ({(formData.lossPercentage || 0).toFixed(2)}%) sobre o custo da receita
                      </p>
                    </div>
                  </div>
                )}

                {/* Suggested Prices */}
                {previewMetrics && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Preço Sugerido (Normal):</span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(previewMetrics.suggestedPrice)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Custo × Markup (padrão)
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Preço Sugerido (IFood):</span>
                        <span className="text-xl font-bold text-blue-700">
                          {formatCurrency(previewMetrics.suggestedIfoodPrice)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {formData.currentPrice 
                          ? `Preço Normal Praticado ÷ (1 - Taxa IFood)`
                          : `Preço Normal Sugerido ÷ (1 - Taxa IFood)`
                        }
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Praticado (Normal) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.currentPrice || ''}
                      onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) || undefined })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder={previewMetrics ? formatCurrency(previewMetrics.suggestedPrice) : '0.00'}
                    />
                    {previewMetrics && (
                      <p className="mt-1 text-xs text-gray-500">
                        Sugerido: {formatCurrency(previewMetrics.suggestedPrice)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Praticado (IFood) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.currentIfoodPrice || ''}
                      onChange={(e) => setFormData({ ...formData, currentIfoodPrice: parseFloat(e.target.value) || undefined })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder={previewMetrics ? formatCurrency(previewMetrics.suggestedIfoodPrice) : '0.00'}
                    />
                    {previewMetrics && (
                      <p className="mt-1 text-xs text-gray-500">
                        Sugerido: {formatCurrency(previewMetrics.suggestedIfoodPrice)}
                        {formData.currentPrice && (
                          <span className="ml-1 text-green-600">
                            (baseado no preço normal)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* CMV Display */}
                {previewMetrics && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">CMV (Custo da Mercadoria Vendida):</span>
                      <span className="text-xl font-bold text-purple-700">
                        {formatPercentage(previewMetrics.cmv)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.currentPrice 
                        ? `Baseado no preço praticado: ${formatCurrency(formData.currentPrice)}`
                        : `Baseado no preço sugerido: ${formatCurrency(previewMetrics.suggestedPrice)}`
                      }
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isCombo || false}
                      onChange={(e) => setFormData({ ...formData, isCombo: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Este produto é um combo
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total de Fichas</div>
            <div className="text-2xl font-bold text-gray-900">{recipes.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Custo Total</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(recipes.reduce((s, r) => s + (r.recipeCost || 0), 0))}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">CMV Médio</div>
            <div className="text-2xl font-bold text-gray-900">{formatPercentage(recipes.length ? (recipes.reduce((s, r) => s + (r.cmv || 0), 0) / recipes.length) : 0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Maior Custo</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(Math.max(0, ...recipes.map(r => r.recipeCost || 0)))}</div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código ou nome..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Limpar
              </button>
            )}
            <div className="text-sm text-gray-600">
              {filteredAndSortedRecipes.length} de {recipes.length} ficha{filteredAndSortedRecipes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full" style={{ minWidth: 'max-content' }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('code')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Cód
                      <SortIcon field="code" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Produto
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('recipeCost')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Custo Receita
                      <SortIcon field="recipeCost" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Custo c/ Segurança
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Preço Normal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    MC Normal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Lucro Normal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Preço IFood
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    MC IFood
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Lucro IFood
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('cmv')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      CMV
                      <SortIcon field="cmv" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm
                        ? 'Nenhuma ficha técnica encontrada.'
                        : 'Nenhuma ficha técnica cadastrada.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRecipes.map((recipe) => (
                    <tr key={recipe.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{recipe.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{recipe.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(recipe.recipeCost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const loss = (recipe.lossPercentage || 0) / 100;
                          const safe = recipe.recipeCost * (1 + loss);
                          return <div className="text-sm text-gray-900">{formatCurrency(safe)}</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(recipe.currentPrice)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const price = recipe.currentPrice || recipe.suggestedPrice;
                          const variableCostsValue = (price * variableCostsTotal) / 100;
                          const lucroLiquido = price - recipe.recipeCost - variableCostsValue;
                          const mc = price > 0 ? (lucroLiquido / price) * 100 : 0;
                          return <div className="text-sm text-gray-900">{formatPercentage(mc)}</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const price = recipe.currentPrice || recipe.suggestedPrice;
                          const variableCostsValue = (price * variableCostsTotal) / 100;
                          const lucro = price - recipe.recipeCost - variableCostsValue;
                          return <div className="text-sm text-gray-900">{formatCurrency(lucro)}</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(recipe.currentIfoodPrice || recipe.suggestedIfoodPrice)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const price = recipe.currentIfoodPrice || recipe.suggestedIfoodPrice || 0;
                          const ifoodTaxValue = (price * ifoodTax) / 100;
                          const variableCostsValue = (price * variableCostsTotal) / 100;
                          const lucroLiquido = price - recipe.recipeCost - ifoodTaxValue - variableCostsValue;
                          const mc = price > 0 ? (lucroLiquido / price) * 100 : 0;
                          return <div className="text-sm text-gray-900">{formatPercentage(mc)}</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {(() => {
                          const price = recipe.currentIfoodPrice || recipe.suggestedIfoodPrice || 0;
                          const ifoodTaxValue = (price * ifoodTax) / 100;
                          const variableCostsValue = (price * variableCostsTotal) / 100;
                          const lucro = price - recipe.recipeCost - ifoodTaxValue - variableCostsValue;
                          return <div className="text-sm text-gray-900">{formatCurrency(lucro)}</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatPercentage(recipe.cmv)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(recipe)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(recipe.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

