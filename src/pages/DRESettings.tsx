import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { fixedCostService } from '../services/fixedCostService';
import { variableCostService } from '../services/variableCostService';
import { dreSettingsService } from '../services/dreSettingsService';
import type { FixedCost } from '../types/fixedCost';
import type { VariableCost } from '../types/variableCost';
import type { DRESettings } from '../types/dreSettings';
import { notifySuccess, notifyError } from '../utils/alerts';

export function DRESettings() {
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [variableCosts, setVariableCosts] = useState<VariableCost[]>([]);
  const [dreSettings, setDreSettings] = useState<DRESettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fixed, variable, settings] = await Promise.all([
        fixedCostService.getAll(),
        variableCostService.getAll(),
        dreSettingsService.get(),
      ]);
      setFixedCosts(fixed);
      setVariableCosts(variable);
      setDreSettings(settings);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      notifyError('Erro ao carregar configurações do DRE');
    } finally {
      setLoading(false);
    }
  };

  const toggleFixedCost = async (id: string, currentValue: boolean) => {
    try {
      const cost = fixedCosts.find((fc) => fc.id === id);
      if (!cost) return;

      const updated = await fixedCostService.update(id, {
        name: cost.name,
        value: cost.value,
        showInDRE: !currentValue,
      });

      setFixedCosts((prev) =>
        prev.map((fc) => (fc.id === id ? updated : fc))
      );
      notifySuccess('Configuração atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar custo fixo:', error);
      notifyError(error.message || 'Erro ao atualizar configuração');
    }
  };

  const toggleVariableCost = async (id: string, currentValue: boolean) => {
    try {
      const cost = variableCosts.find((vc) => vc.id === id);
      if (!cost) return;

      const updated = await variableCostService.update(id, {
        name: cost.name,
        percentage: cost.percentage,
        showInDRE: !currentValue,
      });

      setVariableCosts((prev) =>
        prev.map((vc) => (vc.id === id ? updated : vc))
      );
      notifySuccess('Configuração atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar custo variável:', error);
      notifyError(error.message || 'Erro ao atualizar configuração');
    }
  };

  const toggleAutomaticPDVValues = async () => {
    if (!dreSettings) return;
    
    try {
      setSaving(true);
      const updated = await dreSettingsService.update({
        useAutomaticPDVValues: !dreSettings.useAutomaticPDVValues,
        useConfiguredFixedValues: dreSettings.useConfiguredFixedValues,
      });
      setDreSettings(updated);
      notifySuccess('Configuração atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      notifyError(error.message || 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleConfiguredFixedValues = async () => {
    if (!dreSettings) return;
    
    try {
      setSaving(true);
      const updated = await dreSettingsService.update({
        useAutomaticPDVValues: dreSettings.useAutomaticPDVValues,
        useConfiguredFixedValues: !dreSettings.useConfiguredFixedValues,
      });
      setDreSettings(updated);
      notifySuccess('Configuração atualizada!');
    } catch (error: any) {
      console.error('Erro ao atualizar configurações:', error);
      notifyError(error.message || 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do DRE</h1>
      </div>

      {/* Configurações Gerais */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h2>
        <p className="text-sm text-gray-600 mb-4">
          Escolha quais tipos de valores devem aparecer no DRE
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Usar Valores Automáticos do PDV
              </div>
              <div className="text-xs text-gray-600">
                Inclui CMV (calculado das movimentações de estoque), taxas de cartão e taxas de entregadores (calculadas automaticamente dos pedidos)
              </div>
            </div>
            <button
              onClick={toggleAutomaticPDVValues}
              disabled={saving || !dreSettings}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                dreSettings?.useAutomaticPDVValues ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={dreSettings?.useAutomaticPDVValues}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  dreSettings?.useAutomaticPDVValues ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 mb-1">
                Usar Valores Fixos Configurados
              </div>
              <div className="text-xs text-gray-600">
                Inclui custos fixos e custos variáveis cadastrados manualmente
              </div>
            </div>
            <button
              onClick={toggleConfiguredFixedValues}
              disabled={saving || !dreSettings}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                dreSettings?.useConfiguredFixedValues ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={dreSettings?.useConfiguredFixedValues}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  dreSettings?.useConfiguredFixedValues ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custos Fixos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ative ou desative quais custos fixos devem aparecer no DRE
        </p>
        
        {fixedCosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum custo fixo cadastrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exibir no DRE
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fixedCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cost.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">{formatCurrency(cost.value || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleFixedCost(cost.id, cost.showInDRE !== false)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          cost.showInDRE !== false ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={cost.showInDRE !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            cost.showInDRE !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Custos Variáveis</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ative ou desative quais custos variáveis devem aparecer no DRE
        </p>
        
        {variableCosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum custo variável cadastrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentagem
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exibir no DRE
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {variableCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cost.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">{cost.percentage?.toFixed(2) || 0}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleVariableCost(cost.id, cost.showInDRE !== false)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          cost.showInDRE !== false ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={cost.showInDRE !== false}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            cost.showInDRE !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}

