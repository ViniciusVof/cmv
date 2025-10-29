import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import type { Ingredient } from '../types/ingredient';
import type { ReconciliationReportItem } from '../types/reconciliationReport';
import { ingredientService } from '../services/ingredientService';
import { stockService } from '../services/stockService';
import { reconciliationReportService } from '../services/reconciliationReportService';
import { MdCheckCircle, MdClose, MdRefresh } from 'react-icons/md';

interface ReconciliationItem {
  ingredientId: string;
  ingredientName: string;
  ingredientCode: string;
  currentStock: number;
  physicalStock: number;
  unit: string;
  difference: number; // positive = needs IN, negative = needs OUT
}

export function StockReconciliation() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reconciliationDate, setReconciliationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ingredientsData, stockMap] = await Promise.all([
        ingredientService.getAll(),
        stockService.getSummaryAll(),
      ]);
      
      setIngredients(ingredientsData);
      
      // Criar itens de conciliação com estoque atual
      const items: ReconciliationItem[] = ingredientsData.map(ingredient => {
        const stockSummary = stockMap[ingredient.id];
        const currentStock = stockSummary?.quantityOnHand || 0;
        
        return {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          ingredientCode: ingredient.code,
          currentStock,
          physicalStock: currentStock, // Inicializa com estoque atual
          unit: ingredient.unit,
          difference: 0, // Será calculado quando physicalStock mudar
        };
      });
      
      setReconciliationItems(items);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updatePhysicalStock = (ingredientId: string, physicalStock: number) => {
    setReconciliationItems(items =>
      items.map(item => {
        if (item.ingredientId === ingredientId) {
          const difference = physicalStock - item.currentStock;
          return {
            ...item,
            physicalStock,
            difference,
          };
        }
        return item;
      })
    );
  };

  const resetToCurrentStock = (ingredientId: string) => {
    setReconciliationItems(items =>
      items.map(item => {
        if (item.ingredientId === ingredientId) {
          return {
            ...item,
            physicalStock: item.currentStock,
            difference: 0,
          };
        }
        return item;
      })
    );
  };

  const resetAll = () => {
    setReconciliationItems(items =>
      items.map(item => ({
        ...item,
        physicalStock: item.currentStock,
        difference: 0,
      }))
    );
  };

  const handleSubmit = async () => {
    if (!reconciliationDate) {
      alert('Informe a data da conciliação');
      return;
    }

    // Filtrar apenas itens com diferença
    const itemsToReconcile = reconciliationItems.filter(item => item.difference !== 0);
    
    if (itemsToReconcile.length === 0) {
      alert('Nenhum ajuste necessário. Todos os estoques estão corretos.');
      return;
    }

    const confirmMessage = `Você está prestes a criar ${itemsToReconcile.length} ajuste(s) de estoque.\n\n` +
      itemsToReconcile.map(item => {
        const action = item.difference > 0 ? 'Entrada' : 'Saída';
        return `- ${item.ingredientCode} ${item.ingredientName}: ${action} de ${Math.abs(item.difference)} ${item.unit}`;
      }).join('\n') +
      `\n\nDeseja continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setSaving(true);
    try {
      // Criar movimentações de ajuste
      const movements = await Promise.all(
        itemsToReconcile.map(item => {
          const type: 'IN' | 'OUT' = item.difference > 0 ? 'IN' : 'OUT';
          const quantity = Math.abs(item.difference);
          
          return stockService.create({
            ingredientId: item.ingredientId,
            type,
            quantity,
            // Para ajustes, não há custo unitário (será considerado como ajuste de inventário)
            unitCost: undefined,
            date: reconciliationDate,
            note: `Ajuste de conciliação física - Estoque sistema: ${item.currentStock}, Estoque físico: ${item.physicalStock}`,
          });
        })
      );

      // Atualizar volumes dos ingredientes
      for (const item of itemsToReconcile) {
        const ingredient = ingredients.find(i => i.id === item.ingredientId);
        if (ingredient) {
          const stockSummary = await stockService.getSummaryForIngredient(item.ingredientId);
          if (ingredient.volume !== stockSummary.quantityOnHand) {
            await ingredientService.update(ingredient.id, {
              code: ingredient.code,
              name: ingredient.name,
              pricePaid: ingredient.pricePaid,
              volume: stockSummary.quantityOnHand,
              unit: ingredient.unit,
              correctionFactor: ingredient.correctionFactor,
              supplierId: ingredient.supplierId,
            });
          }
        }
      }

      // Criar relatório da conciliação
      const reportItems: ReconciliationReportItem[] = reconciliationItems.map(item => ({
        ingredientId: item.ingredientId,
        ingredientCode: item.ingredientCode,
        ingredientName: item.ingredientName,
        unit: item.unit,
        systemStock: item.currentStock,
        physicalStock: item.physicalStock,
        difference: item.difference,
        adjustmentType: item.difference > 0 ? 'IN' : item.difference < 0 ? 'OUT' : 'NONE',
      }));

      await reconciliationReportService.create({
        date: reconciliationDate,
        items: reportItems,
        summary: {
          totalItems: stats.total,
          itemsWithDifference: stats.withDifference,
          totalEntries: stats.totalEntries,
          totalExits: stats.totalExits,
        },
      });

      alert(`${movements.length} ajuste(s) de estoque registrado(s) com sucesso!\nRelatório salvo.`);
      
      // Recarregar dados
      await loadData();
    } catch (error) {
      console.error('Error reconciling stock:', error);
      alert('Erro ao realizar conciliação');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar itens por busca
  const filteredItems = reconciliationItems.filter(item =>
    item.ingredientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas
  const stats = {
    total: reconciliationItems.length,
    withDifference: reconciliationItems.filter(item => item.difference !== 0).length,
    totalEntries: reconciliationItems
      .filter(item => item.difference > 0)
      .reduce((sum, item) => sum + item.difference, 0),
    totalExits: reconciliationItems
      .filter(item => item.difference < 0)
      .reduce((sum, item) => sum + Math.abs(item.difference), 0),
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
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Conciliação de Estoque
          </h1>
          <p className="text-gray-600">
            Ajuste as quantidades físicas encontradas no estoque físico
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total de Itens</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Com Diferença</div>
            <div className="text-2xl font-bold text-orange-600">{stats.withDifference}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Entradas Necessárias</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalEntries.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Saídas Necessárias</div>
            <div className="text-2xl font-bold text-red-600">
              {stats.totalExits.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Form Header */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Conciliação *
              </label>
              <input
                type="date"
                value={reconciliationDate}
                onChange={(e) => setReconciliationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2 items-end">
              <button
                onClick={resetAll}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <MdRefresh className="w-5 h-5" />
                Resetar Tudo
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || stats.withDifference === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdCheckCircle className="w-5 h-5" />
                {saving ? 'Salvando...' : 'Aplicar Ajustes'}
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou nome..."
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
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Estoque Sistema
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Estoque Físico
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Diferença
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Nenhum item encontrado' : 'Nenhum ingrediente cadastrado'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.ingredientId}
                      className={`hover:bg-gray-50 ${
                        item.difference !== 0 ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.ingredientCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.ingredientName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {item.currentStock.toFixed(2)} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={item.physicalStock || ''}
                            onChange={(e) =>
                              updatePhysicalStock(
                                item.ingredientId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-32 px-3 py-1 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                          />
                          <span className="text-sm text-gray-500">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.difference === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            OK
                          </span>
                        ) : item.difference > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            +{item.difference.toFixed(2)} {item.unit}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {item.difference.toFixed(2)} {item.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.difference !== 0 && (
                          <button
                            onClick={() => resetToCurrentStock(item.ingredientId)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Resetar para estoque do sistema"
                          >
                            <MdClose className="w-5 h-5" />
                          </button>
                        )}
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

