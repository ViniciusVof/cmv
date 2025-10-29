import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { FixedCost, FixedCostFormData } from '../types/fixedCost';
import { fixedCostService } from '../services/fixedCostService';

type SortField = 'name' | 'value' | 'percentage';
type SortDirection = 'asc' | 'desc';

export function FixedCost() {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FixedCostFormData>({
    name: '',
    value: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Filter and sort costs
  const filteredAndSortedCosts = useMemo(() => {
    let filtered = costs;

    // Apply search filter
    if (searchTerm) {
      filtered = costs.filter((cost) =>
        cost.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'value':
          aValue = a.value;
          bValue = b.value;
          break;
        case 'percentage':
          aValue = a.percentage || 0;
          bValue = b.percentage || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [costs, searchTerm, sortField, sortDirection]);

  // Calculate insights
  const insights = useMemo(() => {
    if (costs.length === 0) {
      return {
        highest: null,
        lowest: null,
        average: 0,
        count: 0,
      };
    }

    const sortedByValue = [...costs].sort((a, b) => b.value - a.value);
    const highest = sortedByValue[0];
    const lowest = sortedByValue[sortedByValue.length - 1];
    const average = total / costs.length;

    return {
      highest,
      lowest,
      average,
      count: costs.length,
    };
  }, [costs, total]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [costsData, totalData] = await Promise.all([
        fixedCostService.getAll(),
        fixedCostService.getTotal(),
      ]);
      setCosts(costsData);
      setTotal(totalData);
    } catch (error) {
      console.error('Error loading fixed costs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await fixedCostService.update(editingId, formData);
      } else {
        await fixedCostService.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', value: 0 });
      loadData();
    } catch (error) {
      console.error('Error saving fixed cost:', error);
      alert('Erro ao salvar custo fixo');
    }
  };

  const handleEdit = (cost: FixedCost) => {
    setFormData({ name: cost.name, value: cost.value });
    setEditingId(cost.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este custo fixo?')) {
      return;
    }
    try {
      await fixedCostService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting fixed cost:', error);
      alert('Erro ao excluir custo fixo');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', value: 0 });
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
              Custo Fixo
            </h1>
            <p className="text-gray-600">
              Gerenciamento de custos fixos mensais
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Adicionar Custo
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Custo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Ex: Aluguel, Luz, Água..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Mensal (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
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

        {/* Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700">Maior Custo</h3>
              <span className="text-2xl">📈</span>
            </div>
            {insights.highest ? (
              <>
                <p className="text-lg font-bold text-blue-900">
                  {insights.highest.name}
                </p>
                <p className="text-sm text-blue-700">
                  {formatCurrency(insights.highest.value)} ({formatPercent(insights.highest.percentage || 0)})
                </p>
              </>
            ) : (
              <p className="text-sm text-blue-700">N/A</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700">Menor Custo</h3>
              <span className="text-2xl">📉</span>
            </div>
            {insights.lowest ? (
              <>
                <p className="text-lg font-bold text-green-900">
                  {insights.lowest.name}
                </p>
                <p className="text-sm text-green-700">
                  {formatCurrency(insights.lowest.value)} ({formatPercent(insights.lowest.percentage || 0)})
                </p>
              </>
            ) : (
              <p className="text-sm text-green-700">N/A</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-700">Média</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-lg font-bold text-purple-900">
              {formatCurrency(insights.average)}
            </p>
            <p className="text-sm text-purple-700">
              Por {insights.count} custo{insights.count !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-orange-700">Total Mensal</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-lg font-bold text-orange-900">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-orange-700">100% dos custos</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do custo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
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
              {filteredAndSortedCosts.length} de {costs.length} custo{filteredAndSortedCosts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Fixed Costs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Custo Fixo
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('value')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Valor
                      <SortIcon field="value" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('percentage')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Percentual
                      <SortIcon field="percentage" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCosts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm
                        ? 'Nenhum custo encontrado com esse termo de busca.'
                        : 'Nenhum custo fixo cadastrado.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cost.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(cost.value)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-600">
                        {formatPercent(cost.percentage || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(cost)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">
                      TOTAL
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(total)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-bold text-gray-900">100%</div>
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

