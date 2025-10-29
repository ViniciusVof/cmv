import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { businessSettingsService } from '../services/businessSettingsService';
import type { BusinessSettingsFormData } from '../types/businessSettings';

export function BusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettingsFormData>({
    markup: 3.0,
    ifoodTaxPercentage: 15.2,
    costCalculationMethod: 'current',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await businessSettingsService.get();
      setSettings({
        markup: data.markup,
        ifoodTaxPercentage: data.ifoodTaxPercentage,
        costCalculationMethod: data.costCalculationMethod || 'current',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await businessSettingsService.update(settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Configurações do Negócio
          </h1>
          <p className="text-gray-600">
            Configure os parâmetros gerais do sistema
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Parâmetros de Precificação
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Markup *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.markup || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      markup: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Ex: 3.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Multiplicador aplicado ao custo para calcular o preço de venda
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taxa IFood (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.ifoodTaxPercentage || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ifoodTaxPercentage: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Ex: 15.20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Taxa percentual cobrada pelo IFood sobre vendas
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Cálculo de Custo *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      value="current"
                      checked={settings.costCalculationMethod === 'current'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          costCalculationMethod: e.target.value as 'current',
                        })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-gray-700 font-medium">Custo Atual</span>
                      <p className="text-xs text-gray-500">
                        Usa o custo do último registro de entrada no estoque
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      value="monthly_average"
                      checked={settings.costCalculationMethod === 'monthly_average'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          costCalculationMethod: e.target.value as 'monthly_average',
                        })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-gray-700 font-medium">Média Mensal</span>
                      <p className="text-xs text-gray-500">
                        Calcula a média ponderada dos custos das entradas dos últimos 30 dias
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Como funciona?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  <strong>Preço com Markup:</strong> Custo da Receita × Markup
                </li>
                <li>
                  <strong>Preço Sugerido IFood:</strong> Preço com Markup ÷
                  (1 - Taxa IFood)
                </li>
                <li>
                  <strong>Exemplo:</strong> Se o custo é R$ 10,00 e o markup é
                  3,00, o preço com markup será R$ 30,00. Com taxa IFood de
                  15,20%, o preço sugerido será R$ 35,41
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

