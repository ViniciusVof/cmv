import { useState } from 'react';

interface CorrectionFactorCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (factor: number) => void;
}

export function CorrectionFactorCalculator({
  isOpen,
  onClose,
  onApply,
}: CorrectionFactorCalculatorProps) {
  const [grossQuantity, setGrossQuantity] = useState('');
  const [netQuantity, setNetQuantity] = useState('');
  const [calculatedFactor, setCalculatedFactor] = useState<number | null>(null);

  const calculate = () => {
    const gross = parseFloat(grossQuantity.replace(',', '.'));
    const net = parseFloat(netQuantity.replace(',', '.'));

    if (gross > 0 && net > 0) {
      const factor = gross / net;
      setCalculatedFactor(factor);
    } else {
      setCalculatedFactor(null);
    }
  };

  const handleApply = () => {
    if (calculatedFactor !== null) {
      onApply(calculatedFactor);
      onClose();
      // Reset
      setGrossQuantity('');
      setNetQuantity('');
      setCalculatedFactor(null);
    }
  };

  const handleReset = () => {
    setGrossQuantity('');
    setNetQuantity('');
    setCalculatedFactor(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Calculadora de Fator de Correção
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Fórmula: Quantidade Bruta ÷ Quantidade Líquida
              </p>
              <p className="text-xs text-blue-700">
                Exemplo: Se você compra 3kg mas após limpeza tem 2,7kg líquidos, o
                fator será 3 ÷ 2,7 = 1,11
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gross Quantity (Quantidade Bruta)
              </label>
              <input
                type="text"
                value={grossQuantity}
                onChange={(e) => setGrossQuantity(e.target.value)}
                onBlur={calculate}
                placeholder="Ex: 3 ou 3,0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Net Quantity (Quantidade Líquida)
              </label>
              <input
                type="text"
                value={netQuantity}
                onChange={(e) => setNetQuantity(e.target.value)}
                onBlur={calculate}
                placeholder="Ex: 2,7 ou 2.7"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {calculatedFactor !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">
                    Fator de Correção Calculado:
                  </span>
                  <span className="text-2xl font-bold text-green-900">
                    {calculatedFactor.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={calculate}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Calcular
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
              {calculatedFactor !== null && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aplicar
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

