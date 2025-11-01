import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { CashRegister as CashRegisterType, CashTransaction } from '../types/cashRegister';
import type { Order } from '../types/order';
import { cashRegisterService } from '../services/cashRegisterService';
import { cashTransactionService } from '../services/cashTransactionService';
import { deliveryDriverService } from '../services/deliveryDriverService';
import { api } from '../config/api';
import { paymentMethodService } from '../services/paymentMethodService';
import { MdAdd, MdClose, MdCheckCircle, MdAttachMoney, MdTrendingUp, MdTrendingDown, MdReceipt, MdRemoveRedEye, MdVisibility } from 'react-icons/md';
import { notifySuccess, notifyError } from '../utils/alerts';

export function CashRegister() {
  const [cashRegisters, setCashRegisters] = useState<CashRegisterType[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegisterType | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectedReportCash, setSelectedReportCash] = useState<CashRegisterType | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reportTransactions, setReportTransactions] = useState<CashTransaction[]>([]);
  const [reportOrders, setReportOrders] = useState<Order[]>([]);
  const [reportDrivers, setReportDrivers] = useState<import('../types/deliveryDriver').DeliveryDriver[]>([]);
  const hasOpenOrders = useMemo(() => reportOrders.some(o => o.status !== 'completed'), [reportOrders]);

  useEffect(() => {
    loadData();
  }, []);

  // Lock body scroll when report modal is open
  useEffect(() => {
    if (showReport) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showReport]);

  // Removido aviso automático ao abrir relatório; agora aparece apenas ao clicar em Fechar Caixa

  const loadData = async () => {
    try {
      setLoading(true);
      const [all, open] = await Promise.all([
        cashRegisterService.getAll(),
        cashRegisterService.getOpenCashRegister(),
      ]);
      setCashRegisters(all.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()));
      setOpenCashRegister(open);
      
      // Carregar transações e pedidos do caixa aberto
      if (open) {
        const [ordersResp, drivers, paymentMethods] = await Promise.all([
          api.get<Order[]>('/orders'),
          deliveryDriverService.getAll(),
          paymentMethodService.getAll(),
        ]);
        const cashOrdersRaw = ordersResp.data.filter(o => String(o.cashRegisterId) === String(open.id) && o.status !== 'cancelled');
        const driverMap = new Map(drivers.map(d => [String(d.id), d.name]));
        const pmMap = new Map(paymentMethods.map(pm => [String(pm.id), pm]));
        const cashOrders = cashOrdersRaw.map(o => ({
          ...o,
          deliveryDriverName: o.deliveryDriverName || (o.deliveryDriverId ? driverMap.get(String(o.deliveryDriverId)) : undefined),
          paymentMethodName: o.paymentMethodName || (o.paymentMethodId ? (pmMap.get(String(o.paymentMethodId))?.name) : undefined),
        }));
        setOrders(cashOrders);
        // Default seleção do relatório para o caixa aberto
        setSelectedReportCash(open);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading cash registers:', error);
      notifyError('Erro ao carregar caixas');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async (cashRegisterId: string) => {
    try {
      const [trans, ordersResp, drivers, paymentMethods] = await Promise.all([
        cashTransactionService.getByCashRegisterId(cashRegisterId),
        api.get<Order[]>('/orders'),
        deliveryDriverService.getAll(),
        paymentMethodService.getAll(),
      ]);
      const transSorted = trans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReportTransactions(transSorted);
      const cashOrdersRaw = ordersResp.data.filter(o => String(o.cashRegisterId) === String(cashRegisterId) && o.status !== 'cancelled');
      const driverMap = new Map(drivers.map(d => [String(d.id), d.name]));
      const pmMap = new Map(paymentMethods.map(pm => [String(pm.id), pm]));
      const cashOrders = cashOrdersRaw.map(o => ({
        ...o,
        deliveryDriverName: o.deliveryDriverName || (o.deliveryDriverId ? driverMap.get(String(o.deliveryDriverId)) : undefined),
        paymentMethodName: o.paymentMethodName || (o.paymentMethodId ? (pmMap.get(String(o.paymentMethodId))?.name) : undefined),
      }));
      setReportOrders(cashOrders);
      setReportDrivers(drivers); // Guardar drivers para usar no calculateReport
    } catch (e) {
      console.error('Erro ao carregar dados do relatório', e);
      notifyError('Erro ao carregar relatório do caixa');
    }
  };

  const handleOpen = async () => {
    try {
      const balance = Number(openingBalance) || 0;
      await cashRegisterService.open({ openingBalance: balance, notes });
      notifySuccess('Caixa aberto com sucesso!');
      setShowOpenModal(false);
      setOpeningBalance('');
      setNotes('');
      await loadData();
    } catch (error: any) {
      console.error('Error opening cash register:', error);
      notifyError(error.message || 'Erro ao abrir caixa');
    }
  };

  const handleClose = async () => {
    if (!openCashRegister) return;
    try {
      // Impedir fechamento se houver pedidos em aberto (não concluídos)
      const hasOpenOrders = orders.some(o => o.status !== 'completed');
      if (hasOpenOrders) {
        notifyError('Não é possível fechar o caixa com pedidos em aberto. Conclua todos os pedidos.');
        return;
      }
      const balance = Number(actualBalance) || 0;
      await cashRegisterService.close(openCashRegister.id, { actualBalance: balance, notes });
      notifySuccess('Caixa fechado com sucesso!');
      setShowCloseModal(false);
      setActualBalance('');
      setNotes('');
      await loadData();
    } catch (error: any) {
      console.error('Error closing cash register:', error);
      notifyError(error.message || 'Erro ao fechar caixa');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('pt-BR');
  };

  const handleAddTransaction = async () => {
    if (!openCashRegister) return;
    try {
      const amount = Number(transactionAmount) || 0;
      if (amount <= 0) {
        notifyError('Informe um valor válido');
        return;
      }
      if (!transactionDescription.trim()) {
        notifyError('Informe uma descrição');
        return;
      }
      await cashTransactionService.create(openCashRegister.id, {
        type: transactionType,
        amount,
        description: transactionDescription,
      });
      notifySuccess(`${transactionType === 'in' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      setShowTransactionModal(false);
      setTransactionAmount('');
      setTransactionDescription('');
      setTransactionType('in');
      await loadData();
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      notifyError('Erro ao registrar transação');
    }
  };

  // delete handler removido da visão principal; exclusões ocorrem no relatório

  const calculateCurrentBalance = () => {
    if (!selectedReportCash) return 0;
    const transIn = reportTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const transOut = reportTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    return selectedReportCash.openingBalance + transIn - transOut;
  };

  const calculateReport = () => {
    const salesTotal = reportOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const salesNet = reportOrders.reduce((sum, o) => sum + (o.netAmount || o.total || 0), 0);
    const cardFeesCredit = reportOrders.filter(o => o.paymentMethodKind === 'credit').reduce((s, o) => s + (o.cardFee || 0), 0);
    const cardFeesDebit = reportOrders.filter(o => o.paymentMethodKind === 'debit').reduce((s, o) => s + (o.cardFee || 0), 0);
    const cardFeesPix = reportOrders.filter(o => o.paymentMethodKind === 'pix').reduce((s, o) => s + (o.cardFee || 0), 0);
    const cardFees = cardFeesCredit + cardFeesDebit + cardFeesPix;
    const deliveryFees = reportOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    
    const byPaymentMethod: Record<string, { total: number; count: number; fee: number; net: number }> = {};
    reportOrders.forEach(o => {
      const key = o.paymentMethodKind || 'other';
      if (!byPaymentMethod[key]) {
        byPaymentMethod[key] = { total: 0, count: 0, fee: 0, net: 0 };
      }
      byPaymentMethod[key].total += o.total || 0;
      byPaymentMethod[key].count += 1;
      
      // Só somar taxa se for pagamento de maquininha (credit, debit, pix)
      const isMachinePayment = key === 'credit' || key === 'debit' || key === 'pix';
      if (isMachinePayment) {
        byPaymentMethod[key].fee += o.cardFee || 0;
      }
      
      // Para dinheiro e outros, o líquido é o total (sem descontar taxa, mesmo se houver cardFee incorreto no banco)
      // Para maquininha, usa o netAmount calculado (total - taxas)
      if (key === 'cash' || key === 'other') {
        byPaymentMethod[key].net += o.total || 0;
      } else {
        byPaymentMethod[key].net += o.netAmount || o.total || 0;
      }
    });

    // Pagamentos por entregador (taxa de entrega + diária)
    const byDriver: Record<string, number> = {};
    
    // Primeiro, somar as taxas de entrega (apenas se o entregador recebe taxa)
    reportOrders.forEach(o => {
      const driverId = o.deliveryDriverId;
      if (!driverId || !o.deliveryFee || o.deliveryFee <= 0) return;
      
      const driver = reportDrivers.find(d => String(d.id) === String(driverId));
      // Só soma a taxa se o entregador recebe taxa de entrega
      if (!driver || !driver.receivesDeliveryFee) return;
      
      const key = o.deliveryDriverName || driverId || 'Sem entregador';
      const fee = o.deliveryFee || 0;
      if (!byDriver[key]) byDriver[key] = 0;
      byDriver[key] += fee;
    });
    
    // Depois, adicionar a diária de cada entregador (uma vez por dia)
    // Agrupar pedidos por entregador e por data para contar dias únicos
    const driverDays = new Map<string, Set<string>>(); // Map<driverKey, Set<dates>>
    reportOrders.forEach(o => {
      const driverId = o.deliveryDriverId;
      if (!driverId) return;
      
      const driver = reportDrivers.find(d => String(d.id) === String(driverId));
      if (!driver || !driver.dailyRate || driver.dailyRate <= 0) return;
      
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const driverKey = o.deliveryDriverName || driverId;
      
      if (!driverDays.has(driverKey)) {
        driverDays.set(driverKey, new Set());
      }
      driverDays.get(driverKey)!.add(orderDate);
    });
    
    // Calcular diárias: uma diária por dia que o entregador trabalhou
    driverDays.forEach((dates, driverKey) => {
      // Tentar encontrar o entregador pelo nome ou ID
      let driver = reportDrivers.find(d => d.name === driverKey || String(d.id) === driverKey);
      
      // Se não encontrou pelo nome, tentar encontrar pelo ID do pedido
      if (!driver) {
        const orderWithDriver = reportOrders.find(o => 
          (o.deliveryDriverName === driverKey || String(o.deliveryDriverId) === driverKey) && o.deliveryDriverId
        );
        if (orderWithDriver && orderWithDriver.deliveryDriverId) {
          driver = reportDrivers.find(d => String(d.id) === String(orderWithDriver.deliveryDriverId));
        }
      }
      
      if (driver && driver.dailyRate && driver.dailyRate > 0) {
        const daysCount = dates.size;
        if (!byDriver[driverKey]) byDriver[driverKey] = 0;
        byDriver[driverKey] += driver.dailyRate * daysCount;
      }
    });

    // Calcular o total de pagamentos aos entregadores (taxa + diária)
    const deliveryDriverFees = Object.values(byDriver).reduce((sum, value) => sum + value, 0);

    // Pagamentos por maquininha (somente métodos do tipo maquininha - credit, debit, pix)
    const byMachine: Record<string, { credit: number; debit: number; pix: number; total: number }> = {};
    reportOrders.forEach(o => {
      // Só processar pedidos com pagamento de maquininha (credit, debit, pix) e com cardFee > 0
      const isValidMachinePayment = o.paymentMethodKind === 'credit' || 
                                     o.paymentMethodKind === 'debit' || 
                                     o.paymentMethodKind === 'pix';
      if (!isValidMachinePayment || !o.cardFee || o.cardFee <= 0) return;
      
      const name = o.paymentMethodName || '—';
      if (!name) return;
      if (!byMachine[name]) byMachine[name] = { credit: 0, debit: 0, pix: 0, total: 0 };
      
      if (o.paymentMethodKind === 'credit') {
        byMachine[name].credit += o.cardFee;
      } else if (o.paymentMethodKind === 'debit') {
        byMachine[name].debit += o.cardFee;
      } else if (o.paymentMethodKind === 'pix') {
        byMachine[name].pix += o.cardFee;
      }
    });
    
    // Calcular o total como a soma de credit + debit + pix para cada máquina
    Object.keys(byMachine).forEach(name => {
      byMachine[name].total = byMachine[name].credit + byMachine[name].debit + byMachine[name].pix;
    });

    return {
      salesTotal,
      salesNet,
      cardFees,
      cardFeesCredit,
      cardFeesDebit,
      cardFeesPix,
      deliveryFees,
      deliveryDriverFees,
      byPaymentMethod,
      byDriver,
      byMachine,
      ordersCount: reportOrders.length,
    };
  };

  // Atualizar dados do relatório quando seleção mudar
  useEffect(() => {
    if (showReport && selectedReportCash) {
      loadReportData(String(selectedReportCash.id));
    }
  }, [showReport, selectedReportCash]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Caixa</h1>
          {!openCashRegister && (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <MdAdd className="w-5 h-5" />
              Abrir Caixa
            </button>
          )}
        </div>

        {/* Caixa Aberto */}
        {openCashRegister && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-green-800 flex items-center gap-2">
                  <MdCheckCircle className="w-6 h-6" />
                  Caixa Aberto
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Aberto em {formatDateTime(openCashRegister.openedAt)}
                </p>
              </div>

              {/* Footer de ações removido da tela inicial; movido para o relatório */}
              <div className="flex gap-2">
                <button
                  onClick={() => { if (openCashRegister) { setSelectedReportCash(openCashRegister); } setShowReport(true); }}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <MdReceipt className="w-5 h-5" />
                  Relatório
                </button>
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <MdAdd className="w-5 h-5" />
                  Entrada/Saída
                </button>
                {/* Botão Fechar Caixa removido da tela inicial; disponível no relatório */}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Saldo Inicial</div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatCurrency(openCashRegister.openingBalance)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Pedidos Registrados</div>
                <div className="text-2xl font-bold text-blue-600">
                  {orders.length}
                </div>
              </div>
            </div>

            {/* Transações do caixa e observações foram movidas para o relatório */}
          </div>
        )}

        {/* Histórico de Caixas */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Histórico de Caixas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abertura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fechamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Inicial</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Esperado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Real</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferença</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cashRegisters.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Nenhum caixa registrado
                    </td>
                  </tr>
                ) : (
                  cashRegisters.map((cr) => (
                    <tr key={cr.id} className={cr.status === 'open' ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            cr.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {cr.status === 'open' ? 'Aberto' : 'Fechado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDateTime(cr.openedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cr.closedAt ? formatDateTime(cr.closedAt) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatCurrency(cr.openingBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cr.expectedBalance !== undefined ? formatCurrency(cr.expectedBalance) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {cr.actualBalance !== undefined ? formatCurrency(cr.actualBalance) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {cr.difference !== undefined ? (
                          <span
                            className={
                              cr.difference === 0
                                ? 'text-green-600 font-medium'
                                : cr.difference > 0
                                ? 'text-blue-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {formatCurrency(cr.difference)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          className="px-3 py-1.5 border rounded hover:bg-gray-50 inline-flex items-center gap-1"
                          title="Ver relatório"
                          onClick={() => { setSelectedReportCash(cr); setShowReport(true); }}
                        >
                          <MdVisibility className="w-4 h-4" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Abrir Caixa */}
        {showOpenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowOpenModal(false)} />
            <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <MdAttachMoney className="w-6 h-6 text-green-600" />
                  Abrir Caixa
                </h2>
                <button onClick={() => setShowOpenModal(false)} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Observações sobre a abertura do caixa"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowOpenModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleOpen}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Abrir Caixa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Fechar Caixa */}
        {showCloseModal && openCashRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCloseModal(false)} />
            <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Fechar Caixa</h2>
                <button onClick={() => setShowCloseModal(false)} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Saldo Inicial</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {formatCurrency(openCashRegister.openingBalance)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Real Contado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={3}
                    placeholder="Observações sobre o fechamento do caixa"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Fechar Caixa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Adicionar Transação */}
        {showTransactionModal && openCashRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowTransactionModal(false)} />
            <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Adicionar Transação</h2>
                <button onClick={() => setShowTransactionModal(false)} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Transação
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTransactionType('in')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        transactionType === 'in'
                          ? 'border-green-600 bg-green-50 text-green-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <MdTrendingUp className="w-5 h-5 mx-auto mb-1" />
                      Entrada
                    </button>
                    <button
                      onClick={() => setTransactionType('out')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        transactionType === 'out'
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <MdTrendingDown className="w-5 h-5 mx-auto mb-1" />
                      Saída
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ex: Troco inicial, Sangria, Reforço de caixa..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowTransactionModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddTransaction}
                    className={`flex-1 px-4 py-2 text-white rounded-lg ${
                      transactionType === 'in'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Relatório */}
        {showReport && selectedReportCash && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowReport(false)} />
            <div className="relative bg-white w-full h-full rounded-none shadow-xl overflow-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-semibold text-gray-800">Relatório do Caixa</h2>
                <button onClick={() => setShowReport(false)} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                {/* Resumo Geral */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo Geral</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total de Pedidos</div>
                      <div className="text-2xl font-bold text-gray-800">{calculateReport().ordersCount}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Vendas Brutas</div>
                      <div className="text-2xl font-bold text-gray-800">{formatCurrency(calculateReport().salesTotal)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Vendas Líquidas</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(calculateReport().salesNet)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Taxas Totais</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(calculateReport().cardFees + calculateReport().deliveryDriverFees)}
                      </div>
                    </div>
                  </div>
                </div>

                

                {/* Taxas Detalhadas */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Taxas Detalhadas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-gray-700">Taxas de Cartão (Crédito)</span>
                      <span className="font-semibold text-red-600">{formatCurrency(calculateReport().cardFeesCredit)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-gray-700">Taxas de Cartão (Débito)</span>
                      <span className="font-semibold text-red-600">{formatCurrency(calculateReport().cardFeesDebit)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 rounded">
                      <span className="text-gray-700">Taxas PIX</span>
                      <span className="font-semibold text-red-600">{formatCurrency(calculateReport().cardFeesPix)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-orange-50 rounded">
                      <span className="text-gray-700">Pagamentos a Entregadores (Total)</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(calculateReport().deliveryDriverFees)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-blue-50 rounded">
                      <span className="text-gray-700">Taxa de Entrega Cobrada (Clientes)</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(calculateReport().deliveryFees)}</span>
                    </div>
                  </div>
                </div>

                {/* Vendas por Forma de Pagamento */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas por Forma de Pagamento</h3>
                  <div className="space-y-3">
                    {Object.entries(calculateReport().byPaymentMethod).map(([method, data]) => {
                      const methodLabels: Record<string, string> = {
                        credit: 'Crédito',
                        debit: 'Débito',
                        pix: 'PIX',
                        cash: 'Dinheiro',
                        other: 'Outro',
                      };
                      return (
                        <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{methodLabels[method] || method}</div>
                            <div className="text-xs text-gray-500">{data.count} pedido(s)</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-800">{formatCurrency(data.total)}</div>
                            {data.fee > 0 && (
                              <div className="text-xs text-red-600">Taxa: {formatCurrency(data.fee)}</div>
                            )}
                            <div className="text-xs text-green-600">Líquido: {formatCurrency(data.net)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Taxas por Maquininha */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Taxas por Maquininha</h3>
                  <div className="space-y-3">
                    {Object.entries(calculateReport().byMachine).length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Nenhuma taxa registrada por maquininha</p>
                    ) : (
                      Object.entries(calculateReport().byMachine).map(([machine, data]) => (
                        <div key={machine} className="p-3 bg-gray-50 rounded">
                          <div className="flex justify-between items-center">
                            <div className="font-medium text-gray-800">{machine}</div>
                            <div className="text-sm text-gray-600">Total: <span className="font-semibold text-red-600">{formatCurrency(data.total)}</span></div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="flex justify-between p-2 bg-red-50 rounded"><span>Crédito</span><span className="font-semibold text-red-600">{formatCurrency(data.credit)}</span></div>
                            <div className="flex justify-between p-2 bg-red-50 rounded"><span>Débito</span><span className="font-semibold text-red-600">{formatCurrency(data.debit)}</span></div>
                            <div className="flex justify-between p-2 bg-red-50 rounded"><span>PIX</span><span className="font-semibold text-red-600">{formatCurrency(data.pix)}</span></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Pagamentos por Entregador */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Pagamentos a Entregadores</h3>
                  <div className="space-y-2">
                    {Object.entries(calculateReport().byDriver).length === 0 ? (
                      <p className="text-center text-gray-500 py-4">Nenhum pedido com entregador</p>
                    ) : (
                      Object.entries(calculateReport().byDriver).map(([driver, value]) => {
                        const label = String(driver);
                        const paid = reportTransactions
                          .filter(t => t.type === 'out' && (t.description || '').toLowerCase().includes(`pagamento entregadores - ${label}`.toLowerCase()))
                          .reduce((s, t) => s + (t.amount || 0), 0);
                        const remaining = Math.max(0, value - paid);
                        return (
                          <div key={label} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                            <div className="text-sm font-medium text-gray-800">{label}</div>
                            <div className="flex items-center gap-3">
                              <div className={`text-sm font-semibold ${remaining > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                {remaining > 0 ? formatCurrency(remaining) : 'Pago'}
                              </div>
                              {remaining > 0 && selectedReportCash?.status === 'open' && openCashRegister && String(selectedReportCash.id) === String(openCashRegister.id) && (
                                <button
                                  className="px-3 py-1.5 text-xs rounded border bg-white hover:bg-gray-50 text-gray-700"
                                  onClick={async () => {
                                    try {
                                      await cashTransactionService.create(String(selectedReportCash.id), {
                                        type: 'out',
                                        amount: remaining,
                                        description: `Pagamento entregadores - ${label}`,
                                      });
                                      notifySuccess('Pagamento ao entregador baixado.');
                                      await loadReportData(String(selectedReportCash.id));
                                    } catch (e) {
                                      console.error(e);
                                      notifyError('Erro ao dar baixa no pagamento do entregador');
                                    }
                                  }}
                                >
                                  Dar baixa
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Transações do Caixa */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Todas as Transações</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(() => {
                      const opening = selectedReportCash ? [{
                        id: 'opening',
                        cashRegisterId: String(selectedReportCash.id),
                        type: 'in' as const,
                        amount: selectedReportCash.openingBalance,
                        description: 'Saldo inicial',
                        createdAt: selectedReportCash.openedAt,
                      }] : [];
                      const allTx = [...opening, ...reportTransactions];
                      if (allTx.length === 0) {
                        return <p className="text-center text-gray-500 py-4">Nenhuma transação registrada</p>;
                      }
                      return allTx.map((t) => {
                        // Detecta pedido pelo número na descrição: "Pedido #123456"
                        let linkedOrder: Order | undefined;
                        const m = /Pedido\s*#(\d+)/i.exec(t.description || '');
                        if (m) {
                          const num = m[1];
                          linkedOrder = reportOrders.find(o => String(o.orderNumber) === String(num));
                        }
                        return (
                        <div key={`${t.id}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            {t.type === 'in' ? (
                              <MdTrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <MdTrendingDown className="w-5 h-5 text-red-600" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-800">{t.description}</div>
                              <div className="text-xs text-gray-500">{formatDateTime(t.createdAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${t.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                              {t.type === 'in' ? '+' : '-'} {formatCurrency(t.amount)}
                            </span>
                            {linkedOrder && (
                              <button
                                className="px-2 py-1 rounded border hover:bg-gray-100 text-gray-700"
                                title={`Ver Pedido #${linkedOrder.orderNumber || String(linkedOrder.id).slice(0,6)}`}
                                onClick={() => { setSelectedOrder(linkedOrder!); setShowOrderModal(true); }}
                              >
                                <MdRemoveRedEye className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Saldo Esperado */}
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Saldo Atual do Caixa</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Saldo inicial + Entradas - Saídas
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(calculateCurrentBalance())}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer de ações no relatório */}
              <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowReport(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Voltar
                </button>
                {selectedReportCash?.status === 'open' && openCashRegister && String(selectedReportCash.id) === String(openCashRegister.id) && (
                  <button
                    onClick={() => {
                      if (hasOpenOrders) {
                        notifyError('Não é possível fechar o caixa com pedidos em aberto. Conclua todos os pedidos.');
                        return;
                      }
                      setShowReport(false);
                      setShowCloseModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Fechar Caixa
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes do Pedido */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowOrderModal(false); setSelectedOrder(null); }} />
            <div className="relative bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Detalhes do Pedido</h2>
                <button onClick={() => { setShowOrderModal(false); setSelectedOrder(null); }} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Número:</span> <span className="font-medium">{selectedOrder.orderNumber ?? selectedOrder.id}</span></div>
                  <div><span className="text-gray-500">Status:</span> <span className="font-medium">{selectedOrder.status}</span></div>
                  <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{selectedOrder.customerName || '—'}</span></div>
                  <div><span className="text-gray-500">Entregador:</span> <span className="font-medium">{selectedOrder.deliveryDriverName || '—'}</span></div>
                  <div><span className="text-gray-500">Pagamento:</span> <span className="font-medium">{selectedOrder.paymentMethodName || selectedOrder.paymentMethodKind || '—'}</span></div>
                  <div><span className="text-gray-500">Criado em:</span> <span className="font-medium">{formatDateTime(selectedOrder.createdAt)}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3">
                  <div className="font-semibold text-gray-800 mb-2">Itens</div>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.items.map((it) => (
                      <div key={`${it.productId}-${it.productName}`} className="flex justify-between">
                        <div className="text-gray-700">{it.quantity}× {it.productName}</div>
                        <div className="text-gray-800 font-medium">{formatCurrency(it.totalPrice)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Subtotal:</span> <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span></div>
                  <div><span className="text-gray-500">Taxa de Entrega:</span> <span className="font-medium">{formatCurrency(selectedOrder.deliveryFee || 0)}</span></div>
                  <div><span className="text-gray-500">Taxas Cartão/PIX:</span> <span className="font-medium">{formatCurrency(selectedOrder.cardFee || 0)}</span></div>
                  <div><span className="text-gray-500">Total:</span> <span className="font-medium">{formatCurrency(selectedOrder.total)}</span></div>
                  <div><span className="text-gray-500">Líquido:</span> <span className="font-medium">{formatCurrency(selectedOrder.netAmount || selectedOrder.total)}</span></div>
                </div>
                {selectedOrder.notes && (
                  <div className="text-sm text-gray-700"><span className="text-gray-500">Obs.:</span> {selectedOrder.notes}</div>
                )}
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => { setShowOrderModal(false); setSelectedOrder(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

