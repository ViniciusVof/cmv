import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { AccountReceivable, AccountReceivableFormData } from '../types/accountReceivable';
import { accountReceivableService } from '../services/accountReceivableService';
import { customerService } from '../services/customerService';
import { paymentMethodService } from '../services/paymentMethodService';
import type { Customer } from '../types/customer';
import type { PaymentMethod } from '../types/paymentMethod';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdCalendarToday,
  MdSchedule,
} from 'react-icons/md';
import { notifySuccess, notifyError, confirmAsync } from '../utils/alerts';

type SortField = 'description' | 'amount' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'received' | 'overdue';

export function AccountReceivables() {
  const [receivables, setReceivables] = useState<
    (AccountReceivable & { customerName?: string; paymentMethodName?: string })[]
  >([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountReceivableFormData>({
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

  const getStatusColor = (status: AccountReceivable['status'], dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = status === 'pending' && due < today;

    if (status === 'received') return 'bg-green-100 text-green-800';
    if (isOverdue || status === 'overdue') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusLabel = (status: AccountReceivable['status'], dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const isOverdue = status === 'pending' && due < today;

    if (status === 'received') return 'Recebido';
    if (isOverdue || status === 'overdue') return 'Vencido';
    return 'Pendente';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [receivablesData, customersData, paymentMethodsData] = await Promise.all([
        accountReceivableService.getAll(),
        customerService.getAll(),
        paymentMethodService.getAll(),
      ]);
      setReceivables(
        receivablesData as (AccountReceivable & { customerName?: string; paymentMethodName?: string })[]
      );
      setCustomers(customersData);
      setPaymentMethods(paymentMethodsData);
    } catch (error) {
      notifyError('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedReceivables = useMemo(() => {
    let filtered = receivables;

    // Apply status filter
    if (statusFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        if (statusFilter === 'received') return r.status === 'received';
        if (statusFilter === 'overdue') {
          const due = new Date(r.dueDate);
          due.setHours(0, 0, 0, 0);
          return r.status === 'pending' && due < today;
        }
        const due = new Date(r.dueDate);
        due.setHours(0, 0, 0, 0);
        return r.status === 'pending' && due >= today;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.customerName && r.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.paymentMethodName && r.paymentMethodName.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [receivables, searchTerm, sortField, sortDirection, statusFilter]);

  const insights = useMemo(() => {
    const total = filteredAndSortedReceivables.reduce((sum, r) => sum + r.amount, 0);
    const pending = filteredAndSortedReceivables
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    const received = filteredAndSortedReceivables
      .filter((r) => r.status === 'received')
      .reduce((sum, r) => sum + r.amount, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = filteredAndSortedReceivables.filter((r) => {
      if (r.status === 'received') return false;
      const due = new Date(r.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).reduce((sum, r) => sum + r.amount, 0);

    return { total, pending, received, overdue };
  }, [filteredAndSortedReceivables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await accountReceivableService.update(editingId, formData);
        notifySuccess('Conta a receber atualizada com sucesso');
      } else {
        await accountReceivableService.create(formData);
        notifySuccess('Conta a receber criada com sucesso');
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
      notifyError('Erro ao salvar conta a receber');
    }
  };

  const handleEdit = (receivable: AccountReceivable) => {
    setEditingId(receivable.id);
      setFormData({
        customerId: receivable.customerId,
        description: receivable.description,
        amount: receivable.amount,
        dueDate: receivable.dueDate.split('T')[0],
        paymentMethodId: receivable.paymentMethodId,
        receivingDays: receivable.receivingDays,
        notes: receivable.notes,
      });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('Tem certeza que deseja excluir esta conta a receber?');
    if (!confirmed) return;

    try {
      await accountReceivableService.delete(id);
      notifySuccess('Conta a receber excluída com sucesso');
      loadData();
    } catch (error) {
      notifyError('Erro ao excluir conta a receber');
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      await accountReceivableService.markAsReceived(id);
      notifySuccess('Conta marcada como recebida');
      loadData();
    } catch (error) {
      notifyError('Erro ao marcar conta como recebida');
    }
  };

  const handleMarkAsUnreceived = async (id: string) => {
    try {
      await accountReceivableService.markAsUnreceived(id);
      notifySuccess('Conta marcada como não recebida');
      loadData();
    } catch (error) {
      notifyError('Erro ao marcar conta como não recebida');
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

  const calculateDueDate = (baseDate: string, receivingDays?: number) => {
    if (!receivingDays) return baseDate;
    const date = new Date(baseDate);
    date.setDate(date.getDate() + receivingDays);
    return date.toISOString().split('T')[0];
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
          <h1 className="text-3xl font-bold text-gray-900">Contas a Receber</h1>
          <p className="mt-2 text-gray-600">Gerencie todas as contas a receber do seu negócio</p>
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
            <div className="text-sm text-green-700">Recebidas</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(insights.received)}</div>
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
                  placeholder="Buscar por descrição, cliente ou método de pagamento..."
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
                <option value="received">Recebidas</option>
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
                  {editingId ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cliente (opcional)</label>
                      <select
                        value={formData.customerId || ''}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Selecione um cliente</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data Base *</label>
                        <input
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Método de Pagamento (opcional)
                        </label>
                        <select
                          value={formData.paymentMethodId || ''}
                          onChange={(e) => {
                            const selected = paymentMethods.find((pm) => pm.id === e.target.value);
                            setFormData({
                              ...formData,
                              paymentMethodId: e.target.value || undefined,
                              receivingDays: selected?.receivingDays || formData.receivingDays,
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          <option value="">Selecione um método</option>
                          {paymentMethods.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prazo de Recebimento (dias)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={formData.receivingDays || ''}
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || 0;
                              setFormData({
                                ...formData,
                                receivingDays: days > 0 ? days : undefined,
                              });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          />
                          <MdSchedule className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Dias para recebimento após a data base (ex: 30 dias para crédito, 1 dia para débito). Se informado, será calculada a data de vencimento automaticamente.
                        </p>
                      </div>
                    </div>
                    {formData.receivingDays && formData.dueDate && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm font-medium text-blue-900">
                          Data de Vencimento Calculada:{' '}
                          <span className="font-bold">{formatDate(calculateDueDate(formData.dueDate, formData.receivingDays))}</span>
                        </div>
                      </div>
                    )}
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
                      {sortField === 'description' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
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
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método de Pagamento
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
                {filteredAndSortedReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma conta a receber encontrada
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedReceivables.map((receivable) => (
                    <tr key={receivable.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{receivable.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(receivable.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MdCalendarToday className="w-4 h-4 text-gray-400" />
                          {formatDate(receivable.dueDate)}
                          {receivable.receivingDays && (
                            <span className="text-xs text-gray-500 ml-2">({receivable.receivingDays} dias)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{receivable.customerName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{receivable.paymentMethodName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            receivable.status,
                            receivable.dueDate
                          )}`}
                        >
                          {getStatusLabel(receivable.status, receivable.dueDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {receivable.status !== 'received' ? (
                            <button
                              onClick={() => handleMarkAsReceived(receivable.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Marcar como recebido"
                            >
                              <MdCheckCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkAsUnreceived(receivable.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Marcar como não recebido"
                            >
                              <MdCancel className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(receivable)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(receivable.id)}
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

