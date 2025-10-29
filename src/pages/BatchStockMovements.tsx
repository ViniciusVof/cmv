import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import type { Ingredient } from '../types/ingredient';
import type { Supplier } from '../types/supplier';
import { ingredientService } from '../services/ingredientService';
import { supplierService } from '../services/supplierService';
import { stockService } from '../services/stockService';
import { MdAdd, MdRemove, MdDelete, MdCheckCircle, MdClose, MdDescription } from 'react-icons/md';

interface BatchMovementItem {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unitCost: number;
  unit?: string;
  type: 'IN' | 'OUT';
}

export function BatchStockMovements() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementItems, setMovementItems] = useState<BatchMovementItem[]>([]);
  const [movementDate, setMovementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [ingredientSearch, setIngredientSearch] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [stockSummaries, setStockSummaries] = useState<Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }>>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ingredientsData, suppliersData, stockMap] = await Promise.all([
        ingredientService.getAll(),
        supplierService.getAll(),
        stockService.getSummaryAll(),
      ]);
      setIngredients(ingredientsData);
      setSuppliers(suppliersData);
      const summaries: Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }> = {};
      Object.values(stockMap).forEach((s: any) => {
        summaries[s.ingredientId] = { quantityOnHand: s.quantityOnHand, lastEntryUnitCost: s.lastEntryUnitCost };
      });
      setStockSummaries(summaries);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMovementItem = (type: 'IN' | 'OUT') => {
    const newItem: BatchMovementItem = {
      id: Date.now().toString(),
      ingredientId: '',
      quantity: 0,
      unitCost: 0,
      type: type,
    };
    setMovementItems([...movementItems, newItem]);
  };

  const removeMovementItem = (id: string) => {
    setMovementItems(movementItems.filter(item => item.id !== id));
    const newSearch = { ...ingredientSearch };
    delete newSearch[id];
    setIngredientSearch(newSearch);
    const newSuggestions = { ...showSuggestions };
    delete newSuggestions[id];
    setShowSuggestions(newSuggestions);
  };

  const updateMovementItem = (id: string, updates: Partial<BatchMovementItem>) => {
    setMovementItems(movementItems.map(item => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    }));
  };

  const handleIngredientSearch = (itemId: string, searchTerm: string) => {
    setIngredientSearch({ ...ingredientSearch, [itemId]: searchTerm });
    setShowSuggestions({ ...showSuggestions, [itemId]: searchTerm.length > 0 });
  };

  const handleIngredientSelect = (itemId: string, ingredient: Ingredient) => {
    updateMovementItem(itemId, {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      unitCost: 0,
    });
    setIngredientSearch({ ...ingredientSearch, [itemId]: ingredient.name });
    setShowSuggestions({ ...showSuggestions, [itemId]: false });
  };

  const getFilteredIngredients = (itemId: string) => {
    const search = ingredientSearch[itemId] || '';
    if (!search) return [];
    return ingredients.filter(ing =>
      ing.name.toLowerCase().includes(search.toLowerCase()) ||
      ing.code.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  };

  const getTotalValue = () => {
    return movementItems.reduce((total, item) => {
      if (item.quantity > 0 && item.unitCost > 0) {
        return total + (item.quantity * item.unitCost);
      }
      return total;
    }, 0);
  };

  const handleSubmit = async () => {
    // Validação
    if (!movementDate) {
      alert('Informe a data da entrada');
      return;
    }

    if (movementItems.length === 0) {
      alert('Adicione ao menos um item');
      return;
    }

    // Validar itens
    for (const item of movementItems) {
      if (!item.ingredientId || item.quantity <= 0) {
        alert('Preencha todos os campos obrigatórios de todos os itens');
        return;
      }
      if (item.type === 'IN' && item.unitCost <= 0) {
        alert('Informe o custo unitário para itens de entrada');
        return;
      }
      if (item.type === 'OUT') {
        const currentStock = stockSummaries[item.ingredientId]?.quantityOnHand ?? 0;
        if (item.quantity > currentStock) {
          const ingredientName = ingredients.find(i => i.id === item.ingredientId)?.name || 'Item';
          alert(`Estoque insuficiente para ${ingredientName}! Disponível: ${currentStock}, Solicitado: ${item.quantity}`);
          return;
        }
      }
    }

    try {
      // Criar todas as movimentações
      const movements = await Promise.all(
        movementItems.map(item =>
          stockService.create({
            ingredientId: item.ingredientId,
            type: item.type,
            quantity: item.quantity,
            unitCost: item.type === 'IN' ? item.unitCost : undefined,
            date: movementDate,
          })
        )
      );

      // Atualizar volumes dos ingredientes baseado na soma das movimentações
      for (const movement of movements) {
        const ingredient = ingredients.find(i => i.id === movement.ingredientId);
        if (ingredient) {
          const stockSummary = await stockService.getSummaryForIngredient(movement.ingredientId);
          // Atualizar apenas se o volume estiver diferente da soma das movimentações
          if (ingredient.volume !== stockSummary.quantityOnHand) {
            await ingredientService.update(movement.ingredientId, {
              code: ingredient.code,
              name: ingredient.name,
              pricePaid: ingredient.pricePaid,
              volume: stockSummary.quantityOnHand, // Volume = soma de todas as movimentações
              unit: ingredient.unit,
              correctionFactor: ingredient.correctionFactor,
              supplierId: ingredient.supplierId,
            });
          }
        }
      }

      alert(`${movements.length} movimentação(ões) registrada(s) com sucesso!`);
      
      // Limpar formulário
      setMovementItems([]);
      setIngredientSearch({});
      setShowSuggestions({});
      setSupplierId('');
      setMovementDate(new Date().toISOString().split('T')[0]);
      
      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error('Error creating batch movements:', error);
      alert('Erro ao registrar movimentações');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Movimentações em Lote</h1>
          <p className="mt-2 text-gray-600">
            Adicione múltiplos itens de uma vez para importar nota fiscal, fazer conciliação ou registrar saídas de estoque
          </p>
        </div>

        {/* Formulário principal */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Entrada *
              </label>
              <input
                type="date"
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fornecedor (opcional)
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Itens de movimentação */}
          <div className="mb-4">
                                <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Movimentações</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addMovementItem('IN')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <MdAdd className="w-5 h-5" />
                  Adicionar Entrada
                </button>
                <button
                  onClick={() => addMovementItem('OUT')}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <MdRemove className="w-5 h-5" />
                  Adicionar Saída
                </button>
              </div>
            </div>

            {movementItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <MdDescription className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum item adicionado. Clique em "Adicionar Entrada" ou "Adicionar Saída" para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Custo Unitário (R$)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Total
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {movementItems.map((item) => {
                      const filtered = getFilteredIngredients(item.id);
                      const itemTotal = item.type === 'IN' ? (item.quantity * item.unitCost) : 0;
                      const currentStock = item.ingredientId ? (stockSummaries[item.ingredientId]?.quantityOnHand ?? 0) : 0;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 relative">
                            <input
                              type="text"
                              value={ingredientSearch[item.id] || ''}
                              onChange={(e) => handleIngredientSearch(item.id, e.target.value)}
                              onFocus={() => setShowSuggestions({ ...showSuggestions, [item.id]: true })}
                              placeholder="Buscar insumo..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            {item.ingredientId && (
                              <div className="text-xs text-gray-500 mt-1">
                                {item.ingredientName} ({item.unit})
                                {item.type === 'OUT' && (
                                  <span className="ml-2">| Estoque: {currentStock}</span>
                                )}
                              </div>
                            )}
                            {showSuggestions[item.id] && filtered.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filtered.map(ing => (
                                  <button
                                    key={ing.id}
                                    onClick={() => handleIngredientSelect(item.id, ing)}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-900">{ing.name}</div>
                                      <div className="text-xs text-gray-500">Código: {ing.code} | Un: {ing.unit}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-2 rounded text-sm font-medium ${
                                item.type === 'IN' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.type === 'IN' ? 'Entrada' : 'Saída'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              max={item.type === 'OUT' && item.ingredientId ? currentStock : undefined}
                              value={item.quantity || ''}
                              onChange={(e) => updateMovementItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="0"
                            />
                            {item.type === 'OUT' && item.ingredientId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Máx: {currentStock}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {item.type === 'IN' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitCost || ''}
                                onChange={(e) => updateMovementItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="0,00"
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium text-gray-900">
                              {item.type === 'IN' ? formatCurrency(itemTotal) : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeMovementItem(item.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Remover"
                            >
                              <MdDelete className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                        TOTAL:
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(getTotalValue())}
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setMovementItems([]);
                setIngredientSearch({});
                setShowSuggestions({});
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <MdClose className="w-5 h-5" />
              Limpar Tudo
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MdCheckCircle className="w-5 h-5" />
              Registrar Movimentações
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
