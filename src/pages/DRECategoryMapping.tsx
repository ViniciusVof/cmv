import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import type { DRECategoryMapping, DRECategoryMappingFormData } from '../types/dre';
import { dreCategoryMappingService } from '../services/dreCategoryMappingService';
import { accountPayableService } from '../services/accountPayableService';
import { fixedCostService } from '../services/fixedCostService';
import { variableCostService } from '../services/variableCostService';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category';
import type { AccountPayable } from '../types/accountPayable';
import type { FixedCost } from '../types/fixedCost';
import type { VariableCost } from '../types/variableCost';
import {
  MdAdd,
  MdDelete,
  MdSearch,
  MdLink,
  MdAttachMoney,
  MdTrendingUp,
  MdTrendingDown,
} from 'react-icons/md';
import { notifySuccess, notifyError } from '../stores/notificationStore';
import { useDialogStore } from '../stores/dialogStore';

export function DRECategoryMapping() {
  const [mappings, setMappings] = useState<DRECategoryMapping[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<DRECategoryMappingFormData>({
    categoryId: '',
  });
  const [mappingType, setMappingType] = useState<'fixedCost' | 'variableCost' | 'payable' | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'fixedCost' | 'variableCost' | 'payable'>('all');
  const { openConfirm } = useDialogStore();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mappingsData, payablesData, fixedCostsData, variableCostsData, categoriesData] = await Promise.all([
        dreCategoryMappingService.getAll(),
        accountPayableService.getAll(),
        fixedCostService.getAll(),
        variableCostService.getAll(),
        categoryService.getAll(),
      ]);
      setMappings(mappingsData);
      setPayables(payablesData);
      setFixedCosts(fixedCostsData);
      setVariableCosts(variableCostsData);
      setCategories(categoriesData);
    } catch (error) {
      notifyError('Erro ao carregar conciliação de categorias');
    } finally {
      setLoading(false);
    }
  };

  // Not used anymore but kept for future filtering if needed
  // const filteredMappings = useMemo(() => { ... }, [mappings, searchTerm, typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !mappingType || !selectedItemId) {
      notifyError('Selecione todos os campos obrigatórios');
      return;
    }

    try {
      let description = '';

      if (mappingType === 'fixedCost') {
        const cost = fixedCosts.find((c) => String(c.id) === selectedItemId);
        if (cost) {
          description = `Custo Fixo: ${cost.name}`;
        }
      } else if (mappingType === 'variableCost') {
        const cost = variableCosts.find((c) => String(c.id) === selectedItemId);
        if (cost) {
          description = `Custo Variável: ${cost.name}`;
        }
      } else if (mappingType === 'payable') {
        const payable = payables.find((p) => String(p.id) === selectedItemId);
        if (payable) {
          description = payable.description;
          formData.accountPayableId = payable.id;
        }
      }

      await dreCategoryMappingService.create({
        ...formData,
        description,
      });
      notifySuccess('Conciliação criada com sucesso');
      setShowForm(false);
      setFormData({ categoryId: '' });
      setMappingType(null);
      setSelectedItemId(null);
      loadData();
    } catch (error) {
      notifyError('Erro ao criar conciliação');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await openConfirm({
      message: 'Tem certeza que deseja excluir esta conciliação?',
    });
    if (!confirmed) return;

    try {
      await dreCategoryMappingService.delete(id);
      notifySuccess('Conciliação excluída com sucesso');
      loadData();
    } catch (error) {
      notifyError('Erro ao excluir conciliação');
    }
  };

  // Not used anymore
  // const getCategoryName = (categoryId?: string) => { ... };

  // Verificar quais custos já foram mapeados
  const mappedFixedCosts = new Set(
    mappings.filter((m) => m.description?.includes('Custo Fixo')).map((m) => {
      const match = m.description?.match(/Custo Fixo: (.+)/);
      return match ? match[1] : null;
    })
  );

  const mappedVariableCosts = new Set(
    mappings.filter((m) => m.description?.includes('Custo Variável')).map((m) => {
      const match = m.description?.match(/Custo Variável: (.+)/);
      return match ? match[1] : null;
    })
  );

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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Conciliação DRE</h1>
          <p className="mt-2 text-gray-600">Vincule custos fixos, variáveis e contas a pagar às categorias do DRE</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por categoria ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">Todos</option>
                <option value="fixedCost">Custos Fixos</option>
                <option value="variableCost">Custos Variáveis</option>
                <option value="payable">Contas a Pagar</option>
              </select>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setFormData({ categoryId: '' });
                setMappingType(null);
                setSelectedItemId(null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MdAdd className="w-5 h-5" />
              Nova Conciliação
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Nova Conciliação</h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Item *
                      </label>
                      <select
                        value={mappingType || ''}
                        onChange={(e) => {
                          setMappingType(e.target.value as any);
                          setSelectedItemId(null);
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Selecione um tipo</option>
                        <option value="fixedCost">Custo Fixo</option>
                        <option value="variableCost">Custo Variável</option>
                        <option value="payable">Conta a Pagar</option>
                      </select>
                    </div>
                    {mappingType === 'fixedCost' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custo Fixo *
                        </label>
                        <select
                          value={selectedItemId || ''}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Selecione um custo fixo</option>
                          {fixedCosts
                            .filter((c) => !mappedFixedCosts.has(c.name))
                            .map((cost) => (
                              <option key={cost.id} value={cost.id}>
                                {cost.name} - {formatCurrency(cost.value || 0)}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    {mappingType === 'variableCost' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custo Variável *
                        </label>
                        <select
                          value={selectedItemId || ''}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Selecione um custo variável</option>
                          {variableCosts
                            .filter((c) => !mappedVariableCosts.has(c.name))
                            .map((cost) => (
                              <option key={cost.id} value={cost.id}>
                                {cost.name} - {cost.percentage || 0}%
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    {mappingType === 'payable' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Conta a Pagar *
                        </label>
                        <select
                          value={selectedItemId || ''}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Selecione uma conta a pagar</option>
                          {payables
                            .filter((p) => p.status === 'paid')
                            .map((payable) => (
                              <option key={payable.id} value={payable.id}>
                                {payable.description} - {formatCurrency(payable.amount)} -{' '}
                                {formatDate(payable.dueDate)}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Selecione uma categoria</option>
                        {categories
                          .filter((c) => c.isActive && c.type === 'expense')
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setFormData({ categoryId: '' });
                        setMappingType(null);
                        setSelectedItemId(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tables */}
        <div className="space-y-6">
          {/* Custos Fixos */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <MdTrendingDown className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Custos Fixos Mapeados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Custo Fixo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings
                    .filter((m) => m.description?.includes('Custo Fixo'))
                    .length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhum custo fixo mapeado
                      </td>
                    </tr>
                  ) : (
                    mappings
                      .filter((m) => m.description?.includes('Custo Fixo'))
                      .map((mapping) => {
                        const match = mapping.description?.match(/Custo Fixo: (.+)/);
                        const costName = match ? match[1] : mapping.description || '—';
                        const cost = fixedCosts.find((c) => c.name === costName);
                        return (
                          <tr key={mapping.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{costName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mapping.categoryName || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(cost?.value || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDelete(mapping.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir"
                              >
                                <MdDelete className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Custos Variáveis */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <MdTrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Custos Variáveis Mapeados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Custo Variável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porcentagem
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings
                    .filter((m) => m.description?.includes('Custo Variável'))
                    .length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhum custo variável mapeado
                      </td>
                    </tr>
                  ) : (
                    mappings
                      .filter((m) => m.description?.includes('Custo Variável'))
                      .map((mapping) => {
                        const match = mapping.description?.match(/Custo Variável: (.+)/);
                        const costName = match ? match[1] : mapping.description || '—';
                        const cost = variableCosts.find((c) => c.name === costName);
                        return (
                          <tr key={mapping.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{costName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mapping.categoryName || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {cost?.percentage || 0}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDelete(mapping.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir"
                              >
                                <MdDelete className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contas a Pagar */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <MdAttachMoney className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Contas a Pagar Mapeadas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings.filter((m) => !!m.accountPayableId).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma conta a pagar mapeada
                      </td>
                    </tr>
                  ) : (
                    mappings
                      .filter((m) => !!m.accountPayableId)
                      .map((mapping) => {
                        const payable = payables.find((p) => String(p.id) === String(mapping.accountPayableId));
                        return (
                          <tr key={mapping.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.description || '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mapping.categoryName || '—'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(payable?.amount || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <a
                                  href="/financeiro/contas-a-pagar"
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Ver conta"
                                >
                                  <MdLink className="w-5 h-5" />
                                </a>
                                <button
                                  onClick={() => handleDelete(mapping.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Excluir"
                                >
                                  <MdDelete className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
