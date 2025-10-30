import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import type { CashRegister as CashRegisterType, CashTransaction } from '../types/cashRegister';
import { cashRegisterService } from '../services/cashRegisterService';
import { cashTransactionService } from '../services/cashTransactionService';
import { MdAdd, MdClose, MdCheckCircle, MdAttachMoney, MdTrendingUp, MdTrendingDown, MdDelete } from 'react-icons/md';
import { notifySuccess, notifyError, confirmAsync } from '../utils/alerts';

export function CashRegister() {
  const [cashRegisters, setCashRegisters] = useState<CashRegisterType[]>([]);
  const [openCashRegister, setOpenCashRegister] = useState<CashRegisterType | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [all, open] = await Promise.all([
        cashRegisterService.getAll(),
        cashRegisterService.getOpenCashRegister(),
      ]);
      setCashRegisters(all.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()));
      setOpenCashRegister(open);
      
      // Carregar transações do caixa aberto
      if (open) {
        const trans = await cashTransactionService.getByCashRegisterId(open.id);
        setTransactions(trans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error loading cash registers:', error);
      notifyError('Erro ao carregar caixas');
    } finally {
      setLoading(false);
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

  const handleDeleteTransaction = async (id: string) => {
    const ok = await confirmAsync('Tem certeza que deseja excluir esta transação?');
    if (!ok) return;
    try {
      await cashTransactionService.delete(id);
      notifySuccess('Transação excluída com sucesso!');
      await loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      notifyError('Erro ao excluir transação');
    }
  };

  const calculateCurrentBalance = () => {
    if (!openCashRegister) return 0;
    const transIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const transOut = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    return openCashRegister.openingBalance + transIn - transOut;
  };

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
      <div className="space-y-6">
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
              <button
                onClick={() => setShowCloseModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Fechar Caixa
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Saldo Inicial</div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatCurrency(openCashRegister.openingBalance)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Saldo Atual (sem vendas)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateCurrentBalance())}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                <button
                  onClick={() => setShowTransactionModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <MdAdd className="w-5 h-5" />
                  Adicionar Entrada/Saída
                </button>
              </div>
            </div>

            {/* Transações */}
            {transactions.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Transações do Caixa</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${t.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'in' ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {openCashRegister.notes && (
              <div className="p-3 bg-white rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Observações</div>
                <div className="text-sm text-gray-700">{openCashRegister.notes}</div>
              </div>
            )}
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
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
              <div className="space-y-4">
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
              <div className="space-y-4">
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
              <div className="space-y-4">
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
      </div>
    </Layout>
  );
}

