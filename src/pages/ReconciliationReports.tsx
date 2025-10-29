import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import type { ReconciliationReport } from '../types/reconciliationReport';
import { reconciliationReportService } from '../services/reconciliationReportService';
import { MdDateRange, MdInfo, MdDelete, MdVisibility, MdClose } from 'react-icons/md';

export function ReconciliationReports() {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reconciliationReportService.getAll();
      // Ordenar por data mais recente primeiro
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.reconciledAt || a.date).getTime();
        const dateB = new Date(b.reconciledAt || b.date).getTime();
        return dateB - dateA;
      });
      setReports(sorted);
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: ReconciliationReport) => {
    setSelectedReport(report);
    setShowDetails(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) {
      return;
    }

    try {
      await reconciliationReportService.delete(id);
      await loadReports();
      alert('Relatório excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Erro ao excluir relatório');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
            Relatórios de Conciliação
          </h1>
          <p className="text-gray-600">
            Histórico de todas as conciliações realizadas
          </p>
        </div>

        {/* Stats */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total de Relatórios</div>
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Itens com Diferença</div>
              <div className="text-2xl font-bold text-orange-600">
                {reports.reduce((sum, r) => sum + r.summary.itemsWithDifference, 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Última Conciliação</div>
              <div className="text-sm font-medium text-gray-900">
                {formatDateOnly(reports[0]?.date || '')}
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <MdDateRange className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum relatório de conciliação encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 'max-content' }}>
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Data da Conciliação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Aplicado em
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Total de Itens
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Com Diferença
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Entradas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Saídas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <MdDateRange className="w-5 h-5 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">
                            {formatDateOnly(report.date)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {report.reconciledAt ? formatDate(report.reconciledAt) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {report.summary.totalItems}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-orange-600">
                          {report.summary.itemsWithDifference}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {report.summary.totalEntries.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {report.summary.totalExits.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(report)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver detalhes"
                          >
                            <MdVisibility className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Excluir relatório"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetails && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Detalhes da Conciliação
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Data: {formatDateOnly(selectedReport.date)} - Aplicado em: {selectedReport.reconciledAt ? formatDate(selectedReport.reconciledAt) : '-'}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>

              {/* Summary */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Total de Itens</div>
                    <div className="text-lg font-bold text-gray-900">
                      {selectedReport.summary.totalItems}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Com Diferença</div>
                    <div className="text-lg font-bold text-orange-600">
                      {selectedReport.summary.itemsWithDifference}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Entradas</div>
                    <div className="text-lg font-bold text-green-600">
                      {selectedReport.summary.totalEntries.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Saídas</div>
                    <div className="text-lg font-bold text-red-600">
                      {selectedReport.summary.totalExits.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {selectedReport.items.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        item.difference === 0
                          ? 'bg-green-50 border-green-200'
                          : item.difference > 0
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.ingredientCode} - {item.ingredientName}
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Estoque Sistema:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {item.systemStock.toFixed(2)} {item.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Estoque Físico:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {item.physicalStock.toFixed(2)} {item.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Diferença:</span>
                              <span
                                className={`ml-2 font-medium ${
                                  item.difference === 0
                                    ? 'text-green-600'
                                    : item.difference > 0
                                    ? 'text-blue-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {item.difference > 0 ? '+' : ''}
                                {item.difference.toFixed(2)} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {item.adjustmentType === 'NONE' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              OK
                            </span>
                          ) : item.adjustmentType === 'IN' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Saída
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

