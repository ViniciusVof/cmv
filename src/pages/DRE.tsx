import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { dreService } from '../services/dreService';
import { dreAdjustmentService } from '../services/dreAdjustmentService';
import type { DRESummary } from '../types/dre';
import { notifySuccess, notifyError } from '../utils/alerts';
import {
  MdTrendingDown,
  MdTrendingUp,
  MdAttachMoney,
  MdAssessment,
  MdDateRange,
  MdRemove,
  MdExpandMore,
  MdExpandLess,
  MdUnfoldMore,
  MdEdit,
  MdClose,
} from 'react-icons/md';

export function DRE() {
  const [summary, setSummary] = useState<DRESummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sortOrderVariable, setSortOrderVariable] = useState<'desc' | 'asc'>('desc');
  const [sortOrderFixed, setSortOrderFixed] = useState<'desc' | 'asc'>('desc');
  const [editingItem, setEditingItem] = useState<{
    itemName: string;
    itemType: 'revenue' | 'expense';
    categoryId?: string;
    currentAmount: number;
  } | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primeiro dia do mês
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  });
  const [dateFilter, setDateFilter] = useState<'custom' | 'thisMonth' | 'lastMonth' | 'last7Days'>('thisMonth');
  
  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const handleEditClick = (
    itemName: string,
    itemType: 'revenue' | 'expense',
    currentAmount: number,
    categoryId?: string
  ) => {
    setEditingItem({ itemName, itemType, categoryId, currentAmount });
    setEditAmount(currentAmount.toFixed(2));
    setEditNotes('');
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !summary) return;
    
    const adjustedAmount = parseFloat(editAmount) || 0;
    
    try {
      // Buscar o valor original do item
      let originalAmount = editingItem.currentAmount;
      
      if (editingItem.itemType === 'revenue' && editingItem.itemName === 'Receita Total') {
        // Calcular receita original (sem ajustes)
        const allOrders = await import('../services/orderService').then(m => m.orderService.getAll());
        const from = new Date(fromDate + 'T00:00:00');
        const to = new Date(toDate + 'T23:59:59');
        
        // Buscar caixas fechados no período
        const allCashRegisters = await import('../services/cashRegisterService').then(m => m.cashRegisterService.getAll());
        
        const completedOrders = allOrders.filter((order) => {
          if (order.status !== 'completed') return false;
          const orderDate = new Date(order.createdAt);
          if (orderDate < from || orderDate > to) return false;
          if (order.cashRegisterId) {
            const orderCashRegister = allCashRegisters.find((cr) => String(cr.id) === String(order.cashRegisterId));
            if (orderCashRegister && orderCashRegister.status === 'closed' && orderCashRegister.closedAt) {
              const closedDate = new Date(orderCashRegister.closedAt);
              return closedDate >= from && closedDate <= to;
            }
            return false;
          }
          return false;
        });
        originalAmount = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      } else {
        // Para despesas, precisamos calcular o valor original sem ajustes
        // Por enquanto, vamos usar o valor atual e buscar ajustes anteriores
        const existingAdjustment = await dreAdjustmentService.getByItem(
          fromDate,
          toDate,
          editingItem.itemName,
          editingItem.itemType
        );
        if (existingAdjustment) {
          originalAmount = existingAdjustment.originalAmount;
        } else {
          // Se não há ajuste anterior, assumir que o valor atual é o original
          originalAmount = editingItem.currentAmount;
        }
      }
      
      await dreAdjustmentService.create(fromDate, toDate, originalAmount, {
        itemType: editingItem.itemType,
        itemName: editingItem.itemName,
        categoryId: editingItem.categoryId,
        adjustedAmount: adjustedAmount,
        notes: editNotes,
      });
      
      notifySuccess('Ajuste salvo com sucesso!');
      setEditingItem(null);
      setEditAmount('');
      setEditNotes('');
      
      // Aguardar um pouco para garantir que o ajuste foi salvo antes de recarregar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Recarregar DRE
      await loadDRE();
    } catch (error: any) {
      console.error('Erro ao salvar ajuste:', error);
      notifyError(error.message || 'Erro ao salvar ajuste');
    }
  };

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
    loadDRE();
  }, [fromDate, toDate]);

  const loadDRE = async () => {
    try {
      setLoading(true);
      const data = await dreService.calculate(fromDate, toDate);
      setSummary(data);
    } catch (error) {
      console.error('Erro ao carregar DRE:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (filter: 'custom' | 'thisMonth' | 'lastMonth' | 'last7Days') => {
    setDateFilter(filter);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(firstDay.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    } else if (filter === 'lastMonth') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      setFromDate(lastMonth.toISOString().split('T')[0]);
      setToDate(lastDayLastMonth.toISOString().split('T')[0]);
    } else if (filter === 'last7Days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      setFromDate(sevenDaysAgo.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Carregando DRE...</div>
        </div>
      </Layout>
    );
  }

  if (!summary) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Nenhum dado disponível para o período selecionado</div>
        </div>
      </Layout>
    );
  }

  const profitMargin = summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Demonstração do Resultado do Exercício (DRE)</h1>
          <p className="mt-2 text-gray-600">Análise financeira completa do seu negócio</p>
        </div>

        {/* Date Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleDateFilterChange('last7Days')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dateFilter === 'last7Days'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => handleDateFilterChange('thisMonth')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dateFilter === 'thisMonth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Este Mês
              </button>
              <button
                onClick={() => handleDateFilterChange('lastMonth')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dateFilter === 'lastMonth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mês Anterior
              </button>
              <button
                onClick={() => handleDateFilterChange('custom')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  dateFilter === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Período Customizado
              </button>
            </div>
            {dateFilter === 'custom' && (
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <MdDateRange className="w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <span className="text-gray-600">até</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}
            <div className="ml-auto text-sm text-gray-600">
              {formatDate(fromDate)} - {formatDate(toDate)}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Faturamento Total</div>
              <MdAttachMoney className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Total de Despesas</div>
              <MdTrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Lucro Líquido</div>
              <MdAssessment className="w-5 h-5 text-purple-500" />
            </div>
            <div
              className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(summary.netProfit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{profitMargin.toFixed(2)}%</div>
          </div>
        </div>

        {/* DRE Detalhado */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">DRE Detalhado</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor (R$)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % da Receita (AH)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % das Despesas (AV)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Seção de Receitas */}
                <tr className="bg-green-50">
                  <td colSpan={5} className="px-6 py-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-green-800">RECEITAS</div>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {summary.paymentMethodBreakdown.length > 0 && (
                        <button
                          onClick={() => toggleExpanded('Receita Total')}
                          className="text-gray-500 hover:text-gray-700"
                          title="Expandir/Colapsar formas de pagamento"
                        >
                          {expandedItems.has('Receita Total') ? (
                            <MdExpandLess className="w-5 h-5" />
                          ) : (
                            <MdExpandMore className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <div className="text-sm font-medium text-gray-900">Receita Total</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(summary.totalRevenue)}
                      </div>
                      <button
                        onClick={() => handleEditClick('Receita Total', 'revenue', summary.totalRevenue)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar receita total"
                      >
                        <MdEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-600">100.00%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-600">—</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      {summary.previousPeriod && (
                        <>
                          <span
                            className={`text-xs ${
                              summary.totalRevenue > summary.previousPeriod.totalRevenue
                                ? 'text-red-600'
                                : summary.totalRevenue < summary.previousPeriod.totalRevenue
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {summary.totalRevenue > summary.previousPeriod.totalRevenue ? '+' : ''}
                            {formatCurrency(summary.totalRevenue - summary.previousPeriod.totalRevenue)}
                          </span>
                          {summary.totalRevenue !== summary.previousPeriod.totalRevenue && (
                            <span className="text-xs text-gray-400">
                              (
                              {summary.previousPeriod.totalRevenue > 0
                                ? (
                                    ((summary.totalRevenue - summary.previousPeriod.totalRevenue) /
                                      summary.previousPeriod.totalRevenue) *
                                    100
                                  ).toFixed(1)
                                : '0.0'}
                              %)
                            </span>
                          )}
                        </>
                      )}
                      {!summary.previousPeriod && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                </tr>
                {/* Detalhes de Receita por Forma de Pagamento */}
                {expandedItems.has('Receita Total') && summary.paymentMethodBreakdown.length > 0 && (
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-6 py-3">
                      <div className="ml-8 space-y-2">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Faturamento por Forma de Pagamento:</div>
                        {summary.paymentMethodBreakdown.map((method, index) => {
                          const participation =
                            summary.totalRevenue > 0 ? (method.amount / summary.totalRevenue) * 100 : 0;
                          return (
                            <div key={index} className="flex items-center justify-between py-1 border-b border-gray-200">
                              <div className="text-xs text-gray-700">{method.methodName}</div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-gray-600">{formatCurrency(method.amount)}</span>
                                <span className="text-gray-500">{participation.toFixed(2)}%</span>
                                <button
                                  onClick={() => handleEditClick(`Receita Total - ${method.methodName}`, 'revenue', method.amount)}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                  title={`Editar ${method.methodName}`}
                                >
                                  <MdEdit className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}


                {/* Separador entre Receitas e Despesas */}
                <tr>
                  <td colSpan={5} className="px-6 py-2 border-t-2 border-gray-300"></td>
                </tr>

                {/* Seção de Despesas */}
                {/* Calcular despesas variáveis e fixas */}
                {(() => {
                  // Separar despesas variáveis e fixas usando o campo isVariable
                  // Ordenação independente por seção
                  const variableExpensesSorted = summary.expenseBreakdown
                    .filter((item) => item.isVariable === true)
                    .sort((a, b) => (sortOrderVariable === 'desc' ? b.amount - a.amount : a.amount - b.amount));

                  const fixedExpensesSorted = summary.expenseBreakdown
                    .filter((item) => item.isVariable === false || item.isVariable === undefined)
                    .sort((a, b) => (sortOrderFixed === 'desc' ? b.amount - a.amount : a.amount - b.amount));

                  return (
                    <>
                      {/* Despesas Variáveis */}
                          {variableExpensesSorted.length > 0 && (
                            <>
                              <tr className="bg-orange-50">
                                <td colSpan={5} className="px-6 py-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-orange-800">
                                      DESPESAS VARIÁVEIS
                                    </div>
                                    <button
                                      onClick={() => setSortOrderVariable(sortOrderVariable === 'desc' ? 'asc' : 'desc')}
                                      className="text-xs text-orange-700 hover:text-orange-900 flex items-center gap-1"
                                      title={`Ordenar ${sortOrderVariable === 'desc' ? 'crescente' : 'decrescente'}`}
                                    >
                                      <MdUnfoldMore className="w-4 h-4" />
                                      Ordenar {sortOrderVariable === 'desc' ? '↑' : '↓'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {variableExpensesSorted.map((item, index) => {
                                const isExpanded = expandedItems.has(item.categoryName);
                                const hasDetails = item.details && item.details.length > 0;
                                const percentOfRevenue =
                                  summary.totalRevenue > 0 ? (item.amount / summary.totalRevenue) * 100 : 0;
                                const percentOfExpenses =
                                  summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0;

                                const prevItem = summary.previousPeriod?.expenseBreakdown.find(
                                  (pi) => pi.categoryName === item.categoryName
                                );
                                const prevPercentOfRevenue =
                                  prevItem && summary.previousPeriod?.totalRevenue
                                    ? (prevItem.amount / summary.previousPeriod.totalRevenue) * 100
                                    : 0;
                                const prevPercentOfExpenses =
                                  prevItem && summary.previousPeriod?.totalExpenses
                                    ? (prevItem.amount / summary.previousPeriod.totalExpenses) * 100
                                    : 0;

                                const revenueVar = percentOfRevenue - prevPercentOfRevenue;
                                const expenseVar = percentOfExpenses - prevPercentOfExpenses;

                                const getVariationIcon = (variation: number) => {
                                  if (variation > 0.01) {
                                    return <MdTrendingUp className="w-4 h-4 text-red-500" title="Aumentou" />;
                                  } else if (variation < -0.01) {
                                    return <MdTrendingDown className="w-4 h-4 text-green-500" title="Diminuiu" />;
                                  } else {
                                    return <MdRemove className="w-4 h-4 text-gray-400" title="Manteve" />;
                                  }
                                };

                                return (
                                  <>
                                    <tr key={`var-${index}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          {hasDetails && (
                                            <button
                                              onClick={() => toggleExpanded(item.categoryName)}
                                              className="text-gray-500 hover:text-gray-700"
                                            >
                                              {isExpanded ? (
                                                <MdExpandLess className="w-5 h-5" />
                                              ) : (
                                                <MdExpandMore className="w-5 h-5" />
                                              )}
                                            </button>
                                          )}
                                          <div className="text-sm font-medium text-gray-900">{item.categoryName}</div>
                                        </div>
                                      </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="text-sm font-medium text-red-600">
                                          {formatCurrency(item.amount)}
                                        </div>
                                        <button
                                          onClick={() => handleEditClick(item.categoryName, 'expense', item.amount, item.categoryId)}
                                          className="text-gray-400 hover:text-blue-600 transition-colors"
                                          title="Editar valor"
                                        >
                                          <MdEdit className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-sm text-gray-600">
                                          {percentOfRevenue.toFixed(2)}%
                                        </span>
                                        {summary.previousPeriod && getVariationIcon(revenueVar)}
                                        {summary.previousPeriod && prevPercentOfRevenue > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({prevPercentOfRevenue.toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-sm text-gray-600">
                                          {percentOfExpenses.toFixed(2)}%
                                        </span>
                                        {summary.previousPeriod && getVariationIcon(expenseVar)}
                                        {summary.previousPeriod && prevPercentOfExpenses > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({prevPercentOfExpenses.toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {prevItem && (
                                          <>
                                            <span
                                              className={`text-xs ${
                                                item.amount > prevItem.amount
                                                  ? 'text-red-600'
                                                  : item.amount < prevItem.amount
                                                  ? 'text-green-600'
                                                  : 'text-gray-600'
                                              }`}
                                            >
                                              {item.amount > prevItem.amount ? '+' : ''}
                                              {formatCurrency(item.amount - prevItem.amount)}
                                            </span>
                                            {item.amount !== prevItem.amount && (
                                              <span className="text-xs text-gray-400">
                                                (
                                                {prevItem.amount > 0
                                                  ? (((item.amount - prevItem.amount) / prevItem.amount) * 100).toFixed(1)
                                                  : '0.0'}
                                                %)
                                              </span>
                                            )}
                                          </>
                                        )}
                                        {!prevItem && summary.previousPeriod && (
                                          <span className="text-xs text-gray-400">Novo</span>
                                        )}
                                        {!summary.previousPeriod && <span className="text-xs text-gray-400">—</span>}
                                      </div>
                                    </td>
                                  </tr>
                                  {/* Detalhes expandidos */}
                                  {isExpanded && hasDetails && (
                                    <tr key={`var-${index}-details`} className="bg-gray-50">
                                      <td colSpan={5} className="px-6 py-3">
                                        <div className="ml-8 space-y-2">
                                          <div className="text-xs font-semibold text-gray-600 mb-2">Detalhes:</div>
                                          {item.details
                                            ?.sort((a, b) => (sortOrderVariable === 'desc' ? b.amount - a.amount : a.amount - b.amount))
                                            .map((detail, detailIndex) => {
                                              const detailPercentOfRevenue =
                                                summary.totalRevenue > 0 ? (detail.amount / summary.totalRevenue) * 100 : 0;
                                              const detailPercentOfExpenses =
                                                summary.totalExpenses > 0 ? (detail.amount / summary.totalExpenses) * 100 : 0;
                                              return (
                                                <div key={detailIndex} className="flex items-center justify-between py-1 border-b border-gray-200">
                                                  <div className="text-xs text-gray-700">{detail.name}</div>
                                                  <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-gray-600">{formatCurrency(detail.amount)}</span>
                                                    <span className="text-gray-500">
                                                      {detailPercentOfRevenue.toFixed(2)}% (AH)
                                                    </span>
                                                    <span className="text-gray-500">
                                                      {detailPercentOfExpenses.toFixed(2)}% (AV)
                                                    </span>
                                                    <button
                                                      onClick={() => handleEditClick(`${item.categoryName} - ${detail.name}`, 'expense', detail.amount, item.categoryId)}
                                                      className="text-gray-400 hover:text-blue-600 transition-colors"
                                                      title={`Editar ${detail.name}`}
                                                    >
                                                      <MdEdit className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  </>
                                );
                              })}
                              {/* Subtotal Variáveis */}
                              <tr className="bg-orange-100 font-semibold">
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <div className="text-sm font-bold text-orange-900">
                                    Subtotal Despesas Variáveis
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-orange-900">
                                    {formatCurrency(
                                      variableExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0)
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-orange-900">
                                    {summary.totalRevenue > 0
                                      ? (
                                          (variableExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0) /
                                            summary.totalRevenue) *
                                          100
                                        ).toFixed(2)
                                      : '0.00'}
                                    %
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-orange-900">
                                    {summary.totalExpenses > 0
                                      ? (
                                          (variableExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0) /
                                            summary.totalExpenses) *
                                          100
                                        ).toFixed(2)
                                      : '0.00'}
                                    %
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm text-gray-400">—</div>
                                </td>
                              </tr>
                            </>
                          )}

                          {/* Despesas Fixas */}
                          {fixedExpensesSorted.length > 0 && (
                            <>
                              <tr className="bg-blue-50">
                                <td colSpan={5} className="px-6 py-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-blue-800">DESPESAS FIXAS</div>
                                    <button
                                      onClick={() => setSortOrderFixed(sortOrderFixed === 'desc' ? 'asc' : 'desc')}
                                      className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1"
                                      title={`Ordenar ${sortOrderFixed === 'desc' ? 'crescente' : 'decrescente'}`}
                                    >
                                      <MdUnfoldMore className="w-4 h-4" />
                                      Ordenar {sortOrderFixed === 'desc' ? '↑' : '↓'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {fixedExpensesSorted.map((item, index) => {
                                const percentOfRevenue =
                                  summary.totalRevenue > 0 ? (item.amount / summary.totalRevenue) * 100 : 0;
                                const percentOfExpenses =
                                  summary.totalExpenses > 0 ? (item.amount / summary.totalExpenses) * 100 : 0;

                                const prevItem = summary.previousPeriod?.expenseBreakdown.find(
                                  (pi) => pi.categoryName === item.categoryName
                                );
                                const prevPercentOfRevenue =
                                  prevItem && summary.previousPeriod?.totalRevenue
                                    ? (prevItem.amount / summary.previousPeriod.totalRevenue) * 100
                                    : 0;
                                const prevPercentOfExpenses =
                                  prevItem && summary.previousPeriod?.totalExpenses
                                    ? (prevItem.amount / summary.previousPeriod.totalExpenses) * 100
                                    : 0;

                                const revenueVar = percentOfRevenue - prevPercentOfRevenue;
                                const expenseVar = percentOfExpenses - prevPercentOfExpenses;

                                const getVariationIcon = (variation: number) => {
                                  if (variation > 0.01) {
                                    return <MdTrendingUp className="w-4 h-4 text-red-500" title="Aumentou" />;
                                  } else if (variation < -0.01) {
                                    return <MdTrendingDown className="w-4 h-4 text-green-500" title="Diminuiu" />;
                                  } else {
                                    return <MdRemove className="w-4 h-4 text-gray-400" title="Manteve" />;
                                  }
                                };

                                const hasDetails = item.details && item.details.length > 0;
                                const isExpanded = expandedItems.has(item.categoryName);

                                return (
                                  <>
                                    <tr key={`fixed-${index}`} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          {hasDetails && (
                                            <button
                                              onClick={() => toggleExpanded(item.categoryName)}
                                              className="text-gray-500 hover:text-gray-700"
                                            >
                                              {isExpanded ? (
                                                <MdExpandLess className="w-5 h-5" />
                                              ) : (
                                                <MdExpandMore className="w-5 h-5" />
                                              )}
                                            </button>
                                          )}
                                          <div className="text-sm font-medium text-gray-900">{item.categoryName}</div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <div className="text-sm font-medium text-red-600">
                                            {formatCurrency(item.amount)}
                                          </div>
                                          <button
                                            onClick={() => handleEditClick(item.categoryName, 'expense', item.amount, item.categoryId)}
                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Editar valor"
                                          >
                                            <MdEdit className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-sm text-gray-600">
                                          {percentOfRevenue.toFixed(2)}%
                                        </span>
                                        {summary.previousPeriod && getVariationIcon(revenueVar)}
                                        {summary.previousPeriod && prevPercentOfRevenue > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({prevPercentOfRevenue.toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <span className="text-sm text-gray-600">
                                          {percentOfExpenses.toFixed(2)}%
                                        </span>
                                        {summary.previousPeriod && getVariationIcon(expenseVar)}
                                        {summary.previousPeriod && prevPercentOfExpenses > 0 && (
                                          <span className="text-xs text-gray-400">
                                            ({prevPercentOfExpenses.toFixed(2)}%)
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {prevItem && (
                                          <>
                                            <span
                                              className={`text-xs ${
                                                item.amount > prevItem.amount
                                                  ? 'text-red-600'
                                                  : item.amount < prevItem.amount
                                                  ? 'text-green-600'
                                                  : 'text-gray-600'
                                              }`}
                                            >
                                              {item.amount > prevItem.amount ? '+' : ''}
                                              {formatCurrency(item.amount - prevItem.amount)}
                                            </span>
                                            {item.amount !== prevItem.amount && (
                                              <span className="text-xs text-gray-400">
                                                (
                                                {prevItem.amount > 0
                                                  ? (((item.amount - prevItem.amount) / prevItem.amount) * 100).toFixed(1)
                                                  : '0.0'}
                                                %)
                                              </span>
                                            )}
                                          </>
                                        )}
                                        {!prevItem && summary.previousPeriod && (
                                          <span className="text-xs text-gray-400">Novo</span>
                                        )}
                                        {!summary.previousPeriod && <span className="text-xs text-gray-400">—</span>}
                                      </div>
                                    </td>
                                  </tr>
                                  {/* Detalhes expandidos para despesas fixas */}
                                  {isExpanded && hasDetails && (
                                    <tr key={`fixed-${index}-details`} className="bg-gray-50">
                                      <td colSpan={5} className="px-6 py-3">
                                        <div className="ml-8 space-y-2">
                                          <div className="text-xs font-semibold text-gray-600 mb-2">Detalhes:</div>
                                          {item.details
                                            ?.sort((a, b) => (sortOrderFixed === 'desc' ? b.amount - a.amount : a.amount - b.amount))
                                            .map((detail, detailIndex) => {
                                              const detailPercentOfRevenue =
                                                summary.totalRevenue > 0 ? (detail.amount / summary.totalRevenue) * 100 : 0;
                                              const detailPercentOfExpenses =
                                                summary.totalExpenses > 0 ? (detail.amount / summary.totalExpenses) * 100 : 0;
                                              return (
                                                <div key={detailIndex} className="flex items-center justify-between py-1 border-b border-gray-200">
                                                  <div className="text-xs text-gray-700">{detail.name}</div>
                                                  <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-gray-600">{formatCurrency(detail.amount)}</span>
                                                    <span className="text-gray-500">
                                                      {detailPercentOfRevenue.toFixed(2)}% (AH)
                                                    </span>
                                                    <span className="text-gray-500">
                                                      {detailPercentOfExpenses.toFixed(2)}% (AV)
                                                    </span>
                                                    <button
                                                      onClick={() => handleEditClick(`${item.categoryName} - ${detail.name}`, 'expense', detail.amount, item.categoryId)}
                                                      className="text-gray-400 hover:text-blue-600 transition-colors"
                                                      title={`Editar ${detail.name}`}
                                                    >
                                                      <MdEdit className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  </>
                                );
                              })}
                              {/* Subtotal Fixas */}
                              <tr className="bg-blue-100 font-semibold">
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <div className="text-sm font-bold text-blue-900">Subtotal Despesas Fixas</div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-blue-900">
                                    {formatCurrency(fixedExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0))}
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-blue-900">
                                    {summary.totalRevenue > 0
                                      ? (
                                          (fixedExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0) /
                                            summary.totalRevenue) *
                                          100
                                        ).toFixed(2)
                                      : '0.00'}
                                    %
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm font-bold text-blue-900">
                                    {summary.totalExpenses > 0
                                      ? (
                                          (fixedExpensesSorted.reduce((sum: number, item: any) => sum + item.amount, 0) /
                                            summary.totalExpenses) *
                                          100
                                        ).toFixed(2)
                                      : '0.00'}
                                    %
                                  </div>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-right">
                                  <div className="text-sm text-gray-400">—</div>
                                </td>
                              </tr>
                            </>
                          )}

                          {/* Mensagem se não houver despesas */}
                          {variableExpensesSorted.length === 0 && fixedExpensesSorted.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                Nenhuma despesa no período
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900">Despesas Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-base font-bold text-red-600">
                          {formatCurrency(summary.totalExpenses)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-base font-bold text-gray-900">
                            {summary.totalRevenue > 0
                              ? ((summary.totalExpenses / summary.totalRevenue) * 100).toFixed(2)
                              : '0.00'}
                            %
                          </span>
                          {summary.previousPeriod && (
                            <>
                              {(() => {
                                const revenueVar =
                                  (summary.totalExpenses / summary.totalRevenue) * 100 -
                                  (summary.previousPeriod.totalExpenses /
                                    summary.previousPeriod.totalRevenue) *
                                    100;
                                if (revenueVar > 0.01) {
                                  return <MdTrendingUp className="w-4 h-4 text-red-500" title="Aumentou" />;
                                } else if (revenueVar < -0.01) {
                                  return (
                                    <MdTrendingDown className="w-4 h-4 text-green-500" title="Diminuiu" />
                                  );
                                } else {
                                  return <MdRemove className="w-4 h-4 text-gray-400" title="Manteve" />;
                                }
                              })()}
                              <span className="text-xs text-gray-400">
                                (
                                {summary.previousPeriod.totalRevenue > 0
                                  ? (
                                      (summary.previousPeriod.totalExpenses /
                                        summary.previousPeriod.totalRevenue) *
                                      100
                                    ).toFixed(2)
                                  : '0.00'}
                                %)
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-base font-bold text-gray-900">100.00%</span>
                          {summary.previousPeriod && <span className="text-xs text-gray-400">(100.00%)</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {summary.previousPeriod && (
                            <>
                              <span
                                className={`text-xs font-semibold ${
                                  summary.totalExpenses > summary.previousPeriod.totalExpenses
                                    ? 'text-red-600'
                                    : summary.totalExpenses < summary.previousPeriod.totalExpenses
                                    ? 'text-green-600'
                                    : 'text-gray-600'
                                }`}
                              >
                                {summary.totalExpenses > summary.previousPeriod.totalExpenses ? '+' : ''}
                                {formatCurrency(summary.totalExpenses - summary.previousPeriod.totalExpenses)}
                              </span>
                              {summary.totalExpenses !== summary.previousPeriod.totalExpenses && (
                                <span className="text-xs text-gray-400">
                                  (
                                  {summary.previousPeriod.totalExpenses > 0
                                    ? (
                                        ((summary.totalExpenses - summary.previousPeriod.totalExpenses) /
                                          summary.previousPeriod.totalExpenses) *
                                        100
                                      ).toFixed(1)
                                    : '0.0'}
                                  %)
                                </span>
                              )}
                            </>
                          )}
                          {!summary.previousPeriod && <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lucro */}
              <div className="mt-6 pt-4 border-t-2 border-gray-300">
              <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                <div>
                  <div className="text-lg font-bold text-gray-900">Lucro Líquido</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Receitas - Despesas | Margem: % sobre receita total
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {formatCurrency(summary.netProfit)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {profitMargin.toFixed(2)}%
                    </span>
                    {summary.previousPeriod && (
                      <>
                        {(() => {
                          const prevProfitMargin =
                            summary.previousPeriod.totalRevenue > 0
                              ? (summary.previousPeriod.netProfit / summary.previousPeriod.totalRevenue) * 100
                              : 0;
                          const marginVar = profitMargin - prevProfitMargin;
                          if (marginVar > 0.01) {
                            return <MdTrendingUp className="w-4 h-4 text-green-500" title="Margem aumentou" />;
                          } else if (marginVar < -0.01) {
                            return <MdTrendingDown className="w-4 h-4 text-red-500" title="Margem diminuiu" />;
                          } else {
                            return <MdRemove className="w-4 h-4 text-gray-400" title="Margem manteve" />;
                          }
                        })()}
                        <span className="text-xs text-gray-400">
                          (
                          {summary.previousPeriod.totalRevenue > 0
                            ? (
                                (summary.previousPeriod.netProfit / summary.previousPeriod.totalRevenue) *
                                100
                              ).toFixed(2)
                            : '0.00'}
                          %)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Furos do Caixa - Logo abaixo do Lucro Líquido */}
              {summary.cashRegisterDifferences && summary.cashRegisterDifferences.details.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpanded('Furos do Caixa')}
                        className="text-gray-500 hover:text-gray-700"
                        title="Expandir/Colapsar furos do caixa"
                      >
                        {expandedItems.has('Furos do Caixa') ? (
                          <MdExpandLess className="w-5 h-5" />
                        ) : (
                          <MdExpandMore className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <div className="text-lg font-bold text-gray-900">Furos do Caixa</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Diferenças entre saldo esperado e real no fechamento
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-lg font-bold ${
                          summary.cashRegisterDifferences.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(summary.cashRegisterDifferences.total)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Detalhes dos furos (expandível) */}
                  {expandedItems.has('Furos do Caixa') && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Sobras</div>
                          <div className="text-base font-bold text-green-600">
                            {formatCurrency(summary.cashRegisterDifferences.positive)}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">Faltas</div>
                          <div className="text-base font-bold text-red-600">
                            {formatCurrency(summary.cashRegisterDifferences.negative)}
                          </div>
                        </div>
                        <div className={`rounded-lg p-3 ${
                          summary.cashRegisterDifferences.total >= 0 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <div className="text-xs text-gray-600 mb-1">Diferença Total</div>
                          <div className={`text-base font-bold ${
                            summary.cashRegisterDifferences.total >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(summary.cashRegisterDifferences.total)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Detalhes por caixa */}
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Detalhes por caixa ({summary.cashRegisterDifferences.details.length})
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {summary.cashRegisterDifferences.details.map((detail, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2 px-3 bg-white rounded border border-gray-200"
                            >
                              <div className="flex-1">
                                <div className="text-xs text-gray-600">
                                  {formatDate(detail.date)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Esperado: {formatCurrency(detail.expectedBalance)} | Real: {formatCurrency(detail.actualBalance)}
                                </div>
                              </div>
                              <div
                                className={`text-sm font-semibold ${
                                  detail.difference >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {detail.difference >= 0 ? '+' : ''}
                                {formatCurrency(detail.difference)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ponto de Equilíbrio - Logo abaixo dos Furos do Caixa */}
              <div className="mt-4">
                <div className="flex justify-between items-center py-3 bg-yellow-50 rounded-lg px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded('Ponto de Equilíbrio')}
                      className="text-gray-500 hover:text-gray-700"
                      title="Expandir/Colapsar ponto de equilíbrio"
                    >
                      {expandedItems.has('Ponto de Equilíbrio') ? (
                        <MdExpandLess className="w-5 h-5" />
                      ) : (
                        <MdExpandMore className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="text-lg font-bold text-gray-900">Ponto de Equilíbrio</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Faturamento mínimo necessário para cobrir todos os custos (lucro = R$ 0,00)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`text-lg font-bold ${
                        summary.breakEvenPoint === Infinity
                          ? 'text-red-600'
                          : summary.totalRevenue >= summary.breakEvenPoint
                          ? 'text-green-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {summary.breakEvenPoint === Infinity
                        ? 'Indeterminado'
                        : formatCurrency(summary.breakEvenPoint)}
                    </div>
                    {summary.breakEvenPoint !== Infinity && (
                      <div className="text-sm text-gray-600">
                        {summary.totalRevenue >= summary.breakEvenPoint ? (
                          <span className="text-green-600">
                            {((summary.totalRevenue / summary.breakEvenPoint) * 100).toFixed(1)}% acima
                          </span>
                        ) : (
                          <span className="text-orange-600">
                            {((summary.totalRevenue / summary.breakEvenPoint) * 100).toFixed(1)}% do necessário
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Detalhes do ponto de equilíbrio (expandível) */}
                {expandedItems.has('Ponto de Equilíbrio') && (
                  <div className="mt-3 bg-yellow-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-700">
                        <strong>Fórmula:</strong> Ponto de Equilíbrio = Custos Fixos Totais / Margem de Contribuição
                      </div>
                      <div className="text-sm text-gray-700">
                        <strong>Margem de Contribuição:</strong> 1 - (% Custos Variáveis / 100)
                      </div>
                      {summary.breakEvenPoint !== Infinity && (
                        <>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-xs text-gray-600 mb-1">Faturamento Atual</div>
                              <div className="text-base font-bold text-gray-900">
                                {formatCurrency(summary.totalRevenue)}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3">
                              <div className="text-xs text-gray-600 mb-1">Ponto de Equilíbrio</div>
                              <div className="text-base font-bold text-orange-600">
                                {formatCurrency(summary.breakEvenPoint)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className={`text-sm font-semibold ${
                              summary.totalRevenue >= summary.breakEvenPoint ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {summary.totalRevenue >= summary.breakEvenPoint ? (
                                <>✓ Faturamento está {((summary.totalRevenue / summary.breakEvenPoint - 1) * 100).toFixed(1)}% acima do ponto de equilíbrio</>
                              ) : (
                                <>⚠ Faturamento está {((1 - summary.totalRevenue / summary.breakEvenPoint) * 100).toFixed(1)}% abaixo do ponto de equilíbrio</>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Total de Geração de Caixa */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-4">
                  <div>
                    <div className="text-lg font-bold text-gray-900">Total de Geração de Caixa</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Soma acumulada de todos os lucros históricos (já descontando faltas do caixa)
                    </div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      summary.totalCashGeneration >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(summary.totalCashGeneration)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Edição */}
          {editingItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Editar {editingItem.itemName}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setEditAmount('');
                      setEditNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MdClose className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Original
                    </label>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(editingItem.currentAmount)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Novo Valor (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações (opcional)
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      rows={3}
                      placeholder="Ex: Ajuste manual devido a..."
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setEditAmount('');
                        setEditNotes('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Layout>
  );
}

