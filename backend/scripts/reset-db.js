import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function resetDb() {
  const dbPath = path.resolve('./db.json');
  const raw = await readFile(dbPath, 'utf-8');
  const data = JSON.parse(raw);

  // Collections to clear
  const toClear = [
    'orders',
    'cashRegisters',
    'cashTransactions',
    'stockMovements',
    'reconciliationReports',
    'cmvGlobal',
    'dreCategoryMappings',
  ];

  toClear.forEach((key) => {
    if (Array.isArray(data[key])) data[key] = [];
  });

  // Optional: also clear sales if exists
  if (Array.isArray(data.sales)) data.sales = [];

  // Recriar movimentações iniciais de estoque (IN) com base no volume atual dos ingredientes
  if (Array.isArray(data.ingredients)) {
    const initialMovs = [];
    let nextId = 1;
    if (Array.isArray(data.stockMovements) && data.stockMovements.length > 0) {
      nextId = Math.max(...data.stockMovements.map((m) => Number(m.id) || 0)) + 1;
    }
    for (const ing of data.ingredients) {
      const vol = Number(ing.volume) || 0;
      if (vol > 0) {
        const unitCost = ing.pricePaid && vol > 0 ? Number(ing.pricePaid) / vol : 0;
        initialMovs.push({
          id: nextId++,
          ingredientId: String(ing.id),
          type: 'IN',
          quantity: vol,
          unitCost,
          isInitial: true,
          date: new Date().toISOString(),
        });
      }
    }
    data.stockMovements = initialMovs;
  }

  // Garantir dados iniciais de custos fixos
  if (!Array.isArray(data.fixedCosts) || data.fixedCosts.length === 0) {
    data.fixedCosts = [
      { id: '1', name: 'Aluguel', value: 2500 },
      { id: '2', name: 'Água', value: 150 },
      { id: '3', name: 'Luz', value: 880 },
      { id: '4', name: 'Contador', value: 200 },
      { id: '5', name: 'Entregador', value: 2400 },
      { id: '6', name: 'Marketing', value: 1100 },
      { id: '7', name: 'Gás', value: 910 },
      { id: '8', name: 'Sistema', value: 270 },
      { id: '9', name: 'Internet/Telefone', value: 180 },
      { id: '10', name: 'Limpeza', value: 120 },
      { id: '11', name: 'Reserva Operacional', value: 300 },
    ];
  }

  // Garantir dados iniciais de custos variáveis
  if (!Array.isArray(data.variableCosts) || data.variableCosts.length === 0) {
    data.variableCosts = [
      { id: '1', name: 'Taxa de Cartão', percentage: 3 },
      { id: '2', name: 'Simples Nacional', percentage: 7.5 },
      { id: '3', name: 'Embalagem', percentage: 4.5 },
    ];
  }

  // Garantir fornecedores básicos caso vazio
  if (!Array.isArray(data.suppliers) || data.suppliers.length === 0) {
    data.suppliers = [
      { id: '1', name: 'MUNHOZ' },
      { id: '2', name: 'ATTIMINO' },
      { id: '3', name: 'SOS' },
      { id: '4', name: 'FABRICAÇÃO' },
      { id: '5', name: 'KOCH' },
      { id: '6', name: 'FORT' },
      { id: '7', name: 'PAMPLONA' },
      { id: '8', name: 'DELLYS' },
      { id: '9', name: '24PRINT' },
      { id: '10', name: 'MERCADO LIVRE' },
      { id: '11', name: 'FITLAND' },
    ];
  }

  // Garantir categorias iniciais
  if (!Array.isArray(data.categories) || data.categories.length === 0) {
    const now = new Date().toISOString();
    data.categories = [
      {
        id: '1',
        name: 'Custo Fixo',
        type: 'expense',
        description: 'Custos fixos do negócio',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '2',
        name: 'Custo Variável',
        type: 'expense',
        description: 'Custos variáveis do negócio',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: '3',
        name: 'Outras Despesas',
        type: 'expense',
        description: 'Outras despesas operacionais',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // Persist
  await writeFile(dbPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log('db.json reset: cleared operational data; recreated initial stock IN movements; ensured fixed/variable costs and suppliers.');
}

resetDb().catch((err) => {
  console.error('Failed to reset db.json:', err);
  process.exit(1);
});


