import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { PdvProduct, PdvProductFormData } from '../types/pdvProduct';
import type { Recipe } from '../types/recipe';
import type { ProductCategory } from '../types/productCategory';
import { pdvProductService } from '../services/pdvProductService';
import { recipeService } from '../services/recipeService';
import { productCategoryService } from '../services/productCategoryService';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';

type SortField = 'code' | 'name' | 'sellingPrice';
type SortDirection = 'asc' | 'desc';

export function PdvProducts() {
  const [products, setProducts] = useState<PdvProduct[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PdvProductFormData>({
    code: '',
    name: '',
    description: '',
    recipeId: '',
    sellingPrice: 0,
    ifoodPrice: undefined,
    isActive: true,
    category: '',
    imageUrl: '',
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, recipesData, categoriesData] = await Promise.all([
        pdvProductService.getAll(),
        recipeService.getAll(),
        productCategoryService.getAll(),
      ]);
      setRecipes(recipesData);
      setCategories(categoriesData.filter(c => c.isActive));
      
      // Atualizar nomes das receitas nos produtos
      // Criar mapa de receitas por ID para busca rápida
      const recipesMap = new Map();
      recipesData.forEach(recipe => {
        // Normalizar ID para string para comparação
        const normalizedId = String(recipe.id);
        recipesMap.set(normalizedId, recipe);
        // Também adicionar com o código da receita caso o recipeId seja o código
        if (recipe.code) {
          recipesMap.set(recipe.code, recipe);
        }
      });
      
      const productsWithRecipeNames = productsData.map(product => {
        if (!product.recipeId || product.recipeId === '') {
          return {
            ...product,
            recipeName: '-',
          };
        }
        
        // Tentar encontrar a receita normalizando o ID
        const productRecipeId = String(product.recipeId);
        const recipe = recipesMap.get(productRecipeId);
        
        if (!recipe) {
          console.warn('Receita não encontrada para produto:', {
            productName: product.name,
            productRecipeId: product.recipeId,
            availableRecipeIds: Array.from(recipesMap.keys()),
          });
        }
        
        return {
          ...product,
          recipeName: recipe?.name || '-',
        };
      });
      setProducts(productsWithRecipeNames);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = products.filter((product) =>
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.recipeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'sellingPrice':
          aValue = a.sellingPrice;
          bValue = b.sellingPrice;
          break;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [products, searchTerm, sortField, sortDirection]);

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

  const generateNextCode = useMemo(() => {
    if (products.length === 0) return '1';
    const codes = products.map((p) => parseInt(p.code)).filter((code) => !isNaN(code));
    if (codes.length === 0) return '1';
    const maxCode = Math.max(...codes);
    return (maxCode + 1).toString();
  }, [products]);

  useEffect(() => {
    if (showForm && !editingId) {
      setFormData((prev) => ({
        ...prev,
        code: generateNextCode,
      }));
    }
  }, [showForm, editingId, generateNextCode]);

  // Filtrar categorias para autocomplete
  const filteredCategories = useMemo(() => {
    if (!categoryInput.trim()) return categories.slice(0, 10);
    return categories
      .filter(cat => cat.name.toLowerCase().includes(categoryInput.toLowerCase()))
      .slice(0, 10);
  }, [categories, categoryInput]);

  const handleCategorySelect = (categoryName: string) => {
    setFormData({ ...formData, category: categoryName });
    setCategoryInput(categoryName);
    setShowCategorySuggestions(false);
  };

  const handleCreateCategory = async () => {
    if (!categoryInput.trim()) {
      alert('Informe o nome da categoria');
      return;
    }

    // Verificar se já existe
    const exists = categories.find(c => c.name.toLowerCase() === categoryInput.toLowerCase());
    if (exists) {
      alert('Categoria já existe');
      setFormData({ ...formData, category: categoryInput });
      setShowCategorySuggestions(false);
      return;
    }

    try {
      await productCategoryService.create({
        name: categoryInput,
        isActive: true,
      });
      await loadData();
      setFormData({ ...formData, category: categoryInput });
      setShowCategorySuggestions(false);
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Erro ao criar categoria');
    }
  };

  const handleEdit = (product: PdvProduct) => {
    setEditingId(product.id);
    setCategoryInput(product.category || '');
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || '',
      recipeId: product.recipeId,
      sellingPrice: product.sellingPrice,
      ifoodPrice: product.ifoodPrice,
      isActive: product.isActive,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setCategoryInput('');
    setShowCategorySuggestions(false);
    setFormData({
      code: '',
      name: '',
      description: '',
      recipeId: '',
      sellingPrice: 0,
      ifoodPrice: undefined,
      isActive: true,
      category: '',
      imageUrl: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await pdvProductService.update(editingId, formData);
      } else {
        await pdvProductService.create(formData);
      }
      await loadData();
      handleCancel();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }
    try {
      await pdvProductService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Erro ao excluir produto');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleRecipeSelect = (recipeId: string) => {
    if (!recipeId || recipeId === '') {
      // Limpar dados quando desmarcar ficha técnica, mas manter valores se já foram preenchidos manualmente
      setFormData({
        ...formData,
        recipeId: '',
      });
      return;
    }

    // Buscar receita - comparar tanto como string quanto número
    const recipe = recipes.find(r => String(r.id) === String(recipeId) || r.id === recipeId);
    if (recipe) {
      setFormData({
        ...formData,
        recipeId: String(recipe.id),
        name: recipe.name, // Nome vem automaticamente
        sellingPrice: recipe.currentPrice || recipe.suggestedPrice,
        ifoodPrice: recipe.currentIfoodPrice || recipe.suggestedIfoodPrice,
      });
    } else {
      console.warn('Receita não encontrada:', recipeId);
    }
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Produtos do PDV
            </h1>
            <p className="text-gray-600">
              Cadastro de produtos para venda no ponto de venda
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <MdAdd className="w-5 h-5" />
            Novo Produto
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Gerado automaticamente</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ficha Técnica (opcional)
                  </label>
                  <select
                    value={formData.recipeId || ''}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      handleRecipeSelect(selectedValue);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecione uma ficha técnica (opcional)</option>
                    {recipes.length > 0 ? (
                      recipes.map((recipe) => (
                        <option key={recipe.id} value={String(recipe.id)}>
                          {recipe.code} - {recipe.name} (Preço: {formatCurrency(recipe.currentPrice || recipe.suggestedPrice)})
                        </option>
                      ))
                    ) : (
                      <option disabled>Nenhuma ficha técnica disponível</option>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Se selecionada, nome e preços serão preenchidos automaticamente
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.recipeId ? 'Preenchido automaticamente da ficha técnica' : 'Digite o nome do produto'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço de Venda *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Ifood (opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.ifoodPrice || ''}
                    onChange={(e) => setFormData({ ...formData, ifoodPrice: parseFloat(e.target.value) || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={categoryInput}
                      onChange={(e) => {
                        setCategoryInput(e.target.value);
                        setShowCategorySuggestions(e.target.value.length > 0);
                        setFormData({ ...formData, category: e.target.value });
                      }}
                      onFocus={() => setShowCategorySuggestions(categoryInput.length > 0 || filteredCategories.length > 0)}
                      onBlur={() => {
                        // Delay para permitir clique no botão criar
                        setTimeout(() => setShowCategorySuggestions(false), 200);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Digite ou selecione uma categoria"
                    />
                    {showCategorySuggestions && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          <>
                            {filteredCategories.map((category) => (
                              <button
                                key={category.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleCategorySelect(category.name);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                              >
                                {category.name}
                              </button>
                            ))}
                            {categoryInput && !filteredCategories.find(c => c.name.toLowerCase() === categoryInput.toLowerCase()) && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleCreateCategory();
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 font-medium border-t border-gray-200"
                              >
                                <MdAdd className="inline w-4 h-4 mr-2" />
                                Criar "{categoryInput}"
                              </button>
                            )}
                          </>
                        ) : categoryInput && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleCreateCategory();
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 font-medium"
                          >
                            <MdAdd className="inline w-4 h-4 mr-2" />
                            Criar "{categoryInput}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {formData.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      Categoria selecionada: <span className="font-medium">{formData.category}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Produto ativo para venda
                    </span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
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

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, nome ou ficha técnica..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
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
                      Nome
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ficha Técnica
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('sellingPrice')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Preço Venda
                      <SortIcon field="sellingPrice" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Preço Ifood
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-gray-500">{product.category}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.recipeName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(product.sellingPrice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-600">
                          {product.ifoodPrice ? formatCurrency(product.ifoodPrice) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {product.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <MdDelete className="w-5 h-5" />
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

