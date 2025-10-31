import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { AccountPayable, AccountPayableFormData } from '../types/accountPayable';
import { accountPayableService } from '../services/accountPayableService';
import { supplierService } from '../services/supplierService';
import type { Supplier } from '../types/supplier';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdCalendarToday,
} from 'react-icons/md';
import { notifySuccess, notifyError, confirmAsync } from '../utils/alerts';

type SortField = 'description' | 'amount' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';

export function AccountPayables() {
  const [payables, setPayables] = useState<(AccountPayable & { supplierName?: string })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountPayableFormData>({
    description: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: AccountPayable['status'], dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = status === 'pending' && due < today;

    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (isOverdue || status === 'overdue') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (status: AccountPayable['status'], dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = status === 'pending' && due < today;

    if (status === 'paid') return 'Pago';
    if (isOverdue || status === 'overdue') return 'Vencido';
    return 'Pendente';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payablesData, suppliersData] = await Promise.all([
        accountPayableService.getAll(),
        supplierService.getAll(),
      ]);
      setPayables(payablesData as (AccountPayable & { supplierName?: string })[]);
      setSuppliers(suppliersData);
    } catch (error) {
      notifyError('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPayables = useMemo(() => {
    let filtered = payables;

    // Apply status filter
    if (statusFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => {
        if (statusFilter === 'paid') return p.status === 'paid';
        if (statusFilter === 'overdue') {
          const due = new Date(p.dueDate);
          due.setHours(0, 0, 0, 0);
          return p.status === 'pending' && due < today;
        }
        const due = new Date(p.dueDate);
        due.setHours(0, 0, 0, 0);
        return p.status === 'pending' && due >= today;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [payables, searchTerm, sortField, sortDirection, statusFilter]);

  const insights = useMemo(() => {
    const total = filteredAndSortedPayables.reduce((sum, p) => sum + p.amount, 0);
    const pending = filteredAndSortedPayables.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    const paid = filteredAndSortedPayables.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = filteredAndSortedPayables.filter((p) => {
      if (p.status === 'paid') return false;
      const due = new Date(p.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).reduce((sum, p) => sum + p.amount, 0);

    return { total, pending, paid, overdue };
  }, [filteredAndSortedPayables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await accountPayableService.update(editingId, formData);
        notifySuccess('Conta a pagar atualizada com sucesso');
      } else {
        await accountPayableService.create(formData);
        notifySuccess('Conta a pagar criada com sucesso');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        description: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (error) {
      notifyError('Erro ao salvar conta a pagar');
    }
  };

  const handleEdit = (payable: AccountPayable) => {
    setEditingId(payable.id);
      setFormData({
        supplierId: payable.supplierId,
        description: payable.description,
        amount: payable.amount,
        dueDate: payable.dueDate.split('T')[0],
        notes: payable.notes,
      });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('Tem certeza que deseja excluir esta conta a pagar?');
    if (!confirmed) return;

    try {
      await accountPayableService.delete(id);
      notifySuccess('Conta a pagar excluída com sucesso');
      loadData();
    } catch (error) {
      notifyError('Erro ao excluir conta a pagar');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await accountPayableService.markAsPaid(id);
      notifySuccess('Conta marcada como paga');
      loadData();
    } catch (error) {
      notifyError('Erro ao marcar conta como paga');
    }
  };

  const handleMarkAsUnpaid = async (id: string) => {
    try {
      await accountPayableService.markAsUnpaid(id);
      notifySuccess('Conta marcada como não paga');
      loadData();
    } catch (error) {
      notifyError('Erro ao marcar conta como não paga');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="mt-2 text-gray-600">Gerencie todas as contas a pagar do seu negócio</p>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(insights.total)}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-sm text-yellow-700">Pendentes</div>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(insights.pending)}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-sm text-green-700">Pagas</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(insights.paid)}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-sm text-red-700">Vencidas</div>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(insights.overdue)}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por descrição ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Pendentes</option>
                <option value="paid">Pagas</option>
                <option value="overdue">Vencidas</option>
              </select>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  description: '',
                  amount: 0,
                  dueDate: new Date().toISOString().split('T')[0],
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MdAdd className="w-5 h-5" />
              Nova Conta
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {editingId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fornecedor (opcional)</label>
                      <select
                        value={formData.supplierId || ''}
                        onChange={(e) => setFormData({ ...formData, supplierId: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Selecione um fornecedor</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount || ''}
                          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Vencimento *</label>
                        <input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Observações (opcional)</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({
                          description: '',
                          amount: 0,
                          dueDate: new Date().toISOString().split('T')[0],
                        });
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingId ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-2">
                      Descrição
                      {sortField === 'description' && (
                        <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center gap-2">
                      Valor
                      {sortField === 'amount' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('dueDate')}
                  >
                    <div className="flex items-center gap-2">
                      Vencimento
                      {sortField === 'dueDate' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortField === 'status' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPayables.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma conta a pagar encontrada
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPayables.map((payable) => (
                    <tr key={payable.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{payable.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(payable.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MdCalendarToday className="w-4 h-4 text-gray-400" />
                          {formatDate(payable.dueDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{payable.supplierName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            payable.status,
                            payable.dueDate
                          )}`}
                        >
                          {getStatusLabel(payable.status, payable.dueDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {payable.status !== 'paid' ? (
                            <button
                              onClick={() => handleMarkAsPaid(payable.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Marcar como pago"
                            >
                              <MdCheckCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsUnpaid(payable.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Marcar como não pago"
                            >
                              <MdCancel className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(payable)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(payable.id)}
                            className="text-red-600 hover:text-red-900"
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

