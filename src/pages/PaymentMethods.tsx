import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { PaymentMethod, PaymentMethodFormData, PaymentMethodType } from '../types/paymentMethod';
import { paymentMethodService } from '../services/paymentMethodService';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCheckCircle, MdClose } from 'react-icons/md';

type SortField = 'name' | 'type' | 'isActive';
type SortDirection = 'asc' | 'desc';

export function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    name: '',
    type: 'maquininha',
    creditFee: undefined,
    debitFee: undefined,
    processingFeePercentage: undefined,
    requiresChange: false,
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await paymentMethodService.getAll();
      setMethods(data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedMethods = useMemo(() => {
    let filtered = methods;

    if (searchTerm) {
      filtered = methods.filter((method) =>
        method.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        method.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | boolean = '';
      let bValue: string | boolean = '';

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'isActive':
          aValue = a.isActive;
          bValue = b.isActive;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        if (aValue === bValue) return 0;
        return sortDirection === 'asc' ? (aValue ? -1 : 1) : (aValue ? 1 : -1);
      }
      return 0;
    });

    return sorted;
  }, [methods, searchTerm, sortField, sortDirection]);

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

  const handleEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setFormData({
      name: method.name,
      type: method.type,
      creditFee: method.creditFee,
      debitFee: method.debitFee,
      processingFeePercentage: method.processingFeePercentage,
      receivingDays: method.receivingDays,
      requiresChange: method.requiresChange,
      isActive: method.isActive,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      type: 'maquininha',
      creditFee: undefined,
      debitFee: undefined,
      processingFeePercentage: undefined,
      receivingDays: undefined,
      requiresChange: false,
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await paymentMethodService.update(editingId, formData);
      } else {
        await paymentMethodService.create(formData);
      }
      await loadData();
      handleCancel();
    } catch (error) {
      console.error('Error saving payment method:', error);
      alert('Erro ao salvar forma de pagamento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) {
      return;
    }
    try {
      await paymentMethodService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      alert('Erro ao excluir forma de pagamento');
    }
  };

  const getTypeLabel = (type: PaymentMethodType) => {
    const labels: Record<PaymentMethodType, string> = {
      maquininha: 'Maquininha',
      dinheiro: 'Dinheiro',
      outro: 'Outro',
    };
    return labels[type];
  };

  const isMaquininha = formData.type === 'maquininha';

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Formas de Pagamento</h1>
            <p className="text-gray-600">Gerencie as formas de pagamento e taxas das maquininhas</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <MdAdd className="w-5 h-5" />
            Nova Forma de Pagamento
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: Stone - Crédito, PIX, Dinheiro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PaymentMethodType })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="maquininha">Maquininha</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                {/* Campos específicos para maquininhas */}
                {isMaquininha && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Taxa de Crédito (%) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.creditFee || ''}
                        onChange={(e) => setFormData({ ...formData, creditFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                        required={isMaquininha}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 3.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Taxa de Débito (%) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.debitFee || ''}
                        onChange={(e) => setFormData({ ...formData, debitFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                        required={isMaquininha}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 2.99"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Taxa de Processamento PIX (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.processingFeePercentage || ''}
                        onChange={(e) => setFormData({ ...formData, processingFeePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 0.99"
                      />
                      <p className="text-xs text-gray-500 mt-1">Taxa para pagamentos via PIX na maquininha</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prazo de Recebimento (dias)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.receivingDays || ''}
                        onChange={(e) => setFormData({ ...formData, receivingDays: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex: 30 para crédito, 1 para débito"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dias para recebimento após a data da venda (ex: 30 dias para crédito, 1 dia para débito)</p>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 flex flex-col gap-3">
                  {formData.type === 'dinheiro' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requiresChange}
                        onChange={(e) => setFormData({ ...formData, requiresChange: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Requer Troco
                      </span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Forma de Pagamento Ativa
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <MdCheckCircle className="w-5 h-5" />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
                >
                  <MdClose className="w-5 h-5" />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou tipo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <MdSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
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
              {filteredAndSortedMethods.length} de {methods.length} forma{filteredAndSortedMethods.length !== 1 ? 's' : ''}
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
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Nome
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Tipo
                      <SortIcon field="type" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Taxa Crédito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Taxa Débito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Taxa PIX (%)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Prazo Recebimento
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('isActive')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Ativa
                      <SortIcon field="isActive" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedMethods.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'Nenhuma forma de pagamento encontrada.' : 'Nenhuma forma de pagamento cadastrada.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedMethods.map((method) => (
                    <tr key={method.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{method.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getTypeLabel(method.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {method.creditFee !== undefined ? `${method.creditFee.toFixed(2)}%` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {method.debitFee !== undefined ? `${method.debitFee.toFixed(2)}%` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {method.processingFeePercentage !== undefined ? `${method.processingFeePercentage.toFixed(2)}%` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {method.receivingDays !== undefined ? `${method.receivingDays} dia${method.receivingDays !== 1 ? 's' : ''}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {method.isActive ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Sim
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Não
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(method)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(method.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
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

